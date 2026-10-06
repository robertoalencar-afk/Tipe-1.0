CREATE TABLE public.restaurant_pagarme_accounts (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  secret_key_enc text NOT NULL,
  key_prefix text NOT NULL,
  key_mode text NOT NULL DEFAULT 'live',
  webhook_token text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  connected_by uuid,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.restaurant_pagarme_accounts TO service_role;
ALTER TABLE public.restaurant_pagarme_accounts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.restaurant_pagarme_accounts IS 'Conta Pagar.me propria do restaurante. Chave criptografada; acesso somente service_role.';
COMMENT ON TABLE public.restaurant_payout_accounts IS 'DEPRECATED: substituida por restaurant_pagarme_accounts (conta propria do restaurante).';