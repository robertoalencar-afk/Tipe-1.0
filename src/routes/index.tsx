import { createFileRoute, Link } from "@tanstack/react-router";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";
import { useState } from "react";
import { toast } from "sonner";
import {
  QrCode, Receipt, Smartphone, CheckCircle2, ChevronRight, MonitorSmartphone, History, Landmark,
  Plug, Store, Zap, ShieldCheck, Clock, Users, Check, Star, BarChart3, Wallet,
  Hand, ClipboardList, Calculator, ArrowLeftRight, CreditCard, Bot, Headphones,
} from "lucide-react";
import { submitLead } from "@/lib/tipe/leads.functions";
import { PLANS, TRIAL_DAYS, priceLabel, type PlanId } from "@/lib/tipe/plans";
import logo from "@/assets/logo-dark.png.asset.json";
import mascotAssistant from "@/assets/lebre-ai-official.svg";
import { LebreAssistant } from "@/components/tipe/LebreAssistant";
import { PaymentJourneyDemo } from "@/components/tipe/PaymentJourneyDemo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE | Pague. Sem esperar. | Pagamento na mesa e PDV para restaurantes" },
      {
        name: "description",
        content:
          "Plataforma TIPE: o cliente paga a conta pelo QR Code da mesa e o restaurante acompanha tudo em tempo real. Conecte seu PDV ou use o PDV TIPE. Planos a partir de R$ 49,90/mês, com 30 dias grátis.",
      },
      { property: "og:title", content: "TIPE | Pague. Sem esperar." },
      {
        property: "og:description",
        content: "Pagamento na mesa por QR Code, gorjeta extra para o garçom, painel em tempo real e PDV próprio. Assinatura a partir de R$ 49,90/mês, 30 dias grátis.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tipe.digital/" },
      { name: "twitter:card", content: "summary_large_image" },
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
        <Hero />
        <Stats />
        <Dinamica />
        <HowItWorks />
        <PaymentMethods />
        <Dashboard />
        <PdvOptions />
        <LebreSection />
        <Pricing />
        <Faq />
        <ContactSection />
      </main>
      <Footer />
      <LebreAssistant />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/"><img src={logo.url} alt="TIPE" className="h-9 w-auto object-contain" /></Link>
        <nav className="flex items-center gap-1 text-sm lg:gap-2">
          {[["#dinamica", "O novo jeito"], ["#como-funciona", "Como funciona"], ["#painel", "Painel"], ["#pdv", "PDV"], ["#planos", "Planos"], ["#duvidas", "Dúvidas"]].map(([h, l]) => (
            <a key={h} href={h} className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground lg:block">{l}</a>
          ))}
          <Link to="/entrar" className="hidden rounded-full px-4 py-2 font-semibold text-foreground hover:bg-muted sm:block">Entrar</Link>
          <Link to="/simulador" className="hidden rounded-full border px-4 py-2 font-semibold text-foreground sm:block">Simular</Link>
          <Link to="/cadastro" className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">Testar grátis</Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden text-secondary-foreground" style={{ background: "var(--gradient-brand)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Pague. <span className="text-primary">Sem esperar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
            A conta chega ao celular do cliente pelo QR Code da mesa. Ele confere, escolhe o que vai pagar e resolve tudo sem interromper o atendimento.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/cadastro" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5">
              Testar 30 dias grátis <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/simulador" className="inline-flex items-center gap-2 rounded-full border border-current/25 px-6 py-3 font-display font-semibold transition-colors hover:bg-primary/10">
              Simular experiência
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-80">
            {["Sem aplicativo para baixar", "Feita para conversar com seu PDV", "30 dias grátis sem cartão"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</span>
            ))}
          </div>
        </div>
        <div>
          <PaymentJourneyDemo />
          <p className="mx-auto mt-7 max-w-sm text-center text-xs opacity-65">Demonstração da experiência planejada para o cliente.</p>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats: { icon: any; v: string; l: string; small?: boolean }[] = [
    { icon: Clock, v: "Na hora", l: "a conta aparece no celular do cliente", small: true },
    { icon: Wallet, v: "Na mesa", l: "cada pessoa escolhe o que deseja pagar", small: true },
    { icon: Users, v: "Sem fila", l: "o cliente não precisa ir até o caixa", small: true },
    { icon: ShieldCheck, v: "Ao vivo", l: "o restaurante acompanha cada pagamento", small: true },
  ];
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
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
    { icon: Plug, t: "Tempo real com o seu PDV" },
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
    <section id="dinamica" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
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
            <Zap className="h-4 w-4 shrink-0 text-primary" />O pedido sai do PDV e já chega no celular do cliente
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
        <p className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">O jeito de pagar a conta no restaurante mudou. Agora, tudo acontece na mesa.</p>
        <p className="mt-4 opacity-80">
           A conta chega no celular antes de o cliente pedir. O garçom não vive em idas e voltas com a maquininha.
          Quem coloca a nova tecnologia primeiro nas mesas gira mais salão.
        </p>
        <a href="#fale-conosco" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5">
          Colocar a TIPE nas minhas mesas <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: QrCode, t: "Lê o QR Code", d: "Cada mesa tem um totem com QR Code exclusivo. O cliente aponta a câmera e entra na conta." },
    { icon: Receipt, t: "Escolhe os itens", d: "A conta chega do PDV em tempo real. Ele paga tudo ou só o que consumiu, item por item." },
    { icon: Smartphone, t: "Paga como preferir", d: "Carteira digital e Pix, quando habilitados, ou dinheiro e maquininha no estabelecimento." },
    { icon: Star, t: "Avalia e agradece", d: "Dá nota ao atendimento e, se quiser, uma gorjeta extra direto para o garçom." },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionTitle eyebrow="Como funciona" title="Da mesa ao pagamento em 4 toques" text="Um fluxo simples para o cliente: itens escolhidos, meio de pagamento, pronto." />
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
    { icon: Wallet, name: "Apple Pay", note: "Um toque no iPhone" },
    { icon: Smartphone, name: "Google Pay", note: "Carteira do Android" },
    { icon: QrCode, name: "Pix", note: "Confirmação digital" },
    { icon: CreditCard, name: "Maquininha", note: "Pagamento no local" },
    { icon: Landmark, name: "Dinheiro", note: "Confirmação pelo caixa" },
  ];
  return (
    <section className="bg-muted/50 py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Formas de pagamento</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Cada cliente paga do jeito que já está acostumado</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">A experiência foi pensada para unir a rapidez das carteiras digitais com as opções que o restaurante já recebe no dia a dia.</p>
          <div className="mt-8 flex items-start gap-3 border-l-2 border-primary pl-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">Carteiras digitais e Pix aparecem conforme a habilitação do provedor de pagamento do restaurante.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {methods.map((method, index) => (
            <div key={method.name} className={`flex min-h-36 flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm ${index < 2 ? "sm:col-span-3" : "sm:col-span-2"}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><method.icon className="h-5 w-5" /></div>
              <div className="mt-6"><h3 className="font-display text-lg font-extrabold">{method.name}</h3><p className="mt-1 text-xs text-muted-foreground">{method.note}</p></div>
            </div>
          ))}
        </div>
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
    <section id="painel" className="relative overflow-hidden bg-secondary py-16 text-secondary-foreground sm:py-20">
      <div aria-hidden className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Painel do restaurante</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Seu salão inteiro na palma da mão</h2>
          <p className="mt-4 opacity-80">Um espelho do seu PDV com cada mesa, cada item e cada pagamento, acessível pelo endereço exclusivo do seu restaurante.</p>
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

function PdvOptions() {
  return (
    <section id="pdv" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionTitle eyebrow="PDV" title="Use o seu PDV ou contrate o nosso" text="A TIPE se adapta ao seu restaurante. Você escolhe como os pedidos chegam à mesa." />
      <div className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-2">
        <div className="min-w-0 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Plug className="h-7 w-7" /></div>
          <h3 className="mt-5 font-display text-2xl font-bold">Conecte seu PDV atual</h3>
           <p className="mt-2 text-muted-foreground">Já tem um sistema de caixa? Nossa equipe avalia a conexão e conduz a implantação sem prometer compatibilidade antes da homologação.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {["Seu PDV", "API aberta", "Implantação assistida"].map((p) => (
              <span key={p} className="rounded-xl border bg-background px-4 py-2 font-display text-sm font-bold">{p}</span>
            ))}
            <Zap className="h-5 w-5 text-primary" />
            <img src={logo.url} alt="TIPE" className="h-6 w-auto" />
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            {["Conexão analisada por fornecedor", "Formato único para mesas e pedidos", "Acompanhamento da equipe TIPE"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative min-w-0 overflow-hidden rounded-3xl p-6 text-secondary-foreground shadow-xl sm:p-8" style={{ background: "var(--gradient-brand)" }}>
          <span className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Novo</span>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Store className="h-7 w-7" /></div>
          <h3 className="mt-5 font-display text-2xl font-bold">PDV TIPE</h3>
          <p className="mt-2 opacity-85">Não tem sistema ou quer trocar? Contrate o PDV da TIPE: cardápio, comandas, garçons e caixa, já integrados ao pagamento na mesa.</p>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            {["Cardápio e comandas", "Equipe e garçons", "Controle de caixa", "Relatórios", "Mesas e QR Codes", "Tudo em um só lugar"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LebreSection() {
  const features = [
    ["Responde com clareza", "Tira dúvidas sobre implantação, planos, pagamentos e uso do sistema."],
    ["Entende a operação", "Dentro do painel, consulta somente os dados do restaurante que a pessoa pode acessar."],
    ["Prepara ações seguras", "Mostra exatamente o que será feito e só executa depois da confirmação do usuário."],
  ] as const;
  return (
    <section className="bg-secondary py-16 text-secondary-foreground sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="relative mx-auto h-[290px] w-full max-w-sm sm:h-[340px]">
          <div className="absolute inset-x-10 bottom-0 h-40 rounded-full bg-primary/10" />
          <img src={mascotAssistant} alt="Lebre, assistente da TIPE" loading="lazy" width={3584} height={4800} className="relative mx-auto h-full w-auto object-contain" />
        </div>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Conheça a Lebre</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Uma especialista TIPE sempre por perto</h2>
          <p className="mt-4 max-w-2xl opacity-80">Na página, ela ajuda quem ainda está conhecendo a TIPE. No restaurante, explica o sistema, resume a operação e prepara tarefas com segurança.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {features.map(([title, text], index) => (
              <div key={title} className="border-l-2 border-primary pl-4"><span className="font-display text-xs font-bold text-primary">0{index + 1}</span><h3 className="mt-2 font-display font-bold">{title}</h3><p className="mt-1 text-sm opacity-70">{text}</p></div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Conversar com a Lebre"]')?.click()}><Bot />Conversar com a Lebre</Button><Link to="/cadastro" className="inline-flex items-center rounded-md border border-primary/40 px-4 text-sm font-semibold">Levar para meu restaurante</Link></div>
        </div>
      </div>
    </section>
  );
}

const plans = [
  ...PLANS.map((p) => ({ id: p.id as string | null, name: p.name, price: priceLabel(p.price) as string | null, tables: `Até ${p.maxTables} mesas`, popular: "popular" in p ? p.popular : false, features: [...p.features] as string[] })),
  { id: null, name: "Personalizado", price: null, tables: "Acima de 40 mesas ou redes", popular: false, features: ["Várias unidades", "Painel consolidado", "Integrações sob medida", "Condições negociadas"] },
];

function Pricing() {
  return (
    <section id="planos" className="bg-muted/50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="Planos" title="Assinatura mensal, simples como streaming" text={`Teste grátis por ${TRIAL_DAYS} dias, sem cartão. Depois, escolha pelo número de mesas.`} />
        <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-3xl border p-7 ${p.popular ? "border-primary bg-secondary text-secondary-foreground shadow-2xl xl:-translate-y-4" : "bg-card shadow-sm"}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Mais escolhido</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className={`text-sm ${p.popular ? "opacity-75" : "text-muted-foreground"}`}>{p.tables}</p>
              <div className="mt-5">
                {p.price ? (
                  <p className="font-display"><span className="text-sm">R$</span> <span className="text-4xl font-extrabold">{p.price}</span><span className="text-sm opacity-70">/mês</span></p>
                ) : (
                  <p className="font-display text-3xl font-extrabold">Sob consulta</p>
                )}
                {p.price && <p className="mt-1 text-xs font-semibold text-primary">{TRIAL_DAYS} dias grátis</p>}
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>)}
              </ul>
              {p.id ? (
                <Link to="/cadastro" search={{ plano: p.id as PlanId }} className={`mt-8 rounded-full py-3 text-center font-display font-semibold transition-transform hover:-translate-y-0.5 ${p.popular ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>Testar grátis</Link>
              ) : (
                <a href="#fale-conosco" className="mt-8 rounded-full border border-border py-3 text-center font-display font-semibold transition-transform hover:-translate-y-0.5 hover:bg-muted">Falar com vendas</a>
              )}
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Sem cartão no teste. Sem fidelidade. Cancele quando quiser.</p>
      </div>
    </section>
  );
}

function Faq() {
  const groups: { label: string; faqs: [string, string][] }[] = [
    {
      label: "No salão, na mesa",
      faqs: [
        ["O cliente precisa baixar algum aplicativo?", "Não. Ele lê o QR Code do totem da mesa com a câmera do celular e já entra na conta. Não precisa instalar nada. Ele informa apenas o nome para identificar o pagamento."],
        ["Como a conta chega no celular do cliente?", "Direto do sistema do restaurante. Quando o garçom lança um pedido, o item aparece na mesa em tempo real, com data e horário, como no caixa."],
        ["O cliente pode pagar só uma parte da conta?", "Pode. Cada pessoa escolhe o que vai pagar, item por item, e esses itens saem da conta na hora. Quem terminar antes não precisa esperar os outros, e ninguém paga pelo que não consumiu."],
        ["Quais formas de pagamento o cliente pode usar?", "Ele pode pagar no estabelecimento com dinheiro ou maquininha. O Pix e as carteiras digitais serão apresentados conforme a habilitação do provedor de pagamento."],
        ["E se o cliente quiser conferir a conta antes de pagar?", "A conta completa fica sempre visível, com todos os itens lançados. Se ele identificar algo errado, o recomendado é falar com o garçom ou o caixa antes de concluir o pagamento."],
        ["Como funciona a gorjeta extra?", "A taxa de serviço entra na conta normalmente. A gorjeta extra é opcional e incentiva um atendimento ainda melhor. O cliente escolhe se quer agradecer depois da avaliação."],
      ],
    },
    {
      label: "Painel, implantação e planos",
      faqs: [
        ["O que o restaurante confirma no painel?", "Os pagamentos recebidos em dinheiro ou maquininha são confirmados com um toque. Pagamentos digitais concluídos são aprovados automaticamente."],
        ["E se um pagamento sair errado?", "O restaurante cancela pelo painel e os itens voltam a ficar disponíveis na conta. Tudo permanece registrado com data, horário e nome de quem pagou."],
        ["Preciso trocar o meu sistema?", "Não necessariamente. A equipe TIPE avalia a integração com o PDV que você já usa. Se preferir, você pode usar o PDV TIPE."],
        ["Quanto tempo leva para começar?", "A implantação é assistida: cadastramos as mesas, geramos os totens com QR Code e treinamos a equipe. Você pode começar por um salão e ir ampliando conforme o resultado."],
        ["Como é cobrada a assinatura?", "Mensalmente, de acordo com o número de mesas do seu restaurante, a partir de R$ 49,90/mês, com 30 dias grátis e sem cartão no teste. Sem fidelidade: você cancela quando quiser."],
      ],
    },
  ];
  return (
    <section id="duvidas" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
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

const emptyLead = { restaurantName: "", contactName: "", email: "", phone: "", message: "" };

function ContactSection() {
  const [form, setForm] = useState(emptyLead);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof emptyLead) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await submitLead({
        data: {
          restaurantName: form.restaurantName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
        },
      });
      setSent(true);
      toast.success("Recebemos o seu contato!", { description: "A equipe TIPE responde em até 1 dia útil." });
    } catch {
      setError("Não foi possível enviar agora. Tente de novo em instantes.");
    } finally {
      setSending(false);
    }
  }

  const input = "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
  return (
    <section id="fale-conosco" className="px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[2rem] p-8 text-secondary-foreground shadow-2xl sm:p-12 lg:grid-cols-2" style={{ background: "var(--gradient-brand)" }}>
        <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Leve a TIPE para o seu restaurante</h2>
          <p className="mt-4 opacity-85">Conte um pouco sobre o seu salão. Nossa equipe apresenta a plataforma, indica o plano ideal e ajuda na integração com o seu PDV ou na implantação do PDV TIPE.</p>
          <ul className="mt-6 space-y-2 text-sm">
            {["Demonstração gratuita", "Resposta em até 1 dia útil", "Implantação acompanhada"].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-3xl bg-card p-6 text-card-foreground shadow-xl">
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <p className="mt-4 font-display text-xl font-bold">Contato recebido!</p>
              <p className="mt-2 text-sm text-muted-foreground">Em breve a equipe TIPE fala com você.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input required maxLength={120} placeholder="Nome do restaurante" className={input} value={form.restaurantName} onChange={set("restaurantName")} />
              <input required maxLength={120} placeholder="Seu nome" className={input} value={form.contactName} onChange={set("contactName")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input required type="email" maxLength={255} placeholder="E-mail" className={input} value={form.email} onChange={set("email")} />
                <input maxLength={30} placeholder="WhatsApp (opcional)" className={input} value={form.phone} onChange={set("phone")} />
              </div>
              <textarea maxLength={1000} rows={3} placeholder="Quantas mesas? Já usa algum PDV?" className={input} value={form.message} onChange={set("message")} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button disabled={sending} className="h-11 w-full rounded-full font-display font-semibold">
                {sending ? "Enviando..." : "Quero conhecer a TIPE"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Usaremos seus dados apenas para responder ao contato. Veja a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.</p>
            </form>
          )}
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
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">Pague. Sem esperar. Pagamento na mesa, gorjeta extra e PDV para restaurantes.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-bold">Produto</p>
          <a href="#como-funciona" className="block text-muted-foreground hover:text-foreground">Como funciona</a>
          <a href="#pdv" className="block text-muted-foreground hover:text-foreground">PDV TIPE</a>
          <a href="#planos" className="block text-muted-foreground hover:text-foreground">Planos</a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-bold">Empresa</p>
          <Link to="/entrar" className="block text-muted-foreground hover:text-foreground">Área do restaurante</Link>
          <a href="#fale-conosco" className="block text-muted-foreground hover:text-foreground">Fale conosco</a>
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
      <p className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} TIPE · tipe.digital</p>
    </footer>
  );
}
