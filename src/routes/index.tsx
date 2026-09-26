import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  QrCode, Receipt, Smartphone, CheckCircle2, ChevronRight, MonitorSmartphone, History, Landmark,
  Plug, Store, Zap, ShieldCheck, TrendingUp, Clock, Users, Sparkles, Check, Star, BarChart3, Wallet,
} from "lucide-react";
import { submitLead } from "@/lib/tipe/leads.functions";
import logo from "@/assets/logo-dark.png.asset.json";
import mascotThanks from "@/assets/mascot-thanks.png";
import mascotWaiting from "@/assets/mascot-waiting.png";
import mascotRating from "@/assets/mascot-rating.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE — Pague. Sem esperar. | Pagamento na mesa e PDV para restaurantes" },
      {
        name: "description",
        content:
          "Plataforma TIPE: o cliente paga a conta pelo QR Code da mesa e o restaurante acompanha tudo em tempo real. Conecte seu PDV ou use o PDV TIPE. Planos a partir de R$ 199/mês.",
      },
      { property: "og:title", content: "TIPE — Pague. Sem esperar." },
      {
        property: "og:description",
        content: "Pagamento na mesa por QR Code, gorjeta digital, painel em tempo real e PDV próprio. Planos por assinatura a partir de R$ 199/mês.",
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
        <HowItWorks />
        <Dashboard />
        <PdvOptions />
        <Pricing />
        <Faq />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/"><img src={logo.url} alt="TIPE" className="h-9 w-auto object-contain" /></Link>
        <nav className="flex items-center gap-1 text-sm lg:gap-2">
          {[["#como-funciona", "Como funciona"], ["#painel", "Painel"], ["#pdv", "PDV"], ["#planos", "Planos"], ["#duvidas", "Dúvidas"]].map(([h, l]) => (
            <a key={h} href={h} className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground lg:block">{l}</a>
          ))}
          <Link to="/entrar" className="hidden rounded-full px-4 py-2 font-semibold text-foreground hover:bg-muted sm:block">Entrar</Link>
          <a href="#fale-conosco" className="rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
            Quero a TIPE
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden text-secondary-foreground" style={{ background: "var(--gradient-brand)" }}>
      <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Tipe 1.0 · pagamento na mesa + PDV
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Pague. <span className="text-primary">Sem esperar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
            Seu cliente lê o QR Code da mesa, escolhe o que vai pagar, paga pelo celular e ainda
            deixa a gorjeta. Seu restaurante gira mais mesas e acompanha tudo em tempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#fale-conosco" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5">
              Agendar demonstração <ChevronRight className="h-4 w-4" />
            </a>
            <a href="#planos" className="inline-flex items-center gap-2 rounded-full border border-current/25 px-6 py-3 font-display font-semibold transition-colors hover:bg-primary/10">
              Ver planos
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-80">
            {["Sem aplicativo para baixar", "Integra com seu PDV", "Gorjeta 100% digital"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</span>
            ))}
          </div>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

