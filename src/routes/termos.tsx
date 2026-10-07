import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/tipe/LegalPage";
import { COMPANY, LEGAL } from "@/lib/tipe/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — TIPE" },
      {
        name: "description",
        content:
          "Termos de uso da plataforma TIPE para pagamento de contas de restaurantes pelo celular.",
      },
      { property: "og:title", content: "Termos de Uso — TIPE" },
      {
        property: "og:description",
        content: "Regras de uso do TIPE, responsabilidade pelos pagamentos e proteção dos seus dados.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tipe.digital/termos" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/termos" }],
  }),
  component: TermosPage,
});

const sections: { title: string; paragraphs: string[]; bullets?: string[] }[] = [
  {
    title: "1. O que é a TIPE",
    paragraphs: [
      "A TIPE é uma plataforma de pagamento na mesa para restaurantes. A partir do QR Code do totem da mesa, o cliente visualiza a conta lançada pelo estabelecimento, escolhe os itens que vai pagar, seleciona o meio de pagamento e, se quiser, deixa uma gorjeta extra para o atendimento.",
      `O serviço é operado por ${COMPANY.legalName}, inscrita no CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.city}. Ao usar a plataforma, você concorda com estes Termos de Uso e com a Política de Privacidade abaixo.`,
    ],
  },
  {
    title: "2. Sua identificação na mesa",
    paragraphs: [
      "Ao acessar uma mesa, a TIPE pede seu nome e sobrenome para identificar os pagamentos que você fez. Essa identificação fica guardada no seu aparelho e vale para aquela mesa: quando voltar, você não precisa informar o nome novamente.",
      "Os pedidos lançados na conta não identificam a pessoa — eles mostram apenas os itens, a data e o horário. O nome do cliente aparece somente nos pagamentos, junto com os itens pagos, o valor, a data e o horário.",
    ],
  },
  {
    title: "3. Pagamentos e responsabilidade",
    paragraphs: [
      "Ao confirmar um pagamento na plataforma, você declara que está pagando o valor exibido, referente aos itens selecionados, e assume a responsabilidade por esse pagamento.",
      "Você deve conferir a conta antes de pagar. Caso identifique um item errado ou algum lançamento que você não consumiu, procure o garçom ou o caixa do restaurante antes de concluir o pagamento.",
    ],
    bullets: [
      "Pagamentos digitais concluídos na plataforma (Pix, carteira digital) são registrados como aprovados imediatamente.",
      "Pagamentos feitos no estabelecimento (dinheiro ou maquininha) ficam com status \"pendente de confirmação\" até o restaurante confirmar o recebimento no sistema.",
      "Quando um pagamento é cancelado pelo restaurante, os itens pagos voltam a ficar disponíveis na conta.",
    ],
  },
  {
    title: "4. Gorjetas",
    paragraphs: [
      "A gorjeta extra é opcional e voluntária. Ela é paga obrigatoriamente por meio digital, é confirmada automaticamente e não entra na conta do restaurante.",
      "A divisão automática da gorjeta está em validação técnica com o Pagar.me e será informada antes do lançamento.",
    ],
  },
  {
    title: "5. Privacidade",
    paragraphs: [
      "O tratamento de dados pessoais está descrito na Política de Privacidade (tipe.digital/privacidade) e na Política de Cookies (tipe.digital/cookies). Para exercer seus direitos, use tipe.digital/privacidade/solicitacao.",
    ],
  },
  {
    title: "5.1 Erros, cancelamentos e estornos",
    paragraphs: [
      "Se um pagamento for cancelado pelo restaurante, os itens voltam para a conta. Cobranças indevidas ou em duplicidade devem ser comunicadas ao restaurante e ao TIPE pelos canais de contato; estornos seguem as regras do meio de pagamento e a legislação de defesa do consumidor.",
      "A TIPE emprega esforços para manter o serviço disponível, mas poderá haver indisponibilidades; nesse caso, o pagamento pode ser feito diretamente no estabelecimento.",
    ],
  },
  {
    title: "6. Uso aceitável",
    paragraphs: [
      "É proibido usar o TIPE para tentar enganar o restaurante, alterar artificialmente valores, automatizar leituras de QR Code sem estar presente na mesa ou qualquer outra prática que prejudique o estabelecimento, outros clientes ou a operação do serviço.",
    ],
  },
  {
    title: "7. Restaurantes parceiros",
    paragraphs: [
      "Os restaurantes parceiros são responsáveis pela exatidão da conta lançada no sistema (itens, preços e taxa de serviço) e pela confirmação dos pagamentos recebidos no estabelecimento. O TIPE espelha as informações do sistema do restaurante e processa os pagamentos digitais que o cliente autoriza.",
    ],
  },
  {
    title: "8. Alterações e contato",
    paragraphs: [
      "Estes termos podem ser atualizados; cada alteração relevante gera nova versão com data de vigência. A marca, o software e os mascotes do TIPE são protegidos por propriedade intelectual. Aplica-se a legislação brasileira, incluindo o Código de Defesa do Consumidor.",
      "Dúvidas, solicitações sobre seus dados ou relatos de problemas: fale com a equipe pela página inicial, em tipe.digital/fale-conosco, ou escreva para contato@tipe.digital.",
    ],
  },
];

function TermosPage() {
  return <LegalPage title="Termos de Uso" version={LEGAL.consumer_terms.version} effective={LEGAL.consumer_terms.effective} sections={sections} />;
}
