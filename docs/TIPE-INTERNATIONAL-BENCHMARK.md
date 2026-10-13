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

### 3.2 Gorjeta extra — demonstração antes de qualquer mudança
O código aplica hoje **70% equipe / 30% TIPE** (`TIP_SPLIT`, `waiter_balance`). O briefing cita **75/25**. **Nada foi alterado.**

| Gorjeta de R$ 10,00 | Hoje (70/30) | Hipótese (75/25) |
|---|---|---|
| Garçom | R$ 7,00 | R$ 7,50 |
| TIPE (receita) | R$ 3,00 | R$ 2,50 |
| Restaurante | R$ 0,00 | R$ 0,00 |
| Efeito contábil na TIPE | o valor inteiro entra na conta TIPE; 70% vira obrigação com o garçom até o saque; 30% é receita | idem, com 75% e 25% |

Pontos para validar **com advogado e contador** antes de mudar ou ampliar (isto não é parecer jurídico):
- A Lei 13.419/2017 trata gorjeta como remuneração dos empregados, com retenção pelo empregador limitada a encargos. Uma plataforma ficar com parte de algo chamado "gorjeta" pode ser questionado. Alternativa mais segura: mostrar ao cliente **duas linhas** — "gorjeta para a equipe (100%)" e "taxa de conveniência TIPE" — como faz a me&u com a taxa de plataforma na Austrália.
- Gorjeta, **taxa de serviço** (do restaurante, já tratada à parte no código) e **receita da TIPE** não podem se misturar no extrato nem na nota.
- Regras do arranjo de pagamento/Pagar.me para recebimento em nome de terceiros (o garçom).

### 3.3 Cashback ao restaurante
Só faz sentido financiado pela receita da TIPE e pago como **crédito na assinatura** (desconto na mensalidade), não como dinheiro — evita atividade regulada e custódia. Não implementado.

## 4. Roadmap

### Decisões que dependem de você
| # | Decisão | Recomendação |
|---|---|---|
| D1 | **Aprovação simulada em produção**: sem Pagar.me conectada, pagamentos digitais são aprovados sem dinheiro | Variável `TIPE_ALLOW_SIMULATED_PAYMENTS` desligada em produção e ligada só em demonstração; avisar no painel "modo demonstração". Pronto para implementar assim que decidir |
| D2 | 70/30 ou 75/25, e se vira "taxa de conveniência" separada | Validar juridicamente antes (3.2) |
| D3 | Agendar o reconciliador (a cada 5 min) e ligar eventos de contestação na Pagar.me | Necessário para o que foi entregue funcionar por completo |
| D4 | Founder com acesso operacional a restaurantes (`has_restaurant_role`) contradiz a regra do `AGENTS.md` | Revisar política |

### Próximo ciclo (P1, sem dependência externa)
1. Recibo por e-mail (serviço de e-mail já existe).
2. Gorjeta sugerida em % na própria conta (após D2).
3. Convite para avaliação no Google para notas 4–5.
4. Fechamento diário exportável (vendas, meios, taxa, gorjetas, estornos) no formato que Restaurant365/MarginEdge importam.
5. Fila de baixa no PDV (outbox) usando `esperaAntesDaTentativa` e pendência `pdv_writeback_failed` — a tabela de pendências já aceita esse tipo.
6. Carregar o texto jurídico sob demanda no simulador (achado do REA: 847 KB de JS na página pública).

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
