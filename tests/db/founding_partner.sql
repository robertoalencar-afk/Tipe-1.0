-- Programa Restaurante Fundador (migrações 0041 e 0073, etapas novas) contra o banco real de teste.
-- Rode com tests/db/run.sh. Cada bloco falha com RAISE EXCEPTION se a regra não for cumprida.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

-- Dois restaurantes, um dono em cada, e um membro da equipe Tipe.
DO $$
DECLARE ra uuid; rb uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); ut uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (ua, 'dono-a@fp.test'), (ub, 'dono-b@fp.test'), (ut, 'equipe@fp.test');
  INSERT INTO restaurants (slug, name) VALUES ('fp-a', 'Fundador A') RETURNING id INTO ra;
  INSERT INTO restaurants (slug, name) VALUES ('fp-b', 'Fundador B') RETURNING id INTO rb;
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (ua, 'owner', ra), (ub, 'owner', rb), (ut, 'founder', NULL);
  CREATE TEMP TABLE fp_ids (k text PRIMARY KEY, v uuid);
  GRANT SELECT ON fp_ids TO authenticated;
  INSERT INTO fp_ids VALUES ('ra', ra), ('rb', rb), ('ua', ua), ('ub', ub), ('ut', ut);
END $$;

-- 1) Regras comerciais nascem vazias.
DO $$
DECLARE r founding_partner_rules;
BEGIN
  SELECT * INTO r FROM founding_partner_rules WHERE singleton;
  PERFORM pg_temp.ok(r.slots IS NULL AND r.enrollment_opens_at IS NULL AND r.enrollment_closes_at IS NULL
    AND cardinality(r.advantages) = 0 AND r.approved_at IS NULL AND r.terms_version IS NULL,
    'Fundador: regras comerciais vazias por padrão (vagas, período, vantagens, termos)');
END $$;

-- 2) Convite cria adesão como interessado, com evento de auditoria.
DO $$
DECLARE e founding_partner_enrollments; ut uuid := (SELECT v FROM fp_ids WHERE k = 'ut');
BEGIN
  e := founding_partner_invite((SELECT v FROM fp_ids WHERE k = 'ra'), NULL, 'email', 'teste', ut);
  PERFORM pg_temp.ok(e.status = 'interessado', 'Fundador: convite cria adesão como interessado');
  PERFORM pg_temp.ok((SELECT count(*) FROM founding_partner_events WHERE enrollment_id = e.id AND kind = 'estado' AND to_status = 'interessado' AND actor_id = ut) = 1
    AND (SELECT count(*) FROM founding_partner_events WHERE enrollment_id = e.id AND kind = 'convite') = 1,
    'Fundador: criação e convite auditados com o ator');
  PERFORM founding_partner_invite((SELECT v FROM fp_ids WHERE k = 'rb'), NULL, 'whatsapp', '', ut);
  BEGIN
    PERFORM founding_partner_invite((SELECT v FROM fp_ids WHERE k = 'ra'), NULL, 'email', '', ut);
    RAISE EXCEPTION 'FALHOU: convite duplicado aceito';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: mesmo restaurante não é convidado duas vezes');
  END;
END $$;

-- 3) Mudança de estado: válida é auditada; inválida é recusada sem deixar rastro.
DO $$
DECLARE id_a uuid := (SELECT id FROM founding_partner_enrollments WHERE restaurant_id = (SELECT v FROM fp_ids WHERE k = 'ra'));
        ut uuid := (SELECT v FROM fp_ids WHERE k = 'ut'); n_before int; n_after int;
BEGIN
  PERFORM founding_partner_set_status(id_a, 'selecionado', '', ut);
  PERFORM pg_temp.ok((SELECT count(*) FROM founding_partner_events WHERE enrollment_id = id_a AND kind = 'estado'
    AND from_status = 'interessado' AND to_status = 'selecionado' AND actor_id = ut) = 1,
    'Fundador: interessado → selecionado auditado com estado anterior, novo e ator');
  SELECT count(*) INTO n_before FROM founding_partner_events WHERE enrollment_id = id_a;
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'em_testes', '', ut);
    RAISE EXCEPTION 'FALHOU: pulou de selecionado para em testes';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO n_after FROM founding_partner_events WHERE enrollment_id = id_a;
  PERFORM pg_temp.ok(n_before = n_after AND (SELECT status FROM founding_partner_enrollments WHERE id = id_a) = 'selecionado',
    'Fundador: transição não permitida é recusada e não gera evento');
  -- Sem versão de termos aprovada, ninguém participa.
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'em_implantacao', '', ut);
    RAISE EXCEPTION 'FALHOU: entrou em implantação sem termos';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(SQLERRM LIKE '%termos%', 'Fundador: entrar em implantação exige termos com versão aprovada');
  END;
  -- Suspender/encerrar exigem motivo.
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'encerrado', '', ut);
    RAISE EXCEPTION 'FALHOU: encerrou sem motivo';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: encerrar sem motivo é recusado');
  END;
  -- Com versão definida e aceite registrado, participa e ganha data de entrada.
  PERFORM set_config('founding_partner.actor', ut::text, true);
  UPDATE founding_partner_rules SET terms_version = 'teste-1';
  INSERT INTO founding_partner_terms_acceptances (enrollment_id, version, accepted_by_name, recorded_by) VALUES (id_a, 'teste-1', 'Ana Ribeiro', ut);
  PERFORM founding_partner_set_status(id_a, 'em_implantacao', '', ut);
  PERFORM pg_temp.ok((SELECT joined_at IS NOT NULL FROM founding_partner_enrollments WHERE id = id_a),
    'Fundador: em implantação com aceite na versão vigente e data de entrada');
  -- Voltar uma etapa exige motivo.
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'selecionado', '', ut);
    RAISE EXCEPTION 'FALHOU: voltou etapa sem motivo';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(SQLERRM LIKE '%motivo%', 'Fundador: voltar uma etapa exige motivo');
  END;
  PERFORM founding_partner_set_status(id_a, 'em_testes', '', ut);
  PERFORM pg_temp.ok((SELECT count(*) FROM founding_partner_rules_history) >= 1,
    'Fundador: alteração das regras guarda histórico');
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'piloto', '', ut);
    RAISE EXCEPTION 'FALHOU: piloto sem elegibilidade';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: piloto exige elegibilidade registrada');
  END;
  UPDATE founding_partner_enrollments SET pilot_eligible = true, pilot_note = 'teste' WHERE id = id_a;
  PERFORM founding_partner_set_status(id_a, 'piloto', '', ut);
  PERFORM founding_partner_set_status(id_a, 'apto', '', ut);
  PERFORM founding_partner_set_status(id_a, 'ativo', '', ut);
  PERFORM pg_temp.ok((SELECT status FROM founding_partner_enrollments WHERE id = id_a) = 'ativo'
    AND (SELECT count(*) FROM founding_partner_events WHERE enrollment_id = id_a AND kind = 'estado') = 7,
    'Fundador: trilha completa até ativo, cada etapa auditada');
  BEGIN
    PERFORM founding_partner_set_status(id_a, 'selecionado', 'tentativa', ut);
    RAISE EXCEPTION 'FALHOU: ativo pulou para selecionado';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: voltar mais de uma etapa é recusado');
  END;