function PhoneMockup() {
  const items = [["Moqueca de peixe", 1, "89,90"], ["Caipirinha", 2, "44,00"], ["Água com gás", 1, "7,50"]] as const;
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <img src={mascotThanks} alt="" aria-hidden className="absolute -left-16 bottom-4 z-20 hidden w-36 drop-shadow-2xl sm:block" />
      <div className="relative z-10 mx-auto w-[290px] rounded-[2.6rem] border-[10px] border-foreground/90 bg-card p-4 text-card-foreground shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <img src={logo.url} alt="" className="h-6 w-auto" />
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Mesa 12</span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Olá, Ana! Escolha o que vai pagar</p>
        <div className="mt-3 space-y-2">
          {items.map(([n, q, v]) => (
            <div key={n} className="flex items-center justify-between rounded-xl border bg-background p-2.5 text-xs">
              <div className="flex items-center gap-2"><span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-bold text-primary">{q}×</span>{n}</div>
              <span className="font-semibold">R$ {v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t pt-3 text-xs text-muted-foreground"><span>Taxa de serviço 10%</span><span>R$ 14,14</span></div>
        <div className="mt-1 flex justify-between font-display text-base font-bold"><span>Total</span><span>R$ 155,54</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
          <div className="rounded-xl border-2 border-primary bg-primary/10 p-2 text-center">Pix</div>
          <div className="rounded-xl border p-2 text-center">No local</div>
        </div>
        <div className="mt-3 rounded-full bg-primary py-2.5 text-center font-display text-sm font-bold text-primary-foreground">Pagar R$ 155,54</div>
      </div>
      <div className="absolute -right-4 top-16 z-20 rounded-2xl bg-card p-3 text-card-foreground shadow-xl">
        <p className="flex items-center gap-1.5 text-xs font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Pagamento aprovado</p>
        <p className="text-[10px] text-muted-foreground">Mesa 12 · 21:43</p>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { icon: Clock, v: "-15 min", l: "de espera pela conta por mesa" },
    { icon: TrendingUp, v: "+20%", l: "de giro de mesas no horário de pico" },
    { icon: Wallet, v: "100%", l: "das gorjetas pagas no digital" },
    { icon: Users, v: "0", l: "aplicativos para o cliente baixar" },
  ];
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-xl md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="bg-card p-6">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-extrabold">{s.v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Estimativas de referência para restaurantes com pagamento na mesa.</p>
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

function HowItWorks() {
  const steps = [
    { icon: QrCode, t: "Lê o QR Code", d: "Cada mesa tem um totem com QR Code exclusivo. O cliente aponta a câmera e entra na conta." },
    { icon: Receipt, t: "Escolhe os itens", d: "A conta chega do PDV em tempo real. Ele paga tudo ou só o que consumiu, item por item." },
    { icon: Smartphone, t: "Paga como quiser", d: "Pix e carteira digital na hora, ou dinheiro e maquininha com confirmação do caixa." },
    { icon: Star, t: "Avalia e agradece", d: "Dá nota ao atendimento e, se quiser, uma gorjeta extra direto para o garçom." },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionTitle eyebrow="Como funciona" title="Da mesa ao pagamento em 4 toques" text="Um fluxo simples para o cliente: itens escolhidos, meio de pagamento, pronto." />
      <div className="relative mt-14 grid gap-6 md:grid-cols-4">
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
    <section id="painel" className="relative overflow-hidden bg-secondary py-20 text-secondary-foreground sm:py-28">
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
    <section id="pdv" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionTitle eyebrow="PDV" title="Use o seu PDV ou contrate o nosso" text="A TIPE se adapta ao seu restaurante. Você escolhe como os pedidos chegam à mesa." />
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Plug className="h-7 w-7" /></div>
          <h3 className="mt-5 font-display text-2xl font-bold">Conecte seu PDV atual</h3>
          <p className="mt-2 text-muted-foreground">Já tem um sistema de caixa? A TIPE sincroniza pedidos e pagamentos com ele, sem trocar nada na sua rotina.</p>
          <div className="mt-6 flex items-center gap-3">
            {["Saipos", "TOTVS", "Outros"].map((p) => (
              <span key={p} className="rounded-xl border bg-background px-4 py-2 font-display text-sm font-bold">{p}</span>
            ))}
            <Zap className="h-5 w-5 text-primary" />
            <img src={logo.url} alt="TIPE" className="h-6 w-auto" />
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            {["Sincronização em tempo real", "Pagamentos baixados automaticamente", "Implantação assistida pela equipe"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative overflow-hidden rounded-3xl p-8 text-secondary-foreground shadow-xl" style={{ background: "var(--gradient-brand)" }}>
          <span className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Novo</span>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Store className="h-7 w-7" /></div>
          <h3 className="mt-5 font-display text-2xl font-bold">PDV TIPE</h3>
          <p className="mt-2 opacity-85">Não tem sistema ou quer trocar? Contrate o PDV da TIPE: cardápio, comandas, garçons e caixa, já integrados ao pagamento na mesa.</p>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            {["Cardápio e comandas", "App do garçom", "Controle de caixa", "Relatórios completos", "Mesas e QR Codes", "Tudo em um só lugar"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
          <img src={mascotWaiting} alt="Mascote garçom da TIPE" className="pointer-events-none absolute -bottom-4 right-2 hidden w-32 drop-shadow-2xl sm:block" />
        </div>
      </div>
    </section>
  );
}

const plans = [
  { name: "Essencial", price: "199", tables: "Até 10 mesas", features: ["Pagamento na mesa por QR Code", "Gorjeta digital", "Painel em tempo real", "Integração com seu PDV"] },
  { name: "Profissional", price: "349", tables: "Até 25 mesas", popular: true, features: ["Tudo do Essencial", "Relatórios e gorjetas por garçom", "App do garçom", "Suporte prioritário"] },
  { name: "Premium", price: "599", tables: "Até 50 mesas", features: ["Tudo do Profissional", "Múltiplos salões e setores", "Gestão de equipe avançada", "Gerente de conta dedicado"] },
  { name: "Redes", price: null, tables: "Acima de 50 mesas", features: ["Várias unidades", "Painel consolidado", "Integrações sob medida", "Condições especiais"] },
];

function Pricing() {
  return (
    <section id="planos" className="bg-muted/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="Planos" title="Assinatura que cresce com o seu salão" text="Escolha pelo número de mesas. O PDV TIPE pode ser contratado junto com qualquer plano." />
        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>)}
              </ul>
              <a href="#fale-conosco" className={`mt-8 rounded-full py-3 text-center font-display font-semibold transition-transform hover:-translate-y-0.5 ${p.popular ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>
                {p.price ? "Assinar" : "Falar com vendas"}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Sem fidelidade. Cancele quando quiser.</p>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    ["O cliente precisa baixar algum aplicativo?", "Não. Basta ler o QR Code do totem da mesa com a câmera do celular."],
    ["Funciona com o meu PDV?", "Sim. Integramos com os principais sistemas, como Saipos e TOTVS. Se preferir, você pode contratar o PDV TIPE."],
    ["Como funcionam os pagamentos em dinheiro ou maquininha?", "Os itens ficam reservados e o caixa confirma o recebimento no painel. Pagamentos digitais são aprovados na hora."],
    ["E a gorjeta?", "A taxa de serviço vai na conta e o cliente ainda pode deixar uma gorjeta extra, sempre no digital."],
    ["Como é cobrada a assinatura?", "Mensalmente, de acordo com o número de mesas do seu restaurante. Planos a partir de R$ 199/mês."],
  ];
  return (
    <section id="duvidas" className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Dúvidas</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h2>
        <img src={mascotRating} alt="Mascote da TIPE" className="mt-8 hidden w-44 lg:block" />
      </div>
      <div className="space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border bg-card p-5 open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold">
              {q}<ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
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
    <section id="fale-conosco" className="px-4 pb-20 sm:px-6 sm:pb-28">
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
          <img src={mascotThanks} alt="" aria-hidden className="mt-8 hidden w-40 lg:block" />
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
              <button disabled={sending} className="w-full rounded-full bg-primary py-3 font-display font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {sending ? "Enviando..." : "Quero conhecer a TIPE"}
              </button>
              <p className="text-center text-xs text-muted-foreground">Ao enviar, você concorda com os <Link to="/termos" className="underline">Termos de Uso e Privacidade</Link>.</p>
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
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">Pague. Sem esperar. Pagamento na mesa, gorjeta digital e PDV para restaurantes.</p>
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
          <Link to="/termos" className="block text-muted-foreground hover:text-foreground">Termos de uso e privacidade</Link>
          <a href="#fale-conosco" className="block text-muted-foreground hover:text-foreground">Fale conosco</a>
        </div>
      </div>
      <p className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} TIPE · tipe.digital</p>
    </footer>
  );
}
