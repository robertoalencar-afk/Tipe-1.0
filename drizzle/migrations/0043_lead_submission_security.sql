-- O formulário público só grava via submitLead (service_role, validação e rate limit).
-- Nenhum lead existente é removido, mesclado ou alterado.
DROP POLICY IF EXISTS "Visitantes enviam contato valido" ON public.restaurant_leads;
REVOKE INSERT, DELETE ON public.restaurant_leads FROM anon, authenticated;
REVOKE SELECT, UPDATE ON public.restaurant_leads FROM anon;
ALTER TABLE public.restaurant_leads ADD COLUMN submission_key uuid;
CREATE UNIQUE INDEX restaurant_leads_submission_key_unique
  ON public.restaurant_leads (submission_key) WHERE submission_key IS NOT NULL;
COMMENT ON COLUMN public.restaurant_leads.submission_key IS
  'Chave aleatória por envio para deduplicar retries sem expor tokens por dados pessoais.';
