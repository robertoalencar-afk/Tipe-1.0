ALTER TABLE public.pdv_waiters ADD COLUMN user_id uuid UNIQUE, ADD COLUMN email text;
ALTER TABLE public.table_payment_requests ADD COLUMN waiter_id uuid REFERENCES public.pdv_waiters(id) ON DELETE SET NULL;
CREATE INDEX table_payment_requests_waiter_idx ON public.table_payment_requests (waiter_id) WHERE waiter_id IS NOT NULL;
ALTER TABLE public.archived_payments ADD COLUMN waiter_id uuid;

CREATE TABLE public.waiter_payout_accounts (
  waiter_id uuid PRIMARY KEY REFERENCES public.pdv_waiters(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  holder_document text NOT NULL,
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf','email','phone','random')),
  pix_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.waiter_payout_accounts TO service_role;
ALTER TABLE public.waiter_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.waiter_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id uuid NOT NULL REFERENCES public.pdv_waiters(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  cycle_end date NOT NULL,
  scheduled_for date NOT NULL,
  pix_key_type text NOT NULL,
  pix_key text NOT NULL,
  holder_name text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','paid','rejected')),
  note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
GRANT ALL ON public.waiter_withdrawals TO service_role;
ALTER TABLE public.waiter_withdrawals ENABLE ROW LEVEL SECURITY;

-- Início da quinzena atual (dia 1 ou 16, horário de Fortaleza)
CREATE OR REPLACE FUNCTION public.tipe_cycle_start(p_at timestamptz DEFAULT now()) RETURNS date
LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
  SELECT CASE WHEN extract(day FROM (p_at AT TIME ZONE 'America/Fortaleza')) < 16
    THEN date_trunc('month', p_at AT TIME ZONE 'America/Fortaleza')::date
    ELSE (date_trunc('month', p_at AT TIME ZONE 'America/Fortaleza') + interval '15 days')::date END
$$;

-- Saldo do garçom: 70% das gorjetas extras aprovadas em quinzenas já fechadas, menos saques.
CREATE OR REPLACE FUNCTION public.waiter_balance(p_waiter uuid)
RETURNS TABLE(available numeric, current_cycle numeric, withdrawn numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
  WITH tips AS (
    SELECT amount, created_at FROM public.table_payment_requests WHERE waiter_id = p_waiter AND payment_target = 'tipe' AND status = 'approved'
    UNION ALL
    SELECT amount, created_at FROM public.archived_payments WHERE waiter_id = p_waiter AND payment_target = 'tipe' AND status = 'approved'
  ), cs AS (SELECT (public.tipe_cycle_start() AT TIME ZONE 'America/Fortaleza') AS t)
  SELECT
    round(coalesce((SELECT sum(amount) * 0.7 FROM tips, cs WHERE created_at < cs.t), 0)
      - coalesce((SELECT sum(amount) FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status <> 'rejected'), 0), 2),
    round(coalesce((SELECT sum(amount) * 0.7 FROM tips, cs WHERE created_at >= cs.t), 0), 2),
    coalesce((SELECT sum(amount) FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status = 'paid'), 0)
$$;
REVOKE ALL ON FUNCTION public.waiter_balance(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waiter_balance(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.waiter_request_withdrawal(p_waiter uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_w record; v_acc record; v_avail numeric; v_id uuid; v_start date := public.tipe_cycle_start();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('withdraw:' || p_waiter));
  SELECT * INTO v_w FROM public.pdv_waiters WHERE id = p_waiter AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garçom inativo'; END IF;
  SELECT * INTO v_acc FROM public.waiter_payout_accounts WHERE waiter_id = p_waiter;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastre sua chave Pix antes de sacar'; END IF;
  IF EXISTS (SELECT 1 FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status = 'requested') THEN RAISE EXCEPTION 'Você já tem um saque em andamento'; END IF;
  SELECT available INTO v_avail FROM public.waiter_balance(p_waiter);
  IF v_avail < 10 THEN RAISE EXCEPTION 'Saldo disponível mínimo para saque: R$ 10,00'; END IF;
  INSERT INTO public.waiter_withdrawals (waiter_id, restaurant_id, amount, cycle_end, scheduled_for, pix_key_type, pix_key, holder_name)
  VALUES (p_waiter, v_w.restaurant_id, v_avail, v_start - 1,
    CASE WHEN extract(day FROM v_start) = 1 THEN v_start + 15 ELSE (date_trunc('month', v_start) + interval '1 month')::date END,
    v_acc.pix_key_type, v_acc.pix_key, v_acc.holder_name)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.waiter_request_withdrawal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waiter_request_withdrawal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.archive_and_reopen_table(p_slug text, p_table text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM public.restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = v_rid AND number = p_table) THEN
    RAISE EXCEPTION 'Mesa inativa ou inexistente';
  END IF;
  INSERT INTO public.archived_payments (id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id)
  SELECT id, restaurant_slug, table_number, customer_name, payment_target, payment_method, status, amount, item_quantities, created_at, idempotency_key, waiter_id
  FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payment_audit_log (payment_id, restaurant_slug, table_number, action, actor_id, amount)
  VALUES (gen_random_uuid(), p_slug, p_table, 'table_reopened', auth.uid(), 0);
  DELETE FROM public.table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table;
  DELETE FROM public.table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  UPDATE public.restaurant_tables SET waiter_id = NULL, session_token = encode(extensions.gen_random_bytes(24), 'hex')
  WHERE number = p_table AND restaurant_id = v_rid;
END; $function$;