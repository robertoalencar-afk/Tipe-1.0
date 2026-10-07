import { createFileRoute, Link } from "@tanstack/react-router";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";
import {
  QrCode, Receipt, Smartphone, CheckCircle2, ChevronRight, MonitorSmartphone, History, Landmark,
  Plug, Store, Zap, ShieldCheck, Clock, Users, Check, Star, BarChart3, Wallet,
  Hand, ClipboardList, Calculator, ArrowLeftRight, CreditCard, Bot, Headphones, Instagram, Mic, Paperclip, MessageCircle, RefreshCcw, Sparkles,
} from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES, priceLabel } from "@/lib/tipe/plans";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingCalculator } from "@/components/tipe/LandingCalculator";
import { WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";
import logo from "@/assets/logo-dark.png.asset.json";
import mascotAssistant from "@/assets/lebre-ai-official.svg";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { PaymentJourneyDemo } from "@/components/tipe/PaymentJourneyDemo";
import { MesaViva } from "@/components/tipe/MesaViva";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/tipe/legal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE | Pague. Sem esperar. | Pagamento na mesa por QR Code" },
      {
        name: "description",
        content: "TIPE: pagamento na mesa por QR Code. O cliente divide e paga a conta pelo celular em menos de 30 segundos, sem precisar instalar nada. Pré-lançamento com 30 dias grátis para restaurantes.",
      },
      { property: "og:title", content: "TIPE | Pague. Sem esperar. | Pagamento na mesa por QR Code" },
      {
        property: "og:description",
        content: "TIPE: pagamento na mesa por QR Code. O cliente divide e paga a conta pelo celular em menos de 30 segundos, sem precisar instalar nada. Pré-lançamento com 30 dias grátis para restaurantes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tipe.digital/" },
      { property: "og:image", content: "https://tipe.digital/__l5e/assets-v1/702edacf-4438-4472-9693-7bb419095c42/tipe-logo-redondo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://tipe.digital/__l5e/assets-v1/702edacf-4438-4472-9693-7bb419095c42/tipe-logo-redondo.png" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <MesaViva />
        <Hero />
        <Stats />
        <Dinamica />
        <HowItWorks />
        <PaymentMethods />
        <MoneyDirect />
        <Dashboard />
        <PdvOptions />
        <LebreSection />
        <LandingCalculator />
        <Pricing />
        <SocialProof />
        <Faq />
        <ContactSection />
      </main>
      <Footer />
      <LazyLebreAssistant />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" aria-label="TIPE, página inicial"><img src={logo.url} alt="TIPE" className="h-9 w-auto object-contain" /></Link>
        <nav className="flex items-center gap-1 text-sm lg:gap-2">
          {[["#como-funciona", "Como funciona"], ["#painel", "Painel"], ["#pdv", "Integração"], ["#calculadora", "Calculadora"], ["#planos", "Planos"], ["#duvidas", "Dúvidas"]].map(([h, l]) => (
            <a key={h} href={h} className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground lg:block">{l}</a>
          ))}
          <Link to="/simulador" className="hidden rounded-full border px-4 py-2 font-semibold text-foreground sm:block">Testar o simulador</Link>
          <a href="#lista-de-espera" className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Quero conhecer</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="principal" className="relative scroll-mt-16 overflow-hidden text-secondary-foreground" style={{ background: "var(--gradient-brand)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" />Pré-lançamento: 30 dias grátis para os primeiros restaurantes
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Pague. <span className="text-primary">Sem esperar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
            Pagamento na mesa por QR Code para restaurantes, bares e cafeterias. O cliente confere a conta, divide o que consumiu e paga pelo celular em menos de 30 segundos. Sem precisar baixar nada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#lista-de-espera" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5">
              Garantir meus 30 dias grátis <ChevronRight className="h-4 w-4" />
            </a>
            <Link to="/simulador" className="inline-flex items-center gap-2 rounded-full border border-current/25 px-6 py-3 font-display font-semibold transition-colors hover:bg-primary/10">
              Testar o simulador
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-80">
            {["Sem instalação", "Pagamento por carteiras digitais", "Sem cartão de crédito no teste"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</span>
            ))}
          </div>
        </div>
        <div>
          <PaymentJourneyDemo />
          <p className="mx-auto mt-7 max-w-sm text-center text-xs opacity-65">Demonstração da experiência do cliente.</p>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats: { icon: any; v: string; l: string; small?: boolean }[] = [
    { icon: Clock, v: "Na hora", l: "a conta aparece no celular do cliente", small: true },
    { icon: Wallet, v: "Na mesa", l: "cada pessoa escolhe o que deseja pagar", small: true },
    { icon: Users, v: "Sem chamar o garçom", l: "o cliente resolve tudo pelo celular", small: true },
    { icon: ShieldCheck, v: "Ao vivo", l: "a conta é atualizada em tempo real", small: true },
  ];
  return (
    <section className="relative z-10 mx-auto mt-10 max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-xl md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="bg-card p-6">
            <s.icon className="h-5 w-5 text-primary" />
            <p className={`mt-3 font-display font-extrabold ${s.small ? "text-xl leading-tight" : "text-3xl"}`}>{s.v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
}
function Dinamica() {
  const oldSteps = [
    { icon: Hand, t: "Chamar o garçom e pedir a conta" },
    { icon: ClipboardList, t: "Conferir item por item no papel" },
    { icon: Calculator, t: "Dividir a conta na calculadora" },
    { icon: ArrowLeftRight, t: "Pedir a parcial e esperar outra conta" },
    { icon: CreditCard, t: "Esperar a maquininha passar de cliente em cliente" },
  ];
  const newSteps = [
    { icon: QrCode, t: "Lê o QR Code da mesa" },
    { icon: Smartphone, t: "Vê a conta em tempo real e escolhe o que vai pagar" },
    { icon: Zap, t: "Paga na hora e volta para a conversa" },
  ];
  const chips = [
    { icon: Plug, t: "Conta em tempo real" },
    { icon: Wallet, t: "Pagamento direto na mesa" },
    { icon: Check, t: "Cada um paga só o que consumiu" },
    { icon: Users, t: "Zero fila no caixa" },
  ];
  const liveItems = [
    ["Moqueca de peixe", "R$ 89,90"],
    ["Caipirinha ×2", "R$ 44,00"],
    ["Água com gás", "R$ 7,50"],
  ] as const;
  return (
    <section id="dinamica" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md">
          <Zap className="h-3.5 w-3.5" /> A nova era do pagamento em mesa
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">A conta virou tecnologia</h2>
        <p className="mt-4 text-muted-foreground">
          Chega de pedir a conta, conferir no papel, dividir na calculadora e esperar a maquininha rodar
          de mão em mão. Agora tudo acontece no celular do cliente, na mesa, em tempo real.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-2">
        <div className="rounded-3xl border bg-card p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-muted-foreground">Sem TIPE, o jeito antigo</h3>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <ul className="mt-5 space-y-3">
            {oldSteps.map((s) => (
              <li key={s.t} className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <s.icon className="h-4 w-4 shrink-0" />
                {s.t}
              </li>
            ))}
          </ul>
          <div className="mt-6 overflow-hidden rounded-2xl bg-muted/60 p-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Mesa</span>
              <span>Caixa</span>
            </div>
            <div className="relative mt-3 h-10">
              <div aria-hidden className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-muted-foreground/40" />
              <div className="tipe-pingpong absolute top-0 flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-md">
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">A conta vai e volta… e a maquininha também</p>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />Minutos de ida e volta entre mesa e caixa, cliente por cliente
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-7 text-secondary-foreground shadow-2xl" style={{ background: "var(--gradient-brand)" }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Com a TIPE</h3>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Tecnologia na mesa</span>
          </div>
          <ul className="relative mt-5 space-y-3">
            {newSteps.map((s) => (
              <li key={s.t} className="flex items-center gap-3 rounded-xl bg-secondary-foreground/10 px-4 py-3 text-sm">
                <s.icon className="h-4 w-4 shrink-0 text-primary" />
                {s.t}
              </li>
            ))}
          </ul>
          <div className="relative mt-6 rounded-2xl bg-background p-4 text-foreground shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold">Mesa 12</span>
              <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Ao vivo
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {liveItems.map(([n, v], i) => (
                <li key={n} className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="tipe-check h-3 w-3" style={{ animationDelay: `${i * 0.7}s` }} />
                    </span>
                    {n}
                  </span>
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative mt-4 flex items-center gap-2 text-xs opacity-85">
            <Zap className="h-4 w-4 shrink-0 text-primary" />O pedido é lançado e já chega no celular do cliente
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {chips.map((c) => (
          <span key={c.t} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold shadow-sm">
            <c.icon className="h-4 w-4 text-primary" />
            {c.t}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-3xl border-2 border-primary/30 bg-secondary p-7 text-center text-secondary-foreground sm:p-9">
        <p className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">Zero mudança na sua rotina.</p>
        <p className="mt-4 opacity-80">
          O mesmo atendimento, o mesmo PDV, só que sem fila e sem maquininha rodando de mesa em mesa.
        </p>
        <a href="#lista-de-espera" className="mt-6 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 sm:px-6 sm:text-base">
          Garantir meus 30 dias grátis <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: QrCode, t: "Lê o QR Code", d: "Cada mesa tem um totem com QR Code exclusivo. O cliente aponta a câmera e entra na conta." },
    { icon: Receipt, t: "Escolhe os itens", d: "Os pedidos lançados aparecem em tempo real. Ele paga tudo ou só o que consumiu, item por item." },
    { icon: Smartphone, t: "Paga como preferir", d: "Pix, Apple Pay, Google Pay e cartão, ou dinheiro e maquininha no estabelecimento." },
    { icon: Star, t: "Avalia e agradece", d: "Dá nota ao atendimento e, se quiser, uma gorjeta extra para a equipe." },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionTitle eyebrow="Como funciona" title="Da mesa ao pagamento em 4 toques" text="Um fluxo simples para o cliente: itens escolhidos, meio de pagamento, pronto. Tudo em menos de 30 segundos." />
      <div className="relative mt-10 grid gap-8 sm:mt-12 md:grid-cols-4 md:gap-6">
        <div aria-hidden className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent md:block" />
        {steps.map((s, i) => (
          <div key={s.t} className="relative text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary shadow-lg">
              <s.icon className="h-7 w-7" />
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">{i + 1}</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-bold">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentMethods() {
  const methods = [
    { icon: QrCode, name: "Pix", note: "Aprovado na hora" },
    { icon: Wallet, name: "Apple Pay", note: "Um toque no iPhone" },
    { icon: Smartphone, name: "Google Pay", note: "Carteira do Android" },
    { icon: CreditCard, name: "Cartão", note: "Processado pelo Pagar.me" },
    { icon: CreditCard, name: "Maquininha", note: "Confirmada pelo caixa" },
    { icon: Landmark, name: "Dinheiro", note: "Confirmado pelo caixa" },
  ];
  return (
    <section className="bg-muted/50 py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Formas de pagamento</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Cada cliente paga do jeito que já está acostumado</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Pagamentos digitais (Pix, Apple Pay, Google Pay e cartão) são processados pelo Pagar.me e aprovados na hora.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />O dinheiro dos pagamentos digitais cai direto na conta bancária escolhida pelo restaurante. A TIPE não retém nenhum valor.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Maquininha e dinheiro no estabelecimento também são aceitos e confirmados pelo caixa no painel.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />O restaurante escolhe no painel quais formas ativar: só digitais, só tradicionais, ou as duas.</li>
          </ul>
          <div className="mt-8 flex items-start gap-3 border-l-2 border-primary pl-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">Você escolhe no painel quais formas de pagamento quer oferecer.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {methods.map((method) => (
            <div key={method.name} className="flex min-h-32 flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><method.icon className="h-5 w-5" /></div>
              <div className="mt-5"><h3 className="font-display text-lg font-extrabold">{method.name}</h3><p className="mt-1 text-xs text-muted-foreground">{method.note}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MoneyDirect() {
  const items = [
    { icon: Landmark, t: "Direto na sua conta" },
    { icon: ShieldCheck, t: "Segurança Pagar.me" },
    { icon: RefreshCcw, t: "Conciliação automática" },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16">
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Recebimento</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">O dinheiro é seu. Direto na sua conta.</h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Os pagamentos digitais são processados pelo Pagar.me, com segurança de nível bancário, e caem direto na conta que o restaurante escolher. A TIPE não segura nenhum centavo. A conciliação é automática no painel.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.t} className="rounded-3xl border bg-card p-6 shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><i.icon className="h-6 w-6" /></span>
            <p className="mt-4 font-display font-bold">{i.t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  const tables = Array.from({ length: 12 }, (_, i) => i + 1);
  const status = (n: number) => (n % 5 === 0 ? "pend" : n % 3 === 0 ? "free" : "open");
  const bars = [40, 65, 52, 80, 70, 95, 88];
  const features = [
    { icon: MonitorSmartphone, t: "Mapa de mesas ao vivo", d: "Veja o que foi lançado, pago e o que aguarda confirmação." },
    { icon: Landmark, t: "Confirmação no caixa", d: "Dinheiro e maquininha são confirmados manualmente, com segurança." },
    { icon: History, t: "Histórico completo", d: "Pedidos, pagamentos e reaberturas registrados com data e horário." },
    { icon: BarChart3, t: "Relatórios e equipe", d: "Faturamento, gorjetas e produtividade por garçom." },
  ];
  return (
    <section id="painel" className="relative overflow-hidden bg-secondary py-12 text-secondary-foreground sm:py-16">
      <div aria-hidden className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Painel do restaurante</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Seu salão inteiro na palma da mão</h2>
          <p className="mt-4 opacity-80">Cada mesa, cada item e cada pagamento em tempo real, no endereço exclusivo do seu restaurante.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.t}>
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-2 font-display font-bold">{f.t}</h3>
                <p className="mt-1 text-sm opacity-75">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-primary/20 bg-card p-5 text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">tipe.digital/marealta</p><p className="font-display font-bold">Maré Alta · Salão</p></div>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Ao vivo</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["Faturado hoje", "R$ 8.420"], ["Mesas abertas", "8/20"], ["Gorjetas", "R$ 912"]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-muted p-3"><p className="text-[10px] text-muted-foreground">{l}</p><p className="font-display text-sm font-bold sm:text-lg">{v}</p></div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="grid grid-cols-4 gap-2">
              {tables.map((n) => {
                const s = status(n);
                return (
                  <div key={n} className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold ${s === "open" ? "bg-primary text-primary-foreground" : s === "pend" ? "bg-warning text-warning-foreground" : "border border-dashed text-muted-foreground"}`}>
                    {n}<span className="text-[8px] font-medium opacity-80">{s === "open" ? "aberta" : s === "pend" ? "pendente" : "livre"}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col rounded-xl bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">Faturamento da semana</p>
              <div className="mt-2 flex flex-1 items-end gap-1.5">
                {bars.map((b, i) => <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-secondary to-primary" style={{ height: `${b}%`, minHeight: 8 }} />)}
              </div>
              <div className="mt-1 flex justify-between text-[8px] text-muted-foreground">{"STQQSSD".split("").map((d, i) => <span key={i}>{d}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Lista futura de sistemas integrados. Fica oculta enquanto estiver vazia.
const PDVS_INTEGRADOS: string[] = [];

function PdvOptions() {
  const itens = [
    { icon: Store, t: "Sem trocar de sistema" },
    { icon: Users, t: "Implantação acompanhada pela equipe TIPE" },
    { icon: Plug, t: "Integração com o seu PDV em implantação" },
  ];
  return (
    <section id="pdv" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
      <SectionTitle eyebrow="Integração" title="Funciona no seu restaurante desde o primeiro dia" text="A TIPE não substitui o seu sistema. Ela cuida só do fechamento da conta. A integração direta com o seu PDV é feita pela nossa equipe, junto com você. Enquanto isso, ou se você não usa PDV, os pedidos podem ser lançados pelo painel TIPE em segundos." />
      <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3">
        {itens.map((i) => (
          <div key={i.t} className="flex items-center gap-4 rounded-3xl border bg-card p-6 shadow-sm">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><i.icon className="h-6 w-6" /></span>
            <p className="font-display font-bold">{i.t}</p>
          </div>
        ))}
      </div>
      {PDVS_INTEGRADOS.length > 0 && (
        <div className="mt-8 text-center">
          <p className="font-display text-sm font-bold">PDVs integrados</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">{PDVS_INTEGRADOS.map((p) => <span key={p} className="rounded-xl border bg-background px-3 py-1.5 font-display text-sm font-bold">{p}</span>)}</div>
        </div>
      )}
    </section>
  );
}

function LebreSection() {
  const features = [
    { icon: Mic, title: "Fala ou digita", text: "Fale direto pelo microfone ou escreva. Ela transcreve na hora e você revisa antes de enviar." },
    { icon: Paperclip, title: "Lê arquivos e fotos", text: "Envie fotos de comandas, cardápios ou relatórios em PDF para ela analisar e resumir." },
    { icon: Zap, title: "Executa ações", text: "Prepara tarefas reais, como abrir uma mesa, e só executa depois da sua confirmação." },
  ] as const;
  const examples = ["Abrir a mesa 08", "Analisar foto do cardápio", "Resumir pagamentos do almoço"];
  const openLebre = () => document.querySelector<HTMLButtonElement>('[aria-label="Conversar com a Lebre"]')?.click();
  return (
    <section className="relative overflow-hidden bg-secondary py-12 text-secondary-foreground sm:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="relative mx-auto h-[300px] w-full max-w-sm sm:h-[360px]">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          <img src={mascotAssistant} alt="Lebre, assistente da TIPE" loading="lazy" width={3584} height={4800} className="relative mx-auto h-full w-auto object-contain drop-shadow-2xl" />
          <div className="absolute right-0 top-10 flex items-center gap-2 rounded-full border border-primary/30 bg-background/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md sm:-right-4">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
            Abrindo mesa 12...
          </div>
          <div className="absolute bottom-12 left-0 flex items-center gap-2 rounded-full border border-primary/30 bg-background/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md sm:-left-2">
            <Mic className="h-3.5 w-3.5 text-primary" />Ouvindo você
          </div>
        </div>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Conheça a Lebre</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Um recurso do seu painel</h2>
          <p className="mt-4 max-w-2xl opacity-80">Dentro do seu painel, a Lebre te ajuda a entender o sistema, resumir a operação e preparar ações. Ela entende voz, texto, fotos e PDFs, e só executa uma ação depois da confirmação do gestor.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {examples.map((e) => (
              <button key={e} type="button" onClick={openLebre} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/20">“{e}”</button>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="border-l-2 border-primary pl-4"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-2 font-display font-bold">{title}</h3><p className="mt-1 text-sm opacity-70">{text}</p></div>
            ))}
          </div>
          <div className="mt-8"><Button onClick={openLebre}><Bot />Conversar com a Lebre</Button></div>
        </div>
      </div>
    </section>
  );
}

const plans = [
  ...PLANS.map((p) => ({ id: p.id as string | null, name: p.name, price: SHOW_PLAN_PRICES ? priceLabel(p.price) : null, tables: `Até ${p.maxTables} mesas`, popular: "popular" in p ? p.popular : false, features: [...p.features] as string[] })),
  { id: null, name: "Personalizado", price: null, tables: "Acima de 40 mesas ou redes", popular: false, features: ["Várias unidades", "Painel consolidado", "Integrações sob medida", "Condições negociadas"] },
];

function Pricing() {
  return (
    <section id="planos" className="scroll-mt-20 bg-muted/50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="Planos" title="Assinatura mensal, simples como streaming" text="Os primeiros restaurantes ganham 30 dias grátis, sem cartão de crédito. Depois dos 30 dias, os planos passam a ser pagos." />
        <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-3xl border p-7 ${p.popular ? "border-primary bg-secondary text-secondary-foreground shadow-2xl xl:-translate-y-4" : "bg-card shadow-sm"}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Recomendado</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className={`text-sm ${p.popular ? "opacity-75" : "text-muted-foreground"}`}>{p.tables}</p>
              <div className="mt-5">
                {p.price ? <p className="font-display text-3xl font-extrabold">R$ {p.price}<span className="text-sm font-semibold opacity-70">/mês</span></p> : <p className="font-display text-xl font-extrabold">Valores no lançamento</p>}
                <p className="mt-1 text-xs font-semibold text-primary">30 dias grátis, sem cartão</p>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>)}
              </ul>
              <a href="#lista-de-espera" className={`mt-8 rounded-full py-3 text-center font-display text-sm font-semibold transition-transform hover:-translate-y-0.5 ${p.popular ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>Garantir meus 30 dias grátis</a>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Restaurantes fundadores terão condições especiais. Os primeiros ganham 30 dias grátis, sem cartão de crédito.</p>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Planos mensais sem fidelidade: cancele quando quiser. No plano anual, os totens com QR Code estão incluídos.</p>
      </div>
    </section>
  );
}

// Prova social OCULTA: só aparece quando houver dados reais preenchidos aqui.
const PROVA_SOCIAL: { logo: string; restaurante: string; depoimentoDono: string; depoimentoGarcom: string; resultado: string }[] = [];

function SocialProof() {
  if (PROVA_SOCIAL.length === 0) return null;
  return (
    <section className="bg-muted/50 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Prova social" title="Restaurantes que já pagam sem esperar" text="" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {PROVA_SOCIAL.map((p) => (
            <div key={p.restaurante} className="rounded-3xl border bg-card p-6">
              <img src={p.logo} alt={p.restaurante} loading="lazy" className="h-10 w-auto" />
              <p className="mt-4 font-display text-3xl font-extrabold text-primary">{p.resultado}</p>
              <blockquote className="mt-3 text-sm">“{p.depoimentoDono}”</blockquote>
              <blockquote className="mt-3 text-sm text-muted-foreground">“{p.depoimentoGarcom}”</blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const groups: { label: string; faqs: [string, string][] }[] = [
    {
      label: "No salão, na mesa",
      faqs: [
        ["O cliente precisa instalar alguma coisa?", "Não. Ele lê o QR Code do totem da mesa com a câmera do celular e já entra na conta. Ele informa nome e sobrenome só na primeira vez; o celular guarda isso para as próximas visitas."],
        ["Como a conta chega no celular do cliente?", "Quando o garçom lança um pedido, o item aparece na mesa em tempo real, com data e horário, como no caixa."],
        ["O cliente pode pagar só uma parte da conta?", "Pode. Cada pessoa escolhe o que vai pagar, item por item, e esses itens saem da conta na hora. Quem terminar antes não precisa esperar os outros, e ninguém paga pelo que não consumiu."],
        ["Quais formas de pagamento o cliente pode usar?", "Pagamentos digitais (Pix, Apple Pay, Google Pay e cartão) são processados pelo Pagar.me e aprovados na hora, e o dinheiro cai direto na conta bancária escolhida pelo restaurante. A TIPE não retém nenhum valor. Maquininha e dinheiro no estabelecimento também são aceitos e confirmados pelo caixa no painel. Você escolhe no painel quais formas de pagamento quer oferecer: só digitais, só tradicionais, ou as duas."],
        ["E se o cliente quiser conferir a conta antes de pagar?", "A conta completa fica sempre visível, com todos os itens lançados. Se ele identificar algo errado, o recomendado é falar com o garçom ou o caixa antes de concluir o pagamento."],
        ["Como funciona a gorjeta extra?", "A taxa de serviço continua funcionando como hoje. A gorjeta extra é opcional e aparece depois da avaliação do atendimento. A TIPE recebe o valor e separa 70% para a equipe do restaurante e 30% como taxa da plataforma. O cliente vê os valores antes de confirmar."],
      ],
    },
    {
      label: "Painel, implantação e planos",
      faqs: [
        ["O que o restaurante confirma no painel?", "Os pagamentos recebidos em dinheiro ou maquininha são confirmados com um toque. Pagamentos digitais concluídos são aprovados automaticamente."],
        ["E se um pagamento sair errado?", "O restaurante cancela pelo painel e os itens voltam a ficar disponíveis na conta. Tudo permanece registrado com data, horário e nome de quem pagou."],
        ["Preciso trocar o meu sistema?", "Não. A TIPE não substitui o seu sistema. Ela cuida só do fechamento da conta. A integração direta com o seu PDV é feita pela nossa equipe, junto com você. Enquanto isso, ou se você não usa PDV, os pedidos podem ser lançados pelo painel TIPE em segundos."],
        ["Quanto tempo leva para começar?", "A implantação é assistida: cadastramos as mesas, geramos os totens com QR Code e treinamos a equipe. Você pode começar por um salão e ir ampliando conforme o resultado."],
        ["Como é cobrada a assinatura?", "Mensalmente ou no plano anual, de acordo com o número de mesas. Os planos mensais não têm fidelidade, e no plano anual os totens estão incluídos. Os valores serão divulgados no lançamento, e os restaurantes da lista de espera terão condições especiais. A TIPE não cobra tarifa por transação sobre as contas; o restaurante paga apenas as tarifas do Pagar.me."],
      ],
    },
  ];
  return (
    <section id="duvidas" className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Dúvidas</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Tudo que um restaurante precisa saber antes de colocar a TIPE na mesa, do atendimento ao caixa.
        </p>
        <div className="mt-8 flex items-center gap-3 rounded-lg border bg-card p-4"><Headphones className="h-6 w-6 text-primary" /><p className="text-sm">Prefere conversar? A Lebre responde agora e nossa equipe continua quando você quiser.</p></div>
      </div>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-primary">{group.label}</p>
            <div className="space-y-3">
              {group.faqs.map(([q, a]) => (
                <details key={q} className="group rounded-2xl border bg-card p-5 open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display font-semibold">
                    {q}<ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="lista-de-espera" className="scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[2rem] p-6 text-secondary-foreground shadow-2xl sm:p-12 lg:grid-cols-2" style={{ background: "var(--gradient-brand)" }}>
        <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Garanta seus 30 dias grátis</h2>
          <p className="mt-4 opacity-85">Os primeiros restaurantes ganham 30 dias grátis, sem cartão de crédito. Entre na lista de espera e a equipe TIPE agenda a sua demonstração.</p>
          <ul className="mt-6 space-y-2 text-sm">
            {["Vagas na ordem de chegada", "Demonstração gratuita", "Implantação acompanhada"].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-3xl bg-card p-5 text-card-foreground shadow-xl sm:p-6">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo.url} alt="TIPE" className="h-9 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">Pague. Sem esperar. Pagamento na mesa por QR Code para restaurantes, bares e cafeterias.</p>
          <a
            href="https://instagram.com/tipe.digital"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Instagram @tipe.digital"
          >
            <Instagram className="h-4 w-4" />
            @tipe.digital
          </a>
          <a href={whatsappLink(WHATSAPP_SITE_MESSAGE)} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <MessageCircle className="h-4 w-4" />WhatsApp
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-bold">Produto</p>
          <a href="#como-funciona" className="block text-muted-foreground hover:text-foreground">Como funciona</a>
          <a href="#pdv" className="block text-muted-foreground hover:text-foreground">Integração</a>
          <a href="#calculadora" className="block text-muted-foreground hover:text-foreground">Calculadora</a>
          <a href="#planos" className="block text-muted-foreground hover:text-foreground">Planos</a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-bold">Empresa</p>
          <span className="block text-muted-foreground">Área do restaurante · em breve</span>
          <a href="#lista-de-espera" className="block text-muted-foreground hover:text-foreground">Garantir meus 30 dias grátis</a>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-2 border-t px-4 py-5 text-xs sm:px-6">
        <Link to="/termos" className="text-muted-foreground hover:text-foreground">Termos de Uso</Link>
        <Link to="/privacidade" className="text-muted-foreground hover:text-foreground">Privacidade</Link>
        <Link to="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</Link>
        <PrivacyPreferences triggerClassName="text-muted-foreground hover:text-foreground" />
        <Link to="/termos-parceiros" className="text-muted-foreground hover:text-foreground">Termos para Parceiros</Link>
        <Link to="/privacidade/solicitacao" className="text-muted-foreground hover:text-foreground">Seus direitos (LGPD)</Link>
      </div>
      <p className="border-t px-4 py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {COMPANY.legalName} · CNPJ {COMPANY.cnpj} · {COMPANY.city}</p>
    </footer>
  );
}
