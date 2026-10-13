# Matriz de funcionalidades, notas e priorização

Base: `docs/competitive-research.md` (fontes públicas, 13/10/2026) e auditoria do código do TIPE.

## 1. Funcionalidades investigadas × TIPE

Classificação: ✅ já implementada · ◐ parcial · 🆕 implementada nesta fase · ⬜ ausente e viável · 🔌 depende de integração externa · 🤝 depende de credenciamento/parceria · ⛔ incompatível com a stack · ❔ não verificada

| Funcionalidade | Referência verificada | TIPE |
|---|---|---|
| QR individual por mesa | sunday, qlub, Zonal, Aloha Pay-At-Table | ✅ (token do QR + sessão rotativa) |
| QR por comanda/conta impressa | Toast Pay, SpotOn, Square, sunday | ⬜ (precisa de impressão no PDV) |
| Consulta da conta sem cadastro | todos do Grupo C | ✅ (pede nome e sobrenome, sem senha) |
| Itens e valores instantâneos, atualização automática | sunday, Rooam | ✅ (5 s no cliente; Realtime no painel) |
| Pagamento total | todos | ✅ |
| Pagamento parcial por item | sunday, OrderPay, Payby | ✅ (com frações ½ ⅓ ¼) |
| Divisão igualitária entre N pessoas | sunday, Toast Pay, Zonal | 🆕 |
| Valor livre | sunday, Zonal, OrderPay | 🆕 |
| Percentual da conta | — | 🆕 |
| Pagamentos simultâneos sem pagar duas vezes o mesmo item | (não documentado pelos concorrentes) | ✅ bloqueio de linha + idempotência; testado com 2 conexões |
| Reserva temporária durante o checkout | (implícito) | ✅ `reserved_portion`; 🆕 liberação automática de reserva órfã |
| Saldo restante visível para todos | Toast Pay **falha** aqui (clientes saem achando que pagaram tudo) | 🆕 aviso "ainda faltarão R$ X" + saldo no divisor |
| Apple Pay / Google Pay | sunday, Toast Pay, SpotOn | ◐ (só em simulação) 🔌 Pagar.me |
| Pix | Payby | ✅ |
| Gorjeta sugerida (%) e personalizada | sunday, Rooam, Toast | ◐ gorjeta extra livre; sem % sugerido na conta |
| Escolha/identificação do garçom | sunday (dados por garçom) | ✅ garçom da mesa; ◐ cliente não escolhe |
| Comprovante na tela | todos | ✅ |
| Recibo por e-mail | sunday, Zonal | ⬜ |
| Baixa automática no PDV | Toast Pay, SpotOn (fecha sozinho) | ✅ PDV próprio; 🔌🤝 externos; 🆕 contrato e política de reenvio prontos |
| Avaliação pós-pagamento | sunday, Aloha | ✅ (interna) |
| Convite para avaliação no Google | sunday, qlub, Aloha | ⬜ |
| Fidelidade, recompensas, cashback | me&u, SpotOn, Toast | ⬜ |
| Taxa de plataforma cobrada do cliente | me&u (Austrália) | ⬜ decisão comercial e jurídica |
| Estorno e contestação refletidos na conta | Rooam (gestão de contestação) | 🆕 |
| Reconciliador de pagamentos | R365 (reprocessamento do dia) | 🆕 |
| Pendências financeiras com trilha de resolução | — | 🆕 |
| Fechamento diário exportável (vendas, meios, gorjetas, estornos) | Restaurant365 (DSS) | ⬜ |
| KDS / cozinha e bar | GoTab, Crunchtime | ✅ (PDV próprio) |
| Transferir/juntar mesas | PDVs | ✅ (`pdv_transfer_table`) |
| Multiunidade (matriz e filiais) | R365, Crunchtime | ❔ fora do foco atual |
| API pública para parceiros | Square, Lightspeed | ◐ `api_tipe` (webhook canônico) |

## 2. Matriz comparativa (0–10)

Notas atribuídas **somente** com base em evidência pública citada; "?" = não verificável sem acesso ao produto. Pesos do briefing. A coluna "nota ponderada" é calculada só sobre critérios conhecidos e vem com a cobertura (peso conhecido / 100%) — não compare notas com coberturas muito diferentes.

| Plataforma | Exp. mesa 20% | Integração PDV 20% | Divisão 15% | Gorjeta/monet. 15% | Uso 10% | APIs 10% | Segurança 5% | Escala 5% | Ponderada (cobertura) |
|---|---|---|---|---|---|---|---|---|---|
| sunday | 9 | 9 | 9 | 8 | ? | ? | ? | ? | 8,8 (70%) |
| qlub | 7 | ? | ? | 6 | ? | ? | 7 | ? | 6,6 (40%) |
| me&u | 8 | 9 | ? | 8 | ? | ? | ? | ? | 8,4 (55%) |
| GoTab | 7 | 8 | 6 | 7 | ? | ? | ? | ? | 7,1 (70%) |
| Toast Pay | 7 | 10 | 4 | 7 | 5 | 5 | ? | ? | 6,7 (90%) |
| Square (Scan to Pay) | 5 | 10 | 7 | ? | ? | 9 | ? | ? | 7,6 (65%) |
| Lightspeed | ? | 9 | ? | ? | ? | 8 | ? | ? | 8,7 (30%) |
| SpotOn | 7 | 9 | ? | 7 | ? | ? | ? | ? | 7,7 (55%) |
| NCR Aloha (+ sunday) | 8 | 9 | 8 | 8 | ? | ? | ? | ? | 8,3 (70%) |
| TouchBistro | 4 | 9 | ? | ? | ? | ? | ? | ? | 6,5 (40%) |
| Restaurant365 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | retaguarda, não comparável |
| **TIPE (após esta fase)** | 8 | 4 | 9 | 6 | ? | 6 | 8 | ? | 6,6 (85%) |

