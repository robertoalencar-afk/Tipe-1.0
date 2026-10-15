# 02 — Benchmark de PDVs dos EUA (consolidado)

Data de consulta: 14/10/2026. Notas completas, com todas as fontes, etiquetas e impedimentos: `notas/toast.md`, `notas/square.md`, `notas/lightspeed.md`, `notas/touchbistro.md`, `notas/spoton.md`, `notas/nivel-2-pdv.md`. Pagamento na mesa só é citado quando muda algo de PDV (o resto está no benchmark anterior).

Etiquetas: `[TELA]` artigo de ajuda oficial que descreve botões e passos concretos; `[DOC]` documentação oficial sem tela; `[MKT]` marketing; `[INF]` inferência.

## 1. Quadro geral

| | Toast | Square for Restaurants | Lightspeed K-Series | TouchBistro | SpotOn |
|---|---|---|---|---|---|
| Para quem | full service e redes | pequenos e médios, café a casual | médio, multiunidade, Europa e América do Norte | independente full service, iPad | full service e bares |
| Melhor em | mapa com estado da cozinha, KDS, multiunidade | simplicidade, onboarding self-service, modificadores | modularidade, offline documentado, **API de pagamento em conta aberta** | ergonomia de toque, lançamento por assento | gorjetas e equipe (pools, DayCheck), fechamento do dia |
| Pior em | suporte (3,7 no Capterra), contrato de 2–3 anos | relatórios rasos, add-ons por dispositivo, KDS só Android | instabilidade no pico, recarga manual de configuração | suporte (3,4), instabilidade, implantação longa | custos escondidos, contrato, suporte irregular |
| Preço observado | Starter US$ 0; POS a partir de US$ 69/mês; KDS ~US$ 35/mês [terceiros] | US$ 0 / 49 / 149 por local; KDS US$ 20–30/tela [DOC] | US$ 69 / 189 / 399; KDS US$ 30/tela [MKT] | a partir de US$ 69 e US$ 119 com pagamentos [MKT] | US$ 0 por terminal (com taxa maior e contrato) a US$ 55; KDS US$ 20/tela [MKT] |
| Cobrança | plano + aparelho + processamento obrigatório | local + dispositivo + transação | plano + add-on por tela | estabelecimento + add-ons | terminal + processamento + Teamwork por funcionário |
| API para fechar conta de terceiro | `orders.payments:write` como pagamento alternativo, só via programa de parceiros [DOC] | **não confiável**: open tickets não são legíveis por API [DOC fórum oficial] | **sim**: `getCheck` por mesa + `POST /pay` com gorjeta separada + webhooks; programa de parceiros [DOC] | sem API pública [DOC] | QR próprio; API não verificada |

Nenhum deles cobra **por mesa**. Todos cobram por local, terminal ou tela, e quase todos vivem da taxa de processamento. A assinatura por mesa da Tipe é um posicionamento diferente e fácil de explicar [INF].

## 2. Toast

**Módulos.** POS (modos mesa, pedido rápido, terminal de pagamento, varejo), Toast Go 3 (handheld IP65, 24 h de bateria, offline com autorização posterior), KDS (layouts dinâmico e grade, expediter, roteamento por praça, "all day", balanceamento), Toast Web (cardápio, salão, permissões numeradas), Multilocation Management (cardápio por "Target/Owner" com versões por unidade, mudanças agendadas), equipe, estoque (xtraCHEF), marketing, financeiro, API e parceiros [DOC/MKT].

**Fluxos [TELA].** Abrir mesa: 1 toque. Item com 1 modificador obrigatório: 5 (cardápio, grupo, item, opção, Concluir). Enviar: 1 (Send, Stay ou Hold). Dividir por assento: 3. Transferir mesa: 4. Pagamento com gorjeta: ~3 + cartão [INF].

**O que explica a eficiência.** A cor da mesa diz o estado do **pedido** (vermelho retido, amarelo enviado, verde pronto no KDS) e fecha o ciclo cozinha-salão; o bloco da mesa mostra pessoas, cronômetro, total e iniciais do garçom; modificadores em três níveis; ações frequentes fixas no rodapé e raras no menu de três pontos; permissão com senha do gerente em vez de bloqueio; KDS com cor por idade, som em item alterado e status PAID/NOT PAID no ticket [DOC/TELA].

**Limitações.** Divisão igual só até 9 partes; dividir por item perde taxa de serviço e desconto; quedas em pico; relatórios sem exportação; integrações caras; contrato longo [TELA/terceiros].

