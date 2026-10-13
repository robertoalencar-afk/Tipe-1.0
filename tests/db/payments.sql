-- Cenários do motor de pagamentos executados contra as funções reais do banco.
-- Rode com tests/db/run.sh (precisa de um PostgreSQL 15+ local). Cada bloco
-- falha com RAISE EXCEPTION se a regra não for cumprida.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

-- Mesa de teste com itens conhecidos.
CREATE OR REPLACE FUNCTION pg_temp.mesa(p_slug text, p_table text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  DELETE FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at)
  VALUES (p_slug, p_table, 'pizza', 'Pizza', 90.00, 1, 'Teste', now()),
         (p_slug, p_table, 'suco', 'Suco', 12.00, 3, 'Teste', now());
END $$;

CREATE OR REPLACE FUNCTION pg_temp.disp(p_slug text, p_table text, p_code text) RETURNS numeric LANGUAGE sql AS $$
  SELECT ordered_quantity - reserved_portion - paid_portion FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table AND item_code = p_code
$$;

SET search_path = public, extensions;

-- 2) Três clientes pagando partes distintas (frações) da comanda.
DO $$
DECLARE a uuid; b uuid; c uuid;
BEGIN
  PERFORM pg_temp.mesa('mare-alta', '1');
  a := register_table_payment('mare-alta','1','Ana Lima','restaurant','pix','approved', 30.00, '{"pizza":0.3333}', 'cenario2-ana');
  b := register_table_payment('mare-alta','1','Bia Melo','restaurant','pix','approved', 30.00, '{"pizza":0.3333}', 'cenario2-bia');
  c := register_table_payment('mare-alta','1','Caio Reis','restaurant','pix','approved', 66.00, '{"pizza":0.3334,"suco":3}', 'cenario2-caio');
  PERFORM pg_temp.ok(pg_temp.disp('mare-alta','1','pizza') = 0, 'três frações quitam a pizza sem resíduo');
  PERFORM pg_temp.ok(pg_temp.disp('mare-alta','1','suco') = 0, 'sucos quitados');
  PERFORM pg_temp.ok((SELECT count(*) FROM table_payment_requests WHERE restaurant_slug='mare-alta' AND table_number='1' AND status='approved') = 3, 'três pagamentos aprovados');
END $$;

-- Nenhum cliente paga o que já foi liquidado.
DO $$
BEGIN
  BEGIN
    PERFORM register_table_payment('mare-alta','1','Davi Dias','restaurant','pix','approved', 12.00, '{"suco":1}', 'cenario2-davi');
    RAISE EXCEPTION 'FALHOU: aceitou pagar item já quitado';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(SQLERRM LIKE '%não está mais disponível%', 'item quitado é recusado: ' || SQLERRM);
  END;
END $$;

-- 3) Um pagamento aprovado e outro recusado; 4) webhook duplicado; 5) fora de ordem.
DO $$
DECLARE a uuid; b uuid; r text;
BEGIN
  PERFORM pg_temp.mesa('mare-alta', '2');
  a := register_table_payment('mare-alta','2','Ana Lima','restaurant','card','pending', 90.00, '{"pizza":1}', 'cenario3-ana');
  b := register_table_payment('mare-alta','2','Bia Melo','restaurant','card','pending', 36.00, '{"suco":3}', 'cenario3-bia');
  UPDATE table_payment_requests SET provider='pagarme', provider_order_id='or_cenario3a' WHERE id=a;
  UPDATE table_payment_requests SET provider='pagarme', provider_order_id='or_cenario3b' WHERE id=b;
  PERFORM pg_temp.ok(pg_temp.disp('mare-alta','2','pizza') = 0, 'pizza reservada durante o checkout');
  r := provider_settle_payment('or_cenario3a', true);
  PERFORM pg_temp.ok(r = 'approved', 'cartão da Ana aprovado');
  r := provider_settle_payment('or_cenario3b', false);
  PERFORM pg_temp.ok(r = 'failed', 'cartão da Bia recusado');
  PERFORM pg_temp.ok(pg_temp.disp('mare-alta','2','suco') = 3, 'recusa libera a reserva dos sucos');
  PERFORM pg_temp.ok((SELECT paid_portion FROM table_bill_items WHERE restaurant_slug='mare-alta' AND table_number='2' AND item_code='pizza') = 1, 'pizza paga');
  r := provider_settle_payment('or_cenario3a', true);
  PERFORM pg_temp.ok(r = 'already', 'webhook duplicado não liquida de novo');
  PERFORM pg_temp.ok((SELECT paid_portion FROM table_bill_items WHERE restaurant_slug='mare-alta' AND table_number='2' AND item_code='pizza') = 1, 'duplicado não altera o valor pago');
  r := provider_settle_payment('or_cenario3a', false);
  PERFORM pg_temp.ok(r = 'already', 'falha chegando depois da aprovação é ignorada');
  PERFORM pg_temp.ok((SELECT status FROM table_payment_requests WHERE id=a) = 'approved', 'aprovado continua aprovado');
  r := provider_settle_payment('or_inexistente', true);
  PERFORM pg_temp.ok(r = 'not_found', 'reprocessar pedido desconhecido não faz nada');
