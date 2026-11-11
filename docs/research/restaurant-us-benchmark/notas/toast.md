# Toast (PDV de restaurante, EUA): nota de benchmark para a Tipe

Data de consulta de todas as fontes: 2026-10-14. Etiquetas: [TELA], [DOC], [MKT], [INF], conforme as regras de pesquisa.

Uso do [TELA]: eu leio texto, não vejo imagens. Só uso [TELA] quando um artigo da central de ajuda da Toast (support.toasttab.com) descreve botões e passos concretos da tela real ("toque em X, depois Y"). Quando o artigo só descreve configuração no backoffice ou conceitos, uso [DOC].

---

## 1. Módulos e o que cada um faz

| Módulo | O que faz | Etiqueta / fonte |
|---|---|---|
| POS (terminal Toast Flex) | Ponto de venda com modos "Table Service", "Quick Order", "Payment Terminal" e "Retail". O modo de serviço de mesa abre pelo mapa de mesas. | [TELA] Manage Tables; [TELA] Split Checks (lista os modos) |
| Toast Go 3 (handheld) | Garçom de mão com tela de 6,52", 426 g, IP65, queda de 1,5 m, bateria de 24+ h, Wi-Fi 6, 4G opcional (US$ 30/mês por aparelho), leitor de cartão embutido (tarja, chip, NFC, PIN on Glass, PCI PTS), modo offline. | [MKT] página handheld-pos (CA) |
| KDS | Tela de cozinha com layouts "Dynamic" e "Grid", cor do cabeçalho do ticket conforme a idade, expediter de um ou dois níveis, roteamento por praça (prep station), linha de montagem (assembly line), balanceamento de carga, "all day view", recall, tickets de pré-visualização, status "PAID/NOT PAID", modo escuro. | [DOC] KDS overview (doc.toasttab.com) |
| Toast Web (backoffice) | Configuração de cardápio (Menu Builder, modificadores), salão (Service areas & tables), regras de disparo de cursos, aparência do KDS, permissões numeradas (ex.: "1.20 Split Checks"). | [DOC] Create Service Areas; Configure Modifier Behavior |
| Multilocation Management (MLM) / Enterprise | Compartilhamento de cardápio entre unidades por "Target" e "Owner", "versions" por unidade sem duplicar itens nos relatórios, cópia de configurações entre lojas, publicação agendada de cardápio e preço, relatórios consolidados e benchmarking. | [DOC] MLM (Toast Central); [MKT] press release Restaurant Management Suite (11/04/2024) |
| Pedidos e canais digitais | Online ordering, Mobile Order & Pay, Toast Delivery Services, integrações com DoorDash/Uber Eats/Grubhub, kiosk, site e app de marca, Drive-Thru. | [MKT] pos.toasttab.com |
| Equipe (Toast IQ Team) | Folha de pagamento, escala e gestão de gorjetas. | [MKT] pos.toasttab.com |
| Estoque e custo | Inventory management e xtraCHEF (análise de custo). | [MKT] pos.toasttab.com |
| Marketing e cliente | E-mail/SMS, fidelidade, gift card, reservas (Toast Tables), CRM. | [MKT] pos.toasttab.com |
| Financeiro | Processamento de pagamento (obrigatório), capital, conta, depósito instantâneo. | [MKT] pos.toasttab.com |
| IA | Toast IQ (previsões e recomendações). | [MKT] pos.toasttab.com |
| API / Partner program | APIs de pedidos, cardápios, mão de obra, caixa, configuração, cozinha, estoque; programa de parceiros com certificação; "tender provider" para meios de pagamento de terceiros. | [DOC] devguide |

A home declara "1,000 features" e 300+ integrações [MKT].

---

## 2. Fluxos principais passo a passo

Contagem de toques: só conto quando o artigo de ajuda dá os passos. Onde há lacuna, digo "não verificado".

