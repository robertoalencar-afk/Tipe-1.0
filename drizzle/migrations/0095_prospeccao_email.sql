-- Prospecção por e-mail: sequência de 3 e-mails (D0, D3, D8) enviada pela Central,
-- sempre em lote aprovado por uma pessoa, com limite diário e descadastro em 1 clique.
-- Status de entrega vem do webhook do Resend em email_log; queixa de spam ou
-- descadastro viram opt-out (crm_optout) e o restaurante sai de toda cadência.

ALTER TABLE public.crm_prospects
  ADD COLUMN IF NOT EXISTS email_step integer NOT NULL DEFAULT 0 CHECK (email_step BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS email_next_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_last_at timestamptz;
CREATE INDEX IF NOT EXISTS crm_prospects_email_idx ON public.crm_prospects (email_step, email_next_at) WHERE email IS NOT NULL;

ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.crm_prospects(id) ON DELETE SET NULL;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS message_id text;
CREATE INDEX IF NOT EXISTS email_log_prospect_idx ON public.email_log (prospect_id, created_at DESC) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_log_template_dia_idx ON public.email_log (template, created_at DESC);
