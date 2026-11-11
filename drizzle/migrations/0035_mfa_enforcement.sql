-- Verificação em duas etapas também no banco.
-- Quem ativou o 2FA e está numa sessão só com senha (aal1) não lê nem altera dados da
-- equipe, nem por chamada direta à API do Supabase. Sem 2FA ativo, nada muda.
-- Chamadas do servidor com a chave de serviço (sem auth.uid()) continuam valendo.
-- O servidor da Tipe repete a regra em requireSupabaseAuth (src/integrations/supabase/auth-middleware.ts).

CREATE OR REPLACE FUNCTION public.mfa_session_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      OR auth.uid() IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors f
        WHERE f.user_id = auth.uid() AND f.status::text = 'verified'
      )
$$;
REVOKE ALL ON FUNCTION public.mfa_session_ok() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfa_session_ok() TO anon, authenticated, service_role;

-- Funções de papel usadas pelas políticas e pelas RPCs da equipe: quando a pergunta é sobre
-- o próprio usuário da sessão, exigem 2FA confirmado se ele tiver 2FA.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
     AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$$;

CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id uuid, _restaurant_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = ANY(_roles))
     AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id)
     AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_slug(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.restaurants r ON r.id = ur.restaurant_id
    WHERE ur.user_id = _user_id AND r.slug = _slug)
     AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$$;

-- Política restritiva em toda tabela com RLS: soma-se às políticas existentes (AND).
-- Cobre também as políticas do tipo "user_id = auth.uid()", que não passam pelas funções acima.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS mfa_if_enrolled ON public.%I', t.relname);
    EXECUTE format(
      'CREATE POLICY mfa_if_enrolled ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.mfa_session_ok())) WITH CHECK ((SELECT public.mfa_session_ok()))',
      t.relname);
  END LOOP;
END $$;
