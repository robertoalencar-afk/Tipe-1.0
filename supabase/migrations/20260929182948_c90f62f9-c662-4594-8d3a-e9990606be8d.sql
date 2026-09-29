
-- Configurações do restaurante
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS service_rate numeric NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS pos_mode text NOT NULL DEFAULT 'tipe',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS opening_hours text;

-- Setor de preparo e descrição
ALTER TABLE public.pdv_menu_items
  ADD COLUMN IF NOT EXISTS sector text NOT NULL DEFAULT 'kitchen',
  ADD COLUMN IF NOT EXISTS description text;
UPDATE public.pdv_menu_items SET sector = 'bar' WHERE category_id IN (SELECT id FROM public.pdv_menu_categories WHERE name ILIKE 'Bebidas%');

-- KDS
ALTER TABLE public.pdv_order_items
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS sector text NOT NULL DEFAULT 'kitchen',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS status_at timestamptz NOT NULL DEFAULT now();

-- Estornos
CREATE TABLE public.pdv_voids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL, item_code text NOT NULL, item_name text NOT NULL,
  unit_price numeric NOT NULL, quantity integer NOT NULL, reason text NOT NULL,
  actor_id uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.pdv_voids TO authenticated; GRANT ALL ON public.pdv_voids TO service_role;
ALTER TABLE public.pdv_voids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voids" ON public.pdv_voids FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

-- Caixa
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  opened_by uuid, opened_at timestamptz NOT NULL DEFAULT now(), opening_amount numeric NOT NULL DEFAULT 0,
  closed_by uuid, closed_at timestamptz, counted_amount numeric, expected_amount numeric, notes text);
CREATE UNIQUE INDEX cash_sessions_one_open ON public.cash_sessions(restaurant_id) WHERE closed_at IS NULL;
GRANT SELECT ON public.cash_sessions TO authenticated; GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view cash sessions" ON public.cash_sessions FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL, amount numeric NOT NULL, reason text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.cash_movements TO authenticated; GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view cash movements" ON public.cash_movements FOR SELECT TO authenticated USING (is_restaurant_member(auth.uid(), restaurant_id));

-- Integrações
CREATE TABLE public.pos_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL, key_hash text, key_prefix text, status text NOT NULL DEFAULT 'waiting',
  last_sync_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.pos_integrations TO authenticated; GRANT ALL ON public.pos_integrations TO service_role;
ALTER TABLE public.pos_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view integration" ON public.pos_integrations FOR SELECT TO authenticated USING (has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::app_role[]));
CREATE TRIGGER set_pos_integrations_updated_at BEFORE UPDATE ON public.pos_integrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.pos_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event text NOT NULL, status text NOT NULL, detail text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.pos_sync_log TO authenticated; GRANT ALL ON public.pos_sync_log TO service_role;
ALTER TABLE public.pos_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view sync log" ON public.pos_sync_log FOR SELECT TO authenticated USING (has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::app_role[]));

-- Lançar pedido com observação e setor
CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid; v_order uuid; v_waiter_name text; v_el jsonb; v_item record; v_qty integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  SELECT name INTO v_waiter_name FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active;
  IF v_waiter_name IS NULL THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;
  INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_by) VALUES (v_rid, p_table, p_waiter, auth.uid()) RETURNING id INTO v_order;
  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT code, name, price, sector INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, notes, sector)
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, v_qty, left(nullif(trim(v_el->>'notes'),''), 140), v_item.sector);
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, v_waiter_name, now())
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
  END LOOP;
  UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
  RETURN v_order;
END; $function$;

