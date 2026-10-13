# Relatório de testes — TIPE 2.0

Data: 13/10/2026. Todos os resultados abaixo foram **executados** nesta fase; o que não pôde ser executado está na seção 4.

## 1. Como reproduzir

```bash
# Testes de unidade (no projeto, com dependências instaladas)
npx vitest run

# Cenários do banco contra um PostgreSQL 15+ local e descartável
PGHOST=/caminho/do/socket PGPORT=5432 PGUSER=postgres tests/db/run.sh
```

## 2. Resultados

### 2.1 Unidade — 63 testes, 63 passaram

Executados com o executor nativo do Node 22 (`node --test`) e um adaptador mínimo da API do vitest, porque o registro npm estava bloqueado neste ambiente. Os arquivos são vitest padrão e rodam sem mudança com `npx vitest run`.

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/lib/tipe/bill-math.test.ts` | 15 | arredondamento cumulativo; divisão igual, valor livre, percentual; três pagadores mistos; concorrência |
| `src/lib/tipe/payment-state.test.ts` | 19 | máquina de estados; webhook duplicado e fora de ordem; estorno; contestação; valor divergente; pagamento após liberação |
| `src/lib/tipe/pdv/contract.test.ts` | 8 | contrato de PDV com adaptador fictício: assinatura de webhook, idempotência, fluxo conta → divisão → pagamento → baixa com falha e nova tentativa |
| `src/lib/tipe/simulation.test.ts` | 7 | simulação desligada por padrão; meios de pagamento visíveis sem Pagar.me |
| `src/lib/tipe/tips.test.ts` | 3 | divisão da gorjeta exata ao centavo em 100.000 valores |
| `src/lib/tipe/service-fee.test.ts` (existente) | 9 | taxa de serviço |
| `src/lib/tipe/mask.test.ts` (existente) | 2 | máscaras de CPF/Pix |

### 2.2 Banco — 47 verificações, 47 passaram

PostgreSQL 16 local, com **todas** as migrações do repositório (incluindo a nova 0019) e as funções reais de produção. Saída do `tests/db/run.sh`:

| Cenário do briefing | Verificação | Resultado |
|---|---|---|
| 1. Dois clientes pagando a mesma conta ao mesmo tempo | duas conexões simultâneas: uma reserva, a outra recebe "não está mais disponível"; reserva final = exatamente 1 conta | ✅ |
| 2. Três clientes pagando partes distintas | ⅓ + ⅓ + ⅓ da pizza e sucos: zero resíduo, três aprovados; quarto pagamento do mesmo item recusado | ✅ |
| 3. Um aprovado e um recusado | aprovado liquida; recusado libera a reserva | ✅ |
| 4. Webhook duplicado | segunda liquidação devolve `already`, valor pago não muda | ✅ |
| 5. Webhook fora de ordem | falha depois da aprovação é ignorada; continua aprovado | ✅ |
| 6. Aprovado com o celular desconectado | mesma chave de idempotência devolve o mesmo pagamento; um único registro | ✅ |
| 7. Falha do PDV depois da confirmação | baixa falha 2×, é refeita com espera crescente, não duplica, PDV fecha a conta (teste de unidade com PDV fictício) | ✅ |
| 8. Pagamento estornado | `refunded`, pendência aberta, auditoria; repetição ignorada; **estorno de mesa já reaberta encontrado no arquivo** | ✅ |
| 9. Item lançado durante o checkout | PDV lança café com pagamento pendente; evento repetido descartado; café continua a pagar | ✅ |
| 10. QR inválido ou expirado | **não automatizado nesta fase** (lógica existente em `getPublicTable`/`verifyTableSession`, não alterada) | — |
| 11. Acesso a comanda de outro restaurante | dono de outro restaurante não vê nem resolve pendências; anônimo sem acesso; usuário comum não chama funções do provedor | ✅ |
| Founder sem papel no restaurante (D4) | não tem papel de dono/caixa, não é membro, não lê pagamentos pela RLS; com papel explícito, o acesso volta | ✅ |
| 12. Gorjetas | divisão 70/30 exata em todos os centavos até R$ 1.000 | ✅ |
| 13. Arredondamento | ⅓ de R$ 10,00 em três partes = R$ 10,00 (antes R$ 9,99) | ✅ |
| 14. Falha de integração externa | PDV fora do ar (fictício) e provedor sem resposta (reconciliador conta `erro_provedor` e tenta na próxima rodada) | ✅ unidade / rota não executada |
| 15. Reprocessamento seguro | pedido desconhecido devolve `not_found`; pendência não duplica; tipo inválido recusado | ✅ |

### 2.3 Tipagem

- `tsc` 6, **modo estrito com as mesmas opções do projeto** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` etc.), nos módulos puros e testes: **0 erros**.
- Arquivos com React/TanStack/Supabase (`payments.functions.ts`, webhooks, reconciliador, componentes novos, página da mesa): checagem parcial com declarações vazias para as bibliotecas. Nenhum erro nos trechos alterados; os erros restantes vêm só das declarações vazias (genéricos em funções sem tipo).

## 3. Achados durante os testes
- O histórico de migrações não recria tabelas usadas em produção (`restaurant_leads`, `pdv_events` e outras). O harness completa a partir de `src/integrations/supabase/types.ts` (`tests/db/stubs.mjs`). Recomendo exportar o esquema real do Supabase para o repositório.
- A divisão 70/30 da gorjeta é calculada por gorjeta na tela do garçom e sobre a soma no saldo (`waiter_balance`). Diferenças de centavos entre a lista e o saldo são possíveis; o saldo do banco é o que vale para saque.

## 4. Não executado (e por quê)

| Item | Motivo | Como fechar |
|---|---|---|
| `vite build`, `eslint` do projeto, `tsc` completo, `vitest` com o pacote real | registro npm bloqueado pela política de rede desta sessão | rodar no Lovable ou localmente: `npm i && npx vitest run && npx tsc --noEmit && npm run build` |
| Teste de navegador da nova tela de divisão | sem build | testar no celular depois do merge (roteiro em `TIPE-INTERNATIONAL-BENCHMARK.md`) |
| Chamadas reais à Pagar.me (sandbox) | sem credenciais de teste nesta sessão | conectar uma conta de teste e rodar o reconciliador |
| Cenário 10 (QR inválido/expirado) automatizado | código não alterado; precisa de cliente Supabase | incluir na próxima rodada |
