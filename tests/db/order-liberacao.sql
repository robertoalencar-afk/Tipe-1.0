-- Tipe Order, Fase 2: módulos contratados e liberação de pedidos na mesa (0027).
-- Rode com tests/db/run.sh. Cada bloco falha com RAISE EXCEPTION se a regra não for cumprida.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

CREATE OR REPLACE FUNCTION pg_temp.falha(p_sql text, p_like text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN raise_exception THEN
    PERFORM pg_temp.ok(SQLERRM LIKE '%' || p_like || '%', msg || ' (' || SQLERRM || ')');
    RETURN;
  END;
  RAISE EXCEPTION 'FALHOU: % (não houve erro)', msg;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.como(p_user uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true)
$$;

-- 1) Restaurante só com Pay: o servidor recusa pedido mesmo chamando a função direto.
DO $$
DECLARE v_rid uuid; u_gar uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  DELETE FROM restaurant_modules WHERE restaurant_id = v_rid;
  DELETE FROM table_order_sessions WHERE restaurant_id = v_rid;
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'ord-suco';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'ord-suco', 'Suco de caju', 9.50, 'bar');
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number IN ('5', '6');
  DELETE FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number IN ('5', '6');
  UPDATE restaurants SET self_order_enabled = true, order_session_mode = 'staff_opens' WHERE id = v_rid;
  INSERT INTO auth.users (id, email) VALUES (u_gar, 'garcom-liberacao@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_gar, 'waiter', v_rid);

  PERFORM pg_temp.ok(NOT restaurant_has_module(v_rid, 'order'), 'restaurante novo não tem o Order');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0001')$q$,
    'desativado', 'só com Pay o pedido é recusado mesmo com a opção ligada');
  PERFORM pg_temp.como(u_gar);
  PERFORM pg_temp.falha($q$SELECT open_table_ordering('mare-alta', '5')$q$, 'não está ativo', 'só com Pay a equipe não libera pedidos');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.ok((SELECT count(*) FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = 'ord-req-0001') = 0, 'nenhum pedido criado sem o módulo');
END $$;

-- 2) Contratar o Order: estados, motivo obrigatório e trilha.
DO $$
DECLARE v_rid uuid; r jsonb;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  PERFORM pg_temp.falha(format($q$SELECT set_restaurant_module(%L, 'order', 'suspended', '', NULL, 'founder')$q$, v_rid), 'motivo', 'suspender exige motivo');
  PERFORM pg_temp.falha(format($q$SELECT set_restaurant_module(%L, 'pay', 'active', NULL, NULL, 'founder')$q$, v_rid), 'Módulo inválido', 'módulo desconhecido é recusado');
  r := set_restaurant_module(v_rid, 'order', 'active', NULL, NULL, 'founder');
  PERFORM pg_temp.ok((r->>'changed')::boolean AND restaurant_has_module(v_rid, 'order'), 'Order ativado');
  r := set_restaurant_module(v_rid, 'order', 'active', NULL, NULL, 'founder');
  PERFORM pg_temp.ok(NOT (r->>'changed')::boolean, 'ativar de novo não duplica a trilha');
  PERFORM pg_temp.ok((SELECT count(*) FROM restaurant_module_events WHERE restaurant_id = v_rid AND module = 'order' AND to_status = 'active') >= 1, 'mudança registrada na trilha');
  PERFORM pg_temp.ok(NOT has_function_privilege('authenticated', 'public.set_restaurant_module(uuid,text,text,text,uuid,text)', 'EXECUTE'), 'usuário logado não muda módulo direto');
  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.set_restaurant_module(uuid,text,text,text,uuid,text)', 'EXECUTE'), 'visitante não muda módulo direto');
  PERFORM pg_temp.ok(NOT has_table_privilege('authenticated', 'public.restaurant_modules', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.restaurant_modules', 'UPDATE'), 'tabela de módulos não aceita escrita do navegador');
END $$;

-- 3) Com o Order: só pede com a mesa liberada pela equipe; QR fotografado não basta.
DO $$
DECLARE v_rid uuid; u_gar uuid; u_fora uuid := gen_random_uuid(); v_outro uuid; r jsonb; r2 jsonb;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  SELECT id INTO u_gar FROM auth.users WHERE email = 'garcom-liberacao@teste.local';
  INSERT INTO auth.users (id, email) VALUES (u_fora, 'garcom-outro-rest@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_fora, 'waiter', v_outro);

  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0002')$q$,
    'não estão liberados', 'sem liberação da equipe o pedido é recusado');

  PERFORM pg_temp.como(u_fora);
  PERFORM pg_temp.falha($q$SELECT open_table_ordering('mare-alta', '5')$q$, 'Sem permissão', 'garçom de outro restaurante não libera a mesa');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.falha($q$SELECT open_table_ordering('mare-alta', '5')$q$, 'Sem permissão', 'sem login ninguém libera a mesa');
  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.open_table_ordering(text,text)', 'EXECUTE'), 'visitante anônimo não chama a liberação');

  PERFORM pg_temp.como(u_gar);
  r := open_table_ordering('mare-alta', '5');
  r2 := open_table_ordering('mare-alta', '5');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.ok(r->>'id' = r2->>'id' AND (r2->>'reused')::boolean, 'liberar de novo devolve a mesma liberação');
  PERFORM pg_temp.ok(r->>'code' IS NULL, 'no modo padrão não há código');

  r := pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":2}]', 'Rui', 'ord-req-0003');
  PERFORM pg_temp.ok((r->>'total')::numeric = 19.00, 'com a mesa liberada o pedido entra, total do servidor');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '6', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0004')$q$,
    'não estão liberados', 'liberar uma mesa não libera outra');

  -- A mesa fecha (a sessão da conta gira): a liberação morre e uma foto antiga do QR não pede mais.
  UPDATE restaurant_tables SET session_token = encode(gen_random_bytes(24), 'hex') WHERE restaurant_id = v_rid AND number = '5';
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0005')$q$,
    'não estão liberados', 'mesa fechada e reaberta exige nova liberação');

  -- Liberação vencida também não vale.
  PERFORM pg_temp.como(u_gar);
  r := open_table_ordering('mare-alta', '5');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.ok(NOT (r->>'reused')::boolean, 'nova conta recebe nova liberação');
  UPDATE table_order_sessions SET expires_at = now() - interval '1 minute' WHERE id = (r->>'id')::uuid;
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0006')$q$,
    'não estão liberados', 'liberação vencida é recusada');

  PERFORM pg_temp.como(u_gar);
  PERFORM open_table_ordering('mare-alta', '5');
  PERFORM close_table_ordering('mare-alta', '5');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '5', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0007')$q$,
    'não estão liberados', 'equipe encerra a liberação e os pedidos param');
