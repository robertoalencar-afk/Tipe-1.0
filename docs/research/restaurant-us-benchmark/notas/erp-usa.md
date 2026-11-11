# ERPs e backoffice de restaurante nos EUA

Consulta: 2026-10-14. Escopo: Restaurant365, MarginEdge e MarketMan (Nível 1); 7shifts, Craftable, Crunchtime, Fourth e Altametrics (Nível 2); síntese PDV × ERP para a Tipe.

Como ler as etiquetas: **[TELA]** = artigo de ajuda oficial que descreve botões, telas e passos concretos (não vi a tela, li o passo a passo; uso a etiqueta só quando o texto nomeia botões e a sequência de cliques). **[DOC]** = documentação oficial ou de API sem passo a passo de tela. **[MKT]** = página de marketing ou preço. **[INF]** = inferência minha, com a origem indicada. Avaliações de terceiros (Capterra, GetApp, G2) aparecem como [MKT] de terceiros e servem só para dores.

---

## Visão geral rápida

| | Restaurant365 (R365) | MarginEdge (ME) | MarketMan (MM) |
|---|---|---|---|
| Posição | ERP completo: contabilidade (GL) + operação + escala + folha | Camada de custo entre PDV e contabilidade; o cliente mantém QuickBooks/Xero | Estoque, compras e fornecedores; contabilidade fica fora |
| Núcleo | Daily Sales Summary (DSS) gera lançamentos contábeis diários | Captura de nota por foto processada pela equipe da ME + P&L diário | Pedido de compra, recebimento, estoque, AvT |
| PDVs integrados | 98 entradas na lista oficial (cerca de 89 fornecedores) | "50+" PDVs e sistemas de mão de obra | 29 PDVs na página de parceiros |
| Frequência PDV | 1 poll diário após o fechamento do dia + polling intradiário para dashboards | Noturna (vendas do dia anterior chegam de manhã) | Depende do parceiro: segundos (Papaya) ou 1 vez por dia útil (Foodics) |
| Preço público | US$ 469 a 499 (Essential) e US$ 689 a 749 (Professional) por unidade/mês, segundo blog da própria R365 | US$ 350 por unidade/mês; US$ 500 com Freepour | Starter US$ 249, Growth US$ 299, Enterprise a partir de US$ 449/mês (desde ago/2026) |

---

## 1. Restaurant365 (Nível 1)

### 1.1 Módulos

| Módulo | O que faz | Etiqueta |
|---|---|---|
| Contabilidade | Razão geral, contas a pagar, lançamentos diários de vendas (DSS Journal Entries), lançamento estimado de folha | [DOC] |
| POS Integration | Importa vendas e mão de obra do PDV; gera o Daily Sales Summary | [DOC] |
| Inventory / Food | Itens, unidades, contagens, transferências, desperdício (Waste Log Form), commissary | [DOC] |
| Recipes | Fichas técnicas com sub-receitas, rendimento, custo médio/mín./máx. entre unidades | [DOC] |
| Purchasing | Pedidos por template, lista de compras multi-fornecedor, sugestão por par | [TELA] |
| AP Capture AI | OCR + IA lê nota e preenche campos; usuário confirma na Draft Transaction Screen | [DOC] |
| Sales & Forecasting | Menu Items ligados a receitas; previsão de vendas com regras e eventos | [DOC] |
| Scheduling / Workforce | Escala com regras (menor de idade, hora extra, intervalos), "Smart Labor", app do funcionário "R365 Red App" | [DOC] |
| Payroll | Folha e exportações de folha | [DOC] |
| Relatórios | AvT, P&L, Menu Item Analysis, Menu Price Analysis, Labor Dashboard | [DOC] |

### 1.2 Fluxos

**Venda no PDV → DSS → contabilidade.** A R365 conecta-se ao PDV de três formas, definidas pelo próprio PDV: conexão cloud com a nuvem do fornecedor, FTP (o PDV deposita arquivos numa pasta que a R365 monitora) ou um aplicativo local que faz polling num computador do restaurante [DOC]. Um "poll" diário agendado, após o fechamento do dia no PDV, gera o Daily Sales Summary, que reúne vendas e mão de obra do dia útil e alimenta os lançamentos contábeis (DSS Journal Entries), o lançamento estimado de folha e os relatórios [DOC]. O "Intraday Polling" puxa dados parciais em intervalos curtos só para dashboards e não altera o DSS [DOC]. O mapeamento das contas do PDV para o plano de contas é feito na ferramenta "POS Mapping", aba "POS Accounts" para revisar e aba "Rules" para automatizar [DOC]. Para corrigir um dia, corrige-se no PDV e apaga-se o DSS na página "Daily Sales Summary (Classic)"; a R365 detecta a lacuna e refaz o poll em cerca de 30 minutos (se o DSS tiver menos de 30 dias) [DOC]. O documento afirma que o PDV continua sendo a fonte da verdade e a R365 não altera seus dados [DOC].

**Nota fiscal → custo do item → receita.** A nota entra pela página "Documents to Process" (upload manual, e-mail ou FTP); a Capture AI preenche Vendor, Location, Invoice Number, Invoice Total e Payment Terms, mas só casa com cadastros que já existem e marca campos incertos para revisão [DOC]. Com "Always Require OCR Verification" ligado, a nota fica na "Draft Transaction Screen" até alguém clicar em "Create"; depois precisa de aprovação [DOC]. O custo de cada item é calculado a partir das notas de AP anteriores (ou de pedidos ao commissary) ou mantido manualmente, conforme configuração do item [DOC]. Cada receita tem um "Cost Update Method": On Demand (botão "Update Recipe Costs"), Nightly (recalcula toda noite a partir das notas aprovadas mais recentes) ou Manual [DOC].

