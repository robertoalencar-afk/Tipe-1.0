# 04b — Checagem de realidade brasileira

Data: 14/10/2026. Detalhe, fontes e impedimentos em `notas/brasil.md`. Os concorrentes de pagamento na mesa (qlub, Payby) estão no benchmark anterior (`docs/competitive-research.md`).

## 1. O que o restaurante brasileiro já tem

Saipos, Colibri, Consumer e TOTVS (Degust e Food Service) vendem o mesmo pacote: salão com mesa e comanda, garçom lançando pela **maquininha smart Android** ou celular, KDS e impressão por setor, caixa, NFC-e, estoque com ficha técnica, iFood integrado e, cada vez mais, cardápio QR e totem [MKT]. A Goomer não é PDV: é uma camada de autoatendimento que se pluga em vários PDVs (por exemplo, "chamar garçom" no Colibri) [TELA, ajuda Goomer]. É o modelo mais parecido com a forma de venda (b) da Tipe.

Preço público é raro: a Saipos mostra "a partir de R$ 240,79/mês" e o Consumer é gratuito até 200 pedidos/mês [MKT, 14/10/2026]. A assinatura por mesa da Tipe será comparada a essa faixa.

## 2. Obrigatório para ser levado a sério

| Requisito | Situação em 2026 | O que a Tipe precisa |
|---|---|---|
| NFC-e | obrigatória na venda ao consumidor | emissão por API de parceiro (Focus NFe a partir de R$ 62,90/mês com 500 notas; NFE.io documenta NFC-e) [MKT/DOC] |
| SAT (SP) e MFE (CE) | **encerrados**: SP desde 01/01/2026 (Portaria SRE 79/2024), CE desde 01/01/2026 (Decreto 36.417/2025) [DOC] | não construir; só NFC-e |
| TEF e maquininha | todo restaurante já tem contrato com adquirente (Stone, Cielo, Rede, PagBank, Getnet, iFood Pago) | conviver com a maquininha; integrar depois |
| Smart POS como app do garçom | padrão de mercado (Saipos, Colibri Ped+, Consumer) | a área do garçom precisa rodar bem em tela pequena Android de maquininha, não só em celular |
| Pix | Pix QR na maquininha; Pix por aproximação sem limite de R$ 500 desde 01/10/2026 [imprensa] | Pix dinâmico por conta é o ponto forte da Tipe; conciliar com o caixa |
| iFood | todos integram; é argumento de venda principal | para o Tipe completo, fase posterior; sem isso a Tipe perde casas que fazem delivery |
| Impressão por setor | continua obrigatória mesmo com KDS | agente local de impressão (ver `07-ARQUITETURA-E-INTEGRACOES.md` §3.3) |
| Taxa de serviço de 10% | gorjeta pela Lei 13.419/2017: não é receita da empresa, rateio por convenção coletiva, retenção de 20% ou 33% para encargos, destacada na nota | rateio configurável e relatório; a Tipe já tem taxa definida pelo restaurante e removível com motivo |
| Comanda individual (bar) e mesa numerada | núcleo dos PDVs brasileiros | o modelo de dados precisa aceitar consumo por comanda, não só por mesa (lacuna da auditoria) |
| Vale-refeição | aceito na maquininha | fora do escopo online no início |
| Offline | Colibri e Consumer vendem como diferencial | fila local no garçom e no KDS |

## 3. Conflito com uma decisão vigente (apontado, não contornado)

A decisão confirmada é **gorjeta extra digital 70% garçom / 30% Tipe**. Ela vale para a gorjeta **extra**, opcional, paga depois da conta, e não para a taxa de serviço de 10%, que a Tipe repassa integralmente ao restaurante. Mesmo assim, a Lei 13.419/2017 define gorjeta como "a importância espontaneamente dada pelo cliente ao empregado" e diz que ela não é receita do empregador. Reter 30% como receita da Tipe pode ser questionado. O benchmark anterior já recomendou mostrar os 30% como **taxa da plataforma em linha separada** e pedir parecer. Esta missão mantém a decisão em todas as recomendações e reforça que o parecer jurídico vem antes de escalar a gorjeta digital.

## 4. Funcionalidades americanas que precisam ser redesenhadas

| Nos EUA | No Brasil |
|---|---|
| Gorjeta em % escolhida no terminal (15/20/25%) | taxa de serviço de 10% na conta, removível; gorjeta extra é exceção |
| Tip pooling por horas e cargo | rateio da taxa de serviço por convenção coletiva, com retenção legal e reflexo em folha |
| Handheld próprio (Toast Go, US$ 599) | maquininha smart do adquirente que o restaurante já tem, ou o celular do garçom |
| Comanda aberta com cartão pré-autorizado (GoTab, Brink) | Pix não tem pré-autorização; a garantia vem da comanda numerada e do controle de saída |
| Sem documento fiscal no PDV | NFC-e em cada fechamento, inclusive em conta dividida |
| Vários marketplaces de delivery | iFood domina |
| Assento como unidade de lançamento | pouco usado; a divisão por item com frações da Tipe resolve melhor |

## 5. Integração para a forma de venda (b)

Nenhum PDV brasileiro mapeado documenta publicamente uma API para **ler a conta da mesa e registrar pagamento**, que é o que a Tipe precisa. A Saipos tem uma Order API pública (conteúdo não lido, bloqueado por robots), o Colibri exige parceria (portal com login), o Consumer só tem parceria comercial e a Linx integra por troca de arquivos. A ordem sugerida: **Saipos** (documentação pública), depois **Colibri** (maior base em bares e restaurantes, parceria comercial), usando o contrato de adaptador que a Tipe já tem.