END $$;

-- 6) Frontend desconectado: a mesma chave de idempotência não duplica.
DO $$
DECLARE a uuid; b uuid;
BEGIN
  PERFORM pg_temp.mesa('mare-alta', '3');
  a := register_table_payment('mare-alta','3','Ana Lima','restaurant','pix','approved', 90.00, '{"pizza":1}', 'cenario6-chave');
  b := register_table_payment('mare-alta','3','Ana Lima','restaurant','pix','approved', 90.00, '{"pizza":1}', 'cenario6-chave');
  PERFORM pg_temp.ok(a = b, 'reenvio devolve o mesmo pagamento');
  PERFORM pg_temp.ok((SELECT count(*) FROM table_payment_requests WHERE idempotency_key='cenario6-chave') = 1, 'só um registro');
  PERFORM pg_temp.ok((SELECT paid_portion FROM table_bill_items WHERE restaurant_slug='mare-alta' AND table_number='3' AND item_code='pizza') = 1, 'item pago uma única vez');
END $$;

-- 8) Estorno e contestação, inclusive depois que a mesa foi reaberta.
DO $$
DECLARE a uuid; r text;
BEGIN
  PERFORM pg_temp.mesa('mare-alta', '4');
  a := register_table_payment('mare-alta','4','Ana Lima','restaurant','card','pending', 126.00, '{"pizza":1,"suco":3}', 'cenario8-ana');
  UPDATE table_payment_requests SET provider='pagarme', provider_order_id='or_cenario8' WHERE id=a;
  PERFORM provider_settle_payment('or_cenario8', true);
  r := provider_reverse_payment('or_cenario8', 'refunded');
  PERFORM pg_temp.ok(r = 'refunded', 'estorno registrado');
  PERFORM pg_temp.ok((SELECT status FROM table_payment_requests WHERE id=a) = 'refunded', 'status estornado');
  PERFORM pg_temp.ok((SELECT count(*) FROM payment_incidents WHERE payment_id=a AND kind='refund' AND resolved_at IS NULL) = 1, 'pendência de estorno aberta');
  r := provider_reverse_payment('or_cenario8', 'refunded');
  PERFORM pg_temp.ok(r = 'already', 'estorno repetido é ignorado');
  PERFORM record_payment_incident(a, 'refund', 'de novo');
  PERFORM pg_temp.ok((SELECT count(*) FROM payment_incidents WHERE payment_id=a AND kind='refund') = 1, 'pendência não duplica');
  PERFORM pg_temp.ok((SELECT count(*) FROM payment_audit_log WHERE payment_id=a AND action='provider_refunded') = 1, 'trilha de auditoria do estorno');

  -- Contestação depois da reabertura: o pagamento está arquivado.
  PERFORM pg_temp.mesa('mare-alta', '5');
  a := register_table_payment('mare-alta','5','Bia Melo','restaurant','card','pending', 126.00, '{"pizza":1,"suco":3}', 'cenario8-bia');
  UPDATE table_payment_requests SET provider='pagarme', provider_order_id='or_cenario8b' WHERE id=a;
  PERFORM provider_settle_payment('or_cenario8b', true);
  PERFORM archive_and_reopen_table('mare-alta', '5');
  PERFORM pg_temp.ok((SELECT provider_order_id FROM archived_payments WHERE id=a) = 'or_cenario8b', 'arquivo preserva o pedido do provedor');
  r := provider_reverse_payment('or_cenario8b', 'chargeback');
  PERFORM pg_temp.ok(r = 'chargeback', 'contestação encontrada no arquivo');
  PERFORM pg_temp.ok((SELECT status FROM archived_payments WHERE id=a) = 'chargeback', 'arquivado marcado como contestado');
  PERFORM pg_temp.ok((SELECT count(*) FROM payment_incidents WHERE payment_id=a AND kind='chargeback') = 1, 'pendência de contestação aberta');
