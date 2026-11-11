# Nível 2: PDVs de restaurante dos EUA (diferenciais relevantes para a Tipe)

Data de consulta de todas as fontes: 2026-10-14. Escopo: PDV, operação de salão, contingência e integração de pagamento de terceiros. Pagamento na mesa em si (sunday, qlub, me&u, Toast Pay) já foi coberto no benchmark anterior e só aparece aqui quando revela algo sobre integração com o PDV.

Como ler as etiquetas: [TELA] só quando um artigo de ajuda oficial descreve botões e passos concretos (eu leio texto, não vejo as capturas); [DOC] documentação oficial ou de API sem tela descrita; [MKT] marketing ou imprensa; [INF] inferência minha, com a origem indicada. Quando uma informação vem de terceiros (blogs de comparação, consultorias), isso é dito no texto e a etiqueta é [INF] ou a fonte é marcada como terceira.

## Tabela resumo

| Plataforma | Diferencial principal | Offline documentado | Preço público (data) | Pagamento de terceiro no PDV | Lição para a Tipe |
|---|---|---|---|---|---|
| NCR Voyix Aloha Cloud | Multiunidade com Central Back Office; contingência com passos explícitos | Sim, manual ("Go Offline"), só comandas tipo tab, cartão offline com teto [TELA] | Não verificado | Sim: Aloha Pay-At-Table é feito pela sunday [MKT] | Contingência precisa de roteiro claro de "entrar e sair" do offline |
| Clover (Fiserv) | Hardware + App Market; API pública para pagar pedido existente | Venda simples offline em fila; pré-autorização não [DOC] | US$ 79 a 189/mês + 2,3% + US$ 0,10 (terceiro, mai/2026) [INF] | Sim: `POST /v1/orders/{orderId}/pay`, com pagamento parcial e gorjeta [DOC] | Modelo de API "pagar pedido aberto" é o padrão a pedir aos PDVs parceiros |
| GoTab | Comanda pertence ao cliente, não à mesa; Easy Tab | Só menção a servidor local (OPServer/plano Sync) [MKT] | Basic US$ 15, Pro US$ 99, Sync US$ 229/mês (out/2026, terceiro) [INF] | É o próprio PDV; integrações via API aberta [MKT] | Comanda aberta pelo celular com pré-autorização e fechamento automático no fim do dia |
| Revel | iPad POS com "Always On Mode" | Sim, cartão offline com limites configuráveis [DOC] | ~US$ 99/terminal/mês, mín. 2, contrato 3 anos (terceiro, jun/2026) [INF] | API REST de Orders [DOC]; pagamento de terceiro não verificado | Limites de risco offline configuráveis pelo dono |
| Shift4 SkyTab (Shift4 Dine desde 12/05/2026) | Preço de entrada baixo atrelado ao adquirente | "Hybrid cloud" com cartão offline [MKT] | A partir de US$ 29,95/mês (2022) [MKT]; ~US$ 29,99 + leasing (terceiro, 2026) [INF] | Pay-at-table próprio; marketplace [MKT] | Software barato subsidiado por adquirência gera desconfiança de taxa |
| PAR Brink (PAR POS) | Rede de fast food/casual; backup register | Registradora reserva independe da internet [MKT] | Não verificado | Pay-at-table e pré-autorização de cartão (2024) [MKT]; API de parceiros com fila offline [DOC] | Parceiros devem enfileirar e reenviar em ordem quando o PDV cai |
| Oracle MICROS Simphony | Enterprise; servidor local CAPS | Sim, CAPS on-premises mantém a loja operando sem WAN [DOC] | Não verificado | Transaction Services Gen2 REST; programa de parceiros com laboratório gratuito [MKT] | Árbitro local de "dono da conta" evita conflito entre terminais |
| Heartland (Global Payments, Genius) | "US$ 0" de software com contrato e cash discount | Handheld com offline e sincronização posterior [MKT] | "US$ 0", contrato 3 anos, ≥ US$ 250 mil/ano processados [MKT] | 130+ integrações; pay-at-table no handheld [MKT] | Preço zero esconde exigências; transparência vira diferencial |
| Lightspeed Restaurant (K-Series) | Offline descrito por cenário (LAN sim/não) | Sim, detalhado; cartão só em terminal 4G [DOC] | Starter US$ 69, Essential 189, Premium 399/mês; KDS US$ 30/tela (página modif. jun/2025) [DOC] | Pay at table incluído; "Raw API access" [DOC] | Documentar o que funciona em cada cenário de queda |

