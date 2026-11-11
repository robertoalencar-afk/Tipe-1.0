# 01 — Auditoria do repositório Tipe (PDV, salão, cozinha e gestão)

Data: 14/10/2026 · Base: `main`, commit `e6813a2` · Branch de pesquisa: `research/us-benchmark-pdv-erp`.

Esta auditoria **valida e completa** a auditoria feita na mesma data por outra sessão (`02-SUNDAY-VS-TIPE.md`, pasta compartilhada do projeto, mesmo commit). Aquela cobriu pagamento na mesa; esta foca nas funcionalidades de PDV, atendimento, cozinha e administração pedidas na seção 4.2 do prompt. Nada foi executado contra o banco real.

## 1. Como foi feita

- Leitura das migrações (`supabase/migrations/*`, 12 arquivos, e `drizzle/migrations/0000` a `0022`), das funções de servidor (`src/lib/tipe/*.functions.ts`), das rotas (`src/routes`) e dos componentes de área (`src/components/tipe`).
- Comparação com os ramos fora do `main`: `colibri/fase-1-balcao-kds-senhas` (commit `931d3cb`) e `redesign-premium` (commit `0b5f313`).
- Build e testes unitários locais (resultado na seção 5).

Critério (seção 4.3 do prompt): **Funcional** = tela + servidor/RPC + persistência + RLS, ciclo fecha. **Parcial** = parte do fluxo. **Protótipo visual** = sem persistência. **Não implementada** = sem código. **Em ramo** = código escrito, fora do `main` (classe adicional, porque muda o esforço).

## 2. Modelo de dados do PDV (o que existe de fato)

| Tabela | Campos relevantes | Observação |
|---|---|---|
| `pdv_menu_categories` | `name`, `position` | sem hierarquia, sem horário de disponibilidade |
| `pdv_menu_items` | `code`, `name`, `price`, `available`, `sector` (`kitchen`/`bar`), `description` | **sem modificadores, adicionais, variações, combos, foto, NCM/CFOP, custo** |
| `pdv_orders` | `table_number`, `waiter_id`, `created_by` | o pedido é por mesa (texto), não por comanda nem por assento |
| `pdv_order_items` | `item_code`, `unit_price`, `quantity`, `notes` (140 car.), `sector`, `status` (`received`/`preparing`/`ready`/`delivered`), `status_at` | é a fila do KDS |
| `table_bill_items` | um registro por **(mesa, item_code)**, com `ordered_quantity`, `reserved_quantity`, `paid_quantity` e porções decimais | a conta agrega por código: dois "X-Burger" com observações diferentes viram uma linha |
| `pdv_voids` | item, quantidade, `reason`, `actor_id` | cancelamento com motivo e autor |
| `cash_sessions` / `cash_movements` | abertura, sangria (`withdrawal`), reforço (`deposit`), fechamento com contado e esperado | um caixa aberto por restaurante |
| `restaurant_tables` | `number`, `active`, `waiter_id`, `access_token`, `session_token`, `code` | **sem posição no mapa, capacidade, área/salão** |
| `user_roles` | enum `app_role`: `founder`, `owner`, `cashier`, `waiter` | sem gerente, cozinha ou papéis customizados |

Realtime: só `table_bill_items` e `table_payment_requests` estão na publicação `supabase_realtime` (`supabase/migrations/20260925160410_…sql:50-51`). O KDS e o caixa consultam a cada 10 s (`AdminSections.tsx:24`); o painel, a cada 15 s mais Realtime (`RestaurantPanel.tsx:78-94`).

RLS: habilitada em todas as 41 tabelas públicas encontradas nas migrações. As escritas de PDV passam por funções `SECURITY DEFINER` que checam papel com `has_restaurant_role` (sem atalho para founder desde a migração 0020).

## 3. Classificação

### 3.1 PDV

