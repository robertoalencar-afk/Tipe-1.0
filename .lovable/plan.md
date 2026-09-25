# Corrigir retorno e encerramento da mesa

## O que será feito
- Impedir que a tela de nome apareça enquanto a identificação salva está sendo recuperada.
- Retomar diretamente a conta ao abrir novamente o QR da mesma mesa.
- Detectar a mesa encerrada quando não houver itens restantes nem pagamentos pendentes.
- Exibir uma tela própria de mesa encerrada, com um novo mascote TIPE contextual.
- Manter a atualização em tempo real para que a tela mude assim que o último pagamento for confirmado.

## Detalhes técnicos
- A identificação terá um estado inicial de carregamento, evitando alternância visual entre nome e conta.
- O encerramento será calculado pelo saldo compartilhado dos itens e pelos status dos pagamentos da conta.
- A nova tela será incluída no fluxo atual sem alterar as etapas de pagamento, avaliação ou gorjeta.
- O comportamento será conferido no retorno pelo início e em tamanhos de tela móvel e desktop.
