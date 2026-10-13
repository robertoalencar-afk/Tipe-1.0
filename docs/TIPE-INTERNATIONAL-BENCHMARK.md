# TIPE 2.0 — Benchmark internacional e estratégia

13/10/2026 · Documento-síntese. Detalhes em: `competitive-research.md` (pesquisa e fontes), `rea-functional-analysis.md` (o que o REA executou), `feature-gap-matrix.md` (matriz, notas e as 20 funcionalidades), `technical-report.md` (o que mudou no código), `test-report.md` (o que foi testado), `rea-environment-audit.md` (stack, riscos e limitações).

## 1. Em uma página

- **O mercado convergiu para a mesma promessa do TIPE:** QR, conta na tela, dividir, gorjeta, pagar, sair. sunday (5.000+ restaurantes, alegação), qlub (já em português no Brasil), me&u, Toast, Square e SpotOn fazem isso. O QR em si não diferencia mais.
- **Onde o TIPE já está à frente:** divisão por item **com frações** e proteção real contra pagamento duplicado (testada com duas conexões simultâneas); **Pix** nativo; o restaurante recebe na própria conta Pagar.me; trilha de auditoria; agora divisão igualitária, valor livre e percentual, como os melhores.
- **Onde está atrás:** integração com PDVs de terceiros (só PDV próprio e API genérica, sem baixa automática), Apple Pay/Google Pay reais, recibo por e-mail, convite para avaliação pública, fidelidade.
- **Concorrência no Brasil:** qlub (internacional, em português) e Payby (Salvador, Pix e divisão por item, cobra por transação). O TIPE compete por **assinatura por mesa** — previsível para o restaurante — e por ser também PDV.

## 2. O que mudou no TIPE nesta fase

| Entregue | Por quê | Referência |
|---|---|---|
| Dividir a conta: partes iguais, valor livre, porcentagem | ~35% dos usuários do sunday dividem (alegação); Toast e Zonal oferecem divisão igual | sunday, Zonal, Toast Pay |
| Centavo exato em qualquer divisão | 3 × ⅓ de R$ 10,00 dava R$ 9,99 | — |
| Saldo da mesa sempre visível ("ainda faltarão R$ X") | no Toast Pay clientes saem achando que pagaram tudo | comunidade Toast |
| Estorno e contestação refletidos (também em mesa já reaberta) | antes, o estorno não chegava ao TIPE; a Pagar.me trocou o evento de contestação | Pagar.me v5 |
| Valor pago conferido antes de aprovar | defesa contra divergência de valor | — |
| Reconciliador de pagamentos presos | webhook perdido deixava itens reservados para sempre | Restaurant365 (reprocessamento) |
| Pendências financeiras no caixa, com registro de quem resolveu | o dono precisa de uma lista de ação, não de um log | — |
| Contrato universal de PDV documentado + adaptador fictício + política de nova tentativa de baixa | base para o primeiro PDV externo | Lightspeed, Square |
| Gorjeta 70/30 exata ao centavo | `splitGorjeta` perdia centavos | — |

## 3. Modelo comercial

### 3.1 Assinatura por mesa (mantida)
Previsível e fácil de vender contra quem cobra por transação (Payby, sunday, me&u). O limite de mesas por plano já é aplicado no banco.

### 3.2 Gorjeta extra — 70% equipe / 30% TIPE (decisão confirmada em 13/10/2026)
A regra vigente no código (`TIP_SPLIT`, `waiter_balance`) é a correta e foi mantida. A divisão agora é exata ao centavo.

| Gorjeta de R$ 10,00 | Valor |
|---|---|
| Garçom | R$ 7,00 |
| TIPE (receita) | R$ 3,00 |
| Restaurante | R$ 0,00 |

Efeito contábil: o valor inteiro entra na conta Pagar.me da TIPE; 70% é obrigação com o garçom até o saque quinzenal, 30% é receita. Um estorno da gorjeta tira o valor do saldo do garçom automaticamente (o saldo só soma pagamentos aprovados).

Ponto para validar com advogado e contador (não é parecer jurídico): a Lei 13.419/2017 trata gorjeta como remuneração dos empregados. Mostrar ao cliente que 30% é taxa da plataforma, como linha separada, reduz o risco de questionamento.

### 3.3 Cashback ao restaurante
Só faz sentido financiado pela receita da TIPE e pago como **crédito na assinatura** (desconto na mensalidade), não como dinheiro — evita atividade regulada e custódia. Não implementado.

## 4. Roadmap

### Decisões tomadas em 13/10/2026
| # | Decisão | Situação |
|---|---|---|
| D1 | Sem aprovação simulada em produção | **Feito.** Simulação só com `TIPE_ALLOW_SIMULATED_PAYMENTS=true` (use em ambientes de teste/demonstração). Sem conta Pagar.me ativa, o cliente só vê "pagar no estabelecimento"; gorjeta digital some se a conta TIPE não estiver configurada; o painel avisa o dono em Recebimentos |
| D2 | Gorjeta 70/30 | **Confirmado**, mantido |
| D3 | Reconciliador e eventos de contestação | **Código pronto.** O Pix pendente agora também é reconsultado enquanto o cliente espera. Faltam dois passos fora do código, descritos abaixo |
| D4 | Founder sem acesso operacional pelo papel global | **Feito** (migração 0020). Backoffice segue funcionando pelo servidor com 2FA; para operar um restaurante, o founder precisa de papel explícito nele |

**Passos de D3 que só você consegue fazer:**
1. No Lovable, peça: "agende uma chamada POST para `/api/public/payments/reconcile` a cada 5 minutos, com o mesmo segredo de cron usado em `/api/public/pdv/sync`".
2. No painel da Pagar.me (conta da TIPE e de cada restaurante), em Configurações → Webhooks, marque também os eventos de contestação (`chargeback.*`) no webhook que já existe.

### Próximo ciclo (P1, sem dependência externa) — entregue na fase 2
Recibo por e-mail, gorjeta sugerida em %, convite para avaliação no Google, fechamento diário exportável e fila de baixa no PDV: ver `docs/fase-2.md`.
Ainda aberto: carregar o texto jurídico sob demanda no simulador (achado do REA: 847 KB de JS na página pública).

### Depende de integração, credenciais ou parceria
| Item | Dependência |
|---|---|
| Apple Pay e Google Pay reais | habilitação na Pagar.me e verificação de domínio Apple |
| Adaptador Lightspeed K-Series (primeiro PDV externo, com "Apply a Payment" e webhooks) | conta de parceiro/demonstração |
| Adaptadores Toast e NCR Aloha | credenciamento de parceiro (escrita de pagamento é restrita) |
| Square | API aberta (`PayOrder` com vários pagamentos); viável, mas Square tem pouca presença no Brasil |
| Fidelidade/cashback | modelo financeiro e jurídico |

## 5. Roteiro de teste manual da nova divisão (após o merge)
1. Mesa com 3 itens; celular A abre "Dividir a conta" → Partes iguais → 3 pessoas → paga 1 parte.
2. Celular B, mesma mesa: vê "falta pagar" atualizado; paga 1 parte por valor livre.
3. Celular C: "Pagar a conta inteira" paga o restante; a mesa fecha e reabre em 2 minutos.
4. No painel, Caixa: nenhuma pendência; Histórico: três pagamentos somando o total da mesa, ao centavo.
