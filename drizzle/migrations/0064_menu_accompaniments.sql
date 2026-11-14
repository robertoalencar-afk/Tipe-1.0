-- Escolhas do cliente são validadas contra o catálogo do restaurante, nunca preços do navegador.
CREATE FUNCTION public.prepare_menu_accompaniments(p_rid uuid, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 e jsonb; c jsonb; chosen jsonb; cfg jsonb; base record; side record;
 output jsonb := '[]'; extras jsonb; note text; names text; n integer; qty integer;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;
 FOR e IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(e->>'qty','') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  qty := (e->>'qty')::integer;
  IF qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT code,name,menu_config INTO base FROM pdv_menu_items WHERE restaurant_id=p_rid AND code=e->>'code' AND available FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
  cfg := base.menu_config->'accompaniments';
  chosen := coalesce(e->'sides','[]'::jsonb);
  IF jsonb_typeof(chosen)<>'array' OR jsonb_array_length(chosen)>4 THEN RAISE EXCEPTION 'Acompanhamentos inválidos'; END IF;
  n := jsonb_array_length(chosen);
  IF n<>(SELECT count(DISTINCT value) FROM jsonb_array_elements_text(chosen)) THEN RAISE EXCEPTION 'Acompanhamento repetido'; END IF;
  IF coalesce((cfg->>'enabled')::boolean,false) THEN
   IF n<coalesce((cfg->>'min')::integer,0) OR n>coalesce((cfg->>'max')::integer,1) THEN RAISE EXCEPTION 'Confira os acompanhamentos do prato'; END IF;
  ELSIF n>0 THEN RAISE EXCEPTION 'Este prato não permite escolher acompanhamentos'; END IF;
  extras := '[]'; names := '';
  FOR c IN SELECT value FROM jsonb_array_elements(chosen) LOOP
   IF jsonb_typeof(c)<>'string' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(cfg->'choices') x WHERE x->>'code'=c#>>'{}') OR c#>>'{}'=base.code THEN RAISE EXCEPTION 'Acompanhamento inválido'; END IF;
   SELECT code,name,price INTO side FROM pdv_menu_items WHERE restaurant_id=p_rid AND code=c#>>'{}' AND available FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Acompanhamento indisponível'; END IF;
   names := concat_ws(', ',nullif(names,''),side.name);
   IF NOT coalesce((SELECT (x->>'included')::boolean FROM jsonb_array_elements(cfg->'choices') x WHERE x->>'code'=side.code),false) THEN
    extras := extras || jsonb_build_array(jsonb_build_object('code',side.code,'qty',qty,'notes','Acompanhamento de '||base.name));
   END IF;
  END LOOP;
  note := concat_ws(' · ',nullif(left(trim(e->>'notes'),140),''),CASE WHEN names<>'' THEN 'Acompanhamentos: '||names END);
  output := output || jsonb_build_array(jsonb_build_object('code',base.code,'qty',qty,'notes',note,'side_codes',chosen)) || extras;
 END LOOP;
 IF jsonb_array_length(output)>60 THEN RAISE EXCEPTION 'Divida o pedido em envios menores'; END IF;
 RETURN output;
END $$;
REVOKE ALL ON FUNCTION public.prepare_menu_accompaniments(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.pdv_customer_order(p_slug text, p_table text, p_items jsonb, p_customer text, p_request_id text, p_device text, p_bill_session text)
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
 p_items := prepare_menu_accompaniments(v_rid,p_items);
 FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(v_el->>'qty','') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  v_qty := (v_el->>'qty')::integer;
  IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT price, name INTO v_item FROM pdv_menu_items WHERE restaurant_id=v_rid AND code=v_el->>'code' AND available;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
  v_price := v_item.price;
  v_preview := v_preview || jsonb_build_array(jsonb_build_object('code',v_el->>'code','name',v_item.name,'qty',v_qty,'price',v_price,'notes',left(v_el->>'notes',1000)));
  v_quantity := v_quantity+v_qty; v_total := v_total+v_price*v_qty;
 END LOOP;
 IF v_quantity<=5 THEN RETURN pdv_customer_order_dispatch(p_slug,p_table,p_items,p_customer,p_request_id,p_device); END IF;
 INSERT INTO customer_order_reviews(restaurant_id,table_number,bill_session,request_id,customer_name,device_token,items,preview,quantity,total)
 VALUES(v_rid,p_table,v_session,p_request_id,nullif(left(trim(p_customer),40),''),p_device,p_items,v_preview,v_quantity,v_total) RETURNING * INTO v_review;
 RETURN jsonb_build_object('review_id',v_review.id,'review_state','pending','items',v_quantity,'total',v_total,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_customer_order(text,text,jsonb,text,text,text,text) TO service_role;


-- Preserva todas as escolhas no KDS; observações livres continuam limitadas a 140.
CREATE OR REPLACE FUNCTION public.pdv_customer_order_dispatch(p_slug text, p_table text, p_items jsonb, p_customer text, p_request_id text, p_device text DEFAULT NULL)
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
    VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, v_qty, left(nullif(trim(v_el->>'notes'), ''), 1000), v_item.sector);
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, source_adapter, notes)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, coalesce(v_name, 'Cliente'), now(), 'cardapio_tipe', left(nullif(trim(v_el->>'notes'), ''), 1000))
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
    v_total := v_total + v_item.price * v_qty;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order, 'items', v_count, 'total', v_total, 'duplicate', false);
