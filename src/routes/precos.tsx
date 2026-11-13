import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Headphones, QrCode, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { PUBLIC_PRICING } from "@/lib/tipe/plans";
import { Reveal } from "@/components/tipe/landing/motion";
import { CardsPlanos, ComparacaoPlanos } from "@/components/tipe/site/Planos";
import { FaixaCta, Secao, SitePage, Titulo } from "@/components/tipe/site/Site";

const TITLE = "Preços · Planos por número de mesas, sem tarifa por transação | Tipe";
const DESC = PUBLIC_PRICING;

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://tipe.digital/precos" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/precos" }],
  }),
  component: Precos,
});

const SEMPRE = [
  [QrCode, "QR Code em cada mesa"],
  [Smartphone, "Conta e divisão pelo celular"],
  [Wallet, "Dinheiro direto na sua conta"],
  [BarChart3, "Painel em tempo real"],
  [ShieldCheck, "Sem taxa para o cliente"],
  [Headphones, "Implantação acompanhada"],
] as const;

const PERGUNTAS: [string, string][] = [
  [
    "A Tipe cobra por transação?",
    "Não. Você paga a assinatura pelo número de mesas. O restaurante paga apenas as tarifas do provedor de pagamento nos pagamentos digitais.",
  ],
  [
    "Tem fidelidade?",
    "Os planos mensais não têm fidelidade. A implantação custa R$ 200 no Essencial e no Profissional e é grátis a partir do Premium.",
  ],
  [
    "Como contratar?",
    `Conheça os planos e solicite uma demonstração com a equipe Tipe. A gente cadastra as mesas e treina a equipe com você.`,
  ],
  [
    "E se eu passar do limite de mesas?",
    "As mesas acima do limite do plano não abrem novas contas. É só mudar de plano para liberar.",
  ],
];

function Precos() {
  return (
    <SitePage>
      <Secao tema="claro" className="-mt-16 !pt-32 sm:!pt-40">
        <div className="container-page">
          <Titulo
            as="h1"
            centro
            rotulo="Planos"
            titulo="Um plano para cada tamanho de restaurante."
            texto={`A assinatura é pelo número de mesas, sem tarifa da Tipe por transação. Implantação única de R$ 200 no Essencial e no Profissional; grátis a partir do Premium. Pagamentos digitais têm custos do provedor e dependem de habilitação e validação por restaurante.`}
          />
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 text-[0.95rem]">
            {[
              "Sem tarifa da Tipe por transação",
              "Sem taxa para o cliente",
              "Mensal sem fidelidade",
              `Implantação acompanhada`,
            ].map((t) => (
              <li key={t} className="rounded-full border border-border px-4 py-2">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <CardsPlanos />
          </div>
        </div>
      </Secao>
      <Secao tema="escuro">
        <div className="container-page">
          <Titulo centro titulo="Order, Equipe e Cozinha em todos os planos." />
          <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {SEMPRE.map(([I, t], i) => (
              <Reveal as="li" key={t} delay={i * 90} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border">
                  <I className="h-6 w-6 text-brand" />
                </span>
                <p className="mx-auto mt-4 max-w-[10rem] text-[0.98rem] font-medium">{t}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Secao>
      <Secao tema="claro">
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 [&>*]:min-w-0">
          <Titulo titulo="Tudo nos detalhes." texto="Compare o que cada plano inclui." />
          <ComparacaoPlanos />
        </div>
      </Secao>
      <Secao tema="claro" className="!pt-0">
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 [&>*]:min-w-0">
          <Titulo titulo="Perguntas sobre preço." />
          <div className="divide-y divide-border border-y border-border">
            {PERGUNTAS.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.2rem] font-medium tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-2xl leading-none transition-transform duration-500 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 pr-10 leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Secao>
      <FaixaCta />
    </SitePage>
  );
}
