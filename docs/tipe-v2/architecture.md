# Arquitetura da Tipe 2.0

Princípio: **evoluir a stack atual**, sem migrar e sem microsserviços. Um monólito TanStack Start + Postgres (Supabase) com RLS já resolve multi-tenant, tempo real e autenticação; o que falta é organizar os domínios e fechar as lacunas de pagamento, pedido e integração.

## 1. Visão em camadas

```
Navegador (cliente sem login · equipe logada · backoffice com 2FA)
   │  React 19 + React Query · Realtime (Supabase) · Web Push (PR #19)
   ▼
Servidor TanStack Start (funções de servidor tipadas, rotas /api/public/*)
   │  security.server.ts (sessão da mesa, limite de taxa, eventos de segurança)
   │  domínios: pagamentos · pedidos · cozinha · equipe · relatórios · lebre · pdv
   ▼
Postgres (Supabase) com RLS por restaurante
   │  RPCs SECURITY DEFINER para tudo que mexe em dinheiro (register_table_payment,
   │  provider_settle_payment, resolve_table_payment, provider_reverse_payment)
   │  outbox de baixa no PDV · auditoria (payment_audit_log, security_events)
   ▼
Externos: Pagar.me (Pix, carteiras) · PDVs (adaptadores) · e-mail · IA do Lovable
```

## 2. Multi-tenant e permissões

- **Tenant = restaurante** (`restaurants`), com papéis em `public.user_roles` e funções `has_restaurant_role`, `is_restaurant_member` sem atalho para o fundador (migração 0020).
- **Unidades** (fase 6): nova entidade `restaurant_groups` acima de `restaurants`; papel `group_manager` lê relatórios de todas as unidades do grupo; RLS por `group_id`. Não muda o modelo de pagamento, que continua por restaurante.
- **Perfis**: cliente (sem login, só sessão da mesa), garçom, cozinha, caixa, gerente, dono; backoffice Tipe separado (papel `founder` + 2FA, só agregados).
- A demonstração usa a mesma tabela de permissões em código (`can(role, permission)` em `src/lib/tipe/demo/engine.ts`); a versão real dessa tabela vai para o banco quando os perfis "cozinha" e "gerente" forem criados.

## 3. Domínios

| Domínio | Hoje | Tipe 2.0 |
|---|---|---|
| Conta e pagamento | `payments.functions.ts`, `bill-math.ts`, `payment-state.ts`, RPCs | + divisão por lugar (`seat` no item do pedido), carteiras via Pagar.me, estorno iniciado pelo painel |
| Pedidos | Lançamento TIPE; colibri #6–#9 | Uma só entrada de pedido (`pdv_ingest_event`) para QR, garçom, totem e PDV externo, com chave idempotente |
| Cozinha | KDS por item / por pedido (#6) | Estação por item do cardápio, alerta de atraso configurável, painel de senhas |
| Equipe | Área do garçom, avisos (#13, #17), push (#19) | Pedido de estorno com aprovação, desempenho individual |
| Relatórios | `getReports`, fechamento do dia, CSV (#18) | Turnos, unidades, conciliação com recebíveis |
| IA (Lebre) | Teto atômico de custo (`lebre_consume`), propostas tipadas | Resumo diário, explicação da conciliação, respostas a avaliações. **Nunca decide valores** |
| PDV | contrato + 2 adaptadores + outbox | adaptador por fornecedor brasileiro (ver `integration-plan.md`) |

## 4. Dinheiro: regras que não mudam

1. O navegador nunca decide valor nem status: o servidor recalcula com `bill-math.ts` e a taxa vem só de `restaurants.service_rate`.
2. Toda cobrança reserva frações de item com trava de linha **antes** de chamar o provedor; a idempotência é por chave única por restaurante.
3. A baixa só acontece por `provider_settle_payment` depois de **buscar de novo o pedido no provedor** (o webhook não é confiável sozinho).
4. Eventos repetidos, atrasados ou fora de ordem passam por `decideSettlement` (função pura e testada); divergência vira `payment_incidents`.
5. Estorno não reabre itens da conta; a mesa reaberta arquiva pagamentos em `archived_payments`.

O motor da demonstração (`src/lib/tipe/demo/engine.ts`) reproduz essas regras em memória (reserva, idempotência, evento de provedor repetido, valor divergente para conferência, estorno sem reabrir) e usa o mesmo `bill-math.ts`. Isso permite validar a jornada inteira sem tocar no banco.

## 5. Tempo real, assíncrono e confiabilidade

- **Tempo real**: Supabase Realtime no painel e no garçom; a conta do cliente consulta a cada 5 s (trocar por Realtime é P2).
- **Assíncrono**: rotinas por cron do Lovable (`/api/public/pdv/sync`, `/api/public/payments/reconcile`) autenticadas por segredo; outbox com retentativa para o PDV.
- **Webhooks**: Pagar.me por restaurante (`/api/public/pagarme/restaurante/$slug`), sempre com nova consulta do pedido; PDV por adaptador (`/api/public/pdv/$adapter/webhook`) com id de evento idempotente.
- **Observabilidade**: `security_events`, `payment_audit_log`, CSP com relatório, alertas por e-mail agrupados. Falta: painel de erros por restaurante (P2).

## 6. Demonstração (`/demo`)

- Rota pública `/demo` (sem índice de busca), estado no `localStorage` do navegador, sincronizado entre abas por `BroadcastChannel` e serializado por **Web Locks** (`navigator.locks`), para que duas abas pagando ao mesmo tempo se comportem como dois celulares na mesma mesa.
- Nunca lê nem grava dados de restaurante, como o `/simulador` (regra do AGENTS.md).
- Arquivos: `src/lib/tipe/demo/engine.ts` (regras puras), `store.ts` (navegador), `src/components/tipe/demo/*` (telas), `src/routes/demo.tsx`.
