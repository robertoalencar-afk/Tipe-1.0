-- Fase 2: cardápio digital. O cliente pede pela própria mesa, e o pedido cai
-- no mesmo table_bill_items / KDS / conta do QR. É uma opção que o restaurante
-- liga (padrão desligado), para ninguém passar a receber pedidos sem querer.

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS self_order_enabled boolean NOT NULL DEFAULT false;

-- Pedido do cliente pela mesa. service_role-only: o servidor valida a sessão da
-- mesa (verifyTableSession) e o rate limit ANTES de chamar; aqui ficam as regras
-- de negócio. Idempotente por p_request_id (clique duplo não duplica).
CREATE OR REPLACE FUNCTION public.pdv_customer_order(p_slug text, p_table text, p_items jsonb, p_customer text, p_request_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_rid uuid; v_self boolean; v_order uuid; v_el jsonb; v_item record; v_qty integer;
  v_total numeric := 0; v_count integer := 0; v_name text; v_prev uuid;
BEGIN
  SELECT id, self_order_enabled INTO v_rid, v_self FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF NOT v_self THEN RAISE EXCEPTION 'Pedido pela mesa desativado'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 8 AND 64 THEN RAISE EXCEPTION 'Requisição inválida'; END IF;

  -- Idempotência: mesma requisição devolve o mesmo pedido.
  SELECT id INTO v_prev FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
  IF v_prev IS NOT NULL THEN
    SELECT coalesce(sum(unit_price * quantity), 0), count(*) INTO v_total, v_count FROM pdv_order_items WHERE order_id = v_prev;
    RETURN jsonb_build_object('order_id', v_prev, 'items', v_count, 'total', v_total, 'duplicate', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  -- Mesa acima do limite do plano não abre conta nova.
  IF table_is_over_limit(v_rid, p_table) AND NOT EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table) THEN
    RAISE EXCEPTION 'Esta mesa está indisponível no momento';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 60 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;

  v_name := nullif(left(trim(coalesce(p_customer, '')), 40), '');

  INSERT INTO pdv_orders (restaurant_id, table_number, channel, customer_name, request_id)
  VALUES (v_rid, p_table, 'mesa', v_name, p_request_id) RETURNING id INTO v_order;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT code, name, price, sector INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, notes, sector)
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, v_qty, left(nullif(trim(v_el->>'notes'), ''), 140), v_item.sector);
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, source_adapter, notes)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, coalesce(v_name, 'Cliente'), now(), 'cardapio_tipe', left(nullif(trim(v_el->>'notes'), ''), 140))
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
    v_total := v_total + v_item.price * v_qty;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order, 'items', v_count, 'total', v_total, 'duplicate', false);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.pdv_customer_order(text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_customer_order(text, text, jsonb, text, text) TO service_role;
