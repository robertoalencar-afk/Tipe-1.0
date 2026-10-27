-- Fase 3: totem de autoatendimento. O cliente monta o pedido no totem e recebe
-- uma senha; o pedido fica AGUARDANDO PAGAMENTO e só vai para a cozinha quando
-- o caixa cobra. Dinheiro só se move com a equipe. Reusa a senha e o KDS do
-- balcão. É uma opção que o restaurante liga (padrão desligado).

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS totem_enabled boolean NOT NULL DEFAULT false;

-- Token do dispositivo do totem (a tela abre /<restaurante>/totem?t=<token> sem login).
CREATE TABLE IF NOT EXISTS public.totem_tokens (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  token text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by uuid
);
GRANT ALL ON public.totem_tokens TO service_role;
ALTER TABLE public.totem_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pdv_totem_token(p_slug text, p_rotate boolean DEFAULT false)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_token text;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT token INTO v_token FROM totem_tokens WHERE restaurant_id = v_rid;
  IF v_token IS NULL OR p_rotate THEN
    v_token := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO totem_tokens (restaurant_id, token, rotated_by) VALUES (v_rid, v_token, auth.uid())
    ON CONFLICT (restaurant_id) DO UPDATE SET token = EXCLUDED.token, rotated_at = now(), rotated_by = EXCLUDED.rotated_by;
  END IF;
  RETURN v_token;
END; $function$;

-- Pedido do totem. service_role-only: o servidor valida o token do totem antes.
-- Cria o pedido com senha e itens em 'pending_payment' (ainda NÃO vão ao KDS).
-- Idempotente por p_request_id.
CREATE OR REPLACE FUNCTION public.pdv_totem_order(p_slug text, p_items jsonb, p_customer text, p_request_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_rid uuid; v_totem boolean; v_order uuid; v_day date := pdv_service_day(); v_ticket integer;
  v_el jsonb; v_item record; v_qty integer; v_total numeric := 0; v_name text; v_prev record;
BEGIN
  SELECT id, totem_enabled INTO v_rid, v_totem FROM restaurants WHERE slug = p_slug FOR UPDATE;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF NOT v_totem THEN RAISE EXCEPTION 'Totem desativado'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 8 AND 64 THEN RAISE EXCEPTION 'Requisição inválida'; END IF;

  SELECT id, ticket_number, total INTO v_prev FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
  IF v_prev.id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', v_prev.id, 'ticket', v_prev.ticket_number, 'total', v_prev.total, 'duplicate', true);
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 60 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT price INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    v_total := v_total + v_item.price * v_qty;
  END LOOP;

  v_name := nullif(left(trim(coalesce(p_customer, '')), 40), '');
  SELECT coalesce(max(ticket_number), 0) + 1 INTO v_ticket FROM pdv_orders
  WHERE restaurant_id = v_rid AND service_day = v_day AND ticket_number IS NOT NULL;

  INSERT INTO pdv_orders (restaurant_id, table_number, channel, ticket_number, service_day, customer_name, total, request_id)
  VALUES (v_rid, NULL, 'totem', v_ticket, v_day, v_name, v_total, p_request_id)
  RETURNING id INTO v_order;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT code, name, price, sector INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code';
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, notes, sector, status)
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, (v_el->>'qty')::integer, left(nullif(trim(v_el->>'notes'), ''), 140), v_item.sector, 'pending_payment');
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order, 'ticket', v_ticket, 'total', v_total, 'duplicate', false);
END; $function$;

-- Caixa cobra um pedido do totem: amarra ao caixa aberto e libera os itens para
-- a cozinha (pending_payment -> received). Só dono/caixa.
CREATE OR REPLACE FUNCTION public.pdv_settle_totem_order(p_order uuid, p_method text, p_cash_received numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_o record; v_sid uuid; v_change numeric;
BEGIN
  SELECT * INTO v_o FROM pdv_orders WHERE id = p_order FOR UPDATE;
  IF v_o.id IS NULL OR NOT has_restaurant_role(auth.uid(), v_o.restaurant_id, ARRAY['owner', 'cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_o.channel <> 'totem' THEN RAISE EXCEPTION 'Pedido não é do totem'; END IF;
  IF v_o.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  IF v_o.cash_session_id IS NOT NULL THEN RAISE EXCEPTION 'Pedido já cobrado'; END IF;
  IF p_method IS NULL OR p_method NOT IN ('cash', 'card', 'pix') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;

  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_o.restaurant_id AND closed_at IS NULL;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'Abra o caixa antes de cobrar'; END IF;

  IF p_method = 'cash' THEN
    IF p_cash_received IS NULL OR p_cash_received < v_o.total THEN RAISE EXCEPTION 'Valor recebido menor que o total'; END IF;
    IF p_cash_received > v_o.total + 1000 THEN RAISE EXCEPTION 'Valor recebido inválido'; END IF;
    v_change := round(p_cash_received - v_o.total, 2);
  END IF;

  UPDATE pdv_orders SET payment_method = p_method, cash_received = CASE WHEN p_method = 'cash' THEN p_cash_received END,
    change_due = v_change, cash_session_id = v_sid WHERE id = p_order;
  UPDATE pdv_order_items SET status = 'received', status_at = now() WHERE order_id = p_order AND status = 'pending_payment';

  RETURN jsonb_build_object('ticket', v_o.ticket_number, 'total', v_o.total, 'change', v_change);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.pdv_totem_token(text, boolean), public.pdv_settle_totem_order(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_totem_token(text, boolean), public.pdv_settle_totem_order(uuid, text, numeric) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.pdv_totem_order(text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_totem_order(text, jsonb, text, text) TO service_role;
