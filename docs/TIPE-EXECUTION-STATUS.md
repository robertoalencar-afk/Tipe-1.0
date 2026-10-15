# Status de execução da Tipe
Atualizado em: 2026-10-15 · Branch: `integracao/redesign-premium` · Base: `main` em `e6813a2`

Prompt que orienta a execução: `execucao-integral-tipe-v2.md` (pasta `prompts/` do projeto).

## Fase atual e próxima tarefa
Tarefa 1 (integrar as branches existentes). Passo atual: PR do `redesign-premium` aguardando revisão humana.
Próxima tarefa: integrar a `colibri/fase-1-balcao-kds-senhas`, parte A (balcão com senha, KDS por pedido e painel de senhas), com a migração renumerada para 0023.

## Inventário de branches e PRs (15/10/2026)
| Branch | Situação | Ação |
|---|---|---|
| `main` (`e6813a2`) | produção, sincronizada com o Lovable | base |
| `tipe-2.0-pagamento-na-mesa` | já incorporada (PR #2) | nenhuma |
| `tipe-2.0-fase-2` | já incorporada (PR #3) | nenhuma |
| `redesign-premium` (`0b5f313`) | integrada em `integracao/redesign-premium` | PR aguardando revisão |
| `colibri/fase-1-balcao-kds-senhas` (`931d3cb`, PR #1) | não integrada; 7 arquivos em conflito; migrações 0019–0021 colidem com as do `main` | integrar em 4 PRs |
| `research/us-benchmark-pdv-erp` (`707cdb9`, PR #4 rascunho) | só documentação | segue pelo próprio PR |

## Concluído
- Merge do `redesign-premium` sobre o `main` atual, com build, tipos e testes verdes (ver abaixo).

## Em andamento
- Revisão do PR do redesign.

## Pendente
- `colibri` partes A, B, C e D.
- Tarefa 2: `docs/TIPE-BACKLOG.md` consolidando Sunday e benchmark dos EUA.
- Aplicar o design system às telas da `colibri` (balcão, KDS, senhas, garçom, totem) depois que os dois lados estiverem no `main`.

## Bloqueado
Nada no momento.

## Decisões humanas pendentes
1. Aprovar e fazer merge do PR do redesign (muda a aparência da landing, do pagamento, do painel e do garçom em produção).
2. Cartão na conta, Apple Pay e Google Pay; cashback; preços públicos; caixinha; primeiro adaptador de PDV: não tocados.

## Migrações criadas
Nenhuma neste PR.

## Testes executados
| Comando | Resultado |
|---|---|
| `bunx tsc --noEmit` | sem erros |
| `bunx vitest run` | 8 arquivos, 81 testes, todos passando |
| `bun run build` | build concluído (nitro) |
| `bun run lint` | falha com cerca de 6.100 erros que já existem no `main`, quase todos de formatação (prettier) e `no-explicit-any` em arquivos que este PR não altera; nenhum erro novo nos arquivos resolvidos |

O fluxo do cliente não foi aberto num navegador: ele depende do Supabase do Lovable Cloud, que não está acessível nesta sessão. Conferir no preview do Lovable depois do merge.

## Conflitos resolvidos e decisões técnicas
| Arquivo | `main` trazia | `redesign-premium` trazia | Decisão |
|---|---|---|---|
| `src/routes/$restaurante.$mesa.tsx` (import) | `suggestedTips` | import sem `suggestedTips` | manter `suggestedTips` |
| idem, tela "conta confirmada" | comprovante opcional por e-mail; `ultimoPagamento` como id do pagamento | resumo do recibo em lista; `ultimoPagamento` como objeto derivado | layout novo + formulário do comprovante; o objeto derivado virou `pagamentoRecibo`, buscado pelo id recém-criado e, na falta dele, pelo último aprovado da pessoa |
| idem, tela de gorjeta | sugestões em % do valor pago e "Outro valor" | botões fixos de R$ 5 a R$ 20 | visual novo com as sugestões em % e o campo "Outro valor"; mantida a explicação 70/30 |
| idem, tela final | convite para avaliar no Google | visual novo | visual novo + convite do Google |

## Dependências externas
- Confirmar como o Lovable Cloud aplica as migrações (`drizzle/migrations` × `supabase/migrations`) antes da parte A da `colibri`.
