# Square for Restaurants (EUA): nota de benchmark

Data de consulta de todas as fontes: 2026-10-14. Convenção de etiquetas: [TELA] só quando o artigo oficial de ajuda descreve botões e passos concretos ("toque em X, depois Y"); como a pesquisa foi feita lendo texto, não vendo telas, [TELA] aqui significa "fluxo de tela descrito passo a passo pela ajuda oficial", não "captura vista". [DOC] = documentação oficial ou de API sem passo de tela. [MKT] = marketing. [INF] = inferência minha, com a origem indicada.

Contexto importante: em 2025 a Square deixou de tratar "Square for Restaurants" como app separado e passou a um **Square Point of Sale redesenhado com "modes"** (full service, quick service, bar/brewery, catering; retail como modo adicional). A Square Handheld roda esse app de fábrica (press release de 13/05/2025) [MKT]. A página de preços atual (out/2026) não tem mais plano "for Restaurants" próprio: são Free, Plus e Premium genéricos, com recursos de restaurante no Plus e Premium [DOC]. Vários artigos de ajuda ainda usam o nome antigo ("Square for Restaurants Plus or Premium").

## 1. Módulos e o que cada um faz

| Módulo | O que faz | Etiqueta |
|---|---|---|
| POS com modes (Full service, Quick service, Bar) | Um único app; cada "mode" é um conjunto de configurações compartilhado por todos os dispositivos daquele modo. Templates prontos: table service, counter service, bar/lounge. | [DOC] ajuda 6390; [MKT] press 2025 |
| Floor plan | Criado no Dashboard (Settings > Restaurant settings > Floor plans), com seções (salão, bar, pátio), tabelas com nome automático ou customizado, mover, redimensionar, mudar formato. Mesa fica "ocupada" assim que se informa o número de pessoas, mesmo sem itens. Exige Plus/Premium e modo full service ou bar. | [TELA] ajuda 6427 |
| Checks (open checks/open tickets) | Lista e mapa de contas abertas; void, comp, reatribuir garçom, mover item (para outro course, conta nova ou existente), mover/mesclar conta; arrastar mesa sobre mesa no mapa para mover ou mesclar. | [TELA] ajuda 6429 |
| Seats | Rastreamento de assentos com posição opcional ou obrigatória; ordenar carrinho por assento; mover itens entre assentos; criar conta individual por assento. | [TELA] ajuda 8583 |
| Coursing (hold & fire) | Cursos no carrinho; cada curso tem ícone de "fire" ou "hold"; só os disparados vão à cozinha. | [TELA] ajuda 7748 |
| Send & Stay | Botão "Stay" envia itens à cozinha sem sair da tela de pedido. Desligado por padrão. | [TELA] ajuda 8612 (IE) |
| Split check | Por item, por assento, igualmente; itens fracionados (ex.: 1/3 de garrafa de vinho). | [TELA] ajuda 8165; [DOC] ajuda 8421 |
| Scan to Pay | QR no recibo impresso para o cliente pagar. | [DOC] ajuda 8421 |
| Bar tabs com pré-autorização | Pré-autoriza cartão por um valor; dura cerca de 36 h. | [DOC] ajuda 8421 |
| House Accounts | Conta corrente de cliente com limite e fatura posterior. | [DOC] ajuda 8421 |
| Item library, menus, modificadores | Menus por local com horário (por menu e por grupo), Kitchen Facing Name, "Edit POS Layout"; modificadores com regras de seleção, "conversational modifiers" (Add/No/Extra), cor por opção no KDS. Auto 86 e contagem de itens. | [TELA] ajuda 6424 e 5119; [MKT] página restaurants |
| Square KDS | App Android (prep ou expeditor), timers amarelo/vermelho configuráveis, cor por modificador, All Day counts, 4 a 10 colunas, roteamento por POS de origem e por categoria, relatórios de tempo de preparo. Pago à parte por dispositivo. | [TELA] ajuda 7944, 8171, 7959; [MKT] página KDS |
| Square Handheld | Aparelho de 6,2", IP54, 315 g, leitor de código de barras, câmera, bateria "de um dia"; pedido na mesa e floor plan. | [MKT] press IE e press US 2025 |
| Gorjetas e tip pooling | Gorjeta na tela (smart tip, 3 percentuais, valor livre, round-up), no papel, ajuste em até 36 h; tip pooling no Dashboard por transação, por horas trabalhadas, por percentual por cargo. | [TELA] ajuda 8631, 8375, 7654, 8141 |
| Dashboard web e app Dashboard | Back-office; app mobile redesenhado em 2025 com alertas em tempo real, fluxo de caixa, folha, ponto, escalas. Square AI (beta) responde perguntas sobre os dados. | [MKT] press 2025; releases Vol. 2 2025 |
| Online ordering, Kiosk, Voice Ordering (beta), integrações delivery | Página de pedido online sem comissão; Kiosk; Grubhub, Uber Eats, DoorDash; Resy, OpenTable, SevenRooms. | [MKT] releases 2025 |
| Inventário | Square Restaurant Inventory by MarketMan (US$ 99/mês por local); Order Guide (beta) compara preço de fornecedores. | [DOC] pricing; [MKT] releases |

