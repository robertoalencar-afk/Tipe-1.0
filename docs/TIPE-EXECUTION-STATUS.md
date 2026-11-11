# Status de execução da Tipe
Atualizado em: 2026-10-16 · Branch: `docs/backlog-unico` · Base: `main` em `05d7137`

Prompt que orienta a execução: `execucao-integral-tipe-v2.md` (pasta `prompts/` do projeto).

## Fase atual e próxima tarefa
Tarefa 1 concluída do lado técnico: o PR #5 (redesign) entrou no `main` em 15/10; os PRs #6 a #9 (colibri) já trazem o redesign, passam em build, tipos, vitest e testes do banco, e aguardam revisão e merge na ordem #6 → #7 → #8 → #9.

Tarefa 2 entregue: `docs/TIPE-BACKLOG.md`, com o estado de cada funcionalidade no código e a evidência em arquivo:linha.

Próxima tarefa: aplicar o design system às telas da colibri (balcão, KDS, senhas, garçom, pedido da mesa, totem) quando os PRs #6 a #9 estiverem no `main`. Sem esperar por eles, a primeira entrega da Fase 2 do backlog é F2.2 (lançamento idempotente).

## Inventário de branches e PRs (15/10/2026)
| Branch | Situação | Ação |
|---|---|---|
| `main` (`05d7137`) | produção, sincronizada com o Lovable | base |
| `tipe-2.0-pagamento-na-mesa` | já incorporada (PR #2) | nenhuma |
| `tipe-2.0-fase-2` | já incorporada (PR #3) | nenhuma |
| `redesign-premium` (`0b5f313`) | integrada pelo PR #5 | no `main` desde 15/10 |
| `colibri/fase-1-balcao-kds-senhas` (`931d3cb`, PR #1) | integrada em 4 partes, migrações renumeradas para 0023–0025 | PRs #6 a #9 aguardando revisão; PR #1 fica como referência |
| `research/us-benchmark-pdv-erp` (`707cdb9`, PR #4 rascunho) | só documentação | segue pelo próprio PR |

## Concluído
- Merge do `redesign-premium` sobre o `main` atual, com build, tipos e testes verdes (PR #5).
- Merge das quatro partes da `colibri` com migrações renumeradas e testes do banco novos (PRs #6 a #9).

- Backlog único em `docs/TIPE-BACKLOG.md` (Tarefa 2), com 64 itens distribuídos pelas 8 fases.

## Em andamento
- Revisão dos PRs #6 a #9.

## Pendente
- Aplicar o design system às telas da `colibri` (balcão, KDS, senhas, garçom, totem) depois que os dois lados estiverem no `main`.

## Bloqueado
Nada no momento.

## Decisões humanas pendentes
1. Aprovar e fazer merge dos PRs #6 a #9 (balcão, KDS, senhas, garçom, pedido da mesa e totem entram em produção).
2. Cartão na conta, Apple Pay e Google Pay; cashback; preços públicos; caixinha; primeiro adaptador de PDV: não tocados.

## Migrações criadas
| Número | Origem | Objetivo | Reversão |
|---|---|---|---|
| 0023_counter_sales_kds_ticket_board | colibri 0019 | balcão com senha, KDS por pedido, painel de senhas | aditiva; reverter removendo funções, gatilho, colunas novas de `pdv_orders` e `order_display_tokens` |
| 0024_customer_self_order | colibri 0020 | pedido do cliente pela mesa | aditiva; remover `pdv_customer_order` e `restaurants.self_order_enabled` |
| 0025_self_service_totem | colibri 0021 | totem de autoatendimento | aditiva; remover três funções, `totem_tokens` e `restaurants.totem_enabled` |

As três reaplicam sem erro sobre o esquema atual (`tests/db/run.sh`). O Lovable aplica `drizzle/migrations` pelo `_journal.json`; cada entrada nova tem data posterior à 0022.

## Testes executados
| Comando | Resultado |
|---|---|
| `bunx tsc --noEmit` | sem erros |
| `bunx vitest run` | 8 arquivos, 81 testes, todos passando |
| `bun run build` | build concluído (nitro) |
| `bun run lint` | falha com cerca de 6.100 erros que já existem no `main`, quase todos de formatação (prettier) e `no-explicit-any` em arquivos que este PR não altera; nenhum erro novo nos arquivos resolvidos |

`tests/db/run.sh` (PostgreSQL 16 local descartável) passou em todos os cenários, incluindo os novos `balcao.sql`, `garcom.sql`, `pedido-mesa.sql` e `totem.sql` (49 cenários novos).

O fluxo do cliente não foi aberto num navegador: ele depende do Supabase do Lovable Cloud, que não está acessível nesta sessão. Conferir no preview do Lovable depois do merge.

## Conflitos resolvidos e decisões técnicas
| Arquivo | `main` trazia | `redesign-premium` trazia | Decisão |
|---|---|---|---|
| `src/routes/$restaurante.$mesa.tsx` (import) | `suggestedTips` | import sem `suggestedTips` | manter `suggestedTips` |
| idem, tela "conta confirmada" | comprovante opcional por e-mail; `ultimoPagamento` como id do pagamento | resumo do recibo em lista; `ultimoPagamento` como objeto derivado | layout novo + formulário do comprovante; o objeto derivado virou `pagamentoRecibo`, buscado pelo id recém-criado e, na falta dele, pelo último aprovado da pessoa |
| idem, tela de gorjeta | sugestões em % do valor pago e "Outro valor" | botões fixos de R$ 5 a R$ 20 | visual novo com as sugestões em % e o campo "Outro valor"; mantida a explicação 70/30 |
| idem, tela final | convite para avaliar no Google | visual novo | visual novo + convite do Google |

Colibri: migrações renumeradas; `setItemStatus` saiu do import do painel porque a cozinha passou a usar o KDS por pedido; `getPublicTable` e o painel leem `self_order_enabled` e `totem_enabled` em consultas separadas, como o `main` já fazia com `google_review_url`, para a conta do QR não quebrar se o código chegar antes da migração.

## Dependências externas
- Lovable aplica as migrações de `drizzle/migrations` pelo `_journal.json` (`drizzle.config.ts` usa `LOVABLE_DB_MIGRATION_URL`).

## Pontos para decisão do usuário
- Quando um garçom lança pedido numa mesa, a mesa passa a ser dele e os 70% da gorjeta vão para quem lançou por último (regra do `pdv_launch_order`, já no `main`).
