CREATE TABLE public.plan_catalog (
  id text PRIMARY KEY CHECK (id IN ('essencial','profissional','premium','personalizado')),
  name text NOT NULL,
  max_tables integer CHECK (max_tables IS NULL OR max_tables BETWEEN 1 AND 5000),
  founder_price numeric(10,2),
  full_price numeric(10,2),
  position integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT ALL ON public.plan_catalog TO service_role;
ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
INSERT INTO public.plan_catalog (id, name, max_tables, founder_price, full_price, position) VALUES
  ('essencial','Essencial',10,59,79,1),('profissional','Profissional',20,89,119,2),
  ('premium','Premium',40,129,179,3),('personalizado','Personalizado',NULL,NULL,NULL,4)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.restaurant_subscriptions
  ADD COLUMN IF NOT EXISTS custom_table_limit integer CHECK (custom_table_limit IS NULL OR custom_table_limit BETWEEN 1 AND 5000),
  ADD COLUMN IF NOT EXISTS founder_price boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_price_until date,
  ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual'));
ALTER TABLE public.restaurant_subscriptions DROP CONSTRAINT restaurant_subscriptions_status_check;
ALTER TABLE public.restaurant_subscriptions ADD CONSTRAINT restaurant_subscriptions_status_check
  CHECK (status = ANY (ARRAY['trialing','active','past_due','suspended','canceled','expired']));

CREATE TABLE public.plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor_id uuid,
  old_plan text, new_plan text, old_limit integer, new_limit integer,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.plan_changes TO service_role;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.table_limit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX table_limit_blocks_rid ON public.table_limit_blocks (restaurant_id, created_at DESC);
GRANT ALL ON public.table_limit_blocks TO service_role;
ALTER TABLE public.table_limit_blocks ENABLE ROW LEVEL SECURITY;

-- Limite de mesas ativas do restaurante (limite próprio > plano > 20).
CREATE OR REPLACE FUNCTION public.restaurant_table_limit(p_rid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT coalesce((SELECT coalesce(s.custom_table_limit, c.max_tables) FROM public.restaurant_subscriptions s
    LEFT JOIN public.plan_catalog c ON c.id = s.plan WHERE s.restaurant_id = p_rid), 20)
$$;

-- Mesa ativa além do limite (após downgrade). Ordem: mesas mais antigas ficam dentro.
CREATE OR REPLACE FUNCTION public.table_is_over_limit(p_rid uuid, p_number text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  WITH ranked AS (SELECT number, row_number() OVER (ORDER BY created_at, number) AS rn
                  FROM public.restaurant_tables WHERE restaurant_id = p_rid AND active)
  SELECT coalesce((SELECT rn > public.restaurant_table_limit(p_rid) FROM ranked WHERE number = p_number), false)
$$;

-- Trava no banco: criação ou reativação acima do limite é descartada e registrada.
CREATE OR REPLACE FUNCTION public.enforce_table_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_limit integer; v_count integer;
BEGIN
  IF NOT NEW.active THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.restaurants WHERE id = NEW.restaurant_id FOR UPDATE;
  v_limit := public.restaurant_table_limit(NEW.restaurant_id);
  SELECT count(*) INTO v_count FROM public.restaurant_tables WHERE restaurant_id = NEW.restaurant_id AND active AND id <> NEW.id;
  IF v_count >= v_limit THEN
    INSERT INTO public.table_limit_blocks (restaurant_id, table_number, source)
    VALUES (NEW.restaurant_id, NEW.number, coalesce(NEW.source_adapter, 'lancamento_tipe') || CASE WHEN TG_OP = 'UPDATE' THEN ':reativar' ELSE '' END);
    INSERT INTO public.security_events (actor_id, restaurant_id, action, resource, result, detail)
    VALUES (auth.uid(), NEW.restaurant_id, 'table_limit_blocked', 'mesa:' || NEW.number, 'denied',
            'limite=' || v_limit || ' ativas=' || v_count || ' origem=' || coalesce(NEW.source_adapter, '') || ' op=' || TG_OP);
    RETURN NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_table_limit_trg ON public.restaurant_tables;
CREATE TRIGGER enforce_table_limit_trg BEFORE INSERT OR UPDATE OF active ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_table_limit();

-- Lançamento: mesa excedente não abre conta nova; contas já abertas continuam.
CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_order uuid; v_waiter_name text; v_el jsonb; v_item record; v_qty integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  IF table_is_over_limit(v_rid, p_table) AND NOT EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table) THEN
    RAISE EXCEPTION 'Esta mesa está acima do limite do plano e não pode abrir conta nova';
  END IF;
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
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, source_adapter, notes)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, v_waiter_name, now(), 'lancamento_tipe', left(nullif(trim(v_el->>'notes'),''), 140))
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
  END LOOP;
  UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
  RETURN v_order;