## 2. Fluxos principais passo a passo

Contagem de toques: conto cada botão/elemento citado pela ajuda. Seleção de itens do cardápio e digitação contam como variáveis (n). Quando a ajuda não detalha, digo "não verificado".

### 2.1 Abrir mesa
Fonte: ajuda 8152 e 7748 [TELA].
1. Tocar na mesa no "Floor plan" (ou "New Bill" na tela "Bills" e escolher a mesa).
2. Selecionar o número de convidados.
Toques: **2** (mesa + número de pessoas). A mesa passa a "ocupada" já nesse momento (ajuda 6427) [TELA]. Se a configuração exige posição de assento obrigatória ("Track cover count with required seat positions"), há passos adicionais por item (ajuda 8583) [TELA]; contagem não verificada.

### 2.2 Lançar pedido com modificador
Fonte: ajuda 8152 [TELA] e 5119 [TELA].
1. Abrir o grupo/menu (ex.: bebidas) e tocar no item.
2. Escolher o(s) modificador(es) exigido(s). Com "conversational modifiers" ligado, aparecem botões "Add", "No", "Extra".
3. "Add to check".
Toques: **[INF] cerca de 3 a 4 por item com um modificador** (item + modificador + Add to check, mais 1 se trocar de grupo). Derivado da sequência descrita; a ajuda não dá contagem explícita, e não há verificação de se o modal fecha sozinho quando o modificador é de seleção única.

### 2.3 Enviar à cozinha
Fonte: ajuda 8152, 7748, 8612 [TELA].
- Sem coursing: "Send" (1 toque). Bebidas: o exemplo oficial é lançar e tocar "Send" para o bar.
- Com coursing: tocar no ícone de fogo de cada curso e depois "Send" (1 + número de cursos). Curso em "hold" não vai até ser disparado: reabrir conta, tocar fogo, "Send" (3 toques).
- Send & Stay: "Stay" envia e mantém a tela de pedido aberta (1 toque, sem voltar ao mapa).

### 2.4 Dividir conta
Fonte: ajuda 8165 [TELA].
- Por item: selecionar conta, "Actions", "Split check", "Split by item", selecionar n itens, "Create New Check", "Save All". **6 toques + n**.
- Por assento: conta, "Actions", "Split check", "Split by seat" (cria uma conta por assento com itens), "Save". **5 toques** (exige seat tracking ligado no Dashboard).
- Igualmente: conta, "Actions", "Split check", "Split evenly", escolher número de partes, "Save". **6 toques**.
- Limites: não divide itens vendidos por unidade de medida; modificador não se divide sozinho (acompanha o item pai); descontos/taxas de nível de carrinho ficam na conta original no split por assento; dividir item em frações exige Plus/Premium com "New order and pay capabilities".
- Split de pagamento só por valor (artigo "Process split payments", não lido) [DOC].

