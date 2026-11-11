# TouchBistro: nota de benchmark (PDV iPad para restaurantes)

Data de consulta de todas as fontes: 2026-10-14.

Observação de método. O help center atual (help.touchbistro.com) é um site Salesforce que não carregou sem JavaScript (ver Impedimentos). Os passos de tela vieram do acervo público de artigos em `cdn.touchbistro.com/help/articles/...` e de um PDF oficial de treinamento ("Front End Operation for Servers", 2016). Esse acervo descreve versões 7.x a 9.x do app e parte dele pode estar desatualizada em relação ao produto de 2026. Uso [TELA] só quando o artigo descreve botões e passos concretos ("toque em X, depois Y"); não vi capturas de tela, apenas o texto que as descreve.

## 1. Módulos e o que cada um faz

| Módulo | O que faz | Etiqueta |
|---|---|---|
| POS (app iPad) | Mapa de mesas, pedido na mesa por assento, divisão de conta, cardápio, permissões de equipe, multi-loja, modo offline. Roda em iPad. | [DOC] Product Guide 2026; [TELA] artigos de ajuda |
| Arquitetura local (legado documentado) | Um Mac roda o "TouchBistro Pro Server"; o iPad principal envia os dados ao Mac e os demais iPads sincronizam por ele (porta 1337). A maior parte da operação só precisa do Wi-Fi local; cartão, relatórios em nuvem e recibo por e-mail exigem internet. | [DOC] "POS Connectivity for Mac Pro Server" |
| Arquitetura atual (marketing) | O guia de produto 2026 descreve o POS como "cloud-based" com modo offline em que "your devices continue talking to each other, even when your internet goes down". Não verifiquei se o servidor Mac ainda é exigido em 2026. | [MKT] |
| Floor plan / table management | Andares, seções, mesas, banquetas de bar, paredes, caixas; seções atribuídas a um garçom com cor própria; travar garçom em seções/mesas; aprovação de transferência de mesa; mover itens, assentos ou a mesa inteira. Descrição da App Store cita "display of table value and time seated". | [TELA] Chapter 6; [MKT] página de recurso e App Store |
| KDS (versão legada no iPad) | Tickets com mesa, nº de convidados, hora em que sentou, nº da conta e garçom; itens marcados por assento (S1, S2); cores verde, amarelo, vermelho por tempo, com limiares configuráveis em minutos; toque no item para "fire" e de novo para "put up"; comunicação só de ida (status não volta ao POS). | [TELA] "Using the KDS" |
| KDS (atual, "powered by Fresh") | Roteamento por estação (chapa, fritadeira), POS e online na mesma tela ou separados, riscar itens e modificadores, histórico/recall, suporte a bump bar, painel com ticket médio e tempo de bump, redundância offline. Vendido à parte ("Get a Quote"). | [MKT] página KDS e Product Guide 2026 |
| Reservations | Reservas online, SMS/e-mail bidirecional, waitlist, cobrança de no-show; no iPad, botão "Live" pinta mesas por status (Seated, Main meal, Check), mesa fica roxa quando o grupo está todo sentado. | [TELA] artigo Reservations iPad; [MKT] guia |
| Cloud Reporting (Login.TouchBistro.com) e app Reports To Go | Dashboard diário ou de 7 dias, "Weekly Targets" com meta de vendas e clientes (calcula gasto médio necessário), relatórios como Sales Totals, Sales by Section, Void Report, Tax Report, Food Cost, Alcohol Cost, Payment and Refund Totals, Detailed Shift Report, Cash Tip Report, Deleted Items; filtros de data até 6 meses; exportação CSV; Remote Menu Management no portal web. Guia 2026 fala em "50+ relatórios" e consolidado multi-loja. | [DOC] "Cloud Reporting Site Basics"; [MKT] guia |
| Gestão de equipe | Clock in/out por senha pessoal, pausas, relatório de turno do garçom, tip out para a casa. Labor Management (escala, previsão, troca de turno) é add-on. | [TELA] PDF de servidores e "Ending your shift"; [MKT] guia |
| TouchBistro Payments | Pagamentos presenciais e online, com pagamento offline. Taxas sob cotação. | [MKT] |
| TouchBistro One | Portátil lançado em 11/08/2026: pedido, pagamento e impressão de recibo num só aparelho, com gestão de mesas; aceita gorjeta. Sistema operacional e preço não divulgados. | [MKT] release e guia |
| Outros add-ons | Online Ordering sem comissão, Loyalty, Gift Cards, Marketing, Inventory (sincroniza vendas a cada 15 min), Profit Management (MarginEdge), Customer Facing Display. | [MKT] |