### 2.1 Abrir mesa [TELA]
1. No modo Table Service, aparece o mapa do salão, com abas de áreas de serviço na barra superior. [TELA] Manage Tables
2. Toque no bloco da mesa.
   - Com o painel "Table Details" oculto: o toque abre direto a tela de pedido (**1 toque**).
   - Com o painel visível: o toque abre "Check Details". Toque em "Update" para ir à tela de pedido (**2 toques**).
3. Número de pessoas: toque no contador de convidados em "Check Details" para alterá-lo (+1 toque e digitação). [TELA]

O passo de informar convidados ao abrir não está descrito como obrigatório: não verificado.

### 2.2 Lançar pedido com modificador obrigatório [TELA]
O artigo "Start and Send an Order on the POS" traz um exemplo concreto:
1. Toque no botão do cardápio ("Food").
2. Toque no grupo ("Entrees").
3. Toque no item ("Carne Asada").
4. Escolha o acompanhamento obrigatório ("Seasoned Rice").
5. Toque em "Done".

Total: **5 toques** para um item com um modificador obrigatório, partindo da tela de pedido. Se o cardápio e o grupo já estiverem selecionados, o próximo item do mesmo grupo custa 3 toques [INF: a navegação é por menu, grupo e item e mantém o contexto, segundo "Manage Orders"; não confirmado explicitamente]. Há barra de busca e botão "Open Item" (item aberto) acima dos itens [TELA]. Repetir item: toque no item na conta, ajuste a quantidade, "Repeat" [TELA].

### 2.3 Enviar à cozinha [TELA]
Três botões no rodapé da conta, só visíveis depois que há item na conta:
- "Send": dispara os itens destacados e volta ao mapa de mesas (**1 toque**). A mesa fica amarela.
- "Stay": dispara e permanece na tela de pedido. Itens não selecionados ficam retidos automaticamente.
- "Hold": guarda os itens sem disparar. A mesa fica vermelha.
Fonte: "Use the Send, Stay and Hold Buttons" [TELA].

Cursos: o backoffice escolhe entre "servidor dispara cada curso" (ativa Send/Hold/Stay), regra automática por tempo, sequencial (próximo curso sai quando o anterior é concluído na praça) ou disparo pelo expediter. Se faltar curso em um item, um pop-up oferece "Go back" ou "Proceed anyways" (este só quando o curso é opcional). [DOC/TELA] Manage Course Firing Options.

### 2.4 Dividir conta [TELA]
1. Na conta, toque em "Split" (ou no menu de três pontos).
2. Escolha:
   - "Split by seat": divide por assento em um toque, se os assentos foram atribuídos.
   - "Tap and drop": toque nos itens e mova para nova conta.
   - "Split evenly": selecione um item e informe por quanto dividi-lo (fração de item).
3. "Done".

Por assento: **3 toques**. Para ver as contas divididas, deslize da esquerda para a direita. Para desfazer, mova os itens de volta [TELA].
Na tela de pagamento, "Split evenly" divide o valor em N partes, até 9. Acima de 9, o operador digita o valor de cada pessoa e repete até zerar o saldo [TELA]. Em AU/CA/IE/UK existe "Split item between selected seats" em rollout limitado [TELA].
Regras: permissão "1.20 Split Checks" ou senha de gerente; dividir por item não leva taxa de serviço nem desconto de item, que precisam ser reaplicados; dividir antes do envio gera tickets separados no KDS [TELA].

### 2.5 Receber pagamento com gorjeta [TELA parcial]
1. Toque em "Pay" no rodapé da conta.
2. Tela de pagamento: detalhes da conta à esquerda, meios à direita. Cartão pré-autorizado aparece como botão grande no topo. "Other payments" abre gift card, house account, comp card.
3. Gorjeta: a tela mostra a sugestão mais alta primeiro, depois "Custom tip" e "No tip". Se a gorjeta vem antes ou depois do pagamento depende da configuração do aparelho e só o suporte muda.
4. Recibo: "No receipt" vem priorizado; também Print, Text, Email. É possível pular a tela de recibo.
Fonte: "Manage Payments With Toast POS" [TELA]. Passos de inserir cartão, dinheiro e ajuste de gorjeta não estão nesse artigo: não verificado. Contagem estimada no cartão com handheld: Pay, aproximação do cartão, 1 toque na gorjeta, 1 toque no recibo, cerca de 3 toques mais a aproximação [INF a partir dos passos acima].