## Parágrafos por plataforma

### NCR Voyix Aloha (Aloha Cloud)

O Aloha é o PDV clássico de alto volume e redes; a versão Aloha Cloud roda em Android, só nos EUA, com um Central Back Office que gerencia cardápio, preços e configurações "de uma loja ou de muitas", modos Quick Service e Table Service e modo offline listado como recurso [DOC]. O ponto mais útil para a Tipe é a contingência, que a ajuda oficial descreve passo a passo [TELA]: o funcionário toca no ícone de nuvem, depois em **Go Offline**, digita um PIN de quatro dígitos e toca em **Override** (só quem tem nível de acesso); para vender é preciso abrir um turno financeiro local ("Start a new shift"); pedidos criados online ficam travados com ícone de cadeado no mapa do salão e só podem ser lidos; um aparelho offline só cria comandas do tipo tab, não mesas (botão **ADD TAB**); a volta exige tocar em **Go Online**, o ícone fica verde e o servidor sincroniza pedidos e turnos, podendo sobrar duplicidades que o gerente deve anular. Cartão offline tem teto por transação e teto total por aparelho; ao atingir o limite, o PDV bloqueia a venda e sugere tirar itens, restabelecer a internet ou trocar a forma de pagamento [DOC]. A arquitetura usa um servidor de loja (Mac mini) ou um terminal fixo como primário; se o primário cai, os outros continuam vendendo mas param de sincronizar, transferências e KDS são afetados, e a NCR recomenda dois terminais fixos, um como primário reserva [DOC]. Preço: não verificado (não público). Pagamento de terceiro: a NCR lançou em 2024 o "Aloha Pay-At-Table, powered by sunday", integrado ao Aloha [MKT]. O que a Tipe pode aprender: contingência não é um botão invisível, é um procedimento com papéis (quem autoriza, o que fica bloqueado, como reconciliar); e o próprio líder de mercado terceiriza o fechamento de conta pelo QR, o que valida o modelo (b) da Tipe.

### Clover (Fiserv), restaurantes

A Clover vende hardware próprio, um App Market e planos de restaurante; segundo um blog de terceiros atualizado em 12/05/2026, os planos são Starter US$ 79, Standard US$ 149 e Advanced US$ 189 por mês, com 2,3% + US$ 0,10 presencial [INF: fonte terceira, UpMenu]. Offline: a Clover aceita vendas simples offline em fila para processamento posterior, mas pré-autorização e captura exigem conexão em tempo real, e transações offline ficam com dados incompletos até reconectar [DOC]. O diferencial relevante é a API pública para pagar um pedido que já existe no PDV [DOC]: `POST /v1/orders/{orderId}/pay` com OAuth, aceita vários pagamentos parciais no mesmo pedido (o campo `amount_paid` acumula), formas alternativas como dinheiro, e gorjeta enviada separada do subtotal (`tip_amount`), só na requisição inicial. A antiga Developer Pay API, que fazia o mesmo para apps de terceiros, foi descontinuada e removida do App Market a partir de 27/10/2021 [DOC]. O que a Tipe pode aprender: o contrato mínimo que a Tipe precisa de qualquer PDV parceiro é exatamente este (ler pedido aberto, registrar pagamento parcial com gorjeta separada, marcar como pago); vale desenhar a API de integração da Tipe com esse formato.

### GoTab

