-- Apple Pay e Google Pay pelo Pagar.me: o Google Pay pede o ID da conta Pagar.me
-- do restaurante (gatewayMerchantId, formato acc_...). Não é segredo, mas só o
-- servidor grava. Aditiva; reverter com DROP COLUMN account_id.
ALTER TABLE public.restaurant_pagarme_accounts ADD COLUMN IF NOT EXISTS account_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_pagarme_accounts_account_id_fmt') THEN
    ALTER TABLE public.restaurant_pagarme_accounts
      ADD CONSTRAINT restaurant_pagarme_accounts_account_id_fmt CHECK (account_id IS NULL OR account_id ~ '^acc_[A-Za-z0-9]{8,40}$');
  END IF;
END $$;
