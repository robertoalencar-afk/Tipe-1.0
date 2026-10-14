-- TIPE 2.0 · Fase 2
-- 1) Link de avaliação no Google, definido pelo dono (exibido ao cliente depois de pagar).
-- 2) Fila de baixa no PDV: cada pagamento de conta aprovado, num restaurante com
--    PDV externo conectado, entra numa fila; o servidor avisa o PDV com novas
--    tentativas e, se não conseguir, abre a pendência "pdv_writeback_failed".
--    A fila guarda uma cópia do pagamento, então reabrir a mesa não a afeta.

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS google_review_url text;
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_google_review_url_check;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_google_review_url_check CHECK (
  google_review_url IS NULL OR (
    length(google_review_url) <= 300
    AND google_review_url ~ '^https://(g\.page|www\.google\.com|google\.com|maps\.google\.com|maps\.app\.goo\.gl|search\.google\.com|g\.co)/'
  )
);

CREATE TABLE IF NOT EXISTS public.pdv_payment_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  adapter text NOT NULL,
  table_number text NOT NULL,
  item_quantities jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','done','failed','skipped']::text[])),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text CHECK (last_error IS NULL OR length(last_error) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pdv_payment_outbox_due_idx ON public.pdv_payment_outbox (next_attempt_at) WHERE status = 'pending';
ALTER TABLE public.pdv_payment_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdv_payment_outbox FROM anon, authenticated;
GRANT ALL ON public.pdv_payment_outbox TO service_role;
DROP POLICY IF EXISTS "Dono e caixa veem a fila de baixa" ON public.pdv_payment_outbox;
CREATE POLICY "Dono e caixa veem a fila de baixa" ON public.pdv_payment_outbox FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::public.app_role[]));
GRANT SELECT ON public.pdv_payment_outbox TO authenticated;

-- Enfileira quando um pagamento de conta passa a "approved" e há PDV externo conectado.
CREATE OR REPLACE FUNCTION public.enqueue_pdv_writeback()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_adapter text;
BEGIN
  IF NEW.status <> 'approved' OR NEW.payment_target <> 'restaurant' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;
  SELECT r.id, c.adapter INTO v_rid, v_adapter
  FROM public.restaurants r JOIN public.pdv_connections c ON c.restaurant_id = r.id
  WHERE r.slug = NEW.restaurant_slug;
  IF v_adapter IS NULL OR v_adapter = 'lancamento_tipe' THEN RETURN NEW; END IF;
  INSERT INTO public.pdv_payment_outbox (payment_id, restaurant_id, adapter, table_number, item_quantities, amount, payment_method)
  VALUES (NEW.id, v_rid, v_adapter, NEW.table_number, NEW.item_quantities, NEW.amount,
          CASE WHEN NEW.payment_method = 'at_establishment' THEN coalesce(NEW.establishment_method, 'at_establishment') ELSE NEW.payment_method END)
  ON CONFLICT (payment_id) DO NOTHING;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.enqueue_pdv_writeback() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enqueue_pdv_writeback ON public.table_payment_requests;
CREATE TRIGGER trg_enqueue_pdv_writeback AFTER INSERT OR UPDATE OF status ON public.table_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_pdv_writeback();

-- Reserva itens vencidos da fila para um processador (duas rotinas simultâneas
-- nunca pegam o mesmo item). Uso exclusivo do servidor.
CREATE OR REPLACE FUNCTION public.pdv_outbox_claim(p_limit integer)
 RETURNS SETOF public.pdv_payment_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.pdv_payment_outbox o SET locked_until = now() + interval '2 minutes', updated_at = now()
  WHERE o.id IN (
    SELECT id FROM public.pdv_payment_outbox
    WHERE status = 'pending' AND next_attempt_at <= now() AND (locked_until IS NULL OR locked_until < now())
    ORDER BY next_attempt_at
    LIMIT greatest(1, least(p_limit, 100))
    FOR UPDATE SKIP LOCKED)
  RETURNING o.*;
END; $function$;
REVOKE ALL ON FUNCTION public.pdv_outbox_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_outbox_claim(integer) TO service_role;
