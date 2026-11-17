-- Telefone da Tipe nas assinaturas de roberto@ e contato@ (só se ainda forem as da 0081).
UPDATE public.mail_mailboxes
SET signature = E'Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital\nTelefone: +55 (85) 9.8559-1062\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao'
WHERE address = 'roberto@tipe.digital'
  AND signature = E'Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao';

UPDATE public.mail_mailboxes
SET signature = E'Equipe Tipe\nAtendimento a restaurantes\ncontato@tipe.digital\ntipe.digital\nTelefone: +55 (85) 9.8559-1062\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao'
WHERE address = 'contato@tipe.digital'
  AND signature = E'Equipe Tipe\nAtendimento a restaurantes\ncontato@tipe.digital\ntipe.digital\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao';
