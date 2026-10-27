-- Tipe Order, Fase 2: módulos contratados por restaurante e pedido pela mesa
-- só com a mesa liberada pela equipe. O QR continua sendo um só; quem não tem
-- o módulo Order ativo vê só a conta (Tipe Pay), como antes.
--
-- Por que liberar a mesa: o token do QR impresso é fixo e devolve a sessão da
-- conta. Uma foto do QR bastaria para pedir de casa. Agora o pedido exige uma
-- liberação aberta por garçom, caixa ou dono para a conta atual da mesa e,
-- se o restaurante quiser, um código curto que a equipe passa para a mesa.

-- ---------------- Módulos contratados ----------------
-- O Tipe Pay é a base e não precisa de linha. Sem linha = módulo não contratado.
CREATE TABLE IF NOT EXISTS public.restaurant_modules (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('order', 'kds', 'totem', 'three_d')),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')),
  reason text CHECK (reason IS NULL OR length(reason) <= 300),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, module)
);
ALTER TABLE public.restaurant_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modulos: membros veem" ON public.restaurant_modules;
CREATE POLICY "modulos: membros veem" ON public.restaurant_modules
  FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
REVOKE ALL ON public.restaurant_modules FROM anon, authenticated;
GRANT SELECT ON public.restaurant_modules TO authenticated;
GRANT ALL ON public.restaurant_modules TO service_role;

