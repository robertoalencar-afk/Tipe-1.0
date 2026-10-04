# Divisão simples de itens e mascotes legíveis

## O que será alterado

- Manter a seleção atual por quantidade para itens individuais.
- Adicionar em cada item a ação discreta **“Dividir este item”**.
- Ao tocar, mostrar opções simples para pagar **metade**, **1/3**, **1/4** ou **todo o restante** daquele item.
- Combinar, quando necessário, unidades inteiras com uma fração sem criar uma tela separada nem poluir a lista.
- Exibir a escolha em linguagem natural, como “1 unidade + metade”, e calcular automaticamente item, serviço e total.
- Mostrar as frações também no histórico de pagamentos de forma compreensível.

## Segurança e funcionamento compartilhado

- Permitir quantidades fracionadas na conta compartilhada e no registro de pagamentos.
- Recalcular o valor no servidor e bloquear a fração no momento do pagamento, como já acontece com unidades inteiras.
- Preservar concorrência, idempotência, pagamentos pendentes e atualização em tempo real entre celulares.
- Aplicar o mesmo comportamento ao simulador isolado.

## Mascotes

- Corrigir os arquivos dos quatro coelhos usados no aplicativo, preenchendo o corpo de branco e preservando contornos, detalhes e transparência externa.
- Usar as versões corrigidas em todas as telas, inclusive simulador e landing page, para manter boa leitura em fundos claros e escuros.

## Validação

- Testar divisão por 2, 3 e 4 pessoas, combinação de unidade inteira com fração e pagamento do restante.
- Conferir atualização da conta e do histórico após pagamento aprovado e pendente.
- Revisar visualmente os mascotes e o fluxo em celular e desktop.
