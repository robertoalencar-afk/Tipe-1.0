CREATE TABLE public.table_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_slug TEXT NOT NULL,
  table_number TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  paid_quantity INTEGER NOT NULL DEFAULT 0 CHECK (paid_quantity >= 0),
  ordered_by TEXT NOT NULL,
  ordered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_slug, table_number, item_code),
  CHECK (reserved_quantity + paid_quantity <= ordered_quantity)
);
GRANT SELECT ON public.table_bill_items TO anon, authenticated;
GRANT ALL ON public.table_bill_items TO service_role;
ALTER TABLE public.table_bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests can view table bill items"
ON public.table_bill_items FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.table_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_slug TEXT NOT NULL,
  table_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  payment_target TEXT NOT NULL CHECK (payment_target IN ('restaurant', 'tipe')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card', 'apple_pay', 'google_pay', 'at_establishment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'failed')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  item_quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.table_payment_requests TO anon, authenticated;
GRANT ALL ON public.table_payment_requests TO service_role;
ALTER TABLE public.table_payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests can view table payment activity"
ON public.table_payment_requests FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER set_table_bill_items_updated_at BEFORE UPDATE ON public.table_bill_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_table_payment_requests_updated_at BEFORE UPDATE ON public.table_payment_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.table_bill_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_payment_requests;

INSERT INTO public.table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at) VALUES
('mare-alta', '12', '1', 'Moqueca de peixe', 89.00, 2, 'Ana', '2026-09-24T22:42:00Z'),
('mare-alta', '12', '2', 'Camarão na moranga', 112.00, 1, 'Bruno', '2026-09-24T22:45:00Z'),
('mare-alta', '12', '3', 'Caipirinha de limão', 24.00, 3, 'Carla', '2026-09-24T22:50:00Z'),
('mare-alta', '12', '4', 'Água com gás', 8.00, 2, 'Ana', '2026-09-24T23:05:00Z'),
('mare-alta', '12', '5', 'Pudim de leite', 18.00, 1, 'Bruno', '2026-09-24T23:40:00Z');