-- Estorno com motivo
DROP FUNCTION IF EXISTS public.pdv_void_item(text, text, text, integer);
CREATE FUNCTION public.pdv_void_item(p_slug text, p_table text, p_code text, p_qty integer, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid; v_row record;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo do estorno'; END IF;
  SELECT * INTO v_row FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table AND item_code = p_code FOR UPDATE;
  IF NOT FOUND OR p_qty <= 0 OR p_qty > v_row.ordered_quantity - v_row.reserved_quantity - v_row.paid_quantity THEN RAISE EXCEPTION 'Quantidade não pode ser estornada'; END IF;
  IF v_row.ordered_quantity - p_qty = 0 THEN DELETE FROM table_bill_items WHERE id = v_row.id;
  ELSE UPDATE table_bill_items SET ordered_quantity = ordered_quantity - p_qty WHERE id = v_row.id; END IF;
  INSERT INTO pdv_voids (restaurant_id, table_number, item_code, item_name, unit_price, quantity, reason, actor_id)
  VALUES (v_rid, p_table, p_code, v_row.item_name, v_row.unit_price, p_qty, left(trim(p_reason), 140), auth.uid());
END; $function$;

-- Transferir / juntar mesas
CREATE OR REPLACE FUNCTION public.pdv_transfer_table(p_slug text, p_from text, p_to text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid; v_row record; v_waiter uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_from = p_to THEN RAISE EXCEPTION 'Escolha outra mesa'; END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_to AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  IF EXISTS (SELECT 1 FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number IN (p_from, p_to)) THEN RAISE EXCEPTION 'Há pagamentos nessas mesas; feche-as antes de transferir'; END IF;
  FOR v_row IN SELECT * FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_from FOR UPDATE LOOP
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at)
    VALUES (p_slug, p_to, v_row.item_code, v_row.item_name, v_row.unit_price, v_row.ordered_quantity, v_row.ordered_by, v_row.ordered_at)
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity;
  END LOOP;
  DELETE FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_from;
  SELECT waiter_id INTO v_waiter FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_from;
  UPDATE restaurant_tables SET waiter_id = COALESCE(waiter_id, v_waiter) WHERE restaurant_id = v_rid AND number = p_to;
  UPDATE restaurant_tables SET waiter_id = NULL WHERE restaurant_id = v_rid AND number = p_from;
END; $function$;

-- KDS status
CREATE OR REPLACE FUNCTION public.pdv_set_item_status(p_item uuid, p_status text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid;
BEGIN
  IF p_status NOT IN ('received','preparing','ready','delivered') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT restaurant_id INTO v_rid FROM pdv_order_items WHERE id = p_item;
  IF v_rid IS NULL OR NOT is_restaurant_member(auth.uid(), v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE pdv_order_items SET status = p_status, status_at = now() WHERE id = p_item;
END; $function$;

-- Caixa
CREATE OR REPLACE FUNCTION public.cash_open(p_slug text, p_amount numeric)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid; v_id uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_amount < 0 OR p_amount > 100000 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF EXISTS (SELECT 1 FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL) THEN RAISE EXCEPTION 'Já existe um caixa aberto'; END IF;
  INSERT INTO cash_sessions (restaurant_id, opened_by, opening_amount) VALUES (v_rid, auth.uid(), p_amount) RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.cash_move(p_slug text, p_kind text, p_amount numeric, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid; v_sid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_kind NOT IN ('withdrawal','deposit') OR p_amount <= 0 OR p_amount > 100000 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'Abra o caixa primeiro'; END IF;
  INSERT INTO cash_movements (session_id, restaurant_id, kind, amount, reason, actor_id) VALUES (v_sid, v_rid, p_kind, p_amount, left(trim(p_reason),140), auth.uid());
END; $function$;

CREATE OR REPLACE FUNCTION public.cash_close(p_slug text, p_counted numeric, p_expected numeric, p_notes text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE cash_sessions SET closed_at = now(), closed_by = auth.uid(), counted_amount = p_counted, expected_amount = p_expected, notes = left(p_notes, 300)
  WHERE restaurant_id = v_rid AND closed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum caixa aberto'; END IF;
END; $function$;

-- Integração (dono)
CREATE OR REPLACE FUNCTION public.pos_integration_set(p_slug text, p_provider text, p_key_hash text, p_key_prefix text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_provider = 'tipe' THEN
    UPDATE restaurants SET pos_mode = 'tipe', pos_provider = 'none' WHERE id = v_rid;
    DELETE FROM pos_integrations WHERE restaurant_id = v_rid;
    RETURN;
  END IF;
  UPDATE restaurants SET pos_mode = 'external', pos_provider = p_provider WHERE id = v_rid;
  INSERT INTO pos_integrations (restaurant_id, provider, key_hash, key_prefix, status)
  VALUES (v_rid, p_provider, p_key_hash, p_key_prefix, 'waiting')
  ON CONFLICT (restaurant_id) DO UPDATE SET provider = EXCLUDED.provider,
    key_hash = COALESCE(EXCLUDED.key_hash, pos_integrations.key_hash),
    key_prefix = COALESCE(EXCLUDED.key_prefix, pos_integrations.key_prefix),
    status = CASE WHEN EXCLUDED.key_hash IS NOT NULL THEN 'waiting' ELSE pos_integrations.status END;
END; $function$;

-- Maré Alta: configurações e vendas de exemplo (últimos 7 dias)
UPDATE public.restaurants SET pos_mode = 'tipe', pos_provider = 'none', phone = '(85) 3000-0000', address = 'Av. Beira Mar, Fortaleza - CE', opening_hours = 'Ter a Dom, 11h às 23h' WHERE slug = 'marealta';

DO $$
DECLARE v_rid uuid; v_d integer; v_n integer; v_order uuid; v_w uuid; v_it record;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'marealta';
  IF v_rid IS NULL OR EXISTS (SELECT 1 FROM pdv_orders WHERE restaurant_id = v_rid) THEN RETURN; END IF;
  FOR v_d IN 1..7 LOOP
    FOR v_n IN 1..6 LOOP
      SELECT id INTO v_w FROM pdv_waiters WHERE restaurant_id = v_rid ORDER BY random() LIMIT 1;
      INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_at)
      VALUES (v_rid, (1 + floor(random()*20))::int::text, v_w, now() - make_interval(days => v_d, hours => floor(random()*8)::int))
      RETURNING id INTO v_order;
      FOR v_it IN SELECT code, name, price, sector FROM pdv_menu_items WHERE restaurant_id = v_rid ORDER BY random() LIMIT 4 LOOP
        INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, sector, status, created_at)
        SELECT v_order, v_rid, v_it.code, v_it.name, v_it.price, 1 + floor(random()*3)::int, v_it.sector, 'delivered', created_at FROM pdv_orders WHERE id = v_order;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
