# Checagem de realidade: o que o restaurante brasileiro já tem e espera de um PDV

Data de consulta de todas as fontes: 2026-10-14. Etiquetas: [TELA] artigo de ajuda com passos/telas concretos; [DOC] documentação oficial sem tela; [MKT] marketing; [INF] inferência (origem indicada). Nenhuma página com login foi acessada.

## 1. Mapa dos PDVs brasileiros

| PDV | Módulos principais | Público | Preço público | Integrações (iFood, maquininha/TEF, NFC-e, Pix) | API / parceiros | Diferencial |
|---|---|---|---|---|---|---|
| **Saipos** | Frente de caixa, App Garçom, comanda digital, KDS, cardápio digital, roteirização de entrega, bot WhatsApp, CRM, fluxo de caixa, DRE, estoque com ficha técnica e importação de nota [MKT] | Restaurantes, delivery, bares, pizzarias e mais 15 segmentos; faixas de faturamento de "Estou abrindo" a "Acima de 120 mil" e multilojas [MKT] | "A partir de R$ 240,79/mês" (consultado 2026-10-14); tabela completa não pública [MKT] | "Super Integradora iFood", Rappi, 99Food, Aiqfome [MKT]. Smart POS integrado com Stone, PagSeguro, Rede, iFood Pago, Cielo, GetNet; garçom lança na mesa pela maquininha, Pix por QR na máquina, pedido vai ao KDS [MKT]. Página de TEF existe, sem detalhe [MKT]. NFC-e A1 transmitida em tempo real à SEFAZ [MKT] | FAQ afirma "API pública permite integrar outros sistemas e plataformas de pedidos" [MKT]. Order API documentada em readme.io (link no rodapé "Seja um parceiro Saipos") [DOC, conteúdo não lido: robots bloqueou]. Programa de revenda Ouro/Diamante [MKT] | Foco forte em delivery + salão, nuvem, usuários ilimitados, implantação feita pela Saipos [MKT] |
| **Colibri** (RS Solutions, ex-NCR) | Colibri POS (Windows, hub on/offline, fiscal, estoque, caixa), Colibri Fácil (PDV nuvem), Colibri Ped+ (pedido e pagamento no celular, tablet ou smart POS, offline), Totem, Tablet, Menu, Self Checkout, KDS, painel de senha, Gestão, Hub de delivery [MKT] | Bares, restaurantes, lanchonetes, franquias e redes; ~15 mil clientes, ~100 revendas (mar/2026) [MKT, imprensa] | Não publicado [MKT] | Hub com iFood, Rappi, Uber Eats, 99 [MKT]. TEF, NFC-e, SAT, Pix: não citados na página pública, mas o POS "faz emissão fiscal" [MKT]. Colibri Pay (adquirência) em testes, ~R$ 50 mi transacionados [imprensa] | Sem API pública divulgada. Portal de "parceiros de solução" com login e programa de revenda [MKT]. A Goomer documenta integração com "NCR Colibri" só para "chamar garçom", via URL local `IP do servidor:8081/chamadas` [TELA] | Operação offline, 35+ anos, estratégia declarada de virar "Square brasileira" (software + hardware + adquirência + fidelidade do garçom) [imprensa] |
| **Consumer** | PDV, mesas e comandas, caixa, financeiro, relatórios, Comanda Mobile (celular, tablet, maquininha), delivery próprio sem taxa, bot WhatsApp, KDS, estoque/ficha técnica, entregadores, cardápio QR, totem, cashback/fidelidade, app de relatórios [MKT] | Pequenos e médios: restaurantes, bares, lanchonetes, pizzarias, açaí, mercadinhos; também redes [MKT] | PDV grátis "que não expira" até 200 pedidos/mês; bot grátis até 30 pedidos/mês; acima disso cobrança por módulos, valores em loja.consumer.com.br (não lidos) [MKT, 2026-10-14] | iFood (diz ser a maior integradora), 99Food, Keeta [MKT]. Maquininhas Stone, Cielo, iFood; "TEF" com crédito, débito e vouchers numa só maquininha [MKT]. NFC-e e NF-e ilimitadas em todos os estados; versão não fiscal para MEI [MKT]. Pix citado só no totem [MKT] | Sem API pública citada. Programa de parcerias é comercial (20% recorrente + R$ 400 por cadastro de cardápio), não técnico [MKT] | Freemium, offline, migração e cadastro de cardápio incluídos, roda no hardware que o cliente já tem [MKT] |
| **Goomer** | Cardápio digital delivery (WhatsApp), cardápio em tablet, QR na mesa, totem, painel de gestão (tempo de permanência na mesa etc.) [MKT] | Restaurantes de todos os portes, até franquias [MKT] | Não publicado; existe "Plano Grátis Delivery" [MKT] | Entrega via iFood (sem motoboy próprio), Pix, NuPay; integra pedidos com PDVs e KDS [MKT]. Integração "chamar garçom" com AutomaSoft, Caixa Rápido, Líder Automação, PanteraFood e Colibri [TELA] | Sem API pública divulgada; programa de parcerias comercial [MKT] | Não é PDV: é camada de autoatendimento que se pluga em PDVs existentes. É o modelo mais próximo da oferta (b) da Tipe [INF, das páginas de ajuda] |
| **TOTVS Linx (Degust / TOTVS Food Service)** | Degust PDV (Windows, legado de redes e franquias); TOTVS Food Service: PDV nuvem "mobile first" (smartphone, tablet, PC, smart POS), produção, KDS, cardápio digital, promoções, faturamento, compras, estoque, financeiro, painel do contador [imprensa 2023] | Redes e franquias (Degust); 13 segmentos de pequeno porte (Food Service) [imprensa] | Assinatura, valores não publicados [imprensa] | iFood no Degust: integração por arquivos em pastas `C:\TEMP\REC` e `RESP` via "Gerenciador Call-Center" e IConnect, com de/para de códigos feito pelo iFood [TELA, manual Linx v1.5]. Techfin TOTVS (pagamentos, antecipação) [imprensa] | Sem API pública localizada nesta rodada [não verificado] | Força em grandes redes; IA no delivery apresentada na ABF 2026 [imprensa] |

