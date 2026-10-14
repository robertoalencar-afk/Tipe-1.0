ALTER TABLE public.table_payment_requests DROP CONSTRAINT IF EXISTS table_payment_requests_status_check;
ALTER TABLE public.table_payment_requests ADD CONSTRAINT table_payment_requests_status_check
  CHECK (status = ANY (ARRAY['pending','approved','cancelled','failed','refunded','chargeback']::text[]));
ALTER TABLE public.archived_payments ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.archived_payments ADD COLUMN IF NOT EXISTS provider_order_id text;
CREATE INDEX IF NOT EXISTS archived_payments_provider_order_idx ON public.archived_payments (provider_order_id) WHERE provider_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = v_rid AND number = p_table) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due, service_rate_suggested, service_fee_suggested, service_fee_amount, service_fee_changed, provider, provider_order_id)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due, service_rate_suggested, service_fee_suggested, service_fee_amount, service_fee_changed, provider, provider_order_id
  FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, actor_id, amount)
  VALUES (gen_random_uuid(), p_slug, p_table, 'table_reopened', auth.uid(), 0);
  DELETE FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  DELETE FROM public.table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  UPDATE public.restaurant_tables SET waiter_id = NULL, session_token = encode(extensions.gen_random_bytes(24), 'hex')
  WHERE number = p_table AND restaurant_id = v_rid;
END; $function$;

CREATE TABLE IF NOT EXISTS public.payment_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  payment_id uuid,
  table_number text,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['refund','chargeback','amount_mismatch','paid_after_release','stuck_pending','pdv_writeback_failed']::text[])),
  detail text NOT NULL DEFAULT '' CHECK (length(detail) <= 300),
  amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text CHECK (resolution_note IS NULL OR length(resolution_note) <= 300)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_incidents_open_uq ON public.payment_incidents (payment_id, kind) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS payment_incidents_restaurant_idx ON public.payment_incidents (restaurant_id, created_at DESC);
