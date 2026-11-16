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
  PERFORM public.fiscal_save_settings(v_rid,v_owner,v_data || '{"environment":"producao"}'::jsonb,'credencial-producao-ficticia');
  v_data := '{"item_id":"30000000-0000-0000-0000-000000000001","valid_from":"2026-01-01","valid_until":"2026-06-30","ncm":"00000000","cfop":"5102","unit":"UN","layout_version":"teste","tables_version":"teste","review_reference":"fixture contabilidade","attributes":{"icms_situacao_tributaria":"102"}}';
  v_profile := public.fiscal_save_product_profile(v_rid,v_owner,'homologacao',v_data);
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_product_profile(%L,%L,%L,%L)',v_rid,v_owner,'homologacao',v_data || '{"valid_from":"2026-06-30","valid_until":"2026-12-31"}'::jsonb),'sobreposto');
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_save_product_profile(%L,%L,%L,%L)',v_rid,v_owner,'homologacao',v_data || '{"item_id":"30000000-0000-0000-0000-000000000002"}'::jsonb),'Produto não pertence');
  PERFORM pg_temp.must_fail(format('UPDATE public.fiscal_product_profiles SET ncm=''11111111'' WHERE id=%L',v_profile),'versionados');
  PERFORM pg_temp.must_fail(format('SELECT public.fiscal_close_product_profile(%L,%L,%L,%L,%L)',v_rid,v_owner,'producao',v_profile,'2026-06-29'),'Perfil fiscal não encontrado');
  PERFORM public.fiscal_save_product_profile(v_rid,v_owner,'producao',v_data);
  IF (SELECT count(*) FROM fiscal_product_profiles WHERE restaurant_id=v_rid AND menu_item_id=(v_data->>'item_id')::uuid)<>2 THEN RAISE EXCEPTION 'Perfis de produção e homologação não foram separados'; END IF;
  PERFORM public.fiscal_close_product_profile(v_rid,v_owner,'homologacao',v_profile,'2026-06-29');
  PERFORM public.fiscal_save_product_profile(v_rid,v_owner,'homologacao',v_data || '{"valid_from":"2026-06-30","valid_until":"2026-12-31"}'::jsonb);
END $$;

INSERT INTO public.fiscal_documents(id,restaurant_id,environment,provider,model,source_kind,source_reference,provider_reference,issuer_cnpj,amount_cents,payload_snapshot,payments_snapshot)
VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','homologacao','focus','nfce','table_bill','sessao-fixture','fixture-1','12345678000195',1000,'{}','[]');
SELECT pg_temp.must_fail($q$INSERT INTO public.fiscal_documents(restaurant_id,environment,provider,model,source_kind,source_reference,provider_reference,issuer_cnpj,amount_cents,payload_snapshot,payments_snapshot)
VALUES('20000000-0000-0000-0000-000000000001','homologacao','focus','nfe','table_bill','sessao-fixture','fixture-2','12345678000195',1000,'{}','[]')$q$,'duplicate key');
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET amount_cents=2000 WHERE id='40000000-0000-0000-0000-000000000001'$q$,'imutáveis');
SELECT pg_temp.must_fail($q$UPDATE public.fiscal_documents SET state='authorized' WHERE id='40000000-0000-0000-0000-000000000001'$q$,'check constraint');
UPDATE public.fiscal_documents SET state='authorized',access_key='23261112345678000195'||repeat('1',24),authorized_at=now() WHERE id='40000000-0000-0000-0000-000000000001';
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
  IF public.fiscal_outbox_finish(v_id,v_first,'{"state":"authorized"}'::jsonb) THEN RAISE EXCEPTION 'Worker antigo confirmou resultado'; END IF;
  IF NOT public.fiscal_outbox_finish(v_id,v_second,'{"state":"uncertain","artifacts":{"xml":null}}'::jsonb) THEN RAISE EXCEPTION 'Worker atual não confirmou resultado'; END IF;
  IF (SELECT state FROM fiscal_documents WHERE id='40000000-0000-0000-0000-000000000001')<>'cancelled' THEN RAISE EXCEPTION 'Consulta antiga reabriu nota cancelada'; END IF;
  IF public.fiscal_outbox_finish(v_id,v_second,'{"state":"uncertain"}'::jsonb) THEN RAISE EXCEPTION 'Conclusão repetida foi aceita'; END IF;
