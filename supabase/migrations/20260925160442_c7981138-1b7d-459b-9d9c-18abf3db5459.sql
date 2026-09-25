CREATE OR REPLACE FUNCTION public.register_table_payment(
  p_restaurant_slug TEXT,
  p_table_number TEXT,
  p_customer_name TEXT,
  p_payment_target TEXT,
  p_payment_method TEXT,
  p_status TEXT,
  p_amount NUMERIC,
  p_item_quantities JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_item RECORD;
  v_quantity INTEGER;
BEGIN
  IF p_payment_target NOT IN ('restaurant', 'tipe') OR p_payment_method NOT IN ('pix', 'card', 'apple_pay', 'google_pay', 'at_establishment') OR p_status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Dados de pagamento inválidos';
  END IF;

  IF p_payment_target = 'restaurant' THEN
    FOR v_item IN
      SELECT id, item_code, ordered_quantity, reserved_quantity, paid_quantity
      FROM public.table_bill_items
      WHERE restaurant_slug = p_restaurant_slug
        AND table_number = p_table_number
        AND item_code IN (SELECT jsonb_object_keys(p_item_quantities))
      FOR UPDATE
    LOOP
      v_quantity := COALESCE((p_item_quantities ->> v_item.item_code)::INTEGER, 0);
      IF v_quantity < 0 OR v_quantity > (v_item.ordered_quantity - v_item.reserved_quantity - v_item.paid_quantity) THEN
        RAISE EXCEPTION 'Um item selecionado não está mais disponível';
      END IF;
      IF p_status = 'approved' THEN
        UPDATE public.table_bill_items SET paid_quantity = paid_quantity + v_quantity WHERE id = v_item.id;
      ELSE
        UPDATE public.table_bill_items SET reserved_quantity = reserved_quantity + v_quantity WHERE id = v_item.id;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.table_payment_requests (
    restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities
  ) VALUES (
    p_restaurant_slug, p_table_number, left(trim(p_customer_name), 40), p_payment_target, p_payment_method, p_status, p_amount, p_item_quantities
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_table_payment(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_table_payment(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO service_role;