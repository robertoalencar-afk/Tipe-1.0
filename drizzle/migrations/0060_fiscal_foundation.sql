-- Fundação fiscal: sem emissão automática e sem alteração dos pagamentos existentes.
-- Escrita/leitura apenas no servidor, após conferir papel explícito do restaurante.
CREATE TABLE public.restaurant_fiscal_settings (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('homologacao','producao')),
  provider text NOT NULL CHECK (provider IN ('focus')),
  cnpj text NOT NULL CHECK (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  legal_name text NOT NULL CHECK (length(legal_name) BETWEEN 2 AND 160),
  state_registration text NOT NULL CHECK (length(state_registration) BETWEEN 1 AND 24),
  uf text NOT NULL CHECK (uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK(time_zone IN('America/Araguaina','America/Bahia','America/Belem','America/Boa_Vista','America/Campo_Grande','America/Cuiaba','America/Eirunepe','America/Fortaleza','America/Maceio','America/Manaus','America/Noronha','America/Porto_Velho','America/Recife','America/Rio_Branco','America/Santarem','America/Sao_Paulo')),
  acquirer_cnpj text CHECK(acquirer_cnpj IS NULL OR acquirer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  service_fee_policy text NOT NULL DEFAULT 'blocked' CHECK(service_fee_policy IN('blocked','allocate_expenses')),
  service_fee_review text CHECK(service_fee_review IS NULL OR length(service_fee_review) BETWEEN 3 AND 200),
  CHECK(service_fee_policy='blocked' OR service_fee_review IS NOT NULL),
  municipality_code text NOT NULL CHECK (municipality_code ~ '^[0-9]{7}$'),
  tax_regime text NOT NULL CHECK (tax_regime IN ('1','2','3','4')),
  address jsonb NOT NULL CHECK (jsonb_typeof(address) = 'object'),
  credentials_encrypted text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, environment),
  CHECK (NOT enabled OR verified_at IS NOT NULL)
);

CREATE TABLE public.fiscal_product_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  menu_item_id uuid NOT NULL REFERENCES public.pdv_menu_items(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('homologacao','producao')),
  uf text NOT NULL CHECK (uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  tax_regime text NOT NULL CHECK (tax_regime IN ('1','2','3','4')),
  provider text NOT NULL DEFAULT 'focus' CHECK (provider IN ('focus')),
  valid_from date NOT NULL,
  valid_until date CHECK (valid_until IS NULL OR valid_until >= valid_from),
  ncm text NOT NULL CHECK (ncm ~ '^[0-9]{8}$'),
  cfop text NOT NULL CHECK (cfop ~ '^[123567][0-9]{3}$'),
  unit text NOT NULL CHECK (length(unit) BETWEEN 1 AND 6),
  layout_version text NOT NULL CHECK (length(layout_version) BETWEEN 1 AND 40),
  tables_version text NOT NULL CHECK (length(tables_version) BETWEEN 1 AND 80),
  review_reference text NOT NULL CHECK (length(review_reference) BETWEEN 3 AND 200),
  attributes jsonb NOT NULL CHECK (jsonb_typeof(attributes) = 'object' AND octet_length(attributes::text) <= 40000),
  calculation_rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(calculation_rules)='array' AND jsonb_array_length(calculation_rules)<=30 AND octet_length(calculation_rules::text)<=40000),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, environment, menu_item_id, valid_from),
  UNIQUE (restaurant_id, id)
);
CREATE INDEX fiscal_product_profiles_lookup ON public.fiscal_product_profiles (restaurant_id, environment, menu_item_id, valid_from, valid_until);

