import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Bot, Check, ChevronDown, Clock, CreditCard, HandCoins, Heart, History, LayoutGrid, Plug, QrCode,
  ReceiptText, ShieldCheck, Smartphone, Sparkles, SplitSquareHorizontal, Users, Wallet, Zap,
} from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES, TRIAL_DAYS, priceLabel } from "@/lib/tipe/plans";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingCalculator } from "@/components/tipe/LandingCalculator";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { PaymentJourneyDemo } from "@/components/tipe/PaymentJourneyDemo";
import { Eyebrow, PhoneFrame, SectionHeading, StatusBadge } from "@/components/tipe/ds";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { DashboardPreview, WaiterPreview } from "@/components/tipe/landing/PanelPreviews";
import { ScreenBill, ScreenDone, ScreenPay, TableTotem } from "@/components/tipe/landing/ProductScreens";
import { cn } from "@/lib/utils";

const TITLE = "TIPE | A conta chegou. A espera acabou. | Pagamento na mesa por QR Code";
const DESCRIPTION = "Com o TIPE, o cliente confere a conta, divide o que consumiu e paga pelo celular, direto na mesa. Sem aplicativo e sem esperar a maquininha. Pré-lançamento com 30 dias grátis para restaurantes.";
const OG_IMAGE = "https://tipe.digital/__l5e/assets-v1/702edacf-4438-4472-9693-7bb419095c42/tipe-logo-redondo.png";

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
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Pular para o conteúdo</a>
      <LandingHeader />
      <main id="conteudo">
        <Hero />
        <Journey />
        <ForRestaurants />
        <DashboardSection />
        <ForGuests />
        <ForWaiters />
        <Integrations />
        <LandingCalculator />
        <Pricing />
        <SocialProof />
        <Faq />
        <DemoSection />
      </main>
      <LandingFooter />
      <LazyLebreAssistant />
    </div>
  );
}

/* --------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_55%_at_70%_20%,color-mix(in_oklab,var(--brand-primary)_16%,transparent),transparent_70%)]" />
      <div className="container-page relative grid items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div className="tipe-rise max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground/80 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Pré-lançamento · {TRIAL_DAYS} dias grátis para os primeiros restaurantes
          </span>
          <h1 className="mt-6 font-display text-display font-semibold tracking-display text-balance">
            A conta chegou.<br /><span className="text-brand-strong">A espera acabou.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl">
            Pague a conta do restaurante direto pelo celular. Sem aplicativo, sem complicação e sem esperar pela maquininha.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#demonstracao" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 font-semibold text-white shadow-xs transition-colors hover:bg-ink-soft">
              Conheça o TIPE <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#como-funciona" className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-surface px-7 font-semibold shadow-xs transition-colors hover:border-foreground/25">
              Ver como funciona
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {["Sem baixar aplicativo", "Pix na hora", "Cada um paga o que consumiu"].map((t) => (
              <li key={t} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-brand-soft text-brand-strong"><Check className="h-3 w-3" strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[460px]">
          <div aria-hidden className="absolute inset-x-6 bottom-10 top-16 rounded-[3rem] bg-brand-soft" />
          <PaymentJourneyDemo className="relative" />
          <div className="pointer-events-none absolute -left-2 top-24 hidden rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-lift backdrop-blur sm:block lg:-left-10" aria-hidden>
            <p className="text-[11px] text-muted-foreground">Mesa 12 · conta ao vivo</p>
            <p className="money mt-0.5 font-display text-lg font-semibold">4 itens</p>
          </div>
          <div className="pointer-events-none absolute -right-2 bottom-28 hidden items-center gap-2.5 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-lift backdrop-blur sm:flex lg:-right-8" aria-hidden>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-ink"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span><span className="block text-[11px] text-muted-foreground">Pix aprovado</span><span className="block text-sm font-semibold">Itens baixados da mesa</span></span>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Demonstração com dados fictícios.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Jornada */