## 2. Fluxos principais passo a passo

Contagem de toques: conto apenas toques descritos explicitamente nos artigos. Onde não há evidência, digo "não verificado".

### 2.1 Abrir mesa [TELA]
Fonte: "Seating a Table".
1. No floor plan, tocar na mesa (1 toque).
2. Abre a tela "Choose a Party Size". Nome do grupo é opcional; se vazio, o sistema numera (zera todo dia).
3. O tamanho do grupo vem preenchido com o máximo de lugares da mesa: tocar "Add" se estiver certo, ou tocar o número real de convidados (1 toque).
4. Vai direto à tela de pedido.

Total: 2 toques no caminho padrão. Dados do cliente por assento (nome, gênero, idade) são opcionais via ícone de informação do assento e "Save".

### 2.2 Lançar pedido com modificador [TELA]
Fontes: "Taking Orders", "Modifications", PDF "Front End Operation for Servers".
Layout da tela de pedido: itens do cardápio no canto superior esquerdo, pedidos por assento (barras coloridas) no superior direito, desenho da mesa com cadeiras no inferior esquerdo, resumo (total, categorias, impostos) no inferior direito. Existe "Right Hand Mode" por perfil de funcionário, que joga o cardápio para a direita, e três visualizações do cardápio (lista, grade de imagens, grade de texto).
1. Tocar a barra colorida do assento (ou tocar a cadeira no desenho da mesa) (1 toque).
2. Se houver vários cardápios, escolher no Menu Bar (0 ou 1 toque).
3. Tocar a categoria e o item (2 toques).
4. Modificador obrigatório: o diálogo "Modification" abre sozinho; cada categoria mostra o mínimo exigido; se sair sem cumprir, o item fica marcado em vermelho e, conforme configuração, o pedido não pode ser enviado. Escolher a opção (1+) e "Save" (1).
5. Modificador opcional: tocar o item, "Modifiers", opções (vão para "Current Modifiers"), "Save". O PDF diz que segurar o item com um dedo abre a tela de modificadores; um toque rápido com dois dedos duplica o item com os mesmos modificadores.
6. Modificador livre: "Custom", digitar texto, valor de acréscimo opcional, "Save".
7. Itens da mesa toda (vinho, entradas) vão na barra "Shared Order".

Total estimado para 1 item com modificador obrigatório: cerca de 5 toques (assento, categoria, item, opção, Save) [INF a partir dos passos acima].

### 2.3 Enviar à cozinha [TELA]
1. Tocar o ícone "Send" (1 toque). O administrador define se vai para impressora de cozinha/bar ou KDS.
2. Alternativa: envio por curso pela opção "Course" na tela de pedido; o artigo do KDS diz que "Resend" por curso não é suportado.
3. No KDS legado: tocar o item marca "fire" (amarelo, com timer próprio), tocar de novo marca "put up" (cinza); quando todos os itens estão fechados o KDS pede para fechar o ticket, ou arrasta-se o ticket para fora da tela. Segurar e arrastar no "Ticket Scroller" reordena prioridades. Ping sonoro a cada ticket novo. [TELA]

