-- Verificação em duas etapas no banco (migração 0035). Rode com tests/db/run.sh.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

-- Dois donos do mesmo restaurante: um com 2FA ativo, outro sem.
DO $$
DECLARE r uuid; u2 uuid := gen_random_uuid(); u1 uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u2, 'com-2fa@mfa.test'), (u1, 'sem-2fa@mfa.test');
  INSERT INTO auth.mfa_factors (user_id, status, factor_type) VALUES (u2, 'verified', 'totp'), (u1, 'unverified', 'totp');
  INSERT INTO restaurants (slug, name) VALUES ('mfa-teste', 'MFA Teste') RETURNING id INTO r;
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u2, 'owner', r), (u1, 'owner', r);
  CREATE TEMP TABLE mfa_ids (k text PRIMARY KEY, v uuid);
  GRANT SELECT ON mfa_ids TO authenticated;
  INSERT INTO mfa_ids VALUES ('r', r), ('u2', u2), ('u1', u1);
END $$;

SELECT pg_temp.ok((SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = 'mfa_if_enrolled')) = 0,
  '2FA: toda tabela com RLS tem a política restritiva mfa_if_enrolled');

SET ROLE authenticated;
-- Sem 2FA (fator não confirmado não conta): sessão com senha continua valendo.
SELECT set_config('request.jwt.claim.sub', (SELECT v FROM mfa_ids WHERE k = 'u1')::text, false);
SELECT set_config('request.jwt.claims', '{"aal":"aal1"}', false);
SELECT pg_temp.ok(public.mfa_session_ok(), '2FA: conta sem 2FA confirmado passa com aal1');
SELECT pg_temp.ok(is_restaurant_member((SELECT v FROM mfa_ids WHERE k = 'u1'), (SELECT v FROM mfa_ids WHERE k = 'r')), '2FA: dono sem 2FA continua membro do restaurante');
SELECT pg_temp.ok((SELECT count(*) FROM restaurants WHERE slug = 'mfa-teste') = 1, '2FA: dono sem 2FA lê o próprio restaurante');

-- Com 2FA e só senha (aal1): o banco recusa.
SELECT set_config('request.jwt.claim.sub', (SELECT v FROM mfa_ids WHERE k = 'u2')::text, false);
SELECT pg_temp.ok(NOT public.mfa_session_ok(), '2FA: conta com 2FA em sessão aal1 não passa');
SELECT pg_temp.ok(NOT is_restaurant_member((SELECT v FROM mfa_ids WHERE k = 'u2'), (SELECT v FROM mfa_ids WHERE k = 'r'))
  AND NOT has_restaurant_role((SELECT v FROM mfa_ids WHERE k = 'u2'), (SELECT v FROM mfa_ids WHERE k = 'r'), ARRAY['owner']::app_role[])
  AND NOT is_member_of_slug((SELECT v FROM mfa_ids WHERE k = 'u2'), 'mfa-teste'),
  '2FA: funções de papel recusam o próprio usuário em aal1 (RPCs ficam bloqueadas)');
SELECT pg_temp.ok(is_restaurant_member((SELECT v FROM mfa_ids WHERE k = 'u1'), (SELECT v FROM mfa_ids WHERE k = 'r')),
  '2FA: pergunta sobre outro usuário não depende do 2FA de quem pergunta');
SELECT pg_temp.ok((SELECT count(*) FROM user_roles) = 0, '2FA: tabelas ficam vazias para sessão aal1 de quem tem 2FA');

-- Com 2FA confirmado (aal2): tudo volta.
SELECT set_config('request.jwt.claims', '{"aal":"aal2"}', false);
SELECT pg_temp.ok(public.mfa_session_ok() AND is_restaurant_member((SELECT v FROM mfa_ids WHERE k = 'u2'), (SELECT v FROM mfa_ids WHERE k = 'r')),
  '2FA: sessão aal2 volta a ter acesso');
SELECT pg_temp.ok((SELECT count(*) FROM restaurants WHERE slug = 'mfa-teste') = 1, '2FA: dono com aal2 lê o restaurante');
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
RESET ROLE;

-- Servidor com chave de serviço (sem usuário na sessão) não é afetado.
SELECT pg_temp.ok(public.mfa_session_ok() AND has_restaurant_role((SELECT v FROM mfa_ids WHERE k = 'u2'), (SELECT v FROM mfa_ids WHERE k = 'r'), ARRAY['owner']::app_role[]),
  '2FA: chamadas do servidor sem sessão de usuário seguem funcionando');

DELETE FROM user_roles WHERE restaurant_id = (SELECT v FROM mfa_ids WHERE k = 'r');
DELETE FROM restaurants WHERE slug = 'mfa-teste';
DELETE FROM auth.mfa_factors WHERE user_id IN (SELECT v FROM mfa_ids);
