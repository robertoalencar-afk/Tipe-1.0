# Status de implementação da Tipe 2.0

Atualizado em 20/10/2026 · Branch `tipe-2.0/fase-0-demo` (base `main` `bff7d2e`).

Legenda: **Não iniciada · Em desenvolvimento · Implementada · Testada · Bloqueada · Homologada**. "Testada (demo)" = testada no motor e nas telas da demonstração, ainda sem banco. Itens de outros PRs aparecem com o número do PR e o status que aquele PR declarou.

## Fase 0: auditoria

| Item | Status | Onde |
|---|---|---|
| Auditoria de ferramentas | Testada | `current-state-audit.md` §1 |
| Auditoria do repositório e dos PRs abertos | Implementada | `current-state-audit.md` |
| Matriz Sunday | Implementada (21 páginas sem captura visual) | `sunday-feature-matrix.md` |
| Arquitetura, requisitos, roteiro, integrações, pagamentos, testes | Implementada | este diretório |
| Skills do projeto (`tipe-brand-design`, `restaurant-operations`, `brazilian-payments`, `tipe-quality-assurance`) | Implementada | `.claude/skills/` |
| Preservar a versão atual | Implementada | Nada do `main` foi alterado além do registro da rota `/demo` |

## Primeira entrega funcional: demonstração `/demo`

| Funcionalidade | Status | Teste |
|---|---|---|
| 5 perfis com troca no topo e faixa "Demonstração" | Testada (demo) | e2e |
| Estado compartilhado entre abas, com trava (Web Locks) | Testada (demo) | e2e (cliente, cozinha, garçom e gerente em abas) |
| Cardápio com categorias, alérgenos, adicionais, observação, lugar | Testada (demo) | e2e + `engine.test.ts` |
| Sugestão de acompanhamento (regra, não IA) | Implementada | — |
| Pedido idempotente pelo QR e pelo garçom na mesma conta | Testada (demo) | `engine.test.ts` |
| Item indisponível bloqueia pedido | Testada (demo) | `engine.test.ts` |
| Cozinha: estações, fila, tempo, atraso, disponibilidade | Testada (demo) | `engine.test.ts` + e2e |
| Garçom: mesas, avisos, servir, lançar pedido, confirmar no local, pedir estorno, liberar mesa | Testada (demo) | e2e + `engine.test.ts` |
| Conta: tudo, partes iguais, meus itens (frações), por lugar, valor livre | Testada (demo) | `engine.test.ts` + e2e |
| Gorjeta extra antes de pagar, com nome do garçom: 3/5/8% ou outro valor (mín. R$ 2,00, máx. o valor pago) | Testada (demo) | `engine.test.ts` + e2e |
| Pix, Apple Pay, Google Pay simulados; pagar no local com confirmação | Testada (demo) | e2e + `engine.test.ts` |
| Concorrência e webhook duplicado | Testada (demo) | `engine.test.ts` + e2e |
| Comprovante (imprimir/PDF) | Implementada | — |
| Avaliação com aviso de nota baixa | Testada (demo) | `engine.test.ts` + e2e |
| Gerente: indicadores, salão, pagamentos com filtro e CSV, equipe, estornos | Testada (demo) | e2e |
| Conciliação determinística por referência | Testada (demo) | `engine.test.ts` + e2e |
| Backoffice demo | Implementada | e2e (abre) |

## Redesign visual da demonstração (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| Marca oficial (logo SVG, sem "2.0" em nenhuma tela) | Implementada | `src/assets/marca/`, `DemoShell` |
| Kit de interface próprio da demo (`ui.tsx`: Card, Segmented, Sheet, BarChart, ShareBar…) | Implementada | Capturas desktop e iPhone 13 |
| Pagamento em 3 passos compactos: divisão → gorjeta → pagamento | Testada (demo) | e2e etapas 4 e 5 |
| Gorjeta igual à conta real (PR #21): 3/5/8% arredondados a R$ 0,50, 5% sugerida sem vir marcada, "Sem gorjeta" | Testada (demo) | `engine.test.ts` + e2e |
| Painel do gerente com faturamento por hora, "Precisa de você", salão, meios, mais vendidos | Testada (demo) | e2e etapa 8 |
| Histórico de um almoço inteiro (7 mesas fechadas) no estado inicial | Testada (demo) | `engine.test.ts` |

## Produtos no código real

| Produto | Status | Motivo / próximo passo |
|---|---|---|
| Tipe Pay: Pix, no local, divisão, concorrência, idempotência | Homologada (`main`, em produção) | — |
| Tipe Pay: Apple Pay e Google Pay | **Bloqueada** | Pagar.me precisa aceitar token de carteira; servidor recusa hoje |
| Tipe Pay: divisão por lugar | Não iniciada | Próxima etapa (migração de `seat`) |
| Tipe Pay: conta mais curta | Testada (PR #12) | Aguarda merge |
| Tipe Order: pedido pela mesa, garçom, totem, balcão | Testada (PR #6–#9) | Aguarda merge da pilha colibri |
| Tipe Kitchen: KDS por pedido, senhas | Testada (PR #6) | Aguarda merge |
| Tipe Staff: avisos, nota baixa, push | Testada (PR #13, #17, #19) | #19 precisa de chaves VAPID no Lovable |
| Tipe Restaurant: "agora", pagamentos com filtro | Testada (PR #15, #18) | Aguarda merge |
| Tipe Restaurant: turnos, unidades, conciliação com recebíveis | Não iniciada | Fase 5/6 |
| Tipe Backoffice: feature flags por plano, grupos | Não iniciada | Fase 6 |
| Tipe Guest e fidelidade | Não iniciada | Fase 7; LGPD |
| Tipe AI (resumo diário, reputação, conciliação explicada) | Não iniciada | Fase 7 |
| Adaptador de PDV brasileiro | **Bloqueada** | Falta escolher o fornecedor e ter documentação/autorização |
| Site com páginas por módulo | Em desenvolvimento (outra conversa, PR #10) | — |

## Testes executados nesta entrega (20/10/2026)

| Comando | Resultado |
|---|---|
| `bunx vitest run` | 103 passaram (81 do `main` + 22 do motor da demonstração) |
| `bunx tsc --noEmit` | Sem erros |
| `node tests/e2e/demo-journey.mjs` (iPhone 13 + 1366 px) | 9 etapas verdes, sem erro de página |
| `bun run build` (Cloudflare) | Verde |
