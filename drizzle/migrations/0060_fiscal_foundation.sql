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
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, menu_item_id, valid_from),
  UNIQUE (restaurant_id, id)
);
CREATE INDEX fiscal_product_profiles_lookup ON public.fiscal_product_profiles (restaurant_id, menu_item_id, valid_from, valid_until);

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
    WHERE p.menu_item_id = NEW.menu_item_id AND p.restaurant_id = NEW.restaurant_id AND p.id IS DISTINCT FROM NEW.id
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
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','queued','processing','uncertain','authorized','rejected','cancelled')),
  issuer_cnpj text NOT NULL CHECK (issuer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  payload_snapshot jsonb NOT NULL CHECK (jsonb_typeof(payload_snapshot) = 'object'),
  payments_snapshot jsonb NOT NULL CHECK (jsonb_typeof(payments_snapshot) = 'array'),
  access_key text CHECK (access_key IS NULL OR access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'),
  sefaz_code text,
  authorized_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, environment, source_kind, source_reference),
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
    NEW.provider_reference,NEW.issuer_cnpj,NEW.amount_cents,NEW.payload_snapshot,NEW.payments_snapshot)
    IS DISTINCT FROM ROW(OLD.restaurant_id,OLD.environment,OLD.provider,OLD.model,OLD.source_kind,OLD.source_reference,
    OLD.provider_reference,OLD.issuer_cnpj,OLD.amount_cents,OLD.payload_snapshot,OLD.payments_snapshot)
  THEN RAISE EXCEPTION 'A operação fiscal e seus valores são imutáveis'; END IF;
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
  INSERT INTO public.restaurant_fiscal_settings(restaurant_id,environment,provider,cnpj,legal_name,state_registration,uf,municipality_code,tax_regime,address,credentials_encrypted,created_by,updated_by)
  VALUES(p_restaurant,p_data->>'environment',p_data->>'provider',v_cnpj,p_data->>'legal_name',p_data->>'state_registration',p_data->>'uf',p_data->>'municipality_code',p_data->>'tax_regime',p_data->'address',p_credentials,p_actor,p_actor)
  ON CONFLICT(restaurant_id,environment) DO UPDATE SET provider=excluded.provider,cnpj=excluded.cnpj,
    legal_name=excluded.legal_name,state_registration=excluded.state_registration,uf=excluded.uf,municipality_code=excluded.municipality_code,
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
  INSERT INTO public.fiscal_product_profiles(restaurant_id,menu_item_id,uf,tax_regime,provider,valid_from,valid_until,ncm,cfop,unit,layout_version,tables_version,review_reference,attributes,reviewed_by)
  VALUES(p_restaurant,(p_data->>'item_id')::uuid,v_cfg.uf,v_cfg.tax_regime,v_cfg.provider,(p_data->>'valid_from')::date,(p_data->>'valid_until')::date,
    p_data->>'ncm',p_data->>'cfop',p_data->>'unit',p_data->>'layout_version',p_data->>'tables_version',p_data->>'review_reference',p_data->'attributes',p_actor)
  RETURNING id INTO v_id;
  INSERT INTO public.fiscal_events(restaurant_id,event_type,actor_id,detail)
  VALUES(p_restaurant,'product_profile_created',p_actor,jsonb_build_object('profile_id',v_id,'item_id',p_data->>'item_id'));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_save_product_profile(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_save_product_profile(uuid,uuid,text,jsonb) TO service_role;

GRANT UPDATE(valid_until) ON public.fiscal_product_profiles TO service_role;
CREATE FUNCTION public.fiscal_close_product_profile(p_restaurant uuid,p_actor uuid,p_profile uuid,p_until date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
BEGIN
  IF p_actor IS NULL OR NOT public.has_restaurant_role(p_actor,p_restaurant,ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão para configurar tributos'; END IF;
  UPDATE public.fiscal_product_profiles SET valid_until=p_until WHERE restaurant_id=p_restaurant AND id=p_profile;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil fiscal não encontrado'; END IF;
  INSERT INTO public.fiscal_events(restaurant_id,event_type,actor_id,detail)
  VALUES(p_restaurant,'product_profile_closed',p_actor,jsonb_build_object('profile_id',p_profile,'valid_until',p_until));
END $$;
REVOKE ALL ON FUNCTION public.fiscal_close_product_profile(uuid,uuid,uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_close_product_profile(uuid,uuid,uuid,date) TO service_role;