Leitura geral [INF, a partir da tabela]: todos prometem salão + delivery + fiscal + estoque; quase nenhum publica preço completo; só a Saipos publica documentação de API (Order API, orientada a receber pedidos de canais externos). Ninguém documenta publicamente uma API para "consultar conta da mesa e registrar pagamento", que é o que a Tipe precisa no modelo (b).

## 2. O que é obrigatório para ser levado a sério no Brasil

| Item | Situação em 2026 | Implicação para a Tipe |
|---|---|---|
| **NFC-e (modelo 65)** | Obrigatória para venda a consumidor final. Todos os PDVs da tabela anunciam [MKT] | Tipe completo precisa emitir NFC-e por mesa/conta, inclusive em conta dividida [INF] |
| **SAT-CF-e (SP)** | Encerrado: uso do SAT terminou em 31/12/2025; NFC-e obrigatória desde 01/01/2026 (Portaria SRE 79/2024, que alterou a Portaria CAT 147/2012); novas ativações bloqueadas desde nov/2024 [DOC, CRC-SP] | Não construir SAT. Só NFC-e [INF] |
| **MFE / CF-e (CE)** | Novas ativações bloqueadas desde 01/11/2025; fim do suporte e emissão a pessoa física exclusivamente por NFC-e desde 01/01/2026 (Decreto 36.417/2025), sem escalonamento [imprensa contábil] | Idem: não construir MFE [INF] |
| **Emissão via parceiro** | Focus NFe: plano Retail (NFC-e) R$ 62,90/mês com 500 NFC-e + 100 NF-e, Growth R$ 572/mês com CNPJs ilimitados, Retail+ R$ 657,90/mês com 9.000 NFC-e (2026-10-14) [MKT]. NFE.io tem guia de integração de NFC-e na documentação [DOC]. PlugNotas e eNotas: não verificados nesta rodada | Caminho realista para o MVP fiscal; custo marginal ~R$ 0,06 por NFC-e [INF, da tabela Focus] |
| **TEF e maquininha** | Esperado. Saipos e Consumer integram Stone, Cielo, Rede, PagSeguro, GetNet, iFood Pago [MKT] | Restaurante já tem maquininha e contrato com adquirente; Tipe precisa conviver com ela [INF] |
| **Smart POS Android como PDV de garçom** | Padrão de mercado: Saipos (Stone, TecToy P2), Colibri Ped+, Consumer Comanda Mobile, TOTVS Food Service [MKT] | A "área do garçom" da Tipe deveria rodar em smart POS, não só em celular [INF] |
| **Pix** | Pix QR na maquininha (Saipos) [MKT]. Pix por aproximação: BC retirou o limite de R$ 500 por transação a partir de 01/10/2026; funciona em maquininha com Android + carteira, sem iPhone [imprensa, 20/06/2026] | Pix dinâmico por conta/mesa é o diferencial natural da Tipe; precisa conciliar com o caixa [INF] |
| **iFood** | Todos integram; "maior integradora iFood" é argumento de venda de Saipos e Consumer [MKT]. API iFood para parceiros não verificada nesta rodada | Tipe completo sem iFood perde o restaurante que faz delivery [INF] |
| **Impressão de comanda/produção** | Degust configura "departamento de impressão" e impressora de pedidos [TELA]; TOTVS cita integração com impressora [imprensa]; PanteraFood/AutomaSoft imprimem até chamada de garçom [TELA] | Impressora térmica por setor (cozinha, bar) continua obrigatória mesmo com KDS [INF] |
| **Taxa de serviço 10% e Lei 13.419/2017** | Gorjeta inclui o valor cobrado como serviço; não é receita da empresa; rateio por convenção/acordo coletivo ou assembleia; retenção de até 20% (regime diferenciado/Simples) ou 33% (demais) para encargos, só com previsão coletiva; deve constar na nota de consumo; CTPS registra média de 12 meses; comissão de empregados acima de 60 funcionários [DOC, texto da lei] | O split "70% garçom / 30% Tipe" precisa ser revisto juridicamente: se a gorjeta é do trabalhador, a Tipe não pode ficar com parte dela como receita sem enquadramento claro [INF, a partir do §4º; recomenda-se parecer] |
| **Couvert, comanda individual por cartão/ficha, mesa/comanda numerada** | Comanda/mesa é núcleo de Saipos, Consumer, Colibri [MKT]; Colibri cita "comanda" no self checkout [MKT]. Couvert e cartão-comanda de bar: não verificados nas páginas lidas | Modelo de dados deve aceitar consumo por comanda individual (bar) além de por mesa [INF, prática de mercado] |
| **Vale-refeição (VR, Alelo, Pluxee/Sodexo, Ticket)** | Consumer: "vouchers" na maquininha via TEF [MKT]. Demais: não verificado | Aceite de VR acontece na maquininha; a Tipe online provavelmente não captura VR no MVP [INF] |

