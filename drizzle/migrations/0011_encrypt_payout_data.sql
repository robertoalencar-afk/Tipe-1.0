ALTER TABLE public.waiter_payout_accounts ADD COLUMN IF NOT EXISTS holder_document_enc text, ADD COLUMN IF NOT EXISTS pix_key_enc text;
ALTER TABLE public.waiter_withdrawals ADD COLUMN IF NOT EXISTS pix_key_enc text;
ALTER TABLE public.restaurant_payout_accounts ADD COLUMN IF NOT EXISTS holder_document_enc text, ADD COLUMN IF NOT EXISTS account_number_enc text;
COMMENT ON COLUMN public.waiter_payout_accounts.holder_document IS 'Somente valor mascarado. Dado completo em holder_document_enc (AES-GCM).';
COMMENT ON COLUMN public.waiter_payout_accounts.pix_key IS 'Somente valor mascarado. Dado completo em pix_key_enc (AES-GCM).';
COMMENT ON COLUMN public.waiter_withdrawals.pix_key IS 'Somente valor mascarado. Dado completo em pix_key_enc (AES-GCM).';
COMMENT ON COLUMN public.restaurant_payout_accounts.holder_document IS 'Somente valor mascarado. Dado completo em holder_document_enc (AES-GCM).';
COMMENT ON COLUMN public.restaurant_payout_accounts.account_number IS 'Somente valor mascarado. Dado completo em account_number_enc (AES-GCM).';
COMMENT ON TABLE public.waiter_payout_accounts IS 'Interna: acesso apenas pelo servidor (sem policies de propósito).';
COMMENT ON TABLE public.waiter_withdrawals IS 'Interna: acesso apenas pelo servidor (sem policies de propósito).';
COMMENT ON TABLE public.restaurant_payout_accounts IS 'Interna: acesso apenas pelo servidor (sem policies de propósito).';

CREATE OR REPLACE FUNCTION public.waiter_request_withdrawal(p_waiter uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_w record; v_acc record; v_avail numeric; v_id uuid; v_start date := public.tipe_cycle_start();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('withdraw:' || p_waiter));
  SELECT * INTO v_w FROM public.pdv_waiters WHERE id = p_waiter AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garçom inativo'; END IF;
  SELECT * INTO v_acc FROM public.waiter_payout_accounts WHERE waiter_id = p_waiter;
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