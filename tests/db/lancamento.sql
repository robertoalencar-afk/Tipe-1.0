-- Lançamento idempotente (pdv_launch_order com p_request_id): toque duplo ou nova tentativa não duplica.
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
  v_rid uuid; w_bia uuid; o1 uuid; o2 uuid; o3 uuid; n numeric; k integer;
  u_bia uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  INSERT INTO auth.users (id, email) VALUES (u_bia, 'garcom-bia@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_bia, 'waiter', v_rid);
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id) VALUES (v_rid, 'g-bia', 'Bia Garçom', u_bia) RETURNING id INTO w_bia;
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'idem-suco';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'idem-suco', 'Suco', 9.00, 'bar');
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number = '4';
  DELETE FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4';
  PERFORM set_config('request.jwt.claim.sub', u_bia::text, true);

  o1 := pdv_launch_order('mare-alta', '4', w_bia, '[{"code":"idem-suco","qty":2}]', 'req-garcom-0001');
  o2 := pdv_launch_order('mare-alta', '4', w_bia, '[{"code":"idem-suco","qty":2}]', 'req-garcom-0001');
  PERFORM pg_temp.ok(o1 = o2, 'mesma requisição devolve o mesmo pedido');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4' AND item_code = 'idem-suco';
  PERFORM pg_temp.ok(n = 2, 'toque duplo não duplica os itens na conta do QR');
  SELECT count(*) INTO k FROM pdv_order_items WHERE order_id = o1;
  PERFORM pg_temp.ok(k = 1, 'toque duplo não duplica os itens no KDS');

  o3 := pdv_launch_order('mare-alta', '4', w_bia, '[{"code":"idem-suco","qty":1}]', 'req-garcom-0002');
  PERFORM pg_temp.ok(o3 <> o1, 'requisição nova lança um pedido novo');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4' AND item_code = 'idem-suco';
  PERFORM pg_temp.ok(n = 3, 'pedido novo soma na conta');

  -- Sem request_id (versão de 4 argumentos) continua lançando como antes.
  PERFORM pdv_launch_order('mare-alta', '4', w_bia, '[{"code":"idem-suco","qty":1}]');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4' AND item_code = 'idem-suco';
  PERFORM pg_temp.ok(n = 4, 'chamada antiga sem requisição segue funcionando');
  PERFORM pg_temp.ok((SELECT waiter_id FROM restaurant_tables WHERE restaurant_id = v_rid AND number = '4') = w_bia, 'quem lançou por último fica com a mesa');

  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '4', %L, '[{"code":"idem-suco","qty":1}]', 'curta')$q$, w_bia),
    'Requisição inválida', 'requisição fora do formato é recusada');

  -- Outro restaurante não reaproveita a requisição para ler o pedido daqui.
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '4', %L, '[{"code":"idem-suco","qty":1}]', 'req-garcom-0001')$q$, w_bia),
    'Sem permissão', 'sem papel no restaurante não recebe o pedido de volta');
END $$;
