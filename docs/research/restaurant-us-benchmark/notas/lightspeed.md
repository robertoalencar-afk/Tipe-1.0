# Lightspeed Restaurant (K-Series): nota de benchmark

Data de consulta de todas as fontes: 2026-10-14. Etiquetas: [TELA] artigo de ajuda oficial que descreve botões e passos concretos (eu li texto, não vi imagens; uso [TELA] só quando o artigo nomeia botões e a sequência); [DOC] documentação oficial ou de API; [MKT] marketing; [INF] inferência minha, com origem indicada.

Resumo para a Tipe: a K-Series tem a API pública mais completa para o cenário "Tipe só fechamento de conta" que encontrei até aqui: ler conta aberta por mesa, aplicar pagamento com gorjeta separada, receber webhook de sucesso ou falha. O obstáculo não é técnico, é comercial: o escopo `orders-api` só é liberado para parceiros aprovados, não para integrações customizadas de um único restaurante.

## 1. Módulos e o que cada um faz

| Módulo | O que faz | Etiqueta / fonte |
|---|---|---|
| Restaurant POS (app iPad e iPhone) | Telas Floor plan, Register (montar pedido, desconto, cliente, nota, alergênico, iniciar pagamento), Order management (lista de pedidos abertos), Payment (método, valor, divisão). Dois modos: Table Service e Direct Sale (balcão, café, food stall). | [TELA] Getting started (F2) |
| Back Office (web) | Cadastro de itens, menus, modificadores, floor plans e mesas, order profiles, configurações de POS (gorjeta, tela padrão), usuários e permissões. Mudanças exigem "Reload" no POS em Settings > Control center. | [TELA] F3, F6, F10 |
| Floor plans | Até 150 mesas por floor plan, nome de mesa com até 4 caracteres, forma, assentos, arrastar e redimensionar. Cada floor plan tem order profile, prompt de covers, perfis de impressão. | [TELA] F3 |
| Kitchen Display System (KDS) | Timers por ticket, cores de status, roteamento comida/bar, Ticket Mode (full service) vs Production Mode (agrupa itens idênticos, QSR), alertas sonoros, estatísticas de tempo de produção. Add-on de US$ 30 por tela/mês. | [MKT] F12; preço [MKT] F13 |
| Lightspeed Tableside | Handheld que cabe no avental, bateria de 24 h, pedido da mesa à cozinha, cartão chip/tap/swipe, Apple Pay e Google Pay, divisão de conta. Sem preço público. | [MKT] F15, F14 |
| Order Anywhere | QR por mesa, cliente pede e paga no celular sem app, pagamento via Lightspeed Payments, takeaway agendado; pedido vai direto para bar/cozinha via POS; cancelar pedido pago no POS estorna automaticamente. Só K-Series. Add-on, preço sob consulta. | [MKT] F16 |
| Lightspeed Payments | Pagamento integrado. 2,6% + US$ 0,10 por transação presencial; processador de terceiros acrescenta US$ 99/mês (fonte terceira). | [MKT] F14; taxa via F21 (terceiro, não oficial) |
| Advanced Insights (relatórios) | 7 relatórios de vendas (tendências, dias e horas de pico, recorrência), Servers reports (média por conta e por cover vs média geral), Menu reports (ranking de itens), Logbook (diário da equipe), Guestbook (perfis de cliente), Campaigns (medir eventos), app Lightspeed Live (tempo real, mensagens à equipe). Permissões BO-WRITE e BO-REPORT. Disponível América do Norte, AU, NZ; Europa usa "Advanced Insights 2.0". | [DOC] F11 |
| Multi-location | Locations Manager: criar e sincronizar menus de uma interface "em até 5 segundos", ajustes por unidade, dashboard consolidado com comparação entre unidades. | [MKT] F12b |
| Outros listados | Inventário até nível de ingrediente, Lightspeed AI, Tempo, Pulse (app), Tasks, reservas (add-on), PMS, gift cards, contabilidade. Sem descrição detalhada nas páginas lidas. | [MKT] F1, F13 |
| API pública (K-Series) | Order and Pay (Online Ordering), Financial e FinancialV2, Items, Rich Item, Staff, Reservations, PMS, Tax Preview, ID Cards. | [DOC] F17 |

## 2. Fluxos principais passo a passo

Contagens a partir dos artigos de ajuda. Onde o artigo não detalha, digo "não verificado".

