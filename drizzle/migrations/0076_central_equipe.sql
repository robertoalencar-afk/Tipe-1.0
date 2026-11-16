-- Equipe interna da Central: contas criadas só pelo fundador, com perfil de poderes limitados.
-- O perfil define quais seções da Central a pessoa abre; a regra é aplicada no servidor
-- (central-perfis.ts). A pessoa só lê a própria linha; só o servidor (service_role) escreve.
CREATE TABLE IF NOT EXISTS public.central_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil text NOT NULL CHECK (perfil IN ('comercial', 'dev', 'atendimento')),
  nome text NOT NULL CHECK (length(nome) BETWEEN 2 AND 80),
  email text NOT NULL CHECK (email = lower(email)),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS central_staff_email_idx ON public.central_staff (email);

ALTER TABLE public.central_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.central_staff FROM anon, authenticated;
GRANT SELECT ON public.central_staff TO authenticated;
GRANT ALL ON public.central_staff TO service_role;
DROP POLICY IF EXISTS staff_reads_own ON public.central_staff;
CREATE POLICY staff_reads_own ON public.central_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'founder'));
DROP POLICY IF EXISTS mfa_if_enrolled ON public.central_staff;
CREATE POLICY mfa_if_enrolled ON public.central_staff AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.mfa_session_ok()));
