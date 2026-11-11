-- Tipe Guest · permissões da equipe (0044). Rode com tests/db/run.sh.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

-- O papel manager vem da 0050 (PR #106); aqui só garante que existe no banco de teste.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';

DO $$
DECLARE
  v_rid uuid; v_outro uuid;
  u_dono uuid := gen_random_uuid(); u_ger uuid := gen_random_uuid(); u_cx uuid := gen_random_uuid();
  u_gar uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_dono,'p-dono@teste.local'),(u_ger,'p-ger@teste.local'),
    (u_cx,'p-cx@teste.local'),(u_gar,'p-gar@teste.local'),(u_fora,'p-fora@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono,'owner',v_rid),(u_ger,'manager',v_rid),
    (u_cx,'cashier',v_rid),(u_gar,'waiter',v_rid),(u_fora,'owner',v_outro);

  PERFORM pg_temp.ok(guest_staff_role(v_rid,u_dono)='admin' AND guest_staff_role(v_rid,u_ger)='gerente'
    AND guest_staff_role(v_rid,u_cx)='caixa' AND guest_staff_role(v_rid,u_gar)='garcom', 'papéis do Guest');
  PERFORM pg_temp.ok(guest_staff_role(v_rid,u_fora) IS NULL, 'dono de outro restaurante não entra');
  PERFORM pg_temp.ok(NOT guest_staff_can(v_rid,u_fora,'ver_reservas'), 'outro restaurante não vê reservas');
  PERFORM pg_temp.ok(guest_staff_can(v_rid,u_dono,'configurar_politicas'), 'administrador configura políticas');
  PERFORM pg_temp.ok(NOT guest_staff_can(v_rid,u_ger,'alterar_disponibilidade'), 'gerente sem concessão não muda disponibilidade');
  PERFORM guest_staff_grant(v_rid, u_dono, u_ger, 'alterar_disponibilidade', true);
  PERFORM pg_temp.ok(guest_staff_can(v_rid,u_ger,'alterar_disponibilidade'), 'gerente com concessão muda disponibilidade');
  PERFORM pg_temp.ok(NOT guest_staff_can(v_rid,u_cx,'criar_reserva'), 'caixa sem autorização não cria reserva');
  PERFORM guest_staff_grant(v_rid, u_dono, u_cx, 'criar_reserva', true);
  PERFORM pg_temp.ok(guest_staff_can(v_rid,u_cx,'criar_reserva'), 'caixa autorizado cria reserva');
  PERFORM guest_staff_grant(v_rid, u_dono, u_cx, 'criar_reserva', false);
  PERFORM pg_temp.ok(NOT guest_staff_can(v_rid,u_cx,'criar_reserva'), 'concessão retirada');
  PERFORM guest_staff_grant(v_rid, u_dono, u_gar, 'gerenciar_espera', true);
  PERFORM pg_temp.ok(NOT guest_staff_can(v_rid,u_gar,'gerenciar_espera'), 'garçom nunca gerencia espera, nem concedendo');
  BEGIN
    PERFORM guest_staff_grant(v_rid, u_ger, u_cx, 'criar_reserva', true);
    RAISE EXCEPTION 'FALHOU: gerente concedeu permissão';
  EXCEPTION WHEN raise_exception THEN
    PERFORM pg_temp.ok(SQLERRM LIKE '%só o administrador%', 'só o administrador concede');
  END;
  BEGIN
    PERFORM guest_staff_grant(v_rid, u_dono, u_fora, 'ver_reservas', true);
    RAISE EXCEPTION 'FALHOU: concedeu a quem não é da equipe';
  EXCEPTION WHEN raise_exception THEN
    PERFORM pg_temp.ok(SQLERRM LIKE '%não é da equipe%', 'não concede a quem é de fora');
  END;
  PERFORM pg_temp.ok(NOT has_function_privilege('authenticated','guest_staff_can(uuid,uuid,text)','EXECUTE'), 'usuário logado não chama direto');
END $$;