**Ligação cardápio do PDV → receita.** Em "Sales & Forecasting > Menu Items > Menu Items", abre-se o item, e na seção "Rules Recipe Selection" escolhe-se a receita no campo "Recipe"; marca-se "Entree" quando for prato principal e atribuem-se categorias [TELA]. Há importação em massa por planilha em "Admin > Import > Import" com "Update Existing" [TELA]. Itens sem receita aparecem com a coluna Recipe em branco e ficam fora da análise teórica [DOC]. Com "Modifier Rules" ativado, a baixa passa a ser definida por regras que consideram modificadores [DOC].

**Contagem de estoque (app).** "More" → "Inventory counts" (ou "Create" → "Inventory Count") → botão "+" → escolher local → campo "Template" (templates agendados vencendo em 48 h vêm pré-selecionados) → data → "Start New Count"; várias pessoas podem contar ao mesmo tempo [TELA].

**Pedido de compra (app).** "More" → "Orders" → "Create" → Location → Template ou Vendor → revisar fornecedor, endereço, datas → "Continue" → "Add item" (todos os itens do fornecedor, itens primários, leitor de código de barras ou manual) → menu para preencher por "Suggested Qty" ou "Par Qty" ("Fill to Par") → "Review" → "Save" (rascunho) ou "Send" (e-mail para o fornecedor) [TELA]. A versão multi-fornecedor chama-se "Shopping lists" e gera um pedido por fornecedor com "Submit" [TELA]. Para a US Foods existe envio via API que redireciona ao site do distribuidor [TELA]. "Undo Send" reabre pedido ainda não faturado [TELA].

**CMV real × teórico (AvT).** O relatório "Actual vs Theoretical Analysis" compara consumo real (Begin, Purch, Trnsfer, End) com consumo teórico calculado a partir do PMIX do PDV, entre duas contagens ("From Count" e "To Count"), em quantidade e em dólares, com colunas de Waste, Donation, variância não explicada e eficiência [DOC]. O próprio documento avisa que o AvT não bate exatamente com o financeiro porque usa custo unitário estático no período e ignora compras fora do módulo de AP [DOC]. Comps e descontos devem ir para conta com categoria "Discount (Exclude from Sales)" para não inflar a venda líquida [DOC].

**Escala e previsão.** A integração de PDV traz vendas e mão de obra, que alimentam a previsão semanal ("Sales Forecast") e metas de mão de obra; a escala usa templates em calendário, regras de menor, hora extra e intervalo, "Blackout Days" e "Smart Labor" [DOC]. Funcionários usam o "R365 Red App" para pedir folga, trocar turnos e mandar mensagens [DOC].

### 1.3 Padrões de interface

- Tabelas densas com busca, filtros, colunas configuráveis, exportação CSV, "saved views" e edição em massa (ícone de lápis) e em linha, como na página Recipe Items [DOC].
- Convivência de telas "Classic" e novas ("Enable / Disable Classic View"), sinal de migração gradual de UI [DOC].
- App móvel com barra inferior ("More", "Create") e assistentes em 2 ou 3 passos para pedido e contagem [TELA].
- Relatórios parametrizados com muitos filtros (o AvT tem mais de uma dúzia de parâmetros) [DOC]. [INF: interface pensada para controller/contador, não para gerente de salão.]

### 1.4 Limitações e reclamações

Capterra: 4,1/5 em 72 avaliações; facilidade de uso 4,0; atendimento 3,8 [MKT de terceiros]. Temas recorrentes: curva de aprendizado e interface pouco amigável para quem não é de finanças ("not a very user friendly interface", 2025; "can feel complex during onboarding", 2026); suporte lento por tickets; bugs após atualizações; implantação demorada; preço alto; app de celular fraco; permissões trabalhosas; uma queixa de que não tratava gorjeta de cartão paga no contracheque (2019) [MKT de terceiros]. Muitas avaliações são de 2018 a 2019. A própria documentação admite que o AvT não fecha com o financeiro [DOC].

### 1.5 Preço

- Blog da R365 (sem data na página, consultado em 2026-10-14): Essential US$ 469 a 499 por unidade/mês (contabilidade, estoque, relatórios básicos); Professional US$ 689 a 749 (adiciona analytics, AP automation, ativo fixo, relatórios customizados) [MKT]. A página é inconsistente (US$ 469 na tabela e faixa US$ 469 a 499 no texto).
- TrustRadius (2026-10-14): "a partir de US$ 435 por mês, cobrado trimestralmente, por unidade" [MKT de terceiros].
- Escala, folha e Enterprise: preço não verificado.

### 1.6 Integração com PDVs de terceiros

- Lista oficial com 98 entradas: 72 "Sales & Labor", 15 "Sales Only", 11 "Labor Only" (estes últimos são sistemas de escala como 7shifts, Deputy, Harri, Homebase, UKG) [DOC]. Inclui Toast, Square, Clover, Lightspeed (L, R, U, K), Micros Simphony (inclusive API), Aloha (NCR), Brink (PAR), Revel, SpotOn, TouchBistro, HungerRush, SkyTab, GoTab, Tabit, Shopify, entre outros [DOC].
- Dados puxados: tickets de venda, itens de cardápio e modificadores, Paid Outs, Deposits; integrações "Standard" trazem nível de item, integrações "Summary" trazem só totais financeiros [DOC]. Pagamentos, descontos e impostos aparecem nos totais do DSS [DOC]. Mão de obra: funcionários, cargos, batidas de ponto, taxas de pagamento, quando o PDV fornece [DOC]. Gorjetas: a R365 aplica distribuição de gorjetas como cálculo, opcional por unidade; a lista de PDVs não fala de gorjeta por PDV [DOC]. Há relatório "Tip Automation Distributions Report" [DOC].
- Frequência: 1 vez por dia útil (DSS) + intradiário para painéis [DOC].
- Via: API cloud, FTP de arquivos exportados ou agente local, conforme o PDV [DOC].