| Funcionalidade | Classe | Evidência | Observação |
|---|---|---|---|
| Tela de venda (Lançamento TIPE) | Funcional | `RestaurantPanel.tsx:383` (`LancarPedido`), `launchOrder` em `pdv.functions.ts:107`, RPC `pdv_launch_order` (`supabase/migrations/20260929182948_…sql:75`) | busca por nome ou código, filtro por categoria, "Mais vendidos", carrinho, observação por item; exige escolher garçom |
| Produtos | Funcional | `Cardapio` (`RestaurantPanel.tsx:579`), `saveMenuItem` (`pdv.functions.ts:205`), auditoria de preço `audit_menu_price` | importação CSV (`RestaurantPanel.tsx:648`) |
| Categorias | Funcional | `saveCategory` (`pdv.functions.ts:258`) | ordem por `position` |
| Adicionais e modificadores | Não implementada | nenhuma tabela ou campo | hoje substituído por observação livre de 140 caracteres; não muda preço nem vai estruturado ao KDS |
| Combos | Não implementada | — | |
| Carrinho | Funcional (local até enviar) | estado React em `LancarPedido` | some se a página recarregar |
| Descontos e acréscimos | Não implementada | nenhuma ocorrência de desconto | só a remoção da taxa de serviço por conta |
| Taxa de serviço | Funcional | `restaurants.service_rate` (0 a 20%), `waive_service_fee` com motivo (migração 0016) | recalculada no servidor |
| Formas de pagamento | Funcional (Pix online; dinheiro e maquininha confirmados pelo caixa) / Parcial (cartão online só na gorjeta) | `usableBillMethods`, `resolve_table_payment` | ver `02-SUNDAY-VS-TIPE.md` §1.3 |
| Comandas (individual/numerada) | Não implementada no `main` / Em ramo | `src/lib/tipe/pdv/comanda.ts` e `Balcao.tsx` no ramo `colibri` | no `main`, a unidade é sempre a mesa |
| Cancelamento de item com motivo e permissão | Funcional | `pdv_void_item` (só `owner`/`cashier`, motivo ≥ 3 car.) `…20260929182948_…sql:103`; `pdv_voids` | não cancela item já reservado ou pago (bloqueio correto) |
| Cancelamento da venda inteira | Parcial | `closeTable` (`pdv.functions.ts:128`) → `pdv_close_table` | fecha/arquiva a mesa; não existe "cancelar venda" com motivo único |
| Estornos | Parcial | `provider_reverse_payment` reflete estorno feito na Pagar.me | estorno iniciado pelo painel não existe |
| Abertura e fechamento de caixa | Parcial | `cash_open`/`cash_close` (`…20260929182948_…sql:151,175`), tela `Caixa` (`AdminSections.tsx:114`) | o valor **esperado é calculado no navegador** e enviado ao servidor (`p_expected`); o "recebido" mistura dinheiro e maquininha (`admin.functions.ts:35-42`), então a diferença de gaveta não é confiável. Sem fechamento cego, sem relatório Z por forma de pagamento |
| Sangria e reforço | Funcional | `cash_move` (`…sql:163`) | motivo opcional |
| Histórico de operações | Funcional | Histórico com auditoria, `payment_audit_log`, `pdv_voids`, mesas reabertas | |

### 3.2 Atendimento

| Funcionalidade | Classe | Evidência | Observação |
|---|---|---|---|
| Mapa de mesas | Parcial | `RestaurantPanel.tsx:100-112` (estados `livre`, `ocupada`, `aguardando`, `encerrada`, `inativa`) | é uma **grade de cartões**, não planta: sem posição, formato, área ou capacidade; sem tempo de ocupação nem estado "pediu a conta" |
| Abertura de conta | Funcional (implícita) | a mesa abre no primeiro item lançado ou na leitura do QR | sem número de pessoas, sem nome da conta |
| Transferência e junção de mesas | Parcial | `pdv_transfer_table` (`…sql:119`) | move **tudo** de uma mesa para outra (serve como junção); bloqueado se houver qualquer pagamento; não desfaz junção |
| Transferência de itens | Não implementada | — | |
| Divisão de conta | Funcional | `DividirConta.tsx`, `bill-math.ts` (itens com frações, partes iguais, valor, percentual) | feita pelo cliente no QR; o caixa não divide pelo painel |
| Pedidos por mesa | Funcional | `pdv_orders` + KDS | |
| Atendimento pelo garçom no celular | Em ramo | `GarcomAtender.tsx`, `waiter-order.functions.ts` no ramo `colibri` | no `main`, `/garcom` só mostra gorjetas e saques |
| Pagamentos parciais | Funcional | porções decimais com bloqueio de linha (`register_table_payment`) | testado com conexões simultâneas (relatórios anteriores) |
| Encerramento | Funcional | `archive_and_reopen_table` arquiva pagamentos e gira o `session_token` | |

### 3.3 Cozinha

