-- Tipe Guest · fila de espera presencial (0043). Rode com tests/db/run.sh, depois de guest-reservas.sql.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

CREATE OR REPLACE FUNCTION pg_temp.falha(p_sql text, p_like text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN raise_exception OR insufficient_privilege OR check_violation OR not_null_violation THEN
    RESET ROLE;
    PERFORM pg_temp.ok(SQLERRM LIKE '%' || p_like || '%', msg || ' (' || SQLERRM || ')');
    RETURN;
  END;
  RESET ROLE;
  RAISE EXCEPTION 'FALHOU: % (não houve erro)', msg;
END $$;

DO $$
DECLARE
  v_rid uuid; v_outro uuid; v_tok text; v_tok2 text; j record; j2 record; j3 record; st record;
  u_dono uuid := gen_random_uuid(); u_garcom uuid := gen_random_uuid(); u_outro uuid := gen_random_uuid();
  -- Porta do restaurante fictício (Meireles, Fortaleza). 0,0009 grau de latitude ≈ 100 m.
  lat0 double precision := -3.7259; lng0 double precision := -38.4987;
  dev_a text := 'aparelho-ana-0001'; dev_b text := 'aparelho-bia-0002'; dev_c text := 'aparelho-caio-003';
  v_rec uuid; v_to text; n int;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_dono, 'f-dono@teste.local'), (u_garcom, 'f-garcom@teste.local'), (u_outro, 'f-outro@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono, 'owner', v_rid), (u_garcom, 'waiter', v_rid), (u_outro, 'owner', v_outro);

  -- Sem local configurado não dá para ligar a fila.
  PERFORM pg_temp.falha(format($q$INSERT INTO guest_walkin_settings (restaurant_id, enabled) VALUES (%L, true)$q$, v_rid),
    'guest_walkin_settings', 'a fila não liga sem o local do restaurante');
  INSERT INTO guest_walkin_settings (restaurant_id, enabled, lat, lng, radius_m) VALUES (v_rid, false, lat0, lng0, 150);
  SELECT door_token INTO v_tok FROM guest_walkin_settings WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(length(v_tok) = 32, 'o QR da porta ganha um código aleatório');

  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, %s, %s, 20, %L, NULL, 'Ana', 2)$q$, v_tok, lat0, lng0, dev_a),
    'não está aberta', 'com a fila desligada pelo dono a entrada é recusada');
  UPDATE guest_walkin_settings SET enabled = true WHERE restaurant_id = v_rid;

  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin('codigo-errado', %s, %s, 20, %L, NULL, 'Ana', 2)$q$, lat0, lng0, dev_a),
    'QR Code inválido', 'QR de outro lugar ou inventado é recusado');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, NULL, NULL, NULL, %L, NULL, 'Ana', 2)$q$, v_tok, dev_a),
    'localização', 'sem localização a entrada é recusada');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, %s, %s, 20, %L, NULL, 'Ana', 2)$q$, v_tok, lat0 + 0.009, lng0, dev_a),
    'longe', 'a 1 km do restaurante a entrada é recusada');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, %s, %s, 400, %L, NULL, 'Ana', 2)$q$, v_tok, lat0, lng0, dev_a),
    'imprecisa', 'localização imprecisa demais é recusada');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, %s, %s, 20, %L, NULL, 'Ana', 40)$q$, v_tok, lat0, lng0, dev_a),
    'Grupo fora', 'grupo acima do máximo é recusado');

  SELECT * INTO j FROM guest_join_walkin(v_tok, lat0 + 0.0009, lng0, 25, dev_a, NULL, 'Ana', 2);
  PERFORM pg_temp.ok(j.entry_id IS NOT NULL AND j.restaurant_id = v_rid AND j.position_estimate = 1, 'a 100 m da porta, com QR válido, Ana entra em 1º');
  SELECT * INTO j2 FROM guest_join_walkin(v_tok, lat0, lng0, 25, dev_a, NULL, 'Ana', 2);
  PERFORM pg_temp.ok(j2.entry_id = j.entry_id, 'o mesmo aparelho de novo recebe a mesma entrada (sem duplicar)');
  SELECT * INTO j2 FROM guest_join_walkin(v_tok, lat0, lng0 + 0.0005, 30, dev_b, NULL, 'Bia', 4);
  PERFORM pg_temp.ok(j2.position_estimate = 2, 'Bia entra em 2º');
  PERFORM pg_temp.ok((SELECT verified_by = 'qr_local' AND verified_at IS NOT NULL AND device_key = dev_a FROM guest_waitlist_entries WHERE id = j.entry_id),
    'a entrada registra só que o local foi conferido');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_waitlist_entries' AND column_name IN ('lat', 'lng', 'latitude', 'longitude')),
    'as coordenadas do cliente não são guardadas');

  -- Recepção adiciona quem não usa o celular; outro restaurante não.
  v_rec := guest_add_walkin(v_rid, u_garcom, 'Caio (balcão)', 3, '85999990000');
  PERFORM pg_temp.ok(guest_walkin_position(v_rec) = 3, 'a recepção coloca Caio na fila, em 3º');
  PERFORM pg_temp.falha(format($q$SELECT guest_add_walkin(%L, %L, 'Intruso', 2)$q$, v_rid, u_outro),
    'Sem permissão', 'dono de outro restaurante não mexe nesta fila');

  -- Situação vista pelo aparelho; outro aparelho não enxerga.
  SELECT * INTO st FROM guest_walkin_status(j2.entry_id, dev_b);
  PERFORM pg_temp.ok(st.status = 'aguardando' AND st.position_estimate = 2, 'Bia vê que está em 2º');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM guest_walkin_status(j2.entry_id, dev_a)), 'outro aparelho não vê a entrada da Bia');

  -- Equipe avisa a Ana; posição dos outros anda.
  PERFORM guest_call_waitlist(j.entry_id, u_garcom, 10);
