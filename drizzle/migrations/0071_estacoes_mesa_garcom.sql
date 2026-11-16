-- Estações (cozinha e bar) com link exclusivo, mesas designadas ao garçom e KDS fechado ao garçom.
-- 1) pdv_stations: cada tela de cozinha/bar tem um link com token próprio, criado pelo dono ou gerente.
--    O token nunca é guardado: só o hash (sha256). Sem política RLS: acesso apenas pelo servidor.
-- 2) pdv_launch_order: garçom só lança em mesa designada a ele (restaurant_tables.waiter_id).
--    Dono, gerente e caixa continuam lançando em qualquer mesa.
-- 3) open/close_table_ordering: garçom só libera ou encerra pedidos pelo celular em mesa dele.
-- 4) pdv_order_bump: garçom só marca "entregue"; preparo e pronto são da estação (ou do painel).
-- 5) assign_table_waiter: dono, gerente ou caixa designam (ou soltam) o garçom da mesa.
-- Reversão: recriar as funções a partir das migrações 0027, 0032 e 0023 e DROP TABLE public.pdv_stations.

CREATE TABLE IF NOT EXISTS public.pdv_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 40),
  sector text NOT NULL CHECK (sector IN ('kitchen', 'bar', 'all')),
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
CREATE INDEX IF NOT EXISTS pdv_stations_restaurant_idx ON public.pdv_stations (restaurant_id);
ALTER TABLE public.pdv_stations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pdv_stations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pdv_stations TO service_role;

