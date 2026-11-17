# Caixa de e-mail da Central (roberto@ e contato@tipe.digital)

Recebe pelo Cloudflare Email Routing, envia pelo Resend, tudo dentro da Central > Comunicação > Caixa de e-mail.

```
Remetente -> MX Cloudflare -> Email Routing -> Worker (email-worker/) -> POST /api/public/email-inbound (HMAC) -> mail_messages
Central (Escrever/Responder) -> Resend API -> destinatário          (grava em Enviados + atividade no lead)
```

Nada é enviado sozinho: só quando o fundador aperta Enviar. Corpo sempre exibido como texto puro.

## Passos do Roberto (nada disso foi feito pelo código)

1. **Migração 0075** aplicada (vai junto com o merge em main).
2. **Segredo e Worker de e-mail: automático.** A publicação do site (deploy.yml) já publica o Worker `tipe-email` e grava o mesmo `EMAIL_INBOUND_SECRET` nos dois Workers (derivado do `CRON_SECRET` por HMAC; para usar outro valor, crie o segredo `EMAIL_INBOUND_SECRET` no ambiente `producao` do GitHub). Nada a fazer aqui.
3. (feito pela publicação, ver o passo 2.)
4. **Cloudflare > tipe.digital > Email > Email Routing**: ativar. Cloudflare cria os registros MX e SPF.
   - **Atenção:** trocar o MX desliga o recebimento atual (Zoho). Faça só depois do passo 3 e avise antes. Confirme que não há e-mail importante pendente no Zoho.
5. Em **Routing rules** criar duas regras "Send to a Worker" (Worker do passo 3): `roberto@tipe.digital` e `contato@tipe.digital`. Opcional: catch-all para o mesmo Worker; endereços fora das duas caixas são descartados pelo servidor.
6. **Resend**: domínio `tipe.digital` verificado (SPF + DKIM). O domínio pode já estar verificado pela thread de e-mails personalizados; não duplique registros. `RESEND_API_KEY` já existe no site.
7. Teste: mande um e-mail de fora para contato@; ele aparece em Caixa de entrada em até 1 min. Responda pela Central.

## E-mails de funcionários e assinaturas

- Em Central > Administração > Equipe interna, ao criar o membro (setores com Comunicação: comercial, vendas, marketing, atendimento) dá para criar também `nome@tipe.digital`. O membro vê só a própria caixa e as caixas do setor (contato@ para comercial, vendas e atendimento); nunca roberto@.
- **Recebimento de caixas novas:** no Cloudflare Email Routing, deixe a regra **catch-all** apontando para o Worker `tipe-email`. Assim qualquer `nome@tipe.digital` criado na Central passa a receber sem nova regra. O servidor descarta o que não tem caixa cadastrada.
- **Envio** usa o domínio já verificado no Resend; nada a cadastrar por pessoa.
- Assinaturas: roberto@ e contato@ já vêm prontas (nome, cargo, contatos, filete turquesa). Edite em Caixa de e-mail > Assinatura; a prévia mostra como sai. O fundador edita qualquer uma; cada membro edita só a da própria caixa.

## Segurança

- Entrada: assinatura HMAC-SHA256 de `timestamp.corpo`, janela de 5 min, comparação em tempo constante.
- Leitura: só founder com 2FA (RLS + `requireFounder2fa`). Tabelas sem acesso para anon/authenticated além do SELECT do founder.
- SPF/DKIM/DMARC reprovados na origem vão para Spam.
- Anexos: apenas nome e tamanho são guardados; o conteúdo não.
