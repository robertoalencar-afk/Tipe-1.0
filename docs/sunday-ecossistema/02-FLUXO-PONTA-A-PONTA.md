# 02: fluxo de ponta a ponta

Sunday: só o que está documentado ou observado (ver `01-OBSERVACAO.md` e `sunday-analise/01`). Tipe: código das branches dos PRs #10, #7, #12 e #13.

| Passo | O que dispara | Sunday (evidência) | Tipe: o que cada perfil vê | Validações | Como os outros são avisados | Exceções | Arquivo na Tipe |
|---|---|---|---|---|---|---|---|
| Mesa | Cliente lê o QR | QR na mesa ou no recibo (Documentado) | Cliente: nome e sobrenome (uma vez por mesa), depois a conta | Token do QR só abre a mesa; sessão rotativa para pagar | — | QR antigo: "Este QR Code foi atualizado"; mesa inativa | `src/routes/$restaurante.$mesa.tsx`, `pdv.functions.ts#getPublicTable` |
| Conta | Itens lançados no PDV | Conta ao vivo, itemizada (Documentado) | Cliente: total em aberto em destaque, "Pagar tudo", "Dividir a conta", itens | Atualiza a cada 5 s; disponível = pedido − reservado − pago | — | Mesa sem pedidos: estado vazio | idem |
| Divisão | Cliente escolhe | Por item, assento, pessoas ou valor (Documentado) | Itens com frações, partes iguais, valor, porcentagem | Arredondamento cumulativo por item (`bill-math.ts`) | Saldo da mesa sempre visível | Item pago por outro: "acabou de ser pago" | `DividirConta.tsx`, `bill-math.ts` |
| Gorjeta | — | Antes do pagamento, sugerida (Documentado) | Depois do pagamento e da avaliação, opcional, cobrança separada (70/30) | Valor até R$ 1.000 | Garçom vê no saldo | "Agora não" com o mesmo peso | `$restaurante.$mesa.tsx`, `rules.ts` |
| Pagamento | "Pagar" | Apple Pay, Google Pay, cartões (Documentado e Observado) | Pix (pré-selecionado), Apple Pay, Google Pay, no estabelecimento | Valor calculado no servidor; chave de idempotência; aceite dos termos | — | Carteira recusada no servidor: troca para Pix com um toque; queda de rede: "Não pague de novo" | `payments.functions.ts#createPayment` |
| Confirmação | Pagar.me confirma (webhook) | "Successful"/"Failed" (Documentado) | Cliente: "Pagamento realizado!", recibo, avaliação | Só `provider_settle_payment` aprova | Garçom: aviso "Pagou R$ X" ou "Paga por completo" (PR #13) | Pix expirado: volta ao pagamento | `payment-settlement.server.ts`, `GarcomAtender.tsx` |
| Garçom | Mudança no salão | Notificação "Fully paid · Guests can leave" (Observado) | Salão com estados e avisos | Só mesas do garçom | Toast, vibração, bipe opcional | Área fechada: sem aviso (push é próxima etapa) | `GarcomAtender.tsx`, `pdv/comanda.ts` |
| Restaurante | Pagamento no local | Painel de pagamentos com filtros (Documentado) | Caixa confirma via `resolve_table_payment`; pendências financeiras | Papel em `user_roles` | Garçom: "Pagamento no local" | Estorno e contestação em pendências | `RestaurantPanel.tsx`, `PendenciasFinanceiras.tsx` |
| Relatórios | Fim do dia | End of Service, conciliação (Documentado) | Fechamento do dia com CSV, relatórios 1/7/30 dias | — | — | — | `FechamentoDia.tsx`, `AdminSections.tsx` |
