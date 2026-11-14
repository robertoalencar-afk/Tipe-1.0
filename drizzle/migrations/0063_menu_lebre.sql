-- Private preferences and cached proposals; never expose the assistant's drafts publicly.
CREATE TABLE public.menu_assistant (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  auto_translate boolean NOT NULL DEFAULT false,
  languages text[] NOT NULL DEFAULT ARRAY['pt']::text[] CHECK (languages <@ ARRAY['pt','en','es']::text[] AND 'pt'=ANY(languages)),
  suggestions jsonb NOT NULL DEFAULT '[]',
  reviewed_at timestamptz,
  next_run timestamptz NOT NULL DEFAULT now(),
  last_error text,
  processing_until timestamptz NOT NULL DEFAULT '-infinity'
);
ALTER TABLE public.menu_assistant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.menu_assistant FROM anon, authenticated;
GRANT SELECT ON public.menu_assistant TO authenticated;
GRANT ALL ON public.menu_assistant TO service_role;
CREATE POLICY menu_assistant_read ON public.menu_assistant FOR SELECT TO authenticated USING (
 public.has_restaurant_role((SELECT auth.uid()),restaurant_id,ARRAY['owner','manager']::public.app_role[]) AND public.mfa_session_ok()
);
-- Atomic lease prevents panel refreshes and overlapping cron deliveries spending quota twice.
CREATE FUNCTION public.claim_menu_assistant(p_restaurant uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 UPDATE public.menu_assistant SET processing_until=now()+interval '3 minutes',next_run=now()+interval '5 minutes'
 WHERE restaurant_id=p_restaurant AND enabled AND next_run<=now() AND processing_until<=now();
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_menu_assistant(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_menu_assistant(uuid) TO service_role;
-- Opting out and source edits take precedence over a model response already in flight.
CREATE FUNCTION public.publish_menu_translation(p_restaurant uuid,p_item uuid,p_source jsonb,p_previous jsonb,p_config jsonb,p_languages text[]) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.menu_assistant WHERE restaurant_id=p_restaurant AND enabled AND auto_translate AND languages=p_languages FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.pdv_menu_items SET menu_config=p_config
 WHERE restaurant_id=p_restaurant AND id=p_item AND menu_config=p_previous
 AND jsonb_build_array(name,coalesce(description,''))=p_source AND available;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.publish_menu_translation(uuid,uuid,jsonb,jsonb,jsonb,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_menu_translation(uuid,uuid,jsonb,jsonb,jsonb,text[]) TO service_role;

CREATE FUNCTION public.menu_assistant_dirty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
   IF NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.description IS NOT DISTINCT FROM OLD.description AND NEW.available IS NOT DISTINCT FROM OLD.available THEN RETURN NEW; END IF;
 END IF;
 UPDATE public.menu_assistant SET reviewed_at=NULL,suggestions='[]',next_run=now() WHERE restaurant_id=coalesce(NEW.restaurant_id,OLD.restaurant_id);
 RETURN coalesce(NEW,OLD);
END; $$;
REVOKE ALL ON FUNCTION public.menu_assistant_dirty() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER menu_assistant_dirty AFTER INSERT OR DELETE OR UPDATE OF name,description,available ON public.pdv_menu_items FOR EACH ROW EXECUTE FUNCTION public.menu_assistant_dirty();