function Journey() {
  const steps = [
    { n: "01", t: "Escaneie", d: "O cliente aponta a câmera para o QR Code da mesa. Abre no navegador, sem instalar nada.", visual: <div className="flex h-full items-center justify-center"><TableTotem className="w-[150px]" /></div> },
    { n: "02", t: "Confira", d: "A conta aparece ao vivo, com cada item lançado. Ele escolhe tudo, uma parte ou divide.", visual: <MiniPhone><ScreenBill /></MiniPhone> },
    { n: "03", t: "Pague", d: "Pix pelo próprio celular ou, se preferir, dinheiro ou maquininha com o garçom.", visual: <MiniPhone><ScreenPay /></MiniPhone> },
    { n: "04", t: "Pronto", d: "Confirmação na hora. Os itens saem da conta e a mesa vê o que ainda falta pagar.", visual: <MiniPhone><ScreenDone /></MiniPhone> },
  ];
  return (
    <section id="como-funciona" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading eyebrow="Como funciona" title="Escaneie. Confira. Pague. Pronto." text="Quatro passos, todos no celular do cliente. O salão continua no ritmo dele." />
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.n} className="group flex flex-col">
              <div className="relative h-[300px] overflow-hidden rounded-[1.75rem] bg-background-muted">
                <div className="absolute inset-0 flex items-end justify-center pt-8">{s.visual}</div>
              </div>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-display text-sm font-semibold text-brand-strong">{s.n}</span>
                <h3 className="font-display text-xl font-semibold tracking-heading">{s.t}</h3>
                {i < steps.length - 1 && <ArrowRight className="ml-auto hidden h-4 w-4 text-muted-foreground/60 lg:block" aria-hidden />}
              </div>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MiniPhone({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame className="w-[200px] translate-y-10 rounded-b-none pb-0 transition-transform duration-500 ease-out group-hover:translate-y-6 motion-reduce:transition-none" screenClassName="rounded-b-none">
      <div className="h-[300px] origin-top-left scale-[0.6667] [width:150%]" aria-hidden><div className="h-[450px]">{children}</div></div>
    </PhoneFrame>
  );
}

/* ------------------------------------------------------ Restaurantes */

function ForRestaurants() {
  const items = [
    { icon: Clock, t: "Contas fechadas sem fila", d: "Cada cliente paga quando quiser, sem esperar a conta impressa e a maquininha passar de mesa em mesa." },
    { icon: SplitSquareHorizontal, t: "Divisão sem calculadora", d: "Por item, em partes iguais, por valor ou porcentagem. O centavo fecha certo." },
    { icon: LayoutGrid, t: "O salão inteiro numa tela", d: "Mesas, itens, quem pagou e o que falta, atualizado em tempo real no painel." },
    { icon: Wallet, t: "Pagamentos em um só lugar", d: "Pix aprovado na hora; dinheiro e maquininha confirmados pelo caixa com um toque." },
    { icon: HandCoins, t: "Gorjeta extra para a equipe", d: "Depois de pagar, o cliente pode agradecer com uma gorjeta. Opcional, sempre." },
    { icon: Bot, t: "Lebre, a assistente do painel", d: "Responde dúvidas, resume a operação e prepara ações que só rodam com a sua confirmação." },
  ];
  return (
    <section id="para-restaurantes" className="scroll-mt-16 bg-surface py-20 sm:py-28">
      <div className="container-page grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading align="left" eyebrow="Para restaurantes" title="Menos tempo fechando contas. Mais tempo atendendo." text="O TIPE cuida do fechamento da conta. Seu atendimento, seu cardápio e sua equipe continuam do seu jeito." />
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demonstracao" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-ink-soft">Agendar demonstração <ArrowRight className="h-4 w-4" /></a>
            <Link to="/simulador" className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold transition-colors hover:border-foreground/25">Testar o simulador</Link>
          </div>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.t} className="bg-surface p-7">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-strong"><i.icon className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-lg font-semibold tracking-heading">{i.t}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{i.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Painel */

function DashboardSection() {
  const points = [
    { icon: LayoutGrid, t: "Mapa do salão ao vivo", d: "Livre, ocupada, aguardando confirmação ou encerrada." },
    { icon: Wallet, t: "Caixa e confirmações", d: "Abertura, sangria, fechamento e pagamentos presenciais." },
    { icon: History, t: "Histórico com auditoria", d: "Pagamentos, cancelamentos e reaberturas com data e responsável." },
    { icon: BarChart3, t: "Relatórios e equipe", d: "Vendas, mais vendidos, gorjetas e avaliações por garçom." },
  ];
  return (
    <section id="painel" className="scroll-mt-16 overflow-hidden bg-ink py-20 text-white sm:py-28">
      <div className="container-page">
        <SectionHeading invert eyebrow="Painel do restaurante" title="Seu salão inteiro, em tempo real." text="Cada mesa, cada item e cada pagamento no endereço exclusivo do seu restaurante. No computador, no tablet ou no celular." />
        <div className="relative mx-auto mt-14 max-w-5xl">
          <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--brand-primary)_28%,transparent),transparent_70%)]" />
          <DashboardPreview className="relative" />
          <p className="relative mt-3 text-center text-xs text-white/50">Demonstração com dados fictícios.</p>
        </div>
        <ul className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => (
            <li key={p.t}>
              <p.icon className="h-5 w-5 text-brand" />
              <h3 className="mt-3 font-display text-base font-semibold">{p.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{p.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Clientes */

function ForGuests() {
  const benefits = [
    { t: "Sem baixar aplicativo", d: "Abre direto na câmera do celular." },
    { t: "Sem precisar pedir a conta", d: "Ela já está na tela, atualizada a cada pedido." },
    { t: "Sem esperar a maquininha", d: "Pagou, está liberado. Simples assim." },
    { t: "Cada um paga a sua parte", d: "Por item, em partes iguais ou por valor." },
    { t: "Confirmação na hora", d: "E a mesa vê quanto ainda falta pagar." },
    { t: "Gorjeta, se quiser", d: "Uma forma opcional de agradecer à equipe." },
  ];
  const methods: { icon: typeof QrCode; name: string; note: string; status: "ativo" | "breve" }[] = [
    { icon: QrCode, name: "Pix", note: "Pelo app do seu banco", status: "ativo" },
    { icon: HandCoins, name: "Dinheiro ou maquininha", note: "Com o garçom, na mesa", status: "ativo" },
    { icon: Smartphone, name: "Apple Pay e Google Pay", note: "Carteiras digitais", status: "breve" },
  ];
  return (
    <section id="para-clientes" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container-page grid items-center gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="relative order-2 mx-auto w-full max-w-[420px] lg:order-1">
          <div aria-hidden className="absolute inset-6 rounded-[3rem] bg-background-muted" />
          <div className="relative flex items-end justify-center gap-4">
            <PhoneFrame className="w-[210px] -rotate-3 max-sm:hidden"><div className="aspect-[300/620]"><ScreenPay /></div></PhoneFrame>
            <PhoneFrame className="w-[230px] translate-y-6 rotate-2"><div className="aspect-[300/620]"><ScreenBill /></div></PhoneFrame>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeading align="left" eyebrow="Para clientes" title="Pagar a conta virou a parte fácil." text="Nada de chamar o garçom três vezes, conferir no papel ou fazer conta de cabeça." />
          <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b.t} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-ink"><Check className="h-3 w-3" strokeWidth={3} /></span>
                <span><span className="block font-semibold">{b.t}</span><span className="mt-0.5 block text-sm text-muted-foreground">{b.d}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-2xl border border-border bg-surface p-2">
            <p className="px-3 pb-2 pt-2 text-xs font-semibold text-muted-foreground">Formas de pagamento</p>
            <ul className="grid gap-1 sm:grid-cols-3">
              {methods.map((m) => (
                <li key={m.name} className={cn("rounded-xl bg-background-muted px-3 py-3", m.status === "breve" && "opacity-70")}>
                  <div className="flex items-center justify-between gap-2">
                    <m.icon className="h-4 w-4 text-foreground/70" />
                    <StatusBadge tone={m.status === "ativo" ? "success" : "neutral"}>{m.status === "ativo" ? "Disponível" : "Em breve"}</StatusBadge>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold leading-tight">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Garçons */

function ForWaiters() {
  const items = [
    { icon: Zap, t: "Menos idas e vindas", d: "Sem levar conta impressa e maquininha de mesa em mesa." },
    { icon: Users, t: "Mais tempo para atender", d: "O fechamento acontece sozinho; o atendimento fica com você." },
    { icon: ReceiptText, t: "Pagamentos à vista", d: "O painel mostra o que foi pago e o que ainda falta em cada mesa." },
    { icon: Heart, t: "Gorjetas extras", d: "Quando o cliente quer agradecer, o valor vai para o seu saldo." },
    { icon: ShieldCheck, t: "Valores transparentes", d: "Cada gorjeta com mesa e horário. A parte da plataforma aparece para o cliente." },
    { icon: Wallet, t: "Saque quinzenal por Pix", d: "Saldo, histórico e pedido de saque na área do garçom." },
  ];
  return (
    <section id="para-garcons" className="scroll-mt-16 bg-background-muted py-20 sm:py-28">
      <div className="container-page grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <SectionHeading align="left" eyebrow="Para garçons" title="Valoriza quem faz o atendimento acontecer." text="Menos tarefa repetitiva, mais tempo com o cliente e uma área própria para acompanhar o que é seu." />
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.t}>
                <i.icon className="h-5 w-5 text-brand-strong" />
                <h3 className="mt-3 font-semibold">{i.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-[300px]">
          <PhoneFrame className="tipe-float"><div className="aspect-[300/620]"><WaiterPreview /></div></PhoneFrame>
          <p className="mt-4 text-center text-xs text-muted-foreground">Área do garçom · dados fictícios</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- Integrações */

function Integrations() {
  const cols: { tone: "success" | "brand" | "neutral"; label: string; items: { t: string; d: string }[] }[] = [
    {
      tone: "success", label: "Ativas",
      items: [
        { t: "Pagar.me", d: "Pix com o valor caindo direto na conta do restaurante." },
        { t: "Lançamento TIPE", d: "Lance pedidos pelo próprio painel, com ou sem PDV." },
        { t: "API TIPE para PDVs", d: "Sistemas que enviam mesas e itens no formato TIPE." },
      ],
    },
    {
      tone: "brand", label: "Em desenvolvimento",
      items: [
        { t: "Conectores de PDV", d: "Integração assistida com o sistema que você já usa." },
        { t: "Baixa automática no PDV", d: "Pagamento registrado no seu sistema, com nova tentativa se falhar." },
      ],
    },
    {
      tone: "neutral", label: "Planejadas",
      items: [
        { t: "Apple Pay e Google Pay", d: "Depende da habilitação pelo provedor de pagamento." },
        { t: "Recibo por e-mail", d: "Comprovante enviado ao cliente após o pagamento." },
        { t: "Fechamento exportável", d: "Vendas, meios, gorjetas e estornos para a contabilidade." },
      ],
    },
  ];
  return (
    <section id="integracoes" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading eyebrow="Integrações" title="Funciona desde o primeiro dia." text="Com o seu PDV ou sem ele. Mostramos com clareza o que já está ativo e o que ainda está a caminho." />
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {cols.map((c) => (
            <div key={c.label} className="surface-card p-6">
              <StatusBadge tone={c.tone}>{c.label}</StatusBadge>
              <ul className="mt-5 space-y-5">
                {c.items.map((i) => (
                  <li key={i.t} className="flex gap-3">
                    <Plug className={cn("mt-0.5 h-4 w-4 shrink-0", c.tone === "success" ? "text-brand-strong" : "text-muted-foreground")} />
                    <span><span className="block font-semibold">{i.t}</span><span className="mt-0.5 block text-sm text-muted-foreground">{i.d}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">Usa outro sistema? A implantação é acompanhada pela equipe TIPE, junto com você.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Preços */

const planos = [
  ...PLANS.map((p) => ({ id: p.id as string | null, name: p.name, price: SHOW_PLAN_PRICES ? priceLabel(p.price) : null, tables: `Até ${p.maxTables} mesas`, popular: "popular" in p ? p.popular : false, features: [...p.features] as string[] })),
  { id: null, name: "Personalizado", price: null, tables: "Acima de 40 mesas ou redes", popular: false, features: ["Várias unidades", "Painel consolidado", "Integrações sob medida", "Condições negociadas"] },
];

function Pricing() {
  return (
    <section id="precos" className="scroll-mt-16 bg-surface py-20 sm:py-28">
      <span id="planos" className="block -translate-y-16" aria-hidden />
      <div className="container-page">
        <SectionHeading eyebrow="Preços" title="Assinatura mensal pelo tamanho do seu salão." text={`Você paga pelo número de mesas, não por transação. Os primeiros restaurantes ganham ${TRIAL_DAYS} dias grátis, sem cartão de crédito.`} />
        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {planos.map((p) => (
            <div key={p.name} className={cn("relative flex flex-col rounded-[1.5rem] border p-7", p.popular ? "border-ink bg-ink text-white shadow-lift" : "border-border bg-surface")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                {p.popular && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-ink">Recomendado</span>}
              </div>
              <p className={cn("mt-1 text-sm", p.popular ? "text-white/65" : "text-muted-foreground")}>{p.tables}</p>
              <div className="mt-7 min-h-[3.5rem]">
                {p.price
                  ? <p className="money font-display text-4xl font-semibold tracking-heading">R$ {p.price}<span className={cn("text-sm font-medium", p.popular ? "text-white/60" : "text-muted-foreground")}>/mês</span></p>
                  : <p className="font-display text-xl font-semibold leading-snug">{p.id ? "Valores no lançamento" : "Sob consulta"}</p>}
                {p.id && <p className={cn("mt-1 text-xs font-semibold", p.popular ? "text-brand" : "text-brand-strong")}>{TRIAL_DAYS} dias grátis, sem cartão</p>}
              </div>
              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", p.popular ? "text-brand" : "text-brand-strong")} />{f}</li>)}
              </ul>
              <a href="#demonstracao" className={cn("mt-8 flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors", p.popular ? "bg-brand text-ink hover:bg-brand/90" : "border border-border hover:border-foreground/25")}>
                {p.id ? "Falar com a equipe" : "Consultar condições"}
              </a>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-strong" />Planos mensais sem fidelidade. No plano anual, os totens com QR Code estão incluídos.</p>
          <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand-strong" />A TIPE não cobra por transação nas contas; o restaurante paga apenas as tarifas do Pagar.me.</p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Prova social */

// Prova social OCULTA: só aparece quando houver dados reais preenchidos aqui.
const PROVA_SOCIAL: { logo: string; restaurante: string; depoimentoDono: string; depoimentoGarcom: string; resultado: string }[] = [];

function SocialProof() {
  if (PROVA_SOCIAL.length === 0) return null;
  return (
    <section className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading eyebrow="Quem já usa" title="Restaurantes que já pagam sem esperar." />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {PROVA_SOCIAL.map((p) => (
            <figure key={p.restaurante} className="surface-card p-7">
              <img src={p.logo} alt={p.restaurante} loading="lazy" className="h-10 w-auto" />
              <p className="mt-5 font-display text-3xl font-semibold text-brand-strong">{p.resultado}</p>
              <blockquote className="mt-3 text-sm">“{p.depoimentoDono}”</blockquote>
              <blockquote className="mt-3 text-sm text-muted-foreground">“{p.depoimentoGarcom}”</blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- FAQ */

const FAQ: { label: string; faqs: [string, string][] }[] = [
  {
    label: "Para o cliente",
    faqs: [
      ["Preciso baixar algum aplicativo?", "Não. O cliente lê o QR Code da mesa com a câmera do celular e a conta abre no navegador. Ele informa nome e sobrenome na primeira vez; o celular guarda isso para as próximas visitas à mesma mesa."],
      ["Como funciona o QR Code da mesa?", "Cada mesa tem um código próprio. Quando o garçom lança um pedido, o item aparece na conta da mesa em tempo real. Se o restaurante trocar o QR Code, o antigo deixa de abrir a mesa."],
      ["Quais formas de pagamento estão disponíveis?", "Hoje: Pix pelo celular, processado pelo Pagar.me e aprovado na hora, e pagamento no estabelecimento (dinheiro ou maquininha), confirmado pelo caixa. Apple Pay e Google Pay ainda não estão ativos e serão liberados quando o provedor habilitar. O restaurante escolhe no painel quais formas oferecer."],
      ["Dá para pagar só a minha parte?", "Sim. Cada pessoa escolhe o que vai pagar, item por item, ou divide a conta em partes iguais, por valor ou por porcentagem. Os itens pagos saem da conta na hora e a tela mostra quanto ainda falta para fechar a mesa."],
      ["Como funciona a gorjeta extra?", "A taxa de serviço é definida pelo restaurante e entra na conta. A gorjeta extra é opcional e aparece depois do pagamento e da avaliação. A TIPE recebe o valor e separa 70% para a equipe do restaurante e 30% como taxa da plataforma. O cliente vê os valores antes de confirmar."],
    ],
  },
  {
    label: "Para o restaurante",
    faqs: [
      ["É seguro?", "Os pagamentos digitais são processados pelo Pagar.me e o dinheiro cai direto na conta do restaurante; a TIPE não retém o valor das contas. O sistema protege contra pagamento em duplicidade, confere o valor pago antes de aprovar e registra cada ação com data e responsável."],
      ["Funciona com o meu PDV?", "A TIPE não substitui o seu sistema: cuida do fechamento da conta. Os pedidos podem ser lançados pelo Lançamento TIPE, no próprio painel, ou chegar pela API TIPE. Conectores para outros PDVs estão em desenvolvimento, com integração assistida pela nossa equipe."],
      ["Quanto tempo leva para começar?", "A implantação é acompanhada: cadastramos as mesas, geramos os QR Codes para os totens e treinamos a equipe. Dá para começar por um salão e ampliar depois."],
      ["Quanto custa?", `Assinatura mensal de acordo com o número de mesas, sem tarifa por transação nas contas; o restaurante paga apenas as tarifas do Pagar.me. Os valores serão divulgados no lançamento e os primeiros restaurantes ganham ${TRIAL_DAYS} dias grátis, sem cartão de crédito.`],
      ["E se um pagamento sair errado?", "Pagamentos presenciais podem ser cancelados pelo caixa e os itens voltam para a conta. Estornos e contestações do Pagar.me aparecem como pendência no caixa, com registro de quem resolveu."],
    ],
  },
];

function Faq() {
  return (
    <section id="duvidas" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <SectionHeading align="left" eyebrow="Dúvidas" title="Perguntas frequentes." text="Do QR Code na mesa ao fechamento do caixa." />
          <a href="#demonstracao" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:underline">Ainda com dúvida? Fale com a equipe <ArrowRight className="h-4 w-4" /></a>
        </div>
        <div className="space-y-10">
          {FAQ.map((g) => (
            <div key={g.label}>
              <Eyebrow tone="muted">{g.label}</Eyebrow>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {g.faqs.map(([q, a]) => (
                  <details key={q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.05rem] font-semibold [&::-webkit-details-marker]:hidden">
                      {q}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border transition-transform group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span>
                    </summary>
                    <p className="-mt-1 pb-5 pr-10 text-[0.95rem] leading-relaxed text-muted-foreground">{a}</p>
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

/* ------------------------------------------------------- Demonstração */

function DemoSection() {
  return (
    <section id="demonstracao" className="scroll-mt-16 px-4 pb-20 sm:px-6 sm:pb-28">
      <span id="lista-de-espera" className="block -translate-y-16" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[2rem] bg-ink p-6 text-white sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative">
          <Eyebrow tone="light">Agendar demonstração</Eyebrow>
          <h2 className="mt-3 font-display text-headline font-semibold tracking-display text-balance">Leve o TIPE para as suas mesas.</h2>
          <p className="mt-4 max-w-md leading-relaxed text-white/70">Os primeiros restaurantes ganham {TRIAL_DAYS} dias grátis, sem cartão de crédito. Deixe seus dados e a equipe TIPE agenda a demonstração.</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[[Sparkles, "Vagas na ordem de chegada"], [Users, "Demonstração gratuita com a equipe"], [ShieldCheck, "Implantação acompanhada"]].map(([Icon, t]) => {
              const I = Icon as typeof Sparkles;
              return <li key={t as string} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><I className="h-4 w-4 text-brand" /></span>{t as string}</li>;
            })}
          </ul>
        </div>
        <div className="relative rounded-[1.5rem] bg-surface p-5 text-foreground shadow-lift sm:p-7">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
