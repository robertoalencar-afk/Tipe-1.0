# 04 — Matriz de funcionalidades por módulo

Data: 14/10/2026. A realidade brasileira está em `04b-REALIDADE-BRASIL.md`.

Legenda:
- **Nível:** I = indispensável · A = avançada · E = pode esperar.
- **Estado Tipe:** a classe da auditoria (`01-AUDITORIA-TIPE.md`): F = funcional · P = parcial · V = protótipo visual · N = não implementada · R = em ramo (código fora do `main`).
- **Esforço:** P/M/G.
- **Ext.:** depende de serviço externo?
- **Arq.:** exige mudança de arquitetura (nova entidade, migração estrutural ou mudança de modelo)?

Fontes abreviadas: TT = Toast, SQ = Square, LS = Lightspeed, TB = TouchBistro, SO = SpotOn, R365 = Restaurant365, ME = MarginEdge, MM = MarketMan, 7S = 7shifts. Referências completas nas notas.

## 1. PDV

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Tela de venda com busca, categorias, mais vendidos | LS Register, botão "Enviar · n itens" [TELA] | I | F | P | não | não |
| Modificadores (obrigatório, opcional visível, oculto; mín/máx) | TT três níveis [DOC]; SQ Sem/Extra [TELA] | I | N | M | não | sim |
| Duplicar item com mesmas escolhas | LS "Duplicate" [TELA] | A | N | P | não | não |
| Combos | SQ/TT (modificador-item) [DOC] | A | N | M | não | sim |
| Desconto e acréscimo com motivo e permissão | SQ comp/void com motivo [TELA] | I | N | M | não | sim |
| Taxa de serviço configurável e removível | LS order profile [DOC] | I | F | — | não | não |
| Cancelamento de item com motivo e permissão | SQ void 6 toques [TELA] | I | F | — | não | não |
| Cancelamento da venda inteira | TT "Void order" [TELA] | I | P | P | não | não |
| Idempotência do lançamento (duplo toque) | PAR fila com reenvio [DOC] | I | N | P | não | sim (pequena) |
| Caixa: esperado no servidor por forma de pagamento, X e Z | SO End Day com bloqueios [TELA]; Altametrics caixa [MKT] | I | P | P | não | não |
| Fechamento do dia com checklist bloqueante | SO End Day [TELA] | I | P | P | não | não |
| Estorno pelo painel | SQ/TT [DOC] | A | P | M | Pagar.me | não |
| NFC-e por conta, inclusive dividida | Saipos/Consumer [MKT] | I (Brasil) | N | G | emissor (Focus NFe/NFE.io) | sim |
| Impressão de produção e pré-conta | Degust por setor [TELA] | I (Brasil) | N | M | agente local | sim |
| TEF / maquininha integrada | Saipos smart POS [MKT] | A | N | G | adquirentes | sim |
| Modo de treino que não suja relatórios | LS [DOC] | A | P (`/simulador` isolado) | P | não | não |
| Offline (lançar e preparar sem rede) | LS por cenário [DOC]; Aloha [TELA] | A | N | G | não | sim |

**Melhor solução e por quê.** O Register da Lightspeed é a melhor referência de PDV de mesa: um item com modificador em ~3 toques porque o pop-up abre sozinho e oferece "Duplicar" e "Adicionar outro", e o botão de envio mostra quantos itens faltam mandar. A Toast completa com modificadores em três níveis, que impedem o erro mais caro (item sem ponto da carne na cozinha) sem atrasar o caso comum. O caixa de referência é o da SpotOn, que **não deixa fechar o dia** com conta ou ponto aberto.

## 2. Gestão de mesas

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Planta do salão (posição, forma, área) | TT service areas [DOC]; SQ floor plan [TELA] | I | P (grade) | M | não | sim (colunas) |
| Cor por estado do pedido (retido, enviado, pronto) | TT [DOC] | I | N | P | não | não |
| Estados de pagamento (pagando pelo QR, pago, aguardando caixa) | sunday/Tipe | I | F | — | não | não |
| Tempo de mesa aberta com alerta | LS faixa vermelha [TELA] | I | N | P | não | não |
| Pessoas na mesa (lotação padrão) | TB [TELA] | A | N | P | não | sim (pequena) |
| Dono da mesa por cor/iniciais | LS, TT [TELA] | A | P (nome do garçom) | P | não | não |
| Transferir mesa | TT 4 toques [TELA] | I | F | — | não | não |
| Juntar mesas (arrastar) e desfazer | SQ [TELA] | A | P | M | não | sim (conta) |
| Transferir itens entre mesas | TT "tap and drop" [TELA] | A | N | M | não | sim (conta) |
| Comanda individual (bar) e nome da conta | GoTab [TELA]; PDVs brasileiros [MKT] | I (Brasil) | R | M | não | sim |
| Pagamentos parciais e divisão | Tipe (frações) supera TT (até 9 partes) | I | F | — | não | não |