### 2.6 Fechar mesa [DOC]
Cartão cobra e a conta passa de "open" a "paid". A gorjeta ainda pode ajustar o valor; quando o total é final, passa a "closed". Fechamento manual: tela "Paid Checks", selecionar várias e "Close" (permissão "Bulk Close Paid Checks"), ou fechar uma conta na tela de pedido [DOC] Closing paid checks. Fechamento automático e liberação da mesa: não verificado.

### 2.7 Transferir mesa [TELA]
Pressione e segure a mesa, escolha a conta, "Move X Check", toque na mesa de destino, "Confirm" (**4 toques**, mais troca de área se preciso). Se o destino já tem conta, o sistema pergunta se junta ou mantém separadas.

### Resumo de toques

| Fluxo | Toques | Etiqueta |
|---|---|---|
| Abrir mesa | 1 (painel oculto) ou 2 | [TELA] |
| Item com 1 modificador obrigatório | 5 | [TELA] |
| Enviar à cozinha | 1 | [TELA] |
| Dividir por assento | 3 | [TELA] |
| Pagar no cartão com gorjeta | cerca de 3 + cartão | [INF] |
| Transferir mesa | 4 | [TELA] |
| Fechar conta | não verificado | [DOC] |

---

## 3. Padrões de interface que explicam a eficiência

1. **Mapa de mesas como tela inicial do garçom.** Cada bloco mostra número de pessoas, cronômetro da mesa, número e área, total gasto e iniciais do garçom em selo colorido; a borda da mesa usa a cor do garçom [TELA] Manage Tables. Zoom por pinça ou botão "Zoom": afastado vira visão resumo, aproximado mostra mais detalhes [TELA].
2. **Cores de status da mesa** (só para mesas do usuário logado; mesas de outros ficam cinza) [DOC] Create Service Areas:

| Cor | Significado |
|---|---|
| Verde | Todos os itens prontos na cozinha (exige KDS) |
| Vermelho | Itens retidos, não enviados |
| Amarelo | Itens enviados |
| Azul (borda grossa) | Mesa selecionada |
| Cinza | Mesa de outro garçom |
| Borda pontilhada | Mesa vazia |

   O status "pronto" vem do KDS para o salão, fechando o ciclo cozinha-garçom.
3. **Layout da tela de pedido em duas metades**: cardápio (menu, grupo, item, busca, "Open Item") e conta. Ações frequentes fixas no rodapé (Hold, Stay, Send, Print, Pay); ações raras em menu de três pontos ("Void order", "Tax exempt", "Reprint kitchen tickets", etc.) [TELA] Manage Orders.
4. **Handheld adaptado**: no Toast Go 2, Print e Pay sempre visíveis, Hold/Stay/Send travados no rodapé, cabeçalho recolhe quando há itens [TELA]. A tela inicial do aparelho é configurável ("Quick Order" ou "Payment Terminal") [TELA] bar workflow.
5. **Modificadores em três níveis**: "Required" (impede envio sem escolha, permite mínimo), "Optional - force show" (aparece sozinho, pode pular), "Optional" (escondido até tocar) [DOC] Configure Modifier Behavior. Os modificadores aparecem na parte de baixo da tela de pedido [TELA].
6. **Disparo parcial e retenção** como prevenção de erro operacional: Stay retém automaticamente o que não foi selecionado; Hold deixa a mesa vermelha, sinal visual de pendência [TELA].
7. **Permissões numeradas com escalonamento**: ação sem permissão pede senha ou cartão de outro funcionário que a tenha, em vez de bloquear [TELA/DOC].
8. **Desfazer**: divisão desfeita movendo itens de volta; "Void order" para itens ou pedido inteiro [TELA]. Não achei "desfazer" genérico: não verificado.
9. **KDS**: cabeçalho muda de cor com a idade do ticket; ticket fica verde no expediter quando todas as praças concluem; som para ticket novo, pronto e item alterado ou anulado; animação de flash em ticket novo ou alterado [DOC]. Número da mesa ou conta em fonte grande no canto superior esquerdo; borda do ticket por tipo de consumo (salão vs. fora); itens e modificadores com cor de fundo configurável; modificador sem cor aparece em texto vermelho; fonte Small a Extra Large, com Large ou maior recomendado em telas de 22" [DOC] Customize KDS Tickets.
10. **Modo escuro e claro** na tela de mesas e no KDS [TELA/DOC].
11. **Recibo digital por padrão**: "No receipt" priorizado e opção de pular a tela [TELA].

