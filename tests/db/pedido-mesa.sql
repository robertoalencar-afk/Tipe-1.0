-- Cenários do cliente pedindo pela mesa (cardápio digital, pdv_customer_order).
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
DECLARE v_rid uuid; r1 jsonb; r2 jsonb; n numeric;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'cli-pastel';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'cli-pastel', 'Pastel', 14.00, 'kitchen');
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number = '4';
  DELETE FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4';

  -- Desligado por padrão.
  PERFORM pg_temp.ok((SELECT NOT self_order_enabled FROM restaurants WHERE id = v_rid), 'pedido pela mesa vem desligado');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '4', '[{"code":"cli-pastel","qty":1}]', 'Rui', 'cli-req-0001')$q$,
    'desativado', 'com a opção desligada o pedido é recusado');

  UPDATE restaurants SET self_order_enabled = true WHERE id = v_rid;
  r1 := pdv_customer_order('mare-alta', '4', '[{"code":"cli-pastel","qty":3,"notes":"bem passado"}]', 'Rui Costa', 'cli-req-0002');
  PERFORM pg_temp.ok((r1->>'total')::numeric = 42.00, 'total do pedido calculado no servidor');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4' AND item_code = 'cli-pastel';
  PERFORM pg_temp.ok(n = 3, 'pedido do cliente aparece na conta da mesa');
  PERFORM pg_temp.ok((SELECT count(*) FROM pdv_order_items WHERE order_id = (r1->>'order_id')::uuid AND notes = 'bem passado') = 1, 'pedido do cliente vai para a cozinha');

  r2 := pdv_customer_order('mare-alta', '4', '[{"code":"cli-pastel","qty":3}]', 'Rui Costa', 'cli-req-0002');
  PERFORM pg_temp.ok(r2->>'order_id' = r1->>'order_id' AND (r2->>'duplicate')::boolean, 'clique duplo não duplica o pedido');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '4' AND item_code = 'cli-pastel';
  PERFORM pg_temp.ok(n = 3, 'conta não soma o pedido repetido');

  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '999', '[{"code":"cli-pastel","qty":1}]', NULL, 'cli-req-0003')$q$,
    'Mesa inativa', 'mesa inexistente é recusada');
  PERFORM pg_temp.falha($q$SELECT pdv_customer_order('mare-alta', '4', '[{"code":"cli-pastel","qty":0}]', NULL, 'cli-req-0004')$q$,
    'Quantidade', 'quantidade inválida é recusada');

  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.pdv_customer_order(text,text,jsonb,text,text)', 'EXECUTE'), 'visitante anônimo não chama a função direto');
  PERFORM pg_temp.ok(NOT has_function_privilege('authenticated', 'public.pdv_customer_order(text,text,jsonb,text,text)', 'EXECUTE'), 'usuário logado não chama a função direto');
  UPDATE restaurants SET self_order_enabled = false WHERE id = v_rid;
END $$;
