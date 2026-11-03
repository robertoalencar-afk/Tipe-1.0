-- Conta do estabelecimento vinculada à assinatura (migração 0035).
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
  v_rid uuid; v_virt uuid; w uuid; o uuid; k integer; a jsonb;
  u_dono uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid(); u_novo uuid := gen_random_uuid();
  v_slug text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u_dono, 'dono-assin@teste.local'), (u_fora, 'fora-assin@teste.local'), (u_novo, 'novo-assin@teste.local');
  INSERT INTO restaurants (slug, name) VALUES ('assin-a', 'Assinatura A') RETURNING id INTO v_rid;
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_dono, 'owner', v_rid);
  INSERT INTO restaurant_tables (restaurant_id, number) VALUES (v_rid, '1'), (v_rid, '2'), (v_rid, '3');
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id) VALUES (v_rid, 'g-assin', 'Garçom', u_dono) RETURNING id INTO w;
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector) VALUES (v_rid, 'assin-suco', 'Suco', 9.00, 'bar');

  -- Toda conta nasce com assinatura em teste.
  PERFORM pg_temp.ok((SELECT status = 'trialing' AND plan = 'essencial' AND NOT exempt FROM restaurant_subscriptions WHERE restaurant_id = v_rid),
    'restaurante novo nasce com teste grátis');
  a := restaurant_access(v_rid);
  PERFORM pg_temp.ok(a->>'state' = 'full' AND a->>'reason' = 'teste', 'em teste a conta opera normalmente');
  PERFORM pg_temp.ok((SELECT count(*) FROM subscription_events WHERE restaurant_id = v_rid) = 1, 'a criação da assinatura fica na trilha');

  PERFORM set_config('request.jwt.claim.sub', u_dono::text, true);
  o := pdv_launch_order('assin-a', '1', w, '[{"code":"assin-suco","qty":1}]', 'req-assin-00001');
  PERFORM pg_temp.ok(o IS NOT NULL, 'em teste o garçom abre mesa');

  -- Fim do teste sem cartão: bloqueia o que é novo.
  UPDATE restaurant_subscriptions SET trial_ends_at = now() - interval '1 day' WHERE restaurant_id = v_rid;
  a := restaurant_access(v_rid);
  PERFORM pg_temp.ok(a->>'state' = 'blocked' AND a->>'reason' = 'teste_encerrado', 'teste encerrado sem cartão bloqueia a conta');
  PERFORM pg_temp.falha(format($q$SELECT pdv_launch_order('assin-a', '2', %L, '[{"code":"assin-suco","qty":1}]', 'req-assin-00002')$q$, w),
    'Assinatura inativa', 'conta bloqueada não abre mesa nova');
  o := pdv_launch_order('assin-a', '1', w, '[{"code":"assin-suco","qty":1}]', 'req-assin-00003');
  PERFORM pg_temp.ok((SELECT ordered_quantity FROM table_bill_items WHERE restaurant_slug = 'assin-a' AND table_number = '1' AND item_code = 'assin-suco') = 2,
    'mesa que já estava aberta continua recebendo pedidos');
  PERFORM pg_temp.falha($q$INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, source_adapter)
    VALUES ('assin-a', '3', 'ext-1', 'Água', 5, 1, 'PDV', now(), 'demo')$q$, 'Assinatura inativa', 'conta bloqueada não importa mesa nova do PDV');
  PERFORM pg_temp.ok(NOT restaurant_has_module(v_rid, 'order'), 'conta bloqueada perde os módulos');

  -- Cartão cadastrado no fim do teste: 7 dias de carência.
  UPDATE restaurant_subscriptions SET provider_subscription_id = 'sub_teste123' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'grace', 'com cartão cadastrado, o fim do teste vira carência');
  UPDATE restaurant_subscriptions SET trial_ends_at = now() - interval '8 days' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'blocked', 'carência do fim do teste acaba em 7 dias');

  -- Ativa: tudo liberado. Módulo pelo plano, linha suspensa vence o plano.
  UPDATE restaurant_subscriptions SET status = 'active' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'full', 'assinatura ativa libera a conta');
  o := pdv_launch_order('assin-a', '2', w, '[{"code":"assin-suco","qty":1}]', 'req-assin-00004');
  PERFORM pg_temp.ok(o IS NOT NULL, 'reativada, a conta volta a abrir mesas');
  PERFORM pg_temp.ok(NOT restaurant_has_module(v_rid, 'order'), 'módulo fora do plano e sem linha continua desligado');
  UPDATE plan_catalog SET included_modules = ARRAY['order'] WHERE id = 'essencial';
  PERFORM pg_temp.ok(restaurant_has_module(v_rid, 'order'), 'módulo incluído no plano fica liberado');
  PERFORM set_restaurant_module(v_rid, 'order', 'suspended', 'teste', NULL, 'system');
  PERFORM pg_temp.ok(NOT restaurant_has_module(v_rid, 'order'), 'linha suspensa vence o plano');
  PERFORM set_restaurant_module(v_rid, 'guest', 'active', NULL, NULL, 'system');
  PERFORM pg_temp.ok(restaurant_has_module(v_rid, 'guest'), 'Tipe Guest é um módulo contratável');
  UPDATE plan_catalog SET included_modules = '{}' WHERE id = 'essencial';
  BEGIN
    UPDATE plan_catalog SET included_modules = ARRAY['inexistente'] WHERE id = 'essencial';
    RAISE EXCEPTION 'FALHOU: plano aceitou módulo desconhecido';
  EXCEPTION WHEN check_violation THEN PERFORM pg_temp.ok(true, 'plano não aceita módulo desconhecido');
  END;

  -- Atraso: 7 dias de carência a partir do primeiro aviso.
  UPDATE restaurant_subscriptions SET status = 'past_due' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok((SELECT past_due_since IS NOT NULL FROM restaurant_subscriptions WHERE restaurant_id = v_rid), 'o início do atraso é registrado');
  a := restaurant_access(v_rid);
  PERFORM pg_temp.ok(a->>'state' = 'grace' AND a->>'reason' = 'pagamento_atrasado', 'atraso recente é carência');
  UPDATE restaurant_subscriptions SET past_due_since = now() - interval '8 days' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'blocked', 'atraso de mais de 7 dias bloqueia');
  UPDATE restaurant_subscriptions SET status = 'active' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok((SELECT past_due_since IS NULL FROM restaurant_subscriptions WHERE restaurant_id = v_rid), 'pagamento em dia limpa o atraso');

  -- Cancelada: vale até o fim do período pago.
  UPDATE restaurant_subscriptions SET status = 'canceled', current_period_end = now() + interval '10 days' WHERE restaurant_id = v_rid;
  a := restaurant_access(v_rid);
  PERFORM pg_temp.ok(a->>'state' = 'grace' AND a->>'reason' = 'cancelada_ate_fim_do_periodo', 'cancelada continua até o fim do período pago');
  UPDATE restaurant_subscriptions SET current_period_end = now() - interval '1 day' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'blocked', 'depois do período pago, cancelada bloqueia');

  -- Suspensa pela TIPE bloqueia; isenção libera.
  UPDATE restaurant_subscriptions SET status = 'suspended' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'reason' = 'suspensa', 'suspensa bloqueia');
  UPDATE restaurant_subscriptions SET exempt = true, exempt_reason = 'cortesia' WHERE restaurant_id = v_rid;
  PERFORM pg_temp.ok(restaurant_access(v_rid)->>'state' = 'full', 'conta isenta opera mesmo suspensa');
  PERFORM pg_temp.ok((SELECT count(*) FROM subscription_events WHERE restaurant_id = v_rid AND detail = 'isenção ligada') = 1, 'isenção fica na trilha');

  -- Empresa virtual nasce isenta.
  SELECT id INTO v_virt FROM restaurants WHERE slug = 'bar-teste';
  IF v_virt IS NULL THEN INSERT INTO restaurants (slug, name) VALUES ('bar-teste', 'Bar Teste') RETURNING id INTO v_virt; END IF;
  PERFORM pg_temp.ok((SELECT exempt FROM restaurant_subscriptions WHERE restaurant_id = v_virt), 'empresa virtual de demonstração é isenta');

  -- Estado de acesso: só membros leem.
  PERFORM pg_temp.ok(my_restaurant_access(v_rid)->>'state' = 'full', 'dono lê o estado de acesso');
  PERFORM set_config('request.jwt.claim.sub', u_fora::text, true);
  PERFORM pg_temp.falha(format('SELECT my_restaurant_access(%L)', v_rid), 'Sem permissão', 'quem não é do restaurante não lê o estado');

  -- Cadastro continua funcionando e o plano escolhido prevalece sobre o padrão.
  PERFORM set_config('request.jwt.claim.sub', u_novo::text, true);
  v_slug := signup_restaurant('Novo Assin', 'novo-assin', 'premium', 3, 'Dona', '12345678000199', 'Rua das Flores, 100', '');
  PERFORM pg_temp.ok((SELECT s.plan = 'premium' AND s.status = 'trialing' FROM restaurant_subscriptions s JOIN restaurants r ON r.id = s.restaurant_id WHERE r.slug = 'novo-assin'),
    'cadastro cria a conta com o plano escolhido em teste');
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;
