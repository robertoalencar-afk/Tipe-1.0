-- Setores da equipe interna (marketing, vendas), caixas de e-mail de funcionários e assinaturas profissionais.
ALTER TABLE public.mail_mailboxes ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mail_mailboxes_owner_idx ON public.mail_mailboxes (owner_user_id) WHERE owner_user_id IS NOT NULL;

DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.central_staff'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%perfil%' LOOP
    EXECUTE format('ALTER TABLE public.central_staff DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.central_staff ADD CONSTRAINT central_staff_perfil_check CHECK (perfil IN ('comercial', 'vendas', 'marketing', 'atendimento', 'dev'));
END $$;

-- Assinaturas só onde ainda não há uma (o fundador pode editar depois pela Central).
UPDATE public.mail_mailboxes SET signature = E'Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital' WHERE address = 'roberto@tipe.digital' AND signature IS NULL;
UPDATE public.mail_mailboxes SET signature = E'Equipe Tipe\nAtendimento a restaurantes · Tipe Pay, Order e Gestão\ncontato@tipe.digital\ntipe.digital' WHERE address = 'contato@tipe.digital' AND signature IS NULL;