### 1.7 O que a Tipe aprende

1. O "dia útil fechado" é a unidade de troca entre PDV e ERP. A R365 só gera o DSS depois do fechamento do dia e precisa de "start of day" e horário de polling iguais aos do PDV [DOC]. [INF: o fechamento de caixa da Tipe deve produzir um registro diário imutável, com data de negócio explícita, pronto para exportar.]
2. Separar "Standard" (por item) de "Summary" (só totais) é um bom modelo de níveis de integração para a Tipe oferecer [INF].
3. Reprocessamento simples: apagar e repuxar o dia. [INF: a Tipe deve permitir reenviar um dia corrigido, com versão.]
4. Mapeamento de contas por regras ("Rules") evita trabalho manual. [INF: categorias de venda, formas de pagamento, gorjeta e taxa de serviço da Tipe devem ter códigos estáveis para mapeamento.]
5. A R365 vende complexidade de controller. A dor dos avaliados é a curva de aprendizado. [INF: a Tipe não deve competir em contabilidade; deve ser a melhor fonte de dados para quem faz.]

---

## 2. MarginEdge (Nível 1)

### 2.1 Módulos

| Módulo | O que faz | Etiqueta |
|---|---|---|
| Invoice processing | Notas por foto no app, e-mail, upload ou EDI; equipe da ME digita linha a linha; ilimitado | [DOC] |
| Price monitoring | Alertas de variação de preço por produto | [MKT] |
| Inventory | Folhas de contagem, unidades convertidas, preço pela última compra | [TELA] |
| Ordering | Pedidos a fornecedores (status Open, Saved, Sent) | [DOC] |
| Recipes & Menu Analysis | Custo de receita, "PMIX mapping", uso teórico | [DOC] |
| Daily controllable P&L | Vendas, custo e mão de obra combinados e atualizados diariamente, com prime cost | [MKT] |
| Bill Pay | Pagamento de fornecedores (EUA), ilimitado, sincroniza com a contabilidade | [MKT] |
| Accounting integrations | Exporta notas, lançamentos de venda e ajustes de estoque | [DOC] |
| Freepour | Balança inteligente para contagem de destilados | [MKT] |

### 2.2 Fluxos

**Receber nota → custo → contabilidade.** O gerente fotografa a nota no app (recomendado), encaminha o e-mail do fornecedor para um endereço exclusivo terminado em @meinvoices.com (em "Orders > Setup", seção "Invoice Email") ou envia PDF, JPEG, PNG ou CSV [DOC]. Duplicatas (mesmo fornecedor, número e data) são apagadas automaticamente [DOC]. Status: "Processing" (com a equipe da ME), "Pending Approval" (se a aprovação estiver ligada), "Closed" (dados conferidos, entra em relatórios e pode ir para a contabilidade), "Image Pending"/"EDI Pending" [DOC]. Prazo: 1 a 2 dias após a implantação, 3 a 5 dias nas primeiras 4 semanas, muitas em 24 h [DOC]. Correções de recebimento são feitas à mão no papel: riscar "Qty Shipped", escrever a quantidade recebida e anotar "short" ou "return" [DOC]. No app, o menu superior esquerdo mostra "Pending Uploads" (contador azul) e "Invoice History" com status por foto ("Sent"/"Confirmed" ou "pending") [TELA].

**Venda no PDV → P&L diário.** Exemplo Square: "Setup > Point of Sale" → botão "Square" → "Connect to Square" → autorizar leitura → "Select location(s) to connect" (várias lojas Square podem virar uma unidade ME) → "Submit" → e-mail para salesintegrations@marginedge.com confirmando [TELA]. As vendas do dia anterior chegam toda manhã; leva 1 ou 2 dias para aparecer após conectar [TELA]. Com Toast, vendas e mão de obra são puxadas toda noite [MKT, página do Toast]. Mão de obra é puxada automaticamente de todo PDV conectado e pode ser desligada por PDV em "Labor > Setup" ("Labor Data Integration") [DOC].

**Exportação contábil.** Notas viram contas a pagar (bills); notas pagas com cartão viram lançamento; vendas viram lançamentos (journal entries) com formas de pagamento, comps e descontos; ajustes de estoque só depois de fechados [DOC]. Modo automático: notas fechadas sobem na hora e as vendas do dia sobem de manhã cedo; modo manual: o usuário escolhe o que enviar; "Close Book" trava períodos [DOC]. Só aceita journal entries, não "sales receipts" do QuickBooks [DOC]. Sistemas contábeis listados: QuickBooks Online e Desktop, Xero, NetSuite, Intacct, Sage 50/300, Dynamics GP, Restaurant365, Compeat e outros (a página diz 18, lista 14) [DOC].

**Contagem de estoque.** Configura-se quais produtos e receitas entram, a unidade de contagem e folhas de contagem (ex.: Food e Bar) → "INVENTORY > INVENTORY COUNTS" → "Print Count Sheets" → digitar contagens no computador, celular ou tablet → status "Saved" até fechar → "Closed" → "Export as" PDF ou CSV [TELA]. Preço vem da última compra [TELA]. Limitação: só uma pessoa por folha, senão uma edição sobrescreve a outra [TELA].

