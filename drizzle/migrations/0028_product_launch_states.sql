-- Estado de lançamento dos produtos do site (Tipe Order primeiro).
-- 0027 está reservado para o produto Tipe Order; esta migração não depende dela.
-- Leitura pública só pela server function getLaunchState (service_role): sem grant para anon
-- nem authenticated. Escrita só pela server function setLaunchState, que exige fundador com
-- 2FA (requireFounder2fa) e registra a ação em security_events.
CREATE TABLE IF NOT EXISTS public.product_launch_states (
  product_slug text PRIMARY KEY CHECK (product_slug ~ '^[a-z0-9-]{1,40}$'),
  state text NOT NULL DEFAULT 'em-desenvolvimento'
    CHECK (state IN ('em-desenvolvimento', 'acesso-antecipado', 'piloto', 'disponivel')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.product_launch_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.product_launch_states TO service_role;
ALTER TABLE public.product_launch_states ENABLE ROW LEVEL SECURITY;
-- Sem políticas: com RLS ligado e sem grant, anon e authenticated não leem nem escrevem.
