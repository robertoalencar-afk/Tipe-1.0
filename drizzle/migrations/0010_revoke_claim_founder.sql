REVOKE ALL ON FUNCTION public.claim_founder() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.claim_founder() IS 'Desativada: founder já existe. Execução somente via service_role.';