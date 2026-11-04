# Conta do estabelecimento vinculada à assinatura

Regra única no banco: `restaurant_access(rid)` (migração 0036) devolve `full`, `grace` ou `blocked`.

| Situação | Estado |
|---|---|
| Isenta (empresas virtuais `teste-tipe`, `bistro-teste`, `bar-teste`, ou cortesia marcada no backoffice) | full |
| Ativa | full |
| Teste grátis dentro do prazo | full |
| Teste acabou com cartão cadastrado (aguardando 1ª cobrança) | grace por 7 dias |
| Teste acabou sem cartão | blocked |
| Pagamento atrasado (fatura recusada) | grace por 7 dias a partir do 1º aviso, depois blocked |
| Cancelada | grace até o fim do período pago (ou do teste), depois blocked |
| Suspensa pela TIPE | blocked |

**Conta bloqueada:** não abre mesa, conta nem pedido novo (gatilhos em `pdv_orders` e `table_bill_items`, valem para garçom, balcão, totem, pedido pela mesa e PDV integrado). Mesa que já tem conta aberta continua e o cliente sempre paga o que deve: nenhum pagamento é recusado pela assinatura. Módulos (`restaurant_has_module`) desligam. No painel, só Início, Caixa, Histórico, Relatórios, Recebimentos e Assinatura ficam abertos.

**Módulos por plano:** `plan_catalog.included_modules` (backoffice › Planos). Linha em `restaurant_modules` vence o plano (suspenso/cancelado desliga mesmo se o plano incluir). `guest` é módulo contratável.

**Ciclo no painel (dono):** escolher plano até ativar a cobrança; ativar com cartão (Pagar.me); trocar cartão em atraso; reativar depois de cancelar; cancelar sozinho (motivo + digitar CANCELAR). Sem chaves do Pagar.me, o botão leva ao WhatsApp da TIPE.

**Webhook:** status só muda pelo que é reconsultado na API do Pagar.me. Fatura paga → ativa; fatura recusada → atraso; assinatura cancelada → cancelada; assinatura "active" sem fatura paga não libera nada.

**Backoffice (founder com 2FA):** estado de acesso por restaurante, filtro "Carência ou bloqueio", isenção com motivo, estender teste (até 180 dias), módulos incluídos em cada plano. Toda mudança de status/plano/isenção vai para `subscription_events`.

Testes: `tests/db/assinatura.sql` (31 cenários) e `src/lib/tipe/assinatura.test.ts`.
