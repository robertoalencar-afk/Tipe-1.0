-- Lançamento de pedido idempotente (painel e garçom): toque duplo ou nova tentativa
-- depois de queda de rede devolvem o mesmo pedido, sem itens repetidos na conta.
-- Usa pdv_orders.request_id e o índice único (restaurant_id, request_id) da 0023.
-- Aditiva: a versão de 4 argumentos continua existindo e chama a nova sem request_id.
-- Reversão: DROP FUNCTION public.pdv_launch_order(text, text, uuid, jsonb, text) e
-- recriar a versão de 4 argumentos da 0017.
CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb, p_request_id text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_order uuid; v_waiter_name text; v_el jsonb; v_item record; v_qty integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_request_id IS NOT NULL THEN
    IF length(p_request_id) NOT BETWEEN 8 AND 64 OR p_request_id !~ '^[A-Za-z0-9_-]+$' THEN RAISE EXCEPTION 'Requisição inválida'; END IF;
    -- Mesma requisição já gravada: devolve o pedido existente sem lançar de novo.
    SELECT id INTO v_order FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
    IF v_order IS NOT NULL THEN RETURN v_order; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  IF table_is_over_limit(v_rid, p_table) AND NOT EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table) THEN
    RAISE EXCEPTION 'Esta mesa está acima do limite do plano e não pode abrir conta nova';
  END IF;
  SELECT name INTO v_waiter_name FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active;
  IF v_waiter_name IS NULL THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;
  BEGIN
    INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_by, request_id)
    VALUES (v_rid, p_table, p_waiter, auth.uid(), p_request_id) RETURNING id INTO v_order;
  EXCEPTION WHEN unique_violation THEN
    -- Duas chamadas simultâneas com a mesma requisição: a segunda espera a primeira e devolve o mesmo pedido.
    SELECT id INTO v_order FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
    RETURN v_order;
  END;
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
  -- Regra confirmada pelo dono (27/10): quem lança por último fica com a mesa e com os 70% da gorjeta.
  UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
  RETURN v_order;
END; $function$;

CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb)
 RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT public.pdv_launch_order(p_slug, p_table, p_waiter, p_items, NULL::text);
$function$;

REVOKE ALL ON FUNCTION public.pdv_launch_order(text, text, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_launch_order(text, text, uuid, jsonb, text) TO authenticated, service_role;
