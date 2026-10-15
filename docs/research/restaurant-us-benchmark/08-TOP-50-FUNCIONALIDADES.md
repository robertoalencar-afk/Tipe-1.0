# 08 — Top 50 funcionalidades (priorização)

Data: 14/10/2026. Derivado de `04-MATRIZ-FUNCIONALIDADES-TIPE.md`, `07-ARQUITETURA-E-INTEGRACOES.md` e da auditoria.

## 1. Fórmula

Notas de 1 a 5 em cada critério (5 é sempre melhor; em facilidade, 5 = muito fácil).

| Critério | Coluna | Peso |
|---|---|---|
| Impacto no restaurante | Imp | 3 |
| Potencial de receita (assinatura, upgrade, gorjeta 30%) | Rec | 3 |
| Adequação ao Brasil | BR | 2 |
| Diferenciação competitiva | Dif | 2 |
| Impacto no consumidor | Cons | 1 |
| Economia operacional | Eco | 1 |
| Facilidade de implementação | Fac | 2 |

**Pontos = 3·Imp + 3·Rec + 2·BR + 2·Dif + 1·Cons + 1·Eco + 2·Fac** (máximo 70).

Pesos mantidos como no prompt. Não ajustei porque a ordem resultante já separa bem o que vende do que só sustenta; em vez disso, a **classe** (P0 a P3) corrige o que a pontuação não enxerga: itens de confiabilidade pontuam pouco em receita e diferenciação, mas sem eles o PDV não pode ser vendido. Por isso há P0 com pontuação menor que P1.

Classes: **P0** necessário para PDV e atendimento confiáveis · **P1** alto valor comercial · **P2** ERP e gestão avançada · **P3** futuro.

## 2. Ranking

