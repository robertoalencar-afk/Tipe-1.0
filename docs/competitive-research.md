# Pesquisa internacional: PDV, retaguarda e pagamento na mesa

Data da pesquisa: 13/10/2026. Fontes: documentação oficial, centrais de ajuda e comunicados das próprias empresas (lista ao final de cada bloco). Números de marketing estão marcados como **alegação** e não foram verificados de forma independente.

Legenda de evidência: **[doc]** documentação/ajuda oficial · **[mkt]** página comercial · **[imp]** imprensa · **[?]** não verificado.

---

## Grupo C — Pagamento na mesa (prioridade máxima)

### sunday
- **Jornada:** QR na mesa ou QR único impresso na conta → conta itemizada → divisão → gorjeta → pagamento → avaliação → recibo por e-mail. Sem app. [mkt]
- **Divisão:** por item, por assento, por número de pessoas (escolhe quantas partes paga) e valor livre. Quem não usa o sunday paga o restante pelo meio tradicional. [mkt]
- **Pagamento:** Apple Pay, Google Pay, Amex, Visa, Mastercard. [mkt]
- **Gorjeta:** opções pré-selecionadas; sugestão por IA. Alegação: gorjetas até 10% maiores. [mkt]
- **Avaliações:** convite para avaliar no Google após pagar; gerente é avisado de avaliação negativa. Alegação: até 5× mais avaliações. [mkt]
- **PDV:** NCR Voyix (Aloha), Micros, Clover, Toast, Lightspeed. Em 2024 a NCR Voyix lançou o "Aloha Pay-At-Table, powered by sunday". [mkt][imp]
- **Monetização:** por transação, tabela em página separada. [mkt]
- **Alegações:** 5.000+ restaurantes; ~35% dos usuários dividem a conta. [mkt]

### qlub
- **Jornada:** QR na mesa, pagamento no próprio celular. Produtos: Pay-at-Table, Order-and-Pay, cardápio digital, links de pagamento. [mkt]
- **Divisão e meios de pagamento:** não detalhados na página pública. [?]
- **PDV:** "integra com o seu PDV atual", sem lista pública. [mkt]
- **Monetização:** "até 1% de taxa a menos"; preço só sob demonstração. [mkt]
- **Mercados:** inclui **Brasil**, EUA, Austrália, Golfo e Ásia. ISO 27001. [mkt]
- **Alegações:** 3.000+ estabelecimentos; 20% mais gorjeta; 7× mais avaliações. [mkt]

### me&u
- **Produtos:** Order & Pay, Pay (só pagamento), Hybrid (garçom + cliente), multi-vendor, Crew (vendas assistidas), Loyalty, Connect CRM, reservas. [mkt]
- **PDV:** 70+ parceiros de PDV (Toast, Lightspeed, Oracle/Micros, Infor, NCR Aloha, Clover, Agilysys…). [mkt]
- **Monetização relevante para o TIPE:** **taxa de plataforma cobrada do cliente** na Austrália, por pedido, em faixas de A$ 0,20 a A$ 2,90 conforme o valor; o restaurante pode absorvê-la. [doc]
- **Fidelidade:** programa próprio e parceria Velocity (milhas). [mkt]

### GoTab
- **Posicionamento:** PDV completo para bares, cervejarias e food halls: QR ordering & payment, "roaming tabs", divisão de conta, KDS, PDV de mão, quiosques. [mkt]
- **Preço público:** US$ 15, 99 e 229/mês + taxas de processamento (opção custo + margem fixa). [mkt]
- **API pública:** não documentada publicamente. [?]

### Toast Pay (Scan to Pay)
- **Jornada:** QR impresso **na conta** (não na mesa); web sem app (App Clip no iOS). [doc]
- **Divisão:** apenas **igualitária**, se habilitada. **Não divide por item.** [doc]
- **Pagamento:** cartões, Apple Pay, Google Pay, gift cards, pontos de fidelidade, Toast Cash. [doc]
- **Baixa no PDV:** nativa; o garçom recebe aviso no início e no fechamento da divisão. [doc]
- **Custo:** sem mensalidade; taxa de cartão não presente. [doc]
- **Problema relatado por usuários:** clientes saem achando que pagaram tudo depois de pagar só a sua parte, e a mesa fica em aberto. [comunidade Toast]

### Soluções adicionais verificadas
| Solução | O que foi verificado | Fonte |
|---|---|---|
| **Zonal Order & Pay (Reino Unido)** | QR por mesa com "Pay My Bill"; pagar tudo, **dividir igualmente entre 2 e 99 pessoas com arredondamento automático**, ou valor livre; sem conta e sem app; recibo por e-mail | [doc] |
| **OrderPay (Reino Unido)** | QR na mesa; por item, conta inteira ou valor livre; link da conta atualizada para os outros da mesa | [mkt] |
| **Rooam (EUA)** | Conta itemizada em tempo real, gorjeta padrão de 20%, gestão de contestações para o estabelecimento, integração Toast/Lightspeed/Olo | [mkt] |
| **Payby (Brasil, Salvador)** | QR → conta → divisão por itens → cartão ou Pix; cobrança por transação abaixo da maquininha; 15–25% dos pagamentos dos restaurantes atendidos (alegação) | [imp, set/2024] |
| **Aloha Pay-At-Table (NCR Voyix + sunday)** | QR na mesa, conta itemizada, divisão, gorjeta sugerida, convite para avaliação no Google | [imp, mai/2024] |
| **Square Scan to Pay** | QR na conta impressa; divisão por item/assento/frações feita pela equipe no PDV | [doc] |