**CMV teórico.** "PMIX mapping": para comida, cria-se receita e associa-se ao "botão" do PDV; para cerveja, vinho e destilados, associa-se o botão direto ao produto [DOC]. Exige PDV conectado e duas contagens fechadas [DOC]. Há "Theoretical On-Hand Report" (estoque estimado de hoje a partir de uma contagem + compras − vendas) [DOC]. Eventos de open bar no PDV distorcem o teórico [DOC].

### 2.3 Padrões de interface

- O produto central é um serviço: a foto da nota sai do celular e volta como dado estruturado sem o cliente digitar [DOC]. [INF: a "interface" principal é a ausência de digitação.]
- Linguagem de PDV ("POS buttons") no mapeamento, próxima do vocabulário do restaurante [DOC].
- Navegação web por menus em caixa alta (INVENTORY, Setup, Labor) [TELA].
- Ajuda escrita em tom informal ("Connecting me to Square") [DOC].

### 2.4 Limitações e reclamações

GetApp: 4,6/5 em 47 avaliações; poucos contras: desejo de mais flexibilidade em orçamento e ações em massa; um CFO reclamou de não ter sido avisado de taxas duplicadas do Toast [MKT de terceiros]. G2: 4,6/5 em 31 avaliações, sem texto de contras legível [MKT de terceiros]. Limitações documentadas: latência de 1 a 5 dias nas notas, P&L do dia anterior (não tempo real), contagem com um usuário por folha, integração de PDV sem detalhe público sobre itens, gorjetas e pagamentos [DOC]. Toast cobra US$ 50/mês por unidade pelo "Restaurant Management Suite" exigido, mais uma taxa de API repassada [MKT].

### 2.5 Preço (consultado em 2026-10-14)

- MarginEdge: US$ 350 por unidade/mês; anual com 10% de desconto [MKT].
- MarginEdge + Freepour: US$ 500 por unidade/mês [MKT].
- Sem taxa de setup; pacotes de onboarding sem preço público; sem contrato no mensal [MKT].

### 2.6 Integração com PDVs de terceiros

- "Mais de 50" PDVs e sistemas de mão de obra; artigos de ajuda específicos para Square, Clover, Revel, TouchBistro, HB the Hub e Toast [MKT/DOC].
- Dados: vendas diárias e mão de obra; formas de pagamento, comps e descontos chegam ao lançamento contábil; PMIX por item para o teórico [DOC]. Gorjetas: não verificado.
- Frequência: noturna; dia anterior disponível de manhã [TELA/MKT].
- Via: conexão OAuth/API com a nuvem do PDV (Square, Toast) [TELA]; outras não verificadas.

### 2.7 O que a Tipe aprende

1. O restaurante pequeno aceita P&L "de ontem" se ele chegar sozinho todo dia de manhã [INF a partir do modelo noturno da ME].
2. O PDV não precisa ser o dono do custo. A ME vive de conectar PDV + nota + contabilidade sem substituir nenhum [DOC]. [INF: a Tipe, no modo "só fechamento de conta", pode ser fonte de dados para ME/R365 em vez de concorrente.]
3. Taxas de API cobradas pelo PDV (caso Toast) viram atrito para o cliente final [MKT]. [INF: a Tipe deve ter API aberta e sem pedágio para parceiros de backoffice.]
4. Lançamento contábil diário com formas de pagamento, comps e descontos é o formato esperado [DOC]. [INF: o fechamento diário da Tipe deve exportar exatamente esses blocos, mais gorjeta e taxa de serviço separadas.]

---

## 3. MarketMan (Nível 1)

Contexto: em 12/01/2022 a MarketMan (Nova York e Tel Aviv) anunciou fusão com a Meal Ticket (software para distribuidores, Boise) e investimento acima de US$ 100 milhões da PSG; na época, mais de 7.000 unidades pagantes [MKT, comunicado]. A central de ajuda hoje fica no domínio da Meal Ticket [DOC].

### 3.1 Módulos

| Módulo | O que faz | Etiqueta |
|---|---|---|
| Inventory | Contagem móvel (iOS/Android) por área (câmara fria, estoque, bar), contagens parciais e agendadas, sincronização em nuvem | [MKT] |
| Purchasing | Hub multi-fornecedor, par, orçamento de compras, dias de entrega, horários de corte, lembretes; pedidos gerados abaixo do par para revisão | [MKT] |
| Invoice scanning (IA) | Foto ou upload atualiza itens e quantidades recebidas; 50 por mês no Starter, ilimitado no Growth | [MKT] |
| Vendor EDI | 1, 2 ou ilimitadas integrações EDI conforme o plano | [MKT] |
| Recipe costing | Custo por ingrediente e porção, alergênicos, instruções, imagens | [MKT] |
| Waste management | Registro de desperdício | [MKT] |
| AvT / relatórios | Teórico (vendas) × real (contagens); CMV, lucro bruto, rentabilidade de cardápio | [MKT] |
| Commissary | Cozinha central própria ou venda para terceiros | [MKT] |
| API | API v3 JSON com perfis Buyer, Vendor e Partner | [DOC] |

### 3.2 Fluxos

**Venda no PDV → baixa de estoque.** Pelos parceiros de PDV: o PDV envia cardápio (categorias, itens, modificadores) e vendas; inventário e receitas ficam só na MarketMan, que faz a baixa pelos ingredientes das receitas ligadas a cada item vendido, inclusive modificadores [DOC de parceiros]. Na Papaya (PDV da Tailândia), cada pedido fechado vira um "check" na MarketMan em segundos, com itens, modificadores, descontos, taxas de serviço, entrega e impostos; cancelamentos apagam o check e reaberturas o atualizam [DOC de parceiro]. Na Foodics, a sincronização é por data de negócio, recomendada no dia seguinte após todas as lojas fecharem, com "Auto Sync" diário em horário escolhido [DOC de parceiro]. A API documenta o método assíncrono "SetSalesAsync" e limite de 500 chamadas por 24 h por consumidor [DOC]. [INF: o modelo da MarketMan é "o PDV empurra vendas pela API do parceiro"; a frequência depende de quem integra.]

