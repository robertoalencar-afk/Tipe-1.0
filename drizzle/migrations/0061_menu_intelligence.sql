-- Editorial data inherits the menu's existing owner-only write policies and MFA gate.
ALTER TABLE public.pdv_menu_items ADD COLUMN IF NOT EXISTS menu_config jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS menu_links jsonb NOT NULL DEFAULT '{}';

-- Daily counters, without customer IDs, IPs, names, sessions or device identifiers.
CREATE TABLE IF NOT EXISTS public.menu_daily_metrics (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.pdv_menu_items(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Fortaleza')::date,
  photo_opens integer NOT NULL DEFAULT 0 CHECK (photo_opens >= 0),
  additions integer NOT NULL DEFAULT 0 CHECK (additions >= 0),
  PRIMARY KEY (restaurant_id, item_id, day)
);
ALTER TABLE public.menu_daily_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.menu_daily_metrics FROM anon, authenticated;
GRANT SELECT ON public.menu_daily_metrics TO authenticated;
GRANT ALL ON public.menu_daily_metrics TO service_role;
CREATE POLICY menu_metrics_read ON public.menu_daily_metrics FOR SELECT TO authenticated
USING (public.has_restaurant_role((SELECT auth.uid()), restaurant_id, ARRAY['owner','manager']::public.app_role[]) AND public.mfa_session_ok());

CREATE OR REPLACE FUNCTION public.record_menu_interaction(p_restaurant uuid, p_item uuid, p_event text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_event NOT IN ('photo_open', 'add') THEN RAISE EXCEPTION 'Invalid event'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pdv_menu_items WHERE id=p_item AND restaurant_id=p_restaurant AND available) THEN RETURN; END IF;
  INSERT INTO public.menu_daily_metrics (restaurant_id,item_id,photo_opens,additions)
  VALUES (p_restaurant,p_item,CASE WHEN p_event='photo_open' THEN 1 ELSE 0 END,CASE WHEN p_event='add' THEN 1 ELSE 0 END)
  ON CONFLICT (restaurant_id,item_id,day) DO UPDATE
  SET photo_opens=public.menu_daily_metrics.photo_opens+EXCLUDED.photo_opens,
      additions=public.menu_daily_metrics.additions+EXCLUDED.additions;
END; $$;
REVOKE ALL ON FUNCTION public.record_menu_interaction(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_menu_interaction(uuid,uuid,text) TO service_role;
