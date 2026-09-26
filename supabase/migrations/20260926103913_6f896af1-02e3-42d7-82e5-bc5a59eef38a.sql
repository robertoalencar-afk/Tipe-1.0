-- Mesas: código público e token do QR
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS access_token text NOT NULL DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,16);
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS waiter_id uuid;
UPDATE public.restaurant_tables SET code = 'mesa' || number WHERE code IS NULL;
ALTER TABLE public.restaurant_tables ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_tables_restaurant_code_key ON public.restaurant_tables (restaurant_id, code);

CREATE OR REPLACE FUNCTION public.set_table_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN NEW.code := 'mesa' || NEW.number; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS set_restaurant_tables_code ON public.restaurant_tables;
CREATE TRIGGER set_restaurant_tables_code BEFORE INSERT ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.set_table_code();

-- PDV simulado
CREATE TABLE public.pdv_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_menu_categories TO authenticated;
GRANT ALL ON public.pdv_menu_categories TO service_role;
ALTER TABLE public.pdv_menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view categories" ON public.pdv_menu_categories FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "Owners manage categories" ON public.pdv_menu_categories FOR ALL TO authenticated USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[])) WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));

CREATE TABLE public.pdv_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.pdv_menu_categories(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_menu_items TO authenticated;
GRANT ALL ON public.pdv_menu_items TO service_role;
ALTER TABLE public.pdv_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view menu" ON public.pdv_menu_items FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "Owners manage menu" ON public.pdv_menu_items FOR ALL TO authenticated USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[])) WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
CREATE TRIGGER set_pdv_menu_items_updated_at BEFORE UPDATE ON public.pdv_menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pdv_waiters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_waiters TO authenticated;
GRANT ALL ON public.pdv_waiters TO service_role;
ALTER TABLE public.pdv_waiters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view waiters" ON public.pdv_waiters FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "Owners manage waiters" ON public.pdv_waiters FOR ALL TO authenticated USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[])) WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));

ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_waiter_fk FOREIGN KEY (waiter_id) REFERENCES public.pdv_waiters(id) ON DELETE SET NULL;

CREATE TABLE public.pdv_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  waiter_id uuid REFERENCES public.pdv_waiters(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pdv_orders TO authenticated;
GRANT ALL ON public.pdv_orders TO service_role;
ALTER TABLE public.pdv_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view orders" ON public.pdv_orders FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE TABLE public.pdv_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pdv_orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  item_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pdv_order_items TO authenticated;
GRANT ALL ON public.pdv_order_items TO service_role;
ALTER TABLE public.pdv_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view order items" ON public.pdv_order_items FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- Lançar pedido no PDV
CREATE OR REPLACE FUNCTION public.pdv_launch_order(p_slug text, p_table text, p_waiter uuid, p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rid uuid; v_order uuid; v_waiter_name text; v_el jsonb; v_item record; v_qty integer;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table AND active) THEN RAISE EXCEPTION 'Mesa inativa ou inexistente'; END IF;
  SELECT name INTO v_waiter_name FROM pdv_waiters WHERE id = p_waiter AND restaurant_id = v_rid AND active;
  IF v_waiter_name IS NULL THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Pedido vazio'; END IF;

  INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_by) VALUES (v_rid, p_table, p_waiter, auth.uid()) RETURNING id INTO v_order;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_el->>'qty')::integer;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT code, name, price INTO v_item FROM pdv_menu_items WHERE restaurant_id = v_rid AND code = v_el->>'code' AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
    INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity) VALUES (v_order, v_rid, v_item.code, v_item.name, v_item.price, v_qty);
    INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at)
    VALUES (p_slug, p_table, v_item.code, v_item.name, v_item.price, v_qty, v_waiter_name, now())
    ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
  END LOOP;

  UPDATE restaurant_tables SET waiter_id = p_waiter WHERE restaurant_id = v_rid AND number = p_table;
  RETURN v_order;
END; $$;

