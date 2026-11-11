# SpotOn Restaurant: nota de benchmark (PDV EUA)

Consulta: 2026-10-14 e 2026-10-15. Etiquetas: [TELA] = artigo de ajuda oficial que descreve botões e passos concretos ("toque em X, depois Y"); como só li texto, [TELA] significa "passo a passo com nomes de botões na central de ajuda", não que vi a captura. [DOC] = documentação oficial sem tela descrita. [MKT] = página de marketing. [INF] = inferência minha, com a origem indicada.

**Aviso de contexto importante.** A SpotOn tem hoje duas linhas de PDV para restaurante, e a central de ajuda (help.spoton.com, espelhada em spotonteam.atlassian.net/wiki/spaces/SK) mistura as duas:
- **SpotOn Restaurant (RPOS)**: o PDV de serviço completo mais antigo, com BOH (back office) e FOH (front of house). Vários artigos dele aparecem marcados como "archived" (ex.: o de dividir conta, atualizado em 10/02/2022) [DOC].
- **SpotOn Express**: PDV mais novo e simplificado, com Dashboard web/mobile, handheld próprio (Express Handheld, liberado a todos os clientes Express em julho de 2025), Table Maps (junho de 2025), split por item (agosto de 2025) e Hold & Fire (maio de 2026) [DOC, via notas de versão em express-updates.spoton.com].
- Também aparecem nomes anteriores de apps móveis (SpotOn Sidekick, SpotOn Serve) [DOC].
[INF] A SpotOn parece estar migrando o pequeno e médio cliente para o Express e reconstruindo nele, em 2025 e 2026, as funções de serviço à mesa que o RPOS já tinha. Por isso os fluxos abaixo citam o produto de onde cada passo vem.

---

## 1. Módulos e o que cada um faz

| Módulo | O que faz | Etiqueta |
|---|---|---|
| POS Station (Station 15 / Station 10) | Terminal fixo de balcão. Station 15 "sleek and spill-proof". | [MKT] |
| Handheld | Dispositivo de 6,7" para pedido e pagamento na mesa: tap/dip/swipe com leitor EMV retroiluminado, Apple Pay/Google Pay, 18 h de bateria, IP67, Wi-Fi 6E e 4G, câmera para QR. Mapa de mesas, troca de seção "with a single tap", modificadores guiados, gestos (swipe up abre o pedido em tela cheia, swipe right repete item, swipe left remove). | [MKT] |
| Table Maps / Table Layouts | Mapa do salão. No Express: paredes, rótulos, rearranjo de mesas, número da mesa impresso no ticket da cozinha, gestão de contas a partir do mapa. No RPOS: layouts criados no BOH e Table Status configuráveis (ex.: seated, ordering, ready to clear). | [DOC] |
| KDS (SpotOn KDS) | Roteamento automático por tipo de pedido ou categoria, uma tela por praça (grill, frio, expo), timer no cabeçalho com mudança de cor por idade, remoções em vermelho e itens novos com rótulo verde, check de item, double-tap no cabeçalho para "bump", aba de concluídos, histórico, visão "all-day", modo offline. | [MKT] |
| Fresh KDS (integração) | Alternativa de KDS com etiquetas, SMS ao cliente, alertas sonoros, mensagens entre telas. | [MKT], [DOC] (nota de maio/2026) |
| Hold & Fire | Lançar o pedido completo da mesa e escolher quando cada item vai para a cozinha; funciona em handheld e station. | [DOC] (maio/2026) |
| Teams (RPOS) | Pool de gorjeta entre garçons de um mesmo time (bar compartilhado ou mesa grande): divisão igual ou por % de horas trabalhadas no time. | [TELA] |
| Tip pooling básico (Dashboard Express) | Ativar pool e escolher cargos recebedores em Team Management > Tip Pooling > Recipients; cálculo depende de ponto (time clock). | [DOC] |
| SpotOn Teamwork | Escala, ponto, previsão de mão de obra, app do funcionário, gestão de gorjetas com regras customizadas, integração com folha (mais de 20 provedores, segundo o lançamento de 2022). | [MKT] |
| DayCheck | Acesso a gorjeta ganha: gorjetas aprovadas vão para carteira digital do funcionário ao fim do turno; transferência diária automática ou sob demanda; cartão pré-pago Visa (SpotOn Card, Sutton Bank). | [MKT] |
| Relatórios / Dashboard | "90+ curated reports", relatórios recorrentes por e-mail, alertas de limite; Daily Recap (julho/2025) com vendas, gorjetas, estornos, impostos e pagamentos atualizados ao longo do dia; export .xlsx e assinatura por e-mail (maio/2026); app mobile do Dashboard. | [MKT], [DOC] |
| SpotOn Order + Order with Google | Pedido online sem comissão ligado ao PDV; em 2021 integrou o "Order with Google" (pedido pela Busca/Maps sem login). | [MKT], [DOC] (artigo arquivado) |
| QR Order & Pay (Table Service) | Cliente escaneia QR na mesa, pede, adiciona itens durante a visita e paga no celular; cada cliente que escaneia cria seu próprio pedido; ícone no mapa quando a mesa tem vários pedidos QR. | [TELA] (configuração) |
| Integrações | Deliverect (US$ 100/local/mês, preferencial), MarginEdge, Shogo (contabilidade), DoorDash Drive. | [DOC] |
| Offline mode | Liga sozinho sem internet; stations, handhelds, impressoras e KDS seguem sincronizados; pagamentos offline sincronizam depois. | [MKT] |

