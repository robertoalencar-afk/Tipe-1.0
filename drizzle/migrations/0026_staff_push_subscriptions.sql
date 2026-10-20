-- Avisos no celular da equipe (Web Push): uma inscrição por navegador, sempre
-- ligada a quem estava logado ao ativar. Cada pessoa vê e apaga só as suas; o
-- envio é feito pelo servidor (service_role), que decide os destinatários.
CREATE TABLE IF NOT EXISTS public.staff_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 1000),
  p256dh text NOT NULL CHECK (length(p256dh) BETWEEN 80 AND 100),
  auth text NOT NULL CHECK (length(auth) BETWEEN 16 AND 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  -- Tipos de aviso que a pessoa desligou neste celular.
  muted_kinds text[] NOT NULL DEFAULT '{}' CHECK (muted_kinds <@ ARRAY['pagamento','gorjeta','nota','saque']::text[])
);
CREATE INDEX IF NOT EXISTS staff_push_subscriptions_user_idx ON public.staff_push_subscriptions (user_id);

ALTER TABLE public.staff_push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push: ver as próprias" ON public.staff_push_subscriptions;
CREATE POLICY "push: ver as próprias" ON public.staff_push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "push: apagar as próprias" ON public.staff_push_subscriptions;
CREATE POLICY "push: apagar as próprias" ON public.staff_push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.staff_push_subscriptions FROM anon, authenticated;
GRANT SELECT, DELETE ON public.staff_push_subscriptions TO authenticated;