**Para a Tipe.** (a) Copiar o mapa com estado da cozinha, o bloco denso da mesa, os três níveis de modificador, o ticket "pago/não pago" no KDS. (b) A integração via "pagamento alternativo" mostra o desenho certo, e o caso da Storekit mostra o erro a evitar: **ler e pagar por conta**, não por pedido, porque o garçom pode dividir no terminal.

## 3. Square for Restaurants

**Módulos.** POS por "modo" com templates, floor plan (criado no Dashboard), coursing, KDS Android, handheld, cardápio com modificadores conversacionais, tip pooling e tip out, Order & Pay, Dashboard web [DOC/TELA].

**Fluxos [TELA].** Abrir mesa: 2 (mesa + pessoas; a mesa já fica ocupada). Item com modificador: 3–4 [INF]. Enviar: 1 (Send & Stay mantém o pedido aberto). Dividir: 5–6. Anular item: 6, com motivo. Juntar mesas: arrastar uma sobre a outra.

**O que explica a eficiência.** Configuração por modo e entrada de aparelho por código curto; menu único "Ações" por conta; modificadores Sem/Extra com preço negativo e nome curto para a cozinha; KDS com desfazer de 3 s, timers amarelo/vermelho, cor por modificador, colunas ajustáveis; smart tip (valores fixos abaixo de US$ 10, % acima) [DOC/TELA].

**Limitações.** "Uma taxa para cada funcionalidade"; relatórios rasos; atualizações que derrubam impressora; sem internet os tickets se perdem; KDS só Android; juntar mesas só no Register [terceiros/TELA].

**Para a Tipe.** (a) Modo por aparelho e código de entrada, modificadores conversacionais, desfazer no KDS, KDS em qualquer navegador (vantagem sobre "só Android"), módulos inclusos no plano em vez de cobrar por tela. (b) Square é o contraexemplo: sem API de conta aberta, a camada de pagamento só funciona se for dona do pedido.

## 4. Lightspeed Restaurant (K-Series)

**Módulos.** POS iPad, floor plan com dono por cor, cursos e assentos, KDS (add-on por tela), Order Anywhere, Tableside, relatórios Advanced Insights, multiunidade com menu central, **Order and Pay API** [DOC/MKT].

**Fluxos [TELA].** Abrir mesa: 2 (ou número da mesa no teclado). Item com modificador: ~3, com "Duplicar" e "Adicionar outro". Enviar: 1 ("Enviar · x itens"). Divisão dentro da tela de pagamento (itens, partes, assentos, valor). Pagamento em dinheiro: 2 com botão rápido. Ciclo simples: ~8 [INF].

**O que explica a eficiência.** Contagem pendente no botão de envio, troco excedente vira gorjeta, divisão sem fluxo separado, modo de treino que não suja relatórios, offline descrito por cenário (rede local de pé ou não) [TELA/DOC].

**Limitações.** Instabilidade em pico, documentação difícil, recarga manual após mudar o salão, divisão por assento só se lançado por assento, sem estorno por API [terceiros/DOC].

**Para a Tipe.** (a) Botão "Enviar · n itens", divisão dentro do pagamento, modo de treino, matriz pública "o que funciona offline". (b) **É o melhor modelo de integração encontrado**: `GET …/order/table/{mesa}/getCheck` devolve itens, modificadores, taxa de serviço e pagamentos; `POST /o/op/1/pay` recebe valor, `tipAmount` separado, método configurado pelo restaurante (ex.: "TIPE_PIX") e referência idempotente; o resultado chega por webhook. A divisão por item com frações fica na Tipe e o PDV vê pagamentos parciais. Exige entrar no Partner Program (integração customizada não tem `orders-api`) [DOC]. É o contrato que a Tipe deve pedir aos PDVs brasileiros.

## 5. TouchBistro

**Módulos.** POS iPad, floor plan com seções por garçom, KDS (legado de mão única), reservas, Cloud reporting, add-ons sob cotação [DOC/MKT].

**Fluxos [TELA].** Abrir mesa: 2 (o tamanho do grupo já vem com a lotação da mesa). Item com modificador obrigatório: ~5 [INF], com o diálogo abrindo sozinho e item vermelho se incompleto. Dividir por assento: 2 [INF]. Fechar: "Imprimir recibo e fechar mesa" num toque. Ciclo simples: ~12 [INF].

**O que explica a eficiência.** **Lançamento por assento** (a divisão nasce no pedido), item "compartilhado" que se divide sozinho, valores padrão inteligentes, gestos (segurar para modificar, dois dedos para duplicar), modo canhoto, botões compostos [TELA].

**Limitações.** Suporte, instabilidade, atualizações em horário de pico, relatórios fora de sincronia com o iPad, implantação de meses, dependência de iPad e servidor Mac, KDS que não devolve status ao salão, sem API pública [terceiros/DOC].

