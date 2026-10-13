-- Founder não acessa a operação privada dos restaurantes pelo papel global.
-- Regra do AGENTS.md: o Backoffice TIPE usa agregados pelo servidor (com 2FA);
-- operar um restaurante exige papel explícito naquele restaurante (user_roles).
-- Antes, has_restaurant_role, is_restaurant_member e is_member_of_slug
-- liberavam tudo para qualquer founder, inclusive pelas políticas de RLS.

CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id uuid, _restaurant_id uuid, _roles public.app_role[])
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = ANY(_roles))
$function$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_member_of_slug(_user_id uuid, _slug text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.restaurants r ON r.id = ur.restaurant_id
    WHERE ur.user_id = _user_id AND r.slug = _slug)
$function$;