## 3. O que redesenhar em relação aos PDVs americanos

1. **Gorjeta na tela vs taxa de serviço.** Nos EUA, o cliente escolhe % no terminal. Aqui o padrão é 10% sugerido na conta, com regra legal de rateio e retenção. A tela deve mostrar "taxa de serviço (opcional) 10%" editável, e o backoffice precisa de rateio configurável por convenção [INF, Lei 13.419].
2. **Tip pooling vs rateio da taxa.** Em vez de pools por turno e cargo, o rateio segue convenção coletiva, com retenção de 20%/33% e registro em folha. Relatório de rateio é funcionalidade, não detalhe [INF].
3. **Handheld vs maquininha smart.** O "Toast Go" brasileiro é a maquininha Android do adquirente que o restaurante já tem. Integrar em Stone, Cielo, Rede, PagSeguro, GetNet vale mais que hardware próprio [INF, da tabela].
4. **Fiscal.** Não há equivalente nos EUA. Cada fechamento gera NFC-e, com taxa de serviço destacada na nota de consumo [DOC, lei; INF].
5. **Delivery.** Nos EUA há vários marketplaces e canais próprios; aqui o iFood domina e a integração com ele é argumento de venda principal [MKT Saipos/Consumer].
6. **Offline.** Colibri, Consumer e Ped+ vendem operação offline como diferencial [MKT]. Conexão instável em salão exige modo offline no app do garçom [INF].
7. **Preço.** Freemium (Consumer) e "a partir de" (Saipos) são referência; a cobrança por mesa da Tipe precisa ser comparada a ~R$ 240/mês [INF].

## 4. PDVs com API ou parceria documentada

| PDV | O que existe | Link | Etiqueta |
|---|---|---|---|
| Saipos | Order API (readme.io), afirmação de "API pública" na FAQ, revenda Ouro/Diamante | https://saipos-docs-order-api.readme.io/reference/introdu%C3%A7%C3%A3o · https://saipos.com/revenda-de-software | [DOC] não lido (robots), [MKT] |
| Colibri | Portal de parceiros de solução (login) e revenda; integração de terceiros vista via Goomer (chamar garçom) | https://parceiros.colibri.com.br/login · https://www.colibri.com.br/revenda | [MKT], [TELA] (Goomer) |
| Consumer | Só parceria comercial (indicação) | https://consumer.com.br/programa-de-parcerias-oficiais | [MKT] |
| Goomer | Parceria comercial; integrações com PDVs documentadas na ajuda | https://goomer.com.br/parcerias · https://ajuda.goomer.com.br/goomergo/painel/solucao-em-tablet/configuracoes-do-tablet/atendimento/outros-sistemas-de-gestao | [MKT], [TELA] |
| Linx Degust | Manual de integração iFood por arquivos (não é API aberta) | https://share.linx.com.br/download/attachments/13711950/INTEGRA%C3%87%C3%83O%20IFOOD%201.5.pdf?api=v2 | [TELA] |

Conclusão [INF]: para o modelo (b), Saipos é o primeiro alvo com documentação pública; Colibri exige parceria comercial; Linx/Degust é integração por projeto. A Goomer prova que uma camada de mesa se pluga em vários PDVs regionais.

## Fontes

