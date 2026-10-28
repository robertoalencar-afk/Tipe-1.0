-- Tipe Guest · Fase 2: avaliações com consentimento (0040). Rode com tests/db/run.sh.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

CREATE OR REPLACE FUNCTION pg_temp.falha(p_sql text, p_like text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN raise_exception OR insufficient_privilege THEN
    RESET ROLE;
    PERFORM pg_temp.ok(SQLERRM LIKE '%' || p_like || '%', msg || ' (' || SQLERRM || ')');
    RETURN;
  END;
  RESET ROLE;
  RAISE EXCEPTION 'FALHOU: % (não houve erro)', msg;
END $$;

DO $$
DECLARE
  v_rid uuid; v_outro uuid; v_pago uuid; v_pendente uuid; v_rt1 uuid; v_rt2 uuid; v_rt3 uuid; v_rt4 uuid;
  v_rev_ok uuid; v_rev_sem uuid; v_rev_pend uuid; n int; s text; v_nome text;
  u_dono uuid := gen_random_uuid(); u_outro uuid := gen_random_uuid(); u_tipe uuid := gen_random_uuid(); u_comum uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_dono, 'g-dono@teste.local'), (u_outro, 'g-outro@teste.local'), (u_tipe, 'g-tipe@teste.local'), (u_comum, 'g-comum@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono, 'owner', v_rid), (u_outro, 'owner', v_outro);
  INSERT INTO user_roles (user_id, role) VALUES (u_tipe, 'founder');
  DELETE FROM table_payment_requests WHERE restaurant_slug = 'mare-alta' AND table_number = '12';
  INSERT INTO table_payment_requests (restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount)
    VALUES ('mare-alta', '12', 'Joana Ribeiro Lima', 'restaurant', 'pix', 'approved', 80) RETURNING id INTO v_pago;
  INSERT INTO table_payment_requests (restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount)
    VALUES ('mare-alta', '12', 'Caio', 'restaurant', 'pix', 'pending', 40) RETURNING id INTO v_pendente;

  -- A avaliação atual continua gravando igual (waiter_ratings não mudou).
  INSERT INTO waiter_ratings (restaurant_id, table_number, stars, comment) VALUES (v_rid, '12', 5, 'Ótimo') RETURNING id INTO v_rt1;
  INSERT INTO waiter_ratings (restaurant_id, table_number, stars) VALUES (v_rid, '12', 4) RETURNING id INTO v_rt2;
  INSERT INTO waiter_ratings (restaurant_id, table_number, stars) VALUES (v_rid, '12', 2) RETURNING id INTO v_rt3;
  INSERT INTO waiter_ratings (restaurant_id, table_number, stars) VALUES (v_rid, '12', 3) RETURNING id INTO v_rt4;
  PERFORM pg_temp.ok((SELECT count(*) FROM waiter_ratings WHERE id IN (v_rt1, v_rt2, v_rt3, v_rt4)) = 4, 'avaliação atual continua gravando em waiter_ratings');

  -- Flag desligada (padrão): a função recusa no servidor.
  PERFORM pg_temp.ok(NOT guest_flag_enabled(v_rid, 'guest.reviews_v2'), 'flag guest.reviews_v2 começa desligada');
  PERFORM pg_temp.falha(format($q$SELECT guest_record_review(%L, '12', %L, %L, 5, 'x', true, 'primeiro_nome', 'v1')$q$, v_rid, v_rt1, v_pago),
    'desligada', 'com a flag desligada a nova coleta é recusada');

  -- Flag do ambiente ligada, mas a do outro restaurante desligada: a do restaurante vence.
  INSERT INTO guest_feature_flags (restaurant_id, flag_key, enabled) VALUES (NULL, 'guest.reviews_v2', true), (v_outro, 'guest.reviews_v2', false);
  PERFORM pg_temp.ok(guest_flag_enabled(v_rid, 'guest.reviews_v2') AND NOT guest_flag_enabled(v_outro, 'guest.reviews_v2'), 'flag por restaurante vence a do ambiente');

  -- Com consentimento e pagamento aprovado: verificada e elegível, primeiro nome só.
  v_rev_ok := guest_record_review(v_rid, '12', v_rt1, v_pago, 5, '  Ótimo  ', true, 'primeiro_nome', 'v1');
  SELECT verification, public_first_name INTO s, v_nome FROM guest_reviews WHERE id = v_rev_ok;
  PERFORM pg_temp.ok(s = 'visita_paga_verificada' AND v_nome = 'Joana', 'pagamento aprovado marca visita paga verificada e guarda só o primeiro nome');
  PERFORM pg_temp.ok((SELECT publication_eligible AND moderation_status = 'pendente' FROM guest_reviews WHERE id = v_rev_ok), 'com consentimento fica elegível, mas pendente de moderação');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_review_events WHERE review_id = v_rev_ok AND action = 'criada') = 1, 'criação registrada na trilha de auditoria');

  -- Mesmo pagamento não avalia duas vezes.
  PERFORM pg_temp.falha(format($q$SELECT guest_record_review(%L, '12', %L, %L, 4, null, false, 'anonimo', null)$q$, v_rid, v_rt2, v_pago),
    'já tem avaliação', 'um pagamento gera no máximo uma avaliação elegível');

  -- Sem consentimento: interna, sem nome, não elegível.
  v_rev_sem := guest_record_review(v_rid, '12', v_rt2, NULL, 4, NULL, false, 'primeiro_nome', NULL);
  PERFORM pg_temp.ok((SELECT NOT publication_eligible AND public_identity = 'anonimo' AND public_first_name IS NULL AND consent_version IS NULL FROM guest_reviews WHERE id = v_rev_sem),
    'sem consentimento fica interna, anônima e não elegível');

  -- Pagamento ainda pendente: não verificada, mesmo com consentimento.
  v_rev_pend := guest_record_review(v_rid, '12', v_rt3, v_pendente, 2, 'demorou', true, 'primeiro_nome', 'v1');
  PERFORM pg_temp.ok((SELECT verification = 'nao_verificada' AND NOT publication_eligible AND public_first_name IS NULL FROM guest_reviews WHERE id = v_rev_pend),
    'pagamento não aprovado não verifica a visita nem expõe nome');

  -- Nenhuma nota inventada: só a do atendimento, igual à da avaliação de origem.
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_reviews WHERE restaurant_id = v_rid AND (overall_stars IS NOT NULL OR food_stars IS NOT NULL OR ambience_stars IS NOT NULL)) = 0,
    'nenhuma nota de comida, ambiente ou geral é gravada sem ser perguntada');
  PERFORM pg_temp.falha(format($q$SELECT guest_record_review(%L, '12', %L, null, 5, null, false, 'anonimo', null)$q$, v_rid, v_rt4),
    'não confere', 'nota diferente da avaliação de origem é recusada');
  PERFORM pg_temp.falha(format($q$SELECT guest_record_review(%L, '12', %L, null, 3, null, false, 'anonimo', null)$q$, v_outro, v_rt4),
    'desligada', 'avaliação de um restaurante não é gravada em outro');

  -- Leitura pública: nada antes da moderação.
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_public_reviews(v_rid)) = 0, 'leitura pública vazia antes da moderação');

  -- Moderação: só equipe Tipe; sem consentimento não entra na fila.
  PERFORM pg_temp.falha(format($q$SELECT guest_moderate_review(%L, %L, 'aprovar', null)$q$, u_dono, v_rev_ok), 'equipe Tipe', 'dono do restaurante não modera');
  PERFORM pg_temp.falha(format($q$SELECT guest_moderate_review(%L, %L, 'aprovar', null)$q$, u_tipe, v_rev_sem), 'sem consentimento', 'avaliação sem consentimento não pode ser aprovada');
  PERFORM pg_temp.ok(guest_moderate_review(u_tipe, v_rev_ok, 'aprovar', NULL) = 'aprovada', 'equipe Tipe aprova');
  PERFORM guest_moderate_review(u_tipe, v_rev_pend, 'aprovar', NULL);
  SELECT count(*), max(display_name) INTO n, v_nome FROM guest_public_reviews(v_rid);
  PERFORM pg_temp.ok(n = 1 AND v_nome = 'Joana', 'leitura pública mostra só a aprovada, com consentimento e visita paga');

  -- Papéis comuns não chamam as funções internas.
  PERFORM set_config('request.jwt.claim.sub', u_comum::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_public_reviews(%L)$q$, v_rid), 'permission denied', 'usuário comum não lê a função pública ainda (só o servidor)');
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$SELECT guest_record_review(%L, '12', %L, null, 3, null, false, 'anonimo', null)$q$, v_rid, v_rt4), 'permission denied', 'usuário comum não grava avaliação direto');
  SET LOCAL ROLE anon;
  PERFORM pg_temp.falha(format($q$SELECT guest_moderate_review(%L, %L, 'ocultar', 'abuso')$q$, u_tipe, v_rev_ok), 'permission denied', 'visitante anônimo não modera passando outro ator');

  -- RLS: restaurante A não lê avaliações de B; o dono lê as suas.
  PERFORM set_config('request.jwt.claim.sub', u_outro::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM guest_reviews WHERE restaurant_id = v_rid;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 0, 'dono de outro restaurante não lê as avaliações');
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM guest_reviews WHERE restaurant_id = v_rid;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 3, 'dono lê as avaliações do próprio restaurante');

  -- Escrita direta é bloqueada até para o dono.
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$UPDATE guest_reviews SET moderation_status = 'aprovada' WHERE id = %L$q$, v_rev_sem), 'permission denied', 'dono não aprova a própria avaliação por UPDATE');

  -- Contestação: só o dono do restaurante da avaliação; tira da leitura pública.
  PERFORM set_config('request.jwt.claim.sub', u_outro::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$SELECT guest_contest_review(%L, 'não reconheço esta mesa')$q$, v_rev_ok), 'não encontrada', 'outro restaurante não contesta');
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM guest_contest_review(v_rev_ok, 'cliente confundiu com outra casa');
  RESET ROLE;
  PERFORM pg_temp.ok((SELECT moderation_status FROM guest_reviews WHERE id = v_rev_ok) = 'em_revisao' AND (SELECT count(*) FROM guest_public_reviews(v_rid)) = 0,
    'contestação tira a avaliação da leitura pública até a decisão');
  PERFORM guest_moderate_review(u_tipe, v_rev_ok, 'ocultar', 'Contestação aceita');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_review_reports WHERE review_id = v_rev_ok AND status = 'resolvida') = 1
    AND (SELECT count(*) FROM guest_review_events WHERE review_id = v_rev_ok) = 4, 'decisão resolve a contestação e fica na trilha (criada, aprovada, contestada, oculta)');
END $$;
