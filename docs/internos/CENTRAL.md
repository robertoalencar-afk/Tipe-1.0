# Central Tipe (área do fundador)

Rota `/central` (`?s=seção&aba=&id=`). Substitui `/backoffice` e `/admin/leads` (redirecionam). Exige founder + 2FA (`FounderMfaGate`, `requireFounder2fa`).

- **Início**: KPIs reais, "Precisa da sua atenção", funil, série diária. GMV nunca é tratado como receita; receita Tipe = 30% das gorjetas (`TIP_SPLIT`) + assinaturas.
- **Comercial**: funil Kanban (10 etapas configuráveis), leads reais de `restaurant_leads`, tarefas, ficha única (histórico, vínculo com restaurante, checklist de implantação).
- **Comunicação**: WhatsApp (Cloud API oficial; webhook grava em `wa_conversations`/`wa_messages`, idempotente por `wa_message_id`; resposta só por clique, janela de 24 h) e histórico de e-mails (`email_log`, atualizado pelo webhook Resend assinado). Sem caixa de entrada de e-mail: não há domínio de recebimento.
- **Restaurantes**, **Financeiro**, **Inteligência** (Lebre do fundador com ferramentas fixas, sem SQL livre, só rascunhos; automações internas com log), **Administração** (auditoria, LGPD, dispositivos, lançamentos).

## Migração 0052 (não aplicada em produção)
Tabelas `crm_*`, `email_log`, `email_events`, `wa_*`, `implantation_steps`, `automation_*`, `founder_assistant_log`. RLS só founder + `mfa_if_enrolled`; escrita só via service_role após `requireFounder2fa`.

## Pendências de configuração (nada foi ligado)
`RESEND_WEBHOOK_SECRET` (+ endpoint `/api/public/resend/webhook`), `WHATSAPP_*` (Meta), aplicar 0052 após revisão.
