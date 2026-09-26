import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo-dark.png.asset.json";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso e Privacidade — TIPE" },
      {
        name: "description",
        content:
          "Termos de uso e política de privacidade do aplicativo TIPE: pagamento de contas de restaurantes pelo celular.",
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
    title: "1. O que é o TIPE",
    paragraphs: [
      "O TIPE é um aplicativo de pagamento na mesa para restaurantes. A partir do QR Code do totem da mesa, o cliente visualiza a conta lançada pelo estabelecimento, escolhe os itens que vai pagar, seleciona o meio de pagamento e, se quiser, deixa uma gorjeta extra para o atendimento.",
      "O serviço é operado pela TIPE, com sede em Fortaleza, CE. Ao usar o aplicativo, você concorda com estes Termos de Uso e com a Política de Privacidade abaixo.",
    ],
  },
  {
    title: "2. Sua identificação na mesa",
    paragraphs: [
      "Ao acessar uma mesa, o TIPE pede seu nome e sobrenome para identificar os pagamentos que você fez. Essa identificação fica guardada no seu aparelho e vale para aquela mesa: quando voltar, você não precisa informar o nome novamente.",
      "Os pedidos lançados na conta não identificam a pessoa — eles mostram apenas os itens, a data e o horário. O nome do cliente aparece somente nos pagamentos, junto com os itens pagos, o valor, a data e o horário.",
    ],
  },
  {
    title: "3. Pagamentos e responsabilidade",
    paragraphs: [
      "Ao confirmar um pagamento no aplicativo, você declara que está pagando o valor exibido, referente aos itens selecionados, e assume a responsabilidade por esse pagamento.",
      "Você deve conferir a conta antes de pagar. Caso identifique um item errado ou algum lançamento que você não consumiu, procure o garçom ou o caixa do restaurante antes de concluir o pagamento.",
    ],
    bullets: [
      "Pagamentos digitais concluídos no aplicativo (Pix, carteira digital) são registrados como aprovados imediatamente.",
      "Pagamentos feitos no estabelecimento (dinheiro ou maquininha) ficam com status \"pendente de confirmação\" até o restaurante confirmar o recebimento no sistema.",
      "Quando um pagamento é cancelado pelo restaurante, os itens pagos voltam a ficar disponíveis na conta.",
    ],
  },
  {
    title: "4. Gorjetas",
    paragraphs: [
      "A gorjeta extra é opcional e voluntária. Ela é paga obrigatoriamente por meio digital, é confirmada automaticamente e não entra na conta do restaurante.",
      "Os percentuais de distribuição da gorjeta entre o atendente e o TIPE são informados na tela de pagamento, no momento do pagamento.",
    ],
  },
  {
    title: "5. Política de Privacidade",
    paragraphs: [
      "O TIPE coleta apenas os dados necessários para funcionar: nome e sobrenome informados na identificação da mesa, registro dos pedidos e pagamentos da mesa e, quando você envia um contato pelo site, o nome do restaurante, o seu nome, o e-mail, o WhatsApp e a mensagem que você digitou.",
      "Os dados de pagamento não são armazenados pelo TIPE: eles são processados diretamente pelos provedores de pagamento autorizados (como Pix, carteiras digitais e adquirentes). O TIPE guarda apenas o registro do valor, dos itens pagos e do status do pagamento.",
      "Você pode solicitar a correção ou a exclusão dos seus dados pessoais a qualquer momento, conforme a Lei Geral de Proteção de Dados (LGPD), pelos canais de contato informados no final deste documento.",
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
      "Estes termos podem ser atualizados para refletir novas funcionalidades. A versão vigente está sempre nesta página.",
      "Dúvidas, solicitações sobre seus dados ou relatos de problemas: fale com a equipe pela página inicial, em tipe.digital/fale-conosco, ou escreva para contato@tipe.digital.",
    ],
  },
];

function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para a página inicial
        </Link>
        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
          <img src={logo.url} alt="TIPE" className="h-12 w-auto object-contain" />
          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Termos de Uso e Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 26 de setembro de 2026
          </p>

          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-xl font-semibold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 24)} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