---

## 2. Fluxos principais passo a passo

### 2.1 Abrir mesa
- **Sidekick (app móvel antigo)** [TELA]: tocar no ícone "Tables" (canto inferior esquerdo) e escolher uma mesa disponível. [INF] 2 toques.
- **Express FOH, pedido genérico** [TELA]: "New Check" (canto inferior direito; no handheld, na tela Checks); passar/inserir cartão para pré-autorizar ou digitar nome; "Enter/Checkmark". O artigo não menciona mesa. [INF] 2 toques mais digitação.
- **Express Table Maps** [DOC]: gestão de contas a partir do mapa, sem passo a passo público encontrado. O marketing diz "open checks with a single tap" [MKT].
- **Teams (RPOS)**: o garçom escolhe o Team ao iniciar o pedido; se não escolher, a conta fica individual e a gorjeta não entra no pool [TELA].

### 2.2 Lançar pedido com modificador
- **Sidekick** [TELA]: escolher a tela de menu no banner azul inferior; escolher a aba do grupo (ou buscar pelo campo "Search"); tocar o item; a tela mostra mínimo e máximo de modificadores obrigatórios; escolher o grupo de modificador nos botões do topo, depois o modificador; repetir; "Done". [INF] cerca de 5 toques para um item com 1 modificador.
- **Express** [TELA]: "Menu", item, modificadores, "Add to order". [INF] cerca de 4 toques.
- **Handheld** [MKT]: categorias coloridas e "guided modifiers".
- **Assentos/convidados (Sidekick)** [TELA]: tocar no nome do convidado ou na seta ">" no banner para criar "New Guest" e lançar os itens dele.

### 2.3 Enviar à cozinha
- **RPOS** [TELA]: "Send" envia e volta à tela inicial; "Quick Send" envia e mantém o pedido aberto; "Send to..." manda itens não enviados para outro pedido; "Auto Course" põe curso 1 nos itens não enviados; "Scheduled Order" com "Minutes Before to Release".
- **Express** [TELA]: "Send"; itens com preparo vão à cozinha e o pedido fica suspenso.
- **Hold & Fire** [DOC]: segurar pratos principais/sobremesa e disparar depois.

### 2.4 Dividir conta
- **RPOS, dividir item** [TELA]: tocar o item (abre Item Commands); "Split"; em "Split Item Between Guests" escolher cada convidado; "Split". [INF] 3 toques + 1 por convidado. Não pode ser desfeito.
- **RPOS, dividir por convidado** [TELA]: tocar o topo do Guest Check (abre Ticket Commands); "Manage"; "Add Guest" por convidado; selecionar itens (vários de uma vez); a lista de convidados fica laranja indicando destino; tocar o convidado; "Done"; na tela de pagamento, "Split By Guest" na Command Bar gera uma conta por convidado. [INF] Exemplo com 2 convidados e 3 itens: cerca de 9 toques. Atalho "Split by Guest" direto quando os itens já foram lançados por convidado.
- **RPOS, dividir forma de pagamento** [TELA]: "Payments"; tipo 1; valor no teclado; "Apply Payment"; tipo 2; valor; "Apply Payment". [INF] 5 toques mais digitação.
- **Sidekick, dividir saldo** [TELA]: "Split Balance and Pay"; padrão 50/50; sliders para ajustar, "Manual" para valor exato ou "Divide by X"; "Done"; pagar cada parte.
- **Express** [DOC]: divisão igual com recibos separados (junho/2025); divisão por item e mover itens entre contas (agosto/2025); combinar contas.