### 2.5 Receber pagamento com gorjeta
- Configuração (ajuda 8631) [TELA]: Dashboard > Settings > Device Management > Modes > modo > Manage > Tipping > "Collect tips". Smart tip: acima de US$ 10, opções "No Tip, 15%, 20%, 25%"; abaixo, US$ 1, 2, 3. Ou três percentuais customizados. Antes ou depois de impostos. Round-up opcional. Gorjeta no papel com "quick tips on authorization slip" (caixinhas para marcar).
- Ajuste posterior (ajuda 8375) [TELA]: "Transactions" > ícone de cartão > selecionar pagamento > digitar gorjeta > "Add" > "Settle $ Total". **5 toques + digitação**. Em lote: mesma tela, vários pagamentos de uma vez. Gorjeta precisa ser lançada em até 36 h; contas assinadas não ajustadas liquidam automaticamente com gorjeta US$ 0 após 36 h.
- Passo de cobrança na tela do cliente (toques do garçom para iniciar o pagamento): **não verificado**; o artigo de checkout não foi encontrado nesta rodada.

### 2.6 Fechar mesa
- Ajuda 8152 diz apenas "volte à mesa para finalizar a conta" [TELA, sem detalhe]. Contagem não verificada.
- "Close of Day report" liquida contas abertas assinadas (ajuda 8375) [DOC].

### 2.7 Fluxos auxiliares úteis (para comparação)
- Void de item: "Checks" ou "Floor plan" > conta > item > três pontos > "Void" > motivo > "Void". **6 toques** (ajuda 6429) [TELA].
- Mesclar mesas: no "Floor plan", pressionar e segurar a mesa, arrastar sobre outra, soltar, confirmar. **~3 gestos** [TELA].
- Reatribuir conta: conta > "Actions" > "Assign" > garçom > "Assign". **5 toques** [TELA].

## 3. Padrões de interface que explicam a eficiência

| Padrão | Evidência | Etiqueta |
|---|---|---|
| Configuração por "mode", não por aparelho | Uma mudança no modo vale para todos os dispositivos do modo; templates prontos por tipo de serviço. Reduz configuração repetida. | [DOC] 6390 |
| Login por device code | Aparelho entra com código de uso único gerado no Dashboard, enviável por SMS/e-mail; não usa e-mail e senha do dono. | [DOC] 6390 |
| Mapa como hub | Mapa e lista "Checks" são as duas portas para qualquer conta; drag-and-drop de mesa sobre mesa para mover ou mesclar. | [TELA] 6429 |
| Ocupação imediata | Mesa vira ocupada ao informar cobertos, antes de itens: o salão reflete a realidade cedo. | [TELA] 6427 |
| Ações agrupadas em "Actions" e "três pontos" | Ações de conta (split, void, comp, assign, move) num menu "Actions"; ações de item num menu "…". Padrão consistente que poupa espaço na tela. | [TELA] 6429, 8165 |
| Motivo obrigatório em void/comp | Toda anulação ou cortesia pede motivo; mover conta de outro garçom pede passcode ou permissão. | [TELA] 6429 |
| Desfazer por tempo no KDS | Tocar item ou banner de ticket conclui; tocar de novo em até 3 s desfaz; depois, "Recall" na aba Completed. | [TELA] 8171 |
| Cores de status no KDS | Timer amarelo e vermelho com limiares em minutos; cor configurável por opção de modificador (ex.: alergia em vermelho). | [TELA] 7944 |
| Densidade ajustável no KDS | 4 a 10 colunas, layout e tamanho de texto; som de novo ticket customizável. | [TELA] 7944 |
| All Day counts | Totais por item em todos os pedidos abertos, com opção de separar fired e held. | [TELA] 7944 |
| Modificadores "conversacionais" | Botões Add/No/Extra em vez de listas longas; preço negativo para remoções ("No cheese" −US$ 1). Esgotados vão para o fim. | [TELA] 5119 |
| Kitchen Facing Name | Nome curto para cozinha diferente do nome no cardápio. | [TELA] 6424 |
| Send & Stay | Envia rodada à cozinha sem sair do pedido. | [TELA] 8612 |
| Modo escuro | "Display mode" escuro para salões e bares com pouca luz. | [MKT] 8179 |
| Smart tip | Opções de gorjeta mudam conforme o valor (fixas abaixo de US$ 10, percentuais acima). | [TELA] 8631 |
| Alvos de toque, tamanhos de botão | Não verificado (nenhuma fonte textual dá medidas). | n/d |