-- Estornar item (só o que não está reservado/pago)
CREATE OR REPLACE FUNCTION public.pdv_void_item(p_slug text, p_table text, p_code text, p_qty integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rid uuid; v_row record;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO v_row FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table AND item_code = p_code FOR UPDATE;
  IF NOT FOUND OR p_qty <= 0 OR p_qty > v_row.ordered_quantity - v_row.reserved_quantity - v_row.paid_quantity THEN RAISE EXCEPTION 'Quantidade não pode ser estornada'; END IF;
  IF v_row.ordered_quantity - p_qty = 0 THEN DELETE FROM table_bill_items WHERE id = v_row.id;
  ELSE UPDATE table_bill_items SET ordered_quantity = ordered_quantity - p_qty WHERE id = v_row.id; END IF;
END; $$;

-- Reabertura passa a zerar a mesa (conta nova vazia), arquivando pagamentos
CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at
  FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO payment_audit_log (payment_id, restaurant_slug, table_number, action, amount)
  VALUES (gen_random_uuid(), p_slug, p_table, 'table_reopened', 0);
  DELETE FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  DELETE FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  UPDATE restaurant_tables SET waiter_id = NULL WHERE number = p_table AND restaurant_id = (SELECT id FROM restaurants WHERE slug = p_slug);
END; $$;

-- Fechar mesa manualmente pelo painel
CREATE OR REPLACE FUNCTION public.pdv_close_table(p_slug text, p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF EXISTS (SELECT 1 FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table AND status = 'pending') THEN RAISE EXCEPTION 'Há pagamentos aguardando confirmação'; END IF;
  PERFORM archive_and_reopen_table(p_slug, p_table);
END; $$;

REVOKE EXECUTE ON FUNCTION public.pdv_launch_order(text,text,uuid,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pdv_void_item(text,text,text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pdv_close_table(text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_and_reopen_table(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_launch_order(text,text,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_void_item(text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_close_table(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_reopen_table(text,text) TO service_role;

-- Seed Maré Alta
DO $$
DECLARE v_rid uuid; v_cat uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = 'marealta';
  IF v_rid IS NULL THEN
    INSERT INTO public.restaurants (slug, name, pos_provider) VALUES ('marealta', 'Restaurante Maré Alta', 'saipos') RETURNING id INTO v_rid;
  END IF;

  INSERT INTO public.restaurant_tables (restaurant_id, number, code)
  SELECT v_rid, g::text, 'mesa' || g FROM generate_series(1,20) g
  ON CONFLICT (restaurant_id, number) DO NOTHING;

  INSERT INTO public.pdv_waiters (restaurant_id, code, name) VALUES
    (v_rid,'G01','Carlos Mendes'),(v_rid,'G02','Francisca Lima'),(v_rid,'G03','Antônio Sales'),(v_rid,'G04','Raimunda Costa'),(v_rid,'G05','José Wellington')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pdv_menu_categories (restaurant_id, name, position) VALUES
    (v_rid,'Entradas',1),(v_rid,'Pratos principais',2),(v_rid,'Acompanhamentos',3),(v_rid,'Sobremesas',4),(v_rid,'Bebidas sem álcool',5),(v_rid,'Bebidas com álcool',6)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Entradas';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'E01','Caranguejo (unidade)',18,1),(v_rid,v_cat,'E02','Casquinha de siri',32,2),(v_rid,v_cat,'E03','Pastel de camarão (6 un.)',38,3),
    (v_rid,v_cat,'E04','Isca de peixe',48,4),(v_rid,v_cat,'E05','Macaxeira frita',26,5),(v_rid,v_cat,'E06','Camarão empanado',62,6),(v_rid,v_cat,'E07','Batata frita',28,7)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Pratos principais';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'P01','Peixada cearense (2 pessoas)',149,1),(v_rid,v_cat,'P02','Moqueca de camarão (2 pessoas)',168,2),(v_rid,v_cat,'P03','Camarão ao alho e óleo',98,3),
    (v_rid,v_cat,'P04','Lagosta grelhada',210,4),(v_rid,v_cat,'P05','Baião de dois com carne de sol',89,5),(v_rid,v_cat,'P06','Paçoca de carne de sol',72,6),
    (v_rid,v_cat,'P07','Filé de pescada grelhado',84,7),(v_rid,v_cat,'P08','Peixe inteiro frito (serra)',119,8),(v_rid,v_cat,'P09','Galinha caipira',96,9)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Acompanhamentos';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'A01','Arroz branco',14,1),(v_rid,v_cat,'A02','Pirão de peixe',16,2),(v_rid,v_cat,'A03','Feijão verde',18,3),(v_rid,v_cat,'A04','Farofa de manteiga',12,4),(v_rid,v_cat,'A05','Vinagrete',10,5)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Sobremesas';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'S01','Cartola',24,1),(v_rid,v_cat,'S02','Tapioca de coco com leite condensado',22,2),(v_rid,v_cat,'S03','Pudim de leite',18,3),(v_rid,v_cat,'S04','Sorvete de tapioca',16,4)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Bebidas sem álcool';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'B01','Água de coco',10,1),(v_rid,v_cat,'B02','Suco de cajá',12,2),(v_rid,v_cat,'B03','Suco de acerola',12,3),(v_rid,v_cat,'B04','Suco de graviola',13,4),
    (v_rid,v_cat,'B05','Refrigerante lata',7,5),(v_rid,v_cat,'B06','Água mineral',5,6),(v_rid,v_cat,'B07','Água com gás',6,7)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cat FROM public.pdv_menu_categories WHERE restaurant_id=v_rid AND name='Bebidas com álcool';
  INSERT INTO public.pdv_menu_items (restaurant_id, category_id, code, name, price, position) VALUES
    (v_rid,v_cat,'C01','Cerveja 600 ml',16,1),(v_rid,v_cat,'C02','Cerveja long neck',11,2),(v_rid,v_cat,'C03','Caipirinha de cajá',24,3),
    (v_rid,v_cat,'C04','Caipirinha de caju',24,4),(v_rid,v_cat,'C05','Caipirinha de limão',22,5),(v_rid,v_cat,'C06','Dose de cachaça Ypióca',9,6)
  ON CONFLICT DO NOTHING;
END $$;