### 2.5 Receber pagamento com gorjeta
- **Configuração da tela de gorjeta (SpotOn Serve)** [TELA]: por Order Type, marcar "Allow Tips on Order Type" e "Override Location Suggested Tip"; escolher % ou valor fixo; 3 sugestões (exemplo do artigo: 20%, 18%, 15%); default "No Default" recomendado; na Station Type, "Capture Tip With Payment Terminal".
- **Handheld** [MKT]: o cliente escolhe uma sugestão de gorjeta "with one tap"; pagamento, gorjeta e fechamento em "a couple of taps".
- **Express** [DOC]: opção de mostrar a tela de gorjeta depois de processar o cartão (agosto/2025).
- **Gratuity (taxa de serviço)** [TELA]: "Add Percentage Gratuity" ou "Add Fixed Value Gratuity", valor, "Accept". Só antes do pagamento; uma por conta; não incide imposto; depende de permissão do cargo.
- **Ajuste de gorjeta no recibo, Express** [TELA]: "Checks" > aba "Paid / No tip" > conta > "Add Tip" > valor > "Pay" (vai para "Paid/With tip") > "Close Check" ou "Adjust Tip". Reajuste só em 10 minutos. Só no PDV, não pelo Dashboard, e não vale para handheld, CFD ou quiosque.
- **Ajuste de gorjeta, RPOS** [TELA]: "Show Commands" > "Adjust Tips" > tocar o próprio nome > filtrar ajustados/não ajustados > pedido > linha Tip ou Total > "Apply Tip". Tem de ser feito antes do End of Day.
- **Sidekick, dinheiro** [TELA]: "Pay" > "Select payment method" > valor > check azul > troco > recibo > "Done". Cartão estava como "Coming soon!" [DOC].

### 2.6 Fechar mesa
- **RPOS** [TELA]: "Close" só fecha se o saldo for US$ 0; "Reopen" reabre; "Transfer" passa a conta para outro funcionário que esteja com ponto aberto.
- **Sidekick** [TELA]: depois do pagamento, "Close Order".
- **Express** [DOC]: pedidos não podem ficar abertos de um dia para outro; o sistema fecha às 4h; sem cartão anexado, fecha como "custom tender" não pago.
- **QR Order & Pay** [TELA]: configuração "Auto Close When Paid".
- **Saída do garçom, RPOS** [TELA]: "Show Commands" > "Clock Out" > (se o cargo exigir) caixa inicial e final > "Accept" > gorjetas em dinheiro declaradas > "Accept" > tip out pago a outros > "Accept" > "Acknowledge". Se o garçom rejeitar a mensagem, só sai com aprovação do gerente. Closeout impresso só se habilitado no cargo.
- **End Day, RPOS** [TELA]: só conclui com zero pedidos abertos, zero funcionários com ponto aberto e todas as gorjetas de cartão ajustadas.

---

## 3. Padrões de interface que explicam a eficiência

1. **Menus de comando contextuais.** O RPOS concentra ações em três menus (Item Commands, Show Commands, Ticket Commands) abertos por um toque no item ou no topo da conta [TELA]. São mais de 30 comandos no Ticket Commands. [INF] Rápido para quem decorou, mas é uma lista longa: densidade alta, descoberta difícil.
2. **Send vs. Quick Send.** Duas variantes do mesmo verbo: uma volta à tela inicial (garçom passa para a próxima mesa), outra mantém o pedido aberto [TELA].
3. **Gestos no handheld.** Swipe up para tela cheia, swipe right repete item ("Order Another Round"), swipe left remove [MKT], [DOC].
4. **Modificadores guiados com mínimo e máximo visíveis** [TELA no Sidekick, MKT no handheld].
5. **Divisão com destaque visual de destino.** Ao selecionar itens, a lista de convidados fica laranja indicando onde soltar [TELA].
6. **Gorjeta com 3 sugestões e default neutro** ("No Default" recomendado) [TELA].
7. **Regras que impedem estado sujo.** Close exige saldo zero; End Day exige tudo fechado; Express fecha tudo às 4h [TELA], [DOC].
8. **Mesmo layout em station e handheld no Express** ("same interface as the Express station") [DOC].
9. **KDS com códigos de cor de mudança** (vermelho para removido, verde para novo) e bump por double-tap [MKT].
10. **Modo offline em todos os dispositivos** [MKT].

