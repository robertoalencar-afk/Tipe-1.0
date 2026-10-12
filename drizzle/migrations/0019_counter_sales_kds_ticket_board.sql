-- Fase 1 de paridade com o Colibri: um ciclo único de pedido para todos os canais.
-- Venda no balcão com senha, KDS por pedido e painel de senhas para TV.
-- Pedidos de mesa continuam iguais: só ganham o canal 'mesa'.

-- ---------------- Pedido com canal, senha e pagamento no balcão ----------------
ALTER TABLE public.pdv_orders ALTER COLUMN table_number DROP NOT NULL;
ALTER TABLE public.pdv_orders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'mesa',
  ADD COLUMN IF NOT EXISTS ticket_number integer,
  ADD COLUMN IF NOT EXISTS service_day date,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS total numeric(10,2),
  ADD COLUMN IF NOT EXISTS cash_received numeric(10,2),
  ADD COLUMN IF NOT EXISTS change_due numeric(10,2),
  ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS called_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

ALTER TABLE public.pdv_orders DROP CONSTRAINT IF EXISTS pdv_orders_channel_check;
ALTER TABLE public.pdv_orders ADD CONSTRAINT pdv_orders_channel_check
  CHECK (channel IN ('mesa', 'balcao', 'totem', 'tablet', 'delivery'));
