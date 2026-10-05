CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document text NOT NULL CHECK (document IN ('partner_terms','privacy_policy','consumer_terms','cookie_policy')),
  version text NOT NULL CHECK (char_length(version) BETWEEN 1 AND 20),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document, version)
);
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own acceptances read" ON public.legal_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own acceptances insert" ON public.legal_acceptances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion','revoke_consent','other')),
  holder_category text NOT NULL CHECK (holder_category IN ('consumer','restaurant','staff','other')),
  name text NOT NULL,
  email text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','verifying','in_progress','completed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.privacy_requests TO service_role;
GRANT SELECT ON public.privacy_requests TO authenticated;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder reads privacy requests" ON public.privacy_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));