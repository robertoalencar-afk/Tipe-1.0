-- Preserva fatos da conta ANTES da reabertura apagar os itens atuais.
-- Não emite notas e não altera estados, valores ou distribuição dos pagamentos.
CREATE TABLE public.fiscal_sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
 source_kind text NOT NULL CHECK(source_kind IN('table_bill','counter_order')),
 source_reference text NOT NULL CHECK(length(source_reference) BETWEEN 1 AND 160),
 table_number text,
 items_snapshot jsonb NOT NULL CHECK(jsonb_typeof(items_snapshot)='array'),
 payments_snapshot jsonb NOT NULL CHECK(jsonb_typeof(payments_snapshot)='array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(restaurant_id,source_kind,source_reference),
 UNIQUE(restaurant_id,id)
);
CREATE INDEX fiscal_sales_period ON public.fiscal_sales(restaurant_id,created_at DESC);
ALTER TABLE public.fiscal_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_sales FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.fiscal_sales TO service_role;

CREATE FUNCTION public.fiscal_capture_bill(p_slug text,p_table text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_rid uuid; v_session text; v_items jsonb; v_payments jsonb; v_id uuid;
BEGIN
 SELECT id INTO v_rid FROM restaurants WHERE slug=p_slug;
 IF v_rid IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
 SELECT session_token INTO v_session FROM restaurant_tables WHERE restaurant_id=v_rid AND number=p_table FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mesa inexistente'; END IF;
 -- A liquidação existente bloqueia pagamento e depois itens: mesma ordem aqui.
 PERFORM 1 FROM table_payment_requests WHERE restaurant_slug=p_slug AND table_number=p_table ORDER BY id FOR UPDATE;
 PERFORM 1 FROM table_bill_items WHERE restaurant_slug=p_slug AND table_number=p_table ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM table_bill_items WHERE restaurant_slug=p_slug AND table_number=p_table AND (ordered_quantity-paid_portion>0.0001 OR reserved_portion>0.0001)) OR EXISTS(SELECT 1 FROM table_payment_requests WHERE restaurant_slug=p_slug AND table_number=p_table AND payment_target='restaurant' AND status='pending') THEN
  RAISE EXCEPTION 'Há itens ou pagamentos pendentes nesta mesa. Atualize antes de encerrar';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',item_code,'name',item_name,'price',unit_price,'quantity',ordered_quantity,'paid',paid_portion,'reserved',reserved_portion) ORDER BY item_code),'[]'::jsonb)
 INTO v_items FROM table_bill_items WHERE restaurant_slug=p_slug AND table_number=p_table;
 IF jsonb_array_length(v_items)=0 THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'method',payment_method,'status',status,'amount',amount,'service_fee',service_fee_amount,'establishment_method',establishment_method,'provider',provider,'provider_order_id',provider_order_id,'created_at',created_at) ORDER BY created_at,id),'[]'::jsonb)
 INTO v_payments FROM table_payment_requests WHERE restaurant_slug=p_slug AND table_number=p_table AND payment_target='restaurant';
 INSERT INTO fiscal_sales(restaurant_id,source_kind,source_reference,table_number,items_snapshot,payments_snapshot)
 VALUES(v_rid,'table_bill',v_session,p_table,v_items,v_payments)
 ON CONFLICT(restaurant_id,source_kind,source_reference) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN SELECT id INTO v_id FROM fiscal_sales WHERE restaurant_id=v_rid AND source_kind='table_bill' AND source_reference=v_session; END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_capture_bill(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fiscal_capture_bill(text,text) FROM service_role;

ALTER FUNCTION public.archive_and_reopen_table(text,text) RENAME TO archive_and_reopen_table_without_fiscal;
REVOKE ALL ON FUNCTION public.archive_and_reopen_table_without_fiscal(text,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.archive_and_reopen_table(p_slug text,p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.fiscal_capture_bill(p_slug,p_table);
 PERFORM public.archive_and_reopen_table_without_fiscal(p_slug,p_table);
END $$;
REVOKE ALL ON FUNCTION public.archive_and_reopen_table(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_reopen_table(text,text) TO service_role;

-- Rejeições/cancelamentos ficam no histórico. Um novo envio corrigido tem outra
-- referência; estados incertos e autorizações continuam impedindo duplicação.
ALTER TABLE public.fiscal_documents DROP CONSTRAINT fiscal_documents_source_uq;
CREATE UNIQUE INDEX fiscal_documents_one_active_source ON public.fiscal_documents(restaurant_id,environment,source_kind,source_reference)
 WHERE state NOT IN('rejected','denied','cancelled');
NOTIFY pgrst,'reload schema';


-- Detecta um produto novo que entrou entre a conferência e o DELETE original.
-- Em caso de corrida, a transação inteira volta, mantendo conta e pagamentos.
CREATE FUNCTION public.fiscal_validate_archived_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g record; v_snapshot jsonb;
BEGIN
 FOR g IN SELECT restaurant_slug,table_number,jsonb_agg(jsonb_build_object('code',item_code,'name',item_name,'price',unit_price,'quantity',ordered_quantity,'paid',paid_portion,'reserved',reserved_portion) ORDER BY item_code) AS items FROM deleted_bill_items GROUP BY restaurant_slug,table_number LOOP
  SELECT s.items_snapshot INTO v_snapshot FROM public.fiscal_sales s JOIN public.restaurants r ON r.id=s.restaurant_id JOIN public.restaurant_tables t ON t.restaurant_id=r.id AND t.number=g.table_number
  WHERE r.slug=g.restaurant_slug AND s.source_kind='table_bill' AND s.source_reference=t.session_token;
  IF FOUND AND v_snapshot IS DISTINCT FROM g.items THEN RAISE EXCEPTION 'A mesa mudou durante o encerramento. Atualize e tente novamente'; END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_validate_archived_items() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER fiscal_validate_archived_items AFTER DELETE ON public.table_bill_items REFERENCING OLD TABLE AS deleted_bill_items FOR EACH STATEMENT EXECUTE FUNCTION public.fiscal_validate_archived_items();
