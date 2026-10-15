-- Cenários do balcão (venda com senha) e do KDS por pedido, contra as funções reais do banco.
-- Rode com tests/db/run.sh. Cada bloco falha com RAISE EXCEPTION se a regra não for cumprida.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;

-- Espera que o bloco falhe com uma mensagem que contenha p_like.
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
  v_rid uuid; v_outro uuid;
  u_caixa uuid := gen_random_uuid(); u_intruso uuid := gen_random_uuid();
  r1 jsonb; r2 jsonb; r3 jsonb; n integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'mare-alta';
  SELECT id INTO v_outro FROM restaurants WHERE slug = 'marealta';
  INSERT INTO auth.users (id, email) VALUES (u_caixa, 'caixa-balcao@teste.local'), (u_intruso, 'intruso-balcao@teste.local');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES (u_caixa, 'cashier', v_rid), (u_intruso, 'owner', v_outro);
  DELETE FROM pdv_menu_items WHERE restaurant_id = v_rid AND code IN ('bal-burger', 'bal-suco', 'bal-off');
  INSERT INTO pdv_menu_items (restaurant_id, code, name, price, sector, available) VALUES
    (v_rid, 'bal-burger', 'Burger', 32.00, 'kitchen', true),
    (v_rid, 'bal-suco', 'Suco', 9.50, 'bar', true),
    (v_rid, 'bal-off', 'Fora do cardápio', 10.00, 'kitchen', false);
  UPDATE cash_sessions SET closed_at = now() WHERE restaurant_id = v_rid AND closed_at IS NULL;

  -- Sem caixa aberto não há venda.
  PERFORM set_config('request.jwt.claim.sub', u_caixa::text, true);
  PERFORM pg_temp.falha($q$SELECT pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":1}]', 'Ana', 'pix', NULL, 'req-sem-caixa-01')$q$,
    'Abra o caixa', 'balcão exige caixa aberto');

  INSERT INTO cash_sessions (restaurant_id, opened_by, opening_amount) VALUES (v_rid, u_caixa, 100);

  -- Venda em dinheiro: total e troco calculados no servidor, senha 1.
  r1 := pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":2},{"code":"bal-suco","qty":1}]', 'Ana Lima', 'cash', 80, 'req-balcao-0001');
  PERFORM pg_temp.ok((r1->>'total')::numeric = 73.50, 'total do balcão calculado no servidor');
  PERFORM pg_temp.ok((r1->>'change')::numeric = 6.50, 'troco calculado no servidor');

  -- Mesma requisição repetida devolve a mesma venda (idempotência).
  r2 := pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":2},{"code":"bal-suco","qty":1}]', 'Ana Lima', 'cash', 80, 'req-balcao-0001');
  PERFORM pg_temp.ok(r2->>'order_id' = r1->>'order_id', 'requisição repetida não duplica a venda');
  SELECT count(*) INTO n FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = 'req-balcao-0001';
  PERFORM pg_temp.ok(n = 1, 'uma única venda gravada');

  -- Próxima venda ganha a senha seguinte; itens vão para os setores certos.
  r3 := pdv_counter_sale('mare-alta', '[{"code":"bal-suco","qty":2}]', NULL, 'pix', NULL, 'req-balcao-0002');
  PERFORM pg_temp.ok((r3->>'ticket')::int = (r1->>'ticket')::int + 1, 'senhas em sequência sem repetir');
  PERFORM pg_temp.ok((SELECT sector FROM pdv_order_items WHERE order_id = (r3->>'order_id')::uuid LIMIT 1) = 'bar', 'item do bar vai para o setor bar');

  -- Validações de entrada.
  PERFORM pg_temp.falha($q$SELECT pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":1}]', NULL, 'cash', 10, 'req-balcao-0003')$q$,
    'menor que o total', 'dinheiro insuficiente é recusado');
  PERFORM pg_temp.falha($q$SELECT pdv_counter_sale('mare-alta', '[{"code":"bal-off","qty":1}]', NULL, 'pix', NULL, 'req-balcao-0004')$q$,
    'Item indisponível', 'item indisponível é recusado');
  PERFORM pg_temp.falha($q$SELECT pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":1}]', NULL, 'boleto', NULL, 'req-balcao-0005')$q$,
    'Forma de pagamento', 'forma de pagamento desconhecida é recusada');

  -- Dono de outro restaurante não vende nem cancela aqui.
  PERFORM set_config('request.jwt.claim.sub', u_intruso::text, true);
  PERFORM pg_temp.falha($q$SELECT pdv_counter_sale('mare-alta', '[{"code":"bal-burger","qty":1}]', NULL, 'pix', NULL, 'req-balcao-0006')$q$,
    'Sem permissão', 'outro restaurante não vende no balcão');
  PERFORM pg_temp.falha(format('SELECT pdv_counter_cancel(%L, %L)', r3->>'order_id', 'tentativa indevida'),
    'Sem permissão', 'outro restaurante não cancela a venda');

  -- Cancelamento com motivo, registrado nos estornos.
  PERFORM set_config('request.jwt.claim.sub', u_caixa::text, true);
  PERFORM pg_temp.falha(format('SELECT pdv_counter_cancel(%L, %L)', r3->>'order_id', ''), 'motivo', 'cancelamento exige motivo');
  PERFORM pdv_counter_cancel((r3->>'order_id')::uuid, 'Cliente desistiu');
  PERFORM pg_temp.ok((SELECT cancelled_at IS NOT NULL FROM pdv_orders WHERE id = (r3->>'order_id')::uuid), 'venda cancelada');
  SELECT count(*) INTO n FROM pdv_voids WHERE restaurant_id = v_rid AND reason = 'Cliente desistiu';
  PERFORM pg_temp.ok(n >= 1, 'cancelamento registrado nos estornos');

  -- KDS: só chama a senha quando o pedido está pronto; marcar pronto deriva called_at.
  PERFORM pg_temp.falha(format('SELECT pdv_order_call(%L)', r1->>'order_id'), 'pronto', 'senha só é chamada com o pedido pronto');
  PERFORM pdv_order_bump((r1->>'order_id')::uuid, 'ready', NULL);
  PERFORM pg_temp.ok((SELECT called_at IS NOT NULL FROM pdv_orders WHERE id = (r1->>'order_id')::uuid), 'pedido pronto aparece no painel de senhas');

  -- Caixa fechado: a venda não pode mais ser cancelada.
  UPDATE cash_sessions SET closed_at = now() WHERE restaurant_id = v_rid AND closed_at IS NULL;
  PERFORM pg_temp.falha(format('SELECT pdv_counter_cancel(%L, %L)', r1->>'order_id', 'depois do fechamento'),
    'já foi fechado', 'venda de caixa fechado não é cancelada');
END $$;