---

## 4. Limitações e reclamações recorrentes

- **Duas plataformas e documentação fragmentada.** Artigos arquivados do RPOS, nomes antigos (Sidekick, Serve) e o Express em construção; o artigo do Handheld 1.0 lista subartigos sem conteúdo público legível [DOC]. Uma página pública da ajuda chega a expor senhas administrativas do handheld [DOC] (não as reproduzi).
- **Ajuste de gorjeta restritivo no Express**: janela de 10 minutos, sem ajuste remoto, sem suporte a handheld/CFD/quiosque nesse fluxo [TELA].
- **Gratuity só antes do pagamento** e uma por conta [TELA].
- **Teams**: se o garçom esquecer de escolher o time, a gorjeta não entra no pool; edições não afetam contas fechadas [TELA].
- **Tip pooling depende de ponto**: sem marcação de ponto ou sem cargo, o funcionário recebe US$ 0; números do dia mudam ao longo do dia [DOC].
- **Teamwork no G2**: nota 3,3/5 com só 6 avaliações (2019 a 2026); queixas de navegação difícil, versão mobile limitada ("everything appears extremely small"), falta de turnos abertos e geração de escala por meta; elogios à gorjeta diária e ao fim da planilha de folha [terceiros].
- **PDV em geral (Merchant Maverick, atualizado em 21/07/2026)**: custos escondidos e taxas extras, reembolso lento de cobranças, bugs após implantação, muitas ligações para resolver; plano gratuito com mínimo mensal e contrato de 2 anos; troca de processador pode gerar taxa de conversão [terceiros].
- **Concorrente Rezku (blog de 2026, viés comercial)**: divergência entre cobrado e contratado, custo de US$ 995 e software dobrado para usar outro processador, cobrança de diferença do hardware se cancelar em até 1 ano [terceiros, não verificado].
- **Order with Google**: o Google descontinuou a experiência de pedido dentro do Business Profile no fim de junho de 2024, passando a redirecionar a links externos (Search Engine Roundtable). [INF] O valor do "Order with Google" que a SpotOn ainda cita no FAQ é hoje basicamente um link para o SpotOn Order.

---

## 5. Modelo de preço observável (consulta 2026-10-14)

| Item | Preço | Fonte/etiqueta |
|---|---|---|
| All-In | US$ 0/station/mês; 2,79% + US$ 0,20 presencial; 3,79% + US$ 0,20 digitado; hardware incluso; mínimos de processamento; prazo mínimo de 2 anos | spoton.com/pricing [MKT] |
| POS Essentials | US$ 55/station/mês; 2,45% + US$ 0,15 (Amex 3,19% + US$ 0,15); digitado 3,45% + US$ 0,15; mês a mês; hardware e implantação à parte | [MKT] |
| Build Your Own | Sob consulta (multiunidade, enterprise) | [MKT] |
| Hardware | Station 15 US$ 995 (exibido a US$ 750); Station 10 US$ 550 (US$ 415); Handheld US$ 495 (US$ 297); CFD US$ 200; roteador US$ 300 | [MKT] |
| Core Bundle | US$ 50/mês + 20 bps do volume, teto US$ 200/local (Order, GoTo, Marketing Assist, Profit Assist) | [MKT] |
| KDS | US$ 20/station/mês + US$ 500 por tela + US$ 100 instalação | [MKT] |
| Teamwork (inclui DayCheck) | US$ 3/funcionário/mês, mínimo US$ 75/mês, setup US$ 0 para cliente SpotOn POS; gestão básica de gorjeta inclusa no POS | [MKT] |
| DayCheck para o funcionário | Grátis para SpotOn Card e transferência padrão; transferência rápida 1% (mín. US$ 0,95, máx. US$ 2,95); conta externa mínimo US$ 25 | [MKT] |
| Deliverect | US$ 100/local/mês | [DOC] (ago/2025) |
| Add-ons segundo Merchant Maverick (21/07/2026) | Online Ordering US$ 55/mês; Loyalty US$ 65/local/mês; Waitlist & Reservations US$ 100/mês; quiosque US$ 75/mês (adicionais US$ 50); instalação presencial US$ 1.500; criação de menu US$ 500 | [terceiros] |