## 4. Limitações e reclamações recorrentes

- **Custos acumulados por add-on**: KDS pago por dispositivo, Kiosk pago, inventário pago à parte. Capterra, Clay S. (09/10/2025): "There's a fee for almost every additional feature". Charly R. (04/06/2026): taxa de processamento "adds up overtime". [DOC pricing + avaliação]
- **Atualizações que quebram hardware**: Matthew L. (Capterra, 03/08/2026): updates "kick off the printer profiles" e quebraram tap-to-pay.
- **Dependência de internet**: Donnie M. (Capterra, 19/11/2024): sem internet, tickets se perdem e impressoras não imprimem a partir do KDS.
- **Relatórios rasos**: John L. (Capterra, 17/06/2025) quer "a bit more depth"; post antigo na Square Community (02/12/2021) chama relatórios de "just weak" e diz que o produto parece "mostly geared towards cafes".
- **Suporte inconsistente**: vários reviews no Capterra; nota geral 4,4/5 com 54 avaliações (página de Square for Restaurants no Capterra).
- **KDS: All Day count ignora pedidos de tabs abertos**: thread na Square Community (06/07/2026), pub em Premium, sem resposta da Square até a consulta.
- **Troca entre tickets e pedidos para viagem confusa** (Sayda D., Capterra, 17/06/2025); limites de comp/desconto (Ruby W., 07/03/2024).
- **Floor plan só no Dashboard web** [INF da ajuda 6427, que só descreve criação no Dashboard]; mesclar mesas só no Square Register (Terminal e Handheld só visualizam mesas mescladas) [TELA 6427].
- **KDS só Android**, com recomendação forte do hardware MicroTouch; outros aparelhos têm suporte de "menor prioridade" [DOC 7944].
- **Restrições de split**: modificador não se divide sozinho; desconto de carrinho não acompanha split por assento [TELA 8165].
- G2: a URL do produto redirecionou para a página de categoria; o resumo gerado por IA da G2 lista "high fees" como contra da Square. Reddit: não verificado (busca bloqueada).

## 5. Modelo de preço observável (consulta 2026-10-14, squareup.com/us/en/pricing)

| Item | Free | Plus | Premium |
|---|---|---|---|
| Assinatura por local/mês | US$ 0 | US$ 49 | US$ 149 |
| Cartão presente | 2,6% + 15¢ | 2,5% + 15¢ | 2,4% + 15¢ |
| Online (web/fatura) | 3,3% + 30¢ | 2,9% + 30¢ | 2,9% + 30¢ |
| Online via API | 2,9% + 30¢ | 2,9% + 30¢ | 2,9% + 30¢ |
| Digitado / card on file | 3,5% + 15¢ | 3,5% + 15¢ | 3,5% + 15¢ |
| KDS por dispositivo/mês | indisponível | US$ 30 | US$ 20 |
| Kiosk por dispositivo/mês | indisponível | US$ 50 | US$ 30 |
| Recursos de restaurante (floor plan, coursing, split por item, tip pooling) | não | sim (tip pooling: Plus ou Premium na ajuda 7654) | sim |