END; $function$;

-- Integração PDV: importa até o limite; excedentes não são criadas e ficam registradas.
CREATE OR REPLACE FUNCTION public.pdv_ingest_event(p_restaurant uuid, p_adapter text, p_event_id text, p_event jsonb)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_slug text; v_ev uuid; v_type text := p_event->>'type';
  v_table text := left(trim(p_event#>>'{table,number}'), 16);
  v_t record; v_row record; v_code text; v_qty integer; v_free numeric; v_limit_hit boolean := false;
BEGIN
  SELECT slug INTO v_slug FROM restaurants WHERE id = p_restaurant;
  IF v_slug IS NULL THEN RAISE EXCEPTION 'Restaurante inexistente'; END IF;
  INSERT INTO pdv_events (restaurant_id, adapter, direction, external_event_id, event_type)
  VALUES (p_restaurant, p_adapter, 'in', left(p_event_id, 120), coalesce(v_type, 'unknown'))
  ON CONFLICT (restaurant_id, adapter, direction, external_event_id) DO NOTHING RETURNING id INTO v_ev;
  IF v_ev IS NULL THEN RETURN 'duplicate'; END IF;
  BEGIN
    IF v_table IS NULL OR v_table !~ '^[0-9A-Za-z]{1,16}$' THEN RAISE EXCEPTION 'Mesa inválida'; END IF;
    SELECT id, active INTO v_t FROM restaurant_tables WHERE restaurant_id = p_restaurant AND number = v_table;
    IF v_type IN ('table_opened','item_added') THEN
      IF NOT FOUND THEN
        INSERT INTO restaurant_tables (restaurant_id, number, code, external_id, source_adapter)
        VALUES (p_restaurant, v_table, 'mesa' || lower(v_table), p_event#>>'{table,external_id}', p_adapter);
        IF NOT FOUND THEN v_limit_hit := true; END IF;
      ELSIF NOT v_t.active THEN RAISE EXCEPTION 'Mesa desativada';
      ELSIF table_is_over_limit(p_restaurant, v_table) AND NOT EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = v_slug AND table_number = v_table) THEN
        INSERT INTO table_limit_blocks (restaurant_id, table_number, source) VALUES (p_restaurant, v_table, p_adapter || ':conta');
        v_limit_hit := true;
      END IF;
    ELSIF NOT FOUND THEN RAISE EXCEPTION 'Mesa inexistente';
    END IF;
    IF v_limit_hit THEN
      UPDATE pdv_events SET status = 'error', detail = left('Limite de mesas do plano: mesa ' || v_table || ' não importada', 200) WHERE id = v_ev;
      RETURN 'error:Limite de mesas do plano';
    END IF;
    IF v_type = 'item_added' THEN
      v_qty := (p_event#>>'{item,quantity}')::integer;
      IF v_qty IS NULL OR v_qty < 1 OR v_qty > 999 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
      v_code := left(coalesce(nullif(p_event#>>'{item,code}',''), 'ext-' || (p_event#>>'{item,external_id}')), 32);
      IF v_code IS NULL THEN RAISE EXCEPTION 'Item sem identificação'; END IF;
      INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, external_id, source_adapter, notes)
      VALUES (v_slug, v_table, v_code, left(p_event#>>'{item,name}', 80), (p_event#>>'{item,unit_price}')::numeric, v_qty,
              left(coalesce(nullif(p_event#>>'{item,waiter_name}',''), 'PDV'), 80), now(), p_event#>>'{item,external_id}', p_adapter, left(nullif(p_event#>>'{item,notes}',''), 140))
      ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE
        SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
    ELSIF v_type = 'item_cancelled' THEN
      v_qty := (p_event#>>'{item,quantity}')::integer;
      v_code := coalesce(nullif(p_event#>>'{item,code}',''), 'ext-' || (p_event#>>'{item,external_id}'));
      SELECT * INTO v_row FROM table_bill_items WHERE restaurant_slug = v_slug AND table_number = v_table AND item_code = v_code FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Item inexistente'; END IF;
      v_free := least(v_row.ordered_quantity - v_row.reserved_portion - v_row.paid_portion,
                      v_row.ordered_quantity - v_row.reserved_quantity - v_row.paid_quantity);
      IF v_qty IS NULL OR v_qty < 1 OR v_qty > v_free THEN RAISE EXCEPTION 'Item já pago ou reservado não pode ser cancelado'; END IF;
      IF v_row.ordered_quantity = v_qty THEN DELETE FROM table_bill_items WHERE id = v_row.id;
      ELSE UPDATE table_bill_items SET ordered_quantity = ordered_quantity - v_qty WHERE id = v_row.id; END IF;
      INSERT INTO pdv_voids (restaurant_id, table_number, item_code, item_name, unit_price, quantity, reason, actor_id)
      VALUES (p_restaurant, v_table, v_code, v_row.item_name, v_row.unit_price, v_qty, left('Cancelado no sistema: ' || coalesce(p_event->>'reason','sem motivo'), 140), NULL);
    ELSIF v_type = 'table_closed' THEN
      IF EXISTS (SELECT 1 FROM table_payment_requests WHERE restaurant_slug = v_slug AND table_number = v_table AND status = 'pending' AND payment_target = 'restaurant') THEN
        RAISE EXCEPTION 'Mesa com pagamento pendente';
      END IF;
      UPDATE table_payment_requests SET status = 'failed' WHERE restaurant_slug = v_slug AND table_number = v_table AND status = 'pending' AND payment_target = 'tipe';
      PERFORM archive_and_reopen_table(v_slug, v_table);
    ELSIF v_type <> 'table_opened' THEN
      RAISE EXCEPTION 'Tipo de evento desconhecido';
    END IF;
    UPDATE pdv_events SET detail = left(coalesce(v_type,'') || ' mesa ' || v_table, 200) WHERE id = v_ev;
    RETURN 'ok';
  EXCEPTION WHEN OTHERS THEN
    UPDATE pdv_events SET status = 'error', detail = left(SQLERRM, 200) WHERE id = v_ev;
    RETURN 'error:' || left(SQLERRM, 160);
  END;
END; $function$;

-- Cadastro: assinatura antes das mesas, para o limite do plano escolhido valer na criação.
CREATE OR REPLACE FUNCTION public.signup_restaurant(p_name text, p_slug text, p_plan text, p_tables integer, p_display_name text, p_cnpj text, p_address text, p_phone text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_uid uuid := auth.uid(); v_rid uuid; v_email text; v_cnpj text := regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_plan NOT IN ('essencial','profissional','premium') THEN RAISE EXCEPTION 'Plano inválido'; END IF;
  IF p_slug !~ '^[a-z0-9-]{2,64}$' OR p_slug IN ('simulador','entrar','painel','cadastro','termos','api','mesa','reset-password') THEN RAISE EXCEPTION 'Escolha outro endereço'; END IF;
  IF length(trim(coalesce(p_name,''))) < 2 OR p_tables < 1 OR p_tables > 500 THEN RAISE EXCEPTION 'Quantidade de mesas inválida'; END IF;
  IF length(v_cnpj) <> 14 THEN RAISE EXCEPTION 'CNPJ inválido'; END IF;
  IF length(trim(coalesce(p_address,''))) < 8 THEN RAISE EXCEPTION 'Informe o endereço completo'; END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE user_id = v_uid AND role = 'owner') >= 3 THEN RAISE EXCEPTION 'Limite de restaurantes atingido'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE slug = p_slug) THEN RAISE EXCEPTION 'Já existe um restaurante com esse endereço'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE cnpj = v_cnpj) THEN RAISE EXCEPTION 'Já existe um restaurante com esse CNPJ'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.restaurants (name, slug, pos_provider, cnpj, address, phone, onboarding_step)
  VALUES (left(trim(p_name),80), p_slug, 'none', v_cnpj, left(trim(p_address),160), nullif(left(trim(coalesce(p_phone,'')),30),''), 'pos') RETURNING id INTO v_rid;
  INSERT INTO public.user_roles (user_id, role, restaurant_id) VALUES (v_uid, 'owner', v_rid);
  INSERT INTO public.staff_members (user_id, restaurant_id, display_name, email) VALUES (v_uid, v_rid, left(trim(coalesce(nullif(p_display_name,''), v_email)),80), coalesce(v_email,''));
  INSERT INTO public.restaurant_subscriptions (restaurant_id, plan) VALUES (v_rid, p_plan);
  INSERT INTO public.restaurant_tables (restaurant_id, number) SELECT v_rid, g::text FROM generate_series(1, least(p_tables, public.restaurant_table_limit(v_rid))) g;
  RETURN p_slug;
END; $function$;

-- Restaurantes existentes passam para o Profissional (nenhuma mesa é desativada).
INSERT INTO public.plan_changes (restaurant_id, old_plan, new_plan, old_limit, new_limit, detail)
SELECT r.id, s.plan, 'profissional', public.restaurant_table_limit(r.id), 20, 'Ajuste inicial: todos no Profissional'
FROM public.restaurants r LEFT JOIN public.restaurant_subscriptions s ON s.restaurant_id = r.id;
INSERT INTO public.restaurant_subscriptions (restaurant_id, plan)
SELECT id, 'profissional' FROM public.restaurants r WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_subscriptions s WHERE s.restaurant_id = r.id);
UPDATE public.restaurant_subscriptions SET plan = 'profissional', custom_table_limit = NULL WHERE plan <> 'profissional' OR custom_table_limit IS NOT NULL;