---

## 4. Limitações e reclamações recorrentes

Capterra: 4,1/5 em 554 avaliações; facilidade de uso 4,2; suporte 3,7 [Capterra, 2026-10-14]. G2: 4,2/5 em 372 avaliações (texto das avaliações não carregou).

| Tema | Evidência |
|---|---|
| Suporte lento ou difícil de alcançar | Nota de suporte 3,7; "Getting in touch with a sales rep is difficult" (mar/2026); críticas antigas recorrentes (2017 a 2019). |
| Quedas e bugs no pico | "SYSTEM CRASHES UNDER HIGH VOLUME DAYS" (jul/2025); "weird bugs and down time during dinner service" (fev/2025). |
| Relatórios e exportação | Não exporta detalhe de pedido para Excel (nov/2025); relatórios novos com menos informação que os antigos (mar/2026); relatório enterprise com timeout (2017). |
| Integrações caras ou instáveis | Custo de integrações difícil de justificar (jan/2026); dessincronização com sistema externo deixou contas sem pagamento (nov/2025). |
| Faturamento, reembolso, repasses | Reembolso não devolvido (jun/2026); repasses não recebidos (mar/2025). |
| Preço e contrato | Preço acima de concorrentes (set/2025); contrato de 2 a 3 anos (NerdWallet); taxa de inatividade de US$ 85/mês pode se aplicar (home Toast). |
| Complexidade | "overwhelming for smaller stores" (2019); fechamento de mesa e mês complicado (2021). |
| Limites de produto (da documentação) | Divisão igual só até 9 partes; dividir por item perde taxa de serviço e desconto; divisão não funciona em Retail; não há junção de mesas descrita; gorjeta antes ou depois do pagamento só o suporte altera [TELA/DOC]. |
| Offline | Toast Go aceita pedidos e pagamentos offline, mas pagamentos só são autorizados ao voltar a conexão [MKT]. |

Reddit: não encontrei threads nas buscas feitas (ver Impedimentos).

---

## 5. Modelo de preço observável (consulta 2026-10-14)

A página oficial de preços não exibiu os planos em texto (ver Impedimentos). Dados de terceiros:

| Item | Valor | Fonte |
|---|---|---|
| Starter Kit | US$ 0/mês, 1 local, até 2 terminais | NerdWallet (atualizado 06/08/2026); owner.com (15/05/2025) |
| Point of Sale | a partir de US$ 69/mês | NerdWallet; Capterra |
| Build Your Own | sob consulta | NerdWallet; Capterra |
| Taxa pay-as-you-go | 3,09% a 3,69% + US$ 0,15 | NerdWallet |
| Taxa com hardware pago à vista | 2,49% + US$ 0,15 presencial; 3,50% + US$ 0,15 não presencial | NerdWallet |
| Toast Go 3 | US$ 599 | NerdWallet |
| Toast Tap (leitor) | US$ 149 | NerdWallet |
| Kits iniciais | Handheld US$ 1.113; balcão US$ 1.203; autoatendimento US$ 1.454 (ou US$ 0 com taxa maior) | NerdWallet |
| KDS (assinatura) | US$ 35/mês | owner.com (15/05/2025) |
| Implantação | US$ 849 (1 a 2 tablets) | owner.com |
| 4G no Go 3 | US$ 30/mês por aparelho | Toast [MKT] |
| Inatividade | US$ 85/mês pode se aplicar | Toast home [MKT] |
| Contrato | 2 a 3 anos | NerdWallet |
| Enterprise | sem preço público | press release 2024 |

