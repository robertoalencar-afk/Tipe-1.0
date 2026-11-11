-- Permissões padrão do Supabase para objetos novos em public (as migrações
-- seguintes revogam o que não deve ser exposto). Garante o mesmo comportamento
-- mesmo em projetos criados sem a exposição automática de tabelas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Tabela criada fora do histórico de migrações no banco da Lovable.
-- Recriada aqui a partir de src/integrations/supabase/types.ts para que um
-- banco Supabase novo suba só com as migrações do repositório.
CREATE TABLE IF NOT EXISTS public.restaurant_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  contact_role text,
  city text,
  state text,
  neighborhood text,
  instagram text,
  venue_type text,
  tables_range text,
  ticket_range text,
  waiters_range text,
  pdv_system text,
  acquirer text,
  has_pagarme text,
  peak_queue text,
  peak_times text[],
  pains text[],
  close_time text,
  calculator jsonb,
  message text,
  discovery_source text,
  origin_page text,
  used_simulator boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  privacy_accepted_at timestamptz,
  ref_code text,
  referred_by_code text,
  referrer_name text,
  update_token text,
  stage2_completed_at timestamptz,
  status text NOT NULL DEFAULT 'novo',
  lost_reason text,
  next_contact_at timestamptz,
  notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_leads ENABLE ROW LEVEL SECURITY;

-- A migração seguinte troca esta política por uma com validação.
DROP POLICY IF EXISTS "Qualquer visitante pode enviar um contato" ON public.restaurant_leads;
CREATE POLICY "Qualquer visitante pode enviar um contato" ON public.restaurant_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);