ALTER TABLE public.pdv_orders DROP CONSTRAINT IF EXISTS pdv_orders_payment_method_check;
ALTER TABLE public.pdv_orders ADD CONSTRAINT pdv_orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'pix'));
-- Pedido de mesa sempre tem mesa; pedido sem mesa sempre tem senha.
ALTER TABLE public.pdv_orders DROP CONSTRAINT IF EXISTS pdv_orders_table_or_ticket;
ALTER TABLE public.pdv_orders ADD CONSTRAINT pdv_orders_table_or_ticket
  CHECK ((channel = 'mesa' AND table_number IS NOT NULL) OR (channel <> 'mesa' AND ticket_number IS NOT NULL AND service_day IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS pdv_orders_ticket_day
  ON public.pdv_orders (restaurant_id, service_day, ticket_number) WHERE ticket_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pdv_orders_request
  ON public.pdv_orders (restaurant_id, request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdv_orders_cash_session ON public.pdv_orders (cash_session_id) WHERE cash_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdv_order_items_order ON public.pdv_order_items (order_id);
CREATE INDEX IF NOT EXISTS pdv_order_items_kds ON public.pdv_order_items (restaurant_id, created_at) WHERE status IN ('received', 'preparing', 'ready');

-- Dia de operação: vira às 5h (horário de Brasília), para a senha não zerar no meio da noite.
CREATE OR REPLACE FUNCTION public.pdv_service_day()
 RETURNS date LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '5 hours')::date
$function$;

-- ---------------- Status do pedido derivado dos itens ----------------
-- Qualquer mudança de status de item (KDS por item, por pedido ou cancelamento)
-- recalcula quando o pedido ficou pronto (chamada da senha) e quando foi retirado.
CREATE OR REPLACE FUNCTION public.pdv_sync_order_flags()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  UPDATE pdv_orders o SET
    called_at = CASE WHEN s.pending OR s.live = 0 THEN NULL ELSE coalesce(o.called_at, now()) END,
    picked_up_at = CASE WHEN s.live > 0 AND s.all_done THEN coalesce(o.picked_up_at, now()) ELSE NULL END
  FROM (
    SELECT coalesce(bool_or(status IN ('received', 'preparing')), false) AS pending,
           coalesce(bool_and(status IN ('delivered', 'cancelled')), false) AS all_done,
           count(*) FILTER (WHERE status <> 'cancelled') AS live
    FROM pdv_order_items WHERE order_id = NEW.order_id
  ) s
  WHERE o.id = NEW.order_id;
  RETURN NULL;
END; $function$;

DROP TRIGGER IF EXISTS pdv_order_items_sync_flags ON public.pdv_order_items;
CREATE TRIGGER pdv_order_items_sync_flags
  AFTER UPDATE OF status ON public.pdv_order_items
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.pdv_sync_order_flags();

-- KDS por item: mesmo comportamento de antes, agora ignorando itens cancelados.
CREATE OR REPLACE FUNCTION public.pdv_set_item_status(p_item uuid, p_status text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_cur text;
BEGIN
  IF p_status NOT IN ('received', 'preparing', 'ready', 'delivered') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT restaurant_id, status INTO v_rid, v_cur FROM pdv_order_items WHERE id = p_item;
  IF v_rid IS NULL OR NOT is_restaurant_member(auth.uid(), v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_cur = 'cancelled' THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  UPDATE pdv_order_items SET status = p_status, status_at = now() WHERE id = p_item;
END; $function$;

-- KDS por pedido: move todos os itens do pedido (ou só os do setor da tela) de uma vez.
CREATE OR REPLACE FUNCTION public.pdv_order_bump(p_order uuid, p_status text, p_sector text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_cancelled timestamptz;
BEGIN
  IF p_status NOT IN ('received', 'preparing', 'ready', 'delivered') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  IF p_sector IS NOT NULL AND p_sector NOT IN ('kitchen', 'bar') THEN RAISE EXCEPTION 'Setor inválido'; END IF;
  SELECT restaurant_id, cancelled_at INTO v_rid, v_cancelled FROM pdv_orders WHERE id = p_order;
  IF v_rid IS NULL OR NOT is_restaurant_member(auth.uid(), v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_cancelled IS NOT NULL THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  UPDATE pdv_order_items SET status = p_status, status_at = now()
  WHERE order_id = p_order AND status <> 'cancelled' AND status <> p_status AND (p_sector IS NULL OR sector = p_sector);
END; $function$;

-- Chamar a senha de novo no painel (cliente não viu).
CREATE OR REPLACE FUNCTION public.pdv_order_call(p_order uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT restaurant_id INTO v_rid FROM pdv_orders WHERE id = p_order;
  IF v_rid IS NULL OR NOT is_restaurant_member(auth.uid(), v_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE pdv_orders SET called_at = now()
  WHERE id = p_order AND called_at IS NOT NULL AND picked_up_at IS NULL AND cancelled_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'A senha só pode ser chamada quando o pedido estiver pronto'; END IF;
END; $function$;

-- ---------------- Venda no balcão ----------------
-- Cobra no caixa aberto, gera a senha do dia e manda os itens para a cozinha.
-- Idempotente por p_request_id: clique duplo ou nova tentativa devolve a mesma venda.
CREATE OR REPLACE FUNCTION public.pdv_counter_sale(p_slug text, p_items jsonb, p_customer text, p_method text, p_cash_received numeric, p_request_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_rid uuid; v_sid uuid; v_order uuid; v_day date := pdv_service_day(); v_ticket integer;
  v_el jsonb; v_item record; v_qty integer; v_total numeric := 0; v_change numeric; v_prev record;
BEGIN
  -- Trava a linha do restaurante: numeração de senha sem buracos nem repetição.
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug FOR UPDATE;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 8 AND 64 THEN RAISE EXCEPTION 'Requisição inválida'; END IF;

  SELECT id, ticket_number, total, change_due INTO v_prev FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('order_id', v_prev.id, 'ticket', v_prev.ticket_number, 'total', v_prev.total, 'change', v_prev.change_due);
  END IF;

  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'Abra o caixa antes de vender no balcão'; END IF;
  IF p_method IS NULL OR p_method NOT IN ('cash', 'card', 'pix') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 60 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT price INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    v_total := v_total + v_item.price * v_qty;
  END LOOP;

  IF p_method = 'cash' THEN
    IF p_cash_received IS NULL OR p_cash_received < v_total THEN RAISE EXCEPTION 'Valor recebido menor que o total'; END IF;
    IF p_cash_received > v_total + 1000 THEN RAISE EXCEPTION 'Valor recebido inválido'; END IF;
    v_change := round(p_cash_received - v_total, 2);
  END IF;

  SELECT coalesce(max(ticket_number), 0) + 1 INTO v_ticket FROM pdv_orders
  WHERE restaurant_id = v_rid AND service_day = v_day AND ticket_number IS NOT NULL;

  INSERT INTO pdv_orders (restaurant_id, table_number, channel, ticket_number, service_day, customer_name, payment_method,
                          total, cash_received, change_due, cash_session_id, created_by, request_id)
  VALUES (v_rid, NULL, 'balcao', v_ticket, v_day, nullif(left(trim(coalesce(p_customer, '')), 40), ''), p_method,
          v_total, CASE WHEN p_method = 'cash' THEN p_cash_received END, v_change, v_sid, auth.uid(), p_request_id)
  RETURNING id INTO v_order;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT code, name, price, sector INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code';
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, notes, sector)
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, (v_el->>'qty')::integer,
            left(nullif(trim(v_el->>'notes'), ''), 140), v_item.sector);
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order, 'ticket', v_ticket, 'total', v_total, 'change', v_change);
END; $function$;

-- Cancela uma venda do balcão enquanto o caixa dela está aberto. Fica registrada nos estornos.
CREATE OR REPLACE FUNCTION public.pdv_counter_cancel(p_order uuid, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_o record;
BEGIN
  SELECT o.*, s.closed_at AS session_closed INTO v_o
  FROM pdv_orders o LEFT JOIN cash_sessions s ON s.id = o.cash_session_id WHERE o.id = p_order FOR UPDATE OF o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT has_restaurant_role(auth.uid(), v_o.restaurant_id, ARRAY['owner', 'cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_o.channel = 'mesa' THEN RAISE EXCEPTION 'Pedidos de mesa são estornados pela mesa'; END IF;
  IF v_o.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Pedido já cancelado'; END IF;
  IF v_o.session_closed IS NOT NULL THEN RAISE EXCEPTION 'O caixa desta venda já foi fechado'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo'; END IF;

  UPDATE pdv_orders SET cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(trim(p_reason), 140) WHERE id = p_order;
  INSERT INTO pdv_voids (restaurant_id, table_number, item_code, item_name, unit_price, quantity, reason, actor_id)
  SELECT restaurant_id, 'Senha ' || v_o.ticket_number, item_code, item_name, unit_price, quantity, left(trim(p_reason), 140), auth.uid()
  FROM pdv_order_items WHERE order_id = p_order AND status <> 'cancelled';
  UPDATE pdv_order_items SET status = 'cancelled', status_at = now() WHERE order_id = p_order AND status <> 'cancelled';
END; $function$;

-- ---------------- Painel de senhas (TV) ----------------
-- Cada restaurante tem um token de dispositivo. A TV abre /<restaurante>/senhas?t=<token>
-- sem login; o servidor confere o token e devolve só números de senha e status.
CREATE TABLE IF NOT EXISTS public.order_display_tokens (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  token text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by uuid
);
GRANT ALL ON public.order_display_tokens TO service_role;
ALTER TABLE public.order_display_tokens ENABLE ROW LEVEL SECURITY;

-- Devolve o token atual (cria na primeira vez); p_rotate invalida as TVs já configuradas.
CREATE OR REPLACE FUNCTION public.pdv_display_token(p_slug text, p_rotate boolean DEFAULT false)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_token text;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT token INTO v_token FROM order_display_tokens WHERE restaurant_id = v_rid;
  IF v_token IS NULL OR p_rotate THEN
    v_token := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO order_display_tokens (restaurant_id, token, rotated_by) VALUES (v_rid, v_token, auth.uid())
    ON CONFLICT (restaurant_id) DO UPDATE SET token = EXCLUDED.token, rotated_at = now(), rotated_by = EXCLUDED.rotated_by;
  END IF;
  RETURN v_token;
END; $function$;

-- ---------------- Permissões ----------------
REVOKE EXECUTE ON FUNCTION public.pdv_sync_order_flags() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pdv_service_day(), public.pdv_set_item_status(uuid, text), public.pdv_order_bump(uuid, text, text),
  public.pdv_order_call(uuid), public.pdv_counter_sale(text, jsonb, text, text, numeric, text), public.pdv_counter_cancel(uuid, text),
  public.pdv_display_token(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_service_day(), public.pdv_set_item_status(uuid, text), public.pdv_order_bump(uuid, text, text),
  public.pdv_order_call(uuid), public.pdv_counter_sale(text, jsonb, text, text, numeric, text), public.pdv_counter_cancel(uuid, text),
  public.pdv_display_token(text, boolean) TO authenticated, service_role;

-- ---------------- Tempo real para o KDS ----------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pdv_order_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdv_order_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pdv_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdv_orders;
  END IF;
END $$;
