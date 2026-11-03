-- Tipe Guest · Fase 4: motor de reservas (0042). Rode com tests/db/run.sh.
-- Deixa preparado o restaurante "mare-alta" para o teste de concorrência do run.sh.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

CREATE OR REPLACE FUNCTION pg_temp.falha(p_sql text, p_like text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN raise_exception OR insufficient_privilege OR exclusion_violation OR check_violation THEN
    RESET ROLE;
    PERFORM pg_temp.ok(SQLERRM LIKE '%' || p_like || '%', msg || ' (' || SQLERRM || ')');
    RETURN;
  END;
  RESET ROLE;
  RAISE EXCEPTION 'FALHOU: % (não houve erro)', msg;
END $$;

-- Horário local de Fortaleza, daqui a N dias.
CREATE OR REPLACE FUNCTION pg_temp.t(p_days int, p_h int, p_m int) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT (((now() AT TIME ZONE 'America/Fortaleza')::date + p_days) + make_time(p_h, p_m, 0)) AT TIME ZONE 'America/Fortaleza'
$$;

DO $$
DECLARE
  v_rid uuid; v_outro uuid; v_t2 uuid; v_t4 uuid; v_t_outro uuid;
  u_dono uuid := gen_random_uuid(); u_garcom uuid := gen_random_uuid(); u_caixa uuid := gen_random_uuid(); u_outro uuid := gen_random_uuid();
  u_ana uuid := gen_random_uuid(); u_bia uuid := gen_random_uuid(); u_caio uuid := gen_random_uuid();
  h record; h2 record; v_res uuid; v_res2 uuid; v_res_perto uuid; v_ids uuid[]; v_alerta uuid; v_alerta2 uuid; n int; s text;
  w record; w2 record; v_t19 timestamptz := pg_temp.t(3, 19, 0);
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_dono, 'r-dono@teste.local'), (u_garcom, 'r-garcom@teste.local'),
    (u_caixa, 'r-caixa@teste.local'), (u_outro, 'r-outro@teste.local'),
    (u_ana, 'r-ana@teste.local'), (u_bia, 'r-bia@teste.local'), (u_caio, 'r-caio@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono, 'owner', v_rid), (u_garcom, 'waiter', v_rid),
    (u_caixa, 'cashier', v_rid), (u_outro, 'owner', v_outro);

  -- Mesas existentes continuam iguais; só as marcadas como reserváveis entram no motor.
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE reservable), 'mesas atuais continuam fora das reservas (reservable = false)');
  INSERT INTO restaurant_tables (restaurant_id, number, seats_min, seats_max, reservable) VALUES (v_rid, 'R2', 1, 2, true) RETURNING id INTO v_t2;
  INSERT INTO restaurant_tables (restaurant_id, number, seats_min, seats_max, reservable) VALUES (v_rid, 'R4', 2, 4, true) RETURNING id INTO v_t4;
  INSERT INTO restaurant_tables (restaurant_id, number, seats_min, seats_max, reservable) VALUES (v_outro, 'R4', 1, 4, true) RETURNING id INTO v_t_outro;
  INSERT INTO guest_table_combinations (restaurant_id, table_ids, seats_min, seats_max) VALUES (v_rid, ARRAY[v_t2, v_t4], 5, 6);
  INSERT INTO guest_reservation_settings (restaurant_id, slot_interval_min, duration_min, buffer_min, min_advance_min, cancel_cutoff_min, max_party)
    VALUES (v_rid, 30, 90, 15, 60, 120, 8), (v_outro, 30, 90, 15, 60, 120, 8);
  INSERT INTO guest_availability_rules (restaurant_id, weekday, first_seating, last_seating)
    SELECT r, d, '11:00', '23:00' FROM unnest(ARRAY[v_rid, v_outro]) r, generate_series(0, 6) d;

  -- Flag desligada (padrão): o servidor recusa.
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 2, %L)$q$, v_rid, u_ana, v_t19),
    'desligadas', 'com a flag guest.reservations desligada o hold é recusado');
  INSERT INTO guest_feature_flags (restaurant_id, flag_key, enabled) VALUES (v_rid, 'guest.reservations', true), (v_outro, 'guest.reservations', true);

  -- Regras: grade, turno, antecedência, grupo e bloqueios.
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 2, %L)$q$, v_rid, u_ana, pg_temp.t(3, 19, 10)),
    'grade', 'horário fora da grade de 30 minutos é recusado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 2, %L)$q$, v_rid, u_ana, pg_temp.t(3, 3, 0)),
    'sem reservas', 'horário fora do turno é recusado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 2, %L)$q$, v_rid, u_ana, pg_temp.t(60, 19, 0)),
    'antecedência máxima', 'data além da antecedência máxima é recusada');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 9, %L)$q$, v_rid, u_ana, v_t19),
    'Grupo fora', 'grupo acima do máximo do restaurante é recusado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 7, %L)$q$, v_rid, u_ana, v_t19),
    'Sem mesa', 'grupo maior que qualquer mesa ou combinação não cabe (capacidade)');
  INSERT INTO guest_availability_exceptions (restaurant_id, kind, during, reason)
    VALUES (v_rid, 'feriado', tstzrange(pg_temp.t(4, 0, 0), pg_temp.t(5, 0, 0)), 'Feriado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-ana-1', 2, %L)$q$, v_rid, u_ana, pg_temp.t(4, 19, 0)),
    'bloqueado', 'feriado bloqueia o dia inteiro');

  -- Hold e confirmação: a menor mesa que cabe; confirmação idempotente.
  SELECT * INTO h FROM guest_create_hold(v_rid, u_ana, 'sessao-ana-1', 2, v_t19);
  PERFORM pg_temp.ok(h.table_ids = ARRAY[v_t2] AND h.expires_at > now(), 'hold para 2 pessoas pega a mesa de 2 e expira no futuro');
  v_res := guest_confirm_reservation(h.hold_id, 'sessao-ana-1', 'idem-ana-000001', 'Ana Lima', '+5585999990001', 'Janela', 'aniversario');
  PERFORM pg_temp.ok(guest_confirm_reservation(h.hold_id, 'sessao-ana-1', 'idem-ana-000001', 'Ana Lima') = v_res,
    'confirmar de novo com a mesma chave devolve a mesma reserva');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_reservations WHERE idempotency_key = 'idem-ana-000001') = 1
    AND (SELECT status FROM guest_reservations WHERE id = v_res) = 'confirmada', 'uma reserva só, já confirmada');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_table_allocations WHERE reservation_id = v_res AND hold_id IS NULL) = 1,
    'a ocupação da mesa passou do hold para a reserva');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_reservation_events WHERE reservation_id = v_res AND action = 'criada') = 1, 'criação auditada');
  PERFORM pg_temp.falha(format($q$SELECT guest_confirm_reservation(%L, 'sessao-intrusa', 'idem-outra-0001', 'X')$q$, h.hold_id),
    'não encontrado', 'hold de outra sessão não pode ser confirmado');

  -- Sem overbooking: o banco recusa a mesma mesa em faixa sobreposta, mesmo escrevendo direto.
  PERFORM pg_temp.falha(format($q$INSERT INTO guest_table_allocations (restaurant_id, table_id, occupied, reservation_id) VALUES (%L, %L, tstzrange(%L, %L), %L)$q$,
    v_rid, v_t2, v_t19 + interval '30 minutes', v_t19 + interval '2 hours', v_res), 'no_overlap', 'o EXCLUDE do Postgres impede duas ocupações sobrepostas da mesma mesa');
  SELECT * INTO h FROM guest_create_hold(v_rid, u_bia, 'sessao-bia-1', 2, v_t19);
  PERFORM pg_temp.ok(h.table_ids = ARRAY[v_t4], 'com a mesa de 2 reservada, o próximo grupo de 2 vai para a de 4');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-caio-1', 2, %L)$q$, v_rid, u_caio, v_t19),
    'Sem mesa', 'terceiro grupo no mesmo horário não tem mesa');
  -- Intervalo entre ocupações: 90 min + 15 de arrumação.
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-caio-1', 2, %L)$q$, v_rid, u_caio, pg_temp.t(3, 20, 30)),
    'Sem mesa', 'mesa ainda em arrumação (duração + intervalo) não é oferecida');
  SELECT * INTO h2 FROM guest_create_hold(v_rid, u_caio, 'sessao-caio-1', 2, pg_temp.t(3, 21, 0));
  PERFORM pg_temp.ok(h2.table_ids = ARRAY[v_t2], 'depois da duração e do intervalo a mesa volta a ficar livre');

  -- Hold expirado: some da ocupação e não pode mais ser confirmado.
  UPDATE guest_holds SET expires_at = now() - interval '1 second' WHERE id = h.hold_id;
  PERFORM pg_temp.falha(format($q$SELECT guest_confirm_reservation(%L, 'sessao-bia-1', 'idem-bia-000001', 'Bia')$q$, h.hold_id),
    'tempo para confirmar acabou', 'hold expirado não vira reserva');
  SELECT * INTO h FROM guest_create_hold(v_rid, u_caio, 'sessao-caio-2', 3, v_t19);
  PERFORM pg_temp.ok(h.table_ids = ARRAY[v_t4], 'a mesa do hold expirado volta a ser oferecida');
  PERFORM pg_temp.ok((SELECT released_at IS NOT NULL FROM guest_holds WHERE id = (SELECT id FROM guest_holds WHERE session_key = 'sessao-bia-1')),
    'hold expirado foi liberado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-caio-3', 2, %L)$q$, v_rid, u_caio, pg_temp.t(3, 13, 0)),
    'Muitas reservas', 'limite de holds simultâneos por pessoa');
  v_res2 := guest_confirm_reservation(h.hold_id, 'sessao-caio-2', 'idem-caio-00001', 'Caio');
  PERFORM guest_confirm_reservation(h2.hold_id, 'sessao-caio-1', 'idem-caio-00002', 'Caio');

  -- Combinação de mesas para grupo maior, num horário livre.
  SELECT * INTO h FROM guest_create_hold(v_rid, u_bia, 'sessao-bia-2', 6, pg_temp.t(3, 13, 0));
  PERFORM pg_temp.ok(h.table_ids @> ARRAY[v_t2, v_t4] AND cardinality(h.table_ids) = 2, 'grupo de 6 usa a combinação das duas mesas');
  UPDATE guest_holds SET released_at = now() WHERE id = h.hold_id;
  DELETE FROM guest_table_allocations WHERE hold_id = h.hold_id;

  -- Disponibilidade do dia: só horários com mesa livre de verdade.
  PERFORM pg_temp.ok(NOT (v_t19 = ANY (ARRAY(SELECT guest_available_slots(v_rid, ((now() AT TIME ZONE 'America/Fortaleza')::date + 3), 2))))
    AND pg_temp.t(3, 13, 0) = ANY (ARRAY(SELECT guest_available_slots(v_rid, ((now() AT TIME ZONE 'America/Fortaleza')::date + 3), 2))),
    'lista de horários exclui 19:00 (cheio) e inclui 13:00 (livre)');

  -- Alteração pelo cliente: dentro da política; sem mesa, nada muda.
  v_ids := guest_change_reservation(v_res, u_ana, pg_temp.t(3, 12, 0), 2);
  PERFORM pg_temp.ok(lower((SELECT slot FROM guest_reservations WHERE id = v_res)) = pg_temp.t(3, 12, 0), 'cliente altera o horário dentro da política');
  PERFORM pg_temp.falha(format($q$SELECT guest_change_reservation(%L, %L, %L, 3)$q$, v_res, u_ana, pg_temp.t(3, 19, 0)),
    'Sem mesa', 'alteração para horário sem mesa para o grupo é recusada');
  PERFORM pg_temp.ok(lower((SELECT slot FROM guest_reservations WHERE id = v_res)) = pg_temp.t(3, 12, 0)
    AND (SELECT count(*) FROM guest_table_allocations WHERE reservation_id = v_res) = 1, 'a recusa mantém a reserva e a mesa originais');
  PERFORM pg_temp.falha(format($q$SELECT guest_change_reservation(%L, %L, %L, 2)$q$, v_res, u_bia, pg_temp.t(3, 14, 0)),
    'não encontrada', 'outra pessoa não altera a reserva');

  -- Reserva próxima (dentro do prazo de corte): fora da política para o cliente.
  INSERT INTO guest_reservations (restaurant_id, guest_user_id, guest_name, party_size, slot, status, idempotency_key)
    VALUES (v_rid, u_bia, 'Bia', 2, tstzrange(now() + interval '30 minutes', now() + interval '120 minutes'), 'confirmada', 'idem-bia-perto01')
    RETURNING id INTO v_res_perto;
  PERFORM pg_temp.falha(format($q$SELECT guest_cancel_reservation(%L, %L, 'cliente')$q$, v_res_perto, u_bia),
    'Fora do prazo', 'cancelamento pelo cliente fora da política é recusado');
  PERFORM pg_temp.falha(format($q$SELECT guest_change_reservation(%L, %L, %L, 2)$q$, v_res_perto, u_bia, pg_temp.t(3, 14, 0)),
    'Fora do prazo', 'alteração pelo cliente fora da política é recusada');

  -- Cancelamento pelo restaurante: dono ou caixa, com motivo; garçom e outro restaurante não.
  PERFORM pg_temp.falha(format($q$SELECT guest_cancel_reservation(%L, %L, 'restaurante', 'Cozinha fechada')$q$, v_res_perto, u_garcom),
    'Sem permissão', 'garçom não cancela reserva');
  PERFORM pg_temp.falha(format($q$SELECT guest_cancel_reservation(%L, %L, 'restaurante', 'Cozinha fechada')$q$, v_res_perto, u_outro),
    'Sem permissão', 'dono de outro restaurante não cancela');
  PERFORM pg_temp.falha(format($q$SELECT guest_cancel_reservation(%L, %L, 'restaurante', '')$q$, v_res_perto, u_caixa),
    'motivo', 'cancelamento pelo restaurante exige motivo');
  PERFORM pg_temp.ok(guest_cancel_reservation(v_res_perto, u_caixa, 'restaurante', 'Cozinha fechada') = 'cancelada_restaurante',
    'caixa cancela com motivo, fora do prazo do cliente');

  -- Estados operados pela equipe.
  PERFORM pg_temp.falha(format($q$SELECT guest_set_reservation_status(%L, %L, 'sentada')$q$, v_res2, u_garcom),
    'não é permitida', 'confirmada não pula direto para sentada');
  PERFORM pg_temp.falha(format($q$SELECT guest_set_reservation_status(%L, %L, 'nao_compareceu')$q$, v_res2, u_garcom),
    'depois do horário', 'ausência só depois do horário');
  PERFORM pg_temp.falha(format($q$SELECT guest_set_reservation_status(%L, %L, 'chegou')$q$, v_res2, u_ana),
    'Sem permissão', 'cliente não muda estado operacional');
  PERFORM pg_temp.ok(guest_set_reservation_status(v_res2, u_garcom, 'chegou') = 'chegou'
    AND guest_set_reservation_status(v_res2, u_garcom, 'sentada') = 'sentada', 'garçom marca chegada e mesa');
  PERFORM pg_temp.ok((SELECT count(*) FROM guest_reservation_events WHERE reservation_id = v_res2 AND action = 'estado') = 2, 'cada mudança de estado auditada');
  PERFORM pg_temp.falha(format($q$UPDATE guest_reservation_events SET action = 'x' WHERE reservation_id = %L$q$, v_res2),
    'não pode ser alterada', 'trilha de reservas é imutável');

  -- Cancelamento pelo cliente dentro da política libera a mesa.
  s := guest_cancel_reservation(v_res, u_ana, 'cliente');
  PERFORM pg_temp.ok(s = 'cancelada_cliente' AND NOT EXISTS (SELECT 1 FROM guest_table_allocations WHERE reservation_id = v_res),
    'cliente cancela dentro da política e a mesa é liberada');
  PERFORM pg_temp.falha(format($q$SELECT guest_cancel_reservation(%L, %L, 'cliente')$q$, v_res, u_ana),
    'não pode mais', 'reserva cancelada não é cancelada de novo');

  -- Lista de espera: posição estimada, sem duplicata, convocação com prazo e expiração.
  SELECT * INTO w FROM guest_join_waitlist(v_rid, u_ana, 'Ana', 2, tstzrange(pg_temp.t(3, 19, 0), pg_temp.t(3, 21, 0)));
  SELECT * INTO w2 FROM guest_join_waitlist(v_rid, u_bia, 'Bia', 2, tstzrange(pg_temp.t(3, 19, 30), pg_temp.t(3, 20, 30)));
  PERFORM pg_temp.ok(w.position_estimate = 1 AND w2.position_estimate = 2, 'posição na lista de espera é estimada pela ordem de entrada');
  PERFORM pg_temp.ok((SELECT entry_id FROM guest_join_waitlist(v_rid, u_ana, 'Ana', 2, tstzrange(pg_temp.t(3, 19, 0), pg_temp.t(3, 21, 0)))) = w.entry_id,
    'entrar de novo na mesma faixa não duplica');
  PERFORM pg_temp.falha(format($q$SELECT guest_call_waitlist(%L, %L, 15)$q$, w.entry_id, u_outro), 'Sem permissão', 'outro restaurante não convoca');
  PERFORM pg_temp.ok(guest_call_waitlist(w.entry_id, u_garcom, 15) > now(), 'garçom convoca com prazo de resposta');
  UPDATE guest_waitlist_entries SET respond_by = now() - interval '1 second' WHERE id = w.entry_id;
  n := guest_expire_waitlist();
  PERFORM pg_temp.ok(n = 1 AND (SELECT status FROM guest_waitlist_entries WHERE id = w.entry_id) = 'expirado',
    'convocação sem resposta no prazo expira');
  PERFORM guest_cancel_waitlist(w2.entry_id, u_bia);
  PERFORM pg_temp.ok((SELECT status FROM guest_waitlist_entries WHERE id = w2.entry_id) = 'cancelado', 'cliente sai da lista de espera');

  -- Alertas: só com vaga real e sem duplicata. 21:00 está lotado (R2 do Caio, R4 sentada às 19:00 até 20:45 livre).
  v_alerta := guest_create_alert(v_rid, u_bia, 2, tstzrange(pg_temp.t(3, 21, 0), pg_temp.t(3, 21, 0) + interval '1 minute'));
  PERFORM pg_temp.ok(guest_create_alert(v_rid, u_bia, 2, tstzrange(pg_temp.t(3, 21, 0), pg_temp.t(3, 21, 0) + interval '1 minute')) = v_alerta,
    'alerta igual não é criado duas vezes');
  INSERT INTO guest_table_allocations (restaurant_id, table_id, occupied, reservation_id)
    VALUES (v_rid, v_t4, tstzrange(pg_temp.t(3, 20, 45), pg_temp.t(3, 23, 0)), v_res2);
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM guest_match_alerts(v_rid)), 'sem vaga real, nenhum alerta dispara');
  DELETE FROM guest_table_allocations WHERE reservation_id = v_res2 AND lower(occupied) = pg_temp.t(3, 20, 45);
  SELECT count(*) INTO n FROM guest_match_alerts(v_rid);
  PERFORM pg_temp.ok(n = 1 AND (SELECT status FROM guest_availability_alerts WHERE id = v_alerta) = 'disparado', 'vaga real dispara o alerta uma vez');
  SELECT count(*) INTO n FROM guest_match_alerts(v_rid);
  PERFORM pg_temp.ok(n = 0 AND (SELECT count(*) FROM guest_alert_notifications WHERE alert_id = v_alerta) = 1, 'rodar de novo não duplica o aviso');

  -- Experiências: pagamento antecipado travado.
  PERFORM pg_temp.falha(format($q$INSERT INTO guest_experiences (restaurant_id, kind, title, prepay_enabled) VALUES (%L, 'evento', 'Jantar', true)$q$, v_rid),
    'prepay', 'experiência com pagamento antecipado ligado é recusada');

  -- RLS: cada um vê o seu; outro restaurante não vê nada; ninguém escreve direto.
  PERFORM set_config('request.jwt.claim.sub', u_outro::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM guest_reservations WHERE restaurant_id = v_rid;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 0, 'dono de outro restaurante não lê as reservas');
  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM guest_reservations WHERE restaurant_id = v_rid;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 4, 'dono lê as reservas do próprio restaurante');
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM guest_reservations;
  RESET ROLE;
  PERFORM pg_temp.ok(n = 1, 'cliente lê só a própria reserva');
  PERFORM set_config('request.jwt.claim.sub', u_ana::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$INSERT INTO guest_reservations (restaurant_id, guest_name, party_size, slot, idempotency_key) VALUES (%L, 'X', 2, tstzrange(now(), now() + interval '1 hour'), 'idem-direto-001')$q$, v_rid),
    'permission denied', 'cliente não grava reserva direto na tabela');
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_create_hold(%L, %L, 'sessao-direta', 2, %L)$q$, v_rid, u_ana, pg_temp.t(3, 13, 0)),
    'permission denied', 'cliente não chama as funções internas');
  SET LOCAL ROLE anon;
  PERFORM pg_temp.falha('SELECT count(*) FROM guest_reservations', 'permission denied', 'anônimo não lê reservas');
  PERFORM set_config('request.jwt.claim.sub', '', true);

  -- Deixa o horário de concorrência pronto para o run.sh: 22:00 só a mesa de 4 serve 3 pessoas.
  DELETE FROM guest_holds WHERE restaurant_id = v_rid AND released_at IS NULL;
END $$;