**Melhor solução e por quê.** O mapa da Toast é o melhor porque a cor da mesa reflete o **estado do pedido**, alimentado pelo KDS, e não só ocupação; o garçom sabe onde levar prato sem perguntar à cozinha. Somado ao tempo aberto da Lightspeed e aos estados de pagamento que só a Tipe tem (pagando pelo QR, pago), vira um salão mais completo que o de qualquer concorrente americano.

## 3. Garçom e atendimento móvel

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Lançar pedido no celular | TT Go 3, SO Express (mesma tela) [MKT/TELA] | I | R | M | não | não |
| Rodar em maquininha smart Android | Saipos, Colibri Ped+ [MKT] | I (Brasil) | N | M | adquirente (app na loja) | não |
| Entrada no aparelho por código | SQ device code [DOC] | A | N | P | não | não |
| Ver "pronto para servir" | TT verde no mapa [DOC] | I | N | P | não | não |
| Chamado do cliente (chamar garçom, pedir conta) | Goomer [TELA] | A | N | P | não | não |
| Saída de turno com conferência | SO Clock Out [TELA] | A | N | M | não | não |
| Gorjetas, saldo e saque quinzenal | SO DayCheck [DOC] | I | F | — | Pagar.me | não |
| Rateio da taxa de serviço / caixinha | 7S tip pooling [TELA]; Lei 13.419 | A | N | M | não | sim |
| Offline no aparelho do garçom | TT Go [MKT] | A | N | G | não | sim |

**Melhor solução e por quê.** O SpotOn Express usa **a mesma tela** no handheld e no terminal fixo, então o garçom não aprende duas interfaces. No Brasil, o equivalente do handheld é a maquininha smart do adquirente que o restaurante já tem, e o código do ramo `colibri` (`GarcomAtender.tsx`) é o ponto de partida.

## 4. Cozinha e KDS

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| KDS por pedido (ticket), não por item solto | TT, SQ [DOC/TELA] | I | R | P | não | não |
| Tempo real (Realtime) | — | I | P (10 s) | P | não | não |
| Cor por idade do ticket e alerta de atraso | TT, SQ [DOC/TELA] | I | N | P | não | não |
| Som em ticket novo, alterado, anulado | TT [DOC] | I | R (`beep.ts`) | P | não | não |
| Desfazer (3 s) e recall | SQ [TELA] | I | N | P | não | não |
| Estações configuráveis e roteamento | TT, SQ route orders [TELA] | A | P (cozinha/bar fixos) | M | não | sim (pequena) |
| Expediter | TT [DOC] | E | N | M | não | não |
| "All day" (total por item) | TT, SQ [TELA] | A | N | P | não | não |
| Cursos e hold & fire | TT, SQ, SO [TELA] | A | N | M | não | sim (pequena) |
| Status "pago/não pago" no ticket | TT [DOC] | A | N | P | não | não |
| Painel de senhas | Colibri [MKT] | A | R | P | não | não |
| Impressão de produção como alternativa | Degust [TELA] | I (Brasil) | N | M | agente local | sim |

**Melhor solução e por quê.** O KDS da Toast é o mais completo (cor por idade, expediter, som em alteração, all day, pago/não pago), mas o da Square vence em operação: **desfazer de 3 s** e timers configuráveis tornam o erro barato. Para a Tipe, o KDS em navegador comum (qualquer TV ou tablet) é vantagem sobre o "só Android" da Square.

## 5. Estoque

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Ficha técnica (receita por item e modificador) | R365 Menu Item → Recipe [TELA] | A | N | M | não | sim |
| Baixa teórica por venda | R365, MM [DOC] | A | N | M | não | sim |
| Contagem física e CMV real × teórico | R365, MM [DOC] | E | N | G | não | sim |
| Indisponibilizar item rápido ("86") | TT, SQ [DOC] | I | F (`available`) | — | não | não |
| Entrada por nota (XML NF-e) | ME foto da nota [DOC]; Saipos importação [MKT] | E | N | M | não | sim |
| Desperdício | MM [DOC] | E | N | P | não | sim |

**Melhor solução e por quê.** A MarketMan é a melhor para o restaurante pequeno porque trata estoque como fluxo operacional (pedido, recebimento, contagem) sem exigir contabilidade. No Brasil, a nota fiscal eletrônica de compra chega em XML, o que torna a entrada de custo mais simples que a foto da MarginEdge.

