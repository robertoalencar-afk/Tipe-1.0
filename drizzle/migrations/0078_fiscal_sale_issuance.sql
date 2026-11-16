-- Emissão explícita a partir da venda preservada; nunca a partir de valores do navegador.
ALTER TABLE public.restaurant_fiscal_settings ADD COLUMN configuration_revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE FUNCTION public.fiscal_settings_revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF ROW(NEW.provider,NEW.cnpj,NEW.legal_name,NEW.state_registration,NEW.uf,NEW.time_zone,NEW.municipality_code,NEW.tax_regime,NEW.address,NEW.credentials_encrypted,NEW.acquirer_cnpj,NEW.service_fee_policy,NEW.service_fee_review)
  IS DISTINCT FROM ROW(OLD.provider,OLD.cnpj,OLD.legal_name,OLD.state_registration,OLD.uf,OLD.time_zone,OLD.municipality_code,OLD.tax_regime,OLD.address,OLD.credentials_encrypted,OLD.acquirer_cnpj,OLD.service_fee_policy,OLD.service_fee_review) THEN NEW.configuration_revision:=gen_random_uuid();
 ELSE NEW.configuration_revision:=OLD.configuration_revision; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_settings_revision_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER fiscal_settings_revision_guard BEFORE UPDATE ON public.restaurant_fiscal_settings FOR EACH ROW EXECUTE FUNCTION public.fiscal_settings_revision_guard();
ALTER TABLE public.fiscal_documents ADD COLUMN configuration_revision uuid;
ALTER TABLE public.fiscal_documents ADD COLUMN source_sale_id uuid;
ALTER TABLE public.fiscal_documents ADD COLUMN preparation_fingerprint text CHECK(preparation_fingerprint IS NULL OR preparation_fingerprint ~ '^[a-f0-9]{64}$');
ALTER TABLE public.fiscal_documents DROP CONSTRAINT fiscal_documents_state_check;
ALTER TABLE public.fiscal_documents ADD CONSTRAINT fiscal_documents_state_check CHECK(state IN('draft','queued','processing','uncertain','authorized','rejected','denied','cancelled','voided'));
DROP INDEX public.fiscal_documents_one_active_source;
CREATE UNIQUE INDEX fiscal_documents_one_active_source ON public.fiscal_documents(restaurant_id,environment,source_kind,source_reference) WHERE state NOT IN('rejected','denied','cancelled','voided');
ALTER TABLE public.fiscal_documents ADD COLUMN profiles_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(profiles_snapshot)='array');
ALTER TABLE public.fiscal_documents ADD CONSTRAINT fiscal_document_sale_fk FOREIGN KEY(restaurant_id,source_sale_id) REFERENCES public.fiscal_sales(restaurant_id,id);
CREATE FUNCTION public.fiscal_document_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.state='voided' AND NEW.state<>'voided' THEN RAISE EXCEPTION 'Preparo descartado não pode ser reaberto'; END IF;
 IF NEW.configuration_revision IS DISTINCT FROM OLD.configuration_revision OR NEW.preparation_fingerprint IS DISTINCT FROM OLD.preparation_fingerprint OR NEW.source_sale_id IS DISTINCT FROM OLD.source_sale_id OR NEW.profiles_snapshot IS DISTINCT FROM OLD.profiles_snapshot THEN RAISE EXCEPTION 'Origem e tributos da nota são imutáveis'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_document_source_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER fiscal_document_source_guard BEFORE UPDATE ON public.fiscal_documents FOR EACH ROW EXECUTE FUNCTION public.fiscal_document_source_guard();