Leitura: o TIPE já está no nível dos melhores em **divisão** e em **segurança da liquidação** (testada), e é o único com **Pix** nativo entre os analisados fora do Brasil. A distância está em **integração com PDV de terceiros** e em **monetização da gorjeta/fidelidade**.

## 3. As 20 funcionalidades mais valiosas que o TIPE ainda não tinha

Complexidade: B baixa · M média · A alta. Prioridade: P0 agora · P1 próximo ciclo · P2 depois.

| # | Funcionalidade | Referência | Problema resolvido / benefício | Compl. | Dependências | Custo operacional | Riscos | Prior. | Imediata? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Divisão igualitária entre N pessoas | sunday, Toast, Zonal | 1/3 das mesas divide; hoje exige escolher item por item | M | — | nenhum | arredondamento (resolvido) | P0 | **Feito** |
| 2 | Valor livre e percentual | sunday, Zonal | "pago R$ 50 e o resto vocês" | M | — | nenhum | parte pode sair centavos abaixo do digitado | P0 | **Feito** |
| 3 | Saldo restante sempre visível | falha do Toast Pay | mesa não fica com saldo esquecido | B | — | nenhum | — | P0 | **Feito** |
| 4 | Estorno/contestação refletidos | Rooam | conta "paga" com dinheiro devolvido | M | webhook Pagar.me | nenhum | evento de contestação mudou na Pagar.me | P0 | **Feito** |
| 5 | Reconciliador de pendentes | R365 | webhook perdido prendia itens reservados | M | agendamento da rotina | chamadas à API Pagar.me | limite de requisições | P0 | **Feito** (falta agendar) |
| 6 | Pendências financeiras no caixa | — | dono vê e registra o que fazer | B | migração 0019 | nenhum | — | P0 | **Feito** |
| 7 | Desligar a aprovação simulada em produção | — | evita conta "paga" sem dinheiro (R1) | B | — | nenhum | afeta pilotos sem Pagar.me | P0 | **Feito** |
| 8 | Apple Pay e Google Pay reais | sunday, Toast | conversão no iPhone/Android | M | Pagar.me (carteiras), domínio verificado | taxa de cartão | certificação Apple | P1 | Não (credenciamento) |
| 9 | Gorjeta sugerida em % na própria conta | sunday, Rooam | gorjeta maior (alegação de até +10%) | B | regra 70/30 confirmada | nenhum | confundir com taxa de serviço | P1 | Sim |
| 10 | Recibo por e-mail | sunday, Zonal | comprovante para reembolso de despesa | B | serviço de e-mail já existe (`send-email.ts`) | e-mail por envio | LGPD (e-mail opcional) | P1 | Sim |
| 11 | Convite para avaliação no Google | sunday, qlub | mais avaliações públicas | B | link do perfil do restaurante | nenhum | só após nota alta, sem "gating" abusivo | P1 | Sim |
| 12 | Adaptador Lightspeed K-Series | API pública Lightspeed | primeiro PDV externo com baixa automática | A | conta de parceiro/demonstração | — | mudanças de API | P1 | Não (credenciais) |
| 13 | Fila de baixa no PDV (outbox) | Toast/SpotOn | baixa garantida mesmo com PDV fora do ar | M | adaptador com `devolvePagamento` | nenhum | — | P1 | Contrato e política prontos |
| 14 | Fechamento diário exportável | Restaurant365 | contador e ERP sem retrabalho | M | — | nenhum | conciliação com depósitos | P1 | Sim |
| 15 | QR na conta impressa | Toast, SpotOn, Square | cliente paga mesmo sem QR na mesa | M | impressão no PDV | — | — | P2 | Parcial (PDV próprio) |
| 16 | Cliente escolhe o garçom que o atendeu | sunday | gorjeta para quem atendeu de fato | B | — | nenhum | disputa entre garçons | P2 | Sim |
| 17 | Fidelidade/cashback | me&u, SpotOn | retorno do cliente | A | modelo financeiro, regras do arranjo | custo do benefício | regulatório | P2 | Não |
| 18 | Taxa de conveniência do cliente | me&u (Austrália) | receita sem pesar no restaurante | B | jurídico/CDC, Pagar.me | — | rejeição do cliente | P2 | Não (decisão) |
| 19 | Painel de desempenho por garçom (gorjeta × avaliação × tempo) | Aloha/sunday | gestão da equipe | M | dados já existem | nenhum | — | P2 | Sim |
| 20 | Conta de grupo com cartão em garantia (tab) | GoTab, Toast Tabs | bares: ninguém sai sem pagar | A | pré-autorização no Pagar.me | taxa | estornos | P2 | Não |

## 4. Classificação por impacto × esforço

- **Alto impacto, baixo esforço (fazer já):** 3, 6, 7, 10, 11, 9 (após decisão).
- **Alto impacto, esforço médio:** 1, 2, 4, 5 (feitos), 13, 14.
- **Alto impacto, depende de terceiros:** 8, 12.
- **Estratégicos, decisão comercial:** 17, 18, 20.
- **Coerência com o posicionamento "pagar a conta na mesa, sem app":** todos os itens 1–16 reforçam; 17–20 ampliam e devem esperar tração.
