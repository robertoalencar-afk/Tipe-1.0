-- Pedidos de integração (03/11): o dono escolhe o sistema (PDV, delivery, ERP, nota fiscal,
-- maquininha ou cardápio), o jeito de conectar e envia a chave ou o arquivo. A equipe Tipe
-- confere e liga. Credenciais ficam criptografadas pelo servidor (TIPE_ENCRYPTION_KEY);
-- só o servidor (service_role) lê ou grava esta tabela.
CREATE TABLE IF NOT EXISTS public.integration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  system_id text NOT NULL CHECK (system_id ~ '^[a-z0-9-]{2,40}$'),
  category text NOT NULL CHECK (category IN ('pdv','delivery','erp','fiscal','pagamentos','cardapio')),
  method text NOT NULL CHECK (method IN ('api','autorizacao','arquivo','certificado','webhook')),
  credentials_encrypted text,
  file_name text CHECK (file_name IS NULL OR length(file_name) <= 200),
  file_type text CHECK (file_type IS NULL OR length(file_type) <= 100),
  file_encrypted text,
  notes text CHECK (notes IS NULL OR length(notes) <= 1000),
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','em_ativacao','ativo','precisa_ajuste')),
  status_note text CHECK (status_note IS NULL OR length(status_note) <= 500),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_requests_restaurant_idx ON public.integration_requests (restaurant_id, created_at DESC);
ALTER TABLE public.integration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_requests TO service_role;