| # | Funcionalidade | Módulo | Imp | Rec | BR | Dif | Cons | Eco | Fac | **Pontos** | Classe | Esforço | Dependências | Risco |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Integração PDV externo: Saipos | Integração | 4 | 5 | 5 | 5 | 4 | 4 | 2 | **59** | P1 | G | acesso à API/parceria | API não lida |
| 2 | Mapa: estados de pagamento QR no salão (pagando, pago) | Mesas | 4 | 4 | 4 | 5 | 4 | 3 | 4 | **57** | P0 | P | — | — |
| 3 | Integração PDV externo: Colibri | Integração | 4 | 5 | 5 | 5 | 4 | 4 | 1 | **57** | P1 | G | parceria comercial | sem API pública |
| 4 | Reaplicar ramo colibri: garçom no celular | Garçom | 5 | 4 | 5 | 3 | 3 | 4 | 3 | **56** | P0 | M | reaplicar sobre main | conflito com TIPE 2.0 |
| 5 | Mapa: cor por estado do pedido + tempo de mesa | Mesas | 5 | 3 | 4 | 4 | 3 | 4 | 4 | **55** | P0 | P | KDS em tempo real | — |
| 6 | NFC-e via parceiro | PDV | 5 | 5 | 5 | 2 | 3 | 3 | 2 | **54** | P1 | G | emissor + dados fiscais | regras estaduais, certificado |
| 7 | Comanda individual e nome da conta (entidade conta) | Mesas | 5 | 4 | 5 | 3 | 3 | 3 | 2 | **53** | P1 | G | migração bills | transição de chaves texto |
| 8 | Cartão de crédito na conta (QR) | Pagamento | 4 | 4 | 4 | 3 | 5 | 3 | 3 | **52** | P1 | M | Pagar.me 3DS | revogar regra de produto |
| 9 | Modificadores estruturados (obrigatório/opcional, mín/máx, preço) | PDV | 5 | 4 | 5 | 2 | 3 | 3 | 2 | **51** | P0 | M | migração | impacta conta, KDS, divisão e QR |
| 10 | Chamado do cliente (chamar garçom / pedir a conta) | Garçom | 3 | 3 | 4 | 4 | 5 | 3 | 4 | **50** | P1 | P | — | excesso de notificação |
| 11 | App do garçom em maquininha smart Android | Garçom | 4 | 4 | 5 | 3 | 2 | 3 | 2 | **49** | P1 | M | publicação na loja do adquirente | homologação |
| 12 | Notificações para a equipe (mesa paga, pediu a conta) | Garçom | 4 | 3 | 4 | 3 | 3 | 3 | 4 | **49** | P1 | P | — | — |
| 13 | Resumo diário por e-mail/WhatsApp (Lebre) | Relatórios | 3 | 4 | 4 | 4 | 1 | 3 | 4 | **49** | P1 | P | agendamento Lovable | custo de IA |
| 14 | Rateio da taxa de serviço / caixinha | Garçom | 3 | 4 | 5 | 4 | 1 | 3 | 3 | **49** | P1 | M | parecer jurídico | Lei 13.419 |
| 15 | KDS em tempo real (Realtime em pdv_order_items) | Cozinha | 5 | 2 | 3 | 2 | 3 | 4 | 5 | **48** | P0 | P | — | volume de eventos |
| 16 | Reaplicar ramo colibri: KDS por pedido + som | Cozinha | 4 | 3 | 4 | 2 | 3 | 4 | 4 | **48** | P0 | P | reaplicar sobre main | conflito de migrações 0019–0021 |
| 17 | Impressão de produção e pré-conta (agente local) | Cozinha | 5 | 4 | 5 | 1 | 2 | 3 | 2 | **48** | P0 | M | agente instalável | suporte a impressoras |
| 18 | Resumo diário imutável e exportação para ERP/contador | Financeiro | 4 | 3 | 4 | 3 | 1 | 4 | 4 | **48** | P1 | P | fechamento do dia | — |
| 19 | Reaplicar design system (redesign-premium) | Design | 4 | 3 | 3 | 4 | 4 | 2 | 3 | **47** | P0 | M | — | regressão visual |
| 20 | Alerta de atraso e cor por idade no KDS | Cozinha | 4 | 2 | 4 | 2 | 4 | 3 | 5 | **47** | P0 | P | KDS em tempo real | — |
| 21 | Caixa: esperado no servidor, por forma de pagamento | Financeiro | 5 | 2 | 4 | 2 | 1 | 4 | 4 | **46** | P0 | P | — | migração de cash_close |
| 22 | Idempotência do lançamento (client_order_id) | PDV | 5 | 2 | 3 | 1 | 2 | 4 | 5 | **45** | P0 | P | — | nenhum relevante |
| 23 | Fechamento do dia com checklist bloqueante | Financeiro | 4 | 2 | 4 | 3 | 1 | 4 | 4 | **45** | P0 | P | caixa no servidor | operação travar por pendência antiga |
| 24 | Papel gerente + aprovação por PIN | Admin | 4 | 3 | 4 | 3 | 1 | 3 | 3 | **45** | P0 | M | migração | — |
| 25 | Dashboard com vendas de hoje e alertas | Relatórios | 4 | 3 | 3 | 3 | 1 | 3 | 4 | **45** | P1 | P | — | — |
| 26 | Desconto e acréscimo com motivo e permissão | PDV | 4 | 3 | 4 | 1 | 2 | 3 | 4 | **44** | P0 | P | PIN de gerente | fraude interna sem auditoria |
| 27 | Módulos por plano | Admin | 2 | 5 | 3 | 3 | 1 | 2 | 4 | **44** | P1 | P | — | — |
| 28 | Modo offline: lançar e KDS | PDV | 4 | 3 | 4 | 4 | 2 | 3 | 1 | **44** | P2 | G | idempotência | conflitos de sincronização |
| 29 | Relatórios: período livre, hora, categoria, garçom | Relatórios | 4 | 3 | 3 | 2 | 1 | 3 | 4 | **43** | P1 | P | — | — |
| 30 | Entrada de aparelho por código e perfil de aparelho | Admin | 3 | 3 | 3 | 3 | 1 | 3 | 4 | **42** | P1 | P | — | — |
| 31 | Multiunidade (grupo, comparação, cardápio central) | ERP | 3 | 5 | 3 | 3 | 1 | 3 | 1 | **42** | P3 | G | RLS de grupo | — |
| 32 | Ficha técnica e baixa teórica | Estoque | 3 | 4 | 4 | 2 | 1 | 3 | 2 | **41** | P2 | M | modificadores | cadastro trabalhoso |
| 33 | Conciliação Pix/cartão com repasses Pagar.me | Financeiro | 3 | 3 | 4 | 3 | 1 | 4 | 2 | **41** | P2 | M | API de recebíveis | endpoint não verificado |
| 34 | Integração iFood | PDV | 3 | 4 | 5 | 1 | 3 | 3 | 1 | **41** | P2 | G | credenciamento iFood | manutenção |
| 35 | TEF / maquininha integrada | PDV | 3 | 3 | 5 | 2 | 3 | 4 | 1 | **41** | P2 | G | adquirentes | homologação |
| 36 | Desfazer (3 s) e recall no KDS | Cozinha | 4 | 1 | 3 | 2 | 2 | 3 | 5 | **40** | P0 | P | — | — |
| 37 | Planta do salão (posição, área, lotação) | Mesas | 3 | 3 | 3 | 3 | 2 | 2 | 3 | **40** | P1 | M | migração | — |
| 38 | Captura de contato com consentimento (CRM) | CRM | 2 | 4 | 3 | 3 | 2 | 2 | 3 | **40** | P2 | M | LGPD | — |
| 39 | Juntar mesas e transferir itens | Mesas | 3 | 2 | 4 | 2 | 3 | 3 | 3 | **39** | P1 | M | entidade conta | — |
| 40 | Combos | PDV | 3 | 3 | 4 | 1 | 3 | 2 | 3 | **39** | P2 | M | modificadores | — |
| 41 | Estorno pelo painel | Financeiro | 3 | 2 | 3 | 2 | 3 | 3 | 3 | **37** | P1 | M | Pagar.me | — |
| 42 | Adaptador Lightspeed K-Series (prova do contrato) | Integração | 2 | 3 | 1 | 4 | 3 | 3 | 3 | **37** | P2 | M | Partner Program | baixa base no Brasil |
| 43 | Cashback em crédito na assinatura | CRM | 2 | 3 | 3 | 4 | 3 | 1 | 2 | **37** | P3 | M | modelo financeiro | regulatório |
| 44 | Estações configuráveis e roteamento | Cozinha | 3 | 2 | 3 | 2 | 2 | 3 | 3 | **36** | P2 | M | — | — |
| 45 | All day (total por item) no KDS | Cozinha | 3 | 1 | 3 | 2 | 1 | 3 | 5 | **36** | P2 | P | — | — |
| 46 | Contagem de estoque e CMV | Estoque | 3 | 3 | 3 | 2 | 1 | 3 | 1 | **34** | P2 | G | ficha técnica | — |
| 47 | Fornecedores e pedido de compra (XML NF-e) | ERP | 2 | 3 | 3 | 1 | 1 | 3 | 2 | **31** | P3 | G | estoque | — |
| 48 | Cursos e segurar/disparar | Cozinha | 2 | 2 | 2 | 2 | 2 | 2 | 3 | **30** | P2 | M | modificadores | complexidade de treino |
| 49 | Escala e ponto | ERP | 2 | 2 | 3 | 1 | 1 | 2 | 1 | **25** | P3 | G | — | parceiro faz melhor |
| 50 | Expediter | Cozinha | 2 | 1 | 2 | 1 | 2 | 2 | 3 | **25** | P3 | M | KDS por pedido | — |

## 3. Leitura

1. **As duas integrações brasileiras (Saipos, Colibri) lideram a pontuação** porque destravam a forma de venda (b) inteira, mas dependem de acesso comercial que a Tipe não controla e são esforço G. Por isso ficam como P1 e entram no plano como **descoberta comercial**, não como desenvolvimento imediato.
2. **Os estados de pagamento QR no salão** (nº 2) são o item de melhor relação valor/esforço: só a Tipe tem esse dado, ele já existe no banco e nenhum PDV americano mostra "pagando pelo QR" no mapa.
3. **Reaplicar o ramo `colibri`** (garçom no celular, KDS por pedido) pontua alto e custa pouco porque o código já existe.
4. **NFC-e e comanda individual** são o preço de entrada para o Tipe completo no Brasil.
5. **Cartão de crédito na conta (nº 8) conflita com uma regra vigente** do projeto (`AGENTS.md`: "Do not offer direct card entry on the bill"). Fica registrado como recomendação condicionada a revogar essa regra; não entra no plano de 90 dias sem decisão do dono.
6. **Rateio da taxa de serviço (nº 14)** depende de parecer sobre a Lei 13.419/2017; a gorjeta extra 70/30 segue como está (ver `04b-REALIDADE-BRASIL.md` §3).