**2.1 Abrir mesa** [TELA] F4, F5
1. Tocar **Floor plan** (ou **Tables** na navegação antiga).
2. Tocar a mesa.
Total: 2 toques. Atalho: no Register, digitar o número da mesa no teclado e tocar **Tables**. Covers só são pedidos se o prompt estiver ativo no Back Office (passos de toque não detalhados: não verificado).

**2.2 Lançar item com modificador** [TELA] F7
1. Tocar o botão do item que tem grupo de modificadores.
2. No pop-up, tocar um ou mais modificadores.
3. (Opcional) **Duplicate** (mesmo item com mesmos modificadores) ou **Add another item** (mesmo item, outros modificadores).
4. Tocar **Add to ticket**.
Total: cerca de 3 toques para item com um modificador. Se o item não tem modificador: 1 toque [INF] (do comportamento do botão descrito em F7). Navegação entre categorias do menu: não verificado.

**2.3 Cursos e assentos** [TELA] F5
- Itens vão para Course 1 por padrão; **Add a course** (1 toque); tocar nome do curso para trocar.
- Por assento: **Display mode** > **By seat** > **Add a seat** e escolher itens (3 toques + seleção).
- Mover vários itens: **Actions** > **Edit order** > marcar itens > **Assign to** > curso/assento.

**2.4 Enviar à cozinha** [TELA] F5
- Tocar **Send - x items** no Register: 1 toque. Vai para impressora de produção ou KDS. Depois de enviado, o item não pode mudar de curso ou assento.
- Fire de curso seguinte: **Orders** > tocar o pedido > **Actions** > **Fire course** (4 toques). Curso disparado mostra chama laranja; o anterior recebe check verde.

**2.5 Dividir conta** [TELA] F6
| Modo | Passos |
|---|---|
| Por item | **Pay** > tocar linhas do hóspede > método > valor recebido > **Pay**; repetir. ~5 toques por pessoa. |
| Por covers (partes iguais) | **Pay** > **Covers** > +/- número de partes > tocar linha de cover > método/valor > **Pay**. ~6 toques. |
| Por assento | só se o pedido foi lançado por assento: **Pay** > **Seats** > assento > método/valor > **Pay**. Item compartilhado: tocar linha > **Split** > marcar linha e assento > **Pay**. |
| Por valor | **Pay** > método > **Payment amount** (canto superior direito) > digitar > **Pay**; repetir com outro método. |

**2.6 Receber pagamento com gorjeta** [TELA] F6, F10
- No POS: na tela Payments, tocar o valor ao lado de **Add tip** e ajustar. Se o valor recebido excede o devido, a diferença vira gorjeta automaticamente.
- No terminal com tela: **Pay** > tipo Lightspeed Payments > **Pay** > escolher gorjeta sugerida ou **Skip** > aproximar cartão. Cerca de 4 a 5 toques.
- Gorjeta no papel: pré-autorização, cliente escreve a gorjeta, depois **Settings** > **Payments** > campo **Tip** > **Done**, antes da captura automática na manhã seguinte.
- Sugestões: 3 percentuais ou 3 valores fixos, ou híbrido por limite de valor; cálculo antes/depois de impostos e descontos.

**2.7 Fechar mesa** [TELA] F6
- Pagamento integral: **Pay** > método > (valor recebido) > **Pay** = 3 a 4 toques; botão de pagamento rápido (ex.: **Cash**) fecha em 2 toques (**Pay** + **Cash**) [INF] a partir de "quick pay button settles immediately".
- Saldo zero fecha a conta; toggle **Print Receipt** opcional. **Cancel** sai sem finalizar.

Contagem total estimada para mesa simples (abrir, 1 item com modificador, enviar, pagar em dinheiro): 2 + 3 + 1 + 2 = cerca de 8 toques [INF] (soma das contagens acima, sem navegação de categorias).

## 3. Padrões de interface que explicam a eficiência