REVOKE ALL ON public.payment_incidents FROM anon;
GRANT SELECT ON public.payment_incidents TO authenticated;
GRANT ALL ON public.payment_incidents TO service_role;
ALTER TABLE public.payment_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dono e caixa veem pendências financeiras" ON public.payment_incidents;
CREATE POLICY "Dono e caixa veem pendências financeiras" ON public.payment_incidents FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.record_payment_incident(p_payment_id uuid, p_kind text, p_detail text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_slug text; v_table text; v_amount numeric; v_rid uuid;
BEGIN
  SELECT restaurant_slug, table_number, amount INTO v_slug, v_table, v_amount FROM public.table_payment_requests WHERE id = p_payment_id;
  IF v_slug IS NULL THEN
    SELECT restaurant_slug, table_number, amount INTO v_slug, v_table, v_amount FROM public.archived_payments WHERE id = p_payment_id;
  END IF;
  IF v_slug IS NULL THEN RETURN 'not_found'; END IF;
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = v_slug;
  INSERT INTO public.payment_incidents (restaurant_id, payment_id, table_number, kind, detail, amount)
  VALUES (v_rid, p_payment_id, v_table, p_kind, left(coalesce(p_detail, ''), 300), v_amount)
  ON CONFLICT (payment_id, kind) WHERE resolved_at IS NULL DO NOTHING;
  RETURN 'recorded';
END; $function$;
REVOKE ALL ON FUNCTION public.record_payment_incident(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_incident(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.provider_reverse_payment(p_order_id text, p_kind text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_id uuid; v_status text; v_slug text; v_table text; v_amount numeric; v_archived boolean := false;
BEGIN
  IF p_kind NOT IN ('refunded','chargeback') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  SELECT id, status, restaurant_slug, table_number, amount INTO v_id, v_status, v_slug, v_table, v_amount
  FROM public.table_payment_requests WHERE provider_order_id = p_order_id FOR UPDATE;
  IF v_id IS NULL THEN
    SELECT id, status, restaurant_slug, table_number, amount INTO v_id, v_status, v_slug, v_table, v_amount
    FROM public.archived_payments WHERE provider_order_id = p_order_id FOR UPDATE;
    v_archived := v_id IS NOT NULL;
  END IF;
  IF v_id IS NULL THEN RETURN 'not_found'; END IF;
  IF v_status <> 'approved' THEN RETURN 'already'; END IF;
  IF v_archived THEN
    UPDATE public.archived_payments SET status = p_kind WHERE id = v_id;
  ELSE
    UPDATE public.table_payment_requests SET status = p_kind WHERE id = v_id;
  END IF;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, amount)
  VALUES (v_id, v_slug, v_table, 'provider_' || p_kind, v_amount);
  PERFORM public.record_payment_incident(v_id, CASE WHEN p_kind = 'refunded' THEN 'refund' ELSE 'chargeback' END,
    CASE WHEN p_kind = 'refunded' THEN 'Pagamento estornado no provedor.' ELSE 'Pagamento contestado pelo titular do cartão.' END);
  RETURN p_kind;
END; $function$;
REVOKE ALL ON FUNCTION public.provider_reverse_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provider_reverse_payment(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_payment_incident(p_id uuid, p_note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT restaurant_id INTO v_rid FROM public.payment_incidents WHERE id = p_id AND resolved_at IS NULL FOR UPDATE;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Pendência não encontrada'; END IF;
  IF NOT public.has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(trim(coalesce(p_note, ''))) < 3 THEN RAISE EXCEPTION 'Descreva como a pendência foi tratada'; END IF;
  UPDATE public.payment_incidents SET resolved_at = now(), resolved_by = auth.uid(), resolution_note = left(trim(p_note), 300) WHERE id = p_id;
END; $function$;
REVOKE ALL ON FUNCTION public.resolve_payment_incident(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_payment_incident(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id uuid, _restaurant_id uuid, _roles public.app_role[])
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = ANY(_roles))
$function$;
CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id)
$function$;
CREATE OR REPLACE FUNCTION public.is_member_of_slug(_user_id uuid, _slug text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.restaurants r ON r.id = ur.restaurant_id
    WHERE ur.user_id = _user_id AND r.slug = _slug)
$function$;

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS google_review_url text;
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_google_review_url_check;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_google_review_url_check CHECK (
  google_review_url IS NULL OR (
    length(google_review_url) <= 300
    AND google_review_url ~ '^https://(g\.page|www\.google\.com|google\.com|maps\.google\.com|maps\.app\.goo\.gl|search\.google\.com|g\.co)/'
  )
);

CREATE TABLE IF NOT EXISTS public.pdv_payment_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  adapter text NOT NULL,
  table_number text NOT NULL,
  item_quantities jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','done','failed','skipped']::text[])),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text CHECK (last_error IS NULL OR length(last_error) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pdv_payment_outbox_due_idx ON public.pdv_payment_outbox (next_attempt_at) WHERE status = 'pending';
REVOKE ALL ON public.pdv_payment_outbox FROM anon, authenticated;
GRANT ALL ON public.pdv_payment_outbox TO service_role;
GRANT SELECT ON public.pdv_payment_outbox TO authenticated;
ALTER TABLE public.pdv_payment_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dono e caixa veem a fila de baixa" ON public.pdv_payment_outbox;
CREATE POLICY "Dono e caixa veem a fila de baixa" ON public.pdv_payment_outbox FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.enqueue_pdv_writeback()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_adapter text;
BEGIN
  IF NEW.status <> 'approved' OR NEW.payment_target <> 'restaurant' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;
  SELECT r.id, c.adapter INTO v_rid, v_adapter
  FROM public.restaurants r JOIN public.pdv_connections c ON c.restaurant_id = r.id
  WHERE r.slug = NEW.restaurant_slug;
  IF v_adapter IS NULL OR v_adapter = 'lancamento_tipe' THEN RETURN NEW; END IF;
  INSERT INTO public.pdv_payment_outbox (payment_id, restaurant_id, adapter, table_number, item_quantities, amount, payment_method)
  VALUES (NEW.id, v_rid, v_adapter, NEW.table_number, NEW.item_quantities, NEW.amount,
          CASE WHEN NEW.payment_method = 'at_establishment' THEN coalesce(NEW.establishment_method, 'at_establishment') ELSE NEW.payment_method END)
  ON CONFLICT (payment_id) DO NOTHING;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.enqueue_pdv_writeback() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enqueue_pdv_writeback ON public.table_payment_requests;
CREATE TRIGGER trg_enqueue_pdv_writeback AFTER INSERT OR UPDATE OF status ON public.table_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_pdv_writeback();

CREATE OR REPLACE FUNCTION public.pdv_outbox_claim(p_limit integer)
 RETURNS SETOF public.pdv_payment_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.pdv_payment_outbox o SET locked_until = now() + interval '2 minutes', updated_at = now()
  WHERE o.id IN (
    SELECT id FROM public.pdv_payment_outbox
    WHERE status = 'pending' AND next_attempt_at <= now() AND (locked_until IS NULL OR locked_until < now())
    ORDER BY next_attempt_at
    LIMIT greatest(1, least(p_limit, 100))
    FOR UPDATE SKIP LOCKED)
  RETURNING o.*;
END; $function$;
REVOKE ALL ON FUNCTION public.pdv_outbox_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_outbox_claim(integer) TO service_role;