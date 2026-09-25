# Ajuste do fluxo do cliente TIPE

## O que será alterado

- Usar a logomarca oficial já enviada em todas as etapas, mantendo-a como elemento principal.
- Inserir uma etapa logo após a leitura do QR Code para o cliente informar o nome antes de acessar a mesa.
- Exibir na conta o nome do cliente e a mensagem “Você está sendo atendido por Carlos”, usando o garçom vinculado à mesa.
- Preservar a página atual da conta, incluindo as abas Conta e Atividade e a seleção de quantidades por caixa suspensa.
- Separar o fluxo financeiro em duas cobranças:
  1. pagamento da conta e da taxa de serviço de 10%, destinado ao restaurante e vinculado ao pedido no PDV;
  2. após a confirmação, avaliação do atendimento e oferta de gorjeta extra opcional, cobrada separadamente pela TIPE.
- Informar com clareza que a gorjeta extra é opcional e que seu repasse ao garçom será controlado posteriormente pela TIPE (70% garçom e 30% TIPE).
- Permitir concluir sem gorjeta e mostrar uma confirmação final personalizada com o nome do cliente.

## Comportamento da demonstração

- A cobrança da conta e a cobrança da gorjeta continuarão simuladas enquanto as integrações reais não forem configuradas.
- Os dois pagamentos terão ações e confirmações independentes, evitando somar a gorjeta ao valor enviado ao restaurante.
- O registro de pedidos continuará mostrando pessoa, data e horário em uma aba separada.

## Detalhes técnicos

- Ajustar o estado da página da mesa para as etapas: identificação, conta, pagamento da conta, confirmação, avaliação, gorjeta opcional, pagamento da gorjeta e encerramento.
- Enviar a primeira cobrança sem gorjeta para o fluxo do restaurante/PDV.
- Enviar a segunda cobrança, quando escolhida, como transação separada destinada à TIPE.
- Atualizar os textos de compartilhamento da página da mesa e validar o fluxo completo em tela grande e celular.
