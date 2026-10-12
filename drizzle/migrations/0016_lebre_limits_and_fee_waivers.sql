CREATE TABLE public.lebre_limits (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  panel_daily integer NOT NULL DEFAULT 200 CHECK (panel_daily BETWEEN 1 AND 100000),
  public_daily integer NOT NULL DEFAULT 2000 CHECK (public_daily BETWEEN 1 AND 1000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT ALL ON public.lebre_limits TO service_role;
ALTER TABLE public.lebre_limits ENABLE ROW LEVEL SECURITY;
INSERT INTO public.lebre_limits (id) VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE public.lebre_usage (
  scope text NOT NULL,
  day date NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  alerted80 boolean NOT NULL DEFAULT false,
  PRIMARY KEY (scope, day)
);
GRANT ALL ON public.lebre_usage TO service_role;
ALTER TABLE public.lebre_usage ENABLE ROW LEVEL SECURITY;

-- Consome 1 mensagem do dia (horário de Brasília). Atômico: nunca passa do limite.
CREATE OR REPLACE FUNCTION public.lebre_consume(p_scope text, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_limit integer; v_day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_hits integer; v_alert boolean := false; v_row public.lebre_usage;
BEGIN
  SELECT CASE WHEN p_kind = 'public' THEN public_daily ELSE panel_daily END INTO v_limit FROM public.lebre_limits WHERE id = 'default';
  v_limit := coalesce(v_limit, CASE WHEN p_kind = 'public' THEN 2000 ELSE 200 END);
  INSERT INTO public.lebre_usage (scope, day, hits) VALUES (left(p_scope, 120), v_day, 0) ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.lebre_usage WHERE scope = left(p_scope, 120) AND day = v_day FOR UPDATE;
  IF v_row.hits >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'hits', v_row.hits, 'limit', v_limit, 'alert80', false, 'reached', true);
  END IF;
  v_hits := v_row.hits + 1;
  IF NOT v_row.alerted80 AND v_hits * 100 >= v_limit * 80 THEN v_alert := true; END IF;
  UPDATE public.lebre_usage SET hits = v_hits, alerted80 = alerted80 OR v_alert WHERE scope = v_row.scope AND day = v_day;
  RETURN jsonb_build_object('allowed', true, 'hits', v_hits, 'limit', v_limit, 'alert80', v_alert, 'reached', v_hits >= v_limit);
END; $$;
REVOKE ALL ON FUNCTION public.lebre_consume(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lebre_consume(text, text) TO service_role;

CREATE TABLE public.service_fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  table_number text NOT NULL,
  session_token text NOT NULL,
  reason text NOT NULL,
  waived_amount numeric(12,2) NOT NULL DEFAULT 0,
  actor_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_fee_waivers_lookup ON public.service_fee_waivers (restaurant_id, table_number, session_token);
GRANT SELECT ON public.service_fee_waivers TO authenticated;
GRANT ALL ON public.service_fee_waivers TO service_role;
ALTER TABLE public.service_fee_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono e caixa leem remoções de taxa" ON public.service_fee_waivers FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::public.app_role[]));

-- Remove a taxa de serviço da conta aberta de uma mesa. Vale até a mesa ser reaberta.
CREATE OR REPLACE FUNCTION public.waive_service_fee(p_slug text, p_table text, p_reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_rid uuid; v_rate numeric; v_session text; v_amount numeric; v_name text;
BEGIN
  SELECT id, service_rate INTO v_rid, v_rate FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo da remoção'; END IF;
  SELECT session_token INTO v_session FROM restaurant_tables WHERE restaurant_id = v_rid AND number = p_table;
  IF v_session IS NULL THEN RAISE EXCEPTION 'Mesa inexistente'; END IF;
  IF EXISTS (SELECT 1 FROM service_fee_waivers WHERE restaurant_id = v_rid AND table_number = p_table AND session_token = v_session) THEN RAISE EXCEPTION 'A taxa desta mesa já foi removida'; END IF;
  SELECT round(coalesce(sum(unit_price * greatest(ordered_quantity - paid_portion - reserved_portion, 0)), 0) * v_rate, 2) INTO v_amount
  FROM table_bill_items WHERE restaurant_slug = p_slug AND table_number = p_table;
  SELECT display_name INTO v_name FROM staff_members WHERE user_id = auth.uid() AND restaurant_id = v_rid;
  INSERT INTO service_fee_waivers (restaurant_id, table_number, session_token, reason, waived_amount, actor_id, actor_name)
  VALUES (v_rid, p_table, v_session, left(trim(p_reason), 200), v_amount, auth.uid(), v_name);
  INSERT INTO security_events (actor_id, restaurant_id, restaurant_slug, action, resource, detail)
  VALUES (auth.uid(), v_rid, p_slug, 'service_fee_waived', 'mesa:' || p_table, 'valor=' || v_amount || ' motivo=' || left(trim(p_reason), 120));
  RETURN v_amount;
END; $$;
REVOKE ALL ON FUNCTION public.waive_service_fee(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waive_service_fee(text, text, text) TO authenticated;