O GoTab é um PDV nascido do pedido pelo cliente: a comanda pertence ao cliente, não à mesa, e ele pode escanear outro QR no estabelecimento e manter a mesma comanda e o saldo; amigos entram na mesma comanda por link e a divisão pode ser por item, assento ou porcentagem [MKT]. A ajuda oficial descreve a comanda aberta [TELA]: na tela de revisão do carrinho há um botão de alternância acima da forma de pagamento que mantém a comanda aberta; o cartão é pré-autorizado pelo valor do primeiro pedido mais uma gorjeta padrão do local; impostos e taxas são cobrados uma vez, no fechamento; se o cliente não fechar, o sistema fecha sozinho no fim do dia de operação com a gorjeta padrão. O Easy Tab liga o atendimento tradicional ao celular [TELA]: no PDV o funcionário toca no botão laranja "authorize" (ou "Auth" se a comanda já existe), passa o cartão, o cliente digita o telefone, recebe um SMS com link, confirma os quatro últimos dígitos do cartão e passa a pedir pelo próprio aparelho; um sinal de verificado aparece ao lado da comanda e o KDS libera SMS automático quando o pedido fica pronto. Offline: só há menção a um servidor local com "enhanced offline mode" no plano Sync [MKT]. Preço: Basic US$ 15, Pro US$ 99 e Sync US$ 229 por mês, observados em 05/10/2026 por agregador [INF: PricingSaaS] e também citados na página do GoTab [MKT], mais taxas de processamento. Integrações: API aberta e parceiros como 7Shifts, QuickBooks, Restaurant365 e OpenTable [DOC]; não encontrei modo de sobrepor outro PDV (não verificado). O que a Tipe pode aprender: para bares, a "comanda do cliente" com pré-autorização e fechamento automático resolve o calote e a fila; no Brasil isso exigiria algo equivalente com Pix (que não tem pré-autorização), então a Tipe precisa decidir a garantia [INF].

### Revel Systems

O Revel é um PDV em iPad para redes médias, com o "Always On Mode" embutido [DOC: blog oficial com passos de configuração]: o PDV, as impressoras e o display do cliente continuam funcionando; o pagamento fica guardado localmente e é marcado nos relatórios como offline; a sincronização é automática ao voltar. A configuração é por chave "Accept Offline Credit Cards" nas configurações de pagamento ou no Management Console (Settings > Payments > Offline Payments), com limites de quantidade de pagamentos offline, valor total e número de recusas [DOC]. Preço: um site de terceiros cita cerca de US$ 99 por terminal por mês, mínimo de dois, contrato de três anos e implantação a partir de US$ 674 (verificado em 14/06/2026) [INF: CostBench, confiança média]. API: há API REST com recurso Orders (GET/POST/PATCH) [DOC]; uma API para terceiros registrarem pagamento não foi verificada. O que a Tipe pode aprender: deixar o dono definir o risco aceitável no offline (número e valor máximos) é simples e transmite controle.

### Shift4 SkyTab (agora Shift4 Dine)

O SkyTab foi lançado em 07/09/2022 com preço a partir de US$ 29,95 por mês sem custo inicial, hardware próprio (estação com display para o cliente, handheld 4G, tablet e KDS), pedido e pagamento por QR, marketplace com DoorDash e Uber Eats e arquitetura "hybrid cloud" que mantém pedidos e cartão funcionando sem internet [MKT]. Em 05/05/2026 a Shift4 anunciou que o SkyTab passaria a se chamar Shift4 Dine a partir de 12/05/2026, sem mudança de produto [DOC: nota de versão oficial]; um artigo de terceiros fala em 2024, o que conflita com a nota oficial, que prevalece. Uma consultoria de taxas (que vende auditoria, portanto parcial) diz que em 2026 a mensalidade é cerca de US$ 29,99 com leasing de hardware (~US$ 360/aparelho/ano), processamento obrigatório pela Shift4, taxa padrão de 2,75% + US$ 0,15 e várias taxas anuais [INF: Merchant Cost Consulting]. O que a Tipe pode aprender: software quase grátis financiado pela adquirência atrai, mas gera desconfiança; a Tipe cobra por mesas e uma fatia da gorjeta, e deve deixar isso explícito para não cair na mesma percepção.

### PAR Brink (PAR POS)