---

## 6. O que se aplica à Tipe

### (a) Tipe completo (PDV/ERP + fechamento)
1. **Send vs. Quick Send** é barato de copiar e resolve dois ritmos de garçom. Combinar com **Hold & Fire** (segurar prato principal) dá controle de cursos sem tela extra.
2. **Mesmo layout no celular do garçom e no caixa** (decisão do Express) reduz treinamento. Para a Tipe, mobile-first, o celular do garçom é o "handheld"; o caixa é o mesmo app em tela maior.
3. **Mapa do salão com ícone de "vários pedidos QR na mesa"** é exatamente o caso da Tipe (vários clientes pagando partes). Mostrar no mapa quantas pessoas já pagaram e quanto falta.
4. **Divisão**: a SpotOn exige cerca de 9 toques do garçom para dividir por convidado no RPOS [INF]. A Tipe pode empurrar a divisão para o cliente (QR, por item com frações), deixando ao garçom só o "Split evenly" de emergência. Isso é vantagem de produto a explicitar em vendas.
5. **Regras de estado limpo**: "Close" só com saldo zero, fechamento do dia bloqueado com conta aberta ou ponto aberto, e fechamento automático no virar do dia fiscal (com horário fiscal configurável, ex.: 5h). Bate com a abertura/fechamento de caixa da Tipe.
6. **Clock Out com declaração** (caixa, gorjeta em dinheiro, tip out) e confirmação "Acknowledge" com escalonamento ao gerente: modelo enxuto para o fechamento de turno do garçom na Tipe.
7. **KDS**: cores de mudança (vermelho removido, verde novo), double-tap para bump, visão all-day e roteamento por categoria são o mínimo viável; cobrar KDS como módulo por tela (SpotOn: US$ 20/tela/mês) é um precedente para a modularidade da Tipe.
8. **Daily Recap** único (vendas, gorjetas, estornos, impostos, pagamentos) atualizado durante o dia, com versão filtrada para o garçom ver só as próprias contas: bom modelo para relatório inicial da Tipe e para a área do garçom.
9. Evitar o que gera reclamação: contrato longo, taxa de troca de processador, preço pouco transparente. A Tipe cobra por mesa; manter a tabela pública.

### (b) Só fechamento de conta integrado ao PDV existente
1. O QR Order & Pay da SpotOn cria **um pedido por cliente** e põe um ícone no mapa do PDV. Se a Tipe se integra a um PDV de terceiros, precisa de um sinal equivalente no PDV ou no painel Tipe ("mesa com pagamento parcial"), senão o garçom não sabe o estado.
2. A configuração recomendada pela SpotOn ("Pay Later", "Require Table Number", "Auto Close When Paid") é uma boa lista de checagem para a integração da Tipe: vincular mesa sempre, fechar a conta no PDV quando o saldo zerar.
3. Gorjeta: a SpotOn trata **gratuity** (taxa de serviço, antes do pagamento, sem imposto) separada de **tip** (opcional, escolhida pelo cliente). A Tipe deve manter a mesma separação entre os 10% de serviço do Brasil e a gorjeta extra (o AGENTS.md já diz que gorjeta extra fica fora do histórico de conta do restaurante).