### 2.4 Dividir conta [TELA]
Fontes: "Checkout", PDF de servidores, "Specifying seats for a shared item".
- A divisão nasce no lançamento: cada item já fica no assento; itens em "Shared Order" se dividem automaticamente pelo número de assentos.
- Juntar assentos numa conta: deslizar o dedo de um assento ao outro (gesto patenteado; patente US 9514427, dez/2016). Separar: tocar o assento e "split from group".
- No Checkout: "Split By Seating" (cada um paga o seu assento mais a parte dos compartilhados), "Split Evenly By #" (digitar número de contas) ou "All on One". "Single Seat Checkout" pelo ícone de informação do assento. Depois que um assento paga, "All on One" junta o restante.
- Dividir um item compartilhado entre assentos específicos: tocar o item, "Split Item Among Seats", tocar cada assento, "Save" (4+ toques). Só funciona depois que o item foi enviado à cozinha.
- Total para dividir por assento: 2 toques ("Checkout", "Split By Seating") se os itens já foram lançados por assento [INF a partir dos passos].
- Divisão por fração de item arbitrária (ex.: 1/3 de um item entre pessoas fora da lógica de assento): não verificado além de "Split Item Among Seats".

### 2.5 Receber pagamento com gorjeta [TELA]
- Dinheiro: "Cash", escolher a conta (se dividida), digitar valor recebido, devolver troco, "Pay". O sistema não registra gorjeta em dinheiro no pagamento.
- Cartão em maquininha não integrada: passar o cartão no terminal primeiro; voltar ao TouchBistro, "Manual Charge/Credit", escolher bandeira, digitar valor e gorjeta, "Pay".
- Processador integrado: segue a documentação do gateway (não verificado).
- Pagamento parcial/misto: escolher o meio, preencher "Total With Tip" e "Tip Amount", "Pay", repetir até zerar.
- Gorjeta automática: "Include Gratuity" adiciona ou remove autograt (percentual ou valor). Contas marcadas "Tips Required" são fechadas depois na aba "Closed Bills".

### 2.6 Fechar mesa [TELA]
- "Print Receipt & Close Table", "Email Receipt & Close Table" (envia PNG da conta), "Close Table" (sem recibo) ou "Continue Without Closing Table" (para corrigir ou se ainda vão pedir). Corrigir pagamento: "Continue Without Closing Table", "Edit / Undo Payments", "Undo", "Save".
- Total do ciclo mais simples (1 convidado, 1 item com modificador obrigatório, dinheiro, fechar com recibo): cerca de 12 toques mais digitação do valor [INF somando 2.1 a 2.6].

## 3. Padrões de interface que explicam a eficiência

1. Assento como unidade de lançamento [TELA]. O pedido já nasce dividido por pessoa; a divisão no checkout vira um toque. Barras coloridas por assento e a barra "Shared Order" dão leitura imediata de quem pediu o quê.
2. Gestos em vez de menus [TELA]. Segurar item abre modificadores; dois dedos duplicam com modificadores; deslizar entre assentos junta contas; deslizar para a esquerda apaga (seções, andares, e itens segundo review de 2026 na Capterra). O gesto de split foi patenteado.
3. Valores padrão inteligentes [TELA]. Tamanho do grupo vem com a lotação da mesa ("Add" confirma); nome do grupo é automático; mesas novas nascem com 2 lugares e número sequencial; "Duplicate" copia mesa configurada.
4. Modificador obrigatório imposto pela interface [TELA]. Diálogo abre sozinho, item fica vermelho se incompleto e o envio pode ser bloqueado. Evita erro de cozinha sem treinar o garçom.
5. Ergonomia configurável [TELA]. "Right Hand Mode" por funcionário e três modos de visualização do cardápio.
6. Cor como identidade de responsável [TELA]. Seção atribuída a um funcionário pinta todas as mesas com a cor dele.
7. KDS de toque progressivo [TELA]. Um toque por estado (fire, put up), cor por idade do ticket com limiares em minutos, arrastar ticket para fechar, arrastar para repriorizar.
8. Botões compostos [TELA]. "Print Receipt & Close Table" faz duas ações em um toque.
9. Mapa com valor e tempo [MKT]. A descrição da App Store promete valor da mesa e tempo desde que sentou no próprio mapa; a página de recurso fala em ver mesas lentas ou de alto valor "at a glance". Cores de status por etapa da refeição no POS (sem Reservations) e timers no mapa: não verificado.

