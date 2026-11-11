-- Pedidos grandes aguardam conferência na mesa, sem entrar na cozinha ou conta.
CREATE TABLE public.customer_order_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 table_number text NOT NULL,
 bill_session text NOT NULL,
 request_id text NOT NULL,
 customer_name text,
 device_token text,
 items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
 preview jsonb NOT NULL CHECK(jsonb_typeof(preview)='array'),
 quantity integer NOT NULL CHECK (quantity > 5),
 total numeric NOT NULL CHECK (total >= 0),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','rejected','expired')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 order_id uuid,
 UNIQUE (restaurant_id, request_id)
);
CREATE INDEX customer_order_reviews_pending ON public.customer_order_reviews(restaurant_id, created_at) WHERE state = 'pending';
ALTER TABLE public.customer_order_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_order_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_order_reviews TO service_role;
CREATE POLICY "Equipe vê revisões do restaurante" ON public.customer_order_reviews FOR SELECT TO authenticated
 USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','manager','cashier','waiter']::public.app_role[]));

-- Mantém o lançamento existente como operação interna. Nem service_role pode
-- contornar a espera chamando a função interna pela API.
ALTER FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text) RENAME TO pdv_customer_order_dispatch;
REVOKE ALL ON FUNCTION public.pdv_customer_order_dispatch(text,text,jsonb,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION public.pdv_customer_order(p_slug text, p_table text, p_items jsonb, p_customer text, p_request_id text, p_device text, p_bill_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
 v_rid uuid; v_session text; v_block text; v_review customer_order_reviews%ROWTYPE;
 v_el jsonb; v_qty integer; v_quantity integer := 0; v_total numeric := 0; v_price numeric; v_previous record; v_preview jsonb := '[]'::jsonb; v_item record;
BEGIN
 SELECT id INTO v_rid FROM restaurants WHERE slug=p_slug;
 IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
 IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 8 AND 64 THEN RAISE EXCEPTION 'Requisição inválida'; END IF;
 SELECT session_token INTO v_session FROM restaurant_tables WHERE restaurant_id=v_rid AND number=p_table AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
 IF p_bill_session IS NULL OR v_session<>p_bill_session THEN RAISE EXCEPTION 'Sessão da mesa inválida'; END IF;
 SELECT * INTO v_review FROM customer_order_reviews WHERE restaurant_id=v_rid AND request_id=p_request_id;
 IF FOUND THEN
  IF v_review.table_number<>p_table OR v_review.bill_session<>v_session THEN RAISE EXCEPTION 'Requisição inválida'; END IF;
  RETURN jsonb_build_object('review_id',v_review.id,'review_state',v_review.state,'items',v_review.quantity,'total',v_review.total,'duplicate',true);
 END IF;
 SELECT id, table_number, channel INTO v_previous FROM pdv_orders WHERE restaurant_id=v_rid AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.table_number<>p_table OR v_previous.channel<>'mesa' THEN RAISE EXCEPTION 'Requisição inválida'; END IF;
  RETURN pdv_customer_order_dispatch(p_slug,p_table,p_items,p_customer,p_request_id,p_device);
 END IF;
 v_block := table_ordering_block(v_rid,p_table,p_device);
 IF v_block IN ('module','disabled') THEN RAISE EXCEPTION 'Pedido pela mesa desativado'; END IF;
 IF v_block='closed' THEN RAISE EXCEPTION 'Pedidos desta mesa não estão liberados'; END IF;
 IF v_block='code' THEN RAISE EXCEPTION 'Código da mesa necessário'; END IF;
 IF table_is_over_limit(v_rid,p_table) AND NOT EXISTS(SELECT 1 FROM table_bill_items WHERE restaurant_slug=p_slug AND table_number=p_table) THEN RAISE EXCEPTION 'Esta mesa está indisponível no momento'; END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;
 FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(v_el->>'qty','') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  v_qty := (v_el->>'qty')::integer;
  IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT price, name INTO v_item FROM pdv_menu_items WHERE restaurant_id=v_rid AND code=v_el->>'code' AND available;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
  v_price := v_item.price;
  v_preview := v_preview || jsonb_build_array(jsonb_build_object('code',v_el->>'code','name',v_item.name,'qty',v_qty,'price',v_price,'notes',left(v_el->>'notes',140)));
  v_quantity := v_quantity+v_qty; v_total := v_total+v_price*v_qty;
 END LOOP;
 IF v_quantity<=5 THEN RETURN pdv_customer_order_dispatch(p_slug,p_table,p_items,p_customer,p_request_id,p_device); END IF;
 INSERT INTO customer_order_reviews(restaurant_id,table_number,bill_session,request_id,customer_name,device_token,items,preview,quantity,total)
 VALUES(v_rid,p_table,v_session,p_request_id,nullif(left(trim(p_customer),40),''),p_device,p_items,v_preview,v_quantity,v_total) RETURNING * INTO v_review;
 RETURN jsonb_build_object('review_id',v_review.id,'review_state','pending','items',v_quantity,'total',v_total,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text,text) TO service_role;

-- Compatibilidade durante a troca do Worker: a versão anterior do servidor
-- já valida a sessão, mas ainda envia seis argumentos. Também passa pela espera.
-- A API pública não tem EXECUTE; o servidor novo sempre envia a sessão explícita.
CREATE FUNCTION public.pdv_customer_order(p_slug text,p_table text,p_items jsonb,p_customer text,p_request_id text,p_device text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_session text;
BEGIN
 SELECT t.session_token INTO v_session FROM restaurant_tables t JOIN restaurants r ON r.id=t.restaurant_id WHERE r.slug=p_slug AND t.number=p_table AND t.active;
 RETURN pdv_customer_order(p_slug,p_table,p_items,p_customer,p_request_id,p_device,v_session);
END $$;
REVOKE ALL ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text) TO service_role;

CREATE FUNCTION public.resolve_customer_order_review(p_id uuid, p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_review customer_order_reviews%ROWTYPE; v_slug text; v_session text; v_result jsonb; v_el jsonb; v_price numeric;
BEGIN
 -- Ler a referência antes do lock mantém a mesma ordem de locks do envio:
 -- mesa primeiro, revisão depois. Não divulga existência a não membros.
 SELECT * INTO v_review FROM customer_order_reviews WHERE id=p_id;
 IF NOT FOUND OR NOT has_restaurant_role(auth.uid(),v_review.restaurant_id,ARRAY['owner','manager','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT session_token INTO v_session FROM restaurant_tables WHERE restaurant_id=v_review.restaurant_id AND number=v_review.table_number AND active FOR UPDATE;
 SELECT * INTO v_review FROM customer_order_reviews WHERE id=p_id FOR UPDATE;
 IF v_review.state<>'pending' THEN RETURN jsonb_build_object('state',v_review.state); END IF;
 IF v_session IS NULL OR v_session<>v_review.bill_session OR v_review.created_at<now()-interval '30 minutes' THEN
  UPDATE customer_order_reviews SET state='expired',resolved_at=now(),resolved_by=auth.uid() WHERE id=p_id;
  RETURN jsonb_build_object('state','expired');
 END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Informe a decisão'; END IF;
 IF p_approve THEN
  FOR v_el IN SELECT * FROM jsonb_array_elements(v_review.preview) LOOP
   SELECT price INTO v_price FROM pdv_menu_items WHERE restaurant_id=v_review.restaurant_id AND code=v_el->>'code' AND available FOR SHARE;
   IF NOT FOUND OR v_price<>(v_el->>'price')::numeric THEN RAISE EXCEPTION 'Cardápio alterado. Recuse este pedido e peça ao cliente para enviar novamente.'; END IF;
  END LOOP;
  SELECT slug INTO v_slug FROM restaurants WHERE id=v_review.restaurant_id;
  v_result := pdv_customer_order_dispatch(v_slug,v_review.table_number,v_review.items,v_review.customer_name,v_review.request_id,v_review.device_token);
 END IF;
 UPDATE customer_order_reviews SET state=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
  resolved_at=now(),resolved_by=auth.uid(),order_id=(v_result->>'order_id')::uuid WHERE id=p_id;
 RETURN jsonb_build_object('state',CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END $$;
REVOKE ALL ON FUNCTION public.resolve_customer_order_review(uuid,boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.resolve_customer_order_review(uuid,boolean) TO authenticated;

CREATE FUNCTION public.pending_customer_order_reviews(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_rid uuid; v_result jsonb;
BEGIN
 SELECT id INTO v_rid FROM restaurants WHERE slug=p_slug;
 IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(),v_rid,ARRAY['owner','manager','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at),'[]'::jsonb) INTO v_result FROM (
  SELECT r.id,r.table_number,r.customer_name,r.quantity,r.total,r.preview,r.created_at
  FROM customer_order_reviews r JOIN restaurant_tables t ON t.restaurant_id=r.restaurant_id AND t.number=r.table_number
  WHERE r.restaurant_id=v_rid AND r.state='pending' AND t.active AND t.session_token=r.bill_session
   AND r.created_at>=now()-interval '30 minutes' ORDER BY r.created_at LIMIT 100
 ) x;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.pending_customer_order_reviews(text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.pending_customer_order_reviews(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