CREATE FUNCTION public.fiscal_profile_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'valid_until') IS DISTINCT FROM (to_jsonb(OLD) - 'valid_until') OR NEW.valid_until IS NULL OR NEW.valid_until < NEW.valid_from OR (OLD.valid_until IS NOT NULL AND NEW.valid_until > OLD.valid_until) THEN
      RAISE EXCEPTION 'Perfis fiscais são versionados; apenas encerrar a vigência é permitido';
    END IF;
  END IF;
  -- O lock no produto serializa inserções concorrentes de vigências do mesmo item.
  PERFORM 1 FROM public.pdv_menu_items WHERE id = NEW.menu_item_id AND restaurant_id = NEW.restaurant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não pertence ao restaurante'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.fiscal_product_profiles p
    WHERE p.environment = NEW.environment AND p.menu_item_id = NEW.menu_item_id AND p.restaurant_id = NEW.restaurant_id AND p.id IS DISTINCT FROM NEW.id
      AND daterange(p.valid_from, p.valid_until, '[]') && daterange(NEW.valid_from, NEW.valid_until, '[]')
  ) THEN RAISE EXCEPTION 'Há um perfil fiscal sobreposto para esta vigência'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_profile_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fiscal_profile_guard BEFORE INSERT OR UPDATE ON public.fiscal_product_profiles
FOR EACH ROW EXECUTE FUNCTION public.fiscal_profile_guard();

CREATE TABLE public.fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('homologacao','producao')),
  provider text NOT NULL CHECK (provider IN ('focus')),
  model text NOT NULL CHECK (model IN ('nfe','nfce')),
  source_kind text NOT NULL CHECK (source_kind IN ('table_bill','counter_order')),
  source_reference text NOT NULL CHECK (length(source_reference) BETWEEN 1 AND 160),
  provider_reference text NOT NULL CHECK (provider_reference ~ '^[A-Za-z0-9_-]{1,100}$'),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','queued','processing','uncertain','authorized','rejected','denied','cancelled')),
  issuer_cnpj text NOT NULL CHECK (issuer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  tax_date date NOT NULL DEFAULT current_date,
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo',
  configuration_version timestamptz NOT NULL DEFAULT now(),
  payload_snapshot jsonb NOT NULL CHECK (jsonb_typeof(payload_snapshot) = 'object'),
  payments_snapshot jsonb NOT NULL CHECK (jsonb_typeof(payments_snapshot) = 'array'),
  access_key text CHECK (access_key IS NULL OR (access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$' AND substring(access_key from 7 for 14)=issuer_cnpj)),
  sefaz_code text,
  authorized_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_documents_source_uq UNIQUE (restaurant_id, environment, source_kind, source_reference),
  UNIQUE (provider, environment, provider_reference),
  UNIQUE (restaurant_id, id),
  CHECK (state NOT IN ('authorized','cancelled') OR (access_key IS NOT NULL AND authorized_at IS NOT NULL)),
  CHECK (state <> 'cancelled' OR cancelled_at IS NOT NULL)
);
CREATE INDEX fiscal_documents_restaurant_time ON public.fiscal_documents (restaurant_id, created_at DESC);

CREATE FUNCTION public.fiscal_document_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO public, pg_temp AS $$
BEGIN
  IF ROW(NEW.restaurant_id,NEW.environment,NEW.provider,NEW.model,NEW.source_kind,NEW.source_reference,
    NEW.provider_reference,NEW.issuer_cnpj,NEW.amount_cents,NEW.tax_date,NEW.time_zone,NEW.configuration_version,NEW.payload_snapshot,NEW.payments_snapshot)
    IS DISTINCT FROM ROW(OLD.restaurant_id,OLD.environment,OLD.provider,OLD.model,OLD.source_kind,OLD.source_reference,
    OLD.provider_reference,OLD.issuer_cnpj,OLD.amount_cents,OLD.tax_date,OLD.time_zone,OLD.configuration_version,OLD.payload_snapshot,OLD.payments_snapshot)
  THEN RAISE EXCEPTION 'A operação fiscal e seus valores são imutáveis'; END IF;
  IF OLD.state = 'denied' AND NEW.state <> 'denied' THEN RAISE EXCEPTION 'Denegação fiscal não pode ser alterada localmente'; END IF;
  IF OLD.state = 'cancelled' AND NEW.state <> 'cancelled' THEN RAISE EXCEPTION 'Documento cancelado não pode ser reaberto'; END IF;
  IF OLD.state = 'authorized' AND NEW.state NOT IN ('authorized','cancelled') THEN RAISE EXCEPTION 'Autorização fiscal não pode ser desfeita localmente'; END IF;
  IF OLD.access_key IS NOT NULL AND NEW.access_key IS DISTINCT FROM OLD.access_key THEN RAISE EXCEPTION 'Chave fiscal autorizada é imutável'; END IF;
  IF OLD.authorized_at IS NOT NULL AND NEW.authorized_at IS DISTINCT FROM OLD.authorized_at THEN RAISE EXCEPTION 'Data de autorização é imutável'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_document_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fiscal_document_guard BEFORE UPDATE ON public.fiscal_documents
FOR EACH ROW EXECUTE FUNCTION public.fiscal_document_guard();

CREATE TABLE public.fiscal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  document_id uuid,
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 80),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (restaurant_id, document_id) REFERENCES public.fiscal_documents(restaurant_id, id) ON DELETE RESTRICT
);
CREATE INDEX fiscal_events_document_time ON public.fiscal_events (restaurant_id, document_id, created_at);

