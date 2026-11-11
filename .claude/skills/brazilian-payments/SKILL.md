---
name: brazilian-payments
description: Use ao mexer em qualquer valor, cobrança, divisão de conta, gorjeta, taxa de serviço, estorno, webhook ou provedor de pagamento da Tipe (Pix, Apple Pay, Google Pay, Pagar.me).
---

# Pagamentos brasileiros na Tipe

Leia `docs/tipe-v2/payments-and-compliance.md` e `src/lib/tipe/AGENTS.md` antes de editar.

- Meios da conta: Pix, Apple Pay, Google Pay e pagar no estabelecimento. **Sem cartão digitado** (decisão do dono, 20/10/2026). Carteiras aparecem como disponíveis, mas o servidor ainda recusa: não "conserte" isso escondendo-as.
- Dinheiro em centavos inteiros; frações de item com 4 casas. Toda divisão vira frações de item via `bill-math.ts` com `itemChargeCents` (arredondamento cumulativo). Teste que as partes somam o total exato.
- O navegador nunca decide valor, taxa ou status. Taxa de serviço só de `restaurants.service_rate`.
- Reserve antes de cobrar (`register_table_payment`, chave de idempotência obrigatória). Liquide só por `provider_settle_payment` depois de buscar o pedido no provedor. Evento repetido/atrasado passa por `decideSettlement`.
- Valor recebido diferente do cobrado vira incidente, nunca baixa automática.
- Estorno não reabre itens.
- Gorjeta extra é separada da taxa de serviço: 70% garçom / 30% Tipe. Qualquer outra repartição (75/25, caixinha) só com parecer jurídico e aprovação do dono.
- Dados de cartão nunca passam pelo servidor. Segredos só em variáveis de ambiente do Lovable.
- Nada que mova dinheiro real vai para o `main` sem teste de banco (`tests/db`), e2e e aprovação do Roberto.
