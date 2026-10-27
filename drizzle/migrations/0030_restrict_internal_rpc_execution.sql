-- Restrict privileged internal routines used by Tipe server-side service-role clients.
-- These functions operate with SECURITY DEFINER and do not authorize caller identity.
-- Calls from browser/anon/authenticated are forbidden; service_role retains access.
-- Internal trigger invocation and server-side RPC continue to work.
REVOKE EXECUTE ON FUNCTION public.enforce_table_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pdv_ingest_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restaurant_table_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.table_is_over_limit(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enforce_table_limit() TO service_role;
GRANT EXECUTE ON FUNCTION public.pdv_ingest_event(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.restaurant_table_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.table_is_over_limit(uuid, text) TO service_role;