- **Uma tela "Register" central** com botão de envio que mostra a contagem pendente ("Send - x items"): o garçom vê quanto falta enviar sem abrir outra tela [TELA] F5.
- **Pop-up de modificadores com "Duplicate" e "Add another item"**: evita refazer escolha em pedidos repetidos [TELA] F7.
- **Floor plan com etiquetas de dono por cor** (verde = meu, laranja = de outro com acesso, vermelho = sem permissão; inicial do nome do dono) e faixa vermelha de tempo para mesa aberta há muito tempo; ícones de resumo com covers, total, tempo e status de curso [TELA] F4b.
- **Atalho por teclado numérico**: número da mesa + **Tables** abre sem passar pelo mapa [TELA] F5.
- **Divisão na própria tela de pagamento** (Covers, Seats, linhas) em vez de um fluxo separado de "split" [TELA] F6.
- **Troco excedente vira gorjeta automaticamente** [TELA] F6.
- **Coursing visual** (chama laranja, check verde) e Fire em ações do pedido [TELA] F5.
- **Configuração por "POS configuration"** aplicada a grupos de dispositivos (gorjeta, tela padrão), com reload explícito [TELA] F10, F3.
- **Modo de setup**: contas novas fazem vendas de treino sem afetar relatórios até ir ao ar [DOC] F2. Útil para implantação fácil.

## 4. Limitações e reclamações recorrentes

- **Estabilidade**: relatos de bugs, travamentos e crashes, sobretudo em horário de pico (GetApp, 4,4/5 em 216 avaliações, página atualizada set/2026) F18.
- **Curva de aprendizado e documentação**: "a powerful engine that lacks a user-friendly manual" F18.
- **Suporte e cobrança inconsistentes**: "Really bad support"; "billing department that don't care about the customer" F18 (há também elogios ao suporte 24 h).
- **Pagamentos eletrônicos**: nota 2,0 em 5 avaliações, a pior do perfil F18.
- **Integrações** confusas ou caras F18.
- **Sincronização manual**: toda mudança de floor plan exige tocar Reload no POS [TELA] F3 [INF] atrito operacional.
- **Seat split só se o pedido foi lançado por assento** [TELA] F6.
- **API**: não há endpoint para estorno ou void de recibo, só no POS [DOC] F20; integrações customizadas não têm webhooks nem `orders-api` [DOC] F19.
- **Relatórios** Advanced Insights restritos por região (NA, AU, NZ) [DOC] F11.

## 5. Modelo de preço observável (consulta 2026-10-14)

| Plano | Preço/mês (USD) | Observação |
|---|---|---|
| Starter | US$ 69 | pagamentos integrados em setup padrão |
| Essential | US$ 189 | setup customizado de pagamentos, Pro Services |
| Premium | US$ 399 | idem |
| Enterprise | sob cotação | hardware, lançamento ilimitado, time dedicado |

Fonte: página oficial de preços EUA, metadata "last modified" 1/jun/2025, rodapé 2026 [MKT] F13. Período de cobrança (mensal x anual) não informado. A lista de recursos comuns inclui floor plans, Advanced Insights, multi-location, order and pay at table e "raw API access" [MKT] F13 (a inclusão por plano é inferida, a página não mostra checkmarks no texto). Add-ons: KDS US$ 30/tela/mês; Order Anywhere, reservas, delivery, PMS, gift cards, contabilidade sem preço. Processamento: 2,6% + US$ 0,10 presencial e US$ 99/mês se usar processador de terceiros, segundo costbench (terceiro, verificado por eles em 2/jul/2026), que também diz que o Starter "foi eliminado recentemente", em conflito com a página oficial F21. API customizada para comerciante é "paid add-on" sem preço F19. Tableside e Order Anywhere: sem preço público.

## 6. O que se aplica à Tipe

### 6.1 Forma (a): Tipe completo
- **Mapa de mesas com dono por cor e tempo** é barato de copiar e resolve "de quem é a mesa": adotar verde/laranja/vermelho com inicial do garçom e faixa de alerta de tempo F4b.
- **Botão "Enviar (n itens)"** com contagem de pendentes, e bloqueio de mover item depois de enviado F5.
- **Divisão dentro da tela de pagamento** (itens, partes iguais, assentos, valor). A Tipe já divide por item com frações no QR; o mesmo motor deve servir ao garçom no PDV [INF].
- **Troco vira gorjeta** e sugestões de gorjeta configuráveis (3 % ou 3 valores, antes/depois de desconto). Casa com o modelo 70/30 [INF].
- **Modo de setup/treino** que não suja relatórios: forte para implantação fácil F2.
- **Order profiles** (salão, retirada, entrega) como conceito único para canal e taxa de serviço: a taxa de serviço por profile resolve os 10% brasileiros [INF] a partir de F20 (surcharge via Service Charge em Order Profile).
- **Modularidade como add-on** (KDS por tela, Order Anywhere, reservas): confirma que cobrar módulos separados é aceito, mas a Tipe cobra por mesa, então KDS por tela pode ser um add-on simples [INF].
- **Multiunidade**: sincronizar menu central com ajuste local e dashboard comparativo F12b.
- **Evitar**: reload manual após mudança de configuração; instabilidade em pico (principal reclamação).

