# E-mails da Tipe (Supabase Auth + site)

## E-mails de conta (Supabase Auth)

Gerados por `scripts/emails/gerar-emails-auth.mjs` em `supabase/templates/` (lista e assuntos em `auth-emails.json`):

| Arquivo | Painel do Supabase | Para quem |
|---|---|---|
| confirmar-cadastro.html | Confirm signup | dono que cria conta |
| convite.html | Invite user | garçom/equipe convidados pelo restaurante |
| link-magico.html | Magic link | quem entra sem senha |
| trocar-email.html | Change email address | quem troca o e-mail |
| reautenticacao.html | Reauthentication | código para ação sensível |
| recuperar-senha.html | Reset password | esqueci a senha |
| senha-alterada, email-alterado, 2fa-ativado, 2fa-removido | Security notifications | avisos automáticos |

Para mudar texto: edite o gerador, rode `node scripts/emails/gerar-emails-auth.mjs` e faça commit dos HTML.

### Aplicação automática

`scripts/emails/aplicar-emails-auth.mjs` envia tudo pela Management API (assuntos, modelos, avisos,
Redirect URLs, validade de 1 h e senha mínima de 10). Roda no workflow **Publicar** a cada publicação,
se existir o segredo `SUPABASE_ACCESS_TOKEN` (GitHub → Settings → Secrets and variables → Actions).
Sem o segredo, só avisa. Com `RESEND_API_KEY` e o domínio tipe.digital verificado no Resend, também liga o SMTP
(remetente `Tipe <noreply@tipe.digital>`); sem isso, o Supabase segue com o servidor padrão (poucos e-mails por hora).

Rodar à mão: `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/emails/aplicar-emails-auth.mjs`.

## E-mails do site (Resend)

`src/lib/email-templates/` usa a moldura `moldura.tsx` (mesmo visual): pedido de demonstração, comprovante,
chave Pix nova, avisos internos. Prévia: `bun scripts/emails/previa.tsx pasta-saida`.
Só saem quando `RESEND_API_KEY` estiver configurada.