## 4. Limitações e reclamações recorrentes

| Tema | Evidência | Etiqueta |
|---|---|---|
| Suporte ruim | Tema mais frequente na Capterra; nota de atendimento 3,4/5 (geral 3,8, 414 avaliações). Ex.: "Customer Service is the worst I have ever encountered" (mai/2025), "The customer service is non existent" (nov/2025). | Avaliações de terceiros |
| Instabilidade | "System crashed several times a day" (fev/2024); "fails and becomes disconnected daily" (jan/2022); travamentos ao imprimir. App iPad com 2,72 estrelas em 442 avaliações (AppGoblin, App Store). | Terceiros |
| Atualizações em horário de pico | "Constant updating during busy times" (2023); atualizações deixam o sistema lento no pico (jan/2026); updates de iOS quebrando o app. | Terceiros |
| Relatórios fracos ou fora de sincronia | "Numbers between in store iPads and Cloud Reports were never in sync" (2021); usuário migrou para Clover por "better reporting" (2024). | Terceiros |
| Custo de add-ons e vendas agressivas | Add-ons cobrados à parte (jan/2026); "Aggressive sales" (2025); "Sales team lies about the abilities" (2024); contrato que prende (2024). | Terceiros |
| Implantação longa | "6 months of on boarding" (2025); G2 indica implantação de 1 mês. | Terceiros |
| Configurar mapa é difícil | "Creating and managing the floor plan is incredibly difficult" (2020). Imagem de fundo precisa ser 1024x768. | Terceiros; [TELA] Chapter 6 |
| KDS legado de mão única | Status de preparo não volta ao POS. | [TELA] |
| Dependência de Apple e de servidor local | Exige iPads; documentação legada exige Mac com Pro Server; cartão e nuvem dependem de internet. Usuários citam custo de trocar iPads. | [DOC]; terceiros |
| Gorjeta em dinheiro fora do pagamento | Não registrada no checkout; só declarada no clock out, se o admin ativar. | [TELA] |
| Pedidos de delivery digitados à mão | Review de out/2025 cita digitar pedidos do DoorDash manualmente. | Terceiros |

## 5. Modelo de preço observável (consultado em 2026-10-14)

| Plano | Preço | Inclui | Fonte |
|---|---|---|---|
| Point of Sale | "starting at $69/month" | Cardápio, relatórios, floor plan, equipe, suporte 24/7, integrações. Hardware, processamento e "additional fees" à parte. | touchbistro.com/pricing [MKT] |
| Essentials Bundle | "starting at $119/month" | POS + pagamentos integrados + hardware ("$0 upfront hardware"). Processamento à parte. | idem [MKT] |
| Custom Setup | Sob cotação | Soluções FOH, BOH e guest engagement. | idem [MKT] |
| Add-ons | Sob cotação | KDS, Reservations, Online Ordering, Loyalty, Gift Cards, Marketing, Labor, Inventory, Profit Management, CFD. | idem; PricingSaaS |

Divergência: o PricingSaaS registrou em 31/08/2026 Point of Sale a $89/mês e Essentials a $99/mês. A página oficial em 14/10/2026 mostra $69 e $119. Não sei se houve mudança de preço entre as datas ou erro de captura. Taxas de processamento são cotadas por histórico de crédito, volume e ticket médio. Financiamento de hardware só para 2+ terminais. Suporte e updates sem custo extra. Não há preço por terminal, prazo de contrato nem taxa de setup públicos. O modelo é por estabelecimento com add-ons, não por número de mesas.

## 6. O que se aplica à Tipe