### 6.2 Forma (b): Tipe só fechamento de conta integrado à K-Series

**Fluxo técnico viável** [DOC] F17, F22 a F26, com confirmação prática de um terceiro (storekit) F27:
1. OAuth2 authorization code (Keycloak `auth.lsk-prod.app`, realm `k-series`), escopos `orders-api` + `offline-access` (e `financial-api` se quiser conciliação) F23.
2. Criar webhook: `PUT /o/wh/1/webhook` com `endpointId`, `url`, opcional `withBasicAuth` + `username`/`password`, `provideAccount`, `expandTransactions`, `expandPayments`, `subscribeTo`. Sempre enviados sem assinatura: Account `CLOSED`, `CHECK_WAS_UPDATED`; Payment `SUCCESS`, `FAILURE`; Order `FAILURE`, `READY_FOR_PICKUP`, `CANCELLED`; Order API `READY`, `NOT_READY` F25. Há ainda endpoints para associar business locations ao webhook F17.
3. Descobrir mesas: `Get All Floorplans` e `Get Floorplan Tables` F17.
4. Ler conta aberta: `GET /o/op/1/order/table/{tableNumber}/getCheck?businessLocationId=` devolve `uuid`, `ikaccountId`, `tableNumber`, `clientCount`, `staffName/staffId`, `openDate`, `currentAmount`, `paidAmount`, `serviceCharge`, `salesEntries` (nome, SKU, preço unitário, quantidade, modificadores, valor com/sem imposto, desconto, subitens) e `paymentEntries`. Se há mais de uma conta na mesa, retorna a mais antiga. Todas as contas abertas do dia: `GET /o/op/1/order/table/getCheck`. Conta específica: "Get Single Check" F22, F24.
5. Aplicar pagamento: `POST /o/op/1/pay` com `iKaccountIdentifier`, `thirdPartyPaymentReference` (único, 1 a 50 chars), `endpointId`, `businessLocationId`, `paymentAmount` (sem gorjeta), `tipAmount` (separado), `paymentMethod` (código configurado pelo restaurante), opcionais `staffId`, `deviceId` (se nulo, qualquer POS recebe, só um processa), `taskTtlInMs` (mín. 60 s), `targetPrinterProfileId`. Resposta 200 `{"status":"ok"}` só significa "aceito"; referência repetida dá 400 F26.
6. Confirmação assíncrona por webhook Payment `SUCCESS`/`FAILURE`, com erros `ACCOUNT_NOT_FOUND`, `ACCOUNT_ALREADY_CLOSED`, `OVERPAID`, `PAYMENT_METHOD_NOT_FOUND`, `STAFF_NOT_FOUND`, `UNKNOWN`, timeout F28. Responder HTTP 200.
7. A conta fecha quando o saldo chega a zero [DOC] F20b ("applies payments to a placed order and closes it out"); storekit confirma pagamentos parciais múltiplos e fechamento ao zerar F27.

**Implicações de produto para a Tipe** [INF] a partir das fontes acima:
- **Divisão por item com frações**: a API recebe só um valor por pagamento, não as linhas pagas. A Tipe precisa controlar internamente quem pagou o quê e postar valores; o POS verá pagamentos parciais, não a divisão por item. Pagamentos feitos no POS reduzem o saldo lido pela Tipe (F27), então reler a conta antes de cobrar e tratar `OVERPAID`.
- **Pix**: entra como `paymentMethod` customizado que o restaurante cadastra (ex.: "TIPE_PIX"); a Tipe processa o dinheiro fora da Lightspeed. Como cadastrar o método no Back Office: não verificado.
- **Gorjeta 70/30**: `tipAmount` vai para o POS como gorjeta; atribuição ao garçom segue a regra do POS (gorjeta vai para quem processa ou para o dono da mesa) F10. A parte Tipe (30%) precisa ser liquidada fora da Lightspeed.
- **Taxa de serviço** já aparece como `serviceCharge` na conta F22.
- **Tolerância de diferença de pagamento** padrão US$ 0,02, alterável só via suporte F29.
- **Sem estorno via API**: refund só no POS F20.
- **Recibo/impressão**: `targetPrinterProfileId` e `Print Message` permitem imprimir comprovante na impressora do restaurante F17.
- **Webhook sem assinatura documentada**: usar Basic Auth do próprio webhook e validar pelo `thirdPartyReference`.