### Gorjeta e equipe x regra 70/30 e saque quinzenal da Tipe
- **Atribuição da gorjeta**: na SpotOn a gorjeta segue a conta do garçom dono do pedido ou do Team escolhido na abertura; esquecer o Team tira a gorjeta do pool [TELA]. Na Tipe, a gorjeta liga a `waiter_id` da solicitação de pagamento: definir quem é o garçom na abertura da mesa e permitir **transferir mesa** (como o "Transfer" da SpotOn, só para quem está em turno) antes do pagamento, com regra clara de a quem vai a gorjeta já paga.
- **Pool entre garçons**: os dois métodos da SpotOn (igual entre membros; proporcional às horas no time) são simples e cabem dentro dos 70% do garçom. Sugestão [INF]: oferecer "mesa compartilhada" (2 garçons, divisão igual) antes de qualquer regra por hora, porque a Tipe não tem ponto eletrônico hoje e o pool por horas da SpotOn depende de ponto (sem ponto, US$ 0).
- **Aprovação antes do saque**: no DayCheck, a gorjeta só fica disponível depois que o gerente revisa e aprova no Teamwork. Na Tipe, o saldo é calculado só no servidor e o fundador marca o Pix pago. [INF] Um passo leve de "conferência do gerente do restaurante" antes do ciclo quinzenal fechar reduziria disputas, e é o que a SpotOn vende como "fewer disputes".
- **Velocidade de saque como argumento de retenção**: a SpotOn vende saque no fim do turno (transferência rápida a 1%, mín. US$ 0,95, máx. US$ 2,95; padrão grátis). A Tipe paga quinzenalmente (1 a 15, 16 ao fim). [INF] Uma opção futura de "saque antecipado" com taxa pequena, ou ciclo semanal, seria diferencial para o garçom; a SpotOn mostra que o mercado aceita cobrar do funcionário pela pressa e não pelo padrão.
- **Transparência ao garçom**: o Daily Recap filtrado por servidor e o app de funcionário com "pay info" mostram ao garçom o que ele ganhou. A área do garçom da Tipe deve mostrar gorjeta por mesa, data, status do ciclo e data prevista do Pix.
- **Tip out e gorjeta em dinheiro**: a SpotOn pede declaração de gorjeta em dinheiro e tip out no clock out. A Tipe só controla gorjeta digital; [INF] vale deixar explícito no contrato e na tela que gorjeta em dinheiro fica fora dos 70/30.
- **Cobrança**: a SpotOn cobra gestão avançada de gorjeta por funcionário (US$ 3/mês, mínimo US$ 75) e financia o saque rápido do funcionário. A Tipe monetiza com 30% da gorjeta. [INF] O argumento de venda é que o restaurante não paga nada pela gestão de gorjeta e o garçom não paga taxa de saque.

---

## 7. Fontes

