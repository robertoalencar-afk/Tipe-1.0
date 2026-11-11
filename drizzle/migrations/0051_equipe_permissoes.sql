-- Equipe e permissões do restaurante: gerente, permissões extras por pessoa, suspensão, convites e auditoria.
-- Compatível com o que existe: o gerente herda o que o caixa pode no banco (as 19+ políticas que citam 'cashier'
-- seguem valendo sem reescrita). O que é só do administrador (equipe, planos, saques) continua citando só 'owner'.

ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- Papel válido = tem a linha em user_roles E não está suspenso. Gerente conta como caixa.
CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id uuid, _restaurant_id uuid, _roles public.app_role[])
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.restaurant_id = _restaurant_id
      AND (ur.role = ANY(_roles) OR (ur.role::text = 'manager' AND 'cashier'::public.app_role = ANY(_roles)))
      AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id = ur.user_id AND sm.restaurant_id = ur.restaurant_id AND sm.suspended_at IS NOT NULL))
    AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$function$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.restaurant_id = _restaurant_id
      AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id = ur.user_id AND sm.restaurant_id = ur.restaurant_id AND sm.suspended_at IS NOT NULL))
    AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$function$;

CREATE OR REPLACE FUNCTION public.is_member_of_slug(_user_id uuid, _slug text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.restaurants r ON r.id = ur.restaurant_id
    WHERE ur.user_id = _user_id AND r.slug = _slug
      AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id = ur.user_id AND sm.restaurant_id = ur.restaurant_id AND sm.suspended_at IS NOT NULL))
    AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
$function$;

-- Permissões padrão por papel (a matriz). O administrador tem todas, sem linhas aqui.
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);
INSERT INTO public.role_permissions (role, permission) VALUES
  ('manager','dashboard.ver'),('manager','salao.ver'),('manager','salao.operar'),('manager','pedidos.ver'),('manager','pedidos.lancar'),('manager','pedidos.cancelar'),
  ('manager','caixa.ver'),('manager','caixa.operar'),('manager','cozinha.ver'),('manager','relatorios.ver'),('manager','equipe.ver'),
  ('cashier','dashboard.ver'),('cashier','salao.ver'),('cashier','salao.operar'),('cashier','pedidos.ver'),('cashier','pedidos.lancar'),('cashier','caixa.ver'),('cashier','caixa.operar'),
  ('waiter','salao.ver'),('waiter','pedidos.ver'),('waiter','pedidos.lancar')
ON CONFLICT DO NOTHING;

-- Permissões extras concedidas a uma pessoa (nunca tiram, só somam). Quem concede precisa ser administrador.
CREATE TABLE IF NOT EXISTS public.restaurant_permission_grants (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission ~ '^[a-z]+\.[a-z]+$'),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, user_id, permission)
);

-- Convites: o token nunca é guardado, só o hash; expira, é de uso único e pode ser revogado.
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND length(email) <= 255),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  role public.app_role NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role::text IN ('manager','cashier','waiter'))
);
CREATE INDEX IF NOT EXISTS staff_invites_rest_idx ON public.staff_invites (restaurant_id, created_at DESC);

-- Histórico de mudanças de equipe e permissões (só leitura para o administrador).
CREATE TABLE IF NOT EXISTS public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor_id uuid,
  target_id uuid,
  action text NOT NULL,
  detail text CHECK (detail IS NULL OR length(detail) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_audit_rest_idx ON public.staff_audit_log (restaurant_id, created_at DESC);

-- A pessoa pode ter a permissão pelo papel padrão ou por concessão. Administrador tem todas.
CREATE OR REPLACE FUNCTION public.restaurant_can(_user_id uuid, _restaurant_id uuid, _perm text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.restaurant_id = _restaurant_id
      AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id = ur.user_id AND sm.restaurant_id = ur.restaurant_id AND sm.suspended_at IS NOT NULL)
      AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
      AND (ur.role::text = 'owner'
        OR EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role = ur.role AND rp.permission = _perm)
        OR EXISTS (SELECT 1 FROM public.restaurant_permission_grants g WHERE g.user_id = ur.user_id AND g.restaurant_id = ur.restaurant_id AND g.permission = _perm)))
$function$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['role_permissions','restaurant_permission_grants','staff_invites','staff_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_if_enrolled ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_if_enrolled ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.mfa_session_ok()))', t);
  END LOOP;
  DROP POLICY IF EXISTS leitura_geral ON public.role_permissions;
  CREATE POLICY leitura_geral ON public.role_permissions FOR SELECT TO authenticated USING (true);
  -- Cada pessoa vê as próprias concessões; o administrador vê as do restaurante.
  DROP POLICY IF EXISTS le_grants ON public.restaurant_permission_grants;
  CREATE POLICY le_grants ON public.restaurant_permission_grants FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
  DROP POLICY IF EXISTS le_convites ON public.staff_invites;
  CREATE POLICY le_convites ON public.staff_invites FOR SELECT TO authenticated
    USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
  DROP POLICY IF EXISTS le_auditoria ON public.staff_audit_log;
  CREATE POLICY le_auditoria ON public.staff_audit_log FOR SELECT TO authenticated
    USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
END $$;
-- O último administrador é protegido no servidor (equipe.functions.ts), não por gatilho: um gatilho quebraria a exclusão em cascata do restaurante.