END $$;

-- 4) Suspender o Order bloqueia novos pedidos sem afetar o Pay nem o que já foi pedido.
DO $$
DECLARE v_rid uuid; u_gar uuid; r jsonb; v_antes numeric; v_pay uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO u_gar FROM auth.users WHERE email = 'garcom-liberacao@teste.local';
  PERFORM pg_temp.como(u_gar);
  PERFORM open_table_ordering('mare-alta', '6');
  PERFORM pg_temp.como(NULL);
  r := pdv_customer_order('mare-alta', '6', '[{"code":"ord-suco","qty":1}]', 'Lia', 'ord-req-0010');
  SELECT ordered_quantity INTO v_antes FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '6' AND item_code = 'ord-suco';

  PERFORM set_restaurant_module(v_rid, 'order', 'suspended', 'Inadimplência (teste)', NULL, 'crm');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '6', '[{"code":"ord-suco","qty":1}]', 'Lia', 'ord-req-0011')$q$,
    'desativado', 'Order suspenso recusa novo pedido');
  PERFORM pg_temp.ok((SELECT ordered_quantity FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '6' AND item_code = 'ord-suco') = v_antes,
    'suspensão não mexe na conta da mesa');
  PERFORM pg_temp.ok((SELECT count(*) FROM pdv_order_items WHERE order_id = (r->>'order_id')::uuid AND status <> 'cancelled') = 1,
    'pedido já confirmado continua na cozinha');
  r := pdv_customer_order('mare-alta', '6', '[{"code":"ord-suco","qty":1}]', 'Lia', 'ord-req-0010');
  PERFORM pg_temp.ok((r->>'duplicate')::boolean, 'reenvio do mesmo pedido devolve o original, sem criar outro');
  v_pay := register_table_payment('mare-alta', '6', 'Lia', 'restaurant', 'pix', 'approved', 9.50, '{"ord-suco":1}', 'ord-pay-0001');
  PERFORM pg_temp.ok(v_pay IS NOT NULL, 'com o Order suspenso a conta continua sendo paga pelo Pay');
  PERFORM pg_temp.como(u_gar);
  PERFORM pg_temp.falha($q$SELECT open_table_ordering('mare-alta', '6')$q$, 'não está ativo', 'suspenso, a equipe não libera mesas');
  PERFORM pg_temp.como(NULL);
  PERFORM set_restaurant_module(v_rid, 'order', 'active', NULL, NULL, 'crm');
  PERFORM pg_temp.ok((SELECT count(*) FROM restaurant_module_events WHERE restaurant_id = v_rid AND to_status = 'suspended' AND actor_kind = 'crm') = 1, 'suspensão pelo CRM ficou na trilha');