---

## Grupo A — PDVs

| Plataforma | Pagamento na mesa | API pública e escrita de pagamentos | Observações |
|---|---|---|---|
| **Toast** | Toast Pay (QR na conta, divisão só igual) | APIs de pedidos, cardápios, mão de obra. **Criar/atualizar pagamentos em cheques** só para integrações de **parceiro ou customizadas** (credenciamento). Webhooks não constam da página de visão geral | Ecossistema mais fechado; parceria obrigatória para baixa |
| **Square for Restaurants** | Scan to Pay (beta) | **API aberta** de Orders/Payments: `PayOrder` paga um pedido com **vários pagamentos** (split tender) com captura posterior; idempotency key obrigatória; soma tem que fechar o total | Melhor referência técnica para "vários pagadores, um pedido" |
| **NCR Aloha** | Aloha Pay-At-Table (sunday) | Portal de desenvolvedor com credenciamento | Parceria comercial |
| **Lightspeed Restaurant (K-Series)** | Integração com sunday e outros | API "Order and Pay" pública com **Get Open Check by Table**, **Apply a Payment** e webhooks de pedido e pagamento; ambiente de demonstração | Candidato mais viável para o 1º adaptador externo |
| **SpotOn** | QR Scan & Pay na conta impressa; Apple Pay, Google Pay, gift card, fidelidade; **fecha a conta sozinha quando quitada** | Sem documentação pública de API encontrada | |
| **TouchBistro** | PDV de mão na mesa; pagamento na mesa histórico via PayPal (2014) | Página de integrações sem API pública; parceiros contábeis (R365, MarginEdge, Xero…) | |

## Grupo B — Retaguarda

| Plataforma | O que interessa ao TIPE |
|---|---|
| **Restaurant365** | O PDV é a fonte de verdade; R365 lê um **Resumo Diário de Vendas** (vendas, meios de pagamento, descontos, impostos, depósitos, ponto) após o fechamento do dia e gera lançamentos contábeis; correção = corrigir no PDV e reprocessar o dia |
| **MarginEdge** | Notas de fornecedor, custo em tempo real, previsão por IA, pagamento de contas; US$ 350/mês por unidade. Não trata gorjeta nem conciliação de pagamentos do cliente |
| **Crunchtime** | Estoque, escala, execução operacional, KDS e BI para redes (850+ marcas). Não cita gestão de caixa/depósitos na página de plataforma |

**Conclusão para o TIPE:** não virar ERP. O que vale copiar da retaguarda é (1) um **fechamento diário exportável** com vendas, meios, taxa de serviço, gorjetas e estornos — o formato que R365/MarginEdge consomem — e (2) **pendências financeiras com trilha** de quem resolveu.

---

## Fontes
- sunday: https://sundayapp.com/sunday-split-checks-any-way-they-want/ · https://sundayapp.com/?p=40643
- NCR Voyix + sunday: https://www.businesswire.com/news/home/20240520546037/en/NCR-Voyix-Unveils-Aloha-Pay-At-Table-Powered-by-sunday-to-Simplify-the-Restaurant-Payments-Process
- qlub: https://qlub.io
- me&u: https://www.meandu.com · https://help.meandu.com/hc/en-us/articles/17561701058703-Understanding-the-me-u-platform-fee
- GoTab: https://gotab.com
- Toast Pay: https://support.toasttab.com/en/article/Get-Started-with-Toast-Pay · https://community.toasttab.com/t5/restaurant-operations/toast-pay-split-checks/m-p/9356
- Toast API: https://doc.toasttab.com/doc/devguide/apiOverview.html
- Square: https://developer.squareup.com/reference/square/orders-api/pay-order · https://squareup.com/help/article/8421-new-order-and-pay-capabilities-with-square-for-restaurants
- Lightspeed K-Series API: https://api-docs.lsk.lightspeed.app/
- SpotOn: https://spotonteam.atlassian.net/wiki/spaces/SK/pages/2457829381/QR+Scan+Pay+Order+Pay+SpotOn+Order
- TouchBistro: https://touchbistro.com/features/integrations · https://www.touchbistro.com/?p=25997
- Restaurant365: https://docs.restaurant365.com/docs/pos-integration-overview
- MarginEdge: https://restauranttechnologynews.com/2026/07/marginedge-improves-restaurant-profitability-with-real-time-cost-management-ai-forecasting-and-back-office-automation/
- Crunchtime: https://www.crunchtime.com/platform-overview
- Zonal: https://zonal.co.uk/subject/payments
- OrderPay: https://orderpay.com/blog/bill-splitting-pay-and-go/
- Rooam: https://pos.toasttab.com/integrations/rooam/
- Payby: https://bpmoney.com.br/bpm-escuta/payby-usa-tecnologia-para-solucionar-pepino-dos-restaurantes
- Pagar.me (eventos de webhook e status de cobrança): https://docs.pagar.me/reference/eventos-de-webhook-1 · https://docs.pagar.me/reference/cobran%C3%A7as-1

## Limitações da pesquisa
- Várias páginas comerciais não detalham divisão, meios de pagamento ou API (qlub, GoTab, me&u); esses pontos ficam como **não verificados**, não como ausentes.
- Não houve acesso a contas de demonstração ou ambientes autenticados de nenhum concorrente.
- A documentação da Square para "Scan to Pay" não pôde ser lida (a URL redireciona para a página inicial da ajuda).