| Funcionalidade | Classe | Evidência | Observação |
|---|---|---|---|
| KDS | Funcional | `Cozinha` (`AdminSections.tsx:78`), `pdv_set_item_status` (`…sql:140`) | quadro de 3 colunas (recebido, em preparo, pronto), **por item**, não por pedido |
| Fila | Funcional | ordenação por `created_at`, últimas 24 h, não entregues | |
| Prioridade | Não implementada | — | |
| Tempo de preparo | Parcial | mostra só a hora do pedido | sem cronômetro, sem tempo-alvo por item |
| Status de produção | Funcional | 4 estados, com `status_at` | sem "desfazer" (o botão só avança) |
| Separação por estação | Parcial | `sector` = `kitchen` ou `bar` (fixo) | sem estações configuráveis (chapa, fritura, sobremesa), sem roteamento por item |
| Painel de senhas | Em ramo | `$restaurante.senhas.tsx` no ramo `colibri` | |
| Alerta de atraso | Não implementada no `main` / Em ramo (sinal sonoro em `beep.ts`) | | |
| Impressão de comanda | Não implementada | só há `window.print()` para QR e totens | crítico no Brasil (ver `04b-REALIDADE-BRASIL.md`) |
| Atualização em tempo real | Parcial | consulta a cada 10 s; `pdv_order_items` fora do Realtime | |

### 3.4 Administração

| Funcionalidade | Classe | Evidência | Observação |
|---|---|---|---|
| Dashboard | Parcial | `Inicio` (`AdminSections.tsx:36`): mesas abertas, em aberto, pendentes | sem vendas do dia, ticket, comparação com período anterior |
| Financeiro | Parcial | Caixa, Pendências financeiras, Fechamento do dia (`daily-close.ts`), Recebimentos | sem contas a pagar/receber, sem DRE, sem conciliação de repasses |
| Relatórios e exportação | Funcional | `Relatorios` (`AdminSections.tsx:194`), CSV (`:217`), fechamento do dia em CSV | 1, 7 e 30 dias; sem período livre, sem por hora, sem por categoria |
| Usuários e permissões por papel | Parcial | `user_roles` com 4 papéis fixos; convites (`staff.functions.ts`) | sem gerente, sem permissão granular (ex.: quem pode dar desconto ou cancelar), sem PIN de operador |
| Estoque | Não implementada | — | |
| Fornecedores | Não implementada | (as ocorrências de "fornecedor" são textos jurídicos) | |
| Precificação e ficha técnica | Não implementada | — | |
| Múltiplas unidades | Não implementada | landing promete no plano "Personalizado" | |
| Backoffice da plataforma (planos, limites, assinaturas) | Funcional | `backoffice.tsx`, `PlansAdmin.tsx`, `plan_catalog`, `enforce_table_limit` (0017), 2FA | |
| Garçons: gorjetas, avaliações, saque | Funcional | `waiter_balance`, `waiter_request_withdrawal` (0005, 0014), Pix com quarentena (0013) | 70/30 aplicado; sem caixinha/rateio |
| Integração com PDV externo | Parcial | contrato de adaptador, API genérica, outbox (0021/0022) | nenhum PDV de mercado conectado |
| Fiscal (NFC-e) | Não implementada | — | |
| Offline | Não implementada | sem service worker | PDV e KDS param sem internet |

## 4. O que está em ramo e muda o plano

O ramo `colibri/fase-1-balcao-kds-senhas` tem 4 commits sobre uma base **anterior** ao TIPE 2.0: balcão com senha, **KDS por pedido com sinal sonoro**, **painel de senhas**, **garçom lança pedido pelo celular**, cardápio digital com pedido pela mesa e totem (migrações `0019_counter_sales_kds_ticket_board`, `0020_customer_self_order`, `0021_self_service_totem`). As migrações colidem em numeração com as do `main` (`0019`–`0022`) e o diff contra o `main` remove arquivos do TIPE 2.0 (`daily-close.ts`, `payment-state.ts`, `outbox.server.ts`). Integrar exige **reaplicar** as funcionalidades sobre o `main`, não fazer merge. É o caminho mais barato para fechar várias lacunas de PDV e cozinha (ver `09-ROADMAP-EVOLUCAO-TIPE.md`).

O ramo `redesign-premium` tem o design system (`ds.tsx`, tokens) e telas redesenhadas, mesma situação de base.

## 5. Build e testes

Resultado registrado em `00-PROGRESSO.md` (seção "Verificação técnica").

## 6. Leitura para o benchmark

A Tipe já tem o **núcleo transacional mais difícil** (conta compartilhada com porções decimais, bloqueio contra pagamento duplicado, idempotência, estados de pagamento centralizados em `payment-state.ts`, auditoria, RLS sem atalho de founder). O que falta para ser levada a sério como PDV é o **modelo de cardápio** (modificadores, combos), a **unidade de atendimento** (comanda, assento, nome da conta, transferência de item), o **caixa confiável** (esperado calculado no servidor, por forma de pagamento), a **impressão**, o **fiscal** e o **offline**. Isso orienta as etapas seguintes.
