# 10 — Backlog de implementação (P0 e P1)

Data: 14/10/2026. Épicos na ordem do roadmap (`09-ROADMAP-EVOLUCAO-TIPE.md`). Cada história tem critérios verificáveis. Arquivos citados existem no `main` `e6813a2`, salvo indicação. Migrações são descritas, não escritas: ficam para a implementação.

---

## Épico 0 — Consolidar ramos fora do `main` (P0)

**H0.1 — Reaplicar o design system.** Como dono, quero o painel no visual novo para que as próximas telas usem os mesmos componentes.
- Critérios: `src/styles.css` contém os tokens semânticos (`--brand-primary-strong`, `--surface`, `--text-primary`, `--focus-ring`…); `src/components/tipe/ds.tsx` existe; `bun run build` e os 81 testes passam; conta do cliente, painel e garçom renderizados em 390 px e 1440 px sem regressão funcional (mesmas chamadas de servidor).
- Arquivos: `src/styles.css`, `src/components/tipe/ds.tsx`, `src/components/ui/{button,badge,card,input,dialog}.tsx`, telas do ramo `redesign-premium`.
- Riscos: o ramo parte de base antiga; reaplicar arquivo a arquivo, não fazer merge. Dependências: nenhuma.

**H0.2 — Reaplicar garçom no celular.** Como garçom, quero lançar pedido pelo celular na mesa.
- Critérios: garçom logado vê só as mesas ativas; lança item com observação; o pedido aparece no KDS e na conta do QR; papel `waiter` não acessa caixa; teste de banco cobre permissão.
- Arquivos: `GarcomAtender.tsx`, `waiter-order.functions.ts` (do ramo `colibri`), `src/routes/_authenticated/garcom.tsx`, nova migração renumerada.
- Riscos: colisão das migrações `0019`–`0021`. Dependências: H0.1.

**H0.3 — Reaplicar KDS por pedido, som e painel de senhas.**
- Critérios: tickets agrupados por pedido; som em ticket novo com opção de desligar; rota de senhas pública só leitura; sem regressão do KDS por item.
- Arquivos: `Kds.tsx`, `beep.ts`, `$restaurante.cozinha.tsx`, `$restaurante.senhas.tsx` (ramo `colibri`).

---

## Épico A — PDV confiável (P0)

**A1 — Lançamento idempotente.** Como garçom, se eu tocar duas vezes em "Enviar" ou a rede oscilar, o pedido entra uma vez só.
- Critérios: `launchOrder` envia `clientOrderId` (UUID gerado no aparelho); repetir a chamada com o mesmo id devolve o mesmo `order_id` sem novos itens; teste de banco com duas chamadas idênticas.
- Arquivos: `src/lib/tipe/pdv.functions.ts:107`, `RestaurantPanel.tsx:383`, migração: `pdv_orders.client_order_id` único por restaurante + nova assinatura de `pdv_launch_order`.