**Para a Tipe.** (a) Pessoa como dona do item no lançamento do garçom, para o QR já chegar pré-dividido; botão composto "Receber e fechar"; KDS que devolve "pronto" ao salão. (b) Sem API: só referência de design.

## 6. SpotOn

**Módulos.** Duas linhas: RPOS (antiga) e Express (nova, com handheld, Table Maps, divisão por item e Hold & Fire em 2025–2026); KDS; Teamwork (escala, ponto, pools de gorjeta) com **DayCheck** (gorjeta aprovada pelo gerente liberada no fim do turno); QR com "Pay Later", "Exigir número da mesa" e "Fechar automaticamente quando pago" [TELA/DOC/MKT].

**Fluxos [TELA, contagens INF].** Send e Quick Send; transferir; fechar só com saldo zero; dividir por item, convidado ou forma de pagamento (~9 toques por convidado no RPOS); saída de turno do garçom (Clock Out) e End Day com bloqueio se houver conta ou ponto aberto.

**O que explica a eficiência.** Mesma tela no handheld e no terminal (Express); três sugestões de gorjeta com padrão neutro; ícone de "vários pagamentos" na mesa; **bloqueios que impedem fechar o dia sujo** [TELA].

**Limitações.** Custos escondidos, contrato de 2 anos, taxa para trocar de processador; pool só funciona com ponto marcado (sem ponto, US$ 0); ajuste de gorjeta no Express só por 10 minutos [terceiros/TELA].

**Para a Tipe.** (a) Fechamento do dia com checklist bloqueante; saída de turno do garçom com conferência; relatório diário por garçom; conferência do gerente antes de liberar o ciclo de saque (complementa o 70/30 e o saque quinzenal). (b) A lista de configuração do QR (pagar depois, exigir mesa, fechar ao quitar) e a separação entre taxa de serviço e gorjeta.

## 7. Nível 2 (diferenciais)

| Plataforma | O que importa para a Tipe |
|---|---|
| NCR Voyix Aloha | contingência com roteiro explícito (Go Offline com PIN, só comandas, Go Online); o pagamento na mesa do Aloha é feito pela **sunday**, prova de que PDVs grandes terceirizam essa camada [TELA/MKT] |
| Clover | API pública `POST /v1/orders/{id}/pay` com pagamentos parciais e gorjeta separada [DOC] |
| GoTab | comanda do **cliente**, não da mesa; pré-autorização e fechamento automático no fim do dia [TELA] (no Brasil, Pix não pré-autoriza) |
| Revel | limites de risco offline configuráveis pelo dono [DOC] |
| Shift4 SkyTab (Shift4 Dine desde 12/05/2026) | software barato subsidiado por adquirência [MKT] |
| PAR Brink | parceiros devem enfileirar e reenviar em ordem quando o PDV cai [DOC] |
| Oracle Simphony | servidor local que decide qual terminal é "dono" de cada conta [DOC] |
| Heartland (Genius) | "US$ 0" com contrato de 3 anos e volume mínimo [MKT] |

## 8. Contagem de toques comparada (meta Tipe)

| Fluxo | Melhor observado | Meta Tipe |
|---|---|---|
| Abrir mesa | 1 (Toast) | 1 |
| Item com modificador obrigatório | ~3 (Lightspeed) | ≤ 4 |
| Enviar | 1 (todos) | 1, com contagem no botão |
| Dividir | 2 (TouchBistro, se lançado por assento) | 0 no salão: o cliente divide no QR; 3 no caixa |
| Receber em dinheiro e fechar | 2 (Lightspeed) | 2 |

## 9. Achados que mudam a estratégia da Tipe

1. **O estado da cozinha no mapa do salão** (Toast) e o tempo da mesa (Lightspeed, TouchBistro) são o que torna o salão legível. A Tipe tem os dados (status por item no KDS) mas não os mostra no salão.
2. **Modificadores estruturados** são unanimidade e a maior lacuna da Tipe no PDV.
3. **Offline é argumento de venda** em todos os grandes, sempre com cartão offline limitado. Para a Tipe, offline = lançar e preparar; Pix e cartão online esperam a rede.
4. **Para a forma (b), o padrão é "ler a conta da mesa + postar pagamento como meio alternativo + webhook"** (Lightspeed, Clover, Toast). Square mostra o que acontece sem isso.
5. **Nenhum concorrente cobra por mesa, e todos ganham na adquirência.** A Tipe ganha na assinatura e nos 30% da gorjeta extra; não depende de taxa sobre a conta.
6. **As maiores reclamações são suporte, estabilidade em pico, contratos longos e custos escondidos.** São os diferenciais mais baratos para a Tipe comunicar.
