-- Assinaturas profissionais (logo, contatos rotulados, botão e aviso saem do formato do texto).
-- Só troca as assinaturas que ainda são as iniciais da 0080; qualquer edição do fundador é preservada.
UPDATE public.mail_mailboxes
SET signature = E'Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao'
WHERE address = 'roberto@tipe.digital'
  AND signature = E'Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital';

UPDATE public.mail_mailboxes
SET signature = E'Equipe Tipe\nAtendimento a restaurantes\ncontato@tipe.digital\ntipe.digital\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao'
WHERE address = 'contato@tipe.digital'
  AND signature = E'Equipe Tipe\nAtendimento a restaurantes · Tipe Pay, Order e Gestão\ncontato@tipe.digital\ntipe.digital';