**Credenciamento e ambiente de testes** [DOC]:
- Acesso à API "reservado a parceiros Lightspeed e comerciantes aprovados" F30.
- Parceiros: registro no Developer Portal de staging (`developer-portal.lsk-demo.app`) > Request Access > aprovação do time Lightspeed > pedir API client escolhendo escopos e redirect URI > recebe Client ID/Secret por e-mail (secret mostrado uma vez). Contas demo: "Create new business" no portal, depois configurar a conta K-Series demo; exige iPad com o POS atualizado conectado. Produção: repetir tudo em `developer-portal.lsk-prod.app` F31, F32.
- Base URL demo: `https://api.trial.lsk.lightspeed.app` F17.
- **Integração customizada (um restaurante só)** é add-on pago via Account Manager, provisionamento até 48 h, mas só Financial e Items API: **`orders-api` não é suportado e não há webhooks** F19. Logo, a Tipe precisa entrar no Partner Program (formulário, contato em até 24 h úteis; requisitos técnicos, custos e revenue share não publicados) F33.
- Changelog e versionamento públicos F30.

## 7. Fontes

| # | Plataforma · página · URL · data · etiqueta |
|---|---|
| F1 | Lightspeed · Restaurant POS · https://www.lightspeedhq.com/pos/restaurant/ · 2026-10-14 · [MKT] |
| F2 | Lightspeed · Getting started (Placing basic orders) · https://k-series-support.lightspeedhq.com/hc/articles/360050308894 · 2026-10-14 · [TELA] |
| F3 | Lightspeed · Floor plans e mesas (Back Office) · https://k-series-support.lightspeedhq.com/hc/articles/1260804656709 · 2026-10-14 · [TELA] |
| F4b | Lightspeed · Floor plan screen · https://k-series-support.lightspeedhq.com/hc/articles/360050328494 · 2026-10-14 · [TELA] |
| F5 | Lightspeed · Adding orders in Table Service mode · https://k-series-support.lightspeedhq.com/hc/articles/360051089273 · 2026-10-14 · [TELA] |
| F6 | Lightspeed · Processing payments · https://k-series-support.lightspeedhq.com/hc/articles/360051089473 · 2026-10-14 · [TELA] |
| F7 | Lightspeed · Understanding modifiers and modifier groups · https://k-series-support.lightspeedhq.com/hc/articles/51623634913051 · 2026-10-14 · [TELA] |
| F10 | Lightspeed · Tip settings · https://k-series-support.lightspeedhq.com/hc/articles/4415116773403 · 2026-10-14 · [TELA] |
| F11 | Lightspeed · About Advanced Insights · https://k-series-support.lightspeedhq.com/hc/articles/7625714308763 · 2026-10-14 · [DOC] |
| F12 | Lightspeed UK · K-Series KDS · https://www.lightspeedhq.com/uk/pos/restaurant/k-series-kitchen-display-system/ · 2026-10-14 · [MKT] |
| F12b | Lightspeed UK · Multilocation · https://www.lightspeedhq.com/uk/pos/restaurant/multilocation-restaurant-epos/ · 2026-10-14 · [MKT] |
| F13 | Lightspeed · Pricing EUA · https://www.lightspeedhq.com/pos/restaurant/pricing/ · 2026-10-14 · [MKT] |
| F14 | Lightspeed · Tableside (product-info NOAM) · https://product-info.lightspeedhq.com/lightspeed-tableside-k-series-noam/ · 2026-10-14 · [MKT] |
| F15 | Lightspeed · Tableside · https://lightspeedhq.com/pos/restaurant/tableside · 2026-10-14 · [MKT] (vista via busca) |
| F16 | Lightspeed UK · Order Anywhere · https://www.lightspeedhq.com/uk/pos/restaurant/order-anywhere/ · 2026-10-14 · [MKT] |
| F17 | Lightspeed · API Reference (índice, Servers) · https://api-docs.lsk.lightspeed.app/ · 2026-10-14 · [DOC] |
| F18 | GetApp · Lightspeed Restaurant reviews · https://www.getapp.com/retail-consumer-services-software/a/lightspeed-restaurant/reviews/ · 2026-10-14 · terceiro |
| F19 | Lightspeed · Custom Integrations · https://api-portal.lsk.lightspeed.app/quick-start/custom-integrations · 2026-10-14 · [DOC] |
| F20 | Lightspeed · Online Ordering FAQ · https://api-portal.lsk.lightspeed.app/guides/integration-guides/online-ordering/online-ordering-faq · 2026-10-14 · [DOC] |
| F20b | Lightspeed · Online Ordering Features · https://api-portal.lsk.lightspeed.app/guides/integration-guides/online-ordering/online-ordering-features · 2026-10-14 · [DOC] |
| F20c | Lightspeed · Online Ordering Tutorial · https://api-portal.lsk.lightspeed.app/guides/integration-guides/online-ordering/online-ordering-tutorial · 2026-10-14 · [DOC] |
| F21 | Costbench · Lightspeed Restaurant pricing · https://costbench.com/changelog/lightspeed-restaurant-plans-renamed-2026-02/ · 2026-10-14 · terceiro |
| F22 | Lightspeed · Get Open Check by Table · https://api-docs.lsk.lightspeed.app/operation/operation-apechecklookup · 2026-10-14 · [DOC] |
| F23 | Lightspeed · Authentication · https://api-docs.lsk.lightspeed.app/authentication · 2026-10-14 · [DOC] |
| F24 | Lightspeed · Get All Open Checks · https://api-docs.lsk.lightspeed.app/operation/operation-apegetcheck · 2026-10-14 · [DOC] |
| F25 | Lightspeed · Create a Webhook · https://api-docs.lsk.lightspeed.app/operation/operation-apecreatewebhookoo · 2026-10-14 · [DOC] |
| F26 | Lightspeed · Apply a Payment · https://api-docs.lsk.lightspeed.app/operation/operation-apemakepayment · 2026-10-14 · [DOC] |
| F26b | Lightspeed · Create Local Order · https://api-docs.lsk.lightspeed.app/operation/operation-apelocalorder · 2026-10-14 · [DOC] |
| F27 | storekit · Lightspeed K-Series pay at table · https://storekit.com/docs/guides/integrations/pos/lightspeed/pay-at-table.md · 2026-10-14 · [DOC] de terceiro integrador |
| F28 | Lightspeed · Payment Notification · https://api-docs.lsk.lightspeed.app/operation/operation-onlinepaymentnotification · 2026-10-14 · [DOC] |
| F29 | Lightspeed · Online ordering (help) · https://k-series-support.lightspeedhq.com/hc/articles/4686224687259 · 2026-10-14 · [TELA] |
| F30 | Lightspeed · API Portal / Quick Start · https://api-portal.lsk.lightspeed.app/quick-start/intro · 2026-10-14 · [DOC] |
| F31 | Lightspeed · Developer Portal tutorial · https://api-portal.lsk.lightspeed.app/guides/tutorials/developer-portal · 2026-10-14 · [DOC] |
| F32 | Lightspeed · Guides overview · https://api-portal.lsk.lightspeed.app/guides/overview · 2026-10-14 · [DOC] |
| F33 | Lightspeed · Partners · https://www.lightspeedhq.com/partners/ · 2026-10-14 · [MKT] |

