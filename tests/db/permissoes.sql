-- Gerente, permissões, suspensão, convites e isolamento entre restaurantes (migrações 0050/0051).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

DO $$
DECLARE
  ra uuid; rb uuid;
  u_dono uuid := gen_random_uuid(); u_ger uuid := gen_random_uuid(); u_cx uuid := gen_random_uuid(); u_gc uuid := gen_random_uuid(); u_outro uuid := gen_random_uuid();
  n integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u_dono,'dono-perm@t.local'),(u_ger,'ger-perm@t.local'),(u_cx,'cx-perm@t.local'),(u_gc,'gc-perm@t.local'),(u_outro,'outro-perm@t.local');
  INSERT INTO restaurants (slug, name) VALUES ('perm-a','Perm A') RETURNING id INTO ra;
  INSERT INTO restaurants (slug, name) VALUES ('perm-b','Perm B') RETURNING id INTO rb;
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono,'owner',ra),(u_ger,'manager',ra),(u_cx,'cashier',ra),(u_gc,'waiter',ra),(u_outro,'owner',rb);
  INSERT INTO staff_members (user_id, restaurant_id, display_name, email) VALUES (u_ger,ra,'Ger','ger-perm@t.local'),(u_cx,ra,'Cx','cx-perm@t.local'),(u_gc,ra,'Gc','gc-perm@t.local');

  PERFORM pg_temp.ok(has_restaurant_role(u_ger, ra, ARRAY['cashier']::app_role[]), 'gerente opera onde o caixa opera');
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_ger, ra, ARRAY['owner']::app_role[]), 'gerente não é administrador');
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_cx, ra, ARRAY['owner']::app_role[]), 'caixa não é administrador');
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_gc, ra, ARRAY['cashier']::app_role[]), 'garçom não opera o caixa');
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_ger, rb, ARRAY['cashier','owner']::app_role[]), 'gerente de A não tem acesso a B');
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_outro, ra, ARRAY['cashier','owner']::app_role[]), 'administrador de B não tem acesso a A');
  PERFORM pg_temp.ok(NOT is_restaurant_member(u_outro, ra), 'não membro não é membro');

  PERFORM pg_temp.ok(restaurant_can(u_dono, ra, 'equipe.ver') AND restaurant_can(u_dono, ra, 'cardapio.editar'), 'administrador tem todas as permissões');
  PERFORM pg_temp.ok(restaurant_can(u_ger, ra, 'relatorios.ver'), 'gerente vê relatórios');
  PERFORM pg_temp.ok(NOT restaurant_can(u_cx, ra, 'relatorios.ver'), 'caixa não vê relatórios por padrão');
  PERFORM pg_temp.ok(NOT restaurant_can(u_gc, ra, 'caixa.operar'), 'garçom não opera caixa');
  PERFORM pg_temp.ok(NOT restaurant_can(u_ger, rb, 'relatorios.ver'), 'permissão não vaza para outro restaurante');

  INSERT INTO restaurant_permission_grants (restaurant_id, user_id, permission) VALUES (ra, u_cx, 'relatorios.ver');
  PERFORM pg_temp.ok(restaurant_can(u_cx, ra, 'relatorios.ver'), 'concessão extra libera a permissão');
  PERFORM pg_temp.ok(NOT restaurant_can(u_cx, rb, 'relatorios.ver'), 'concessão vale só no restaurante concedido');

  UPDATE staff_members SET suspended_at = now() WHERE user_id = u_ger AND restaurant_id = ra;
  PERFORM pg_temp.ok(NOT has_restaurant_role(u_ger, ra, ARRAY['cashier']::app_role[]), 'suspenso perde o papel');
  PERFORM pg_temp.ok(NOT restaurant_can(u_ger, ra, 'relatorios.ver') AND NOT is_restaurant_member(u_ger, ra), 'suspenso perde permissões e associação');
  UPDATE staff_members SET suspended_at = NULL WHERE user_id = u_ger AND restaurant_id = ra;
  PERFORM pg_temp.ok(has_restaurant_role(u_ger, ra, ARRAY['cashier']::app_role[]), 'reativado volta a operar');

  -- RLS: authenticated só lê o que pode; ninguém escreve direto.
  PERFORM set_config('request.jwt.claim.sub', u_cx::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM staff_invites; PERFORM pg_temp.ok(n = 0, 'caixa não lê convites');
  SELECT count(*) INTO n FROM staff_audit_log; PERFORM pg_temp.ok(n = 0, 'caixa não lê auditoria');
  BEGIN
    INSERT INTO restaurant_permission_grants (restaurant_id, user_id, permission) VALUES (ra, u_cx, 'caixa.operar');
    RAISE EXCEPTION 'FALHOU: caixa conseguiu se conceder permissão';
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok(true, 'caixa não escreve concessões direto no banco');
  END;
  RESET ROLE;
END $$;
