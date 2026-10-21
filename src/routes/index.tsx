import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { LandingCalculator } from "@/components/tipe/LandingCalculator";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { Eyebrow } from "@/components/tipe/ds";
import { LebreTartaruga } from "@/components/tipe/landing/LebreTartaruga";
import { LineReveal, Reveal } from "@/components/tipe/landing/motion";
import { IntegracoesHome, PlanosHome, ProdutosHome, TopoHome } from "@/components/tipe/site/Home";
import { CarrosselHistorias } from "@/components/tipe/site/CarrosselHistorias";
import { CtaVibrante } from "@/components/tipe/site/CtaVibrante";
import { FluxoPagamento } from "@/components/tipe/site/FluxoPagamento";
import { NumerosHome } from "@/components/tipe/site/NumerosHome";
import { StaffHome } from "@/components/tipe/site/StaffHome";
import { Fios } from "@/components/tipe/site/Bigode";
import { SitePage } from "@/components/tipe/site/Site";

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
      <CarrosselHistorias />
      <FluxoPagamento />
      <LebreTartaruga />
      <StaffHome />
      <NumerosHome />
      <IntegracoesHome />
      <LandingCalculator />
      <PlanosHome />
      <Duvidas />
      <CtaVibrante />
    </SitePage>
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
        "A taxa de serviço é definida pelo restaurante e entra na conta; pela Lei 13.419/2017, gorjeta e taxa de serviço pertencem aos trabalhadores. A gorjeta extra é opcional, nunca vem marcada, e o cliente vê o valor antes de confirmar. A Tipe recebe a gorjeta extra e separa 70% para quem atendeu e 30% como taxa da plataforma.",
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
        "De onde vêm os números da página?",
        "De fontes públicas: Banco Central do Brasil, Abecs e Abrasel, com o link de cada estudo ao lado do número. São dados de mercado, não resultados da Tipe, que está em pré-lançamento.",
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
            className="com-fios mt-8 inline-flex items-center gap-2 font-medium text-brand-strong"
          >
            Ainda com dúvida? Fale com a equipe <ArrowRight className="seta h-4 w-4" />
            <Fios intensidade="leve" />
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

