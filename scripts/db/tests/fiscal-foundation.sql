-- Executar somente em banco isolado após a migração. Todos os fixtures são revertidos.
BEGIN;
CREATE FUNCTION pg_temp.must_fail(p_sql text,p_part text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean := false;
BEGIN
  BEGIN EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF position(p_part IN SQLERRM) = 0 THEN RAISE EXCEPTION 'Erro inesperado: %',SQLERRM; END IF;
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Operação indevidamente permitida: %',p_sql; END IF;
END $$;

INSERT INTO auth.users(id) VALUES('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
INSERT INTO public.restaurants(id,slug,cnpj) VALUES('20000000-0000-0000-0000-000000000001','fiscal-fixture-a','12345678000195'),('20000000-0000-0000-0000-000000000002','fiscal-fixture-b','12345678000195');
INSERT INTO public.user_roles(user_id,restaurant_id,role) VALUES
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','owner'),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','owner'),
('10000000-0000-0000-0000-000000000003',NULL,'founder');
INSERT INTO public.pdv_menu_items(id,restaurant_id) VALUES
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');

DO $$
DECLARE v_data jsonb := '{"provider":"focus","environment":"homologacao","cnpj":"12345678000195","legal_name":"Empresa teste","state_registration":"123","uf":"CE","municipality_code":"2304400","tax_regime":"1","address":{}}';
  v_rid uuid := '20000000-0000-0000-0000-000000000001';
  v_owner uuid := '10000000-0000-0000-0000-000000000001';
  v_profile uuid;
BEGIN
  IF has_table_privilege('anon','public.restaurant_fiscal_settings','SELECT') OR has_table_privilege('authenticated','public.restaurant_fiscal_settings','SELECT') THEN RAISE EXCEPTION 'Credenciais expostas'; END IF;
  IF has_function_privilege('anon','public.fiscal_outbox_claim(integer)','EXECUTE') OR has_function_privilege('authenticated','public.fiscal_save_settings(uuid,uuid,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'RPC fiscal exposta'; END IF;
  IF (SELECT count(*) FROM pg_class WHERE oid IN ('public.restaurant_fiscal_settings'::regclass,'public.fiscal_product_profiles'::regclass,'public.fiscal_documents'::regclass,'public.fiscal_events'::regclass,'public.fiscal_outbox'::regclass) AND relrowsecurity) <> 5 THEN RAISE EXCEPTION 'RLS ausente'; END IF;
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_settings(%L,%L,%L,%L)',v_rid,'10000000-0000-0000-0000-000000000002',v_data,'credencial-cifrada-ficticia'),'Sem permissão');
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_settings(%L,%L,%L,%L)',v_rid,'10000000-0000-0000-0000-000000000003',v_data,'credencial-cifrada-ficticia'),'Sem permissão');
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_settings(%L,%L,%L,%L)',v_rid,v_owner,v_data || '{"cnpj":"00000000000191"}'::jsonb,'credencial-cifrada-ficticia'),'CNPJ fiscal');
  PERFORM public.fiscal_save_settings(v_rid,v_owner,v_data,'credencial-cifrada-ficticia');
  IF (SELECT enabled FROM public.restaurant_fiscal_settings WHERE restaurant_id=v_rid) THEN RAISE EXCEPTION 'Emissão habilitada sem homologação'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.fiscal_events WHERE restaurant_id=v_rid AND event_type='settings_saved') THEN RAISE EXCEPTION 'Auditoria ausente'; END IF;
  UPDATE public.restaurant_fiscal_settings SET enabled=true,verified_at=now(),verified_by=v_owner WHERE restaurant_id=v_rid;
  PERFORM public.fiscal_save_settings(v_rid,v_owner,v_data,'outra-credencial-cifrada');
  IF EXISTS(SELECT 1 FROM public.restaurant_fiscal_settings WHERE restaurant_id=v_rid AND (enabled OR verified_at IS NOT NULL)) THEN RAISE EXCEPTION 'Mudança de configuração não revogou verificação'; END IF;
  v_data := '{"item_id":"30000000-0000-0000-0000-000000000001","valid_from":"2026-01-01","valid_until":"2026-06-30","ncm":"00000000","cfop":"5102","unit":"UN","layout_version":"teste","tables_version":"teste","review_reference":"fixture contabilidade","attributes":{"icms_situacao_tributaria":"102"}}';
  v_profile := public.fiscal_save_product_profile(v_rid,v_owner,'homologacao',v_data);
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_product_profile(%L,%L,%L,%L)',v_rid,v_owner,'homologacao',v_data || '{"valid_from":"2026-06-30","valid_until":"2026-12-31"}'::jsonb),'sobreposto');
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_product_profile(%L,%L,%L,%L)',v_rid,v_owner,'homologacao',v_data || '{"item_id":"30000000-0000-0000-0000-000000000002"}'::jsonb),'Produto não pertence');
  PERFORM pg_temp.must_fail(format('UPDATE public.fiscal_product_profiles SET ncm=''11111111'' WHERE id=%L',v_profile),'versionados');
  PERFORM public.fiscal_close_product_profile(v_rid,v_owner,v_profile,'2026-06-29');
  PERFORM public.fiscal_save_product_profile(v_rid,v_owner,'homologacao',v_data || '{"valid_from":"2026-06-30","valid_until":"2026-12-31"}'::jsonb);
END $$;

INSERT INTO public.fiscal_documents(id,restaurant_id,environment,provider,model,source_kind,source_reference,provider_reference,issuer_cnpj,amount_cents,payload_snapshot,payments_snapshot)
VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','homologacao','focus','nfce','table_bill','sessao-fixture','fixture-1','12345678000195',1000,'{}','[]');
SELECT pg_temp.must_fail($q$INSERT INTO public.fiscal_documents(restaurant_id,environment,provider,model,source_kind,source_reference,provider_reference,issuer_cnpj,amount_cents,payload_snapshot,payments_snapshot)
VALUES('20000000-0000-0000-0000-000000000001','homologacao','focus','nfe','table_bill','sessao-fixture','fixture-2','12345678000195',1000,'{}','[]')$q$,'duplicate key');
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET amount_cents=2000 WHERE id='40000000-0000-0000-0000-000000000001'$q$,'imutáveis');
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET state='authorized' WHERE id='40000000-0000-0000-0000-000000000001'$q$,'check constraint');
UPDATE public.fiscal_documents SET state='authorized',access_key=repeat('1',44),authorized_at=now() WHERE id='40000000-0000-0000-0000-000000000001';
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET state='draft' WHERE id='40000000-0000-0000-0000-000000000001'$q$,'não pode');
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET access_key=repeat('2',44) WHERE id='40000000-0000-0000-0000-000000000001'$q$,'imutável');
UPDATE public.fiscal_documents SET state='cancelled',cancelled_at=now() WHERE id='40000000-0000-0000-0000-000000000001';
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET state='authorized' WHERE id='40000000-0000-0000-0000-000000000001'$q$,'não pode');
SELECT pg_temp.must_fail($q$INSERT INTO public.fiscal_outbox(restaurant_id,document_id,operation,request_id) VALUES('20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','consult',gen_random_uuid())$q$,'foreign key');
INSERT INTO public.fiscal_outbox(restaurant_id,document_id,operation,request_id) VALUES('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','consult',gen_random_uuid());
DO $$
DECLARE v_first uuid; v_second uuid; v_id uuid;
BEGIN
  SELECT id,lease_token INTO v_id,v_first FROM public.fiscal_outbox_claim(20);
  IF v_first IS NULL THEN RAISE EXCEPTION 'Claim sem lease'; END IF;
  IF EXISTS(SELECT 1 FROM public.fiscal_outbox_claim(20)) THEN RAISE EXCEPTION 'Claim duplicado enquanto lease ativa'; END IF;
  UPDATE public.fiscal_outbox SET lease_until=now()-interval '1 second' WHERE id=v_id;
  SELECT lease_token INTO v_second FROM public.fiscal_outbox_claim(20);
  IF v_first=v_second OR v_second IS NULL THEN RAISE EXCEPTION 'Lease reaproveitada'; END IF;
END $$;
ROLLBACK;
SELECT 'fiscal foundation: todos os cenários passaram' AS resultado;