END $$;
INSERT INTO public.fiscal_documents(id,restaurant_id,environment,provider,model,source_kind,source_reference,provider_reference,issuer_cnpj,amount_cents,payload_snapshot,payments_snapshot,tax_date)
VALUES('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','homologacao','focus','nfce','table_bill','sessao-2','fixture-2','12345678000195',1000,'{"cnpj_emitente":"12345678000195"}','[]',(now() AT TIME ZONE 'America/Sao_Paulo')::date);
INSERT INTO public.fiscal_outbox(restaurant_id,document_id,operation,request_id) VALUES('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','issue',gen_random_uuid());
UPDATE restaurant_fiscal_settings SET enabled=true,verified_at=now() WHERE restaurant_id='20000000-0000-0000-0000-000000000001' AND environment='homologacao';
DO $$
DECLARE v_job record;
BEGIN
 SELECT * INTO v_job FROM fiscal_outbox_claim(1);
 IF NOT fiscal_outbox_begin_send(v_job.id,v_job.lease_token,jsonb_build_object('cnpj_emitente','12345678000195','data_emissao',now())) THEN RAISE EXCEPTION 'Não reservou envio'; END IF;
 IF fiscal_outbox_begin_send(v_job.id,v_job.lease_token,jsonb_build_object('cnpj_emitente','12345678000195','data_emissao',now())) THEN RAISE EXCEPTION 'Reservou envio duas vezes'; END IF;
 UPDATE fiscal_outbox SET lease_until=now()-interval '1 second' WHERE id=v_job.id;
 IF fiscal_outbox_finish(v_job.id,v_job.lease_token,'{"state":"rejected"}'::jsonb) THEN RAISE EXCEPTION 'Lease expirada alterou documento'; END IF;
 IF (SELECT send_started_at IS NULL FROM fiscal_outbox WHERE id=v_job.id) THEN RAISE EXCEPTION 'Marca de envio perdida'; END IF;
END $$;
DO $$
DECLARE v_rid uuid:='20000000-0000-0000-0000-000000000001';
 v_owner uuid:='10000000-0000-0000-0000-000000000001';
 v_doc uuid:='40000000-0000-0000-0000-000000000002';
 v_req uuid:=gen_random_uuid(); v_job uuid; v_again uuid;
BEGIN
 IF has_function_privilege('anon','fiscal_request_document_action(uuid,uuid,uuid,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Ação fiscal pública'; END IF;
 PERFORM pg_temp.must_fail(format('SELECT fiscal_request_document_action(%L,%L,%L,%L,%L,NULL)',v_rid,'10000000-0000-0000-0000-000000000002',v_doc,v_req,'consult'),'Sem permissão');
 PERFORM pg_temp.must_fail(format('SELECT fiscal_request_document_action(%L,%L,%L,%L,%L,NULL)',v_rid,v_owner,v_doc,v_req,'issue'),'Operação fiscal inválida');
 PERFORM pg_temp.must_fail(format('SELECT fiscal_request_document_action(%L,%L,%L,%L,%L,%L)',v_rid,v_owner,v_doc,v_req,'cancel','Motivo suficientemente longo'),'Somente nota autorizada');
 v_job:=fiscal_request_document_action(v_rid,v_owner,v_doc,v_req,'consult');
 v_again:=fiscal_request_document_action(v_rid,v_owner,v_doc,v_req,'consult');
 IF v_job<>v_again THEN RAISE EXCEPTION 'Consulta duplicada'; END IF;
 IF fiscal_request_document_action(v_rid,v_owner,v_doc,gen_random_uuid(),'consult')<>v_job THEN RAISE EXCEPTION 'Criou outra consulta enquanto pendente'; END IF;
 UPDATE fiscal_documents SET state='authorized',access_key='23261112345678000195'||repeat('2',24),authorized_at=now() WHERE id=v_doc;
 PERFORM pg_temp.must_fail(format('SELECT fiscal_request_document_action(%L,%L,%L,%L,%L,%L)',v_rid,v_owner,v_doc,v_req,'cancel','Motivo suficientemente longo'),'outra operação');
 PERFORM pg_temp.must_fail(format('SELECT fiscal_request_document_action(%L,%L,%L,%L,%L,%L)',v_rid,v_owner,v_doc,gen_random_uuid(),'cancel','curto'),'justificativa');
 v_job:=fiscal_request_document_action(v_rid,v_owner,v_doc,gen_random_uuid(),'cancel',' Motivo suficientemente longo ');
 IF NOT EXISTS(SELECT 1 FROM fiscal_outbox WHERE id=v_job AND reason='Motivo suficientemente longo') THEN RAISE EXCEPTION 'Perdeu justificativa'; END IF;
END $$;
ROLLBACK;
SELECT 'fiscal foundation: todos os cenários passaram' AS resultado;
