# Roteiro de implementação

Ordem pensada para entregar incrementos que rodam, reaproveitando os PRs já abertos. Cada fase termina com testes e um PR rascunho; nada vai para o `main` (que publica no Lovable) sem o Roberto aprovar.

| Fase | Conteúdo | Reaproveita | Estado (20/10) |
|---|---|---|---|
| 0 Auditoria | Ferramentas, repositório, matriz Sunday, arquitetura, plano | `sunday-analise/`, PR #4, #14 | **Feita** (este diretório) |
| 1 Base | Design system único, navegação por perfil, tabela de permissões, demonstração | `ds.tsx`, PR #10 | **Demonstração feita** (`/demo`); fonte única depende do #10 |
| 2 Tipe Pay | Carteiras no servidor, divisão por lugar real, gorjeta antes do pagamento (A/B) | `bill-math.ts`, PR #12, #16 | Motor e telas validados na demonstração; produção depende da Pagar.me e do merge do #12 |
| 3 Order + Kitchen | Integrar colibri #6–#9; alérgenos/adicionais/lugar no banco; estações e atraso | PR #6–#9 | Validado na demonstração; integração pendente de merge |
| 4 Staff | Integrar #13, #17, #19; estorno pedido pelo garçom | PR #13, #17, #19 | Validado na demonstração |
| 5 Restaurant | #15, #18; turnos; conciliação com recebíveis Pagar.me | PR #15, #18 | Motor de conciliação validado na demonstração |
| 6 Backoffice | Feature flags por plano, grupos/unidades, incidentes | `/backoffice` | Não iniciada |
| 7 Guest, fidelidade, IA | Perfil opcional (LGPD), resumo diário pela Lebre, respostas a avaliações | Lebre | Não iniciada |
| 8 Integrações e hardening | 1º adaptador de PDV brasileiro, testes de carga, WCAG | `pdv/contract.ts`, outbox | Não iniciada |
| 9 Site | Páginas por módulo | PR #10 (conversa da landing) | Em outra conversa |

## Próxima etapa exata

**Fase 2 no código real: divisão por lugar e gorjeta com o nome do garçom na conta de verdade**, empilhado sobre o PR #12 (que já reorganizou `$restaurante.$mesa.tsx`):

1. Migração `0027_order_item_seat`: coluna `seat smallint null` em `pdv_order_items` e no ingest (`pdv_ingest_event`), com teste em `tests/db`.
2. `bill-math.ts`: `seatPortions(items, seat)` (mesma regra testada no motor da demonstração).
3. Conta: opção "Por lugar" quando houver itens com lugar; nome do garçom na gorjeta.
4. Garçom (#7): escolher lugar ao lançar.

Em paralelo, quando o Roberto aprovar: merge da pilha #6–#9 e #10, que destrava Order, Kitchen e o visual único.
