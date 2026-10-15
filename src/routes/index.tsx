import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChefHat,
  ChevronDown,
  CreditCard,
  HandCoins,
  Heart,
  History,
  LayoutGrid,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES, TRIAL_DAYS, priceLabel } from "@/lib/tipe/plans";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingCalculator } from "@/components/tipe/LandingCalculator";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { Eyebrow, PhoneFrame } from "@/components/tipe/ds";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { DashboardPreview, WaiterPreview } from "@/components/tipe/landing/PanelPreviews";
import { FilmeMesa } from "@/components/tipe/landing/FilmeMesa";
import { EditorialPhoto } from "@/components/tipe/landing/EditorialPhoto";
import { LineReveal, Reveal, useParallax } from "@/components/tipe/landing/motion";
import { money } from "@/components/tipe/landing/ProductScreens";
import mascotWaiting from "@/assets/mascot-waiting-hd.webp";
import mascotThanks from "@/assets/mascot-thanks-hd.webp";
import { cn } from "@/lib/utils";

const TITLE = "TIPE | Pague. Sem esperar. | Pagamento na mesa por QR Code";
const DESCRIPTION =
  "Com a TIPE, o cliente confere a conta, divide o que consumiu e paga com Pix pelo celular, direto na mesa. Sem aplicativo e sem esperar a maquininha. Pré-lançamento com 30 dias grátis para restaurantes.";
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
      { name: "theme-color", content: "#fbfcfd" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo">
        <span id="principal" aria-hidden />
        <Hero />
        <Problema />
        <FilmeMesa />
        <NaMesa />
        <QuemAtende />
        <QuemGerencia />
        <Ecossistema />
        <LandingCalculator />
        <Planos />
        <Duvidas />
        <Conversao />
      </main>
      <LandingFooter />
      <LazyLebreAssistant />
    </div>
  );
}

/* ------------------------------------------------------------ Peças */

function CtaPrimary({
  href = "#demonstracao",
  children,
  className,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "btn-press group inline-flex h-13 items-center gap-2 rounded-full bg-ink px-7 text-[1.02rem] font-semibold text-white shadow-[0_12px_30px_-12px_oklch(0.2_0.04_250/0.6)] hover:bg-ink-soft",
        className,
      )}
    >
      {children}
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-ink transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </a>
  );
}