## 6. Financeiro

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Fechamento do dia imutável e versionado | R365 DSS [DOC] | I | P (calculado, não gravado) | P | não | sim (pequena) |
| Pendências financeiras com responsável | Tipe | I | F | — | não | não |
| Conciliação Pix/cartão com repasses | ME, R365 [DOC] | A | P | M | Pagar.me | não |
| Contas a pagar e receber | R365 [DOC] | E | N | G | não | sim |
| DRE / prime cost diário | ME [DOC] | E | N | G | não | sim |
| Exportação para ERP/contador (CSV + API) | R365 Standard/Summary [DOC] | A | P (CSV) | M | não | não |

**Melhor solução e por quê.** A MarginEdge mostra que o dono pequeno aceita P&L "de ontem" se ele chegar sozinho de manhã. A R365 mostra o formato: um registro diário por data de negócio que pode ser reenviado após correção.

## 7. ERP (compras, fornecedores, centros de custo, equipe, folha, multiunidade)

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Fornecedores e pedido de compra | MM [DOC] | E | N | M | não | sim |
| Centros de custo | R365 [DOC] | E | N | M | não | sim |
| Escala e ponto | 7S [TELA] | E | N | G | não | sim |
| Folha | R365, 7S [MKT] | E | N | G | sim | sim |
| Multiunidade (grupo, cardápio central, comparação) | TT MLM Target/Owner [DOC] | A | N | G | não | sim |

**Melhor solução e por quê.** O Multilocation Management da Toast é a melhor referência de rede: cardápio central com versões por unidade sem duplicar itens nos relatórios, e mudanças agendadas. Escala, ponto e folha são produtos inteiros (7shifts, R365) e devem ficar com parceiros.

## 8. Relatórios

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Vendas por período livre, hora, categoria, item | TB Cloud [DOC] | I | P (1/7/30 dias) | P | não | não |
| Por garçom (vendas, ticket, gorjeta, avaliação) | SO relatório por garçom [TELA] | I | P | P | não | não |
| Cancelamentos, descontos, taxas removidas | TB voids [DOC] | I | F | — | não | não |
| Comparação com período anterior | ME, R365 [DOC] | A | N | P | não | não |
| Resumo diário por e-mail | sunday (anterior); ME [DOC] | A | N | P | e-mail Lovable | não |
| Exportação Excel/CSV | reclamação na TT [terceiros] | I | F (CSV) | — | não | não |

**Melhor solução e por quê.** Nenhum PDV americano é elogiado por relatórios; é a reclamação recorrente em Toast, Square e TouchBistro. A referência útil é o formato da MarginEdge (o número de ontem, chegando sozinho) somado ao relatório por garçom da SpotOn.

## 9. CRM e fidelização

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Captura de contato com consentimento | sunday (anterior) | A | N | M | não | sim |
| Cashback em crédito no restaurante | Consumer [MKT] | E | N | G | jurídico | sim |
| Avaliação e alerta de nota ruim | sunday (anterior) | A | P (avaliação sem alerta) | P | não | não |

**Melhor solução e por quê.** Coberto no benchmark anterior; os PDVs americanos vendem fidelidade como add-on. Para a Tipe, o contato vem naturalmente do pagamento pelo QR, com consentimento (LGPD).

## 10. Administração SaaS

| Funcionalidade | Melhor referência | Nível | Tipe | Esf. | Ext. | Arq. |
|---|---|---|---|---|---|---|
| Planos por mesa com limite no banco | Tipe (único) | I | F | — | não | não |
| Módulos por plano | LS add-ons [MKT] | A | N | P | não | sim (pequena) |
| Papéis (dono, gerente, caixa, garçom, cozinha) | TT permissões numeradas [DOC] | I | P (4 fixos) | M | não | sim |
| Aprovação por PIN de gerente | TT [TELA] | I | N | P | não | sim (pequena) |
| Auditoria de operações sensíveis | Tipe (pagamentos, preço) | I | P | P | não | sim (pequena) |
| Onboarding self-service com modelo de salão | SQ templates [DOC] | A | P (onboarding de PDV) | P | não | não |
| Importação de cardápio | Tipe CSV | I | F | — | não | não |
| Suporte no horário de serviço | queixa nº 1 de TT, TB, SO | I | P (WhatsApp) | P | não | não |
| Monitoramento operacional (KDS, impressão, NFC-e) | — | A | N | P | não | sim (pequena) |
| Backoffice Tipe com 2FA | Tipe | I | F | — | não | não |

**Melhor solução e por quê.** A Tipe já está à frente em cobrança (por mesa, com limite aplicado no banco) e em segurança do backoffice. A lacuna é de **permissões finas**: a Toast numera cada permissão e, quando falta uma, pede a senha de quem a tem, em vez de travar a operação.