-- Papéis que administram a operação (não inclui garçom).
CREATE OR REPLACE FUNCTION public.is_restaurant_admin(p_rid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT has_restaurant_role(auth.uid(), p_rid, ARRAY['owner', 'manager', 'cashier']::app_role[]);
$function$;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_restaurant_admin(uuid) TO authenticated, service_role;

-- A mesa está designada ao garçom que está logado?
CREATE OR REPLACE FUNCTION public.table_is_mine(p_rid uuid, p_table text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM restaurant_tables t JOIN pdv_waiters w ON w.id = t.waiter_id
    WHERE t.restaurant_id = p_rid AND t.number = p_table AND w.active AND w.user_id = auth.uid()
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.table_is_mine(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.table_is_mine(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_table_waiter(p_slug text, p_table text, p_waiter uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT is_restaurant_admin(v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  IF p_waiter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active) THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
  UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.assign_table_waiter(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_table_waiter(text, text, uuid) TO authenticated, service_role;

-- Lançamento: garçom só na mesa designada a ele.
CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb, p_request_id text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_order uuid; v_waiter_name text; v_el jsonb; v_item record; v_qty integer; v_admin boolean;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','manager','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  v_admin := is_restaurant_admin(v_rid);
  IF p_request_id IS NOT NULL THEN
    IF length(p_request_id) NOT BETWEEN 8 AND 64 OR p_request_id !~ '^[A-Za-z0-9_-]+$' THEN RAISE EXCEPTION 'Requisição inválida'; END IF;
    SELECT id INTO v_order FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
    IF v_order IS NOT NULL THEN RETURN v_order; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  IF NOT v_admin THEN
    -- Garçom: só a mesa designada a ele, e sempre no nome dele.
    IF NOT EXISTS (SELECT 1 FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
    IF NOT table_is_mine(v_rid, p_table) THEN RAISE EXCEPTION 'Sem permissão: esta mesa não está designada a você'; END IF;
  END IF;
  IF table_is_over_limit(v_rid, p_table) AND NOT EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table) THEN
    RAISE EXCEPTION 'Esta mesa está acima do limite do plano e não pode abrir conta nova';
  END IF;
  SELECT name INTO v_waiter_name FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active;
  IF v_waiter_name IS NULL THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;
  BEGIN
    INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_by, request_id)
    VALUES (v_rid, p_table, p_waiter, auth.uid(), p_request_id) RETURNING id INTO v_order;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_order FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
    RETURN v_order;
  END;
  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT code, name, price, sector INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, notes, sector)
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, v_qty, left(nullif(trim(v_el->>'notes'),''), 140), v_item.sector);
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, source_adapter, notes)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, v_waiter_name, now(), 'lancamento_tipe', left(nullif(trim(v_el->>'notes'),''), 140))
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
  END LOOP;
  -- Painel (dono, gerente, caixa) lançando no nome de um garçom passa a mesa para ele; garçom já é o titular.
  IF v_admin THEN
    UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
  END IF;
  RETURN v_order;
END; $function$;
REVOKE ALL ON FUNCTION public.pdv_launch_order(text, text, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_launch_order(text, text, uuid, jsonb, text) TO authenticated, service_role;

-- Liberar e encerrar pedidos pelo celular da mesa: garçom só na mesa dele.
CREATE OR REPLACE FUNCTION public.open_table_ordering(p_slug text, p_table text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_mode text; v_cur public.table_order_sessions; v_bill text; v_code text; v_id uuid; v_exp timestamptz; v_rand bytea;
BEGIN
  SELECT id, order_session_mode INTO v_rid, v_mode FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'manager', 'cashier', 'waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT is_restaurant_admin(v_rid) AND NOT table_is_mine(v_rid, p_table) THEN RAISE EXCEPTION 'Sem permissão: esta mesa não está designada a você'; END IF;
  IF NOT restaurant_has_module(v_rid, 'order') THEN RAISE EXCEPTION 'Tipe Order não está ativo para este restaurante'; END IF;
  SELECT session_token INTO v_bill FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active FOR UPDATE;
  IF v_bill IS NULL THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  v_cur := table_ordering_current(v_rid, p_table);
  IF v_cur.id IS NOT NULL AND v_cur.failed_attempts < 10 THEN
    RETURN jsonb_build_object('id', v_cur.id, 'code', v_cur.short_code, 'requires_code', v_cur.requires_code, 'expires_at', v_cur.expires_at, 'reused', true);
  END IF;
  UPDATE table_order_sessions SET closed_at = now(), closed_by = auth.uid(), close_reason = coalesce(close_reason, 'substituída')
  WHERE restaurant_id = v_rid AND table_number = p_table AND closed_at IS NULL;
  IF v_mode = 'table_code' THEN
    v_rand := gen_random_bytes(2);
    v_code := lpad(((get_byte(v_rand, 0) * 256 + get_byte(v_rand, 1)) % 10000)::text, 4, '0');
  END IF;
  INSERT INTO table_order_sessions (restaurant_id, table_number, bill_session, requires_code, short_code, opened_by)
  VALUES (v_rid, p_table, v_bill, v_mode = 'table_code', v_code, auth.uid())
  RETURNING id, expires_at INTO v_id, v_exp;
  RETURN jsonb_build_object('id', v_id, 'code', v_code, 'requires_code', v_mode = 'table_code', 'expires_at', v_exp, 'reused', false);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.open_table_ordering(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_table_ordering(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_table_ordering(p_slug text, p_table text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'manager', 'cashier', 'waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT is_restaurant_admin(v_rid) AND NOT table_is_mine(v_rid, p_table) THEN RAISE EXCEPTION 'Sem permissão: esta mesa não está designada a você'; END IF;
  UPDATE table_order_sessions SET closed_at = now(), closed_by = auth.uid(), close_reason = 'encerrada pela equipe'
  WHERE restaurant_id = v_rid AND table_number = p_table AND closed_at IS NULL;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.close_table_ordering(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_table_ordering(text, text) TO authenticated, service_role;

-- KDS: garçom só marca "entregue". Preparo e pronto vêm da estação ou do painel.
CREATE OR REPLACE FUNCTION public.pdv_order_bump(p_order uuid, p_status text, p_sector text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_cancelled timestamptz;
BEGIN
  IF p_status NOT IN ('received', 'preparing', 'ready', 'delivered') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  IF p_sector IS NOT NULL AND p_sector NOT IN ('kitchen', 'bar') THEN RAISE EXCEPTION 'Setor inválido'; END IF;
  SELECT restaurant_id, cancelled_at INTO v_rid, v_cancelled FROM pdv_orders WHERE id = p_order;
  IF v_rid IS NULL OR NOT is_restaurant_member(auth.uid(), v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT is_restaurant_admin(v_rid) AND p_status <> 'delivered' THEN RAISE EXCEPTION 'Sem permissão: o preparo é da cozinha e do bar'; END IF;
  IF v_cancelled IS NOT NULL THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  UPDATE pdv_order_items SET status = p_status, status_at = now()
  WHERE order_id = p_order AND status <> 'cancelled' AND status <> p_status AND (p_sector IS NULL OR sector = p_sector)
    AND (is_restaurant_admin(v_rid) OR status = 'ready');
END; $function$;
