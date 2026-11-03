# Garantia da reserva (modelo OpenTable)

Pedido do Roberto (03/11/2026): antes de confirmar a reserva o cliente paga uma taxa simbólica, que vira
crédito na conta. O cliente é informado de que perde o valor se não comparecer.

## Regras (src/lib/tipe/guest/garantia.ts, já com testes)

| Situação | O que acontece com a garantia |
|---|---|
| Cliente senta à mesa | Vira crédito e é abatida da conta (sobra volta ao cliente) |
| Cliente cancela até o prazo (padrão 2 h antes) | Devolvida integralmente |
| Cliente cancela depois do prazo | Fica com o Tipe |
| Cliente não comparece (marcado só depois do horário) | Fica com o Tipe |
| Restaurante cancela | Devolvida integralmente |

- Valor por pessoa definido pelo restaurante (R$ 5 a R$ 100; 0 = sem garantia). Exemplo do simulador: R$ 10.
- Pagamento só por Pix, Apple Pay ou Google Pay (regras do Tipe Pay; sem cartão digitado, sem "pagar no
  estabelecimento", porque a garantia é antes da visita).
- O cliente lê as regras e marca "Li e aceito" antes de pagar. O texto aceito fica guardado com a reserva.

## O que já está pronto (este PR)

- Regras puras e testes.
- Simulador da landing: etapa "Garantia da reserva", cancelamento com e sem devolução, "Simular ausência"
  no painel, crédito na conta da mesa. Jangada Café segue sem garantia, para mostrar que é opcional.
- Textos da página do Tipe Guest (benefício, fato e FAQ) atualizados.

## Plano do motor real (próximo passo, precisa do seu ok)

1. **Migração 0044**: `guarantee_per_person_cents` em `guest_reservation_settings` (padrão 0); tabela
   `guest_reservation_guarantees` (reserva, valor, método, estado `pendente|paga|creditada|devolvida|retida|expirada`,
   ids do Pagar.me, texto das regras aceito e data do aceite).
2. **Confirmação**: com garantia, o hold vira "aguardando pagamento" (10 min para Pix) e a reserva só fica
   `confirmada` quando o pagamento é aprovado (webhook do Pagar.me, idempotente). Pagamento não aprovado no
   prazo libera a mesa.
3. **Desfechos**: cancelamento no prazo ou pelo restaurante gera estorno; ausência e cancelamento fora do prazo
   marcam `retida`; ao sentar, a garantia entra como crédito na conta da mesa do Tipe Pay.
4. **Painel**: campo "Garantia por pessoa" em Configurar; selo da garantia em cada reserva.
5. **Empresas virtuais** (teste-tipe, bistro-teste, bar-teste): aprovação instantânea, como no Tipe Pay.
6. **Cobrança real** depende das chaves do Pagar.me (ainda pendentes).

## Decisões do Roberto (03/11/2026)

- O dinheiro da garantia fica com o Tipe: o Tipe recebe a garantia, retém em ausência ou cancelamento fora do
  prazo e, quando o cliente senta, repassa o valor ao restaurante como parte do pagamento da conta.
- Se houver estorno, a tarifa é paga pelo Tipe.
- Na conta da mesa do Tipe Pay há uma aba **Tipe Guest**. Quando a mesa é aberta pela reserva (check-in no
  painel, que já grava `seated_table_id`), a conta reconhece o cliente e aplica o desconto sozinha. Se a mesa
  foi aberta sem passar pela reserva, o garçom vincula pelo código da reserva.
- Pendente: como calcular o valor (card enviado; recomendação: por pessoa, definido pelo restaurante).
