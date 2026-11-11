-- Cenários do totem de autoatendimento (pdv_totem_order e pdv_settle_totem_order).
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
  v_rid uuid; r1 jsonb; r2 jsonb; s jsonb; n integer;
  u_caixa uuid := gen_random_uuid(); u_garcom uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  INSERT INTO auth.users (id, email) VALUES (u_caixa, 'caixa-totem@teste.local'), (u_garcom, 'garcom-totem@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_caixa, 'cashier', v_rid), (u_garcom, 'waiter', v_rid);
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'tot-acai';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'tot-acai', 'Açaí', 18.00, 'kitchen');
  UPDATE cash_sessions SET closed_at = now() WHERE restaurant_id = v_rid AND closed_at IS NULL;

  PERFORM pg_temp.falha($q$SELECT pdv_totem_order('mare-alta', '[{"code":"tot-acai","qty":1}]', 'Lia', 'tot-req-0001')$q$,
    'Totem desativado', 'totem vem desligado');
  UPDATE restaurants SET totem_enabled = true WHERE id = v_rid;

  -- Pedido do totem tem senha mas não vai para a cozinha antes de pagar.
  r1 := pdv_totem_order('mare-alta', '[{"code":"tot-acai","qty":2}]', 'Lia', 'tot-req-0002');
  PERFORM pg_temp.ok((r1->>'total')::numeric = 36.00 AND (r1->>'ticket') IS NOT NULL, 'totem gera senha com total do servidor');
  SELECT count(*) INTO n FROM pdv_order_items WHERE order_id = (r1->>'order_id')::uuid AND status = 'pending_payment';
  PERFORM pg_temp.ok(n = 1, 'item do totem aguarda pagamento, fora da cozinha');
  r2 := pdv_totem_order('mare-alta', '[{"code":"tot-acai","qty":2}]', 'Lia', 'tot-req-0002');
  PERFORM pg_temp.ok(r2->>'order_id' = r1->>'order_id', 'toque duplo no totem não duplica o pedido');

  -- Cobrança: só dono ou caixa, com caixa aberto e dinheiro suficiente.
  PERFORM set_config('request.jwt.claim.sub', u_garcom::text, true);
  PERFORM pg_temp.falha(format('SELECT pdv_settle_totem_order(%L, %L, NULL)', r1->>'order_id', 'pix'), 'Sem permissão', 'garçom não cobra o totem');
  PERFORM set_config('request.jwt.claim.sub', u_caixa::text, true);
  PERFORM pg_temp.falha(format('SELECT pdv_settle_totem_order(%L, %L, NULL)', r1->>'order_id', 'pix'), 'Abra o caixa', 'cobrança exige caixa aberto');
  INSERT INTO cash_sessions (restaurant_id, opened_by, opening_amount) VALUES (v_rid, u_caixa, 50);
  PERFORM pg_temp.falha(format('SELECT pdv_settle_totem_order(%L, %L, %s)', r1->>'order_id', 'cash', 20), 'menor que o total', 'dinheiro insuficiente é recusado');
  s := pdv_settle_totem_order((r1->>'order_id')::uuid, 'cash', 40);
  PERFORM pg_temp.ok((s->>'change')::numeric = 4.00, 'troco do totem calculado no servidor');
  SELECT count(*) INTO n FROM pdv_order_items WHERE order_id = (r1->>'order_id')::uuid AND status = 'received';
  PERFORM pg_temp.ok(n = 1, 'depois de pago o item vai para a cozinha');
  PERFORM pg_temp.falha(format('SELECT pdv_settle_totem_order(%L, %L, NULL)', r1->>'order_id', 'pix'), 'já cobrado', 'pedido não é cobrado duas vezes');

  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.pdv_totem_order(text,jsonb,text,text)', 'EXECUTE'), 'visitante anônimo não chama o totem direto');
  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.pdv_settle_totem_order(uuid,text,numeric)', 'EXECUTE'), 'visitante anônimo não cobra o totem');
  UPDATE restaurants SET totem_enabled = false WHERE id = v_rid;
  UPDATE cash_sessions SET closed_at = now() WHERE restaurant_id = v_rid AND closed_at IS NULL;
END $$;
