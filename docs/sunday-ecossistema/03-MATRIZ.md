# 03: matriz Sunday × Tipe

Parte da matriz de `sunday-analise/02-SUNDAY-VS-TIPE.md`, atualizada com os PRs #5 a #13. Complexidade B/M/A. Só entra como P0/P1 o que tem evidência Observado ou Documentado.

## Cliente

| Sunday | Evidência | Tipe (arquivo) | Diferença UX/UI | Diferença funcional | Melhoria | Compl. | Impacto | Prior. | Depende de | Situação |
|---|---|---|---|---|---|---|---|---|---|---|
| "Pay in 10 seconds", poucos passos | Doc. + Obs. | `$restaurante.$mesa.tsx` | 8 toques até pagar tudo | — | Total em destaque + "Pagar tudo" direto | B | Alto | P1 | — | **Feito (#12)** |
| Carteiras como meio principal | Doc. + Obs. | idem | "Em breve" | Servidor recusa | Mostrar como disponíveis; Pix a um toque se recusar | B | Alto | P0 | Pagar.me (servidor) | **Feito na UI (#12)** |
| Aviso de cookies não atrapalha o pagamento | Obs. (o site da Sunday tem aviso; a conta não foi vista) | `__root.tsx` | Aviso cobria o botão de pagar | — | Sem aviso na conta (nada opcional carrega) | B | Médio | P0 | — | **Feito (#12)** |
| Divisão e pagamento no mesmo gesto | Doc. | `DividirConta.tsx` | Dividir → usar → continuar | — | "Pagar minha parte" vai direto | B | Médio | P1 | — | **Feito (#12)** |
| Gorjeta antes do pagamento | Doc. | idem | Depois, separada | Regra 70/30 | Teste A/B | M | Alto | — | Decisão do Roberto | Seção 10 |
| Aceite implícito ao pagar | Inferido (não observado na Sunday) | idem | Caixa obrigatória | — | "Ao pagar, você concorda…" | B | Médio | — | Texto jurídico | Seção 10 |
| Página leve no 4G | — (Tipe) | build | Perf. Lighthouse 75 (LCP 4,7 s) | 408 KiB de JS sem uso | Separar o pacote da conta | M | Alto | P1 | Cliente Supabase gerado pelo Lovable (`auth-attacher.ts`) | **Parcial (#16)**: texto jurídico fora do pacote; Supabase no pacote depende do Lovable |

## Garçom

| Sunday | Evidência | Tipe (arquivo) | Diferença UX/UI | Diferença funcional | Melhoria | Compl. | Impacto | Prior. | Depende de | Situação |
|---|---|---|---|---|---|---|---|---|---|---|
| Notificação de mesa quitada e parcial | Obs. + Doc. | `GarcomAtender.tsx` (#7) | Precisava olhar cartão por cartão | Sem aviso | Avisos com toast, lista, vibração e bipe | B | Alto | P1 | PR #7 | **Feito (#13)** |
| Notificação com o app fechado | Doc. | — | — | Sem push | Web push | M | Alto | P1 | Permissão do navegador | A fazer |
| Gorjeta no aviso | Obs. ("Payment with a $10 tip") | `waiter-order.functions.ts` | — | Gorjeta extra não vem no salão | Incluir gorjeta da mesa | B | Médio | P2 | — | A fazer |
| Nota ruim avisa o garçom/gerente | Doc. | `submitRating` | — | Sem aviso | Aviso de nota ≤ 2 | B | Médio | P1 | — | **Feito: gerente (#15), garçom (#17)** |
| Desempenho individual | Doc. | `garcom.tsx` (Resumo) | — | Só gorjetas e vendas | Notas recebidas | M | Médio | P2 | — | A fazer |

## Restaurante

| Sunday | Evidência | Tipe (arquivo) | Diferença | Melhoria | Compl. | Impacto | Prior. | Depende de | Situação |
|---|---|---|---|---|---|---|---|---|---|
| Indicadores do dia no topo (Overview) | Doc. | `RestaurantPanel.tsx` Início | Tipe tem indicadores; falta "o que precisa de você agora" | Lista de pendências do momento no topo do Início | M | Alto | P1 | — | **Feito (#15)** |
| Pagamentos com filtros e CSV | Doc. | `AdminSections.tsx` | Filtros simples | Filtros por status, meio e garçom | M | Médio | P1 | — | A fazer |
| Estorno pelo painel (24 h) | Doc. | `PendenciasFinanceiras.tsx` | Só registro | Estorno via Pagar.me | M | Médio | P2 | Pagar.me | A fazer |
| Caixinha / rateio | Doc. | — | Só direta | Políticas de gorjeta | M | Alto | — | Jurídico (decisão 3) | Seção 10 |

## Backoffice

| Sunday | Evidência | Tipe (arquivo) | Diferença | Melhoria | Compl. | Impacto | Prior. | Depende de | Situação |
|---|---|---|---|---|---|---|---|---|---|
| Perfis Admin, Manager, Tips Manager | Doc. | `user_roles` | Tipe: dono, caixa, garçom | Perfil "gerente" só leitura | M | Médio | P2 | — | A fazer |
| Configurações agrupadas por tarefa | Doc. | `backoffice.tsx` | Navegação já em pílula (#10) | Agrupar por tarefa | B | Baixo | P2 | — | A fazer |
