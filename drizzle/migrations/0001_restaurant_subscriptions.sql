CREATE TABLE public.restaurant_subscriptions (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'essencial' CHECK (plan IN ('essencial','profissional','premium','personalizado')),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  current_period_end timestamptz,
  provider text NOT NULL DEFAULT 'pagarme',
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_subscriptions TO authenticated;
GRANT ALL ON public.restaurant_subscriptions TO service_role;
ALTER TABLE public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem a assinatura" ON public.restaurant_subscriptions FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE TRIGGER set_restaurant_subscriptions_updated_at BEFORE UPDATE ON public.restaurant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.signup_restaurant(p_name text, p_slug text, p_plan text, p_tables integer, p_display_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_uid uuid := auth.uid(); v_rid uuid; v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_plan NOT IN ('essencial','profissional','premium') THEN RAISE EXCEPTION 'Plano inválido'; END IF;
  IF p_slug !~ '^[a-z0-9-]{2,64}$' OR p_slug IN ('simulador','entrar','painel','cadastro','termos','api','mesa','reset-password') THEN RAISE EXCEPTION 'Escolha outro endereço'; END IF;
  IF length(trim(coalesce(p_name,''))) < 2 OR p_tables < 1 OR p_tables > (CASE p_plan WHEN 'essencial' THEN 10 WHEN 'profissional' THEN 20 ELSE 40 END) THEN RAISE EXCEPTION 'Quantidade de mesas acima do plano'; END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE user_id = v_uid AND role = 'owner') >= 3 THEN RAISE EXCEPTION 'Limite de restaurantes atingido'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE slug = p_slug) THEN RAISE EXCEPTION 'Já existe um restaurante com esse endereço'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.restaurants (name, slug, pos_provider) VALUES (left(trim(p_name),80), p_slug, 'none') RETURNING id INTO v_rid;
  INSERT INTO public.user_roles (user_id, role, restaurant_id) VALUES (v_uid, 'owner', v_rid);
  INSERT INTO public.staff_members (user_id, restaurant_id, display_name, email) VALUES (v_uid, v_rid, left(trim(coalesce(nullif(p_display_name,''), v_email)),80), coalesce(v_email,''));
  INSERT INTO public.restaurant_tables (restaurant_id, number) SELECT v_rid, g::text FROM generate_series(1, p_tables) g;
  INSERT INTO public.restaurant_subscriptions (restaurant_id, plan) VALUES (v_rid, p_plan);
  RETURN p_slug;
END; $$;
REVOKE ALL ON FUNCTION public.signup_restaurant(text,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.signup_restaurant(text,text,text,integer,text) TO authenticated;