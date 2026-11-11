# Backlog único da Tipe

Atualizado em: 2026-10-16. Base: `main` em `05d7137` e os PRs abertos #6 a #9 (colibri).

**Fontes:** análise do Sunday (`sunday-analise/03-TIPE-OPORTUNIDADES.md` e `04-TIPE-ROADMAP.md`, pasta compartilhada do projeto) e benchmark dos EUA (`docs/research/restaurant-us-benchmark/04-MATRIZ-FUNCIONALIDADES-TIPE.md` e `10-IMPLEMENTATION-BACKLOG.md`, PR #4). Nenhuma pesquisa nova. Os códigos entre parênteses na origem (por exemplo, `1.2` ou `A3`) são os números usados nesses documentos.

**Estado no código:**
- **Funcional:** tem tela, caminho no servidor ou RPC, persistência e RLS, e o fluxo fecha de ponta a ponta.
- **Parcial:** parte disso existe.
- **Protótipo:** só tela, com dados fixos.
- **Ausente:** não existe no código.

"(PR #n)" quer dizer que o código existe e passou nos testes, mas ainda não está no `main`.

**Esforço:** B = até uns dias · M = uma a duas semanas · A = mais que isso. Quando duas propostas conflitam, vale a ordem da seção 4 do prompt de execução: correção e segurança primeiro, viabilidade comercial por último.

## Fase 1 — Núcleo de pagamento

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F1.1 | QR por mesa com token fixo e sessão rotativa | TIPE 2.0 | Funcional: `src/lib/tipe/pdv.functions.ts:34-39` | — | 1 | — | Não |
| F1.2 | Divisão por item, fração e percentual, ao centavo | TIPE 2.0 | Funcional: `src/lib/tipe/bill-math.ts:28-60`, testes em `bill-math.test.ts` | — | 1 | — | Não |
| F1.3 | Prevenção de pagamento em dobro | TIPE 2.0 | Funcional: `drizzle/migrations/0004_pagarme_integration.sql:30-34` (`FOR UPDATE`), `payment-state.test.ts` | — | 1 | — | Não |
| F1.4 | Confirmação só pelo provedor (webhook e reconciliador) | TIPE 2.0 | Funcional: `src/lib/tipe/payment-settlement.server.ts:45-67`, `src/routes/api/public/payments.reconcile.ts:15` | Rotinas `/api/public/payments/reconcile` e `/api/public/pdv/sync` agendadas fora do código (Sunday 0.2) | 1 | B (só configuração) | Não |
| F1.5 | Gorjeta 70/30 com sugestões em % e "Outro valor" | TIPE 2.0 | Funcional: `src/lib/tipe/rules.ts:81`, `drizzle/migrations/0014_withdrawal_cycle_rules.sql:35-37` | — | 1 | — | Não |
| F1.6 | Comprovante por e-mail | TIPE 2.0 | Funcional: `src/lib/tipe/payments.functions.ts:389-409` | — | 1 | — | Não |
| F1.7 | Taxa de serviço removível por conta, com motivo | TIPE 2.0 | Funcional: `drizzle/migrations/0016_lebre_limits_and_fee_waivers.sql:61`, `pdv.functions.ts:172` | — | 1 | — | Não |
| F1.8 | Reabrir mesa arquivando os pagamentos | TIPE 2.0 | Funcional: `drizzle/migrations/0022_tipe2_reversals_founder_scope_reviews_outbox.sql:8`, `payments.functions.ts:293` | — | 1 | — | Não |
| F1.9 | Pagar a conta inteira com Pix em até 3 toques | Sunday (1.5) | Parcial: botão "Pagar a conta inteira" em `src/routes/$restaurante.$mesa.tsx:478`, mas a identificação vem antes e o número de toques não foi medido | — | 1 | B | Não |
| F1.10 | Central de alertas no painel e no garçom (mesa quitada, nota ruim, falha de pagamento, chamado) | Sunday (1.2), EUA (B3) | Parcial: só o aviso de pendências financeiras (`src/components/tipe/PendenciasFinanceiras.tsx:36`); não há tabela de notificações | — | 1 | M | Não |
| F1.11 | Chamado do cliente: "Chamar garçom" e "Pedir a conta" | EUA (B4) | Ausente | F1.10 | 1 | B | Não |
| F1.12 | Teste de ponta a ponta: abrir mesa, dois clientes pagando, saldo zerar, mesa encerrar | Prompt (Fase 1) | Parcial: as regras têm testes (`tests/db/run.sh`, vitest), mas o fluxo completo não tem | — | 1 | M | Não |
| F1.13 | Apple Pay e Google Pay | Sunday (2.7) | Ausente: o servidor recusa (`payments.functions.ts:183-184`); a landing do `main` ainda mostra "breve" (`src/routes/index.tsx:238`, `:448`) | Habilitação no Pagar.me e verificação do domínio na Apple | 1 | M | Sim: a decisão de 15/10 é exibir como disponível; falta decidir quando habilitar no Pagar.me, porque até lá a tela promete o que o servidor recusa |
| F1.14 | Cartão de crédito digitado na conta | Sunday (1.1) | Ausente por regra: o `AGENTS.md` proíbe ("Do not offer direct card entry on the bill") | Revogar a regra; 3DS e antifraude do Pagar.me | 1 | M | Sim |

Esta é a fase mais adiantada: o dinheiro já entra, é confirmado só pelo provedor e não é cobrado duas vezes. O que falta é a equipe saber o que aconteceu sem olhar o painel (F1.10 e F1.11). Também falta o teste de ponta a ponta que o prompt pede como critério de pronto (F1.12). F1.13 e F1.14 esperam decisão e não bloqueiam o resto.

## Fase 2 — PDV (Lançamento TIPE)

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F2.1 | Cardápio, categorias e lançamento na mesa | TIPE 2.0 | Funcional: `pdv_launch_order` em `supabase/migrations/20260929182948_c90f62f9-c662-4594-8d3a-e9990606be8d.sql:89` | — | 2 | — | Não |
| F2.2 | Lançamento idempotente (toque duplo ou rede instável) | EUA (A1) | Parcial: o balcão e o pedido da mesa já usam `request_id` (`0023_counter_sales_kds_ticket_board.sql:115`, `0024_customer_self_order.sql:10`, PR #6 e #8); `pdv_launch_order` (garçom e painel) não | PR #6 | 2 | B | Não |
| F2.3 | Balcão com senha, troco no servidor e cancelamento com motivo | Sunday (3.3) | Funcional (PR #6): `0023_counter_sales_kds_ticket_board.sql:115`, `src/components/tipe/Balcao.tsx:26`, `tests/db/balcao.sql` | — | 2 | — | Não |
| F2.4 | Cancelamento de item com motivo | TIPE 2.0 | Funcional: `supabase/migrations/20260929182948_c90f62f9-c662-4594-8d3a-e9990606be8d.sql:109`, tabela `pdv_voids` | — | 2 | — | Não |
| F2.5 | Caixa: valor esperado calculado no servidor, por forma de pagamento | EUA (A3) | Parcial: `cash_close` grava o esperado que o navegador envia (`supabase/migrations/20260929182948_c90f62f9-c662-4594-8d3a-e9990606be8d.sql:175-181`) | — | 2 | B | Não |
| F2.6 | Fechamento do dia que bloqueia com mesa aberta ou pendência | EUA (A4) | Parcial: o resumo é calculado (`src/lib/tipe/daily-close.ts:73`), mas não bloqueia | F2.5 | 2 | B | Não |
| F2.7 | Papel de gerente e aprovação por PIN | EUA (A7) | Ausente | — | 2 | M | Não |
| F2.8 | Desconto e acréscimo com motivo e permissão | EUA (A6) | Ausente | F2.7 | 2 | M | Não |
| F2.9 | Modificadores e adicionais (ponto da carne, extras) | EUA (A5) | Ausente | F2.2 | 2 | A | Não |
| F2.10 | Transferir e juntar mesas; transferir itens | EUA (D2) | Parcial: `pdv_transfer_table` (`supabase/migrations/20260929182948_c90f62f9-c662-4594-8d3a-e9990606be8d.sql:119-127`) recusa mesas com pagamento e não move itens soltos | F2.11 | 2 | M | Não |
| F2.11 | Comanda individual (várias contas numa mesa) | EUA (D1) | Ausente | — | 2 | A | Não |
| F2.12 | Estorno pelo painel, com motivo | Sunday (2.3) | Parcial: o estorno feito no provedor é recebido (`payment-settlement.server.ts:67`); o painel não pede o estorno | API de cancelamento do Pagar.me | 2 | M | Não |

Os fluxos básicos já fecham. O que falta é confiabilidade: lançamento sem duplicar (F2.2) e caixa que confere sozinho (F2.5 e F2.6). Essas três são pequenas e vêm antes das grandes. Gerente, desconto, modificadores e comanda individual mudam o modelo de dados e precisam de migração com testes de pagamento.

## Fase 3 — Atendimento e mapa de mesas

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F3.1 | Garçom lança pedido pelo celular | Sunday (1.3), EUA (H0.2) | Funcional (PR #7): `src/lib/tipe/waiter-order.functions.ts:103`, `src/components/tipe/GarcomAtender.tsx:24`, `tests/db/garcom.sql` | — | 3 | — | Sim: quem lança por último vira dono da mesa e dos 70% da gorjeta |
| F3.2 | Cliente pede pelo QR da mesa | Sunday (3.2) | Funcional (PR #8): `0024_customer_self_order.sql:10`, `src/components/tipe/MesaPedido.tsx:12`, `tests/db/pedido-mesa.sql` | — | 3 | — | Não |
| F3.3 | Painel do garçom: gorjeta, saldo e saque quinzenal | TIPE 2.0 | Funcional: `src/lib/tipe/waiter.functions.ts:39`, `:108` | — | 3 | — | Não |
| F3.4 | Mapa com estado do pedido (enviado, pronto) e tempo de mesa | EUA (B1) | Parcial: grade com estado de pagamento e realtime (`src/components/tipe/RestaurantPanel.tsx:109`), sem estado do pedido nem tempo aberto | F4.2 | 3 | M | Não |
| F3.5 | Planta do salão (posição, área, lotação) | EUA (D3) | Ausente | F3.4 | 3 | M | Não |
| F3.6 | Garçom em maquininha smart Android | EUA (D4) | Ausente | F3.1 | 3 | M | Não |
| F3.7 | Caixinha e rateio da gorjeta além do garçom da mesa | Sunday (2.1), EUA (D10) | Ausente | Parecer jurídico (Lei 13.419/2017) | 3 | M | Sim |

A colibri entrega o essencial desta fase (F3.1 e F3.2). Falta o mapa mostrar onde levar prato (F3.4), que depende do KDS em tempo real. F3.1 tem uma regra de gorjeta que precisa de confirmação antes do merge do PR #7.

## Fase 4 — KDS e cozinha

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F4.1 | KDS por pedido, com cor por tempo (10 e 20 min) e som | EUA (H0.3) | Funcional (PR #6): `src/components/tipe/Kds.tsx:39-47`, `0023_counter_sales_kds_ticket_board.sql:87` | — | 4 | — | Não |
| F4.2 | KDS em tempo real | EUA (A2) | Funcional (PR #6): `0023_counter_sales_kds_ticket_board.sql:230-234`; no `main` a consulta é a cada 10 s (`src/components/tipe/AdminSections.tsx:26`) | — | 4 | — | Não |
| F4.3 | Painel de senhas | Sunday (3.3) | Funcional (PR #6): `src/routes/$restaurante.senhas.tsx:12`, `0023_counter_sales_kds_ticket_board.sql:101` | — | 4 | — | Não |
| F4.4 | Totem de autoatendimento | TIPE (colibri) | Funcional (PR #9): `0025_self_service_totem.sql:18-81`, `src/components/tipe/Totem.tsx:16`, `tests/db/totem.sql` | — | 4 | — | Não |
| F4.5 | Desfazer "Pronto" por 3 s e aba de concluídos | EUA (B2) | Ausente | F4.1 | 4 | B | Não |
| F4.6 | Estações configuráveis além de cozinha e bar | EUA (§4) | Parcial: setores fixos `kitchen` e `bar` | F4.1 | 4 | M | Não |
| F4.7 | Impressão de produção e pré-conta (agente local) | EUA (C1) | Ausente | — | 4 | A | Não |

Com os PRs #6 e #9, o KDS deixa de ser por item e passa a ser em tempo real. O que sobra é acabamento (F4.5 e F4.6) e a impressão (F4.7). A impressão é um projeto à parte, fora do build web, e é obrigatória para boa parte dos restaurantes brasileiros.

## Fase 5 — Financeiro e conciliação

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F5.1 | Fechamento do dia com CSV | TIPE 2.0 | Funcional: `src/lib/tipe/admin.functions.ts:156-171`, `src/components/tipe/FechamentoDia.tsx:23` | — | 5 | — | Não |
| F5.2 | Pendências financeiras com responsável | TIPE 2.0 | Funcional: `0022_tipe2_reversals_founder_scope_reviews_outbox.sql:28-51`, `src/components/tipe/PendenciasFinanceiras.tsx:51` | — | 5 | — | Não |
| F5.3 | Registro diário imutável e versionado | EUA (D5) | Ausente: o fechamento é recalculado a cada consulta | F2.6 | 5 | B | Não |
| F5.4 | Conciliação com repasses do Pagar.me e fechamento por turno | Sunday (2.2) | Parcial: o reconciliador confere o status dos pedidos (`payments.reconcile.ts:15`), não os repasses | Endpoints de recebíveis do Pagar.me | 5 | A | Não |
| F5.5 | Relatórios por período livre, hora, item e garçom | EUA (D7) | Parcial: até 90 dias corridos (`admin.functions.ts:56-60`), desempenho por garçom em `DesempenhoGarcons.tsx:13` | — | 5 | M | Não |
| F5.6 | Resumo diário por e-mail escrito pela Lebre | Sunday (1.4), EUA (D6) | Ausente | `lebre_consume`; agendamento no Lovable | 5 | M | Não |
| F5.7 | Painel "economia de maquininha" | Sunday (2.6) | Ausente | Taxa informada pelo restaurante | 5 | B | Não |
| F5.8 | NFC-e por meio de emissor parceiro | EUA (C2) | Ausente | Escolha do emissor | 5 | A | Sim (emissor) |
| F5.9 | Cashback ao restaurante | Sunday (2.8) | Ausente | Regra financeira | 5 | M | Sim |

A base é boa: fechamento exportável e pendências com responsável. Falta guardar o dia fechado (F5.3) e conferir o dinheiro que de fato caiu na conta (F5.4). O resumo diário (F5.6) é o item de maior efeito na retenção nas duas pesquisas.

## Fase 6 — Estoque e ERP

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F6.1 | Marcar item como indisponível | TIPE 2.0 | Funcional: `pdv_menu_items.available` (`supabase/migrations/20260926103913_6f896af1-02e3-42d7-82e5-bc5a59eef38a.sql:40`) | — | 6 | — | Não |
| F6.2 | Ficha técnica e baixa de insumos num único evento | EUA (§5) | Ausente | F2.9 | 6 | A | Não (o evento da baixa é decisão técnica, registrada em ADR) |
| F6.3 | Fornecedores, compras e entrada por XML de NF-e | EUA (§5, §7) | Ausente | F6.2 | 6 | A | Não |
| F6.4 | Contas a pagar e a receber, fluxo de caixa | EUA (§6) | Ausente | F5.3 | 6 | A | Não |

Quase nada existe nesta fase, e as duas pesquisas a classificam como "pode esperar" para o restaurante pequeno. Só começa depois dos modificadores (F2.9), porque a ficha técnica precisa saber o que foi vendido com cada opção.

## Fase 7 — CRM, fidelização e inteligência

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F7.1 | Avaliação do cliente e convite para o Google | TIPE 2.0 | Funcional: `payments.functions.ts:364`, `pdv.functions.ts:54` | — | 7 | — | Não |
| F7.2 | Opt-in de contato do cliente (LGPD) e lista de clientes | Sunday (2.5) | Ausente: só os leads B2B têm `marketing_opt_in` | Texto na Central Jurídica | 7 | M | Não |
| F7.3 | Teste A/B da posição da gorjeta | Sunday (1.6) | Ausente: `src/lib/tipe/tracking.ts:70-76` só mede leads e a demonstração | — | 7 | B | Não |
| F7.4 | Respostas a avaliações do Google redigidas pela Lebre | Sunday (2.9) | Ausente | Acesso à API do Perfil da Empresa | 7 | M | Não |

A avaliação já existe. O alerta de nota ruim está em F1.10. O passo seguinte é captar o contato com consentimento (F7.2), que destrava fidelidade e campanhas.

## Fase 8 — Backoffice e escala

| ID | Funcionalidade | Origem | Estado no código | Depende de | Fase | Esforço | Decisão humana pendente? |
|---|---|---|---|---|---|---|---|
| F8.1 | Planos e limite de mesas aplicados no banco | TIPE 2.0 | Funcional: `drizzle/migrations/0017_plan_table_limits.sql:57-84` | — | 8 | — | Não |
| F8.2 | Founder só com 2FA e só agregados | TIPE 2.0 | Funcional: `src/lib/tipe/founder-guard.ts:2`, `0022_tipe2_reversals_founder_scope_reviews_outbox.sql` | — | 8 | — | Não |
| F8.3 | Primeiro adaptador de PDV brasileiro | Sunday (3.1), EUA (C3) | Parcial: contrato e fila prontos (`src/lib/tipe/pdv/contract.ts:26`, `pdv/outbox.server.ts`); só existem os adaptadores demo, API Tipe e Lançamento TIPE (`src/lib/tipe/pdv/adapters/`) | Parceria e credenciais do PDV | 8 | A | Sim (qual PDV) |
| F8.4 | Módulos ligados por plano | EUA (D8) | Ausente | F8.1 | 8 | M | Não |
| F8.5 | Entrada de aparelho por código | EUA (D9) | Ausente | — | 8 | B | Não |
| F8.6 | Várias unidades com painel consolidado | Sunday (4.1), EUA (§7) | Ausente | Revisão de RLS | 8 | A | Não |
| F8.7 | Preços públicos dos planos | Sunday (1.7) | Parcial: preços no banco (`plan_catalog`, `src/lib/tipe/plans.ts:1`) e ocultos na landing | — | 8 | B | Sim |

As regras de plano e de acesso do founder estão firmes no banco. O item que muda a venda é o adaptador de PDV brasileiro (F8.3): o contrato está pronto, falta escolher o PDV pelos dados de `restaurant_leads`.

## Decisões humanas pendentes, em ordem de impacto

1. Merge dos PRs #6 a #9 (colibri). Até lá, F2.3, F3.1, F3.2 e F4.1 a F4.4 não estão em produção.
2. Regra de gorjeta quando o garçom lança pedido (F3.1).
3. Apple Pay e Google Pay: quando habilitar no Pagar.me (F1.13). Cartão digitado na conta: revogar ou manter a regra (F1.14).
4. Primeiro PDV brasileiro (F8.3) e emissor de NFC-e (F5.8).
5. Caixinha e rateio, depois de parecer jurídico (F3.7).
6. Preços públicos (F8.7) e cashback (F5.9).

## Próximas entregas sem decisão pendente

Em ordem:
1. F2.2: lançamento idempotente.
2. F2.5 e F2.6: caixa e fechamento do dia conferidos no servidor.
3. F1.10 e F1.11: central de alertas e chamado do cliente.
4. F1.12: teste de ponta a ponta do pagamento.
5. F4.5: desfazer no KDS.
6. F5.3: registro diário imutável.

As três primeiras usam código que já existe e não precisam de serviço externo.
