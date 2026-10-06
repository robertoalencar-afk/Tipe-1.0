# Ajustar a Lebre e o pagamento em dinheiro

## O que será alterado

- Reposicionar e reduzir o botão flutuante da Lebre no celular para que ele não cubra o menu inferior da área do restaurante.
- Separar “Dinheiro” e “Maquininha” dentro do pagamento no estabelecimento.
- Ao escolher dinheiro, pedir quanto o cliente entregará, validar que o valor cobre a conta e mostrar o troco calculado antes da confirmação.
- Registrar forma presencial, valor entregue e troco junto ao pagamento para o garçom e o caixa visualizarem no painel.
- Repetir o mesmo comportamento no simulador, sem conectá-lo aos dados reais.

## Validação

- Conferir o fluxo em celular e desktop.
- Confirmar que o botão da Lebre não sobrepõe a navegação.
- Testar dinheiro com valor insuficiente, valor exato e valor com troco, além de maquininha.

## Detalhes técnicos

- Adicionar campos opcionais ao registro de pagamentos presenciais, mantendo compatibilidade com pagamentos existentes.
- Validar os novos valores no navegador, no servidor e no banco de dados.
- Exibir essas informações apenas para pagamentos da conta feitos no estabelecimento.
