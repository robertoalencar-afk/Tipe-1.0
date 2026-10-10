ALTER TABLE public.table_payment_requests
  ADD COLUMN IF NOT EXISTS service_rate_suggested numeric,
  ADD COLUMN IF NOT EXISTS service_fee_suggested numeric,
  ADD COLUMN IF NOT EXISTS service_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS service_fee_changed boolean;
ALTER TABLE public.archived_payments
  ADD COLUMN IF NOT EXISTS service_rate_suggested numeric,
  ADD COLUMN IF NOT EXISTS service_fee_suggested numeric,
  ADD COLUMN IF NOT EXISTS service_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS service_fee_changed boolean;
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_service_rate_range;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_service_rate_range CHECK (service_rate >= 0 AND service_rate <= 0.2);

CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = v_rid AND number = p_table) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due, service_rate_suggested, service_fee_suggested, service_fee_amount, service_fee_changed)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due, service_rate_suggested, service_fee_suggested, service_fee_amount, service_fee_changed
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