END $$;

-- 5) Modo código curto: cada celular digita o código uma vez; dez erros bloqueiam.
DO $$
DECLARE v_rid uuid; u_gar uuid; r jsonb; c jsonb; v_bill text; v_code text; v_wrong text; i integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO u_gar FROM auth.users WHERE email = 'garcom-liberacao@teste.local';
  UPDATE restaurants SET order_session_mode = 'table_code' WHERE id = v_rid;
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number = '7';
  DELETE FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '7';
  PERFORM pg_temp.como(u_gar);
  r := open_table_ordering('mare-alta', '7');
  PERFORM pg_temp.como(NULL);
  v_code := r->>'code';
  PERFORM pg_temp.ok(v_code ~ '^[0-9]{4}$' AND (r->>'requires_code')::boolean, 'no modo código a liberação traz 4 dígitos');
  SELECT session_token INTO v_bill FROM restaurant_tables WHERE restaurant_id = v_rid AND number = '7';

  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '7', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0020')$q$,
    'Código da mesa', 'sem o código o celular não pede');
  v_wrong := CASE WHEN v_code = '0000' THEN '0001' ELSE '0000' END;
  c := claim_table_ordering('mare-alta', '7', v_bill, v_wrong);
  PERFORM pg_temp.ok(NOT (c->>'ok')::boolean AND c->>'reason' = 'wrong_code', 'código errado é recusado');
  c := claim_table_ordering('mare-alta', '7', 'sessao-antiga', v_code);
  PERFORM pg_temp.ok(NOT (c->>'ok')::boolean AND c->>'reason' = 'closed', 'código certo com conta antiga não vale');
  c := claim_table_ordering('mare-alta', '7', v_bill, v_code);
  PERFORM pg_temp.ok((c->>'ok')::boolean AND length(c->>'token') = 48, 'código certo entrega um token ao celular');
  PERFORM pg_temp.ok((SELECT count(*) FROM table_order_devices WHERE token_hash = c->>'token') = 0, 'o banco guarda só o hash do token');
  r := pdv_customer_order('mare-alta', '7', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0021', c->>'token');
  PERFORM pg_temp.ok((r->>'total')::numeric = 9.50, 'celular com token pede');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '7', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0022', 'token-inventado')$q$,
    'Código da mesa', 'token inventado é recusado');

  FOR i IN 1..10 LOOP c := claim_table_ordering('mare-alta', '7', v_bill, v_wrong); END LOOP;
  PERFORM pg_temp.ok(c->>'reason' = 'locked', 'dez erros bloqueiam o código');
  c := claim_table_ordering('mare-alta', '7', v_bill, v_code);
  PERFORM pg_temp.ok(NOT (c->>'ok')::boolean AND c->>'reason' = 'locked', 'bloqueado, nem o código certo passa');
  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.claim_table_ordering(text,text,text,text)', 'EXECUTE'), 'visitante não chama o código direto');
  PERFORM pg_temp.como(u_gar);
  r := open_table_ordering('mare-alta', '7');
  PERFORM pg_temp.como(NULL);
  PERFORM pg_temp.ok(NOT (r->>'reused')::boolean AND r->>'code' ~ '^[0-9]{4}$', 'liberar de novo depois do bloqueio gera outro código');
  c := claim_table_ordering('mare-alta', '7', v_bill, r->>'code');
  PERFORM pg_temp.ok((c->>'ok')::boolean, 'o código novo funciona');

  -- Mudar o modo no meio do serviço não afeta a liberação que já está aberta.
  UPDATE restaurants SET order_session_mode = 'staff_opens' WHERE id = v_rid;
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '7', '[{"code":"ord-suco","qty":1}]', 'Rui', 'ord-req-0023')$q$,
    'Código da mesa', 'liberação aberta com código continua exigindo código');
  PERFORM pg_temp.como(u_gar);
  PERFORM close_table_ordering('mare-alta', '7');
  PERFORM pg_temp.como(NULL);
END $$;

-- 6) Isolamento: um restaurante não vê módulos nem liberações de outro.
DO $$
DECLARE v_rid uuid; u_fora uuid; n integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO u_fora FROM auth.users WHERE email = 'garcom-outro-rest@teste.local';
  PERFORM pg_temp.como(u_fora);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM restaurant_modules WHERE restaurant_id = v_rid) + (SELECT count(*) FROM table_order_sessions WHERE restaurant_id = v_rid) INTO n;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 0, 'garçom de outro restaurante não vê módulos nem liberações');
  PERFORM pg_temp.como(NULL);
  UPDATE restaurants SET self_order_enabled = false WHERE id = v_rid;
END $$;
