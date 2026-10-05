CREATE TABLE public.restaurant_payout_accounts (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  holder_document text NOT NULL,
  holder_type text NOT NULL CHECK (holder_type IN ('individual','company')),
  bank text NOT NULL,
  branch_number text NOT NULL,
  branch_check_digit text,
  account_number text NOT NULL,
  account_check_digit text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking','savings')),
  email text NOT NULL,
  pagarme_recipient_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','error')),
  status_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.restaurant_payout_accounts TO service_role;
ALTER TABLE public.restaurant_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_restaurant_payout_accounts_updated_at BEFORE UPDATE ON public.restaurant_payout_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.table_payment_requests ADD COLUMN provider text, ADD COLUMN provider_order_id text;
CREATE UNIQUE INDEX table_payment_requests_provider_order_uidx ON public.table_payment_requests (provider_order_id) WHERE provider_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.provider_settle_payment(p_order_id text, p_paid boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_pay record; v_key text; v_qty numeric(12,4); v_item uuid;
BEGIN
  SELECT * INTO v_pay FROM public.table_payment_requests WHERE provider_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_pay.status <> 'pending' THEN RETURN 'already'; END IF;
  FOR v_key, v_qty IN SELECT key, value::numeric FROM jsonb_each_text(v_pay.item_quantities) LOOP
    SELECT id INTO v_item FROM public.table_bill_items WHERE restaurant_slug = v_pay.restaurant_slug AND table_number = v_pay.table_number AND item_code = v_key FOR UPDATE;
    IF v_item IS NULL THEN CONTINUE; END IF;
    IF p_paid THEN
      UPDATE public.table_bill_items SET reserved_portion = GREATEST(reserved_portion - v_qty, 0), paid_portion = paid_portion + v_qty WHERE id = v_item;
    ELSE
      UPDATE public.table_bill_items SET reserved_portion = GREATEST(reserved_portion - v_qty, 0) WHERE id = v_item;
    END IF;
    PERFORM public.sync_bill_item_quantity_shadows(v_item);
  END LOOP;
  UPDATE public.table_payment_requests SET status = CASE WHEN p_paid THEN 'approved' ELSE 'failed' END WHERE id = v_pay.id;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, amount)
  VALUES (v_pay.id, v_pay.restaurant_slug, v_pay.table_number, CASE WHEN p_paid THEN 'provider_paid' ELSE 'provider_failed' END, v_pay.amount);
  RETURN CASE WHEN p_paid THEN 'approved' ELSE 'failed' END;
END; $$;
REVOKE ALL ON FUNCTION public.provider_settle_payment(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provider_settle_payment(text, boolean) TO service_role;