END; $function$;
REVOKE ALL ON FUNCTION public.pdv_customer_order_dispatch(text,text,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.resolve_customer_order_review(p_id uuid, p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_review customer_order_reviews%ROWTYPE; v_slug text; v_session text; v_result jsonb; v_el jsonb; v_price numeric;
BEGIN
 -- Ler a referência antes do lock mantém a mesma ordem de locks do envio:
 -- mesa primeiro, revisão depois. Não divulga existência a não membros.
 SELECT * INTO v_review FROM customer_order_reviews WHERE id=p_id;
 IF NOT FOUND OR NOT (has_restaurant_role(auth.uid(),v_review.restaurant_id,ARRAY['owner','manager','cashier']::app_role[]) OR (has_restaurant_role(auth.uid(),v_review.restaurant_id,ARRAY['waiter']::app_role[]) AND EXISTS(SELECT 1 FROM pdv_waiters w WHERE w.restaurant_id=v_review.restaurant_id AND w.user_id=auth.uid() AND w.active))) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT session_token INTO v_session FROM restaurant_tables WHERE restaurant_id=v_review.restaurant_id AND number=v_review.table_number AND active FOR UPDATE;
 SELECT * INTO v_review FROM customer_order_reviews WHERE id=p_id FOR UPDATE;
 IF v_review.state<>'pending' THEN RETURN jsonb_build_object('state',v_review.state); END IF;
 IF v_session IS NULL OR v_session<>v_review.bill_session OR v_review.created_at<now()-interval '30 minutes' THEN
  UPDATE customer_order_reviews SET state='expired',resolved_at=now(),resolved_by=auth.uid() WHERE id=p_id;
  RETURN jsonb_build_object('state','expired');
 END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Informe a decisão'; END IF;
 IF p_approve THEN
  -- Included sides have no separate priced line, but must still be available when staff approves.
  FOR v_el IN SELECT * FROM jsonb_array_elements(v_review.items) LOOP
   IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(coalesce(v_el->'side_codes','[]'::jsonb)) side_code
    WHERE NOT EXISTS(SELECT 1 FROM pdv_menu_items WHERE restaurant_id=v_review.restaurant_id AND code=side_code AND available)
   ) THEN RAISE EXCEPTION 'Acompanhamento indisponível. Recuse este pedido e peça ao cliente para enviar novamente.'; END IF;
  END LOOP;
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


NOTIFY pgrst, 'reload schema';