Oficialmente a Toast diz que preço vale para novos clientes e uma unidade, inclui o primeiro terminal e cobra por aparelho adicional; suporte Toast Care 24/7 incluso [MKT pricing]. Modelo: assinatura de software por plano e por aparelho, mais processamento obrigatório pela Toast. A receita principal vem do processamento [INF a partir da oferta de US$ 0 subsidiada por taxa maior].

---

## 6. O que se aplica à Tipe

### (a) Tipe completo (PDV/ERP + fechamento)
1. **Mapa de mesas com cor por estado do pedido**, não só ocupada/livre: vermelho (retido), amarelo (enviado), verde (pronto no KDS), cinza (de outro garçom), pontilhado (vazia). É barato de copiar e tem alto valor. Para a Tipe, somar um estado "pagando pelo QR" e "pago" [INF].
2. **Bloco da mesa denso**: pessoas, cronômetro, total, iniciais do garçom com cor própria. Adotar no mobile-first com zoom resumo/detalhe [INF a partir de TELA].
3. **Três botões de envio (Send/Stay/Hold)** são poderosos mas exigem treino. Para a Tipe simplificada: um botão "Enviar" padrão e "Segurar" como ação secundária; considerar disparo por curso automático (sequencial) como opção avançada [INF].
4. **Modificadores com três níveis** (obrigatório, opcional que aparece, opcional escondido) resolvem velocidade sem perder upsell. Copiar o modelo e o bloqueio de envio sem obrigatório [DOC].
5. **Ações raras em menu de três pontos e ações frequentes fixas no rodapé**, inclusive no celular do garçom [TELA].
6. **Permissão com escalonamento por senha do gerente** em vez de bloqueio duro [TELA].
7. **KDS**: cor por idade do ticket, fonte grande para mesa, borda por tipo de consumo, som em item alterado ou anulado, expediter com ticket verde quando tudo pronto, "all day". Também status "PAID/NOT PAID" no ticket, útil para a Tipe porque o pagamento por QR pode acontecer antes do fim do serviço [DOC].
8. **Pontos fracos da Toast que viram diferencial da Tipe**: divisão igual limitada a 9 e perda de desconto/taxa ao dividir (a Tipe já divide por item com frações), contrato de 2 a 3 anos, suporte mal avaliado, relatórios sem exportação, complexidade para casas pequenas, hardware proprietário caro (Go 3 a US$ 599). A Tipe pode usar celulares comuns e cobrança mensal por mesa sem fidelidade [INF].
9. **Multiunidade**: modelo "Target/Owner" com "versions" por unidade, sem duplicar itens nos relatórios, e publicação agendada de cardápio/preço. É o padrão a seguir quando a Tipe atender redes; não é prioridade para o MVP [DOC/INF].
10. **Offline** no handheld é argumento comercial forte nos EUA; no Brasil com Pix, pagamento exige conexão, mas lançar pedido offline e sincronizar vale avaliar [INF].

