ALTER TABLE public.table_bill_items
  ADD COLUMN IF NOT EXISTS reserved_portion numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_portion numeric(12,4) NOT NULL DEFAULT 0;

UPDATE public.table_bill_items
SET reserved_portion = reserved_quantity,
    paid_portion = paid_quantity
WHERE reserved_portion = 0 AND paid_portion = 0
  AND (reserved_quantity > 0 OR paid_quantity > 0);

ALTER TABLE public.table_bill_items
  ADD CONSTRAINT table_bill_items_portions_nonnegative CHECK (reserved_portion >= 0 AND paid_portion >= 0),
  ADD CONSTRAINT table_bill_items_portions_within_order CHECK (reserved_portion + paid_portion <= ordered_quantity);

CREATE OR REPLACE FUNCTION public.sync_bill_item_quantity_shadows(p_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.table_bill_items
  SET paid_quantity = LEAST(ordered_quantity, CEIL(paid_portion)::integer),
      reserved_quantity = LEAST(
        ordered_quantity - LEAST(ordered_quantity, CEIL(paid_portion)::integer),
        GREATEST(0, CEIL(paid_portion + reserved_portion)::integer - CEIL(paid_portion)::integer)
      )
  WHERE id = p_item_id;
END; $$;
REVOKE ALL ON FUNCTION public.sync_bill_item_quantity_shadows(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_bill_item_quantity_shadows(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.register_table_payment(p_restaurant_slug text, p_table_number text, p_customer_name text, p_payment_target text, p_payment_method text, p_status text, p_amount numeric, p_item_quantities jsonb, p_idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_item record; v_quantity numeric(12,4); v_keys integer; v_found integer := 0;
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
      SELECT id, item_code, ordered_quantity, reserved_portion, paid_portion FROM public.table_bill_items
      WHERE restaurant_slug = p_restaurant_slug AND table_number = p_table_number AND item_code IN (SELECT jsonb_object_keys(p_item_quantities))
      FOR UPDATE
    LOOP
      v_found := v_found + 1;
      BEGIN
        v_quantity := round((p_item_quantities ->> v_item.item_code)::numeric, 4);
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'Dados de pagamento inválidos';
      END;
      IF v_quantity <= 0 OR v_quantity > 99 OR v_quantity > (v_item.ordered_quantity - v_item.reserved_portion - v_item.paid_portion) THEN
        RAISE EXCEPTION 'Um item selecionado não está mais disponível';
      END IF;
      IF p_status = 'approved' THEN
        UPDATE public.table_bill_items SET paid_portion = paid_portion + v_quantity WHERE id = v_item.id;
      ELSE
        UPDATE public.table_bill_items SET reserved_portion = reserved_portion + v_quantity WHERE id = v_item.id;
      END IF;
      PERFORM public.sync_bill_item_quantity_shadows(v_item.id);
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

CREATE OR REPLACE FUNCTION public.resolve_table_payment(p_payment_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pay record;
  v_rid uuid;
  v_key text;
  v_qty numeric(12,4);
  v_item_id uuid;
BEGIN
  IF p_action NOT IN ('confirm','cancel') THEN RAISE EXCEPTION 'Ação inválida'; END IF;
  SELECT * INTO v_pay FROM public.table_payment_requests WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = v_pay.restaurant_slug;
  IF v_rid IS NULL OR NOT public.has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::public.app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'Pagamento já resolvido'; END IF;

  FOR v_key, v_qty IN SELECT key, value::numeric FROM jsonb_each_text(v_pay.item_quantities) LOOP
    SELECT id INTO v_item_id FROM public.table_bill_items
    WHERE restaurant_slug = v_pay.restaurant_slug AND table_number = v_pay.table_number AND item_code = v_key
    FOR UPDATE;
    IF v_item_id IS NULL THEN RAISE EXCEPTION 'Item da conta não encontrado'; END IF;
    IF p_action = 'confirm' THEN
      UPDATE public.table_bill_items
      SET reserved_portion = GREATEST(reserved_portion - v_qty, 0), paid_portion = paid_portion + v_qty
      WHERE id = v_item_id;
    ELSE
      UPDATE public.table_bill_items SET reserved_portion = GREATEST(reserved_portion - v_qty, 0)
      WHERE id = v_item_id;
    END IF;
    PERFORM public.sync_bill_item_quantity_shadows(v_item_id);
  END LOOP;

  UPDATE public.table_payment_requests SET status = CASE WHEN p_action = 'confirm' THEN 'approved' ELSE 'cancelled' END WHERE id = p_payment_id;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, actor_id, amount)
  VALUES (p_payment_id, v_pay.restaurant_slug, v_pay.table_number, p_action, auth.uid(), v_pay.amount);
END; $$;
REVOKE ALL ON FUNCTION public.resolve_table_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_table_payment(uuid, text) TO authenticated;

COMMENT ON COLUMN public.table_bill_items.reserved_quantity IS 'Compatibility shadow for older clients; fractional reservations use reserved_portion.';
COMMENT ON COLUMN public.table_bill_items.paid_quantity IS 'Compatibility shadow for older clients; fractional payments use paid_portion.';