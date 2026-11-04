// Central de ajuda (/ajuda): perguntas frequentes por assunto. Só descreve o que o produto
// faz hoje; o que está em desenvolvimento aparece como tal. Textos jurídicos completos
// ficam na Central Jurídica (/legal), que é a fonte oficial.
import { PRIVACY_EMAIL } from "@/lib/tipe/legal";

export type Pergunta = { p: string; r: string; link?: { href: string; texto: string } };
export type Assunto = { id: string; titulo: string; perguntas: Pergunta[] };

export const AJUDA: Assunto[] = [
  {
    id: "mesa",
    titulo: "Na mesa",
    perguntas: [
      { p: "Preciso baixar algum aplicativo?", r: "Não. Você lê o QR Code da mesa com a câmera do celular e a conta abre no navegador. Na primeira vez você informa nome e sobrenome; o celular guarda isso para as próximas visitas à mesma mesa." },
      { p: "O QR Code não abre a conta. O que faço?", r: "Confira se a câmera leu o código inteiro e se a internet está funcionando. Se aparecer que a mesa está fechada, o garçom ainda não abriu a conta ou ela já foi paga. Peça ao garçom para abrir a mesa ou trocar o código." },
      { p: "Dá para pagar só a minha parte?", r: "Sim. Escolha os itens que você consumiu ou divida em partes iguais, por valor ou por porcentagem. Os itens pagos saem da conta na hora e a tela mostra quanto falta para fechar a mesa." },
      { p: "A conta mostra um item que eu não pedi.", r: "Não pague esse item e chame o garçom. Só a equipe do restaurante corrige ou cancela itens lançados." },
    ],
  },
  {
    id: "pagamento",
    titulo: "Pagamentos e estornos",
    perguntas: [
      { p: "Quais formas de pagamento posso usar?", r: "Pix, Apple Pay e Google Pay pelo celular, processados pelo Pagar.me, e pagamento no estabelecimento (dinheiro ou maquininha), confirmado pelo caixa. Cada restaurante escolhe quais formas oferecer. A Tipe não pede o número do cartão na conta." },
      { p: "Paguei, mas a conta ainda aparece aberta.", r: "O pagamento só é aprovado quando o Pagar.me confirma, o que costuma levar poucos segundos no Pix. Não pague de novo: a Tipe bloqueia pagamento em duplicidade e a tela atualiza sozinha. Se passar de alguns minutos, mostre o comprovante ao caixa." },
      { p: "Fui cobrado duas vezes ou quero um estorno.", r: "Fale com o restaurante: o caixa vê cada pagamento com nome, itens, valor e hora e pode pedir o estorno. Estornos e contestações do Pagar.me aparecem como pendência no painel do restaurante até alguém resolver, com registro de quem resolveu. Se o restaurante não resolver, escreva para a Tipe pelo WhatsApp." },
      { p: "Como funciona a gorjeta extra?", r: "Ela aparece depois que a conta está paga, como um segundo pagamento separado. É opcional, nunca vem marcada, e você vê o valor antes de confirmar. A taxa de serviço, quando existe, é definida pelo restaurante e entra na conta; pela Lei 13.419/2017, gorjeta e taxa de serviço pertencem aos trabalhadores." },
      { p: "Meus dados de pagamento ficam com a Tipe?", r: "Não. Os pagamentos digitais são processados pelo Pagar.me. A Tipe guarda o registro do pagamento (valor, itens, hora e status) para a conta da mesa e para o restaurante, sem dados de cartão." },
    ],
  },
  {
    id: "restaurante",
    titulo: "Para restaurantes",
    perguntas: [
      { p: "Como começo a usar a Tipe?", r: "Crie a conta do restaurante em Teste grátis, com CNPJ e endereço, e conecte o PDV no primeiro acesso. A implantação é acompanhada: cadastramos as mesas, geramos os QR Codes e treinamos a equipe.", link: { href: "/teste-gratis", texto: "Começar o teste grátis" } },
      { p: "Funciona com o meu PDV?", r: "Você pode lançar os pedidos pelo Lançamento TIPE, no próprio painel, ou enviar mesas e itens pela API TIPE. Conectores para outros PDVs estão em desenvolvimento, com integração assistida pela nossa equipe.", link: { href: "/integracoes", texto: "Ver integrações" } },
      { p: "Quando o dinheiro cai na minha conta?", r: "Os pagamentos digitais vão para a conta de recebimento do restaurante no Pagar.me, nos prazos do Pagar.me. A Tipe não retém o valor das contas. Pagamentos no estabelecimento ficam com o restaurante e só entram no relatório depois que o caixa confirma." },
      { p: "Como convido garçons e a equipe do caixa?", r: "No painel, em Equipe e garçons, o dono convida cada pessoa pelo e-mail e escolhe o papel. Cada um entra com a própria senha; garçons veem só a área deles, com gorjetas e saques." },
      { p: "O que acontece se eu passar do limite de mesas do plano?", r: "As mesas acima do limite não abrem novas contas. É só mudar de plano para liberar.", link: { href: "/precos", texto: "Ver planos" } },
    ],
  },
  {
    id: "conta",
    titulo: "Conta e segurança",
    perguntas: [
      { p: "Esqueci minha senha.", r: "Em Entrar, toque em \"Esqueci a senha\" e informe seu e-mail. O link de redefinição vale por pouco tempo; se expirar, peça outro.", link: { href: "/entrar", texto: "Ir para Entrar" } },
      { p: "Quais são as regras de senha?", r: "Pelo menos 10 caracteres, com letras e números, sem usar seu nome ou e-mail e fora das senhas mais comuns. Uma frase curta é fácil de lembrar e difícil de adivinhar. Senhas que apareceram em vazamentos conhecidos podem ser recusadas." },
      { p: "Como ativo a verificação em duas etapas?", r: "No painel do restaurante, abra Segurança da conta e toque em Ativar. Leia o QR Code com um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password ou Authy) e digite o código. Garçons encontram a mesma opção em Saques e Pix. Guarde os códigos de recuperação que aparecem no fim." },
      { p: "Perdi o celular com o autenticador.", r: "Na tela do código, toque em \"Perdi o acesso ao aplicativo\" e use um dos códigos de recuperação. Cada código funciona uma vez e remove o autenticador antigo para você cadastrar outro. Sem os códigos, fale com a Tipe pelo WhatsApp: vamos confirmar sua identidade antes de liberar." },
      { p: "Recebi um e-mail ou mensagem pedindo minha senha.", r: "A Tipe nunca pede senha, código do autenticador ou código de recuperação por e-mail, WhatsApp ou telefone. Não responda e nos avise." },
    ],
  },
  {
    id: "privacidade",
    titulo: "Privacidade, cookies e seus dados",
    perguntas: [
      { p: "Quais cookies a Tipe usa?", r: "Os necessários para o site funcionar (sessão, segurança e suas escolhas) ficam sempre ligados. Medição e marketing só carregam se você permitir, e você muda a escolha quando quiser em Preferências de privacidade, no rodapé do site.", link: { href: "/legal/cookies", texto: "Ler a Política de Cookies" } },
      { p: "Como peço acesso, correção ou exclusão dos meus dados?", r: `Pela LGPD você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão. Faça o pedido no formulário da Central Jurídica ou pelo e-mail ${PRIVACY_EMAIL}. Respondemos no prazo da lei.`, link: { href: "/legal/seus-direitos#solicitacao", texto: "Fazer um pedido sobre meus dados" } },
      { p: "Onde estão os termos e a política de privacidade?", r: "Na Central Jurídica, em linguagem simples, com histórico de versões: Termos de Uso, Termos para Parceiros, Privacidade, Cookies, Inteligência Artificial e Seus direitos.", link: { href: "/legal", texto: "Abrir a Central Jurídica" } },
      { p: "A Lebre (assistente) usa inteligência artificial?", r: "Sim. Perguntas simples são respondidas por regras, sem IA. As demais vão para provedores de IA, sem dados de pagamento. Os detalhes estão no livro de Inteligência Artificial da Central Jurídica.", link: { href: "/legal/inteligencia-artificial", texto: "Ler sobre IA" } },
    ],
  },
];
