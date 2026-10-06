ALTER TABLE public.table_payment_requests
  ADD COLUMN IF NOT EXISTS establishment_method text,
  ADD COLUMN IF NOT EXISTS cash_received numeric,
  ADD COLUMN IF NOT EXISTS change_due numeric;

ALTER TABLE public.table_payment_requests
  ADD CONSTRAINT table_payment_establishment_method_check
    CHECK (establishment_method IS NULL OR establishment_method IN ('cash', 'card_terminal')),
  ADD CONSTRAINT table_payment_cash_received_check
    CHECK (cash_received IS NULL OR (cash_received >= amount AND cash_received <= 100000)),
  ADD CONSTRAINT table_payment_change_due_check
    CHECK (change_due IS NULL OR (change_due >= 0 AND change_due <= 100000)),
  ADD CONSTRAINT table_payment_cash_details_consistency_check
    CHECK (
      (payment_method <> 'at_establishment' AND establishment_method IS NULL AND cash_received IS NULL AND change_due IS NULL)
      OR
      (payment_method = 'at_establishment' AND establishment_method = 'card_terminal' AND cash_received IS NULL AND change_due IS NULL)
      OR
      (payment_method = 'at_establishment' AND establishment_method = 'cash' AND cash_received IS NOT NULL AND change_due = round(cash_received - amount, 2))
      OR
      (payment_method = 'at_establishment' AND establishment_method IS NULL AND cash_received IS NULL AND change_due IS NULL)
    );

ALTER TABLE public.archived_payments
  ADD COLUMN IF NOT EXISTS establishment_method text,
  ADD COLUMN IF NOT EXISTS cash_received numeric,
  ADD COLUMN IF NOT EXISTS change_due numeric;

ALTER TABLE public.archived_payments
  ADD CONSTRAINT archived_payment_establishment_method_check
    CHECK (establishment_method IS NULL OR establishment_method IN ('cash', 'card_terminal')),
  ADD CONSTRAINT archived_payment_cash_received_check
    CHECK (cash_received IS NULL OR (cash_received >= amount AND cash_received <= 100000)),
  ADD CONSTRAINT archived_payment_change_due_check
    CHECK (change_due IS NULL OR (change_due >= 0 AND change_due <= 100000));

CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = v_rid AND number = p_table) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id, establishment_method, cash_received, change_due
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