CREATE FUNCTION public.fiscal_set_enabled(p_restaurant uuid,p_actor uuid,p_environment text,p_enabled boolean,p_review text,p_homologation_document uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_cfg public.restaurant_fiscal_settings%ROWTYPE; v_hom public.restaurant_fiscal_settings%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR NOT has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Somente o responsável pode habilitar emissão'; END IF;
 SELECT * INTO v_cfg FROM restaurant_fiscal_settings WHERE restaurant_id=p_restaurant AND environment=p_environment FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configure o emitente primeiro'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Escolha a ação fiscal'; END IF;
 IF p_enabled THEN
  IF p_review IS NULL OR length(trim(p_review)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Informe a referência da revisão fiscal'; END IF;
  IF regexp_replace(upper((SELECT cnpj FROM restaurants WHERE id=p_restaurant)),'[^A-Z0-9]','','g') IS DISTINCT FROM v_cfg.cnpj THEN RAISE EXCEPTION 'CNPJ do emitente divergente'; END IF;
  IF NOT (v_cfg.address ?& ARRAY['street','number','district','city','postalCode']) THEN RAISE EXCEPTION 'Complete o endereço fiscal'; END IF;
  IF p_environment='producao' THEN
   SELECT * INTO v_hom FROM restaurant_fiscal_settings WHERE restaurant_id=p_restaurant AND environment='homologacao' FOR SHARE;
   IF NOT FOUND OR ROW(v_hom.cnpj,v_hom.uf,v_hom.tax_regime,v_hom.state_registration,v_hom.municipality_code,v_hom.time_zone,v_hom.address,v_hom.service_fee_policy,v_hom.acquirer_cnpj)
     IS DISTINCT FROM ROW(v_cfg.cnpj,v_cfg.uf,v_cfg.tax_regime,v_cfg.state_registration,v_cfg.municipality_code,v_cfg.time_zone,v_cfg.address,v_cfg.service_fee_policy,v_cfg.acquirer_cnpj) THEN RAISE EXCEPTION 'Homologue a mesma configuração do emitente antes de habilitar produção'; END IF;
   IF NOT EXISTS(SELECT 1 FROM fiscal_documents WHERE id=p_homologation_document AND restaurant_id=p_restaurant AND environment='homologacao' AND model='nfce' AND state='authorized' AND issuer_cnpj=v_cfg.cnpj AND configuration_revision=v_hom.configuration_revision AND source_sale_id IS NOT NULL AND access_key IS NOT NULL) THEN RAISE EXCEPTION 'Selecione a NFC-e de homologação autorizada para esta configuração'; END IF;
  END IF;
 END IF;
 UPDATE restaurant_fiscal_settings SET enabled=p_enabled,verified_at=CASE WHEN p_enabled THEN now() ELSE verified_at END,verified_by=CASE WHEN p_enabled THEN p_actor ELSE verified_by END,updated_by=p_actor,updated_at=now() WHERE restaurant_id=p_restaurant AND environment=p_environment;
 INSERT INTO fiscal_events(restaurant_id,event_type,actor_id,detail) VALUES(p_restaurant,'emission_permission_changed',p_actor,jsonb_build_object('environment',p_environment,'enabled',p_enabled,'review',CASE WHEN p_enabled THEN trim(p_review) ELSE NULL END,'homologation_document',p_homologation_document));
 RETURN p_enabled;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_set_enabled(uuid,uuid,text,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_set_enabled(uuid,uuid,text,boolean,text,uuid) TO service_role;

CREATE FUNCTION public.fiscal_enqueue_sale(p_restaurant uuid,p_actor uuid,p_sale uuid,p_environment text,p_request uuid,p_configuration_version timestamptz,p_tax_date date,p_payload jsonb,p_amount bigint,p_payments jsonb,p_profile_ids uuid[],p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_cfg public.restaurant_fiscal_settings%ROWTYPE; v_sale public.fiscal_sales%ROWTYPE; v_doc public.fiscal_documents%ROWTYPE;
 v_id uuid:=gen_random_uuid(); v_slug text; v_profiles jsonb; v_count integer;
BEGIN
 IF p_actor IS NULL OR NOT has_restaurant_role(p_actor,p_restaurant,ARRAY['owner','manager','cashier']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para emitir neste restaurante'; END IF;
 IF p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Conferência fiscal inválida'; END IF;
 IF p_request IS NULL OR p_environment NOT IN('homologacao','producao') THEN RAISE EXCEPTION 'Solicitação fiscal inválida'; END IF;
 SELECT * INTO v_sale FROM fiscal_sales WHERE id=p_sale AND restaurant_id=p_restaurant FOR UPDATE;
 IF NOT FOUND OR v_sale.source_kind<>'table_bill' THEN RAISE EXCEPTION 'Venda fiscal não encontrada ou operação não suportada'; END IF;
 SELECT d.* INTO v_doc FROM fiscal_outbox o JOIN fiscal_documents d ON d.id=o.document_id AND d.restaurant_id=o.restaurant_id WHERE o.restaurant_id=p_restaurant AND o.request_id=p_request;
 IF FOUND THEN
  IF v_doc.source_sale_id IS DISTINCT FROM p_sale OR v_doc.environment<>p_environment THEN RAISE EXCEPTION 'Identificador já usado por outra venda'; END IF;
  RETURN jsonb_build_object('id',v_doc.id,'state',v_doc.state,'existing',true);
 END IF;
 SELECT * INTO v_doc FROM fiscal_documents WHERE restaurant_id=p_restaurant AND environment=p_environment AND source_kind=v_sale.source_kind AND source_reference=v_sale.source_reference AND state NOT IN('rejected','denied','cancelled','voided');
 IF FOUND THEN RETURN jsonb_build_object('id',v_doc.id,'state',v_doc.state,'existing',true); END IF;
 SELECT * INTO v_cfg FROM restaurant_fiscal_settings WHERE restaurant_id=p_restaurant AND environment=p_environment FOR SHARE;
 IF NOT FOUND OR NOT v_cfg.enabled THEN RAISE EXCEPTION 'Emissão desabilitada neste ambiente'; END IF;
 IF v_cfg.updated_at IS DISTINCT FROM p_configuration_version OR p_tax_date IS DISTINCT FROM (now() AT TIME ZONE v_cfg.time_zone)::date THEN RAISE EXCEPTION 'Configuração ou dia fiscal mudou. Confira novamente'; END IF;
 SELECT slug INTO v_slug FROM restaurants WHERE id=p_restaurant AND regexp_replace(upper(cnpj),'[^A-Z0-9]','','g')=v_cfg.cnpj;
 IF NOT FOUND THEN RAISE EXCEPTION 'Emitente divergente'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_sale.items_snapshot) i WHERE (i->>'quantity')::numeric<=0 OR (i->>'paid')::numeric<(i->>'quantity')::numeric OR (i->>'reserved')::numeric>0.0001) THEN RAISE EXCEPTION 'Venda não está integralmente paga'; END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR p_payload->>'cnpj_emitente' IS DISTINCT FROM v_cfg.cnpj OR jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'items')<>jsonb_array_length(v_sale.items_snapshot) THEN RAISE EXCEPTION 'Payload não corresponde à venda'; END IF;
 IF jsonb_typeof(p_payments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_payments)<>jsonb_array_length(v_sale.payments_snapshot) THEN RAISE EXCEPTION 'Pagamentos não correspondem à venda'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_sale.items_snapshot) s WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'items') i WHERE i->>'codigo_produto'=s->>'code' AND i->>'descricao'=s->>'name' AND (i->>'quantidade_comercial')::numeric=(s->>'quantity')::numeric AND (i->>'valor_unitario_comercial')::numeric=(s->>'price')::numeric)) THEN RAISE EXCEPTION 'Produtos ou valores foram alterados'; END IF;
 -- Mesma fonte financeira arquivada. Bloqueia mudanças locais durante a validação.
 PERFORM 1 FROM archived_payments WHERE restaurant_slug=v_slug AND payment_target='restaurant' AND id IN(SELECT (s->>'id')::uuid FROM jsonb_array_elements(v_sale.payments_snapshot) s) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO v_count FROM jsonb_array_elements(p_payments) p JOIN archived_payments a ON a.id=(p->>'id')::uuid AND a.restaurant_slug=v_slug AND a.payment_target='restaurant'
 WHERE a.status=p->>'status' AND a.amount=(p->>'amount')::numeric AND a.service_fee_amount=(p->>'service_fee')::numeric AND a.payment_method=p->>'method' AND a.establishment_method IS NOT DISTINCT FROM p->>'establishment_method' AND a.provider IS NOT DISTINCT FROM p->>'provider' AND a.provider_order_id IS NOT DISTINCT FROM p->>'provider_order_id';
 IF v_count<>jsonb_array_length(v_sale.payments_snapshot) OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_payments) p WHERE p->>'status' NOT IN('approved','failed','cancelled')) OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_sale.payments_snapshot) s WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payments) p WHERE p->>'id'=s->>'id')) THEN RAISE EXCEPTION 'Os pagamentos mudaram. Faça a conciliação antes de emitir'; END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount<>(SELECT sum(round((p->>'amount')::numeric*100)) FROM jsonb_array_elements(p_payments) p WHERE p->>'status'='approved') THEN RAISE EXCEPTION 'Total fiscal difere dos pagamentos'; END IF;
 IF p_amount<>(SELECT sum(round((i->>'price')::numeric*(i->>'quantity')::numeric*100)) FROM jsonb_array_elements(v_sale.items_snapshot) i)+(SELECT coalesce(sum(round((p->>'service_fee')::numeric*100)),0) FROM jsonb_array_elements(p_payments) p WHERE p->>'status'='approved') THEN RAISE EXCEPTION 'Total fiscal difere dos produtos e da taxa de serviço'; END IF;
 IF v_cfg.service_fee_policy='blocked' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p_payments) p WHERE p->>'status'='approved' AND (p->>'service_fee')::numeric>0) THEN RAISE EXCEPTION 'Revise o tratamento fiscal da taxa de serviço'; END IF;
 PERFORM 1 FROM fiscal_product_profiles WHERE id=ANY(p_profile_ids) ORDER BY id FOR SHARE;
 SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id),count(*) INTO v_profiles,v_count FROM fiscal_product_profiles p JOIN pdv_menu_items m ON m.id=p.menu_item_id AND m.restaurant_id=p_restaurant
 WHERE p.id=ANY(p_profile_ids) AND p.restaurant_id=p_restaurant AND p.environment=p_environment AND p.uf=v_cfg.uf AND p.tax_regime=v_cfg.tax_regime AND p.valid_from<=p_tax_date AND (p.valid_until IS NULL OR p.valid_until>=p_tax_date) AND EXISTS(SELECT 1 FROM jsonb_array_elements(v_sale.items_snapshot) i WHERE i->>'code'=m.code);
 IF v_count<>jsonb_array_length(v_sale.items_snapshot) OR v_count<>coalesce(cardinality(p_profile_ids),0) THEN RAISE EXCEPTION 'Revise a vigência dos tributos de cada produto'; END IF;
 INSERT INTO fiscal_documents(id,restaurant_id,environment,provider,model,source_kind,source_reference,source_sale_id,provider_reference,state,issuer_cnpj,amount_cents,tax_date,time_zone,configuration_version,configuration_revision,payload_snapshot,payments_snapshot,profiles_snapshot,preparation_fingerprint,created_by)
 VALUES(v_id,p_restaurant,p_environment,'focus','nfce',v_sale.source_kind,v_sale.source_reference,p_sale,'tipe_'||replace(v_id::text,'-',''),'queued',v_cfg.cnpj,p_amount,p_tax_date,v_cfg.time_zone,v_cfg.updated_at,v_cfg.configuration_revision,p_payload,p_payments,v_profiles,p_fingerprint,p_actor);
 INSERT INTO fiscal_outbox(restaurant_id,document_id,operation,request_id) VALUES(p_restaurant,v_id,'issue',p_request);
 INSERT INTO fiscal_events(restaurant_id,document_id,event_type,actor_id,detail) VALUES(p_restaurant,v_id,'sale_issuance_requested',p_actor,jsonb_build_object('sale_id',p_sale,'environment',p_environment));
 RETURN jsonb_build_object('id',v_id,'state','queued','existing',false);
