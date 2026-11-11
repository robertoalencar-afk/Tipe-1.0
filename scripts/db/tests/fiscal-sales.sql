-- Banco isolado com as migrações 0060/0061 e o arquivo original de reabertura.
BEGIN;
INSERT INTO restaurants(id,slug,cnpj) VALUES('20000000-0000-0000-0000-000000000001','fiscal-sale-test','12345678000195');
INSERT INTO restaurant_tables(restaurant_id,number,session_token,waiter_id) VALUES('20000000-0000-0000-0000-000000000001','3','bill-session-before','10000000-0000-0000-0000-000000000001');
INSERT INTO table_bill_items(restaurant_slug,table_number,item_code,item_name,unit_price,ordered_quantity,paid_portion,reserved_portion) VALUES('fiscal-sale-test','3','P1','Produto de teste',10,1,1,0);
INSERT INTO table_payment_requests(restaurant_slug,table_number,customer_name,payment_target,payment_method,status,amount,item_quantities,idempotency_key,service_fee_amount,provider,provider_order_id) VALUES
('fiscal-sale-test','3','Cliente de teste','restaurant','apple_pay','approved',11,'{"P1":1}','sale-1',1,'pagarme','order-synthetic-1'),
('fiscal-sale-test','3','Cliente de teste','tipe','pix','approved',5,'{}','tip-1',0,'pagarme','tip-synthetic-1');
DO $$
DECLARE v_id uuid; v_again uuid; v_sale record;
BEGIN
 IF has_table_privilege('anon','fiscal_sales','SELECT') OR has_table_privilege('authenticated','fiscal_sales','SELECT') OR has_table_privilege('service_role','fiscal_sales','UPDATE') THEN RAISE EXCEPTION 'Snapshots expostos ou editáveis'; END IF;
 IF has_function_privilege('service_role','archive_and_reopen_table_without_fiscal(text,text)','EXECUTE') OR has_function_privilege('anon','fiscal_capture_bill(text,text)','EXECUTE') THEN RAISE EXCEPTION 'Bypass de captura ou acesso anônimo'; END IF;
 v_id:=fiscal_capture_bill('fiscal-sale-test','3');
 v_again:=fiscal_capture_bill('fiscal-sale-test','3');
 IF v_id IS NULL OR v_id<>v_again OR (SELECT count(*) FROM fiscal_sales)<>1 THEN RAISE EXCEPTION 'Captura duplicada'; END IF;
 PERFORM archive_and_reopen_table('fiscal-sale-test','3');
 SELECT * INTO v_sale FROM fiscal_sales WHERE id=v_id;
 IF v_sale.source_reference<>'bill-session-before' OR jsonb_array_length(v_sale.items_snapshot)<>1 OR jsonb_array_length(v_sale.payments_snapshot)<>1 THEN RAISE EXCEPTION 'Snapshot incompleto ou misturou gorjetas extras'; END IF;
 IF v_sale.payments_snapshot->0->>'provider_order_id'<>'order-synthetic-1' OR (v_sale.payments_snapshot->0->>'amount')::numeric<>11 OR (v_sale.payments_snapshot->0->>'service_fee')::numeric<>1 THEN RAISE EXCEPTION 'Mudou pagamento ou perdeu vínculo com carteira digital'; END IF;
 IF (SELECT count(*) FROM archived_payments)<>2 OR EXISTS(SELECT 1 FROM table_payment_requests) OR EXISTS(SELECT 1 FROM table_bill_items) THEN RAISE EXCEPTION 'Arquivamento financeiro alterado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM archived_payments WHERE payment_target='tipe' AND amount=5 AND provider_order_id='tip-synthetic-1') THEN RAISE EXCEPTION 'Gorjeta extra foi alterada'; END IF;
 IF (SELECT session_token FROM restaurant_tables WHERE number='3')='bill-session-before' OR (SELECT waiter_id FROM restaurant_tables WHERE number='3') IS NOT NULL THEN RAISE EXCEPTION 'Reabertura não preservou comportamento'; END IF;
 IF NOT EXISTS(SELECT 1 FROM payment_audit_log WHERE action='table_reopened') THEN RAISE EXCEPTION 'Auditoria financeira perdida'; END IF;
 IF fiscal_capture_bill('fiscal-sale-test','3') IS NOT NULL OR (SELECT count(*) FROM fiscal_sales)<>1 THEN RAISE EXCEPTION 'Gerou venda fiscal vazia'; END IF;
END $$;
-- Uma inclusão entre a captura e a exclusão não pode sumir do histórico.
INSERT INTO table_bill_items(restaurant_slug,table_number,item_code,item_name,unit_price,ordered_quantity,paid_portion,reserved_portion)
VALUES('fiscal-sale-test','3','P2','Outro produto',12,1,1,0);
DO $$
DECLARE v_blocked boolean:=false;
BEGIN
 PERFORM fiscal_capture_bill('fiscal-sale-test','3');
 INSERT INTO table_bill_items(restaurant_slug,table_number,item_code,item_name,unit_price,ordered_quantity,paid_portion,reserved_portion)
 VALUES('fiscal-sale-test','3','P3','Produto incluído depois',5,1,1,0);
 BEGIN
  DELETE FROM table_bill_items WHERE restaurant_slug='fiscal-sale-test' AND table_number='3';
 EXCEPTION WHEN raise_exception THEN v_blocked:=true;
 END;
 IF NOT v_blocked OR (SELECT count(*) FROM table_bill_items WHERE restaurant_slug='fiscal-sale-test')<>2 THEN RAISE EXCEPTION 'Corrida apagou produtos fora do snapshot'; END IF;
END $$;
-- Uma conta ainda aberta não pode ser arquivada.
UPDATE table_bill_items SET paid_portion=0 WHERE item_code='P3';
DO $$
DECLARE v_blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM archive_and_reopen_table('fiscal-sale-test','3');
 EXCEPTION WHEN raise_exception THEN v_blocked:=true;
 END;
 IF NOT v_blocked OR (SELECT count(*) FROM table_bill_items WHERE restaurant_slug='fiscal-sale-test')<>2 THEN RAISE EXCEPTION 'Conta pendente foi arquivada'; END IF;
END $$;
ROLLBACK;