END $$;

-- Em outro comando para ler o estado depois da escrita.
DO $$
DECLARE v_rid uuid; e_ana uuid; e_bia uuid; e_caio uuid; v_tok text; v_new text; u_dono uuid; u_garcom uuid; st record;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO e_ana FROM guest_waitlist_entries WHERE device_key = 'aparelho-ana-0001';
  SELECT id INTO e_bia FROM guest_waitlist_entries WHERE device_key = 'aparelho-bia-0002';
  SELECT id INTO e_caio FROM guest_waitlist_entries WHERE guest_name = 'Caio (balcão)';
  SELECT id INTO u_dono FROM auth.users WHERE email = 'f-dono@teste.local';
  SELECT id INTO u_garcom FROM auth.users WHERE email = 'f-garcom@teste.local';

  SELECT * INTO st FROM guest_walkin_status(e_ana, 'aparelho-ana-0001');
  PERFORM pg_temp.ok(st.status = 'convocado' AND st.respond_by > now(), 'Ana é avisada, com prazo para se apresentar');
  PERFORM pg_temp.ok(guest_walkin_position(e_bia) = 1, 'com a Ana avisada, Bia passa a ser a próxima');
  PERFORM pg_temp.ok(guest_finish_walkin(e_ana, u_garcom, true) = 'confirmado', 'garçom marca que a Ana sentou');
  PERFORM pg_temp.falha(format($q$SELECT guest_finish_walkin(%L, %L, true)$q$, e_ana, u_garcom), 'encerrada', 'entrada encerrada não muda de novo');

  PERFORM guest_leave_walkin(e_bia, 'aparelho-bia-0002');
  PERFORM pg_temp.falha(format($q$SELECT guest_leave_walkin(%L, 'aparelho-errado-999')$q$, e_caio), 'não encontrada', 'outro aparelho não tira ninguém da fila');
  PERFORM pg_temp.ok(guest_walkin_position(e_caio) = 1, 'Bia saiu da fila e Caio virou o próximo');

  -- Trocar o QR invalida o impresso antes.
  SELECT door_token INTO v_tok FROM guest_walkin_settings WHERE restaurant_id = v_rid;
  PERFORM pg_temp.falha(format($q$SELECT guest_rotate_door_token(%L, %L)$q$, v_rid, u_garcom), 'Só o dono', 'garçom não troca o QR da porta');
  v_new := guest_rotate_door_token(v_rid, u_dono);
  PERFORM pg_temp.ok(v_new <> v_tok, 'o dono troca o QR da porta');
  PERFORM pg_temp.falha(format($q$SELECT * FROM guest_join_walkin(%L, -3.7259, -38.4987, 20, 'aparelho-novo-0004', NULL, 'Duda', 2)$q$, v_tok),
    'QR Code inválido', 'o QR antigo deixa de valer');

  -- Cliente e anônimo não chamam as funções nem leem o segredo do QR.
  SET LOCAL ROLE anon;
  PERFORM pg_temp.falha($q$SELECT * FROM guest_join_walkin('x', 0, 0, 1, 'aparelho-anonimo-01', NULL, 'X', 2)$q$, 'permission denied', 'anônimo não chama a entrada na fila direto');
  SET LOCAL ROLE anon;
  PERFORM pg_temp.falha($q$SELECT door_token FROM guest_walkin_settings$q$, 'permission denied', 'anônimo não lê o código do QR');
END $$;
