# E-mails de senha da Tipe no Supabase (passo a passo)

O fluxo de "esqueci a senha" do site já está em português (`/esqueci-a-senha` e `/redefinir-senha`).
Os e-mails, porém, saem do Supabase Auth e só mudam quando os modelos são colados no painel.
Faça isto uma vez, no projeto de **produção** do Supabase (e, se quiser, repita no de testes).

Modelos prontos neste repositório:

- `supabase/templates/recuperar-senha.html` → e-mail "Redefinir senha"
- `supabase/templates/senha-alterada.html` → aviso "Senha alterada"

## 1. Endereços permitidos

**Authentication → URL Configuration → Redirect URLs**, confira que existem:

- `https://tipe.digital/**`
- `https://www.tipe.digital/**`
- `https://tipe.robertoalencar.workers.dev/**`

Sem o endereço do site atual, o Supabase troca o link do e-mail pelo Site URL e ele não abre a tela certa.

## 2. E-mail "Redefinir senha"

**Authentication → Emails → Templates → Reset password**

- **Subject:** `Sua nova senha da Tipe`
- **Message body:** apague o conteúdo e cole o arquivo `recuperar-senha.html` inteiro.
- Salve.

O botão do e-mail aponta para `/redefinir-senha?token_hash=…`. O token só é usado quando a pessoa salva a senha nova,
então os robôs de segurança do Outlook/Gmail que "pré-abrem" links não queimam o link.

## 3. Aviso "Senha alterada"

**Authentication → Emails → Security notifications** (em alguns painéis aparece como **Notifications**):

- Ligue **Password changed**.
- **Subject:** `Sua senha da Tipe foi alterada`
- **Message body:** cole o arquivo `senha-alterada.html`.

## 4. Validade e limites

- **Authentication → Providers → Email → Email OTP Expiration:** `3600` (1 hora; é o que as telas e o e-mail dizem).
- **Authentication → Rate Limits:** deixe "Rate limit for sending emails" em pelo menos `30` por hora (com o SMTP do Resend).
- **Authentication → Providers → Email → Minimum password length:** `10`, com "letters and digits" (regra do PR #77).

O site já limita sozinho: 5 pedidos por IP a cada 15 minutos e 3 por e-mail por hora, com resposta neutra
(nunca diz se o e-mail tem conta).

## 5. Testar

1. Abra `https://tipe.robertoalencar.workers.dev/entrar` e toque em **Esqueci a senha**.
2. Peça o link para o seu e-mail, abra o e-mail "Sua nova senha da Tipe" e toque em **Criar nova senha**.
3. Crie a senha e confira que chega o aviso "Sua senha da Tipe foi alterada".
4. Abra o mesmo link de novo: a tela precisa dizer que o link não vale mais.

As imagens dos e-mails ficam em `https://tipe.robertoalencar.workers.dev/email/` (publicadas junto com o site).
Depois da troca do DNS para a Cloudflare, dá para trocar esse endereço por `https://tipe.digital/email/` nos dois modelos.
