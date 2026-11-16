# Caixa de e-mail da Central (roberto@ e contato@tipe.digital)

Recebe pelo Cloudflare Email Routing, envia pelo Resend, tudo dentro da Central > Comunicação > Caixa de e-mail.

```
Remetente -> MX Cloudflare -> Email Routing -> Worker (email-worker/) -> POST /api/public/email-inbound (HMAC) -> mail_messages
Central (Escrever/Responder) -> Resend API -> destinatário          (grava em Enviados + atividade no lead)
```

Nada é enviado sozinho: só quando o fundador aperta Enviar. Corpo sempre exibido como texto puro.

## Passos do Roberto (nada disso foi feito pelo código)

1. **Migração 0071** aplicada (vai junto com o merge em main).
2. **Segredo**: gerar um valor longo e aleatório (`openssl rand -hex 32`). Guardar como `EMAIL_INBOUND_SECRET` no Worker do site (Cloudflare > Workers > tipe > Settings > Variables) **e** no Worker de e-mail (`wrangler secret put EMAIL_INBOUND_SECRET` dentro de `email-worker/`). Nunca no código.
3. **Worker de e-mail**: `cd email-worker && bun install && bunx wrangler deploy`. `APP_URL` em `wrangler.jsonc` deve ser o endereço do site.
4. **Cloudflare > tipe.digital > Email > Email Routing**: ativar. Cloudflare cria os registros MX e SPF.
   - **Atenção:** trocar o MX desliga o recebimento atual (Zoho). Faça só depois do passo 3 e avise antes. Confirme que não há e-mail importante pendente no Zoho.
5. Em **Routing rules** criar duas regras "Send to a Worker" (Worker do passo 3): `roberto@tipe.digital` e `contato@tipe.digital`. Opcional: catch-all para o mesmo Worker; endereços fora das duas caixas são descartados pelo servidor.
6. **Resend**: domínio `tipe.digital` verificado (SPF + DKIM). O domínio pode já estar verificado pela thread de e-mails personalizados; não duplique registros. `RESEND_API_KEY` já existe no site.
7. Teste: mande um e-mail de fora para contato@; ele aparece em Caixa de entrada em até 1 min. Responda pela Central.

## Segurança

- Entrada: assinatura HMAC-SHA256 de `timestamp.corpo`, janela de 5 min, comparação em tempo constante.
- Leitura: só founder com 2FA (RLS + `requireFounder2fa`). Tabelas sem acesso para anon/authenticated além do SELECT do founder.
- SPF/DKIM/DMARC reprovados na origem vão para Spam.
- Anexos: apenas nome e tamanho são guardados; o conteúdo não.
