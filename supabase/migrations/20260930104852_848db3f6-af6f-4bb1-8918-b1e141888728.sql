-- 1) Sessão da conta (separa identidade da mesa da autorização da conta ativa)
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS session_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex');

-- 2) Idempotência de pagamentos
ALTER TABLE public.table_payment_requests ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS table_payment_requests_idem_uq ON public.table_payment_requests (restaurant_slug, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.archived_payments ADD COLUMN IF NOT EXISTS idempotency_key text;

-- 3) Eventos de segurança / auditoria
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  restaurant_id uuid,
  restaurant_slug text,
  action text NOT NULL,
  resource text,
  result text NOT NULL DEFAULT 'ok',
  detail text
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view security events" ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR (restaurant_id IS NOT NULL AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[])));
CREATE INDEX IF NOT EXISTS security_events_rest_idx ON public.security_events (restaurant_id, created_at DESC);

-- 4) Rate limiting (somente servidor)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_hits integer;
BEGIN
  INSERT INTO public.rate_limit_buckets AS b (key, window_start, hits) VALUES (left(p_key, 200), now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN b.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE b.hits + 1 END,
    window_start = CASE WHEN b.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE b.window_start END
  RETURNING hits INTO v_hits;
  IF random() < 0.01 THEN DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '1 day'; END IF;
  RETURN v_hits <= p_max;
END; $$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;

-- 5) Auditoria automática: cargos e preços
CREATE OR REPLACE FUNCTION public.audit_user_roles() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.user_roles;
BEGIN
  r := COALESCE(NEW, OLD);
  INSERT INTO public.security_events (actor_id, restaurant_id, action, resource, detail)
  VALUES (auth.uid(), r.restaurant_id, 'role_' || lower(TG_OP), 'user_roles', 'user=' || r.user_id || ' role=' || r.role);
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.audit_user_roles() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_user_roles_trg ON public.user_roles;
CREATE TRIGGER audit_user_roles_trg AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

CREATE OR REPLACE FUNCTION public.audit_menu_price() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.security_events (actor_id, restaurant_id, action, resource, detail)
    VALUES (auth.uid(), NEW.restaurant_id, 'price_change', 'pdv_menu_items:' || NEW.code, OLD.price || ' -> ' || NEW.price);
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.audit_menu_price() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_menu_price_trg ON public.pdv_menu_items;
CREATE TRIGGER audit_menu_price_trg AFTER UPDATE ON public.pdv_menu_items FOR EACH ROW EXECUTE FUNCTION public.audit_menu_price();

