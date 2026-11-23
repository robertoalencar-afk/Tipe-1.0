-- Prospecção ativa de restaurantes (Central > Comercial > Prospecção).
--
-- Base mapeada a partir de dados abertos (OpenStreetMap/ODbL) e, no futuro, Google Places.
-- Só dados públicos de empresa. Quando o prospect responde e há um contato real, ele
-- vira restaurant_leads (o gatilho crm_on_lead_created abre a oportunidade no funil).
-- Lido pela equipe da Central (founder ou perfil com "comercial") e escrito só pelo
-- servidor (service_role) e pelo coletor (scripts/prospeccao/coletar-osm.ts).
-- Nenhuma mensagem é enviada por aqui: a cadência só prepara rascunhos.

CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('osm', 'google_places', 'manual')),
  source_ref text NOT NULL CHECK (length(source_ref) BETWEEN 1 AND 120),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (category IN ('restaurant', 'bar', 'pub', 'biergarten', 'cafe', 'fast_food', 'ice_cream', 'food_court')),
  cuisine text,
  brand text,
  street text,
  number text,
  neighborhood text,
  city text NOT NULL,
  state text NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
  postcode text,
  lat numeric(9, 6),
  lon numeric(9, 6),
  phone text CHECK (phone IS NULL OR phone ~ '^55[0-9]{10,11}$'),
  whatsapp text CHECK (whatsapp IS NULL OR whatsapp ~ '^55[0-9]{11}$'),
  website text,
  instagram text,
  email text,
  opening_hours text,
  rating numeric(2, 1),
  reviews_count integer,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_reasons text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'respondeu', 'convertido', 'descartado', 'opt_out')),
  cadence_step integer NOT NULL DEFAULT 0 CHECK (cadence_step BETWEEN 0 AND 5),
  next_touch_at timestamptz,
  last_touch_at timestamptz,
  discard_reason text,
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);
CREATE INDEX IF NOT EXISTS crm_prospects_fila_idx ON public.crm_prospects (status, next_touch_at);
CREATE INDEX IF NOT EXISTS crm_prospects_score_idx ON public.crm_prospects (city, score DESC);
CREATE INDEX IF NOT EXISTS crm_prospects_phone_idx ON public.crm_prospects (phone);

-- Histórico de toques da cadência (quem, quando, canal e resultado).
CREATE TABLE IF NOT EXISTS public.crm_prospect_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  step integer NOT NULL CHECK (step BETWEEN 1 AND 5),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'ligacao', 'instagram', 'email', 'visita')),
  outcome text NOT NULL CHECK (outcome IN ('sem_resposta', 'respondeu', 'interessado', 'sem_interesse', 'numero_invalido', 'opt_out')),
  note text CHECK (note IS NULL OR length(note) <= 1000),
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_prospect_touches_prospect_idx ON public.crm_prospect_touches (prospect_id, created_at DESC);

-- Lista de supressão (LGPD): quem pediu para não receber não volta em nenhuma coleta.
CREATE TABLE IF NOT EXISTS public.crm_optout (
  value text PRIMARY KEY CHECK (length(value) BETWEEN 3 AND 200),
  kind text NOT NULL CHECK (kind IN ('phone', 'email', 'instagram', 'source_ref')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registro de cada coleta (fonte, cidade, contagens), para a Central mostrar a última atualização.
CREATE TABLE IF NOT EXISTS public.crm_prospect_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  suppressed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Retenção (LGPD): descartados sem resposta há mais de 12 meses saem da base.
-- Opt-out fica só como chave em crm_optout, sem o restante dos dados.
CREATE OR REPLACE FUNCTION public.crm_prospects_retencao()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE n integer;
BEGIN
  DELETE FROM crm_prospects
   WHERE status IN ('descartado', 'opt_out') AND lead_id IS NULL
     AND coalesce(last_touch_at, updated_at) < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.crm_prospects_retencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_prospects_retencao() TO service_role;

-- Segurança: só a equipe da Central com 2FA lê (as funções do servidor ainda checam o perfil);
-- só o servidor escreve.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_prospects', 'crm_prospect_touches', 'crm_optout', 'crm_prospect_runs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS founder_reads ON public.%I', t);
    EXECUTE format('CREATE POLICY founder_reads ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''founder''))', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_if_enrolled ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_if_enrolled ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.mfa_session_ok()))', t);
  END LOOP;
END $$;