**Pedido de compra.** Par e regras de entrega disparam sugestões de pedido; o usuário revisa e envia; status do pedido na API: Sent, Pending, Approved pelo fornecedor [MKT/DOC]. Passo a passo de tela não verificado (central de ajuda não carregou).

**Nota → custo.** Foto ou upload da nota atualiza itens recebidos e quantidades; EDI com distribuidores atualiza preço e produtos automaticamente; pedidos e notas sincronizam com QuickBooks e Xero [MKT].

**Contagem e desperdício.** Contagem no celular por área, com agendas diárias, semanais ou personalizadas e contagens parciais [MKT]. Passos de tela não verificados.

### 3.3 Padrões de interface

Não verificado em fonte de ajuda (ver Impedimentos). Marketing destaca app móvel e "AI-powered" [MKT]. Avaliação de 2022 relata que salvar edição de inventário volta a lista para a primeira página [MKT de terceiros].

### 3.4 Limitações e reclamações

Capterra: 4,6/5 em 114 avaliações; facilidade 4,5; atendimento 4,7 [MKT de terceiros]. Dores: curva de aprendizado e tempo de implantação (2023, 2025); app móvel fraco em avaliações antigas (2018, 2022); time de produto lento para pedidos (2023); integração com PDV que nunca funcionou para um cliente ("clunky and inefficient", 2025); problemas com Xero (2018) e com desperdício via Lightspeed (2022); queixa isolada de dificuldade de cancelamento (2025) [MKT de terceiros]. Limite de API baixo (500 chamadas/dia na doc; 5.000/mês no plano Enterprise) [DOC/MKT].

### 3.5 Preço (consultado em 2026-10-14; mudou em agosto de 2026)

| Plano | Antes (até 10/08/2026) | Depois (desde 17/08/2026) |
|---|---|---|
| Starter | US$ 199/mês | US$ 249/mês |
| Growth | US$ 249/mês | US$ 299/mês |
| Enterprise | sob consulta | a partir de US$ 449/mês |

Add-ons: API de leitura US$ 25 a 199/mês conforme o número de unidades; Commissary US$ 499 (própria) ou US$ 749/mês (externa) [MKT; histórico via PricingSaaS, MKT de terceiros]. A página não diz claramente se o preço é por unidade [MKT].

### 3.6 Integração com PDVs de terceiros

- 29 PDVs na página de parceiros: Toast, Square, Lightspeed, Aloha, Shift4, Silverware, Clover, Lavu, Micros, Revel, TouchBistro, Tabit, Squirrel, SumUp, Qu, Otter, entre outros [MKT].
- Dados: cardápio e vendas por item com modificadores, descontos, impostos e taxas (exemplos de parceiros) [DOC de parceiro]. Mão de obra e gorjetas: não verificado (a MarketMan não é sistema de mão de obra).
- Frequência: de segundos a diária, conforme o parceiro [DOC de parceiro].
- Via: API da MarketMan, com credencial de parceiro (API key e password), em geral construída pelo PDV [DOC].

### 3.7 O que a Tipe aprende

1. A MarketMan publica uma API para o PDV empurrar vendas, e são os PDVs (Foodics, Papaya) que constroem a integração [DOC]. [INF: no Brasil, a Tipe pode ser o "PDV parceiro" de ERPs de estoque, e o caminho mais barato é exportar vendas por item já no formato de "check".]
2. Cancelamento e reabertura de conta precisam propagar para o ERP (apagar ou atualizar o check), senão estoque e venda divergem [DOC de parceiro]. [INF: a Tipe já arquiva pagamentos na reabertura de mesa; o evento de reabertura deve ser exportável.]
3. Sincronizar por data de negócio fechada evita dados parciais [DOC de parceiro].
4. Preço por faixas e add-ons (API, commissary) mostra como monetizar integração sem encarecer o plano base [MKT].

---

## 4. Nível 2 (diferenciais)

**7shifts.** Escala, ponto ("7punches"), gestão de gorjetas, tip pooling, folha e conformidade trabalhista; 20+ integrações diretas com PDV (Toast, Square, Lightspeed, TouchBistro, Revel, Brink) [MKT]. O diferencial para a Tipe é o tip pooling: com Toast, o 7shifts puxa vendas, pagamentos e gorjetas; cria-se o pool em "Tips > Tip Pooling > + Create Pool" → "Pull in tips automatically from my POS" → método de distribuição "Equal Distribution", "Percentage" ou "Points Weighting" → "Save my tip pool" [TELA]. A contribuição pode ser Net Sales (filtrável por categoria, centro de receita ou tipo de serviço), Total Tips ou Remaining Tips; horas vêm do ponto; a gorjeta segue o funcionário que abriu a conta, mesmo se transferida; frequência padrão diária [TELA]. Tip pooling é add-on com teste grátis e exige ponto ativado; sem PDV suportado, há "Manual Contribution" [TELA]. Preços em dólar não estavam legíveis na página de preços em 2026-10-14 (não verificado); há promoção de 3 meses de folha grátis [MKT]. Tipe: a regra 70/30 da Tipe é um caso simples; o mercado americano espera pools por cargo, pontos e horas, e um formato exportável por funcionário para folha [INF].