| # | Plataforma · página | URL | Data consulta | Etiqueta |
|---|---|---|---|---|
| 1 | SpotOn · Pricing | https://www.spoton.com/pricing/ | 2026-10-14 | MKT |
| 2 | SpotOn · RPOS / planos | https://www.spoton.com/rpos/ | 2026-10-14 | MKT |
| 3 | SpotOn · Restaurant POS | https://www.spoton.com/restaurant-pos/ | 2026-10-14 | MKT |
| 4 | SpotOn · Handhelds | https://www.spoton.com/hardware/handhelds/ | 2026-10-14 | MKT |
| 5 | SpotOn · Handheld POS | https://www.spoton.com/restaurant-pos/handheld-pos | 2026-10-14 | MKT |
| 6 | SpotOn · KDS | https://www.spoton.com/solutions/kitchen-display-system/ | 2026-10-14 | MKT |
| 7 | SpotOn · Tip management | https://spoton.com/solutions/tip-management/ | 2026-10-14 | MKT |
| 8 | SpotOn · DayCheck | https://www.spoton.com/daycheck | 2026-10-14 | MKT |
| 9 | SpotOn · Earned tip access | https://www.spoton.com/solutions/earned-tip-access/ | 2026-10-14 | MKT |
| 10 | SpotOn · Labor management (Teamwork) | https://www.spoton.com/products/labor-management/ | 2026-10-15 | MKT |
| 11 | SpotOn · Blog lançamento Teamwork (04/10/2022) | https://www.spoton.com/blog/introducing-spoton-teamwork/ | 2026-10-15 | MKT |
| 12 | SpotOn KB · Ticket Commands Menu (RPOS FOH) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2055733392/ | 2026-10-14 | TELA |
| 13 | SpotOn KB · Split Items, Checks, and Payment Types (RPOS, arquivado, 10/02/2022) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/846954605 | 2026-10-14 | TELA |
| 14 | SpotOn KB · Orders, Sidekick | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/1656652722/ | 2026-10-14 | TELA |
| 15 | SpotOn KB · Teams (RPOS FOH) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2021425371/ | 2026-10-14 | TELA |
| 16 | SpotOn KB · Gratuity FAQs & Tips | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/4732682255 | 2026-10-14 | TELA |
| 17 | SpotOn KB · Tip Adjustments (Express) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/5620826115 | 2026-10-14 | TELA |
| 18 | SpotOn KB · Tip Settings & Tip Screen (Serve) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/5389516803 | 2026-10-14 | TELA |
| 19 | SpotOn KB · Tip Pooling Troubleshooting (Express) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/5286035470 | 2026-10-14 | DOC |
| 20 | SpotOn KB · Open Orders (Express FOH) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/3466330116/ | 2026-10-14 | TELA |
| 21 | SpotOn KB · Table Service QR Order & Pay | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/5245108569 | 2026-10-14 | TELA (config.) |
| 22 | SpotOn KB · Table Layouts FOH (arquivado, 08/09/2023) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2659518219 | 2026-10-14 | DOC |
| 23 | SpotOn KB · Table Status (RPOS BOH) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/777650376/ | 2026-10-15 | DOC |
| 24 | SpotOn KB · Handheld 1.0 Help (Express) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/4274585668 | 2026-10-14 | DOC |
| 25 | SpotOn KB · End of Day FOH & Closeout | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2664431904 | 2026-10-15 | TELA |
| 26 | SpotOn KB · Adjust Tips from Show Commands (RPOS) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/4464017409 | 2026-10-15 | TELA |
| 27 | SpotOn KB · Clock Out (RPOS FOH) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/855801879 | 2026-10-15 | TELA |
| 28 | SpotOn KB · Order with Google (arquivado) | https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2318795134/ | 2026-10-14 | DOC |
| 29 | SpotOn Express updates · jun/2025 (Table Maps, Split Payments) | https://express-updates.spoton.com/announcements/ann_xldKAtVdrLKJe | 2026-10-15 | DOC |
| 30 | SpotOn Express updates · jul/2025 (Express Handheld, Daily Recap, Deliverect) | https://express-updates.spoton.com/announcements/ann_ZHHUode3WJBuK | 2026-10-14 | DOC |
| 31 | SpotOn Express updates · ago/2025 (split por item, cash tips) | https://express-updates.spoton.com/announcements/ann_ww7XK4HkogWNQ | 2026-10-15 | DOC |
| 32 | SpotOn Express updates · mai/2026 (Hold & Fire, Fresh KDS) | https://express-updates.spoton.com/announcements/product-updates-weeks-05-01-26-05-31-26-1 | 2026-10-14 | DOC |
| 33 | BusinessWire · SpotOn + Order with Google (17/06/2021) | https://www.businesswire.com/news/home/20210617005190/en/ | 2026-10-14 | MKT |
| 34 | Search Engine Roundtable · fim do Order with Google (jun/2024) | https://seroundtable.com/order-with-google-discontinued-37399.html | 2026-10-14 | terceiros |
| 35 | G2 · Teamwork by SpotOn reviews | https://www.g2.com/products/teamwork-by-spoton/reviews | 2026-10-14 | terceiros |
| 36 | Merchant Maverick · SpotOn POS Review (atualizado 21/07/2026) | https://www.merchantmaverick.com/reviews/spoton-pos-review | 2026-10-14 | terceiros |
| 37 | Rezku · SpotOn alternatives 2026 (concorrente) | https://rezku.com/blog/top-spoton-pos-alternatives-for-restaurants-in-2026/ | 2026-10-14 | terceiros |

---

## 8. Impedimentos

- **help.spoton.com** carrega o corpo dos artigos via JavaScript: o fetch retornou só metadados. Contornei abrindo o mesmo ID de página em spotonteam.atlassian.net/wiki/spaces/SK/pages/<id>, que é o espelho público. Links curtos `wiki/x/...` voltaram vazios.
- Acesso por curl a spotonteam.atlassian.net foi bloqueado pelo proxy de saída; usei só WebFetch.
- Não encontrei conteúdo público legível dos subartigos do Express Handheld ("Transaction Flow", "How to Take Orders", "Check Management") nem de "Payments & Tips | SpotOn Express" e "Table Maps | POS Settings". Por isso o fluxo do handheld atual vem de marketing, e as contagens de toque são do RPOS/Sidekick (produtos mais antigos).
- Contagens de toque são [INF] minhas, somando os passos dos artigos [TELA]; os artigos não trazem contagem.
- Artigos de ajuda mostram "Updated <mês dia>" sem ano em vários casos; registrei como aparece.
- Vídeos de treinamento (Restaurant Handheld Tutorial Videos) não foram assistidos; a página do artigo só tem imagem.
- Limite de sessão interrompeu o trabalho por algumas horas entre 14 e 15/10; retomado sem perda.
