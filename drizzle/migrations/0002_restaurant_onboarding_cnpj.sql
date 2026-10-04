ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'done';
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_cnpj_unique ON public.restaurants (cnpj) WHERE cnpj IS NOT NULL;

DROP FUNCTION IF EXISTS public.signup_restaurant(text,text,text,integer,text);

CREATE OR REPLACE FUNCTION public.signup_restaurant(p_name text, p_slug text, p_plan text, p_tables integer, p_display_name text, p_cnpj text, p_address text, p_phone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_uid uuid := auth.uid(); v_rid uuid; v_email text; v_cnpj text := regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_plan NOT IN ('essencial','profissional','premium') THEN RAISE EXCEPTION 'Plano inválido'; END IF;
  IF p_slug !~ '^[a-z0-9-]{2,64}$' OR p_slug IN ('simulador','entrar','painel','cadastro','termos','api','mesa','reset-password') THEN RAISE EXCEPTION 'Escolha outro endereço'; END IF;
  IF length(trim(coalesce(p_name,''))) < 2 OR p_tables < 1 OR p_tables > 500 THEN RAISE EXCEPTION 'Quantidade de mesas inválida'; END IF;
  IF length(v_cnpj) <> 14 THEN RAISE EXCEPTION 'CNPJ inválido'; END IF;
  IF length(trim(coalesce(p_address,''))) < 8 THEN RAISE EXCEPTION 'Informe o endereço completo'; END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE user_id = v_uid AND role = 'owner') >= 3 THEN RAISE EXCEPTION 'Limite de restaurantes atingido'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE slug = p_slug) THEN RAISE EXCEPTION 'Já existe um restaurante com esse endereço'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE cnpj = v_cnpj) THEN RAISE EXCEPTION 'Já existe um restaurante com esse CNPJ'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.restaurants (name, slug, pos_provider, cnpj, address, phone, onboarding_step)
  VALUES (left(trim(p_name),80), p_slug, 'none', v_cnpj, left(trim(p_address),160), nullif(left(trim(coalesce(p_phone,'')),30),''), 'pos') RETURNING id INTO v_rid;
  INSERT INTO public.user_roles (user_id, role, restaurant_id) VALUES (v_uid, 'owner', v_rid);
  INSERT INTO public.staff_members (user_id, restaurant_id, display_name, email) VALUES (v_uid, v_rid, left(trim(coalesce(nullif(p_display_name,''), v_email)),80), coalesce(v_email,''));
  INSERT INTO public.restaurant_tables (restaurant_id, number) SELECT v_rid, g::text FROM generate_series(1, p_tables) g;
  INSERT INTO public.restaurant_subscriptions (restaurant_id, plan) VALUES (v_rid, p_plan);
  RETURN p_slug;
END; $$;
REVOKE ALL ON FUNCTION public.signup_restaurant(text,text,text,integer,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.signup_restaurant(text,text,text,integer,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_onboarding(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT public.has_restaurant_role(auth.uid(), v_rid, ARRAY['owner']::public.app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.restaurants SET onboarding_step = 'done' WHERE id = v_rid;
END; $$;
REVOKE ALL ON FUNCTION public.finish_onboarding(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_onboarding(text) TO authenticated;

UPDATE public.restaurants SET onboarding_step = 'pos' WHERE slug = 'marebaixa';