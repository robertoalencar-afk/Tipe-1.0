# Requisitos de produto da Tipe 2.0

Resumo dos requisitos do prompt mestre (20/10/2026), já com as decisões do Roberto. Cada requisito tem um critério de aceite verificável; o status vive em `implementation-status.md`.

## Decisões em vigor

| Data | Decisão |
|---|---|
| 15/10 | Apple Pay e Google Pay aparecem como meios disponíveis na landing e no produto (sem "em breve"). |
| 20/10 | Sem cartão digitado na conta. Meios da conta: **Apple Pay, Google Pay, Pix e pagar no estabelecimento** (baixa manual pelo garçom ou caixa). |
| 20/10 | Gorjeta extra continua **70% garçom / 30% Tipe**. A hipótese 75/25 do prompt fica só como configuração documentada, desligada. |
| 20/10 | Ordem da conta como na Sunday: dividir → gorjeta extra com o nome do garçom → pagar; avaliação só depois. Percentuais menores, porque a conta brasileira já tem serviço, e "Outro valor" de R$ 2,00 até o valor que a pessoa está pagando. Sugestão adotada na demonstração: **3%, 5% (marcada) e 8%**. A conta real está sendo ajustada na conversa "Execução Sunday". |
| 20/10 | Pesquisa da Sunday só passiva (REA: captura e inspeção de páginas públicas). |

## A. Tipe Pay

| # | Requisito | Critério de aceite |
|---|---|---|
| A1 | Abrir a conta pelo QR sem app e sem cadastro | Conta aparece sem login; QR de outra mesa não abre esta |
| A2 | Ver restaurante, mesa, itens, quantidades, serviço, já pago e saldo | Soma dos itens + serviço = total; saldo cai ao pagar |
| A3 | Dividir: tudo, partes iguais, meus itens (com frações), por lugar, valor livre | Partes somam a conta exata, sem centavo perdido |
| A4 | Gorjeta extra opcional depois da divisão e antes do pagamento: 3%, 5% (sugerida) ou 8%, ou outro valor, com o nome de quem atendeu | "Não" tem o mesmo peso; outro valor só entre R$ 2,00 e o valor pago; gorjeta separada do serviço |
| A5 | Pagar com Pix, Apple Pay, Google Pay ou no estabelecimento | Pix e carteiras dão baixa só após confirmação do provedor; no local, só após o garçom confirmar |
| A6 | Concorrência: dois clientes não pagam o mesmo saldo | Segundo pedido do mesmo item é recusado com mensagem clara |
| A7 | Idempotência: clique duplo e webhook repetido não duplicam | Mesma chave = mesmo pagamento; mesmo evento = sem efeito |
| A8 | Comprovante e avaliação | Comprovante com itens, serviço e gorjeta; nota ≤ 2 avisa garçom e gerente |
| A9 | Baixa no PDV quando houver integração | Outbox entrega e confirma; falha aparece no painel |

## B. Tipe Order e C. Tipe Kitchen

| # | Requisito | Critério de aceite |
|---|---|---|
| B1 | Cardápio com categorias, descrição, alérgenos, adicionais, observação, disponibilidade | Item esgotado some do pedido na hora |
| B2 | Pedido pelo QR e pelo garçom na mesma conta, sem duplicar | Mesma chave de envio = um pedido |
| B3 | Lugar por item (para dividir por lugar) | Item guarda o lugar escolhido |
| B4 | Sugestão de acompanhamento | Regra explícita do cardápio (não IA) até existir dado de venda |
| C1 | Fila por estação (cozinha, bar), novo → em preparo → pronto | Pronto avisa o garçom da mesa |
| C2 | Tempo de espera e alerta de atraso | Atrasado sobe para o topo e fica vermelho |
| C3 | Painel de senhas para retirada | (PR #6) |

## D. Tipe Staff

| # | Requisito | Critério de aceite |
|---|---|---|
| D1 | Mesas atribuídas com status, saldo e itens prontos | Atualiza sem recarregar |
| D2 | Avisos: prato pronto, pagamento, mesa quitada, pagar no local, nota baixa | Aviso só para o garçom da mesa |
| D3 | Confirmar pagamento no local | Só garçom/gerente; cliente não consegue |
| D4 | Pedir estorno com motivo | Gerente aprova; garçom não aprova |
| D5 | Vendas, gorjetas (parte do garçom) e nota média do turno | Só os próprios dados |
| D6 | Lançar pedido pelo celular | Cai na mesma conta |

## E. Tipe Restaurant

| # | Requisito | Critério de aceite |
|---|---|---|
| E1 | Indicadores: faturamento, ticket médio, em aberto, gorjetas, nota | Só dados reais ou marcados como demonstração |
| E2 | Mapa do salão (livre, ocupada, pagando, quitada) | Estado coerente com a conta |
| E3 | Pagamentos com filtro e planilha | CSV abre no Excel/Sheets com `;` |
| E4 | Equipe: vendas, gorjeta bruta, parte do garçom, nota | Bate com os pagamentos |
| E5 | Conciliação determinística com o extrato do provedor | Cada pagamento digital tem par ou aparece como divergência |
| E6 | Aprovação de estorno | Estorno não reabre itens |

## F. Backoffice, G. Guest, H. IA

Requisitos detalhados no prompt (seções 11–13). Nesta etapa só a visão de demonstração do backoffice foi feita; o backoffice real já existe em `/backoffice`. Tipe Guest e as funções de IA começam na fase 7. **Regra de IA:** só aparece como "IA" o que tiver implementação real; números financeiros vêm de regras determinísticas.

## Demonstração

Navegar como cliente, garçom, cozinha, gerente e Tipe num restaurante fictício e completar QR → cardápio → pedido → cozinha → comanda → divisão → pagamento simulado → gorjeta → avaliação → painel → conciliação, com a faixa "Demonstração" sempre visível e sem nenhuma transação real.