### (a) Tipe completo (PDV/ERP + fechamento)
1. Lançar por assento desde o início. É o que torna a divisão no TouchBistro quase instantânea. A Tipe já divide por item com frações no QR; levar a mesma estrutura para o lançamento do garçom (assento ou pessoa como dono do item, mais "compartilhado" que se divide sozinho) faz o fechamento pelo QR já chegar pré-dividido.
2. Copiar os padrões: grupo com lotação padrão (abrir mesa em 2 toques), modificador obrigatório que abre sozinho e bloqueia envio, botão composto "receber e fechar", duplicar item com gesto. Meta sugerida [INF]: ciclo completo igual ou abaixo de cerca de 12 toques do TouchBistro.
3. Mapa do salão com valor e tempo sentado por mesa e cor do garçom responsável. O TouchBistro mistura cor de garçom e cor de status apenas no módulo de reservas; a Tipe pode unificar status (ocupada, pedido enviado, conta pedida, pagando por QR, paga) num só mapa, o que o TouchBistro documentado não mostra.
4. KDS de dois sentidos. O KDS legado não devolve status ao POS; a Tipe pode mostrar no mapa e na área do garçom "pronto para servir". Aproveitar a lógica verde/amarelo/vermelho com limiares em minutos e um toque por estado.
5. Gorjeta e repasse: o TouchBistro tem tip out percentual para a casa só sobre cartão e não registra gorjeta em dinheiro no pagamento. A regra da Tipe (70/30) e Pix podem ser registradas por transação, com relatório de turno do garçom ("casa deve a você" ou "você deve à casa").
6. Evitar as dores: implantação longa, updates no pico, dependência de iPad e servidor Mac, relatórios fora de sincronia. Mobile-first em qualquer aparelho, atualização fora do horário de serviço e números únicos entre salão e nuvem são diferenciais claros [INF].
7. Relatórios: o conjunto do Cloud (vendas por seção, voids, itens deletados, gorjetas, metas semanais com gasto médio necessário) é uma boa lista mínima para o backoffice.
8. Preço: o TouchBistro cobra base mais add-ons sob cotação, e isso gera reclamação. Assinatura por mesas com módulos de preço público é posicionamento oposto [INF].

### (b) Só fechamento de conta integrado ao PDV existente
- Não encontrei API pública, portal de desenvolvedor ou webhooks oficiais do TouchBistro. A página de parceiros cita "integration partners" e um "App Marketplace" acessível só a clientes logados; o capítulo de integrações lista 7shifts, MarginEdge, Shogo, MarketMan, Optimum Control, Checkmate, Craftable, Wisk, Bevcheck, Freepour, BarVision, Avero e fatura eletrônica do México, sem pagamento na mesa de terceiros. Diretórios de terceiros (API Tracker, Supergood) não confirmam API oficial. Conclusão: integração da Tipe com TouchBistro dependeria de parceria comercial; não verificado se existe programa aberto. [DOC]/[INF]
- Há precedente de pay-at-table de terceiros (notícia antiga de integração com PayPal), mas o produto atual empurra o TouchBistro One próprio, o que sugere pouco incentivo a parceiros nessa camada [INF].
- Relevância para o Brasil é baixa: o TouchBistro opera em EUA, Canadá, Reino Unido e México, sem presença verificada no Brasil. O valor é de referência de design, não de integração.
- Lição aplicável à forma (b) com outros PDVs: se o PDV lança por assento, a Tipe deve importar o assento para pré-dividir a conta no QR; se não lança, a divisão por item da Tipe é o diferencial.

## 7. Fontes

Todas consultadas em 2026-10-14.

