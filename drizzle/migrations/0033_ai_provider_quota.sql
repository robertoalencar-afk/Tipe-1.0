-- Teto diário de chamadas por provedor de IA (ex.: Cloudflare Workers AI), para a Lebre
-- ficar dentro da cota grátis. Usa lebre_usage com escopo 'ai:<provedor>' (dia de Brasília).
-- Atômico: devolve true e conta 1 só se ainda houver espaço no dia.
CREATE OR REPLACE FUNCTION public.ai_provider_consume(p_provider text, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_scope text := left('ai:' || p_provider, 120); v_hits integer;
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN RETURN false; END IF;
  INSERT INTO public.lebre_usage (scope, day, hits) VALUES (v_scope, v_day, 0) ON CONFLICT DO NOTHING;
  UPDATE public.lebre_usage SET hits = hits + 1
    WHERE scope = v_scope AND day = v_day AND hits < p_limit
    RETURNING hits INTO v_hits;
  RETURN v_hits IS NOT NULL;
END; $$;
REVOKE ALL ON FUNCTION public.ai_provider_consume(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_provider_consume(text, integer) TO service_role;