O Brink é o PDV em nuvem da PAR, forte em redes de serviço rápido e casual. Para resiliência, a PAR destaca uma registradora reserva que roda independente da internet e da nuvem e assume se a principal falhar [MKT]. A versão de primavera de 2024 trouxe para serviço de mesa: pagamento na mesa, divisão de gorjeta entre salão e cozinha, pré-autorização de cartão na chegada para manter comanda aberta, divisão automática por assento e relatório de fechamento do garçom [MKT]. O portal de desenvolvedores da PAR exige que parceiros (ex.: fidelidade Punchh) enfileirem os dados da conta localmente durante quedas, guardem por 10 a 30 dias e reenviem em ordem FIFO até confirmar [DOC]. Preço: não verificado. O que a Tipe pode aprender: no modo (b) a integração da Tipe com o PDV precisa de fila com reenvio idempotente, porque o PDV ou a internet do restaurante vão cair no meio de um pagamento.

### Oracle MICROS Simphony

O Simphony é o PDV enterprise (hotéis, estádios, redes). A resiliência vem do CAPS (Check and Posting Service), serviço obrigatório instalado na loja entre os terminais e a nuvem: se a WAN cai, os terminais seguem lançando no CAPS; relatórios em tempo real e mudanças de configuração ficam parados; quando a conexão volta, o CAPS envia tudo [DOC]. O CAPS também arbitra o compartilhamento de contas, mantendo o registro de qual terminal é dono de cada conta para evitar versões conflitantes [DOC]. Para integração, a Oracle oferece a Simphony Transaction Services Gen2 (REST) e um programa de parceiros com laboratório Simphony gratuito e validação; entre os parceiros está a Fanz, que oferece pagamento por QR [MKT, página atualizada em 08/01/2024]. Preço: não verificado. O que a Tipe pode aprender: num PDV próprio com vários aparelhos por salão, um "dono da conta" claro (travar a conta enquanto alguém paga) evita cobrança dupla; vale aplicar isso entre o app do cliente e a área do garçom [INF].

### Heartland Restaurant (Global Payments, Genius)

A Global Payments reposiciona o Heartland Restaurant sob a marca Genius e anuncia "comece por US$ 0", sem assinatura, instalação ou hardware; as letras miúdas exigem contrato de três anos, cash discount de 4%, até 10 estações e pelo menos US$ 250 mil por ano processados [MKT]. O handheld Heartland Mobile recebe por SMS, QR, cartão ou dinheiro, divide contas, mostra gorjeta na tela e tem modo offline que continua pedidos e pagamentos e sincroniza depois; roda só em aparelhos Heartland Android [MKT]. São mais de 130 integrações (DoorDash, QuickBooks, MarginEdge, Restaurant365) e fidelidade com Como [MKT]. API para pagamento de terceiro: não verificada. O que a Tipe pode aprender: "grátis" com contrato longo e volume mínimo é o padrão de mercado nos EUA; preço por mesa sem fidelidade longa é um diferencial a comunicar.

### Lightspeed Restaurant (K-Series), solução adicional

Incluído por ter a documentação de offline mais clara entre os analisados [DOC]. A ajuda separa cenários: internet caída com rede local de pé (os aparelhos passivos mandam para o PDV ativo, que guarda; pedidos, impressão na cozinha, KDS, menu, descontos, ponto e pagamentos manuais como dinheiro ou "Paid Offsite" funcionam); internet e rede local caídas (só o PDV ativo vende, sem impressoras nem KDS); e terminais de cartão com 4G, que seguem processando sozinhos. Não funcionam offline: cartão pelo Lightspeed Payments sem 4G, relatórios, mudanças de cardápio, alergênicos, vale-presente, fidelidade e integrações de delivery. Preço (EUA): Starter US$ 69, Essential US$ 189, Premium US$ 399 por mês e KDS US$ 30 por tela, com pay at table e "Raw API access" incluídos (página modificada em 01/06/2025) [DOC]. O que a Tipe pode aprender: publicar uma matriz "o que funciona em cada tipo de queda" reduz suporte e dá confiança; e o pagamento "Paid Offsite" é exatamente como um PDV registraria um pagamento feito pela Tipe fora dele [INF].

