# Central Tipe (área do fundador)

Rota `/central` (`?s=seção&aba=&id=`). Substitui `/backoffice` e `/admin/leads` (redirecionam). Exige founder + 2FA (`FounderMfaGate`, `requireFounder2fa`).

- **Início**: KPIs reais, "Precisa da sua atenção", funil, série diária. GMV nunca é tratado como receita; receita Tipe = 30% das gorjetas (`TIP_SPLIT`) + assinaturas.
- **Comercial**: funil Kanban (10 etapas configuráveis), leads reais de `restaurant_leads`, tarefas, ficha única (histórico, vínculo com restaurante, checklist de implantação).
- **Comunicação**: WhatsApp (Cloud API oficial; webhook grava em `wa_conversations`/`wa_messages`, idempotente por `wa_message_id`; resposta só por clique, janela de 24 h) e histórico de e-mails (`email_log`, atualizado pelo webhook Resend assinado). Sem caixa de entrada de e-mail: não há domínio de recebimento.
- **Restaurantes**, **Financeiro**, **Inteligência** (Lebre do fundador com ferramentas fixas, sem SQL livre, só rascunhos; automações internas com log), **Administração** (auditoria, LGPD, dispositivos, lançamentos).

## Migração 0052 (estado original desta documentação)
Tabelas `crm_*`, `email_log`, `email_events`, `wa_*`, `implantation_steps`, `automation_*`, `founder_assistant_log`. RLS só founder + `mfa_if_enrolled`; escrita só via service_role após `requireFounder2fa`.

## Pendências de configuração (nada foi ligado)
`RESEND_WEBHOOK_SECRET` (+ endpoint `/api/public/resend/webhook`), `WHATSAPP_*` (Meta), aplicar 0052 após revisão.


## Operações e produto (integrado à Central)

`/central?s=operacoes`: acompanhamento de produtos, PRs, publicação, infraestrutura,
integrações, checklists e Tipe Pulse. O módulo usa o mesmo Shell e exige o mesmo
founder + aal2, inclusive em todas as funções do servidor. Leads, demonstrações e
reuniões continuam no CRM existente, acessível por atalhos; não há um segundo CRM.

- Cartões iniciais são referências datadas e não contam como registros salvos. O
  merge dos PRs #111, #113 e #114 foi consultado no GitHub em 11/11/2026; publicação
  e validação funcional ficam separadas e não são inferidas pelo merge.
- Edição de responsável, prioridade, ambiente, status, datas, referências,
  evidências, riscos, dependências, decisões, fases de entrega e checklist.
- Cada salvamento cria uma revisão imutável em `crm_activities` (`kind=system`,
  `meta.scope=central_operations_v1`), sem vínculo com lead ou restaurante. As
  tabelas e políticas da Central já existem; nenhuma nova migração é necessária.
- A chave primária de cada revisão deriva do identificador + versão. Dois envios
  concorrentes para a mesma versão não podem sobrescrever um ao outro: um falha
  com conflito. O histórico é paginado; restauração prepara uma nova edição e
  requer salvar. Registros antigos nunca são atualizados ou excluídos pelo módulo.
- Indicadores contam apenas o que foi salvo, com estado informado pelo fundador.
  Consultas falhas exibem erro, não um painel vazio tratado como sucesso.
- Não há chamadas ao GitHub, Cloudflare ou Supabase Management em tempo de uso.
  Nenhum botão faz merge, publica versão, aplica migração ou altera configurações.
  URLs exigem http/https sem usuário/senha; padrões de credenciais são rejeitados
  no servidor. Nunca colar segredos, tokens de pulseira ou links privados de conta.
- Em Pulse, criar um registro por lote ou ocorrência: quantidade, numeração,
  fornecedor, chip, compatibilidade e resultados de leitura nas observações.
  Vincular e bloquear pulseiras reais continua no fluxo operacional existente.

### Validação mínima

1. Usuário sem founder ou sessão aal1 não pode ler nem salvar operações.
2. Abrir Operações e produto; confirmar referências iniciais e indicadores sem
   misturar cards não salvos com dados efetivamente registrados.
3. Salvar um registro; recarregar em outra sessão e conferir persistência e autor.
4. Editar a mesma versão em duas sessões: a segunda recebe conflito.
5. Abrir histórico, preparar restauração, cancelar e confirmar ausência de mudança.
6. Registrar checklist e evidência; conferir separação entre merge e validação.
7. Testar filtros, referência por URL, atalhos para CRM e navegação no celular.
8. Confirmar que Tipe Reserva segue Em breve e que nenhum controle executa deploy.

Verificação de 11/11/2026: a tabela e as políticas de `crm_activities` já existem em produção. O banco do painel independente não tinha registros salvos a transferir.

O painel independente de ChatGPT Sites foi retirado de operação: GET redireciona
à Central oficial e `/api/*` ou métodos de escrita retornam HTTP 410. Seu banco e
as versões de código foram preservados para evitar perda de registros existentes.
