# Tipe Reserva · mensagens ao cliente

Ligadas em 2026-11-16. Saem quando a equipe confirma, cancela ou chama a lista de espera, e quando a
equipe anota uma reserva já confirmada. Falha de envio nunca trava a ação: vira aviso no log.

| Quando | E-mail (Resend) | WhatsApp (Meta) |
|---|---|---|
| Reserva confirmada | sim | modelo `tipe_reserva_confirmada` |
| Reserva cancelada pelo restaurante | sim | modelo `tipe_reserva_cancelada` |
| Mesa livre da lista de espera | sim | modelo `tipe_reserva_espera_mesa` |
| Lembrete no dia | pendente (precisa de rotina agendada) | modelo `tipe_reserva_lembrete` |

O e-mail vai para o e-mail da conta do cliente. O WhatsApp vai para o telefone da reserva ou da conta.

## Onde cadastrar as chaves (nunca no chat)

GitHub → repositório Tipe-1.0 → Settings → Environments → **producao**.

Em **Secrets**:
- `RESEND_API_KEY` (já existe)
- `WHATSAPP_TOKEN`: token permanente do usuário do sistema (Meta Business → Usuários do sistema)
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número (WhatsApp → Configuração da API)
- `WHATSAPP_APP_SECRET` e `WHATSAPP_VERIFY_TOKEN`: do webhook da Central

Em **Variables**:
- `WHATSAPP_RESERVA_MODELOS` = `aprovados`, só depois que a Meta aprovar os 4 modelos abaixo

Depois disso, rode o Publicar uma vez (ou espere o próximo merge).

## Modelos para cadastrar na Meta (categoria Utilidade, idioma pt_BR)

- `tipe_reserva_confirmada`: Oi, {{1}}! Sua mesa no {{2}} está confirmada: {{3}}, {{4}}, {{5}}. Código {{6}}.
- `tipe_reserva_lembrete`: {{1}}, lembrete da sua reserva hoje às {{2}} no {{3}}, {{4}}. Não vai dar? Cancele pelo app.
- `tipe_reserva_cancelada`: {{1}}, sua reserva {{2}} no {{3}} ({{4}}, {{5}}) foi cancelada.
- `tipe_reserva_espera_mesa`: {{1}}, abriu mesa no {{2}} às {{3}} para {{4}}. Confirme no app em até {{5}} minutos.

As variáveis seguem `PARAMETROS` em `src/lib/tipe/guest/mensagens.ts`.
