-- Chamado da mesa (table_calls, resolve_table_call): só a equipe do restaurante lê e atende.
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
  v_rid uuid; v_outro uuid; c1 uuid; n integer;
  u_gar uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_gar, 'garcom-chamado@teste.local'), (u_fora, 'fora-chamado@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_gar, 'waiter', v_rid), (u_fora, 'owner', v_outro);

  -- O servidor grava o chamado; repetir enquanto está aberto não cria outro.
  INSERT INTO table_calls (restaurant_id, table_number, kind, session_token) VALUES (v_rid, '5', 'waiter', 'sessao-mesa-5') RETURNING id INTO c1;
  INSERT INTO table_calls (restaurant_id, table_number, kind, session_token) VALUES (v_rid, '5', 'waiter', 'sessao-mesa-5') ON CONFLICT DO NOTHING;
  SELECT count(*) INTO n FROM table_calls WHERE restaurant_id = v_rid AND table_number = '5' AND resolved_at IS NULL;
  PERFORM pg_temp.ok(n = 1, 'chamado repetido não empilha');
  INSERT INTO table_calls (restaurant_id, table_number, kind, session_token) VALUES (v_rid, '5', 'bill', 'sessao-mesa-5');
  SELECT count(*) INTO n FROM table_calls WHERE restaurant_id = v_rid AND table_number = '5' AND resolved_at IS NULL;
  PERFORM pg_temp.ok(n = 2, 'pedir a conta é um chamado à parte');

  -- Outro restaurante não atende o chamado daqui.
  PERFORM set_config('request.jwt.claim.sub', u_fora::text, true);
  PERFORM pg_temp.falha(format('SELECT resolve_table_call(%L)', c1), 'Sem permissão', 'outro restaurante não atende o chamado');

  -- Garçom do restaurante marca como atendido; depois disso pode chamar de novo.
  PERFORM set_config('request.jwt.claim.sub', u_gar::text, true);
  PERFORM resolve_table_call(c1);
  PERFORM pg_temp.ok((SELECT resolved_at IS NOT NULL AND resolved_by = u_gar FROM table_calls WHERE id = c1), 'garçom marca o chamado como atendido');
  INSERT INTO table_calls (restaurant_id, table_number, kind, session_token) VALUES (v_rid, '5', 'waiter', 'sessao-mesa-5');
  PERFORM pg_temp.ok(true, 'depois de atendido, a mesa pode chamar de novo');
END $$;

-- Leitura pelo cliente anônimo é bloqueada (só o servidor grava e a equipe lê).
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM count(*) FROM public.table_calls;
    RAISE EXCEPTION 'FALHOU: anônimo leu chamados';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: anônimo não lê chamados';
  END;
END $$;
RESET ROLE;

-- O celular da equipe pode silenciar os chamados (constraint de muted_kinds aceita 'chamado').
DO $$ BEGIN
  PERFORM pg_temp.ok(
    pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'staff_push_subscriptions_muted_kinds_check')) LIKE '%chamado%',
    'muted_kinds aceita chamado');
END $$;