END $$;

-- 9) Itens lançados durante o checkout continuam em aberto.
DO $$
DECLARE a uuid; r text; v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug='mare-alta';
  PERFORM pg_temp.mesa('mare-alta', '6');
  a := register_table_payment('mare-alta','6','Ana Lima','restaurant','pix','pending', 126.00, '{"pizza":1,"suco":3}', 'cenario9-ana');
  r := pdv_ingest_event(v_rid, 'api_tipe', 'cenario9-evt1', '{"type":"item_added","table":{"number":"6"},"item":{"code":"cafe","name":"Café","unit_price":7,"quantity":2}}'::jsonb);
  PERFORM pg_temp.ok(r NOT LIKE 'error%', 'PDV lança item novo durante o pagamento: ' || r);
  r := pdv_ingest_event(v_rid, 'api_tipe', 'cenario9-evt1', '{"type":"item_added","table":{"number":"6"},"item":{"code":"cafe","name":"Café","unit_price":7,"quantity":2}}'::jsonb);
  PERFORM pg_temp.ok(r = 'duplicate', 'evento repetido do PDV é ignorado');
  UPDATE table_payment_requests SET provider='pagarme', provider_order_id='or_cenario9' WHERE id=a;
  PERFORM provider_settle_payment('or_cenario9', true);
  PERFORM pg_temp.ok(coalesce(pg_temp.disp('mare-alta','6','cafe'), 0) > 0, 'café lançado depois continua a pagar');
  PERFORM pg_temp.ok(pg_temp.disp('mare-alta','6','pizza') = 0, 'itens do pagamento quitados');
END $$;

-- 11) Isolamento: usuário de outro restaurante não vê nem resolve pendências.
DO $$
DECLARE u_dono uuid := gen_random_uuid(); u_outro uuid := gen_random_uuid(); v_rid uuid; v_outro uuid; v_inc uuid; n int;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug='mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug='marealta';
  INSERT INTO auth.users (id, email) VALUES (u_dono, 'dono@teste.local'), (u_outro, 'outro@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono, 'owner', v_rid), (u_outro, 'owner', v_outro);
  SELECT id INTO v_inc FROM payment_incidents WHERE restaurant_id = v_rid AND resolved_at IS NULL LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', u_outro::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM payment_incidents WHERE restaurant_id = v_rid;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 0, 'dono de outro restaurante não vê as pendências');
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM resolve_payment_incident(v_inc, 'tentativa indevida');
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: outro restaurante resolveu a pendência';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(SQLERRM LIKE '%Sem permissão%', 'resolução bloqueada para outro restaurante');
  END;
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM payment_incidents WHERE restaurant_id = v_rid;
  PERFORM resolve_payment_incident(v_inc, 'Cliente pagou de novo no caixa');
  RESET ROLE;
  PERFORM pg_temp.ok(n > 0, 'dono vê as próprias pendências');
  PERFORM pg_temp.ok((SELECT resolved_at IS NOT NULL FROM payment_incidents WHERE id = v_inc), 'dono resolve com observação');
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM count(*) FROM payment_incidents;
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: visitante leu pendências';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    PERFORM pg_temp.ok(true, 'visitante anônimo não lê pendências');
  END;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM provider_reverse_payment('or_cenario8', 'refunded');
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: usuário comum chamou função do provedor';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    PERFORM pg_temp.ok(true, 'só o servidor registra estornos');
  END;
END $$;

-- 15) Pagamento pendente travado vira pendência, e confirmação após liberação também.
DO $$
DECLARE a uuid; r text;
BEGIN
  PERFORM pg_temp.mesa('mare-alta', '7');
  a := register_table_payment('mare-alta','7','Ana Lima','restaurant','pix','pending', 90.00, '{"pizza":1}', 'cenario15-ana');
  r := record_payment_incident(a, 'stuck_pending', 'teste');
  PERFORM pg_temp.ok(r = 'recorded', 'pendente travado registrado');
  r := record_payment_incident(gen_random_uuid(), 'stuck_pending', 'teste');
  PERFORM pg_temp.ok(r = 'not_found', 'pagamento inexistente não gera pendência');
  BEGIN
    PERFORM record_payment_incident(a, 'inventado', 'x');
    RAISE EXCEPTION 'FALHOU: aceitou tipo de pendência inválido';
  EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok(true, 'tipo de pendência validado');
  END;
END $$;
