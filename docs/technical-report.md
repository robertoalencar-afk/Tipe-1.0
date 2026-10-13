# Relatório técnico — TIPE 2.0 (fase 1)

Data: 13/10/2026. Base: commit `5f1c36f`. Nenhuma funcionalidade existente foi removida; nenhuma arquitetura foi trocada.

## 1. Decisões de arquitetura

1. **Toda divisão vira frações de item.** Partes iguais, valor livre e percentual são convertidos em frações dos itens em aberto (`planShare`). Assim continuam valendo, sem mudar nada no banco: o servidor calcula o valor, o banco reserva com bloqueio de linha e ninguém paga o que já foi pago.
2. **Arredondamento cumulativo por item.** O valor de uma fração é `centavos(preço × (consumido + fração)) − centavos(preço × consumido)`. A soma das partes de um item é sempre exatamente o valor do item. Mesma função no navegador e no servidor.
3. **Uma única regra de liquidação.** Criação do pagamento, webhook da TIPE, webhook do restaurante e reconciliador chamam `applyProviderOrder` → `decideSettlement` (pura, testada) → funções idempotentes do banco. A fonte da verdade continua sendo o pedido **reconsultado** no provedor.
4. **Estorno não reabre a conta automaticamente.** A mesa pode já ter fechado; cobrar de novo é decisão do restaurante. O estorno vira status `refunded`/`chargeback`, entra na auditoria e abre uma pendência no caixa.
5. **Contrato de PDV mantido**, com dois métodos opcionais (`fecharConta`, `listarGarcons`) e a correspondência com os nomes do briefing documentada em `pdv/contract.ts`.

## 2. Arquivos

### Novos
| Arquivo | Função |
|---|---|
| `src/lib/tipe/bill-math.ts` | matemática da conta compartilhada (centavos exatos, `planShare`) |
| `src/lib/tipe/payment-state.ts` | máquina de estados e `decideSettlement` |
| `src/lib/tipe/payment-settlement.server.ts` | aplica a decisão no banco; localiza pagamento inclusive em `archived_payments`; extrai o id do pedido de qualquer formato de webhook |
| `src/lib/tipe/incidents.functions.ts` | leitura e resolução de pendências (cliente do usuário, sob RLS) |
| `src/routes/api/public/payments.reconcile.ts` | rotina de reconciliação (mesma autenticação de `/api/public/pdv/sync`) |
| `src/components/tipe/DividirConta.tsx` | partes iguais / valor / porcentagem na conta do cliente |
| `src/components/tipe/PendenciasFinanceiras.tsx` | aviso no painel e lista com registro de resolução no Caixa |
| `src/lib/tipe/pdv/contract.ts` | correspondência de operações, conformidade de adaptador, espera entre tentativas de baixa |
| `src/lib/tipe/pdv/adapters/demo.server.ts` | PDV fictício em memória para testes (**não registrado**) |
| `drizzle/migrations/0020_founder_scope.sql` | founder sem acesso operacional pelo papel global |
| `src/lib/tipe/simulation.test.ts` | testes da trava de simulação |
| `drizzle/migrations/0019_payment_reversals_incidents.sql` (+ journal/snapshot) | estados de estorno, `payment_incidents`, funções do provedor, arquivo com id do pedido |
| `tests/db/*` | harness PostgreSQL e cenários do banco |
| `docs/*` | este e os demais relatórios |

### Alterados
| Arquivo | Mudança |
|---|---|
| `src/lib/tipe/payments.functions.ts` | sem aprovação simulada fora de teste; Pix pendente reconsultado enquanto o cliente espera; subtotal com arredondamento cumulativo; resultado do pedido passa por `applyProviderOrder`; tipos de status ampliados |
| `src/routes/api/public/pagarme/webhook.ts` | aceita `order.*`, `charge.*`, `chargeback.*`; só trata gorjetas (alvo `tipe`) |
| `src/routes/api/public/pagarme/restaurante.$slug.ts` | idem; confere que o pedido é do restaurante, inclusive em mesa reaberta |
| `src/lib/tipe/pagarme.server.ts` | tipo do pedido com `amount`/`paid_amount`; `simulatedPaymentsAllowed`, `usableBillMethods` |
| `src/lib/tipe/pdv.functions.ts` | conta pública só oferece meios digitais com Pagar.me ativa (ou simulação ligada) |
| `src/lib/tipe/staff.functions.ts` | cadastro de restaurante pelo Backoffice via servidor, com registro de segurança |
| `src/lib/tipe/pdv-integrations.functions.ts` | founder com 2FA configura integração pelo servidor |
| `src/routes/$restaurante.$mesa.tsx` | `DividirConta`, saldo restante da mesa, status "Estornado/Contestado" |
| `src/components/tipe/RestaurantPanel.tsx` | aviso de pendências e lista no Caixa |
| `src/components/tipe/Recebimentos.tsx` | instrução de webhook inclui eventos de contestação |
| `src/lib/tipe/rules.ts` | `splitTip`/`splitGorjeta` exatos ao centavo |
| `src/lib/tipe/pdv/types.ts` | métodos opcionais `fecharConta`, `listarGarcons` |
| `src/routeTree.gen.ts` | rota do reconciliador (o plugin do roteador regenera igual no build) |

## 3. Banco (migração 0019)

| Objeto | Tipo | Acesso |
|---|---|---|
| `table_payment_requests.status` | check ampliado: `refunded`, `chargeback` | — |
| `archived_payments.provider`, `.provider_order_id` + índice | colunas | — |
| `archive_and_reopen_table` | função recriada, agora copia o pedido do provedor | igual à anterior |
| `payment_incidents` | tabela com RLS; uma pendência aberta por pagamento e tipo | SELECT: dono/caixa |
| `record_payment_incident(uuid, text, text)` | função | só `service_role` |
| `provider_reverse_payment(text, text)` | função | só `service_role` |
| `resolve_payment_incident(uuid, text)` | função; exige observação | dono/caixa |

A migração é idempotente (reaplicada sem erro no teste).

## 4. Endpoints

| Endpoint | Método | Autenticação | Efeito |
|---|---|---|---|
| `/api/public/payments/reconcile` | POST | `Bearer LOVABLE_CRON_SECRET` | até 40 pendentes por rodada: libera reservas órfãs (> 20 min), reconsulta o provedor, abre pendência após 2 h |
| `/api/public/pagarme/webhook` | POST | Basic (`PAGARME_WEBHOOK_SECRET`) | + estornos e contestações de gorjetas |
| `/api/public/pagarme/restaurante/$slug` | POST | Basic (token do restaurante) | + estornos e contestações das contas |

## 5. Para colocar no ar

1. Aplicar as migrações 0019 e 0020 (sincronização do Lovable).
   - Se algum ambiente de teste/demonstração depende de pagamentos simulados, defina nele `TIPE_ALLOW_SIMULATED_PAYMENTS=true`. Em produção, não defina.
2. **Agendar** `POST /api/public/payments/reconcile` a cada 5 minutos, como já é feito com `/api/public/pdv/sync`.
3. Em cada conta Pagar.me (TIPE e restaurantes), marcar também os eventos de **contestação** (`chargeback.*`).
4. Rodar `npm i && npx vitest run && npx tsc --noEmit && npm run build`.