- Saipos · integrações · https://saipos.com/integracoes · 2026-10-14 · [MKT]
- Saipos · home e FAQ · https://saipos.com · 2026-10-14 · [MKT]
- Saipos · planos e preços · https://saipos.com/planos-e-precos · 2026-10-14 · [MKT]
- Saipos · Smart POS · https://saipos.com/gestao/gestao-financeira/smart-pos · 2026-10-14 · [MKT]
- Saipos · revenda · https://saipos.com/revenda-de-software · 2026-10-14 · [MKT]
- Fidelimax · integração Saipos · https://docs.fidelimax.com.br/integracoes-nativas/saipos · 2026-10-14 · [DOC]
- Colibri · home · https://www.colibri.com.br · 2026-10-14 · [MKT]
- Colibri · soluções · https://www.colibri.com.br/solucoes · 2026-10-14 · [MKT]
- Startups.com.br · Colibri quer ser a Square brasileira (02/03/2026) · https://startups.com.br/negocios/em-nova-fase-colibri-quer-se-tornar-a-square-brasileira/ · 2026-10-14 · [imprensa]
- Consumer · home · https://consumer.com.br/ · 2026-10-14 · [MKT]
- Consumer · parcerias · https://consumer.com.br/programa-de-parcerias-oficiais · 2026-10-14 · [MKT]
- Goomer · home · https://www.goomer.com.br · 2026-10-14 · [MKT]
- Goomer ajuda · NCR Colibri · https://ajuda.goomer.com.br/goomergo/painel/solucao-em-tablet/configuracoes-do-tablet/atendimento/ncr-colibri · 2026-10-14 · [TELA]
- Goomer ajuda · outros sistemas de gestão · https://ajuda.goomer.com.br/goomergo/painel/solucao-em-tablet/configuracoes-do-tablet/atendimento/outros-sistemas-de-gestao · 2026-10-14 · [TELA]
- Linx · manual Integração iFood 1.5 (Degust) · https://share.linx.com.br/download/attachments/13711950/INTEGRA%C3%87%C3%83O%20IFOOD%201.5.pdf?api=v2 · 2026-10-14 · [TELA]
- Mercado&Consumo · TOTVS Food Service (31/10/2023) · https://mercadoeconsumo.com.br/31/10/2023/foodservice/totvs-oferece-sistema-focado-na-digitalizacao-de-pdvs-do-foodservice/ · 2026-10-14 · [imprensa]
- Portal do Franchising · TOTVS Linx na ABF 2026 (24/06/2026) · https://www.portaldofranchising.com.br/noticias/totvs-linx-abf-franchising-expo-2026/ · 2026-10-14 · [imprensa]
- CRC-SP · fim do SAT (13/11/2025) · https://online.crcsp.org.br/portal/noticias/noticia.asp?c=10087 · 2026-10-14 · [DOC]
- Contábeis · Ceará encerra MFE (24/10/2025) · https://www.contabeis.com.br/noticias/73536/ceara-encerra-mfe-e-cf-e-migracao-para-nfc-e-comeca-em-2026/ · 2026-10-14 · [imprensa]
- Nota Gateway · migração MFE CE · https://notagateway.com.br/blog/ceara-inicia-migracao-do-mfe-cf-e-para-a-nfc-e-a-partir-de-2026/ · 2026-10-14 · [imprensa]
- Contábeis · texto da Lei 13.419/2017 · https://www.contabeis.com.br/legislacao/1758560/lei-13419-2017/ · 2026-10-14 · [DOC]
- DGABC · BC retira limite do Pix por aproximação (20/06/2026) · https://www.dgabc.com.br/Noticia/4330340/banco-central-retira-limite-de-r%24-500-para-pix-por-aproximacao · 2026-10-14 · [imprensa]
- Focus NFe · preços · https://focusnfe.com.br/precos/ · 2026-10-14 · [MKT]
- NFE.io · documentação · https://nfe.io/docs/ · 2026-10-14 · [DOC]

## Impedimentos

- Saipos Order API (readme.io): WebFetch bloqueado por robots.txt; conteúdo da API não lido. Escopo (pedidos de mesa? pagamentos?) não verificado.
- Preços completos de Saipos, Consumer (loja.consumer.com.br), Colibri, Goomer e TOTVS não são públicos ou não foram lidos.
- Páginas de TEF da Saipos e NFC-e de Colibri/Goomer não detalham fornecedor TEF (ex.: SiTef, PayGo).
- PlugNotas, eNotas, API do iFood para parceiros, couvert e cartão-comanda de bar: não verificados nesta rodada.
- WebSearch retorna resultados enviesados para os EUA; várias buscas em português trouxeram resultados irrelevantes.
- Texto oficial do Decreto CE 36.417/2025 e da Portaria SRE 79/2024 não lido diretamente (só via CRC-SP e portais contábeis).