Observação sobre Create Local Order (F26b): `POST /o/op/1/order/local` aceita `accountIdentifier` de pedido existente para atualizá-lo, com bloco `payment` cujo `paymentAmount` inclui gorjeta (diferente do `/pay`). Útil se a Tipe quiser também lançar pedido pelo QR na conta aberta; a doc não confirma explicitamente adicionar itens a conta aberta (storekit diz que faz "add to bill" F27).

## 8. Impedimentos

- Não vi telas reais (só texto dos artigos); [TELA] aqui significa passos e botões descritos no artigo.
- Não encontrei artigo oficial sobre como o restaurante cadastra um método de pagamento para uso pela API (código `paymentMethod`): não verificado.
- KDS: artigo de ajuda com bump/recall/expo não localizado; só página de marketing.
- Requisitos formais, prazos, custos e revenue share do Partner Program não são públicos.
- Assinatura de webhook, política de retry e rate limits da Order and Pay API: não documentados nas páginas lidas.
- Preço de Order Anywhere, Tableside, API customizada e hardware: não públicos. Período de cobrança dos planos não informado.
- Não acessei Developer Portal, contas demo nem painéis (proibido pelas regras e exige aprovação).
- resto-support.lightspeedhq.com não foi aberto; usei k-series-support, que é a central atual da K-Series.