- Square Pro: preço customizado para quem processa mais de US$ 250 mil/ano [DOC].
- Trial de 30 dias do Plus; sem fidelidade ("Upgrade or cancel anytime"); hardware não incluso [MKT página restaurants].
- MarketMan: US$ 99/mês por local [DOC].
- Handheld: €199 + IVA na Irlanda (press IE) [MKT]; US$ 399 citado por PaymentsJournal (13/05/2025), sem confirmar se é preço EUA. Preço oficial EUA: não verificado.
- Observação: o modelo é **assinatura por local + taxa por transação + add-ons por dispositivo**. Não há cobrança por número de mesas.

## 6. O que se aplica à Tipe

### (a) Tipe completo
1. **Configuração por "modo" com templates** (mesa, balcão, bar) e login de aparelho por código curto enviado por SMS/WhatsApp. Casa com "implantação fácil" e mobile-first [DOC 6390].
2. **Mesa ocupada ao informar cobertos** e mapa como porta principal, com arrastar mesa sobre mesa para transferir/juntar. Tipe deveria permitir juntar mesas no celular do garçom, coisa que a Square restringe ao Register [TELA 6427, 6429].
3. **Menu "Ações" único por conta** (dividir, transferir, cortesia, anular, reatribuir) e "…" por item, com motivo obrigatório em anulação/cortesia. Bom para auditoria de caixa [TELA 6429].
4. **Hold & fire + Send & Stay**: enviar rodada sem sair do pedido é o padrão certo para garçom em celular [TELA 7748, 8612].
5. **Modificadores**: regras min/max/obrigatório, "No/Extra" em botões, preço negativo para remoção, Kitchen Facing Name, cor por modificador no KDS, esgotado vai para o fim [TELA 5119, 6424, 7944].
6. **KDS**: timers amarelo/vermelho configuráveis, toque no item para concluir com desfazer de 3 s, Recall, All Day counts incluindo mesas abertas (a falha da Square é oportunidade), colunas ajustáveis, rodar em qualquer tablet ou TV com navegador em vez de só Android [TELA 7944, 8171; INF da limitação].
7. **Divisão**: a Tipe já divide por item com frações; a Square só chegou a frações recentemente e não divide modificador separado. Manter a vantagem e evitar perder descontos no split por assento [TELA 8165].
8. **Gorjeta**: smart tip por faixa de valor, e tip pooling com regras (por transação, por horas, por percentual de cargo, gorjeta sem atribuição dividida entre quem trabalhou no dia). A regra Tipe 70/30 pode ser um "pool" pré-configurado, com relatório por garçom [TELA 7654, 8631].
9. **Preço**: Square cobra por local e por dispositivo de KDS; a Tipe cobra por mesa. Diferenciar com KDS e app de garçom inclusos evita a dor "fee for every feature" [DOC pricing; avaliações].
10. **Offline**: reclamação recorrente de perda de tickets sem internet; Tipe deve planejar fila local no app de garçom e KDS [INF de Capterra].

### (b) Só fechamento de conta integrado ao Square
O que as APIs públicas permitem e não permitem (fontes developer.squareup.com):
- **Catalog API** [DOC]: ler itens, variações, modifier lists com `min_selected_modifiers`, `max_selected_modifiers`, `allow_quantities`, `on_by_default`, `hidden_online`, `price_money`; webhook `catalog.version.updated` para sincronizar. Permite à Tipe espelhar o cardápio.
- **Orders API** [DOC]: criar pedidos com line items de catálogo ou avulsos, modificadores com quantidade, impostos, descontos, service charges, frações; `CalculateOrder` para prever totais; estados DRAFT e OPEN. Mas um pedido só aparece no Dashboard/POS quando **tem fulfillment e está pago**.
- **Open tickets/checks do POS**: staff da Square no fórum (18/04/2025): "creating an open ticket that's visible on the device isn't currently available" e "An order will only show on the KDS when it's paid for". Ler conta aberta do POS via API: não confirmado por staff (só relato de usuário). [DOC fórum oficial]
- **Payments API** [DOC]: Tipe pode processar pagamento ligado a um `order_id` (online via API: 2,9% + 30¢ nos EUA). Webhooks `payment.created`, `payment.updated`, `refund.*`.
- **Webhooks de pedido** [DOC]: `order.created`, `order.updated`, `order.fulfillment.updated`; relatos de que `order.created` passou a chegar como DRAFT (fev/2025), e o suporte sugeriu escutar `payment.created`.
- **Outros webhooks úteis**: `labor.timecard.*`, `team_member.*`, `terminal.checkout.*` [DOC].
- **Conclusão [INF]**: a integração "QR na mesa paga a conta aberta no POS Square" esbarra na falta de API para ler/atualizar open tickets de forma confiável. O caminho viável seria a Tipe ser dona do pedido (criar e pagar via API, que então aparece no POS como venda paga), ou usar o próprio "Scan to Pay" da Square, que já é concorrente direto do item (b). Para o Brasil isso é teórico (Square não opera no Brasil), mas o padrão "integração só pós-pagamento" é um risco comum a investigar nos PDVs brasileiros.

