-- Caixa de e-mail da Central Tipe: roberto@ e contato@tipe.digital.
-- Recebimento: Cloudflare Email Routing -> Email Worker -> /api/public/email-inbound (assinado).
-- Envio: Resend, sempre por ação do fundador. Só o founder (papel global + 2FA) lê;
-- só o servidor (service_role) escreve.
CREATE TABLE IF NOT EXISTS public.mail_mailboxes (
  address text PRIMARY KEY CHECK (address = lower(address) AND address ~ '^[a-z0-9._-]+@[a-z0-9.-]+$'),
  label text NOT NULL CHECK (length(label) BETWEEN 2 AND 60),
  signature text,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO public.mail_mailboxes (address, label) VALUES
  ('roberto@tipe.digital', 'Roberto'),
  ('contato@tipe.digital', 'Contato')
ON CONFLICT (address) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox text NOT NULL REFERENCES public.mail_mailboxes(address) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'spam', 'trash', 'archive')),
  message_id text,
  in_reply_to text,
  thread_key text NOT NULL,
  from_addr text NOT NULL,
  from_name text,
  to_addrs jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_addrs jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject text NOT NULL DEFAULT '' CHECK (length(subject) <= 500),
  text_body text CHECK (text_body IS NULL OR length(text_body) <= 400000),
  html_body text CHECK (html_body IS NULL OR length(html_body) <= 800000),
  snippet text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  starred boolean NOT NULL DEFAULT false,
  resend_id text,
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE SET NULL,
  at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mail_messages_msgid_idx ON public.mail_messages (mailbox, message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mail_messages_list_idx ON public.mail_messages (mailbox, folder, at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_thread_idx ON public.mail_messages (thread_key, at);
CREATE INDEX IF NOT EXISTS mail_messages_lead_idx ON public.mail_messages (lead_id) WHERE lead_id IS NOT NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mail_mailboxes', 'mail_messages'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS founder_reads ON public.%I', t);
    EXECUTE format('CREATE POLICY founder_reads ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''founder''))', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_if_enrolled ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_if_enrolled ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.mfa_session_ok()))', t);
  END LOOP;
END $$;
