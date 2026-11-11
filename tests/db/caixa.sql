-- Caixa conferido no servidor (cash_expected, cash_close_counted): esperado por forma de pagamento.
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
    PERFORM pg_temp.ok(SQLERRM LIKE '%' || p_like || '%', msg);
    RETURN;
  END;
  RAISE EXCEPTION 'FALHOU: % (não houve erro)', msg;
END $$;


DO $$
DECLARE
  v_rid uuid; v_outro uuid; e jsonb; f jsonb; p_mesa uuid := gen_random_uuid(); p_arq uuid := gen_random_uuid(); p_velho uuid := gen_random_uuid();
  u_caixa uuid := gen_random_uuid(); u_intruso uuid := gen_random_uuid(); v_sid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_caixa, 'caixa-conf@teste.local'), (u_intruso, 'intruso-caixa@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_caixa, 'cashier', v_rid), (u_intruso, 'owner', v_outro);
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'cx-prato';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'cx-prato', 'Prato', 30.00, 'kitchen');
  UPDATE cash_sessions SET closed_at = now() WHERE restaurant_id = v_rid AND closed_at IS NULL;
  PERFORM set_config('request.jwt.claim.sub', u_caixa::text, true);

  -- Pagamento de mesa confirmado ANTES de o caixa abrir: não entra neste turno.
  INSERT INTO table_payment_requests (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, idempotency_key, establishment_method, cash_received, change_due)
  VALUES (p_velho, 'mare-alta', '6', 'Turno Anterior', 'restaurant', 'at_establishment', 'approved', 99, '{}', 'cx-velho-0001', 'card_terminal', NULL, NULL);
  INSERT INTO payment_audit_log (payment_id, restaurant_slug, table_number, action, amount, created_at) VALUES (p_velho, 'mare-alta', '6', 'confirm', 99, now() - interval '1 hour');

  PERFORM cash_open('mare-alta', 100);
  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL;
  -- O "agora" da transação é o mesmo da abertura; a abertura passa a valer um minuto antes.
  UPDATE cash_sessions SET opened_at = now() - interval '1 minute' WHERE id = v_sid;
  PERFORM cash_move('mare-alta', 'deposit', 20, 'Reforço de troco');
  PERFORM cash_move('mare-alta', 'withdrawal', 30, 'Sangria');
  PERFORM pdv_counter_sale('mare-alta', '[{"code":"cx-prato","qty":2}]', 'Ana', 'cash', 100, 'cx-balcao-0001');
  PERFORM pdv_counter_sale('mare-alta', '[{"code":"cx-prato","qty":1}]', NULL, 'card', NULL, 'cx-balcao-0002');
  PERFORM pdv_counter_sale('mare-alta', '[{"code":"cx-prato","qty":1}]', NULL, 'pix', NULL, 'cx-balcao-0003');

  -- Mesa paga em dinheiro e confirmada no turno; outra mesa na maquininha, já reaberta (arquivada).
  INSERT INTO table_payment_requests (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, idempotency_key, establishment_method, cash_received, change_due)
  VALUES (p_mesa, 'mare-alta', '6', 'Bia Melo', 'restaurant', 'at_establishment', 'approved', 40, '{}', 'cx-mesa-0001', 'cash', 50, 10);
  INSERT INTO payment_audit_log (payment_id, restaurant_slug, table_number, action, amount) VALUES (p_mesa, 'mare-alta', '6', 'confirm', 40);
  INSERT INTO archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, establishment_method)
  VALUES (p_arq, 'mare-alta', '7', 'Caio Reis', 'restaurant', 'at_establishment', 'approved', 25, '{}', now(), 'cx-arq-0001', 'card_terminal');
  INSERT INTO payment_audit_log (payment_id, restaurant_slug, table_number, action, amount) VALUES (p_arq, 'mare-alta', '7', 'confirm', 25);

  e := cash_expected('mare-alta');
  -- 100 + 20 − 30 + 60 (balcão) + 40 (mesa) = 190 em espécie; 30 (balcão) + 25 (mesa) = 55 na maquininha.
  PERFORM pg_temp.ok((e->>'expected_cash')::numeric = 190, 'espécie esperada calculada no servidor');
  PERFORM pg_temp.ok((e->>'expected_card')::numeric = 55, 'maquininha esperada inclui mesa arquivada');
  PERFORM pg_temp.ok((e->>'counter_pix')::numeric = 30, 'Pix do balcão fica à parte');
  PERFORM pg_temp.ok((e->>'table_card')::numeric = 25, 'pagamento de turno anterior não entra');

  PERFORM set_config('request.jwt.claim.sub', u_intruso::text, true);
  PERFORM pg_temp.falha($q$SELECT cash_expected('mare-alta')$q$, 'Sem permissão', 'outro restaurante não lê o caixa');
  PERFORM pg_temp.falha($q$SELECT cash_close_counted('mare-alta', 0, 0, '')$q$, 'Sem permissão', 'outro restaurante não fecha o caixa');

  PERFORM set_config('request.jwt.claim.sub', u_caixa::text, true);
  PERFORM pg_temp.falha($q$SELECT cash_close_counted('mare-alta', -1, 0, '')$q$, 'inválido', 'contagem negativa é recusada');
  f := cash_close_counted('mare-alta', 185, 55, 'faltaram 5 de troco');
  PERFORM pg_temp.ok((f->>'difference_cash')::numeric = -5 AND (f->>'difference_card')::numeric = 0, 'diferença por forma calculada no servidor');
  PERFORM pg_temp.ok((SELECT expected_amount = 245 AND counted_amount = 240 AND (expected_by_method->>'expected_cash')::numeric = 190 FROM cash_sessions WHERE id = v_sid), 'fechamento grava o esperado do servidor');
  PERFORM pg_temp.ok(cash_expected('mare-alta') IS NULL, 'sem caixa aberto não há esperado');

  -- A versão antiga ignora o esperado enviado pelo navegador.
  PERFORM cash_open('mare-alta', 50);
  -- Turno novo começa depois dos pagamentos acima (na mesma transação o relógio não anda).
  UPDATE cash_sessions SET opened_at = now() + interval '1 second' WHERE restaurant_id = v_rid AND closed_at IS NULL RETURNING id INTO v_sid;
  PERFORM cash_close('mare-alta', 50, 9999, '');
  PERFORM pg_temp.ok((SELECT expected_amount FROM cash_sessions WHERE id = v_sid) = 50, 'cash_close antigo grava o esperado do servidor, não o do navegador');
END $$;
