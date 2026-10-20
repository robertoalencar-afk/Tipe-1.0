import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { LandingCalculator } from "@/components/tipe/LandingCalculator";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { Eyebrow } from "@/components/tipe/ds";
import { MesaViva } from "@/components/tipe/MesaViva";
import { LiveSimulator } from "@/components/tipe/landing/LiveSimulator";
import { LebreTartaruga } from "@/components/tipe/landing/LebreTartaruga";
import { SimboloTipe } from "@/components/tipe/landing/Marcas";
import mascotThanks from "@/assets/mascot-thanks-hd.webp";
import { Letreiro } from "@/components/tipe/landing/ScrollText";
import { LineReveal, Reveal } from "@/components/tipe/landing/motion";
import {
  AbasHome,
  IntegracoesHome,
  PessoasHome,
  PlanosHome,
  ProdutosHome,
  TopoHome,
} from "@/components/tipe/site/Home";
import { FaixaCta, SitePage } from "@/components/tipe/site/Site";

const TITLE = "Tipe | Pague. Sem esperar. | Pagamento na mesa por QR Code";
const DESCRIPTION =
  "Com a Tipe, o cliente confere a conta, divide o que consumiu e paga com Pix pelo celular, direto na mesa. Sem aplicativo e sem esperar a maquininha. Pré-lançamento com 30 dias grátis para restaurantes.";
const OG_IMAGE =
  "https://tipe.digital/__l5e/assets-v1/702edacf-4438-4472-9693-7bb419095c42/tipe-logo-redondo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tipe.digital/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <SitePage extra={<LazyLebreAssistant />}>
      <span id="principal" aria-hidden />
      <TopoHome />
      <ProdutosHome />
      <Faixas />
      <LebreTartaruga />
      <MesaViva />
      <PessoasHome />
      <AbasHome />
      <Experimente />
      <IntegracoesHome />
      <LandingCalculator />
      <PlanosHome />
      <Duvidas />
      <FaixaCta />
    </SitePage>
  );
}

/* --------------------------------------------------------- Experimente */