| # | Página | URL | Etiqueta |
|---|---|---|---|
| 1 | Chapter 6: Setting Up Your Floor Plan | https://cdn.touchbistro.com/help/articles/chapter-6-setting-floor-plan | [TELA] |
| 2 | Seating a Table | https://cdn.touchbistro.com/help/articles/seating-a-table-2 | [TELA] |
| 3 | Taking Orders | https://cdn.touchbistro.com/help/articles/taking-orders | [TELA] |
| 4 | Modifications | https://cdn.touchbistro.com/help/articles/modifications | [TELA] |
| 5 | Setting Item Modification (backoffice) | https://cdn.touchbistro.com/help/articles/setting-item-modification | [DOC] |
| 6 | Front End Operation for Servers (PDF, 2016) | https://cdn.touchbistro.com/wp-content/uploads/2016/help/downloadables/FrontEndOperationforServers.pdf | [TELA] |
| 7 | Checkout | https://cdn.touchbistro.com/help/articles/checkout | [TELA] |
| 8 | Specifying Seats for a Shared Item | https://cdn.touchbistro.com/help/articles/specifying-seats-for-a-shared-item | [TELA] |
| 9 | Using the KDS | https://cdn.touchbistro.com/help/articles/using-the-kds | [TELA] |
| 10 | Gratuity Settings | https://cdn.touchbistro.com/help/articles/gratuity-settings | [DOC] |
| 11 | Server Guide: Ending Your Shift | https://cdn.touchbistro.com/help/articles/server-guide-ending-your-shift | [TELA] |
| 12 | Cloud Reporting Site Basics | https://cdn.touchbistro.com/help/articles/cloud-reporting-site-basics | [DOC] |
| 13 | POS Connectivity for Mac Pro Server | https://cdn.touchbistro.com/help/articles/you-are-mac-pro-server | [DOC] |
| 14 | Reservations iPad: Reservation List and Floorplan | https://cdn.touchbistro.com/help/articles/reservations-ipad-app-using-the-reservation-list-and-floorplan | [TELA] |
| 15 | Chapter 11: Integrations | https://cdn.touchbistro.com/help/articles/chapter-11-integrations | [DOC] |
| 16 | Floor plan / table management (recurso) | https://cdn.touchbistro.com/features/floor-plan-table-management | [MKT] |
| 17 | Kitchen Display System | https://www.touchbistro.com/kitchen-display-system/ | [MKT] |
| 18 | Pricing | https://www.touchbistro.com/pricing/ | [MKT] |
| 19 | US TouchBistro Product Guide 2026 (PDF) | https://www.touchbistro.com/wp-content/uploads/2024/09/US-TouchBistro-Product-Guide-2026.pdf | [MKT] |
| 20 | Partners | https://www.touchbistro.com/partners/ | [MKT] |
| 21 | Lançamento TouchBistro One (11/08/2026) | https://www.touchbistro.com/?p=41687 | [MKT] |
| 22 | PricingSaaS: histórico de preços | https://pricingsaas.com/companies/touchbistro | Terceiro |
| 23 | AppGoblin: app TouchBistro POS (App Store) | https://appgoblin.info/apps/436784841 | Terceiro (texto da App Store = [MKT]) |
| 24 | Capterra reviews (página 1 e 4) | https://www.capterra.com/p/140677/TouchBistro/reviews/ e https://www.capterra.com/p/140677/TouchBistro/reviews?page=4 | Terceiro |
| 25 | G2 reviews | https://www.g2.com/products/touchbistro-restaurant-pos/reviews | Terceiro |
| 26 | QSR Magazine: patente de divisão de conta | https://www.qsrmagazine.com/news/touchbistro-secures-patent-bill-splitting/ | Terceiro |
| 27 | Supergood: TouchBistro API | https://supergood.ai/docs/touchbistro-api | Terceiro |
| 28 | API Tracker: TouchBistro | https://apitracker.io/a/touchbistro | Terceiro |

## 8. Impedimentos

- help.touchbistro.com (Salesforce) retornou só "CSS Error / Sorry to interrupt" sem JavaScript; não foi possível listar artigos atuais. Usei o acervo em cdn.touchbistro.com, que pode estar desatualizado (versões 7.x a 9.x, PDF de 2016).
- Não encontrei artigo oficial com cores de status e timers no mapa do POS (fora do módulo Reservations). A informação "table value and time seated" vem só da descrição da App Store.
- Artigos de ajuda do KDS atual ("powered by Fresh") e do TouchBistro One não localizados; descrevo só marketing.
- G2 não exibiu o texto das avaliações, só nota e metadados.
- Divergência de preço entre a página oficial ($69/$119) e o PricingSaaS de 31/08/2026 ($89/$99) não resolvida.
- Vídeos de treinamento não foram assistidos.
