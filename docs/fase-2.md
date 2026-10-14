# TIPE 2.0 — Fase 2 (sem dependência externa)

Data: 13/10/2026. Base: branch `tipe-2.0-pagamento-na-mesa` (PR #2).

## Entregue

| Item | Onde | Como funciona |
|---|---|---|
| **Comprovante por e-mail** | tela "Pagamento confirmado"; `sendPaymentReceipt`; modelo `payment-receipt` | **Opcional e sem etapa nova:** um link "Receber comprovante por e-mail (opcional)" na tela de confirmação abre o campo só se o cliente tocar; ninguém precisa informar e-mail para pagar, avaliar ou dar gorjeta. Só para pagamento **aprovado** da própria mesa (sessão válida). Itens com frações, taxa de serviço, total, forma e referência. O e-mail é usado só no envio e **não é gravado**; limite de 3 envios por pagamento a cada 10 min e 10 por IP por hora. Texto deixa claro que não é nota fiscal |
| **Gorjeta sugerida em %** | tela da gorjeta; `suggestedTips` | 5%, 10% e 15% do que a pessoa pagou (arredondado a R$ 0,50, mínimo R$ 1,00), mais "Outro valor". Conta abaixo de R$ 20 mostra R$ 2/5/10. A tela informa a regra 70% equipe / 30% TIPE |
| **Avaliação no Google** | Configurações → "Link de avaliação no Google"; tela final do cliente | O dono cola o link do Perfil da Empresa. O banco só aceita endereços do Google em https. O botão aparece **para todos** os clientes, sem filtrar por nota — o Google proíbe pedir avaliação só de quem gostou |
| **Fechamento do dia** | Relatórios → "Fechamento do dia"; `getDailyClose` | Dono ou caixa escolhe o dia (horário de Fortaleza). Mostra contas pagas, total, taxa de serviço, ticket médio, por meio (Pix, cartão, dinheiro, maquininha…), pendentes, estornados e pendências. Planilha CSV com `;` e vírgula decimal, incluindo mesas já reabertas. Gorjetas extras ficam fora (regra do projeto) |
| **Fila de baixa no PDV** | migração 0021 (`pdv_payment_outbox`, gatilho, `pdv_outbox_claim`); `outbox.server.ts`; rotina `/api/public/payments/reconcile` | Todo pagamento de conta aprovado num restaurante com PDV externo conectado entra na fila com uma cópia dos dados. A rotina avisa o PDV; se falhar, tenta de novo com espera crescente (30 s até 30 min); após 8 falhas abre a pendência "Baixa no sistema do restaurante falhou" no Caixa. Duas rotinas ao mesmo tempo nunca pegam o mesmo item. Restaurantes com o Lançamento TIPE não usam a fila |

## Segurança na implantação
- O painel e a conta do cliente continuam abrindo mesmo se o código chegar antes da migração 0021: o link do Google é lido numa consulta separada.
- A fila de baixa só tem efeito quando existir um adaptador de PDV externo com baixa automática. Hoje nenhum adaptador registrado declara isso, então a fila fica vazia/ignorada até o primeiro PDV externo.

## Pendente fora do código
- **Central Jurídica:** incluir na Política de Privacidade o uso do e-mail para envio do comprovante (finalidade única, sem armazenamento). Decisão jurídica: não alterei o texto versionado.
- Validar o modelo de e-mail no preview do Lovable (`/lovable/email/transactional/preview`).

## Testes
- Unidade: 78 (15 novos nesta fase: gorjeta %, link do Google, fechamento, comprovante, fila).
- Banco: 57 verificações (10 novas: link do Google validado; fila só para PDV externo, só quando aprovado, sem duplicar, sobrevive à reabertura, sem processamento em dobro, só o servidor processa).
