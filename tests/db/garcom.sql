-- Cenários do garçom lançando pedido pelo celular (pdv_launch_order com o papel waiter).
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
  v_rid uuid; v_outro uuid; w_ana uuid; w_fora uuid; v_order uuid; n numeric;
  u_ana uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid(); u_bia uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid(); w_bia uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_ana, 'garcom-ana@teste.local'), (u_fora, 'garcom-fora@teste.local'), (u_bia, 'garcom-bia@teste.local'), (u_dono, 'dono-g@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_ana, 'waiter', v_rid), (u_fora, 'waiter', v_outro), (u_bia, 'waiter', v_rid), (u_dono, 'owner', v_rid);
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id) VALUES (v_rid, 'g-ana', 'Ana Garçom', u_ana) RETURNING id INTO w_ana;
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id) VALUES (v_outro, 'g-fora', 'Fora', u_fora) RETURNING id INTO w_fora;
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id) VALUES (v_rid, 'g-bea', 'Bea Garçom', u_bia) RETURNING id INTO w_bia;
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = 'gar-prato';
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'gar-prato', 'Prato do dia', 45.00, 'kitchen');
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number = '3';
  DELETE FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '3';

  -- Mesa sem garçom designado: nem a Ana lança. O dono designa e só então ela pode.
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  UPDATE restaurant_tables SET waiter_id = NULL WHERE restaurant_id = v_rid AND number = '3';
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_ana),
    'não está designada', 'garçom não lança em mesa sem designação');
  PERFORM pg_temp.falha($q$SELECT assign_table_waiter('mare-alta', '3', NULL)$q$, 'Sem permissão', 'garçom não designa mesa');
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  PERFORM assign_table_waiter('mare-alta', '3', w_ana);
  PERFORM pg_temp.ok((SELECT waiter_id FROM restaurant_tables WHERE restaurant_id = v_rid AND number = '3') = w_ana, 'dono designa a mesa à Ana');
  PERFORM pg_temp.falha(format($q$SELECT assign_table_waiter('mare-alta', '3', %L)$q$, w_fora), 'Garçom inválido', 'dono não designa garçom de outro restaurante');

  -- Outro garçom do mesmo restaurante (Bia) não lança na mesa da Ana, nem no nome da Ana.
  PERFORM set_config('request.jwt.claim.sub', u_bia::text, true);
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_bia),
    'não está designada', 'Bia não lança na mesa da Ana');
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_ana),
    'Garçom inválido', 'Bia não lança no nome da Ana');
  PERFORM pg_temp.falha($q$SELECT open_table_ordering('mare-alta', '3')$q$, 'não está designada', 'Bia não libera o celular da mesa da Ana');

  -- Garçom do restaurante lança na mesa: o item cai na conta do QR e no KDS.
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  v_order := pdv_launch_order('mare-alta', '3', w_ana, '[{"code":"gar-prato","qty":2,"notes":"sem cebola"}]');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '3' AND item_code = 'gar-prato';
  PERFORM pg_temp.ok(n = 2, 'pedido do garçom aparece na conta da mesa');
  PERFORM pg_temp.ok((SELECT count(*) FROM pdv_order_items WHERE order_id = v_order AND notes = 'sem cebola') = 1, 'pedido do garçom vai para a cozinha com a observação');
  PERFORM pg_temp.ok((SELECT waiter_id FROM restaurant_tables WHERE restaurant_id = v_rid AND number = '3') = w_ana, 'mesa continua com a Ana');

  -- KDS: garçom só marca entregue; começar preparo é da estação ou do painel.
  PERFORM pg_temp.falha(format($q$SELECT pdv_order_bump(%L, 'preparing')$q$, v_order), 'preparo é da cozinha', 'garçom não começa o preparo');
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  PERFORM pdv_order_bump(v_order, 'ready');
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  PERFORM pdv_order_bump(v_order, 'delivered');
  PERFORM pg_temp.ok((SELECT count(*) FROM pdv_order_items WHERE order_id = v_order AND status = 'delivered') = 1, 'garçom marca entregue o que a cozinha deixou pronto');

  -- Segundo lançamento soma na mesma linha da conta.
  PERFORM pdv_launch_order('mare-alta', '3', w_ana, '[{"code":"gar-prato","qty":1}]');
  SELECT ordered_quantity INTO n FROM table_bill_items WHERE restaurant_slug = 'mare-alta' AND table_number = '3' AND item_code = 'gar-prato';
  PERFORM pg_temp.ok(n = 3, 'novo lançamento soma na conta');

  -- Garçom de outro restaurante não lança aqui.
  PERFORM set_config('request.jwt.claim.sub', u_fora::text, true);
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_fora),
    'Sem permissão', 'garçom de outro restaurante é bloqueado');

  -- Garçom desativado não lança.
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  UPDATE pdv_waiters SET active = false WHERE id = w_ana;
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_ana),
    'Garçom inválido', 'garçom desativado é bloqueado');
  UPDATE pdv_waiters SET active = true WHERE id = w_ana;

  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '3', %L, '[]')$q$, w_ana), 'Pedido vazio', 'pedido vazio é recusado');
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('mare-alta', '999', %L, '[{"code":"gar-prato","qty":1}]')$q$, w_ana), 'Mesa inativa', 'mesa inexistente é recusada');
END $$;
