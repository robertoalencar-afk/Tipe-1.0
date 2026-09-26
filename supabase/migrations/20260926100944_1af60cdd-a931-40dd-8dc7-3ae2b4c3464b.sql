CREATE TYPE public.app_role AS ENUM ('founder', 'owner', 'cashier', 'waiter');

CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pos_provider TEXT NOT NULL DEFAULT 'none' CHECK (pos_provider IN ('saipos','totvs','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, role, restaurant_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  restaurant_slug TEXT NOT NULL,
  table_number TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_audit_log TO authenticated;
GRANT ALL ON public.payment_audit_log TO service_role;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.archived_payments (
  id UUID PRIMARY KEY,
  restaurant_slug TEXT NOT NULL,
  table_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  payment_target TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  item_quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.archived_payments TO authenticated;
GRANT ALL ON public.archived_payments TO service_role;
ALTER TABLE public.archived_payments ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'founder') OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id)
$$;

CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id UUID, _restaurant_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'founder') OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_slug(_user_id UUID, _slug TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'founder') OR EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.restaurants r ON r.id = ur.restaurant_id
    WHERE ur.user_id = _user_id AND r.slug = _slug)
$$;

-- Policies
CREATE POLICY "Members view their restaurants" ON public.restaurants FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), id));
CREATE POLICY "Founders create restaurants" ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Owners update their restaurant" ON public.restaurants FOR UPDATE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), id, ARRAY['owner']::public.app_role[]));

CREATE POLICY "Members view tables" ON public.restaurant_tables FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "Owners add tables" ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
CREATE POLICY "Owners update tables" ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
CREATE POLICY "Owners remove tables" ON public.restaurant_tables FOR DELETE TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));

CREATE POLICY "View own or managed roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'founder')
    OR (restaurant_id IS NOT NULL AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[])));

CREATE POLICY "Members view staff" ON public.staff_members FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members view audit" ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.is_member_of_slug(auth.uid(), restaurant_slug));

CREATE POLICY "Members view archive" ON public.archived_payments FOR SELECT TO authenticated
  USING (public.is_member_of_slug(auth.uid(), restaurant_slug));

CREATE TRIGGER set_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_staff_members_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- First signed-in person may claim founder once
CREATE OR REPLACE FUNCTION public.claim_founder()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'founder') THEN RETURN FALSE; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'founder');
  RETURN TRUE;
END; $$;
REVOKE ALL ON FUNCTION public.claim_founder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_founder() TO authenticated;

-- Confirm or cancel an in-person payment
CREATE OR REPLACE FUNCTION public.resolve_table_payment(p_payment_id UUID, p_action TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pay RECORD;
  v_rid UUID;
  v_key TEXT;
  v_qty INTEGER;
BEGIN
  IF p_action NOT IN ('confirm','cancel') THEN RAISE EXCEPTION 'Ação inválida'; END IF;
  SELECT * INTO v_pay FROM public.table_payment_requests WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = v_pay.restaurant_slug;
  IF v_rid IS NULL OR NOT public.has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::public.app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'Pagamento já resolvido'; END IF;

  FOR v_key, v_qty IN SELECT key, value::INTEGER FROM jsonb_each_text(v_pay.item_quantities) LOOP
    IF p_action = 'confirm' THEN
      UPDATE public.table_bill_items SET reserved_quantity = GREATEST(reserved_quantity - v_qty, 0), paid_quantity = paid_quantity + v_qty
      WHERE restaurant_slug = v_pay.restaurant_slug AND table_number = v_pay.table_number AND item_code = v_key;
    ELSE
      UPDATE public.table_bill_items SET reserved_quantity = GREATEST(reserved_quantity - v_qty, 0)
      WHERE restaurant_slug = v_pay.restaurant_slug AND table_number = v_pay.table_number AND item_code = v_key;
    END IF;
  END LOOP;

  UPDATE public.table_payment_requests SET status = CASE WHEN p_action = 'confirm' THEN 'approved' ELSE 'cancelled' END WHERE id = p_payment_id;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, actor_id, amount)
  VALUES (p_payment_id, v_pay.restaurant_slug, v_pay.table_number, p_action, auth.uid(), v_pay.amount);
END; $$;
REVOKE ALL ON FUNCTION public.resolve_table_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_table_payment(UUID, TEXT) TO authenticated;

-- Archive then reopen a closed table (server only)
CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug TEXT, p_table TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at
  FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, amount)
  VALUES (gen_random_uuid(), p_slug, p_table, 'table_reopened', 0);
  DELETE FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  UPDATE public.table_bill_items SET reserved_quantity = 0, paid_quantity = 0 WHERE restaurant_slug = p_slug AND table_number = p_table;
END; $$;
REVOKE ALL ON FUNCTION public.archive_and_reopen_table(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_reopen_table(TEXT, TEXT) TO service_role;

-- Seed first restaurant
INSERT INTO public.restaurants (slug, name, pos_provider) VALUES ('mare-alta', 'Restaurante Maré Alta', 'saipos');
INSERT INTO public.restaurant_tables (restaurant_id, number)
SELECT r.id, n::TEXT FROM public.restaurants r, generate_series(1, 12) n WHERE r.slug = 'mare-alta';