### (b) Só fechamento de conta integrado ao PDV Toast
Aplicável se a Tipe atender casas que usam Toast (fora do Brasil, ou como referência de como PDVs grandes expõem pagamento). O que a API documenta:
- **Escopos**: `orders:read`, `orders.payments:write` (adicionar pagamentos e gorjetas a pedidos existentes), `credit_cards.authorization:write`, `config:read` (tipos de pagamento alternativos), `menus:read`, `kitchen:read`, entre outros. Escopos são concedidos pela equipe de integrações conforme o status do parceiro [DOC] API scopes.
- **Adicionar pagamento a conta existente**: tipo `CREDIT` (exige autorização prévia pela API de cartão da própria Toast) ou `OTHER` (meio alternativo configurado no restaurante, GUID obtido em `/alternatePaymentTypes`), com `tipAmount` separado [DOC] Adding payments to an existing check; Alternative payment types.
- **Na prática**, quem processa o pagamento fora da Toast lança como `OTHER`. Exemplo público: Storekit captura o cartão e registra na conta Toast como "Alternate payment type"; exige mapa de mesas sincronizado e só funciona com uma conta aberta por pedido; se o garçom dividir a conta no terminal, o pagamento na mesa não se aplica [DOC de terceiro, storekit.com].
- **Tender provider API**: para meios de terceiros (ex.: conta de hotel), a Toast chama o endpoint HTTPS do parceiro de forma síncrona, com média esperada de 500 ms e corte em 5 s; não paga contas criadas pela API de pedidos ou online ordering e não funciona com pagamento por aproximação [DOC].
- **Programa de parceiros**: inscrição formal e certificação; acesso só aos restaurantes que são clientes em comum [DOC]. Taxas do programa: não verificado.
- **Implicações para a Tipe** [INF]: (1) a integração mais provável é "pagamento alternativo" (`OTHER`), o que tira a Toast do processamento e pode gerar atrito comercial, já que a Toast ganha no processamento; (2) a divisão por item da Tipe precisa conviver com contas divididas no PDV, que é exatamente onde a Storekit falha; desenhar a integração para ler todas as contas do pedido e pagar por conta; (3) gorjeta vai no campo próprio, o que permite repasse 70/30 conciliado; (4) o padrão de "tipo de pagamento alternativo + escopo de escrita de pagamento" é o mesmo que a Tipe deve pedir aos PDVs brasileiros.

---

## 7. Fontes

