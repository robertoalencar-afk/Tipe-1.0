/** FAQ do Tipe Order multiformato. Só fatos verificados no produto; sem preços. */
export const FAQ_ORDER: [string, string][] = [
  ["Como o Tipe Order funciona?", "O cliente lê o QR Code (mesa, balcão ou pulseira) e o cardápio abre no navegador. Ele pede, a cozinha recebe no Tipe Cozinha e o que foi pedido entra na conta. A conta se paga pelo Tipe Pay."],
  ["Preciso de aplicativo?", "Não. Nem o cliente nem a equipe instalam nada: tudo roda no navegador do celular, do tablet ou do totem."],
  ["Como a equipe libera a mesa?", "No Tipe Equipe, o garçom ou o caixa abre a mesa, com ou sem código de 4 dígitos, conforme a configuração do restaurante. Sem a liberação, o QR só mostra o cardápio."],
  ["O pedido vai direto para a cozinha?", "Nas mesas, comanda e pulseira, sim: ao enviar. No balcão, na retirada e no totem, só depois de o caixa confirmar o pagamento."],
  ["Como o cliente paga?", "Pelo Tipe Pay, com Apple Pay, Google Pay, Pix ou no estabelecimento. Não há cartão digitado. O Tipe Pay é o único gateway do pedido, inclusive no totem."],
  ["Posso ter mais de uma modalidade ao mesmo tempo?", "Sim. O cadastro de cardápio é um só; o restaurante escolhe em Tipe Gestão → Configurações → Atendimento quais formatos ficam ligados. Só modalidades prontas podem ser ligadas."],
  ["Quanto tempo leva para implantar?", "Mesas: o cardápio, as mesas e o QR Code são configurados no Tipe Gestão e a equipe treina em uma tarde. As outras modalidades entram conforme a disponibilidade de cada uma."],
  ["O que é a Tipe Pulseira?", "Uma pulseira NFC, gravada pela Tipe e numerada, ligada a uma comanda individual. O cliente aproxima o celular (ou lê o QR da pulseira) para pedir e pagar. Está em planejamento."],
  ["Como a pulseira funciona?", "Cada pulseira tem um endereço seguro próprio. Na entrada, a equipe ativa e vincula a pulseira a uma comanda; no fim, a comanda é paga pelo Tipe Pay e a pulseira é encerrada e pode ser reutilizada."],
  ["Preciso gravar as pulseiras?", "Não. A Tipe entrega as pulseiras já gravadas. No Tipe Gestão → Pulseiras você só ativa, vincula, bloqueia e reutiliza; a Central Tipe emite os lotes."],
  ["A pulseira funciona em qualquer celular?", "NFC: Android com NFC ligado e iPhone (7 em diante) leem a etiqueta aproximando o celular. Sem NFC, o QR Code impresso na pulseira abre o mesmo endereço."],
  ["Como o garçom encontra o cliente no evento?", "Pelo Tipe Localiza: o restaurante desenha o mapa do evento em setores; o cliente informa o setor e, se quiser, compartilha a localização do celular durante o atendimento. O Tipe Equipe mostra setor, precisão e última atualização. NFC não rastreia ninguém, e GPS é impreciso em ambiente fechado."],
  ["E se o cliente perder a pulseira?", "A equipe bloqueia a pulseira no Tipe Gestão e a comanda continua aberta no nome do cliente. O número da pulseira sozinho nunca autoriza acesso nem pagamento."],
  ["O que custa e o que preciso ter?", "Os valores vêm na proposta da equipe da Tipe. Para mesas, basta cardápio cadastrado, QR Codes e o Tipe Pay ativo. Totem e pulseira dependem de equipamento e entram conforme a disponibilidade."],
];