## 7. Fontes

| Plataforma · página | URL | Data | Etiqueta |
|---|---|---|---|
| Square · Restaurant POS | https://squareup.com/us/en/point-of-sale/restaurants | 2026-10-14 | MKT |
| Square · Pricing | https://squareup.com/us/en/pricing | 2026-10-14 | DOC |
| Square Support · Create a floor plan | https://squareup.com/help/us/en/article/6427-building-your-floor-plan | 2026-10-14 | TELA |
| Square Support · Manage checks | https://squareup.com/help/us/en/article/6429-check-management-with-square-for-restaurants | 2026-10-14 | TELA |
| Square Support · Split a check by item or seat | https://squareup.com/help/us/en/article/8165-split-a-payment-and-check-with-square-for-restaurants | 2026-10-14 | TELA |
| Square Support · Take orders tableside | https://squareup.com/help/us/en/article/8152-take-orders-tableside-with-square-for-restaurants-mobile-pos | 2026-10-14 | TELA |
| Square Support · Set up coursing | https://squareup.com/help/us/en/article/7748-coursing-with-square-kds | 2026-10-14 | TELA |
| Square Support · New order and pay capabilities | https://squareup.com/help/us/en/article/8421-new-order-and-pay-capabilities-with-square-for-restaurants | 2026-10-14 | DOC |
| Square Support · Manage seats | https://squareup.com/help/us/en/article/8583-manage-seats-in-your-restaurant | 2026-10-14 | TELA |
| Square Support · Send & Stay (IE) | https://squareup.com/help/ie/en/article/8612-set-up-send-stay-for-your-restaurant | 2026-10-14 | TELA |
| Square Support · Set up tip pooling | https://squareup.com/help/us/en/article/7654-get-started-with-tip-pooling-for-team-management | 2026-10-14 | TELA |
| Square Support · Tip out team members | https://squareup.com/help/us/en/article/8141-tip-out-team-members-with-square-for-restaurants | 2026-10-14 | TELA |
| Square Support · Settle payments and manage tips | https://squareup.com/help/us/en/article/8375-settle-payments-and-manage-tips | 2026-10-14 | TELA |
| Square Support · Set up and customize tipping | https://squareup.com/help/us/en/article/8631-set-up-and-customize-tipping | 2026-10-14 | TELA |
| Square Support · Set up your restaurants POS | https://squareup.com/help/us/en/article/6390-create-a-device-code-for-square-for-restaurants | 2026-10-14 | DOC |
| Square Support · Create and edit modifiers | https://squareup.com/help/us/en/article/5119-create-and-manage-item-modifiers | 2026-10-14 | TELA |
| Square Support · Create and update menus | https://squareup.com/help/us/en/article/6424-create-menus-with-square-for-restaurants | 2026-10-14 | TELA |
| Square Support · Set up Square KDS | https://squareup.com/help/us/en/article/7944-get-started-with-square-kds-android | 2026-10-14 | TELA |
| Square Support · Complete and recall orders KDS | https://squareup.com/help/us/en/article/8171-complete-orders-with-square-kds | 2026-10-14 | TELA |
| Square Support · Route orders KDS | https://squareup.com/help/us/en/article/7959-route-orders-with-your-kds | 2026-10-14 | TELA |
| Square Support · Understand improvements | https://squareup.com/help/us/en/article/8179-understand-improvements-to-square-for-restaurants | 2026-10-14 | MKT |
| Square · Kitchen Display System | https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system | 2026-10-14 | MKT |
| Square · Press Handheld + F&B platform (13/05/2025) | https://squareup.com/us/en/press/releases-food-and-beverage | 2026-10-14 | MKT |
| Square · Press Handheld Ireland | https://squareup.com/ie/en/press/square-handheld-ireland | 2026-10-14 | MKT |
| Square · Releases F&B Vol. 2 2025 | https://squareup.com/us/en/releases/food-and-beverage | 2026-10-14 | MKT |
| PaymentsJournal · Handheld (13/05/2025) | https://www.paymentsjournal.com/square-aims-to-move-upmarket-with-handheld-pos-device | 2026-10-14 | terceiro |
| Square Developer · Create Orders | https://developer.squareup.com/docs/orders-api/create-orders | 2026-10-14 | DOC |
| Square Developer · Modifiers (Catalog) | https://developer.squareup.com/docs/catalog-api/enable-modifiers-on-items | 2026-10-14 | DOC |
| Square Developer · Webhook Events Reference | https://developer.squareup.com/docs/webhooks/v2webhook-events-tech-ref | 2026-10-14 | DOC |
| Square Developer Forums · Open Tickets via Orders API | https://developer.squareup.com/forums/t/open-tickets-via-the-orders-api/21163 | 2026-10-14 | DOC (fórum oficial, staff) |
| Square Developer Forums · Creation of Order for POS via API | https://developer.squareup.com/forums/t/creation-of-order-for-pos-via-api/20857 | 2026-10-14 | DOC (fórum oficial) |
| Square Developer Forums · order.created behaviour | https://developer.squareup.com/forums/t/is-webhook-order-created-behaviour-changed-just-now/21178 | 2026-10-14 | DOC (fórum oficial) |
| Capterra · Square for Restaurants reviews | https://www.capterra.com/p/175628/Square-Point-of-Sale/reviews/3567538/ | 2026-10-14 | avaliação |
| Square Community · Leaving Square for Toast (2021) | https://community.squareup.com/t5/Food-Beverage/Leaving-Square-For-Toast/m-p/323889 | 2026-10-14 | avaliação |
| Square Community · KDS All Day counts (2026) | https://community.squareup.com/t5/Orders-Menu-Items-Catalog/Square-KDS-All-Day-Counts-Not-Including-Open-Table-Orders/td-p/845781 | 2026-10-14 | avaliação |

## 8. Impedimentos

- **Reddit**: busca restrita a reddit.com foi rejeitada pelo proxy de busca (HTTP 400). Sem citações de Reddit.
- **G2**: a URL de reviews de Square for Restaurants redirecionou para a página de categoria; só um resumo de IA genérico ("high fees") foi obtido.
- **Artigos não localizados ou não lidos**: checkout/pagamento passo a passo no POS de restaurante ("Take Orders at Point of Sale"), "Process split payments", "Filter orders by category with Square KDS", "Create a menu group and edit layout" (7804). Por isso faltam contagens de toques de pagamento e de fechamento de mesa.
- **Preço oficial do Handheld nos EUA**: não verificado em fonte oficial.
- **Medidas de alvos de toque, densidade de grade e paleta de cores do POS**: nenhuma fonte textual oficial; não verificado. Não foram vistas telas (regra: não baixar imagens nem acessar demos com login).
- **Blogs da Toast sobre reviews da Square**: descartados por serem fonte de concorrente direto.