END $$;
REVOKE ALL ON FUNCTION public.fiscal_enqueue_sale(uuid,uuid,uuid,text,uuid,timestamptz,date,jsonb,bigint,jsonb,uuid[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_enqueue_sale(uuid,uuid,uuid,text,uuid,timestamptz,date,jsonb,bigint,jsonb,uuid[],text) TO service_role;
NOTIFY pgrst,'reload schema';

-- Reconfere tributos e pagamentos imediatamente antes da marca durável.
CREATE OR REPLACE FUNCTION public.fiscal_outbox_begin_send(p_job uuid,p_lease uuid,p_payload jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_job public.fiscal_outbox%ROWTYPE; v_doc public.fiscal_documents%ROWTYPE; v_cfg public.restaurant_fiscal_settings%ROWTYPE;
BEGIN
 SELECT * INTO v_job FROM public.fiscal_outbox WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR v_job.state<>'processing' OR v_job.lease_token IS DISTINCT FROM p_lease OR v_job.lease_until IS NULL OR v_job.lease_until<=now() OR v_job.send_started_at IS NOT NULL THEN RETURN false; END IF;
 SELECT * INTO v_doc FROM public.fiscal_documents WHERE id=v_job.document_id AND restaurant_id=v_job.restaurant_id FOR UPDATE;
 SELECT * INTO v_cfg FROM public.restaurant_fiscal_settings WHERE restaurant_id=v_job.restaurant_id AND environment=v_doc.environment FOR SHARE;
 IF NOT FOUND OR v_cfg.cnpj<>v_doc.issuer_cnpj THEN RETURN false; END IF;
 IF jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Payload fiscal inválido'; END IF;
 IF v_job.operation='issue' THEN
  IF v_doc.state IN('authorized','cancelled','denied','rejected') OR NOT v_cfg.enabled OR v_cfg.updated_at<>v_doc.configuration_version OR v_cfg.time_zone<>v_doc.time_zone THEN RETURN false; END IF;
  IF p_payload->>'cnpj_emitente' IS DISTINCT FROM v_doc.issuer_cnpj OR (p_payload-'data_emissao') IS DISTINCT FROM (v_doc.payload_snapshot-'data_emissao') OR p_payload->>'data_emissao' IS NULL OR abs(extract(epoch FROM now()-(p_payload->>'data_emissao')::timestamptz))>60 OR ((p_payload->>'data_emissao')::timestamptz AT TIME ZONE v_doc.time_zone)::date<>v_doc.tax_date THEN RAISE EXCEPTION 'Payload fiscal mudou ou data não corresponde à vigência'; END IF;
  IF v_doc.source_sale_id IS NOT NULL THEN
   IF (SELECT count(*) FROM fiscal_product_profiles p JOIN jsonb_array_elements(v_doc.profiles_snapshot) s ON p.id=(s->>'id')::uuid WHERE p.restaurant_id=v_doc.restaurant_id AND p.environment=v_doc.environment AND p.uf=v_cfg.uf AND p.tax_regime=v_cfg.tax_regime AND p.valid_from<=v_doc.tax_date AND (p.valid_until IS NULL OR p.valid_until>=v_doc.tax_date))<>jsonb_array_length(v_doc.profiles_snapshot) THEN RETURN false; END IF;
   PERFORM 1 FROM archived_payments WHERE restaurant_slug=(SELECT slug FROM restaurants WHERE id=v_doc.restaurant_id) AND payment_target='restaurant' AND id IN(SELECT (p->>'id')::uuid FROM jsonb_array_elements(v_doc.payments_snapshot) p) ORDER BY id FOR UPDATE;
   IF (SELECT count(*) FROM jsonb_array_elements(v_doc.payments_snapshot) p JOIN archived_payments a ON a.id=(p->>'id')::uuid AND a.restaurant_slug=(SELECT slug FROM restaurants WHERE id=v_doc.restaurant_id) AND a.payment_target='restaurant' WHERE a.status=p->>'status' AND a.amount=(p->>'amount')::numeric AND a.service_fee_amount=(p->>'service_fee')::numeric AND a.payment_method=p->>'method' AND a.provider IS NOT DISTINCT FROM p->>'provider' AND a.provider_order_id IS NOT DISTINCT FROM p->>'provider_order_id')<>jsonb_array_length(v_doc.payments_snapshot) THEN RETURN false; END IF;
  END IF;
 ELSIF v_job.operation='cancel' THEN
  IF v_doc.state<>'authorized' THEN RETURN false; END IF;
  IF p_payload IS DISTINCT FROM jsonb_build_object('justificativa',trim(v_job.reason)) THEN RAISE EXCEPTION 'Justificativa de cancelamento não corresponde ao pedido'; END IF;
 ELSE RETURN false;
 END IF;
 UPDATE public.fiscal_outbox SET send_started_at=now(),sent_payload=p_payload,updated_at=now() WHERE id=p_job;
 INSERT INTO public.fiscal_events(restaurant_id,document_id,event_type,detail)
 VALUES(v_job.restaurant_id,v_job.document_id,'provider_send_started',jsonb_build_object('operation',v_job.operation,'job_id',v_job.id));
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.fiscal_outbox_finish(p_job uuid,p_lease uuid,p_result jsonb,p_error text DEFAULT NULL,p_fatal boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_job public.fiscal_outbox%ROWTYPE; v_doc public.fiscal_documents%ROWTYPE; v_state text; v_done boolean; v_error text;
BEGIN
 SELECT * INTO v_job FROM public.fiscal_outbox WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR v_job.state<>'processing' OR v_job.lease_token IS DISTINCT FROM p_lease OR v_job.lease_until IS NULL OR v_job.lease_until<=now() THEN RETURN false; END IF;
 SELECT * INTO v_doc FROM public.fiscal_documents WHERE id=v_job.document_id AND restaurant_id=v_job.restaurant_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento fiscal não encontrado'; END IF;
 v_error := CASE WHEN p_error ~ '^[a-z_]{1,60}$' THEN p_error ELSE NULL END;
 v_state := coalesce(p_result->>'state','uncertain');
 IF v_state NOT IN('authorized','processing','rejected','denied','cancelled','uncertain') THEN RAISE EXCEPTION 'Estado fiscal inválido'; END IF;
 IF v_doc.state='voided' THEN v_state:='voided';
 ELSIF v_doc.state='cancelled' THEN v_state:='cancelled';
 ELSIF v_doc.state='denied' THEN v_state:='denied';
 ELSIF v_doc.state='authorized' AND v_state<>'cancelled' THEN v_state:='authorized'; END IF;
 v_done := v_state IN('authorized','rejected','denied','cancelled','voided');
 IF v_job.operation='cancel' AND v_state='authorized' THEN v_done:=false; END IF;
 UPDATE public.fiscal_documents SET state=v_state,
  access_key=CASE WHEN v_state IN('authorized','cancelled','denied') THEN coalesce(access_key,nullif(p_result->>'key','')) ELSE access_key END,
  sefaz_code=CASE WHEN p_result->>'sefazCode' ~ '^[0-9]{3}$' THEN p_result->>'sefazCode' ELSE sefaz_code END,
  authorized_at=CASE WHEN v_state IN('authorized','cancelled') THEN coalesce(authorized_at,now()) ELSE authorized_at END,
  cancelled_at=CASE WHEN v_state='cancelled' THEN coalesce(cancelled_at,now()) ELSE cancelled_at END,
  artifacts=CASE WHEN v_state IN('authorized','cancelled','denied') AND jsonb_typeof(p_result->'artifacts')='object' THEN artifacts || jsonb_strip_nulls(p_result->'artifacts') ELSE artifacts END,
  sefaz_protocol=CASE WHEN p_result->>'protocol' ~ '^[0-9]{1,30}$' THEN p_result->>'protocol' ELSE sefaz_protocol END,
  sefaz_authorized_at=coalesce(sefaz_authorized_at,nullif(p_result->>'authorizedAt','')::timestamptz),
  last_consulted_at=now(),updated_at=now()
 WHERE id=v_doc.id;
 UPDATE public.fiscal_outbox SET state=CASE WHEN p_fatal OR (NOT v_done AND attempts>=12) THEN 'failed' WHEN v_done THEN 'done' ELSE 'pending' END,
  next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)),
  lease_token=NULL,lease_until=NULL,last_error_code=v_error,updated_at=now() WHERE id=p_job;
 INSERT INTO public.fiscal_events(restaurant_id,document_id,event_type,detail)
 VALUES(v_job.restaurant_id,v_job.document_id,'provider_result',jsonb_build_object('operation',v_job.operation,'job_id',v_job.id,'state',v_state,'error',v_error,'fatal',p_fatal));
 RETURN true;
END $$;

CREATE FUNCTION public.fiscal_discard_unsent(p_restaurant uuid,p_actor uuid,p_document uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_doc public.fiscal_documents%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR NOT has_restaurant_role(p_actor,p_restaurant,ARRAY['owner','manager','cashier']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para descartar o preparo'; END IF;
 -- Mesma ordem de locks do trabalhador: fila, depois documento.
 PERFORM 1 FROM fiscal_outbox WHERE restaurant_id=p_restaurant AND document_id=p_document ORDER BY id FOR UPDATE;
 SELECT * INTO v_doc FROM fiscal_documents WHERE id=p_document AND restaurant_id=p_restaurant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
 IF v_doc.state='voided' THEN RETURN true; END IF;
 IF v_doc.state NOT IN('draft','queued','uncertain') OR EXISTS(SELECT 1 FROM fiscal_outbox WHERE document_id=p_document AND send_started_at IS NOT NULL) THEN RAISE EXCEPTION 'O envio já começou. Consulte o emissor; não descarte nem repita a nota'; END IF;
 UPDATE fiscal_outbox SET state='failed',lease_token=NULL,lease_until=NULL,last_error_code='discarded_before_send',updated_at=now() WHERE document_id=p_document AND restaurant_id=p_restaurant AND state IN('pending','processing','failed');
 UPDATE fiscal_documents SET state='voided' WHERE id=p_document;
 INSERT INTO fiscal_events(restaurant_id,document_id,event_type,actor_id) VALUES(p_restaurant,p_document,'discarded_before_send',p_actor);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_discard_unsent(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_discard_unsent(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fiscal_request_document_action(p_restaurant uuid,p_actor uuid,p_document uuid,p_request uuid,p_operation text,p_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_doc public.fiscal_documents%ROWTYPE; v_job public.fiscal_outbox%ROWTYPE; v_id uuid;
BEGIN
 IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner','manager','cashier']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para operar documentos fiscais'; END IF;
 IF p_operation NOT IN('consult','cancel') OR p_operation IS NULL OR p_request IS NULL THEN RAISE EXCEPTION 'Operação fiscal inválida'; END IF;
 IF p_operation='cancel' AND NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Somente o responsável pode cancelar a nota'; END IF;
 SELECT * INTO v_doc FROM public.fiscal_documents WHERE id=p_document AND restaurant_id=p_restaurant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento fiscal não encontrado'; END IF;
 IF v_doc.state='voided' THEN RAISE EXCEPTION 'Preparo descartado antes do envio; não há documento para consultar'; END IF;
 SELECT * INTO v_job FROM public.fiscal_outbox WHERE restaurant_id=p_restaurant AND request_id=p_request;
 IF FOUND THEN
  IF v_job.document_id<>p_document OR v_job.operation<>p_operation OR v_job.reason IS DISTINCT FROM (CASE WHEN p_operation='cancel' THEN trim(p_reason) ELSE NULL END) THEN RAISE EXCEPTION 'Solicitação fiscal já usada em outra operação'; END IF;
  RETURN v_job.id;
 END IF;
 IF p_operation='cancel' THEN
  IF NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Somente o responsável pode cancelar a nota'; END IF;
  IF v_doc.state<>'authorized' THEN RAISE EXCEPTION 'Somente nota autorizada pode ser cancelada'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 15 AND 255 THEN RAISE EXCEPTION 'Informe a justificativa de cancelamento'; END IF;
 END IF;
 SELECT id INTO v_id FROM public.fiscal_outbox WHERE document_id=p_document AND operation=p_operation AND state IN('pending','processing');
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 INSERT INTO public.fiscal_outbox(restaurant_id,document_id,operation,request_id,reason)
 VALUES(p_restaurant,p_document,p_operation,p_request,CASE WHEN p_operation='cancel' THEN trim(p_reason) ELSE NULL END) RETURNING id INTO v_id;
 INSERT INTO public.fiscal_events(restaurant_id,document_id,event_type,actor_id,detail)
 VALUES(p_restaurant,p_document,'document_action_requested',p_actor,jsonb_build_object('operation',p_operation,'job_id',v_id));
 RETURN v_id;
END $$;
