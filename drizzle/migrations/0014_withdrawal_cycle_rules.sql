ALTER TABLE public.waiter_withdrawals ADD COLUMN IF NOT EXISTS blocked_until timestamptz;
ALTER TABLE public.waiter_withdrawals DROP CONSTRAINT waiter_withdrawals_status_check;
ALTER TABLE public.waiter_withdrawals ADD CONSTRAINT waiter_withdrawals_status_check CHECK (status = ANY (ARRAY['requested','paid','rejected','cancelled']));

CREATE TABLE public.waiter_withdrawal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL,
  waiter_id uuid NOT NULL,
  action text NOT NULL,
  amount numeric NOT NULL,
  pix_key_masked text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.waiter_withdrawal_events TO service_role;
ALTER TABLE public.waiter_withdrawal_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_payout_date(p_after date)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
  SELECT CASE WHEN extract(day FROM p_after) < 16
    THEN (date_trunc('month', p_after) + interval '15 days')::date
    ELSE (date_trunc('month', p_after) + interval '1 month')::date END
$$;

CREATE OR REPLACE FUNCTION public.waiter_balance(p_waiter uuid)
 RETURNS TABLE(available numeric, current_cycle numeric, withdrawn numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH tips AS (
    SELECT amount, created_at FROM public.table_payment_requests WHERE waiter_id = p_waiter AND payment_target = 'tipe' AND status = 'approved'
    UNION ALL
    SELECT amount, created_at FROM public.archived_payments WHERE waiter_id = p_waiter AND payment_target = 'tipe' AND status = 'approved'
  ), cs AS (SELECT (public.tipe_cycle_start() AT TIME ZONE 'America/Fortaleza') AS t)
  SELECT
    round(coalesce((SELECT sum(amount) * 0.7 FROM tips, cs WHERE created_at < cs.t), 0)
      - coalesce((SELECT sum(amount) FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status IN ('requested','paid')), 0), 2),
    round(coalesce((SELECT sum(amount) * 0.7 FROM tips, cs WHERE created_at >= cs.t), 0), 2),
    coalesce((SELECT sum(amount) FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status = 'paid'), 0)
$function$;

CREATE OR REPLACE FUNCTION public.waiter_request_withdrawal(p_waiter uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_w record; v_acc record; v_avail numeric; v_id uuid; v_block timestamptz; v_sched date;
  v_type text; v_key text; v_key_enc text; v_holder text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('withdraw:' || p_waiter));
  PERFORM public.promote_pending_pix(p_waiter, false);
  SELECT * INTO v_w FROM public.pdv_waiters WHERE id = p_waiter AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garçom inativo'; END IF;
  SELECT * INTO v_acc FROM public.waiter_payout_accounts WHERE waiter_id = p_waiter;
  IF NOT FOUND OR (v_acc.pix_key_enc IS NULL AND v_acc.pending_pix_key_enc IS NULL) THEN RAISE EXCEPTION 'Cadastre sua chave Pix antes de sacar'; END IF;
  IF EXISTS (SELECT 1 FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status = 'requested') THEN RAISE EXCEPTION 'Você já tem um saque em andamento'; END IF;
  SELECT available INTO v_avail FROM public.waiter_balance(p_waiter);
  IF v_avail IS NULL OR v_avail < 10 THEN RAISE EXCEPTION 'Saldo disponível mínimo para saque: R$ 10,00'; END IF;
  IF v_acc.pending_since IS NOT NULL THEN
    v_block := v_acc.pending_since + interval '48 hours';
    v_type := v_acc.pending_pix_key_type; v_key := v_acc.pending_pix_key; v_key_enc := v_acc.pending_pix_key_enc; v_holder := v_acc.pending_holder_name;
  ELSE
    v_type := v_acc.pix_key_type; v_key := v_acc.pix_key; v_key_enc := v_acc.pix_key_enc; v_holder := v_acc.holder_name;
  END IF;
  v_sched := public.next_payout_date((coalesce(v_block, now()) AT TIME ZONE 'America/Fortaleza')::date);
  INSERT INTO public.waiter_withdrawals (waiter_id, restaurant_id, amount, cycle_end, scheduled_for, pix_key_type, pix_key, pix_key_enc, holder_name, blocked_until)
  VALUES (p_waiter, v_w.restaurant_id, v_avail, public.tipe_cycle_start() - 1, v_sched, v_type, v_key, v_key_enc, v_holder, v_block)
  RETURNING id INTO v_id;
  INSERT INTO public.waiter_withdrawal_events (withdrawal_id, waiter_id, action, amount, pix_key_masked, actor_id)
  VALUES (v_id, p_waiter, 'requested', v_avail, v_key, v_w.user_id);
  RETURN v_id;
END; $function$;

REVOKE ALL ON FUNCTION public.waiter_request_withdrawal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waiter_request_withdrawal(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.waiter_balance(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waiter_balance(uuid) TO service_role;