**Craftable** (antes Bevager e Foodager). Estoque, compras, recebimento, receitas, depleção automática e estoque perpétuo, armazenamento ilimitado de imagens de nota, codificação automática de contas a pagar, sincronização de contas e relatórios de prime cost multiunidade; preços sob consulta por unidade [MKT de terceiros, FitGap]. Diferencial: origem em controle de bebidas (bar) e foco em grupos multiunidade [INF pelo nome Bevager].

**Crunchtime.** Plataforma enterprise para redes e franquias: estoque e custo de alimentos, escala e mão de obra no mesmo sistema, checklists de execução de loja com trilha de auditoria e consolidação entre unidades; produtos Crunchtime Kitchen, Host e Operations Execution; sem preço público e com peso administrativo alto para operadores pequenos [MKT de terceiros, FitGap]. Diferencial: "controle central, execução na loja" [MKT de terceiros].

**Fourth.** Suíte para grandes redes (Taco Bell, Dunkin', KFC, Pizza Hut nos logos; "120.000 unidades"): workforce com HotSchedules (escala, ponto, conformidade, logbook do gerente, gestão de repasse de gorjetas, saque antecipado de salário), RH e folha, estoque (compras, recebimento, receitas, produção dinâmica, gestão de caixa), analytics e previsão por IA ("Fourth iQ"); marcas Adaco, MacromatiX e Red Book [MKT]. Caso citado: Lou Malnati's reduziu em 80% o tempo de repasse de gorjeta [MKT]. Sem preço público.

**Altametrics.** Backoffice para redes e franquias desde 1999 (Costa Mesa, CA): estoque, custo de alimentos, mão de obra, gestão de caixa (conciliação bancária, cofre inteligente), BI com scorecards e relatórios por exceção; integração de PDV "20+ campos" e com relógio de ponto e folha; planos Essential US$ 150/mês e Plus US$ 198/mês (promo de US$ 75 e US$ 99 por 3 meses), Growth e Advanced sob consulta [MKT de terceiros, FitGap, consultado em 2026-10-14]. Diferencial: gestão de caixa e cofre no backoffice, perto do que a Tipe faz no caixa [INF].

---

## 5. Síntese para a Tipe

### 5.1 O que pertence a quem

| Camada | Responsabilidade | Exemplos vistos |
|---|---|---|
| **PDV (tempo real, turno)** | Pedido por mesa, envio à cozinha, conta, pagamento, gorjeta capturada, descontos, cancelamentos, abertura e fechamento de caixa, ponto (às vezes) | R365 trata o PDV como fonte da verdade e não altera seus dados [DOC] |
| **ERP/backoffice (dia, semana, mês)** | Custo de item a partir da nota, ficha técnica, contagem, compras, CMV real × teórico, P&L, contas a pagar, conciliação, escala, previsão, folha | R365, ME, MM, Crunchtime, Fourth |
| **Compartilhado** | Cadastro de itens de cardápio (PDV cria, ERP liga à receita), funcionários e cargos, mão de obra (batidas), gorjetas (PDV captura, sistema de escala distribui), formas de pagamento (PDV registra, ERP concilia) | Mapeamento Menu Item → Recipe na R365 [TELA]; PMIX mapping na ME [DOC]; tip pool do 7shifts [TELA] |

[INF: a fronteira é temporal. O PDV é dono do que acontece durante o turno; o ERP é dono do que se calcula depois que o dia fecha.]

### 5.2 Fluxo de dados (padrão encontrado nos três ERPs)

1. **Venda no PDV**: cada conta fechada tem itens, modificadores, descontos, comps, impostos, taxas, forma de pagamento, gorjeta e funcionário [DOC].
2. **Fechamento do dia de negócio** no PDV (horário de corte definido) [DOC].
3. **Importação pelo ERP**: poll diário (R365), puxada noturna (ME) ou push por API (MM) [DOC].
4. **Lançamento contábil de vendas**: receita por categoria, formas de pagamento como contas a receber/caixa, descontos, impostos, gorjetas a pagar, depósitos (DSS Journal Entry na R365; journal entry na ME) [DOC].
5. **Baixa de estoque teórica**: vendas por item × ficha técnica (incluindo modificadores) [DOC].
6. **Custo**: notas de compra atualizam custo do item; receitas recalculam (noturno na R365) [DOC].
7. **Contagem física** fecha o período; **CMV real** = estoque inicial + compras ± transferências − estoque final; **variância** = real − teórico [DOC].
8. **DRE/P&L**: vendas + CMV + mão de obra (do PDV ou do sistema de escala) → prime cost diário (ME) ou P&L contábil (R365) [DOC/MKT].

### 5.3 Quais ERPs vendem integração com PDVs de terceiros e como

| ERP | Modelo de integração | Quem constrói | Granularidade | Frequência |
|---|---|---|---|---|
| Restaurant365 | Puxa do PDV (API cloud, FTP de arquivo, agente local) | R365 constrói para cerca de 89 PDVs | Standard (item) ou Summary (totais); vendas, pagamentos, descontos, impostos, depósitos, mão de obra | Diária + intradiária |
| MarginEdge | Puxa da nuvem do PDV por OAuth/API | ME constrói | Vendas diárias, pagamentos, comps, descontos, PMIX por item, mão de obra | Noturna |
| MarketMan | PDV empurra para a API da MarketMan | O PDV constrói (Foodics, Papaya) | Checks com itens, modificadores, descontos, taxas e impostos | Segundos a diária |
| 7shifts | Puxa vendas, pagamentos, gorjetas, mão de obra | 7shifts | Vendas líquidas por categoria e gorjetas por funcionário | Diária |
| Altametrics | Integração de PDV "20+ campos" | Não verificado | Não verificado | Não verificado |

Todos os três de Nível 1 tratam integração com PDV de terceiros como pré-requisito do produto, não como opcional: sem PDV não há teórico, P&L diário nem DSS [DOC]. [INF: nos EUA, o backoffice é agnóstico de PDV por necessidade comercial; quem vende ERP precisa aceitar o PDV que o restaurante já tem.]

### 5.4 Implicações para a Tipe

**(a) Tipe vendendo só o fechamento de conta integrado ao PDV do restaurante.** O padrão americano mostra dois papéis possíveis: ser puxado (como R365 e ME puxam do Toast/Square) ou empurrar (como Foodics e Papaya empurram para a MarketMan) [DOC]. [INF: no modo (b), a Tipe se comporta como "meio de pagamento + gorjeta" anexado ao PDV. Ela precisa: (1) receber do PDV a conta aberta com itens; (2) devolver ao PDV o pagamento por item/fração, forma de pagamento (Pix, cartão), gorjeta e taxa de serviço, para que o PDV feche a conta; (3) não ser fonte contábil, porque o PDV do restaurante continuará exportando o dia para o ERP. O dado novo que a Tipe agrega, e que interessa ao ERP, é a gorjeta por garçom e o meio de pagamento Pix com conciliação.]

**(b) Tipe completo exportando o fechamento diário para ERPs.** [INF, derivado dos fluxos R365/ME/MM:]
1. Gerar, ao fechar o caixa do dia, um **Resumo Diário de Vendas** imutável por data de negócio e unidade, com versão (para reenviar após correção, como o repoll da R365).
2. Dois níveis, como "Standard" e "Summary" da R365: totais (vendas por categoria, descontos, cortesias, impostos, taxa de serviço, gorjetas, formas de pagamento, sangrias, reforços, diferenças de caixa) e detalhe por item (PMIX com modificadores) e por conta (check).
3. Gorjeta separada da receita, por garçom, porque vira passivo a pagar e base de distribuição (padrão 7shifts e Tip Automation da R365).
4. Eventos de cancelamento e reabertura propagados (lição da integração Papaya → MarketMan).
5. Formatos: CSV/planilha padrão e API REST com webhook ao fechar o dia; códigos estáveis para categorias e meios de pagamento, facilitando mapeamento por regras.
6. No Brasil, os destinos equivalentes são ERPs e sistemas contábeis locais (não pesquisados aqui); a estrutura acima vale para qualquer um.
7. Não cobrar pedágio de API de parceiros (atrito visto no caso Toast + MarginEdge).

**(c) O que não construir agora.** Contabilidade completa, AP com OCR e AvT são produtos inteiros de empresas com centenas de dólares por unidade/mês e curva de aprendizado alta (R365) [MKT/MKT de terceiros]. [INF: para o público da Tipe, o caminho é ficha técnica simples + baixa teórica + exportação; o restante fica com parceiros.]

---

## Fontes

Formato: Plataforma · página · URL · data de consulta · etiqueta.

- Restaurant365 · POS Integration Overview · https://docs.restaurant365.com/docs/pos-integration-overview · 2026-10-14 · [DOC]
- Restaurant365 · POS Integrations List · https://docs.restaurant365.com/docs/pos-integrations-list · 2026-10-14 · [DOC]
- Restaurant365 · Documentation Index (llms.txt) · https://docs.restaurant365.com/llms.txt · 2026-10-14 · [DOC]
- Restaurant365 · R365 App: Create and Enter Inventory Counts · https://docs.restaurant365.com/docs/r365-app-create-and-enter-inventory-counts · 2026-10-14 · [TELA]
- Restaurant365 · Item Costing troubleshooting · https://docs.restaurant365.com/docs/item-costing-off · 2026-10-14 · [DOC]
- Restaurant365 · Recipe Items Page · https://docs.restaurant365.com/docs/recipe-items-page · 2026-10-14 · [DOC]
- Restaurant365 · Actual vs Theoretical Analysis · https://docs.restaurant365.com/docs/actual-vs-theoretical-analysis.md · 2026-10-14 · [DOC]
- Restaurant365 · Phase 3: Money Out · https://docs.restaurant365.com/docs/phase-3-money-out.md · 2026-10-14 · [DOC]
- Restaurant365 · Phase 5: Scheduling · https://docs.restaurant365.com/docs/phase-5-scheduling.md · 2026-10-14 · [DOC]
- Restaurant365 · R365 App: Creating an Order · https://docs.restaurant365.com/docs/r365-app-creating-an-order · 2026-10-14 · [TELA]
- Restaurant365 · Mapping Recipes to Menu Items · https://docs.restaurant365.com/docs/mapping-recipes-to-menu-items · 2026-10-14 · [TELA]
- Restaurant365 · AP Capture AI Overview · https://docs.restaurant365.com/docs/ap-capture-ai · 2026-10-14 · [DOC]
- Restaurant365 · Blog: cost comparison R365 vs alternatives · https://www.restaurant365.com/blog/restaurant-operations-platform-cost-comparison-r365-vs-alternatives/ · 2026-10-14 · [MKT]
- TrustRadius · Restaurant365 · https://www.trustradius.com/products/restaurant365 · 2026-10-14 · [MKT de terceiros]
- Capterra · Restaurant365 Reviews · https://capterra.com/p/139768/Restaurant365/reviews/ · 2026-10-14 · [MKT de terceiros]
- MarginEdge · How it works · https://marginedge.com/how-it-works · 2026-10-14 · [MKT]
- MarginEdge · Pricing · https://marginedge.com/pricing · 2026-10-14 · [MKT]
- MarginEdge · Connecting me to Square POS · https://help.marginedge.com/hc/en-us/articles/360002017634-Connecting-me-to-Square-POS · 2026-10-14 · [TELA]
- MarginEdge · Inventory counts (artigo 218822407) · https://help.marginedge.com/hc/en-us/articles/218822407 · 2026-10-14 · [TELA]
- MarginEdge · Theoretical usage / PMIX (artigo 360015329433) · https://help.marginedge.com/hc/en-us/articles/360015329433 · 2026-10-14 · [DOC]
- MarginEdge · Common questions about invoices · https://help.marginedge.com/hc/en-us/articles/218399877 · 2026-10-14 · [DOC]
- MarginEdge · Check status of invoices uploaded on phone · https://help.marginedge.com/hc/en-us/articles/360035399853-How-do-I-check-the-status-of-invoices-I-ve-uploaded-on-my-phone · 2026-10-14 · [TELA]
- MarginEdge · Accounting Integration FAQs · https://help.marginedge.com/hc/en-us/articles/4417522839571-Accounting-Integration-FAQs · 2026-10-14 · [DOC]
- MarginEdge · QuickBooks Online Integration FAQs · https://help.marginedge.com/hc/en-us/articles/4417280749587 · 2026-10-14 · [DOC]
- MarginEdge · Toggle Labor · https://help.marginedge.com/hc/en-us/articles/40565936066067 · 2026-10-14 · [DOC]
- Toast · Integração MarginEdge · https://pos.toasttab.com/integrations/marginedge · 2026-10-14 · [MKT]
- G2 · MarginEdge Reviews · https://www.g2.com/products/marginedge/reviews · 2026-10-14 · [MKT de terceiros]
- GetApp · MarginEdge Reviews · https://www.getapp.com/retail-consumer-services-software/a/marginedge/reviews/ · 2026-10-14 · [MKT de terceiros]
- MarketMan · Pricing · https://marketman.com/pricing · 2026-10-14 · [MKT]
- PricingSaaS · MarketMan diff 2026 W34 · https://pricingsaas.com/companies/marketman/diffs/2026W34 · 2026-10-14 · [MKT de terceiros]
- MarketMan · POS partners · https://marketman.com/partner-categories/pos · 2026-10-14 · [MKT]
- MarketMan · Inventory management software · https://www.marketman.com/platform/restaurant-inventory-management-software · 2026-10-14 · [MKT]
- MarketMan · API v3 (Postman) · https://api-doc.marketman.com/view/metadata/T1LPET6f · 2026-10-14 · [DOC]
- Papaya · MarketMan integration · https://help.papaya.co.th/en/articles/15187190-marketman-integration-auto-sync-menus-and-sales-for-inventory · 2026-10-14 · [DOC de parceiro]
- Foodics · MarketMan · https://help.foodics.com/hc/en-us/articles/7494081749404-MarketMan · 2026-10-14 · [DOC de parceiro]
- Business Wire · Meal Ticket and MarketMan merger · https://www.businesswire.com/news/home/20220112005313/en/Meal-Ticket-and-MarketMan-Announce-Merger-and-over-100-Million-Growth-Investment-from-PSG · 2026-10-14 · [MKT]
- Capterra · MarketMan Reviews · https://www.capterra.com/p/136439/Marketman-Restaurant-Inventory/reviews/ · 2026-10-14 · [MKT de terceiros]
- 7shifts · llms.txt · https://www.7shifts.com/llms.txt · 2026-10-14 · [MKT]
- 7shifts · Pricing · https://www.7shifts.com/pricing/ · 2026-10-14 · [MKT]
- 7shifts · Tip Pooling for Toast POS · https://kb.7shifts.com/hc/en-us/articles/13166056874771 · 2026-10-14 · [TELA]
- 7shifts · 7shifts 101: Tip Pooling · https://kb.7shifts.com/hc/en-us/articles/4417505157779 · 2026-10-14 · [TELA]
- FitGap · Craftable · https://us.fitgap.com/products/032677/craftable · 2026-10-14 · [MKT de terceiros]
- FitGap · Crunchtime · https://us.fitgap.com/products/023645/crunchtime · 2026-10-14 · [MKT de terceiros]
- Fourth · Home · https://fourth.com/ · 2026-10-14 · [MKT]
- FitGap · Altametrics · https://us.fitgap.com/products/023654/altametrics · 2026-10-14 · [MKT de terceiros]

## Impedimentos

- **Central de ajuda da MarketMan** (mealticket.my.site.com, Salesforce): as páginas retornaram só "Sorry to interrupt / CSS Error" sem o corpo do artigo. Por isso os fluxos de contagem, pedido e desperdício da MarketMan não têm passo a passo de tela e estão marcados como [MKT] ou "não verificado". Usei documentação de PDVs parceiros (Foodics, Papaya) e a API.
- **docs.restaurant365.com/llms.txt via curl**: o proxy recusou (403); a mesma página abriu pelo WebFetch.
- **7shifts Pricing**: a página não trouxe valores em dólar legíveis; preço não verificado.
- **G2 MarginEdge**: a página não exibiu texto de prós e contras; usei GetApp.
- **Preço oficial da Restaurant365**: não há tabela pública; usei blog da própria R365 (sem data) e TrustRadius.
- **Craftable, Crunchtime e Altametrics**: usei FitGap (terceiro) por economia de buscas; não validei nos sites oficiais.
- **Vídeos oficiais (YouTube, eWebinar da MarginEdge)**: não assistidos.
- **Gorjetas por PDV na R365 e na ME** e **mão de obra na MarketMan**: não verificados.
