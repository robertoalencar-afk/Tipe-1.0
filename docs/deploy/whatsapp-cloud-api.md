# Ativar o WhatsApp oficial na Central Tipe

## Estado e escopo

O código de produção já contém o envio pela Cloud API e o webhook da Central:

- Endpoint público: `https://tipe.digital/api/public/whatsapp/webhook`
- GET valida o desafio de inscrição da Meta com `WHATSAPP_VERIFY_TOKEN`.
- POST valida `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET` e grava mensagens e status em `wa_conversations` e `wa_messages`.
- As respostas da equipe usam `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`.

A presença dos segredos no GitHub, por si só, não confirma uma conexão ativa. Considere a integração concluída apenas depois que a Meta aceitar o callback e uma mensagem real de entrada aparecer na Central.

## Segredos

No repositório **Settings → Environments → producao**, mantenha estes segredos (os valores nunca devem ser versionados nem incluídos em PRs):

| Segredo | Origem/uso |
| --- | --- |
| `WHATSAPP_TOKEN` | Token de acesso do usuário do sistema Meta, com os escopos de WhatsApp necessários |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número registrado na Cloud API |
| `WHATSAPP_APP_SECRET` | Segredo do app usado para validar a assinatura dos POSTs |
| `WHATSAPP_VERIFY_TOKEN` | Texto aleatório definido pela equipe e compartilhado com a configuração do webhook da Meta |

O valor de um segredo salvo não pode ser consultado no GitHub. Para trocar o token de verificação, defina um valor novo no GitHub e use exatamente o mesmo valor no formulário da Meta. Nunca cole tokens, app secret, códigos de autenticação ou dados de clientes em commits, PRs ou conversas.

## Deploy

O workflow **Publicar** só executa migrações e publica a aplicação quando a variável de repositório `TIPE_PRODUCTION_READY` é `true`. Esse sinal habilita o deploy completo da aplicação em produção; não é um interruptor exclusivo do WhatsApp. Com a variável ausente ou falsa, a etapa de publicação é ignorada.

Antes de habilitar esse sinal ou executar o workflow em `main`, revise o go-live e os testes da produção descritos em [README de deploy](./README.md). Depois da publicação, confirme o sucesso do workflow e teste `https://tipe.digital`.

## Configuração na Meta

No app Meta dedicado ao WhatsApp:

1. Em **Webhooks**, escolha o objeto **WhatsApp Business Account**.
2. Informe o callback `https://tipe.digital/api/public/whatsapp/webhook`.
3. Informe o mesmo valor de `WHATSAPP_VERIFY_TOKEN` salvo no ambiente `producao` e conclua a verificação do callback.
4. Assine o campo `messages` para a conta do WhatsApp Business que contém o número.
5. Confirme que o app e o usuário do sistema têm acesso à conta e ao número corretos.
6. Complete as etapas de publicação, análise ou verificação que o painel da Meta exigir para tráfego de produção.

Não marque a integração como ativa se a Meta ainda mostrar apenas webhooks de teste ou se a verificação do callback falhar.

## Validação ponta a ponta

1. No painel da Meta, confirme o callback e a assinatura de `messages`.
2. Envie uma mensagem de um número externo para o número comercial.
3. Confirme que a conversa e a mensagem aparecem em **Central → Comunicação → WhatsApp** e que o webhook registra status sem duplicar mensagens reenviadas pela Meta.
4. Responda pela Central dentro da janela de atendimento permitida. Mensagens iniciadas pela empresa fora dessa janela exigem um modelo aprovado.
5. Verifique os logs do workflow e do Worker se a verificação, persistência ou resposta falhar.

A variável `WHATSAPP_RESERVA_MODELOS` controla envios de modelos da funcionalidade de reservas. Só a defina como `aprovados` depois da aprovação dos modelos correspondentes na Meta; isso não é necessário para validar a caixa de entrada da Central.