CREATE TABLE public.fiscal_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  document_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('issue','consult','cancel')),
  request_id uuid NOT NULL,
  reason text CHECK (reason IS NULL OR length(reason) BETWEEN 15 AND 255),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','done','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (restaurant_id, document_id) REFERENCES public.fiscal_documents(restaurant_id, id) ON DELETE RESTRICT,
  UNIQUE (restaurant_id, request_id),
  CHECK (operation <> 'cancel' OR reason IS NOT NULL)
);
CREATE UNIQUE INDEX fiscal_outbox_issue_once ON public.fiscal_outbox(document_id) WHERE operation = 'issue';
CREATE INDEX fiscal_outbox_due ON public.fiscal_outbox(next_attempt_at) WHERE state IN ('pending','processing');

CREATE FUNCTION public.fiscal_outbox_claim(p_limit integer DEFAULT 20)
RETURNS SETOF public.fiscal_outbox
LANGUAGE sql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
  UPDATE public.fiscal_outbox o SET state = 'processing', lease_until = now() + interval '2 minutes',
    lease_token = gen_random_uuid(), attempts = attempts + 1, updated_at = now()
  WHERE o.id IN (
    SELECT id FROM public.fiscal_outbox
    WHERE (state = 'pending' AND next_attempt_at <= now()) OR (state = 'processing' AND lease_until < now())
    ORDER BY next_attempt_at LIMIT greatest(1, least(coalesce(p_limit,20),100)) FOR UPDATE SKIP LOCKED
  ) RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.fiscal_outbox_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_outbox_claim(integer) TO service_role;

ALTER TABLE public.restaurant_fiscal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_product_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_fiscal_settings, public.fiscal_product_profiles, public.fiscal_documents, public.fiscal_events, public.fiscal_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.restaurant_fiscal_settings, public.fiscal_documents, public.fiscal_outbox TO service_role;
GRANT SELECT,INSERT ON public.fiscal_product_profiles, public.fiscal_events TO service_role;