Soluções avaliadas e não detalhadas: Lavu (só encontrei avaliações de terceiros, sem doc oficial nesta rodada) e Tablesafe (não pesquisado por limite de buscas).

## Padrões que se repetem (síntese)

1. Offline em PDV americano é quase sempre híbrido: um aparelho ou servidor local é o "primário", os demais dependem dele [DOC: Aloha, Simphony, Lightspeed].
2. Cartão offline sempre tem teto configurável e risco do lojista [DOC: Aloha, Revel, Clover].
3. Fechamento de conta de terceiros entra por API de "pagar pedido existente" ou por parceria exclusiva (Aloha com sunday) [DOC/MKT].
4. Comanda aberta segura depende de pré-autorização de cartão [TELA: GoTab; MKT: Brink]. No Brasil, com Pix, essa garantia não existe nativamente [INF].
5. Preço de entrada baixo costuma vir amarrado a processamento e contrato longo [MKT: Heartland; INF: SkyTab].

## Fontes

| Plataforma · página | URL | Data | Etiqueta |
|---|---|---|---|
| Aloha Cloud · Working in offline mode | https://docs.ncrvoyix.com/restaurant/aloha-cloud/using/working_in_offline_mode | 2026-10-14 | [TELA] |
| Aloha Cloud · Offline credit transactions | https://docs.ncrvoyix.com/restaurant/aloha-cloud/using/using_offline_credit_transactions | 2026-10-14 | [DOC] |
| Aloha Cloud · Overview | https://docs.ncrvoyix.com/restaurant/aloha-cloud/about/overview | 2026-10-14 | [DOC] |
| Aloha Cloud · Running without Mac mini | https://docs.ncrvoyix.com/restaurant/aloha-cloud/hardware/running_aloha_cloud_without_mac_mini | 2026-10-14 | [DOC] |
| NCR Voyix · Aloha Pay-At-Table powered by sunday (2024) | https://www.businesswire.com/news/home/20240520546037/en/NCR-Voyix-Unveils-Aloha-Pay-At-Table-Powered-by-sunday-to-Simplify-the-Restaurant-Payments-Process | 2026-10-14 | [MKT] |
| Clover · Payments and refunds FAQs | https://docs.clover.com/dev/docs/payments-and-refunds-faqs | 2026-10-14 | [DOC] |
| Clover · Accept payments and tips (Ecommerce API) | https://docs.clover.com/dev/docs/ecommerce-accepting-payments | 2026-10-14 | [DOC] |
| Clover · Developer Pay API (descontinuada) | https://docs.clover.com/dev/docs/developer-pay-api | 2026-10-14 | [DOC] |
| UpMenu (terceiro) · Clover POS pricing, atualizado 12/05/2026 | https://www.upmenu.com/blog/clover-pos-pricing | 2026-10-14 | [INF] |
| GoTab · Mobile Ordering & Payment | https://gotab.com/products/mobile-ordering-payment | 2026-10-14 | [MKT] |
| GoTab · Open a tab | https://success.gotab.io/knowledge/open-a-tab | 2026-10-14 | [TELA] |
| GoTab · Easy Tab: how do I use it | https://success.gotab.io/knowledge/easy-tab-how-do-i-use-it | 2026-10-14 | [TELA] |
| GoTab · Integrations | https://success.gotab.io/knowledge/integrations | 2026-10-14 | [DOC] |
| PricingSaaS (terceiro) · GoTab plans, obs. 05/10/2026 | https://pricingsaas.com/companies/gotab | 2026-10-14 | [INF] |
| Revel · Get started with Always On mode (blog oficial) | https://blog.revelsystems.com/blog/2017/10/24/get-started-always-mode | 2026-10-14 | [DOC] |
| Revel · API 2.76 changelog | https://developer.revelsystems.com/revelsystems/changelog/revel-276-api-updates | 2026-10-14 | [DOC] |
| CostBench (terceiro) · Revel hidden costs | https://costbench.com/software/restaurant-pos/revel-systems/hidden-costs/ | 2026-10-14 | [INF] |
| Shift4 · Lançamento SkyTab POS (07/09/2022) | https://investors.shift4.com/news-events/press-releases/detail/164/commerce-technology-leader-shift4-launches-skytab-pos-next-gen-restaurant-point-of-sale-system | 2026-10-14 | [MKT] |
| Digital Transactions · SkyTab launch | https://www.digitaltransactions.net/shift4-ups-its-game-as-rivalry-gets-intense-in-the-restaurant-pos-market/ | 2026-10-14 | [MKT] |
| Shift4 release notes · rebrand para Shift4 Dine (05/05/2026) | https://releasenotes.shift4.com/announcements/ann_quOQ1es4MXWlj | 2026-10-14 | [DOC] |
| AZ Big Media (terceiro) · SkyTab rebrand | https://azbigmedia.com/business/skytab-rebrand-is-skytab-now-shift4-dine-what-restaurant-owners-need-to-know/ | 2026-10-14 | [INF] |
| Merchant Cost Consulting (terceiro) · SkyTab review | https://merchantcostconsulting.com/lower-credit-card-processing-fees/skytab-pos-review/ | 2026-10-14 | [INF] |
| PAR · Brink 2024 Spring Release | https://www.businesswire.com/news/home/20240529717038/en/PAR-Technology-Elevates-Table-Service-Experience-with-Brink-POS-2024-Spring-Release | 2026-10-14 | [MKT] |
| PAR · From chaos to control (blog) | https://partech.com/2024/01/17/from-chaos-to-control-how-par-brink-pos-transforms-the-daily-grind-for-restaurant-staff/ | 2026-10-14 | [MKT] |
| PAR Developers · Handling POS disconnections | https://developers.partech.com/docs/dev-portal-pos/tutorials/modules/10-handling-pos-disconnections | 2026-10-14 | [DOC] |
| Oracle · Check and Posting Service (CAPS) | https://docs.oracle.com/en/industries/food-beverage/simphony/simcg/c_caps.htm | 2026-10-14 | [DOC] |
| Oracle · Next-Gen Simphony APIs | https://www.oracle.com/food-beverage/restaurant-pos-systems/pos-integrations/next-gen-api-for-restaurant-pos/ | 2026-10-14 | [MKT] |
| Global Payments · Genius POS | https://contact.globalpayments.com/geniuspos/ | 2026-10-14 | [MKT] |
| Heartland · Mobile POS | https://www.heartland.us/products/point-of-sale/mobile-pos | 2026-10-14 | [MKT] |
| Lightspeed K-Series · Offline POS functionality | https://k-series-support.lightspeedhq.com/hc/en-us/articles/53028167251867-Offline-POS-functionality | 2026-10-14 | [DOC] |
| Lightspeed · Restaurant pricing (EUA) | https://www.lightspeedhq.com/restaurant/pricing | 2026-10-14 | [DOC] |

## Impedimentos

- Preços de Aloha, PAR Brink e Oracle Simphony não são públicos (venda por cotação); marcados como não verificados.
- Clover, Revel, GoTab e SkyTab: preços vieram de fontes terceiras com data; não confirmados em página oficial de preços nesta rodada (exceto GoTab, citado também na página de produto).
- A página "Offline credit transactions" da Aloha tem capturas cujo conteúdo não é legível em texto; botões dessa tela não foram identificados.
- Busca por artigos de ajuda oficiais da Clover sobre offline em restaurante não retornou página do help center dos EUA; usei a FAQ de desenvolvedor.
- Não encontrei documentação pública do PAR Brink sobre modo offline do terminal principal nem API para pagamento de terceiros; também não encontrei se a API Gen2 do Simphony permite registrar pagamento de terceiro (não verificado).
- Conflito de data no rebrand SkyTab para Shift4 Dine (terceiro diz 2024; nota oficial diz 12/05/2026). Adotei a nota oficial.
- Lavu e Tablesafe não foram detalhados por falta de documentação oficial encontrada e limite de buscas.