function Experimente() {
  const passos = [
    "Toque no QR Code da mesa",
    "Diga seu nome e veja a conta",
    "Escolha o que consumiu ou divida",
    "Pague, avalie e agradeça",
  ];
  return (
    <section id="experimente" className="scroll-mt-16 overflow-hidden py-20 sm:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-24">
        <div>
          <Eyebrow>Experimente agora</Eyebrow>
          <LineReveal
            className="mt-4 font-display text-display"
            lines={["A Mesa 12", "está aberta."]}
          />
          <Reveal delay={120}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              Esse celular roda a Tipe de verdade. Faça o caminho de quem está na mesa, do QR Code
              até a gorjeta. A Mesa 12 é fictícia e fica só no seu navegador.
            </p>
          </Reveal>
          <ol className="mt-9 grid gap-3 sm:grid-cols-2">
            {passos.map((t, i) => (
              <Reveal
                as="li"
                key={t}
                delay={i * 90}
                className="flex items-center gap-3 rounded-2xl bg-background-muted px-4 py-3.5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-medium text-white">
                  {i + 1}
                </span>
                <span className="text-[0.95rem] font-medium">{t}</span>
              </Reveal>
            ))}
          </ol>
          <Link
            to="/simulador"
            className="btn-press mt-8 inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 font-medium hover:border-foreground/40"
          >
            Abrir em tela cheia <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative mx-auto w-[min(86vw,330px)]">
          <div
            aria-hidden
            className="absolute -inset-x-10 inset-y-10 rounded-[4rem] bg-brand-soft"
          />
          <LiveSimulator className="relative" />
          <img
            src={mascotThanks}
            alt=""
            aria-hidden
            loading="lazy"
            className="bob pointer-events-none absolute -bottom-6 -left-16 hidden h-32 w-auto sm:block"
          />
          <p
            aria-hidden
            className="pointer-events-none absolute -right-4 top-24 hidden rotate-[8deg] font-display text-xl font-medium text-brand-strong lg:-right-28 lg:block"
          >
            toque no QR!
            <svg
              viewBox="0 0 80 40"
              className="mt-1 h-8 w-16 -scale-x-100 text-brand-strong"
              fill="none"
            >
              <path
                d="M4 6 C 30 4, 52 14, 70 32 M70 32 L58 30 M70 32 L68 20"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------ Frases em movimento */

function Sep() {
  return <SimboloTipe className="mx-[0.35em] inline-block h-[0.62em] w-auto align-baseline" />;
}

function Faixas() {
  const a = ["Sem chamar o garçom.", "Sem esperar a maquininha.", "Sem fazer conta de cabeça."];
  const b = [
    "Cada um paga o seu.",
    "Pix, Apple Pay e Google Pay.",
    "Gorjeta direto para a equipe.",
  ];
  const linha = (xs: string[]) =>
    [...xs, ...xs].map((t, i) => (
      <span key={i}>
        {t}
        <Sep />
      </span>
    ));
  return (
    <section aria-label="O que muda na mesa" className="pb-10 sm:pb-16">
      <Letreiro
        linhas={[
          linha(a),
          <span key="b" style={{ color: "var(--color-brand-strong)" }}>
            {linha(b)}
          </span>,
        ]}
      />
    </section>
  );
}

/* ----------------------------------------------------------------- FAQ */

const FAQ: { label: string; faqs: [string, string][] }[] = [
  {
    label: "Para quem está na mesa",
    faqs: [
      [
        "Preciso baixar algum aplicativo?",
        "Não. O cliente lê o QR Code da mesa com a câmera do celular e a conta abre no navegador. Ele informa nome e sobrenome na primeira vez; o celular guarda isso para as próximas visitas à mesma mesa.",
      ],
      [
        "Como funciona o QR Code da mesa?",
        "Cada mesa tem um código próprio. Quando o garçom lança um pedido, o item aparece na conta da mesa em tempo real. Se o restaurante trocar o QR Code, o antigo deixa de abrir a mesa.",
      ],
      [
        "Quais formas de pagamento estão disponíveis?",
        "Hoje: Pix, Apple Pay e Google Pay pelo celular, processados pelo Pagar.me, e pagamento no estabelecimento (dinheiro ou maquininha), confirmado pelo caixa. O restaurante escolhe no painel quais formas oferecer.",
      ],
      [
        "Dá para pagar só a minha parte?",
        "Sim. Cada pessoa escolhe o que vai pagar, item por item, ou divide a conta em partes iguais, por valor ou por porcentagem. Os itens pagos saem da conta na hora e a tela mostra quanto ainda falta para fechar a mesa.",
      ],
      [
        "Como funciona a gorjeta extra?",
        "A taxa de serviço é definida pelo restaurante e entra na conta. A gorjeta extra é opcional e aparece depois do pagamento e da avaliação. A Tipe recebe o valor e separa 70% para a equipe do restaurante e 30% como taxa da plataforma. O cliente vê os valores antes de confirmar.",
      ],
    ],
  },
  {
    label: "Para o restaurante",
    faqs: [
      [
        "É seguro?",
        "Os pagamentos digitais são processados pelo Pagar.me e o dinheiro cai direto na conta do restaurante; a Tipe não retém o valor das contas. O sistema protege contra pagamento em duplicidade, confere o valor pago antes de aprovar e registra cada ação com data e responsável.",
      ],
      [
        "Funciona com o meu PDV?",
        "Você pode usar a Tipe completa, lançando os pedidos pelo Lançamento TIPE no próprio painel, ou enviar mesas e itens pela API TIPE. Conectores para outros PDVs estão em desenvolvimento, com integração assistida pela nossa equipe.",
      ],
      [
        "Quanto tempo leva para começar?",
        "A implantação é acompanhada: cadastramos as mesas, geramos os QR Codes para os totens e treinamos a equipe. Dá para começar por um salão e ampliar depois.",
      ],
      [
        "Quanto custa?",
        `Assinatura mensal de acordo com o número de mesas, sem tarifa por transação nas contas; o restaurante paga apenas as tarifas do Pagar.me. Os valores serão divulgados no lançamento e os primeiros restaurantes ganham ${TRIAL_DAYS} dias grátis, sem cartão de crédito.`,
      ],
      [
        "E se um pagamento sair errado?",
        "Pagamentos presenciais podem ser cancelados pelo caixa e os itens voltam para a conta. Estornos e contestações do Pagar.me aparecem como pendência no caixa, com registro de quem resolveu.",
      ],
    ],
  },
];

function Duvidas() {
  return (
    <section id="duvidas" className="scroll-mt-16 bg-background-muted py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <Eyebrow>Dúvidas</Eyebrow>
          <LineReveal
            className="mt-4 font-display text-headline font-normal tracking-display"
            lines={["Perguntou,", "respondemos."]}
          />
          <a
            href="/teste-gratis"
            className="mt-8 inline-flex items-center gap-2 font-medium text-brand-strong hover:underline"
          >
            Ainda com dúvida? Fale com a equipe <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="space-y-10">
          {FAQ.map((g) => (
            <div key={g.label}>
              <Eyebrow tone="muted">{g.label}</Eyebrow>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {g.faqs.map(([q, a]) => (
                  <details key={q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.15rem] font-medium tracking-heading [&::-webkit-details-marker]:hidden">
                      {q}
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface transition-transform duration-300 group-open:rotate-180">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </summary>
                    <p className="-mt-1 pb-5 pr-10 text-[0.98rem] leading-relaxed text-muted-foreground">
                      {a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

