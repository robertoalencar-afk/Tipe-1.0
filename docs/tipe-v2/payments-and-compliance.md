# Pagamentos e conformidade

## Meios de pagamento da conta (decisão de 20/10/2026)

| Meio | Na interface | No servidor | Baixa |
|---|---|---|---|
| Pix | Disponível | Ativo (Pagar.me, conta do restaurante) | Automática, após nova consulta do pedido no provedor |
| Apple Pay | Disponível (decisão de 15/10) | **Recusado** | — |
| Google Pay | Disponível (decisão de 15/10) | **Recusado** | — |
| Pagar no estabelecimento | Disponível | Ativo | Manual: garçom ou caixa confirma (`resolve_table_payment`), com troco calculado no servidor |
| Cartão digitado | Não existe | Não existe na conta | — |

**Lacuna conhecida:** Apple Pay e Google Pay aparecem como disponíveis por decisão do Roberto, mas o servidor recusa. Na conta real (PR #12), quem escolhe uma carteira cai no Pix com um toque. Para virar real: confirmar com a Pagar.me o suporte a token de carteira, configurar o domínio da Apple Pay (arquivo de verificação em `/.well-known/`) e liberar os métodos em `payments.functions.ts`, com testes de liquidação. Até lá, a promessa "Apple Pay e Google Pay" na landing é um risco de reclamação; ele está aceito pelo dono.

## Gorjeta, taxa de serviço e pagamentos opcionais

| Item | O que é | Regra na Tipe |
|---|---|---|
| Taxa de serviço | Percentual do restaurante (0–20%) | Definida só por `restaurants.service_rate`, recalculada no servidor; pode ser dispensada por conta, com motivo |
| Gorjeta extra | Valor opcional escolhido pelo cliente, além da taxa, depois de dividir e antes de pagar | 3%, 5% ou 8% do valor dos itens, ou outro valor entre R$ 2,00 e o valor que a pessoa está pagando (decisão de 20/10). 70% para o garçom da mesa, 30% para a Tipe (regra mantida em 20/10) |
| Hipótese 75/25 | Do prompt mestre | Só documentada; **não ativar** sem parecer jurídico, trabalhista (Lei 13.419/2017), contratual e do provedor |
| Cashback comercial | Benefício ao restaurante | Fase posterior; exige regras contratuais |

A demonstração mostra a regra 70/30 como "regra configurada", e o backoffice demo mostra a parte Tipe da gorjeta só como número calculado, sem repasse.

## Proteção contra duplicidade e saldo inconsistente

- Reserva de frações de item com trava de linha antes de cobrar; frações em `numeric(12,4)`, centavos inteiros e arredondamento cumulativo por item (`itemChargeCents`).
- Chave de idempotência obrigatória em `register_table_payment`.
- Liquidação só por `provider_settle_payment`, depois de buscar o pedido de novo; eventos repetidos/atrasados/fora de ordem tratados por `decideSettlement`.
- Valor recebido diferente do cobrado não dá baixa: vira incidente (`payment_incidents`). A demonstração repete essa regra ("valor diferente" vai para a conciliação).

## LGPD e segurança

- Cliente paga sem cadastro; nome fica no aparelho. Consentimento versionado (`legal_acceptances`), scripts opcionais só após `hasConsent()`.
- Dados de cartão nunca passam pelo servidor da Tipe (tokenização no navegador para a gorjeta; a conta não tem cartão).
- CPF, Pix e dados bancários de garçons cifrados (AES-GCM); revelações registradas.
- Backoffice com 2FA e sem acesso operacional ao restaurante.
- A demonstração não coleta nada: tudo fica no `localStorage` do navegador de quem testa e some ao "Recomeçar".

## Antes de operar dinheiro real em algo novo

Homologação com a Pagar.me (ambiente de teste), testes de banco (`tests/db`), teste de ponta a ponta no Playwright e aprovação explícita do Roberto. Nada desta entrega move dinheiro real.