-- Salvamento atômico + auditoria. Só o servidor passa o ator autenticado e o segredo criptografado.
CREATE FUNCTION public.fiscal_save_settings(p_restaurant uuid, p_actor uuid, p_data jsonb, p_credentials text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE v_cnpj text;
BEGIN
  IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para configurar o fiscal'; END IF;
  SELECT regexp_replace(upper(cnpj),'[./[:space:]-]','','g') INTO v_cnpj FROM public.restaurants WHERE id = p_restaurant FOR UPDATE;
  IF v_cnpj IS NULL OR v_cnpj IS DISTINCT FROM p_data->>'cnpj' THEN RAISE EXCEPTION 'CNPJ fiscal deve corresponder ao cadastro do restaurante'; END IF;
  IF p_credentials IS NULL OR length(p_credentials) < 20 THEN RAISE EXCEPTION 'Credencial fiscal não configurada'; END IF;
  INSERT INTO public.restaurant_fiscal_settings(restaurant_id,environment,provider,cnpj,legal_name,state_registration,uf,time_zone,acquirer_cnpj,service_fee_policy,service_fee_review,municipality_code,tax_regime,address,credentials_encrypted,created_by,updated_by)
  VALUES(p_restaurant,p_data->>'environment',p_data->>'provider',v_cnpj,p_data->>'legal_name',p_data->>'state_registration',p_data->>'uf',coalesce(p_data->>'time_zone','America/Sao_Paulo'),p_data->>'acquirer_cnpj',coalesce(p_data->>'service_fee_policy','blocked'),p_data->>'service_fee_review',p_data->>'municipality_code',p_data->>'tax_regime',p_data->'address',p_credentials,p_actor,p_actor)
  ON CONFLICT(restaurant_id,environment) DO UPDATE SET provider=excluded.provider,cnpj=excluded.cnpj,
    legal_name=excluded.legal_name,state_registration=excluded.state_registration,uf=excluded.uf,time_zone=excluded.time_zone,acquirer_cnpj=excluded.acquirer_cnpj,service_fee_policy=excluded.service_fee_policy,service_fee_review=excluded.service_fee_review,municipality_code=excluded.municipality_code,
    tax_regime=excluded.tax_regime,address=excluded.address,credentials_encrypted=excluded.credentials_encrypted,
    enabled=false,verified_at=NULL,verified_by=NULL,updated_by=p_actor,updated_at=now();
  INSERT INTO public.fiscal_events(restaurant_id,event_type,actor_id,detail)
  VALUES(p_restaurant,'settings_saved',p_actor,jsonb_build_object('environment',p_data->>'environment','provider',p_data->>'provider'));
END $$;
REVOKE ALL ON FUNCTION public.fiscal_save_settings(uuid,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_save_settings(uuid,uuid,jsonb,text) TO service_role;

CREATE FUNCTION public.fiscal_save_product_profile(p_restaurant uuid,p_actor uuid,p_environment text,p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE v_cfg public.restaurant_fiscal_settings%ROWTYPE; v_id uuid;
BEGIN
  IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para configurar tributos'; END IF;
  SELECT * INTO v_cfg FROM public.restaurant_fiscal_settings WHERE restaurant_id=p_restaurant AND environment=p_environment FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configure a empresa fiscal primeiro'; END IF;
  INSERT INTO public.fiscal_product_profiles(restaurant_id,environment,menu_item_id,uf,tax_regime,provider,valid_from,valid_until,ncm,cfop,unit,layout_version,tables_version,review_reference,attributes,calculation_rules,reviewed_by)
  VALUES(p_restaurant,p_environment,(p_data->>'item_id')::uuid,v_cfg.uf,v_cfg.tax_regime,v_cfg.provider,(p_data->>'valid_from')::date,(p_data->>'valid_until')::date,
    p_data->>'ncm',p_data->>'cfop',p_data->>'unit',p_data->>'layout_version',p_data->>'tables_version',p_data->>'review_reference',p_data->'attributes',coalesce(p_data->'calculation_rules','[]'::jsonb),p_actor)
  RETURNING id INTO v_id;
  INSERT INTO public.fiscal_events(restaurant_id,event_type,actor_id,detail)
  VALUES(p_restaurant,'product_profile_created',p_actor,jsonb_build_object('profile_id',v_id,'item_id',p_data->>'item_id'));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_save_product_profile(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_save_product_profile(uuid,uuid,text,jsonb) TO service_role;

GRANT UPDATE(valid_until) ON public.fiscal_product_profiles TO service_role;
CREATE FUNCTION public.fiscal_close_product_profile(p_restaurant uuid,p_actor uuid,p_environment text,p_profile uuid,p_until date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
BEGIN
  IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para configurar tributos'; END IF;
  UPDATE public.fiscal_product_profiles SET valid_until=p_until WHERE restaurant_id=p_restaurant AND id=p_profile AND environment=p_environment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil fiscal não encontrado'; END IF;
  INSERT INTO public.fiscal_events(restaurant_id,event_type,actor_id,detail)
  VALUES(p_restaurant,'product_profile_closed',p_actor,jsonb_build_object('profile_id',p_profile,'valid_until',p_until));
END $$;
REVOKE ALL ON FUNCTION public.fiscal_close_product_profile(uuid,uuid,text,uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_close_product_profile(uuid,uuid,text,uuid,date) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Marcação anterior ao envio: depois de uma interrupção só se consulta a
-- referência. O lease impede um worker antigo de confirmar ou reenviar.
ALTER TABLE public.fiscal_outbox ADD COLUMN send_started_at timestamptz;
ALTER TABLE public.fiscal_outbox ADD COLUMN sent_payload jsonb;
ALTER TABLE public.fiscal_documents ADD COLUMN artifacts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(artifacts)='object');
ALTER TABLE public.fiscal_documents ADD COLUMN sefaz_protocol text CHECK(sefaz_protocol IS NULL OR sefaz_protocol ~ '^[0-9]{1,30}$');
ALTER TABLE public.fiscal_documents ADD COLUMN sefaz_authorized_at timestamptz;
ALTER TABLE public.fiscal_documents ADD COLUMN last_consulted_at timestamptz;

CREATE FUNCTION public.fiscal_outbox_begin_send(p_job uuid,p_lease uuid,p_payload jsonb)
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
REVOKE ALL ON FUNCTION public.fiscal_outbox_begin_send(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_outbox_begin_send(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.fiscal_outbox_finish(p_job uuid,p_lease uuid,p_result jsonb,p_error text DEFAULT NULL,p_fatal boolean DEFAULT false)
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
 IF v_doc.state='cancelled' THEN v_state:='cancelled';
 ELSIF v_doc.state='denied' THEN v_state:='denied';
 ELSIF v_doc.state='authorized' AND v_state<>'cancelled' THEN v_state:='authorized'; END IF;
 v_done := v_state IN('authorized','rejected','denied','cancelled');
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
REVOKE ALL ON FUNCTION public.fiscal_outbox_finish(uuid,uuid,jsonb,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_outbox_finish(uuid,uuid,jsonb,text,boolean) TO service_role;

-- Consultas e cancelamentos usam a mesma fila, sem repetir requisições ao emissor.
CREATE UNIQUE INDEX fiscal_outbox_control_pending ON public.fiscal_outbox(document_id,operation)
 WHERE operation IN('consult','cancel') AND state IN('pending','processing');
CREATE FUNCTION public.fiscal_request_document_action(p_restaurant uuid,p_actor uuid,p_document uuid,p_request uuid,p_operation text,p_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_doc public.fiscal_documents%ROWTYPE; v_job public.fiscal_outbox%ROWTYPE; v_id uuid;
BEGIN
 IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner','manager','cashier']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para operar documentos fiscais'; END IF;
 IF p_operation NOT IN('consult','cancel') OR p_operation IS NULL OR p_request IS NULL THEN RAISE EXCEPTION 'Operação fiscal inválida'; END IF;
 IF p_operation='cancel' AND NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Somente o responsável pode cancelar a nota'; END IF;
 SELECT * INTO v_doc FROM public.fiscal_documents WHERE id=p_document AND restaurant_id=p_restaurant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento fiscal não encontrado'; END IF;
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
REVOKE ALL ON FUNCTION public.fiscal_request_document_action(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_request_document_action(uuid,uuid,uuid,uuid,text,text) TO service_role;