END $$;

-- 4) Nenhum benefício por padrão, e nenhum sem regra comercial aprovada.
DO $$
DECLARE id_a uuid := (SELECT id FROM founding_partner_enrollments WHERE restaurant_id = (SELECT v FROM fp_ids WHERE k = 'ra'));
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM founding_partner_benefits) = 0, 'Fundador: nenhum benefício concedido por padrão');
  BEGIN
    INSERT INTO founding_partner_benefits (enrollment_id, advantage, approval_ref) VALUES (id_a, 'Vantagem inventada', 'x');
    RAISE EXCEPTION 'FALHOU: benefício sem regra aprovada foi aceito';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: benefício sem regra comercial aprovada é recusado pelo banco');
  END;
END $$;

-- 5) Trilha imutável.
DO $$
BEGIN
  BEGIN
    DELETE FROM founding_partner_events;
    RAISE EXCEPTION 'FALHOU: trilha apagada';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF;
    PERFORM pg_temp.ok(true, 'Fundador: trilha de auditoria não pode ser apagada');
  END;
END $$;

-- 6) RLS: restaurante A não lê a adesão de B; não escreve direto; não chama as funções.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT v FROM fp_ids WHERE k = 'ua')::text, false);
SELECT pg_temp.ok((SELECT count(*) FROM founding_partner_enrollments) = 1
  AND (SELECT restaurant_id FROM founding_partner_enrollments) = (SELECT v FROM fp_ids WHERE k = 'ra'),
  'Fundador: dono do restaurante A lê só a própria adesão (não vê a de B)');
SELECT pg_temp.ok((SELECT count(*) FROM founding_partner_events) = 0 AND (SELECT count(*) FROM founding_partner_invites) = 0,
  'Fundador: restaurante não lê trilha interna nem convites');
DO $$
BEGIN
  BEGIN
    UPDATE founding_partner_enrollments SET status = 'piloto';
    RAISE EXCEPTION 'FALHOU: restaurante escreveu na adesão';
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok(true, 'Fundador: restaurante não altera a própria adesão');
  END;
  BEGIN
    PERFORM founding_partner_set_status((SELECT id FROM founding_partner_enrollments LIMIT 1), 'suspenso', 'tentativa', NULL);
    RAISE EXCEPTION 'FALHOU: restaurante executou a função de estado';
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok(true, 'Fundador: só o servidor (service_role) muda estado');
  END;
END $$;
SELECT set_config('request.jwt.claim.sub', (SELECT v FROM fp_ids WHERE k = 'ub')::text, false);
SELECT pg_temp.ok((SELECT count(*) FROM founding_partner_enrollments) = 1
  AND (SELECT restaurant_id FROM founding_partner_enrollments) = (SELECT v FROM fp_ids WHERE k = 'rb')
  AND (SELECT count(*) FROM founding_partner_terms_acceptances) = 0,
  'Fundador: dono do restaurante B não vê adesão nem termos de A');
-- Equipe Tipe: sem 2FA não lê; com aal2 lê tudo.
SELECT set_config('request.jwt.claim.sub', (SELECT v FROM fp_ids WHERE k = 'ut')::text, false);
SELECT pg_temp.ok((SELECT count(*) FROM founding_partner_enrollments) = 0, 'Fundador: equipe Tipe sem 2FA não lê adesões');
SELECT set_config('request.jwt.claims', '{"aal":"aal2"}', false);
SELECT pg_temp.ok((SELECT count(*) FROM founding_partner_enrollments) = 2, 'Fundador: equipe Tipe com 2FA lê todas as adesões');
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;

-- Limpeza.
DELETE FROM restaurants WHERE slug IN ('fp-a', 'fp-b');
