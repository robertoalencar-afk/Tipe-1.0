-- Caixa conferido no servidor: o valor esperado é calculado no banco, por forma de
-- pagamento, e o navegador não consegue mais gravar um "esperado" diferente.
-- Aditiva: duas colunas novas em cash_sessions, cash_expected (leitura) e
-- cash_close_counted (fechamento com contagem separada). cash_close antigo continua
-- existindo, mas passa a ignorar o p_expected recebido.
-- Reversão: DROP FUNCTION cash_expected(text), cash_close_counted(text, numeric, numeric, text);
-- ALTER TABLE cash_sessions DROP COLUMN expected_by_method, DROP COLUMN counted_by_method;
-- recriar cash_close da migração 20260929182948.
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS expected_by_method jsonb,
  ADD COLUMN IF NOT EXISTS counted_by_method jsonb;

-- Resumo do caixa aberto. Espécie: troco inicial + reforços − sangrias + vendas do
-- balcão/totem em dinheiro + pagamentos de mesa confirmados em dinheiro no turno.
-- Maquininha: balcão/totem em cartão + mesas confirmadas na maquininha no turno.
-- Pix do balcão fica à parte (não está na gaveta nem na maquininha).
CREATE OR REPLACE FUNCTION public.cash_expected_for(p_session uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  WITH s AS (
    SELECT cs.id, cs.restaurant_id, cs.opened_at, cs.opening_amount, r.slug
    FROM cash_sessions cs JOIN restaurants r ON r.id = cs.restaurant_id WHERE cs.id = p_session
  ), mov AS (
    SELECT coalesce(sum(amount) FILTER (WHERE kind = 'deposit'), 0) AS deposits,
           coalesce(sum(amount) FILTER (WHERE kind = 'withdrawal'), 0) AS withdrawals
    FROM cash_movements WHERE session_id = p_session
  ), balcao AS (
    SELECT coalesce(sum(total) FILTER (WHERE payment_method = 'cash'), 0) AS cash,
           coalesce(sum(total) FILTER (WHERE payment_method = 'card'), 0) AS card,
           coalesce(sum(total) FILTER (WHERE payment_method = 'pix'), 0) AS pix,
           count(*) AS n
    FROM pdv_orders WHERE cash_session_id = p_session AND cancelled_at IS NULL
  ), confirmados AS (
    SELECT DISTINCT a.payment_id FROM payment_audit_log a, s
    WHERE a.restaurant_slug = s.slug AND a.action = 'confirm' AND a.created_at >= s.opened_at
  ), mesas AS (
    -- Mesas reabertas têm os pagamentos em archived_payments (mesmo id).
    SELECT p.id, p.amount, p.establishment_method FROM table_payment_requests p, s
    WHERE p.restaurant_slug = s.slug AND p.id IN (SELECT payment_id FROM confirmados)
      AND p.payment_method = 'at_establishment' AND p.status = 'approved' AND p.payment_target = 'restaurant'
    UNION
    SELECT p.id, p.amount, p.establishment_method FROM archived_payments p, s
    WHERE p.restaurant_slug = s.slug AND p.id IN (SELECT payment_id FROM confirmados)
      AND p.payment_method = 'at_establishment' AND p.status = 'approved' AND p.payment_target = 'restaurant'
  ), mesa_tot AS (
    SELECT coalesce(sum(amount) FILTER (WHERE establishment_method = 'cash'), 0) AS cash,
           coalesce(sum(amount) FILTER (WHERE establishment_method IS DISTINCT FROM 'cash'), 0) AS card
    FROM mesas
  )
  SELECT jsonb_build_object(
    'session_id', s.id,
    'opening', s.opening_amount,
    'deposits', mov.deposits,
    'withdrawals', mov.withdrawals,
    'counter_cash', balcao.cash,
    'counter_card', balcao.card,
    'counter_pix', balcao.pix,
    'counter_count', balcao.n,
    'table_cash', mesa_tot.cash,
    'table_card', mesa_tot.card,
    'expected_cash', round(s.opening_amount + mov.deposits - mov.withdrawals + balcao.cash + mesa_tot.cash, 2),
    'expected_card', round(balcao.card + mesa_tot.card, 2))
  FROM s, mov, balcao, mesa_tot;
$function$;
REVOKE ALL ON FUNCTION public.cash_expected_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cash_expected_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.cash_expected(p_slug text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_sid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL;
  IF v_sid IS NULL THEN RETURN NULL; END IF;
  RETURN cash_expected_for(v_sid);
END; $function$;
REVOKE ALL ON FUNCTION public.cash_expected(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_expected(text) TO authenticated, service_role;

-- Fechamento com a contagem separada (espécie e comprovantes da maquininha).
-- O esperado e a diferença gravados são sempre os do servidor.
CREATE OR REPLACE FUNCTION public.cash_close_counted(p_slug text, p_counted_cash numeric, p_counted_card numeric, p_notes text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_sid uuid; v_exp jsonb; v_total numeric;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_counted_cash IS NULL OR p_counted_card IS NULL OR p_counted_cash < 0 OR p_counted_card < 0
     OR p_counted_cash > 1000000 OR p_counted_card > 1000000 THEN RAISE EXCEPTION 'Valor contado inválido'; END IF;
  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL FOR UPDATE;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'Nenhum caixa aberto'; END IF;
  v_exp := cash_expected_for(v_sid);
  v_total := (v_exp->>'expected_cash')::numeric + (v_exp->>'expected_card')::numeric;
  UPDATE cash_sessions SET closed_at = now(), closed_by = auth.uid(),
    counted_amount = round(p_counted_cash + p_counted_card, 2), expected_amount = v_total,
    expected_by_method = v_exp,
    counted_by_method = jsonb_build_object('cash', round(p_counted_cash, 2), 'card', round(p_counted_card, 2)),
    notes = left(p_notes, 300)
  WHERE id = v_sid;
  RETURN v_exp || jsonb_build_object(
    'counted_cash', round(p_counted_cash, 2), 'counted_card', round(p_counted_card, 2),
    'difference_cash', round(p_counted_cash - (v_exp->>'expected_cash')::numeric, 2),
    'difference_card', round(p_counted_card - (v_exp->>'expected_card')::numeric, 2));
END; $function$;
REVOKE ALL ON FUNCTION public.cash_close_counted(text, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_close_counted(text, numeric, numeric, text) TO authenticated, service_role;

-- Versão antiga: mantida para clientes em cache, mas o esperado agora vem do servidor.
CREATE OR REPLACE FUNCTION public.cash_close(p_slug text, p_counted numeric, p_expected numeric, p_notes text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid; v_sid uuid; v_exp jsonb;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT id INTO v_sid FROM cash_sessions WHERE restaurant_id = v_rid AND closed_at IS NULL FOR UPDATE;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'Nenhum caixa aberto'; END IF;
  v_exp := cash_expected_for(v_sid);
  UPDATE cash_sessions SET closed_at = now(), closed_by = auth.uid(), counted_amount = p_counted,
    expected_amount = (v_exp->>'expected_cash')::numeric + (v_exp->>'expected_card')::numeric,
    expected_by_method = v_exp, notes = left(p_notes, 300)
  WHERE id = v_sid;
END; $function$;
