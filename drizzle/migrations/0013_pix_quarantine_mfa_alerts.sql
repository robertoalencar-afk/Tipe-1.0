ALTER TABLE public.waiter_payout_accounts
  ADD COLUMN IF NOT EXISTS pending_holder_name text,
  ADD COLUMN IF NOT EXISTS pending_holder_document text,
  ADD COLUMN IF NOT EXISTS pending_holder_document_enc text,
  ADD COLUMN IF NOT EXISTS pending_pix_key_type text,
  ADD COLUMN IF NOT EXISTS pending_pix_key text,
  ADD COLUMN IF NOT EXISTS pending_pix_key_enc text,
  ADD COLUMN IF NOT EXISTS pending_since timestamptz;

CREATE OR REPLACE FUNCTION public.promote_pending_pix(p_waiter uuid, p_force boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  UPDATE public.waiter_payout_accounts SET
    holder_name = pending_holder_name, holder_document = pending_holder_document, holder_document_enc = pending_holder_document_enc,
    pix_key_type = pending_pix_key_type, pix_key = pending_pix_key, pix_key_enc = pending_pix_key_enc,
    pending_holder_name = NULL, pending_holder_document = NULL, pending_holder_document_enc = NULL,
    pending_pix_key_type = NULL, pending_pix_key = NULL, pending_pix_key_enc = NULL, pending_since = NULL, updated_at = now()
  WHERE waiter_id = p_waiter AND pending_since IS NOT NULL AND (p_force OR pending_since <= now() - interval '48 hours');
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.promote_pending_pix(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_pending_pix(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.waiter_request_withdrawal(p_waiter uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_w record; v_acc record; v_avail numeric; v_id uuid; v_start date := public.tipe_cycle_start();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('withdraw:' || p_waiter));
  PERFORM public.promote_pending_pix(p_waiter, false);
  SELECT * INTO v_w FROM public.pdv_waiters WHERE id = p_waiter AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garçom inativo'; END IF;
  SELECT * INTO v_acc FROM public.waiter_payout_accounts WHERE waiter_id = p_waiter;
  IF FOUND AND v_acc.pending_since IS NOT NULL THEN RAISE EXCEPTION 'Sua chave Pix nova está em verificação por 48 horas. Saques ficam bloqueados até lá.'; END IF;
  IF NOT FOUND OR v_acc.pix_key_enc IS NULL THEN RAISE EXCEPTION 'Cadastre sua chave Pix antes de sacar'; END IF;
  IF EXISTS (SELECT 1 FROM public.waiter_withdrawals WHERE waiter_id = p_waiter AND status = 'requested') THEN RAISE EXCEPTION 'Você já tem um saque em andamento'; END IF;
  SELECT available INTO v_avail FROM public.waiter_balance(p_waiter);
  IF v_avail < 10 THEN RAISE EXCEPTION 'Saldo disponível mínimo para saque: R$ 10,00'; END IF;
  INSERT INTO public.waiter_withdrawals (waiter_id, restaurant_id, amount, cycle_end, scheduled_for, pix_key_type, pix_key, pix_key_enc, holder_name)
  VALUES (p_waiter, v_w.restaurant_id, v_avail, v_start - 1,
    CASE WHEN extract(day FROM v_start) = 1 THEN v_start + 15 ELSE (date_trunc('month', v_start) + interval '1 month')::date END,
    v_acc.pix_key_type, v_acc.pix_key, v_acc.pix_key_enc, v_acc.holder_name)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.waiter_request_withdrawal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waiter_request_withdrawal(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.security_alert_state (
  alert_type text PRIMARY KEY,
  last_sent_at timestamptz,
  suppressed_count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.security_alert_state TO service_role;
ALTER TABLE public.security_alert_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.founder_devices (
  user_id uuid NOT NULL,
  device_hash text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_hash)
);
GRANT ALL ON public.founder_devices TO service_role;
ALTER TABLE public.founder_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mfa_recovery_codes_user ON public.mfa_recovery_codes(user_id);
GRANT ALL ON public.mfa_recovery_codes TO service_role;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;