-- Trilha de mudanças (só acrescenta; nunca apaga).
CREATE TABLE IF NOT EXISTS public.restaurant_module_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  module text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('founder', 'crm', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS restaurant_module_events_rid ON public.restaurant_module_events (restaurant_id, created_at DESC);
ALTER TABLE public.restaurant_module_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modulos: membros veem a trilha" ON public.restaurant_module_events;
CREATE POLICY "modulos: membros veem a trilha" ON public.restaurant_module_events
  FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
REVOKE ALL ON public.restaurant_module_events FROM anon, authenticated;
GRANT SELECT ON public.restaurant_module_events TO authenticated;
GRANT ALL ON public.restaurant_module_events TO service_role;

CREATE OR REPLACE FUNCTION public.restaurant_has_module(p_rid uuid, p_module text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (SELECT 1 FROM restaurant_modules WHERE restaurant_id = p_rid AND module = p_module AND status = 'active')
$function$;

-- Muda o estado de um módulo. Só o servidor chama (fundador com 2FA ou CRM),
-- e quem chamou fica na trilha. Suspender não mexe em contas nem pedidos já feitos.
CREATE OR REPLACE FUNCTION public.set_restaurant_module(p_rid uuid, p_module text, p_status text, p_reason text, p_actor uuid, p_actor_kind text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_prev text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_rid) THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF p_module NOT IN ('order', 'kds', 'totem', 'three_d') THEN RAISE EXCEPTION 'Módulo inválido'; END IF;
  IF p_status NOT IN ('active', 'suspended', 'cancelled') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
  IF p_status <> 'active' AND nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  SELECT status INTO v_prev FROM restaurant_modules WHERE restaurant_id = p_rid AND module = p_module FOR UPDATE;
  IF v_prev IS NOT DISTINCT FROM p_status THEN
    RETURN jsonb_build_object('module', p_module, 'status', p_status, 'changed', false);
  END IF;
  INSERT INTO restaurant_modules (restaurant_id, module, status, reason, changed_by, changed_at)
  VALUES (p_rid, p_module, p_status, left(nullif(trim(p_reason), ''), 300), p_actor, now())
  ON CONFLICT (restaurant_id, module) DO UPDATE
    SET status = EXCLUDED.status, reason = EXCLUDED.reason, changed_by = EXCLUDED.changed_by, changed_at = now();
  INSERT INTO restaurant_module_events (restaurant_id, module, from_status, to_status, reason, actor_id, actor_kind)
  VALUES (p_rid, p_module, v_prev, p_status, left(nullif(trim(p_reason), ''), 300), p_actor, coalesce(p_actor_kind, 'system'));
  RETURN jsonb_build_object('module', p_module, 'status', p_status, 'changed', true, 'from', v_prev);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.set_restaurant_module(uuid, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_restaurant_module(uuid, text, text, text, uuid, text) TO service_role;

-- ---------------- Liberação de pedidos na mesa ----------------
-- staff_opens: a equipe libera e qualquer celular com a conta aberta pede.
-- table_code: a equipe libera e passa um código de 4 dígitos; cada celular
-- digita o código uma vez.
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS order_session_mode text NOT NULL DEFAULT 'staff_opens';
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_order_session_mode_check;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_order_session_mode_check CHECK (order_session_mode IN ('staff_opens', 'table_code'));

CREATE TABLE IF NOT EXISTS public.table_order_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  -- Conta a que a liberação vale: quando a mesa fecha, a sessão da conta gira e a liberação morre junto.
  bill_session text NOT NULL,
  requires_code boolean NOT NULL DEFAULT false,
  short_code text CHECK (short_code IS NULL OR short_code ~ '^[0-9]{4}$'),
  failed_attempts integer NOT NULL DEFAULT 0,
  opened_by uuid,
  opened_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours',
  closed_at timestamptz,
  closed_by uuid,
  close_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS table_order_sessions_one_open
  ON public.table_order_sessions (restaurant_id, table_number) WHERE closed_at IS NULL;
ALTER TABLE public.table_order_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liberacao: membros veem" ON public.table_order_sessions;
CREATE POLICY "liberacao: membros veem" ON public.table_order_sessions
  FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
REVOKE ALL ON public.table_order_sessions FROM anon, authenticated;
GRANT SELECT ON public.table_order_sessions TO authenticated;
GRANT ALL ON public.table_order_sessions TO service_role;

-- Celulares que digitaram o código. Só o hash do token fica no banco.
CREATE TABLE IF NOT EXISTS public.table_order_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.table_order_sessions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS table_order_devices_session ON public.table_order_devices (session_id);
ALTER TABLE public.table_order_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.table_order_devices FROM anon, authenticated;
GRANT ALL ON public.table_order_devices TO service_role;

-- Liberação válida agora para a conta atual da mesa (ou nada).
CREATE OR REPLACE FUNCTION public.table_ordering_current(p_rid uuid, p_table text)
 RETURNS public.table_order_sessions LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT s.* FROM table_order_sessions s
  JOIN restaurant_tables t ON t.restaurant_id = s.restaurant_id AND t.number = s.table_number
  WHERE s.restaurant_id = p_rid AND s.table_number = p_table AND s.closed_at IS NULL
    AND s.expires_at > now() AND s.bill_session = t.session_token AND t.active
  LIMIT 1
$function$;
REVOKE EXECUTE ON FUNCTION public.table_ordering_current(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.table_ordering_current(uuid, text) TO service_role;

-- Equipe libera pedidos na mesa. Repetir devolve a mesma liberação.
CREATE OR REPLACE FUNCTION public.open_table_ordering(p_slug text, p_table text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_mode text; v_cur public.table_order_sessions; v_bill text; v_code text; v_id uuid; v_exp timestamptz; v_rand bytea;
BEGIN
  SELECT id, order_session_mode INTO v_rid, v_mode FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT restaurant_has_module(v_rid, 'order') THEN RAISE EXCEPTION 'Tipe Order não está ativo para este restaurante'; END IF;
  SELECT session_token INTO v_bill FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active FOR UPDATE;
  IF v_bill IS NULL THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  v_cur := table_ordering_current(v_rid, p_table);
  -- Código bloqueado por tentativas erradas não é reaproveitado: gera outro.
  IF v_cur.id IS NOT NULL AND v_cur.failed_attempts < 10 THEN
    RETURN jsonb_build_object('id', v_cur.id, 'code', v_cur.short_code, 'requires_code', v_cur.requires_code, 'expires_at', v_cur.expires_at, 'reused', true);
  END IF;
  -- Liberação antiga (conta fechada, vencida ou bloqueada) é encerrada antes de abrir outra.
  UPDATE table_order_sessions SET closed_at = now(), closed_by = auth.uid(), close_reason = coalesce(close_reason, 'substituída')
  WHERE restaurant_id = v_rid AND table_number = p_table AND closed_at IS NULL;
  IF v_mode = 'table_code' THEN
    v_rand := gen_random_bytes(2);
    v_code := lpad(((get_byte(v_rand, 0) * 256 + get_byte(v_rand, 1)) % 10000)::text, 4, '0');
  END IF;
  INSERT INTO table_order_sessions (restaurant_id, table_number, bill_session, requires_code, short_code, opened_by)
  VALUES (v_rid, p_table, v_bill, v_mode = 'table_code', v_code, auth.uid())
  RETURNING id, expires_at INTO v_id, v_exp;
  RETURN jsonb_build_object('id', v_id, 'code', v_code, 'requires_code', v_mode = 'table_code', 'expires_at', v_exp, 'reused', false);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.open_table_ordering(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_table_ordering(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_table_ordering(p_slug text, p_table text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE table_order_sessions SET closed_at = now(), closed_by = auth.uid(), close_reason = 'encerrada pela equipe'
  WHERE restaurant_id = v_rid AND table_number = p_table AND closed_at IS NULL;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.close_table_ordering(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_table_ordering(text, text) TO authenticated, service_role;

-- Celular do cliente troca o código da mesa por um token próprio. Dez erros
-- na mesma liberação bloqueiam o código; a equipe libera de novo com outro.
CREATE OR REPLACE FUNCTION public.claim_table_ordering(p_slug text, p_table text, p_bill_session text, p_code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_cur public.table_order_sessions; v_token text;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  v_cur := table_ordering_current(v_rid, p_table);
  IF v_cur.id IS NULL OR v_cur.bill_session IS DISTINCT FROM p_bill_session THEN RETURN jsonb_build_object('ok', false, 'reason', 'closed'); END IF;
  IF NOT v_cur.requires_code THEN RETURN jsonb_build_object('ok', true, 'token', NULL); END IF;
  IF v_cur.failed_attempts >= 10 THEN RETURN jsonb_build_object('ok', false, 'reason', 'locked'); END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{4}$' OR p_code <> v_cur.short_code THEN
    UPDATE table_order_sessions SET failed_attempts = failed_attempts + 1 WHERE id = v_cur.id;
    RETURN jsonb_build_object('ok', false, 'reason', CASE WHEN v_cur.failed_attempts + 1 >= 10 THEN 'locked' ELSE 'wrong_code' END);
  END IF;
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO table_order_devices (session_id, token_hash) VALUES (v_cur.id, encode(digest(v_token, 'sha256'), 'hex'));
  RETURN jsonb_build_object('ok', true, 'token', v_token);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.claim_table_ordering(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_table_ordering(text, text, text, text) TO service_role;

-- Motivo de recusa de um pedido do cliente agora (NULL = pode pedir).
CREATE OR REPLACE FUNCTION public.table_ordering_block(p_rid uuid, p_table text, p_device text)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp' AS $function$
DECLARE v_cur public.table_order_sessions;
BEGIN
  IF NOT restaurant_has_module(p_rid, 'order') THEN RETURN 'module'; END IF;
  IF NOT coalesce((SELECT self_order_enabled FROM restaurants WHERE id = p_rid), false) THEN RETURN 'disabled'; END IF;
  v_cur := table_ordering_current(p_rid, p_table);
  IF v_cur.id IS NULL THEN RETURN 'closed'; END IF;
  IF v_cur.requires_code AND NOT EXISTS (
    SELECT 1 FROM table_order_devices WHERE session_id = v_cur.id AND token_hash = encode(digest(coalesce(p_device, ''), 'sha256'), 'hex')
  ) THEN RETURN 'code'; END IF;
  RETURN NULL;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.table_ordering_block(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.table_ordering_block(uuid, text, text) TO service_role;

-- ---------------- Pedido do cliente com módulo e liberação ----------------
-- Substitui a versão do 0024: a assinatura antiga sai para ninguém pular a checagem.
DROP FUNCTION IF EXISTS public.pdv_customer_order(text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION public.pdv_customer_order(p_slug text, p_table text, p_items jsonb, p_customer text, p_request_id text, p_device text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_rid uuid; v_order uuid; v_el jsonb; v_item record; v_qty integer;
  v_total numeric := 0; v_count integer := 0; v_name text; v_prev uuid; v_block text;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 8 AND 64 THEN RAISE EXCEPTION 'Requisição inválida'; END IF;

  -- Idempotência: mesma requisição devolve o mesmo pedido (não cria nada).
  SELECT id INTO v_prev FROM pdv_orders WHERE restaurant_id = v_rid AND request_id = p_request_id;
  IF v_prev IS NOT NULL THEN
    SELECT coalesce(sum(unit_price * quantity), 0), count(*) INTO v_total, v_count FROM pdv_order_items WHERE order_id = v_prev;
    RETURN jsonb_build_object('order_id', v_prev, 'items', v_count, 'total', v_total, 'duplicate', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  v_block := table_ordering_block(v_rid, p_table, p_device);
  IF v_block IN ('module', 'disabled') THEN RAISE EXCEPTION 'Pedido pela mesa desativado'; END IF;
  IF v_block = 'closed' THEN RAISE EXCEPTION 'Pedidos desta mesa não estão liberados'; END IF;
  IF v_block = 'code' THEN RAISE EXCEPTION 'Código da mesa necessário'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.pdv_customer_order(text, text, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_customer_order(text, text, jsonb, text, text, text) TO service_role;