-- 6) register_table_payment endurecida (idempotência + validação)
DROP FUNCTION IF EXISTS public.register_table_payment(text, text, text, text, text, text, numeric, jsonb);
CREATE FUNCTION public.register_table_payment(p_restaurant_slug text, p_table_number text, p_customer_name text, p_payment_target text, p_payment_method text, p_status text, p_amount numeric, p_item_quantities jsonb, p_idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_item record; v_quantity integer; v_keys integer; v_found integer := 0;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 80 THEN RAISE EXCEPTION 'Dados de pagamento inválidos'; END IF;
  SELECT id INTO v_id FROM public.table_payment_requests WHERE restaurant_slug = p_restaurant_slug AND idempotency_key = p_idempotency_key;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  IF p_payment_target NOT IN ('restaurant','tipe') OR p_payment_method NOT IN ('pix','card','apple_pay','google_pay','at_establishment')
     OR p_status NOT IN ('pending','approved') OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000
     OR length(trim(coalesce(p_customer_name,''))) = 0 OR jsonb_typeof(p_item_quantities) <> 'object' THEN
    RAISE EXCEPTION 'Dados de pagamento inválidos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurant_tables t JOIN public.restaurants r ON r.id = t.restaurant_id
                 WHERE r.slug = p_restaurant_slug AND t.number = p_table_number AND t.active) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;

  IF p_payment_target = 'restaurant' THEN
    SELECT count(*) INTO v_keys FROM jsonb_object_keys(p_item_quantities);
    IF v_keys = 0 THEN RAISE EXCEPTION 'Dados de pagamento inválidos'; END IF;
    FOR v_item IN
      SELECT id, item_code, ordered_quantity, reserved_quantity, paid_quantity FROM public.table_bill_items
      WHERE restaurant_slug = p_restaurant_slug AND table_number = p_table_number AND item_code IN (SELECT jsonb_object_keys(p_item_quantities))
      FOR UPDATE
    LOOP
      v_found := v_found + 1;
      v_quantity := COALESCE((p_item_quantities ->> v_item.item_code)::integer, 0);
      IF v_quantity <= 0 OR v_quantity > (v_item.ordered_quantity - v_item.reserved_quantity - v_item.paid_quantity) THEN
        RAISE EXCEPTION 'Um item selecionado não está mais disponível';
      END IF;
      IF p_status = 'approved' THEN UPDATE public.table_bill_items SET paid_quantity = paid_quantity + v_quantity WHERE id = v_item.id;
      ELSE UPDATE public.table_bill_items SET reserved_quantity = reserved_quantity + v_quantity WHERE id = v_item.id; END IF;
    END LOOP;
    IF v_found <> v_keys THEN RAISE EXCEPTION 'Um item selecionado não está mais disponível'; END IF;
  ELSIF p_item_quantities <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Dados de pagamento inválidos';
  END IF;

  BEGIN
    INSERT INTO public.table_payment_requests (restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, idempotency_key)
    VALUES (p_restaurant_slug, p_table_number, left(trim(p_customer_name), 40), p_payment_target, p_payment_method, p_status, p_amount, p_item_quantities, p_idempotency_key)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Pagamento já registrado';
  END;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, amount)
  VALUES (v_id, p_restaurant_slug, p_table_number, 'registered_' || p_status || '_' || p_payment_method, p_amount);
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.register_table_payment(text, text, text, text, text, text, numeric, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_table_payment(text, text, text, text, text, text, numeric, jsonb, text) TO service_role;

-- 7) archive_and_reopen_table: arquiva, rotaciona a sessão da conta
CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = v_rid AND number = p_table) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key
  FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, actor_id, amount)
  VALUES (gen_random_uuid(), p_slug, p_table, 'table_reopened', auth.uid(), 0);
  DELETE FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  DELETE FROM public.table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  UPDATE public.restaurant_tables SET waiter_id = NULL, session_token = encode(extensions.gen_random_bytes(24), 'hex')
  WHERE number = p_table AND restaurant_id = v_rid;
END; $$;
REVOKE ALL ON FUNCTION public.archive_and_reopen_table(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_reopen_table(text, text) TO service_role;

-- 8) search_path seguro para todas as funções privilegiadas
ALTER FUNCTION public.cash_close(text, numeric, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.cash_move(text, text, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.cash_open(text, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_founder() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_restaurant_role(uuid, uuid, public.app_role[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_member_of_slug(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_restaurant_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.pdv_close_table(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.pdv_launch_order(text, text, uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.pdv_set_item_status(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.pdv_transfer_table(text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.pdv_void_item(text, text, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.pos_integration_set(text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_table_payment(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_table_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.set_table_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- 9) Grants de tabela: menor privilégio
REVOKE ALL ON public.archived_payments, public.cash_movements, public.cash_sessions, public.payment_audit_log,
  public.pdv_menu_categories, public.pdv_menu_items, public.pdv_order_items, public.pdv_orders, public.pdv_voids,
  public.pdv_waiters, public.pos_integrations, public.pos_sync_log, public.restaurant_tables, public.restaurants,
  public.staff_members, public.table_bill_items, public.table_payment_requests, public.user_roles FROM anon;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.restaurant_leads FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.archived_payments, public.cash_movements, public.cash_sessions, public.payment_audit_log,
  public.pdv_menu_categories, public.pdv_menu_items, public.pdv_order_items, public.pdv_orders, public.pdv_voids,
  public.pdv_waiters, public.pos_integrations, public.pos_sync_log, public.restaurant_tables, public.restaurants,
  public.staff_members, public.table_bill_items, public.table_payment_requests, public.user_roles, public.restaurant_leads FROM authenticated;