/** Rabisco desenhado à mão (original): três traços de "brilho" ao lado de um elemento. */
function Spark({ className, delay = 900 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn("doodle", className)}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      <path
        pathLength={1}
        d="M8 22 C10 16 11 11 11 5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        pathLength={1}
        d="M17 26 C22 20 27 16 33 13"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        pathLength={1}
        d="M19 35 C24 34 29 34 35 35"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Notificação "de vidro" sobre fotos, com o vocabulário real do produto. */
function Toast({
  icon,
  title,
  text,
  className,
  style,
  tone = "light",
}: {
  icon: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: "light" | "dark";
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_20px_40px_-20px_oklch(0.2_0.04_250/0.45)] backdrop-blur-xl",
        tone === "light"
          ? "border-white/60 bg-white/80 text-foreground"
          : "border-white/15 bg-ink/55 text-white",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9rem] font-semibold leading-tight">{title}</span>
        {text && (
          <span
            className={cn(
              "mt-0.5 block text-xs",
              tone === "light" ? "text-muted-foreground" : "text-white/65",
            )}
          >
            {text}
          </span>
        )}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16">
      <div className="container-page grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:pb-24 lg:pt-14">
        <div className="max-w-[44rem] lg:order-2">
          <p className="hero-in inline-flex items-center gap-2 font-display text-lg font-semibold tracking-heading text-brand-strong sm:text-xl">
            Tipe <span className="text-foreground/30">—</span> Pague. Sem esperar.
          </p>
          <h1 className="mt-5 font-display text-[clamp(2.9rem,1.4rem+4.4vw,5.1rem)] font-semibold leading-[0.95] tracking-display">
            <span className="hero-in block" style={{ "--d": "80ms" } as CSSProperties}>
              A conta chega.
            </span>
            <span className="hero-in block" style={{ "--d": "180ms" } as CSSProperties}>
              A espera{" "}
              <span className="relative inline-block">
                não.
                <Spark className="absolute -right-[0.62em] top-[-0.08em] h-[0.5em] w-[0.5em] text-highlight" />
              </span>
            </span>
          </h1>
          <p
            className="hero-in mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
            style={{ "--d": "280ms" } as CSSProperties}
          >
            O cliente aponta a câmera para o QR Code da mesa, divide a conta e paga com Pix, Apple
            Pay ou Google Pay. Sem baixar aplicativo e sem esperar a maquininha.
          </p>
          <div
            className="hero-in mt-8 flex flex-wrap items-center gap-3"
            style={{ "--d": "380ms" } as CSSProperties}
          >
            <CtaPrimary>Quero a Tipe no meu restaurante</CtaPrimary>
            <Link
              to="/simulador"
              className="btn-press inline-flex h-13 items-center rounded-full border border-border bg-surface px-6 font-semibold hover:border-foreground/25"
            >
              Testar o simulador
            </Link>
          </div>
          <p
            className="hero-in mt-6 text-sm text-muted-foreground"
            style={{ "--d": "460ms" } as CSSProperties}
          >
            Pré-lançamento · {TRIAL_DAYS} dias grátis para os primeiros restaurantes · Sem taxa para
            o cliente
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:order-1 lg:ml-0">
          <EditorialPhoto
            scene="garcom"
            priority
            alt="Garçom sorrindo enquanto olha o relógio, com a bandeja na mão, em um restaurante movimentado"
            aspect="4/5"
            sizes="(min-width: 1024px) 34rem, 92vw"
            position="50% 30%"
            radius="2.25rem"
          />
          <div className="absolute -left-3 top-6 w-[min(80%,20rem)] space-y-2.5 sm:-left-8 lg:-left-10">
            <Toast
              className="pop-in"
              tone="dark"
              style={{ "--d": "700ms" } as CSSProperties}
              icon={<Check className="h-4 w-4" strokeWidth={3} />}
              title="Mesa 12 · conta paga"
              text="+ R$ 10 de gorjeta extra"
            />
            <Toast
              className="pop-in max-sm:hidden"
              tone="dark"
              style={{ "--d": "1000ms" } as CSSProperties}
              icon={<Users className="h-4 w-4" />}
              title="Ana pagou a parte dela"
              text="Pix aprovado · faltam R$ 99,93"
            />
          </div>
          <Toast
            className="pop-in absolute -bottom-5 right-3 w-[15rem] sm:-right-6"
            tone="dark"
            style={{ "--d": "1300ms" } as CSSProperties}
            icon={<Star className="h-4 w-4 fill-current" />}
            title="Atendimento 5 estrelas"
            text="Mesa 7 avaliou o Rafael"
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Problema */

function Problema() {
  const falas = [
    { quem: "Mesa 12", t: "Moço, a conta, por favor!", lado: "l" },
    { quem: "Garçom", t: "Já levo!", lado: "r" },
    { quem: "Mesa 12", t: "Pode trazer a maquininha?", lado: "l" },
    { quem: "Mesa 12", t: "Alguém tem Pix do Caio?", lado: "l" },
    { quem: "Mesa 12", t: "Quanto deu a minha parte mesmo?", lado: "l" },
  ];
  return (
    <section className="relative overflow-hidden bg-[oklch(0.97_0.025_70)] py-20 sm:py-28">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Eyebrow>A parte chata</Eyebrow>
          <LineReveal
            className="mt-4 font-display text-headline font-semibold tracking-display"
            lines={[
              "O melhor do restaurante",
              "não é esperar",
              <span key="p" className="text-highlight">
                para pagar.
              </span>,
            ]}
          />
          <Reveal delay={250}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              A refeição acabou, a conversa estava boa e, de repente, todo mundo está procurando o
              garçom com o braço levantado. A Tipe tira esse momento do caminho.
            </p>
          </Reveal>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <img
            src={mascotWaiting}
            alt=""
            aria-hidden
            width={1024}
            height={1024}
            loading="lazy"
            className="bob absolute -right-6 -top-16 w-32 sm:-right-14 sm:w-40"
          />
          <ol className="relative space-y-3 rounded-[2rem] bg-surface p-5 shadow-lift sm:p-7">
            {falas.map((f, i) => (
              <Reveal
                as="li"
                key={i}
                delay={i * 220}
                variant="scale"
                className={cn("flex flex-col", f.lado === "r" ? "items-end" : "items-start")}
              >
                <span className="px-2 text-[11px] font-semibold text-muted-foreground">
                  {f.quem}
                </span>
                <span
                  className={cn(
                    "mt-1 max-w-[85%] rounded-3xl px-4 py-2.5 text-[0.95rem] font-medium",
                    f.lado === "r"
                      ? "rounded-br-md bg-ink text-white"
                      : "rounded-bl-md bg-background-muted",
                  )}
                >
                  {f.t}
                </span>
              </Reveal>
            ))}
            <Reveal
              as="li"
              delay={falas.length * 220 + 200}
              className="!mt-6 flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-brand-strong"
            >
              <QrCode className="h-5 w-5 shrink-0" />
              <span className="text-[0.95rem] font-semibold">
                Ou: aponta a câmera, confere e paga.
              </span>
            </Reveal>
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- Para quem está na mesa */

function NaMesa() {
  const parallax = useParallax<HTMLDivElement>(36);
  const pessoas = [
    ["Ana", 51.97],
    ["Caio", 51.97],
    ["Bia", 47.96],
  ] as const;
  const metodos = [
    { nome: "Pix", nota: "Aprovado pelo banco", ativo: true },
    { nome: "Dinheiro ou maquininha", nota: "Confirmado pelo garçom", ativo: true },
    { nome: "Apple Pay e Google Pay", nota: "Pagamento em um toque", ativo: true },
  ];
  return (
    <section id="para-clientes" className="scroll-mt-16 py-20 sm:py-32">
      <div className="container-page">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Eyebrow>Para quem está na mesa</Eyebrow>
            <LineReveal
              className="mt-4 font-display text-headline font-semibold tracking-display"
              lines={[
                "Menos espera.",
                <span key="b" className="text-brand-strong">
                  Mais bons momentos.
                </span>,
              ]}
            />
          </div>
          <Reveal delay={150}>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty lg:pb-2">
              Cada pessoa escolhe o que consumiu, paga a sua parte e volta para a conversa. Ninguém
              faz conta de cabeça.
            </p>
          </Reveal>
        </div>

        <div className="relative mt-12 grid gap-5 lg:mt-16 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="relative">
            <EditorialPhoto
              scene="amigos"
              alt="Amigos rindo à mesa de um restaurante enquanto uma pessoa segura o celular"
              aspect="3/2"
              sizes="(min-width: 1024px) 60vw, 100vw"
              position="50% 40%"
              className="max-lg:!aspect-[4/5]"
            />
            <div
              ref={parallax}
              className="absolute bottom-5 right-5 w-[min(80%,17.5rem)] sm:bottom-8 sm:right-8"
            >
              <Reveal
                variant="scale"
                delay={300}
                className="rounded-3xl border border-white/50 bg-white/80 p-4 text-foreground shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Mesa 12 · falta pagar
                  </p>
                  <p className="money text-xs text-muted-foreground line-through">{money(151.9)}</p>
                </div>
                <p className="money mt-1 font-display text-4xl font-semibold tracking-display">
                  {money(0)}
                </p>
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                  {pessoas.map(([n, v]) => (
                    <li key={n} className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-ink">
                        {n[0]}
                      </span>
                      {n}
                      <span className="money ml-auto font-semibold">{money(v)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-xl bg-brand-soft py-2 text-center text-sm font-semibold text-brand-strong">
                  Mesa fechada. Bom resto de noite!
                </p>
              </Reveal>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <EditorialPhoto
              scene="casal"
              alt="Casal sorrindo enquanto paga a conta pelo celular, à mesa, à noite"
              aspect="4/5"
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="lg:!aspect-auto lg:h-full"
            />
            <Reveal className="flex flex-col justify-between rounded-[2rem] bg-ink p-6 text-white sm:p-7">
              <p className="font-display text-2xl font-semibold leading-tight tracking-heading">
                Paga como preferir.
              </p>
              <ul className="mt-6 space-y-3">
                {metodos.map((m) => (
                  <li
                    key={m.nome}
                    className={cn("flex items-center gap-3", !m.ativo && "opacity-55")}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                        m.ativo ? "bg-brand text-ink" : "border border-white/30",
                      )}
                    >
                      {m.ativo && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{m.nome}</span>
                      <span className="block text-xs text-white/60">{m.nota}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>

        <ul className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Sem baixar app", "Abre direto na câmera do celular."],
            ["Sem pedir a conta", "Ela já está na tela, atualizada a cada pedido."],
            ["Cada um paga o seu", "Por item, em partes iguais, por valor ou porcentagem."],
            ["Sem taxa para você", "Quem está na mesa não paga nada a mais pela Tipe."],
          ].map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 90} className="border-t-2 border-ink pt-4">
              <p className="font-display text-xl font-semibold tracking-heading">{t}</p>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- Para quem atende */

function QuemAtende() {
  const parallax = useParallax<HTMLDivElement>(50);
  return (
    <section
      id="para-garcons"
      className="scroll-mt-16 overflow-hidden bg-[oklch(0.95_0.035_178)] py-20 sm:py-32"
    >
      <div className="container-page grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <div className="relative order-2 lg:order-1">
          <EditorialPhoto
            scene="salao"
            alt="Salão cheio de um boteco brasileiro, com garçons atendendo as mesas sob luz quente"
            aspect="4/5"
            sizes="(min-width: 1024px) 42vw, 92vw"
            position="50% 35%"
          />
          <div
            ref={parallax}
            className="absolute -right-2 top-10 w-[min(78%,18.5rem)] space-y-2.5 sm:-right-10"
          >
            <Reveal variant="scale" delay={100}>
              <Toast
                icon={<Check className="h-4 w-4" strokeWidth={3} />}
                title="Mesa 14 · conta paga"
                text="Ninguém precisou chamar você"
              />
            </Reveal>
            <Reveal variant="scale" delay={350}>
              <Toast
                icon={<Heart className="h-4 w-4" />}
                title="Gorjeta extra recebida"
                text="R$ 7,00 no seu saldo (70%)"
              />
            </Reveal>
            <Reveal variant="scale" delay={600}>
              <Toast
                icon={<Star className="h-4 w-4 fill-current" />}
                title="Mesa 9 deixou 5 estrelas"
                text="“Atendimento nota dez”"
              />
            </Reveal>
          </div>
          <div className="absolute -bottom-10 left-4 hidden w-[180px] sm:block lg:-left-8">
            <Reveal delay={500}>
              <PhoneFrame className="rotate-[-6deg]">
                <div className="aspect-[300/620]">
                  <WaiterPreview />
                </div>
              </PhoneFrame>
            </Reveal>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>Para quem atende</Eyebrow>
          <LineReveal
            className="mt-4 font-display text-headline font-semibold tracking-display"
            lines={[
              "Mais tempo para servir.",
              <span key="b" className="text-brand-strong">
                Menos tempo para cobrar.
              </span>,
            ]}
          />
          <Reveal delay={150}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              Sem levar conta impressa e maquininha de mesa em mesa. O fechamento acontece sozinho e
              o atendimento fica com quem sabe fazer.
            </p>
          </Reveal>
          <ul className="mt-10 space-y-5">
            {[
              [
                HandCoins,
                "Gorjeta extra, direto para a equipe",
                "Quando o cliente quer agradecer, 70% do valor vai para o saldo do garçom que atendeu a mesa.",
              ],
              [
                Wallet,
                "Saldo e saque por Pix",
                "Área própria com saldo, histórico e saque quinzenal pela chave Pix.",
              ],
              [
                Star,
                "Avaliações que chegam até você",
                "Cada avaliação fica ligada ao garçom da mesa, com nota e comentário.",
              ],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof Star;
              return (
                <Reveal as="li" key={t as string} delay={i * 110} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-brand">
                    <I className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold tracking-heading">
                      {t as string}
                    </span>
                    <span className="mt-1 block text-[0.95rem] leading-relaxed text-muted-foreground">
                      {d as string}
                    </span>
                  </span>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- Para quem gerencia */

function QuemGerencia() {
  const pontos = [
    [LayoutGrid, "Salão ao vivo", "Livre, ocupada, aguardando ou encerrada, mesa a mesa."],
    [Wallet, "Caixa sem susto", "Abertura, sangria, fechamento e pagamentos presenciais."],
    [
      BarChart3,
      "Relatórios e fechamento do dia",
      "Vendas, mais vendidos, gorjetas e avaliações por garçom.",
    ],
    [History, "Tudo registrado", "Pagamentos, cancelamentos e reaberturas com data e responsável."],
  ] as const;
  return (
    <section id="painel" className="scroll-mt-16 py-20 sm:py-32">
      <span id="para-restaurantes" className="block -translate-y-16" aria-hidden />
      <div className="container-page">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <Eyebrow>Para quem gerencia</Eyebrow>
            <LineReveal
              className="mt-4 font-display text-headline font-semibold tracking-display"
              lines={[
                "Seu salão inteiro,",
                <span key="b" className="text-brand-strong">
                  numa tela só.
                </span>,
              ]}
            />
          </div>
          <Reveal delay={150}>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty lg:pb-2">
              Cada mesa, cada item e cada pagamento em tempo real, no computador, no tablet ou no
              celular. O dinheiro do Pix cai direto na conta do restaurante.
            </p>
          </Reveal>
        </div>
        <div className="relative mt-12 lg:mt-16">
          <div className="grid gap-5 lg:grid-cols-[0.42fr_1fr]">
            <EditorialPhoto
              scene="gestor"
              alt="Dona de restaurante consultando o tablet no balcão, com a cozinha trabalhando ao fundo"
              aspect="4/5"
              sizes="(min-width: 1024px) 28vw, 92vw"
              position="50% 30%"
              className="max-lg:!aspect-[3/2]"
            />
            <Reveal
              variant="scale"
              className="relative overflow-hidden rounded-[2rem] bg-ink p-3 sm:p-6 lg:p-8"
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_0%,color-mix(in_oklab,var(--brand-primary)_30%,transparent),transparent_70%)]"
              />
              <DashboardPreview className="relative" />
              <p className="relative mt-3 text-center text-xs text-white/50">
                Demonstração com dados fictícios.
              </p>
            </Reveal>
          </div>
        </div>
        <ul className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {pontos.map(([I, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 90}>
              <I className="h-6 w-6 text-brand-strong" />
              <p className="mt-3 font-display text-xl font-semibold tracking-heading">{t}</p>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Ecossistema */

function Ecossistema() {
  const disponivel = [
    [QrCode, "Pagamento na mesa"],
    [Smartphone, "Pix, Apple Pay e Google Pay"],
    [Users, "Divisão da conta"],
    [ReceiptText, "Lançamento TIPE (PDV)"],
    [LayoutGrid, "Mapa do salão"],
    [ChefHat, "Cozinha e bar (KDS)"],
    [Wallet, "Caixa"],
    [BarChart3, "Relatórios e fechamento do dia"],
    [HandCoins, "Área do garçom"],
    [Star, "Avaliações"],
    [Sparkles, "Totens com QR Code"],
    [Bot, "Lebre, a assistente"],
    [ShieldCheck, "API TIPE para PDVs"],
  ] as const;
  const emBreve = [
    "Conectores para outros PDVs",
    "Baixa automática no PDV",
    "Pedido pela mesa",
    "Garçom lançando pelo celular",
    "Totem de autoatendimento",
  ];
  return (
    <section
      id="integracoes"
      className="scroll-mt-16 overflow-hidden bg-ink py-20 text-white sm:py-32"
    >
      <div className="container-page">
        <Eyebrow tone="light">Ecossistema Tipe</Eyebrow>
        <LineReveal
          className="mt-4 max-w-4xl font-display text-headline font-semibold tracking-display"
          lines={[
            "Do pedido ao pagamento,",
            <span key="b" className="text-brand">
              tudo conversa.
            </span>,
          ]}
        />
        <Reveal delay={120}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65 text-pretty">
            Use a Tipe completa, com o Lançamento TIPE no lugar do seu sistema, ou só o fechamento
            da conta junto do PDV que você já tem. A gente mostra com clareza o que já funciona e o
            que ainda está a caminho.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand">
              <span className="h-2 w-2 rounded-full bg-brand tipe-live" />
              Disponível hoje
            </p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {disponivel.map(([I, t], i) => (
                <Reveal
                  as="li"
                  key={t}
                  delay={i * 45}
                  variant="scale"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[0.95rem] font-semibold transition-colors hover:border-brand/60 hover:bg-white/10"
                >
                  <I className="h-4 w-4 text-brand" />
                  {t}
                </Reveal>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/55">Em desenvolvimento</p>
            <ul className="mt-5 space-y-3">
              {emBreve.map((t, i) => (
                <Reveal
                  as="li"
                  key={t}
                  delay={i * 60}
                  className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-[0.95rem] text-white/70"
                >
                  {t}
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                    Em breve
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Planos */

const planos = [
  ...PLANS.map((p) => ({
    id: p.id as string | null,
    name: p.name,
    price: SHOW_PLAN_PRICES ? priceLabel(p.price) : null,
    mesas: `${p.maxTables}`,
    popular: "popular" in p ? p.popular : false,
    features: [...p.features] as string[],
  })),
  {
    id: null,
    name: "Personalizado",
    price: null,
    mesas: "40+",
    popular: false,
    features: [
      "Integrações sob medida",
      "Implantação acompanhada",
      "Condições negociadas para redes",
    ],
  },
];

function Planos() {
  return (
    <section id="precos" className="scroll-mt-16 py-20 sm:py-32">
      <span id="planos" className="block -translate-y-16" aria-hidden />
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Planos</Eyebrow>
          <LineReveal
            className="mt-4 font-display text-headline font-semibold tracking-display"
            lines={["Preço simples.", "Sem surpresa."]}
          />
          <Reveal delay={120}>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Você paga pelo número de mesas, não por transação. Os primeiros restaurantes ganham{" "}
              {TRIAL_DAYS} dias grátis, sem cartão de crédito.
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {planos.map((p, i) => (
            <Reveal
              key={p.name}
              delay={i * 80}
              className={cn(
                "relative flex flex-col rounded-[2rem] border p-7 transition-transform duration-300 hover:-translate-y-1",
                p.popular
                  ? "border-transparent bg-brand text-ink shadow-[0_30px_60px_-30px_var(--brand-primary)]"
                  : "border-border bg-surface",
              )}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                  Mais escolhido
                </span>
              )}
              <h3 className="text-center font-display text-2xl font-semibold tracking-heading">
                {p.name}
              </h3>
              <div className="mt-6 text-center">
                <p className="font-display text-[4.25rem] font-semibold leading-none tracking-display">
                  {p.mesas}
                </p>
                <p
                  className={cn(
                    "mt-2 text-sm font-medium",
                    p.popular ? "text-ink/70" : "text-muted-foreground",
                  )}
                >
                  {p.id ? "mesas, no máximo" : "mesas ou redes"}
                </p>
              </div>
              <p
                className={cn(
                  "mt-6 rounded-2xl py-3 text-center font-display text-base font-semibold",
                  p.popular ? "bg-ink/10" : "bg-background-muted",
                )}
              >
                {p.price ? (
                  <span className="money">R$ {p.price}/mês</span>
                ) : p.id ? (
                  "Valores no lançamento"
                ) : (
                  "Sob consulta"
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-[0.95rem]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        p.popular ? "text-ink" : "text-brand-strong",
                      )}
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#demonstracao"
                className={cn(
                  "btn-press mt-8 flex h-12 items-center justify-center rounded-full font-semibold",
                  p.popular
                    ? "bg-ink text-white"
                    : "border border-border hover:border-foreground/30",
                )}
              >
                {p.id ? `Começar com ${TRIAL_DAYS} dias grátis` : "Falar com a equipe"}
              </a>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-strong" />
            Planos mensais sem fidelidade. No plano anual, os totens com QR Code estão incluídos.
          </p>
          <p className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-strong" />A Tipe não cobra por transação nas
            contas; o restaurante paga apenas as tarifas do Pagar.me.
          </p>
        </div>
      </div>
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
            className="mt-4 font-display text-headline font-semibold tracking-display"
            lines={["Perguntou,", "respondemos."]}
          />
          <a
            href="#demonstracao"
            className="mt-8 inline-flex items-center gap-2 font-semibold text-brand-strong hover:underline"
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
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.15rem] font-semibold tracking-heading [&::-webkit-details-marker]:hidden">
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

/* ------------------------------------------------------------ Conversão */

function Conversao() {
  return (
    <section
      id="demonstracao"
      className="relative scroll-mt-16 overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
    >
      <span id="lista-de-espera" className="block -translate-y-16" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.5rem] bg-ink p-6 text-white sm:p-12 lg:grid-cols-[1fr_0.9fr] lg:gap-14 lg:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl"
        />
        <div className="relative flex flex-col">
          <LineReveal
            className="font-display text-[clamp(3rem,1.6rem+6vw,7rem)] font-semibold leading-[0.9] tracking-display"
            lines={[
              "Pague.",
              "Sem",
              <span key="e" className="text-brand">
                esperar.
              </span>,
            ]}
          />
          <Reveal delay={200}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Os primeiros restaurantes ganham {TRIAL_DAYS} dias grátis, sem cartão de crédito.
              Deixe seus dados e a equipe Tipe agenda a demonstração.
            </p>
          </Reveal>
          <ul className="mt-8 space-y-3 text-[0.95rem]">
            {[
              "Vagas na ordem de chegada",
              "Demonstração gratuita com a equipe",
              "Implantação acompanhada",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-ink">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <img
            src={mascotThanks}
            alt=""
            aria-hidden
            width={687}
            height={1024}
            loading="lazy"
            className="bob mt-auto hidden w-36 self-start pt-10 lg:block"
          />
        </div>
        <div className="relative self-start rounded-[1.75rem] bg-surface p-5 text-foreground shadow-lift sm:p-8">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
