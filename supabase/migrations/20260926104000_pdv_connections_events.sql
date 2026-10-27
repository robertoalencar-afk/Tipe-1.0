-- Tabelas e políticas criadas fora do histórico de migrações no banco da Lovable.
-- Recriadas aqui a partir de src/integrations/supabase/types.ts e do uso no código
-- (só o servidor, com service_role, lê e grava as tabelas do PDV).

CREATE TABLE IF NOT EXISTS public.pdv_connections (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  adapter text NOT NULL DEFAULT 'lancamento_tipe',
  status text NOT NULL DEFAULT 'not_connected',
  credentials_encrypted text,
  webhook_secret_hash text,
  last_sync_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pdv_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pdv_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  adapter text NOT NULL,
  direction text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pdv_events ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS pdv_events_dedupe_uq
  ON public.pdv_events (restaurant_id, adapter, direction, external_event_id);
CREATE INDEX IF NOT EXISTS pdv_events_restaurant_created_idx
  ON public.pdv_events (restaurant_id, created_at DESC);

REVOKE ALL ON public.pdv_connections, public.pdv_events FROM anon, authenticated;

-- Colunas de origem usadas pela importação de PDV (gatilhos e funções de 0015 e 0017).
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS source_adapter text;
ALTER TABLE public.pdv_waiters ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.pdv_waiters ADD COLUMN IF NOT EXISTS source_adapter text;
ALTER TABLE public.table_bill_items ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.table_bill_items ADD COLUMN IF NOT EXISTS source_adapter text;
ALTER TABLE public.table_bill_items ADD COLUMN IF NOT EXISTS notes text;

-- Leads: só fundadores leem e editam (/admin/leads).
DROP POLICY IF EXISTS "Fundadores leem leads" ON public.restaurant_leads;
CREATE POLICY "Fundadores leem leads" ON public.restaurant_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
DROP POLICY IF EXISTS "Fundadores editam leads" ON public.restaurant_leads;
CREATE POLICY "Fundadores editam leads" ON public.restaurant_leads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));