**A2 — KDS em tempo real.**
- Critérios: item lançado aparece no KDS em menos de 2 s sem recarregar; com o Realtime fora, a consulta de 10 s continua.
- Arquivos: `AdminSections.tsx:22-25,78`; migração: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pdv_order_items`.

**A3 — Caixa com esperado no servidor.** Como caixa, quero ver quanto deve haver em dinheiro e em maquininha separadamente.
- Critérios: `cash_close` ignora o esperado enviado pelo navegador e calcula no banco: troco + reforços − sangrias + pagamentos presenciais em dinheiro (menos troco) da sessão; maquininha, Pix Tipe e cartão online aparecem em linhas próprias; a diferença gravada é a do servidor; teste de banco cobre sessão com dinheiro e maquininha.
- Arquivos: `AdminSections.tsx:114-190`, `admin.functions.ts:21-50`, migração de `cash_close` e coluna `expected_by_method jsonb`.

**A4 — Fechamento do dia bloqueante.**
- Critérios: fechar o caixa fica bloqueado (com lista do que falta) se houver mesa com saldo, pagamento presencial pendente ou pendência financeira aberta; o dono pode forçar com motivo, registrado em auditoria.
- Arquivos: `AdminSections.tsx` (Caixa), `incidents.functions.ts`, `daily-close.ts`.
- Dependências: A3.

**A5 — Modificadores estruturados.** Como garçom, quero escolher o ponto da carne e adicionais com preço, sem digitar.
- Critérios: dono cria grupos (nome, mín, máx, obrigatório, visível/oculto) com opções e preço (positivo ou negativo) e liga a itens; no lançamento, item com grupo obrigatório não entra no carrinho sem a escolha; a conta e o KDS mostram as opções; o preço da linha soma as opções; a divisão por item no QR continua exata ao centavo (`bill-math.ts`), tratando item + opções como uma unidade; itens com opções diferentes não se fundem numa linha.
- Arquivos: migração (`menu_modifier_groups`, `menu_modifiers`, `menu_item_modifier_groups`, `pdv_order_item_modifiers`; chave de `table_bill_items` passa a incluir assinatura das opções), `pdv_launch_order`, `Cardapio` (`RestaurantPanel.tsx:579`), novo `ModifierSheet`, KDS, `$restaurante.$mesa.tsx`, `bill-math.ts` + testes.
- Riscos: a chave atual `(restaurant_slug, table_number, item_code)` agrega por código; mudar exige migração cuidadosa e testes de pagamento. Dependências: A1.

**A6 — Desconto e acréscimo com motivo.**
- Critérios: desconto por item ou conta (valor ou %), motivo obrigatório; acima do limite do papel, pede PIN de gerente; aparece na conta do QR, no fechamento do dia e no relatório de descontos.
- Arquivos: migração (`bill_adjustments`), `MesaDetalhe` (`RestaurantPanel.tsx:292`), `daily-close.ts`, `Relatorios`.
- Dependências: A7.

**A7 — Papel de gerente e aprovação por PIN.**
- Critérios: novo papel `manager` em `app_role`; PIN de 4–6 dígitos por pessoa guardado com hash; ações sensíveis (cancelar item, desconto acima do limite, reabrir mesa, sangria acima do limite) abrem `ManagerPinDialog` quando o usuário não tem permissão; cada aprovação grava quem pediu, quem aprovou e a ação.
- Arquivos: migração (enum, `staff_pins`, `role_permissions`, `operation_audit`), `staff.functions.ts`, `has_restaurant_role` (sem atalho de founder).

---

## Épico B — Salão vivo (P0/P1)

**B1 — Estado do pedido e do pagamento no mapa.**
- Critérios: cada mesa mostra um estado único (livre, ocupada, enviado, pronto, pagando pelo QR, aguardando caixa, paga) com cor + texto + ícone; o estado "pronto" vem do KDS; "pagando" vem de pagamento `pending`; tempo desde o primeiro item; mesa acima do limite configurado ganha faixa de atraso.
- Arquivos: `RestaurantPanel.tsx:46-112` (cálculo sai do componente para uma função pura testada), novo `TableTile`, tokens de status em `src/styles.css`.
- Dependências: A2.

**B2 — KDS operacional.**
- Critérios: cabeçalho muda de cor nos limiares (padrão 10 e 20 min, configuráveis); tocar em "Pronto" mostra desfazer por 3 s; aba "Concluídos" com recall; selo "pago" quando a conta da mesa está quitada; tema escuro por padrão.
- Arquivos: `Kds.tsx` (reaplicado), `pdv_set_item_status` (permitir voltar um estado), novo `UndoToast`, `ElapsedTimer`.

**B3 — Notificações para a equipe.**
- Critérios: no painel e no app do garçom, aviso com som quando: mesa paga pelo QR, pedido pronto, cliente pediu a conta, avaliação ≤ 2; o garçom só recebe das suas mesas; histórico das últimas 24 h.
- Arquivos: nova tabela `staff_notifications` com Realtime, `RestaurantPanel.tsx`, `garcom.tsx`.

**B4 — Chamado do cliente.**
- Critérios: na conta do QR, botões "Chamar garçom" e "Pedir a conta" com limite de 1 por 2 min por mesa; geram notificação B3; não exigem login.
- Arquivos: `$restaurante.$mesa.tsx`, função de servidor com `enforceRate` (`security.server.ts`).

**B5 — Dashboard de hoje.**
- Critérios: vendas, ticket médio, mesas abertas, tempo médio de mesa, alertas (pendências, mesa atrasada, caixa) e vendas por hora comparadas com a mesma semana anterior, só com dados reais (`StatCard empty` quando não houver).
- Arquivos: `Inicio` (`AdminSections.tsx:36`), `admin.functions.ts`.

---

## Épico C — Brasil obrigatório (P0/P1)

**C1 — Agente local de impressão.**
- Critérios: aplicativo instalável (Windows primeiro) que entra com código do restaurante, assina os pedidos por Realtime e imprime em ESC/POS por estação; reimpressão manual; pré-conta impressa pelo painel; o painel mostra se o agente está conectado; pedidos lançados com o agente desligado ficam numa fila e imprimem ao voltar.
- Arquivos: novo projeto separado (fora do build da aplicação web), `pdv_order_items` (campo `printed_at`), tela de configuração em `Configuracoes` (`AdminSections.tsx:365`).
- Riscos: diversidade de impressoras; começar com dois modelos comuns.

**C2 — NFC-e via parceiro.**
- Critérios: dono informa regime, CSC e envia o certificado A1 **direto ao emissor** (a Tipe não guarda o certificado); cada produto tem NCM e CFOP; ao fechar a conta, a NFC-e é emitida de forma assíncrona com fila e nova tentativa; taxa de serviço destacada; falha vira pendência no Caixa; DANFE NFC-e com QR para o cliente; ambiente de homologação primeiro.
- Arquivos: migração (`fiscal_settings`, `fiscal_documents`, colunas fiscais em `pdv_menu_items`), novo `src/lib/tipe/fiscal/*.server.ts` no mesmo padrão do outbox (`pdv/outbox.server.ts`).
- Dependências: emissor escolhido; conta paga com entidade de conta (pode começar por mesa).

**C3 — Descoberta Saipos (forma b).**
- Critérios: documento com o que a Order API permite (ler conta da mesa? registrar pagamento? webhook?); se permitir, adaptador `saipos` passa em `verificarAdaptador` (`pdv/contract.ts`) com payload de exemplo; se não permitir, registro do que falta pedir na parceria.
- Arquivos: `src/lib/tipe/pdv/adapters/saipos.server.ts` (se viável), `registry.server.ts`.

---

## Épico D — P1 comercial (após os 90 dias)

| História | Critério principal | Arquivos/migração |
|---|---|---|
| D1 Entidade conta e comanda individual | uma mesa pode ter várias contas com nome ou número; o QR paga a conta certa; histórico preservado | `bills`, `bill_id` em itens e pagamentos; `archive_and_reopen_table` |
| D2 Juntar mesas e transferir itens | mover N unidades de um item entre contas, com auditoria; desfazer junção | depende de D1 |
| D3 Planta do salão | arrastar mesas, áreas, lotação padrão; garçom só visualiza | colunas em `restaurant_tables` |
| D4 App do garçom em maquininha smart | roda em tela de 5,5" Android sem rolagem horizontal; alvos ≥ 48 px | app web empacotado ou PWA; homologação com adquirente |
| D5 Resumo diário imutável e exportação | registro gravado por data de negócio com versão; CSV totais e detalhe; webhook | `daily_closes`, `daily-close.ts` |
| D6 Resumo diário por e-mail | e-mail às 8 h com números de ontem e texto curto da Lebre, dentro do teto `lebre_consume` | rotina agendada no Lovable |
| D7 Relatórios completos | período livre; por hora, categoria, item, garçom; tudo exportável | `getReports` |
| D8 Módulos por plano | KDS, impressão, NFC-e, integração ligados por plano; bloqueio no servidor | `restaurant_modules` |
| D9 Entrada de aparelho por código | código de 6 dígitos válido por 10 min cria sessão de aparelho com perfil (Salão, Cozinha, Bar) | `device_sessions` |
| D10 Rateio da taxa de serviço | só após parecer jurídico; regra por convenção, relatório por pessoa | `service_fee_policies` |

## Fora deste backlog (decisão do dono)

Cartão de crédito na conta pelo QR: conflita com a regra do `AGENTS.md` ("Do not offer direct card entry on the bill"). Se a regra for revogada, a história está descrita em `02-SUNDAY-VS-TIPE.md` §3.1 (pasta compartilhada).