| Plataforma · página | URL | Data | Etiqueta |
|---|---|---|---|
| Toast · Manage Tables With Toast POS | https://support.toasttab.com/en/article/New-POS-Managing-Tables?lang=en_US | 2026-10-14 | [TELA] |
| Toast · Split Checks on the POS | https://support.toasttab.com/en/article/Splitting-Checks-by-Item-1492811097734?lang=en_US | 2026-10-14 | [TELA] |
| Toast · Manage Orders With Toast POS | https://support.toasttab.com/en/article/New-POS-Experience-Ordering-Screens?lang=en_US | 2026-10-14 | [TELA] |
| Toast · Use the Send, Stay and Hold Buttons | https://support.toasttab.com/en/article/Differences-Between-the-Send-Stay-and-Hold-Buttons | 2026-10-14 | [TELA] |
| Toast · Start and Send an Order on the POS | https://support.toasttab.com/en/article/Starting-Sending-an-Order?lang=en_US | 2026-10-14 | [TELA] |
| Toast · Manage Payments With Toast POS | https://support.toasttab.com/en/article/New-POS-Managing-Payments?lang=en_US | 2026-10-14 | [TELA] |
| Toast · Configure Modifier Behavior | https://support.toasttab.com/en/article/Required-Optional-Modifiers?lang=en_US | 2026-10-14 | [DOC] |
| Toast · Manage Course Firing Options | https://support.toasttab.com/en/article/Course-Firing-Options?lang=en_US | 2026-10-14 | [DOC] |
| Toast · Enable Server Order Firing | https://support.toasttab.com/en/article/Compare-Server-Item-Firing-and-Course-Firing | 2026-10-14 | [DOC] |
| Toast · Create Service Areas and Table Setup | https://support.toasttab.com/en/article/Creating-Service-Areas-and-Table-Setup-1493049150430?lang=en_US | 2026-10-14 | [DOC] |
| Toast · Customize the Appearance of KDS Tickets | https://support.toasttab.com/en/article/Customize-the-Appearance-of-KDS-Tickets?lang=en_US | 2026-10-14 | [DOC] |
| Toast · Use Toast Go 3 at the Bar or Pub | https://support.toasttab.com/en/article/Optimising-Your-Bar-Workflow-Using-Toast-Flex-and-TG3-Together | 2026-10-14 | [TELA] |
| Toast · Kitchen display system overview | https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html | 2026-10-14 | [DOC] |
| Toast · Closing paid checks | https://doc.toasttab.com/doc/platformguide/adminClosingPaidChecks.html | 2026-10-14 | [DOC] |
| Toast · Manage menus across locations (MLM) | https://intercom.help/toast-central/en/articles/14728209-manage-menus-across-locations-using-multilocation-management | 2026-10-14 | [DOC] |
| Toast · Restaurant Management Suite (press, 11/04/2024) | https://pos.toasttab.com/news/restaurant-management-suite-launch-enterprise-brands | 2026-10-14 | [MKT] |
| Toast · Toast Go 3 handheld | https://pos.toasttab.com/ca/products/handheld-pos | 2026-10-14 | [MKT] |
| Toast · Home | https://pos.toasttab.com/ | 2026-10-14 | [MKT] |
| Toast · Pricing | https://pos.toasttab.com/pricing | 2026-10-14 | [MKT] |
| Toast · API scopes | https://doc.toasttab.com/doc/devguide/apiScopes.html | 2026-10-14 | [DOC] |
| Toast · Adding payments to an existing check | https://doc.toasttab.com/doc/devguide/apiAddingPaymentsToACheck.html | 2026-10-14 | [DOC] |
| Toast · Alternative payment types | https://doc.toasttab.com/doc/devguide/apiCreatingAnOrderWithPaymentInformation.html | 2026-10-14 | [DOC] |
| Toast · Tender provider integrations overview | https://doc.toasttab.com/doc/devguide/apiTenderProviderIntegrationsOverview.html | 2026-10-14 | [DOC] |
| Toast · Partner integration overview | https://doc.toasttab.com/doc/devguide/apiPartnerIntegrationOverview.html | 2026-10-14 | [DOC] |
| Storekit · Toast pay at table | https://storekit.com/docs/guides/integrations/pos/toast/pay-at-table.md | 2026-10-14 | [DOC de terceiro] |
| NerdWallet · Toast POS Review (atualizado 06/08/2026) | https://www.nerdwallet.com/business/software/reviews/toast-pos | 2026-10-14 | terceiro (preço) |
| Owner.com · Toast pricing (15/05/2025) | https://www.owner.com/blog/toast-pricing | 2026-10-14 | terceiro (preço) |
| Capterra · Toast POS pricing | https://www.capterra.com/p/136301/Toast-POS/pricing/ | 2026-10-14 | terceiro (preço) |
| Capterra · Toast POS reviews | https://www.capterra.com/p/136301/Toast-POS/reviews/ | 2026-10-14 | avaliação |
| Capterra · reviews página 16 | https://www.capterra.com/p/136301/Toast-POS/reviews/?page=16 | 2026-10-14 | avaliação |
| G2 · Toast reviews | https://g2.com/products/toast/reviews?page=4 | 2026-10-14 | avaliação |

---

## 8. Impedimentos

- **pos.toasttab.com/pricing**: a página não trouxe planos, mensalidades nem taxas no texto extraído (provável renderização dinâmica). Usei NerdWallet, owner.com e Capterra, com as datas indicadas. O artigo da owner.com tem inconsistência interna (US$ 69 vs. US$ 90/mês).
- **G2**: a página carregou só nota e contagem, sem texto das avaliações.
- **Reddit**: as buscas não retornaram threads do Reddit sobre a Toast; nenhuma reclamação de Reddit foi registrada.
- **Artigos de ajuda incompletos para contagem de toques**: "Manage Payments" não descreve inserção de cartão, dinheiro, ajuste de gorjeta nem fechamento; "Start and Send an Order" não cobre seleção de mesa, convidados e assentos; "Closing paid checks" não cobre fechamento automático nem liberação da mesa. Esses pontos ficam como não verificados.
- **Junção de mesas** e **pré-modificadores/modificadores aninhados**: não encontrados nos artigos lidos.
- **Taxas do partner program**: não publicadas nas páginas lidas.
- Não assisti vídeos nem acessei demos ou painéis com login, conforme as regras.
