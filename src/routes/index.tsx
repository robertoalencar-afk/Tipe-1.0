import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { QrCode, Receipt, Smartphone, CheckCircle2, ChevronRight, UtensilsCrossed, MonitorSmartphone, History, Landmark } from "lucide-react";
import { submitLead } from "@/lib/tipe/leads.functions";
import logo from "@/assets/logo.png.asset.json";
import mascotThanks from "@/assets/mascot-thanks.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE — Pague. Sem esperar. | Pagamento na mesa para restaurantes" },
      {
        name: "description",
        content:
          "TIPE é o aplicativo que deixa o cliente conferir a conta, pagar e dar gorjeta direto da mesa, pelo QR Code do totem. Sem fila, sem esperar o garçom.",
      },
      { property: "og:title", content: "TIPE — Pague. Sem esperar." },
      {
        property: "og:description",
        content: "O cliente lê o QR Code da mesa, confere a conta, paga e dá gorjeta pelo celular. O restaurante acompanha tudo em tempo real.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tipe.digital/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/" }],
  }),
  component: LandingPage,
});

const steps = [
  {
    icon: QrCode,
    title: "Leia o QR Code do totem",
    text: "O cliente aponta a câmera para o totem da mesa e entra na conta na hora, sem baixar nada.",
  },
  {
    icon: Receipt,
    title: "Confira a conta em tempo real",
    text: "Os itens chegam direto do PDV do restaurante, com valor e taxa de serviço sempre atualizados.",
  },
  {
    icon: Smartphone,
    title: "Pague e vá embora",
    text: "Paga o que quiser pelo celular (Pix, carteira digital) ou no estabelecimento, com maquininha ou dinheiro.",
  },
];

const restaurantFeatures = [
  {
    icon: MonitorSmartphone,
    title: "Espelho do PDV em tempo real",
    text: "A equipe vê o mapa das mesas com status, valores pagos e itens lançados, sincronizado com o sistema do caixa.",
  },
  {
    icon: Landmark,
    title: "Confirmação no caixa",
    text: "Pagamentos em dinheiro ou maquininha ficam aguardando a confirmação manual do estabelecimento.",
  },
  {
    icon: History,
    title: "Histórico completo",
    text: "Cada pedido, pagamento, cancelamento e reabertura de mesa fica registrado com data e horário.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <ForRestaurants />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="TIPE" className="h-9 w-auto object-contain" />
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <a href="#como-funciona" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:block">
            Como funciona
          </a>
          <a href="#restaurantes" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:block">
            Para restaurantes
          </a>
          <Link to="/termos" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:block">
            Termos de uso
          </Link>
          <Link
            to="/entrar"
            className="rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Área do restaurante
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-brand)" }}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-[1.2fr_1fr]">
        <div className="text-secondary-foreground">
          <img src={logo.url} alt="TIPE" className="h-14 w-auto object-contain drop-shadow sm:h-16" />
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Pague. Sem esperar.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg">
            O cliente lê o QR Code do totem da mesa, confere a conta item por item, paga pelo
            celular e dá gorjeta ao garçom. Sem fila, sem esperar a conta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#fale-conosco"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
            >
              Tenho um restaurante
              <ChevronRight className="h-4 w-4" />
            </a>
            <Link
              to="/entrar"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-display font-semibold text-secondary-foreground transition-colors hover:bg-white/10"
            >
              Já sou parceiro
            </Link>
          </div>
          <p className="mt-6 text-xs opacity-60">Chega ao seu restaurante sem mensalidade de entrada. Fale com a equipe para saber mais.</p>
        </div>
        <div className="mx-auto hidden max-w-xs md:block">
          <img src={mascotThanks} alt="Mascote da TIPE comemorando" className="w-full" />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">Como funciona</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        O fluxo do cliente é simples: itens escolhidos, meio de pagamento e pronto. Tudo a partir do
        QR Code exclusivo da mesa.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <step.icon className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-xs font-semibold uppercase tracking-wider text-primary">
              Passo {index + 1}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForRestaurants() {
  return (
    <section id="restaurantes" className="bg-card py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Para os restaurantes</h2>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          O restaurante acompanha cada mesa como um espelho do seu PDV: o que foi lançado, o que foi
          pago e o que aguarda confirmação no caixa.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {restaurantFeatures.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-background p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const leadSchema = {
  restaurantName: "",
  contactName: "",
  email: "",
  phone: "",
  message: "",
};

function ContactSection() {
  const [form, setForm] = useState(leadSchema);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof leadSchema) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await submitLead({
        restaurantName: form.restaurantName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim() || undefined,
      });
    } catch {
      setSending(false);
      setError("Não foi possível enviar agora. Tente de novo em instantes.");
      return;
    }
    setSending(false);
    setSent(true);
    toast.success("Recebemos o seu contato!", { description: "A equipe TIPE responde em até 1 dia útil." });
  }

  return (
    <section id="fale-conosco" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Fale com a equipe</h2>
          <p className="mt-3 text-muted-foreground">
            Seu restaurante tem interesse no TIPE? Conte um pouco sobre ele e a equipe entra em
            contato para configurar mesas, garçons e a integração com o seu PDV.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Cada restaurante ganha um endereço próprio, como tipe.digital/nomedorestaurante.",
              "As mesas recebem QR Codes exclusivos, gerados pela própria plataforma.",
              "Conta, pagamentos e gorjetas seguem as regras combinadas com o restaurante.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={submit} className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Nome do restaurante *
                <input
                  required
                  value={form.restaurantName}
                  onChange={set("restaurantName")}
                  className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  placeholder="Ex.: Maré Alta"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Seu nome *
                <input
                  required
                  value={form.contactName}
                  onChange={set("contactName")}
                  className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  placeholder="Nome e sobrenome"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                E-mail *
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  placeholder="voce@restaurante.com.br"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                WhatsApp
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  placeholder="(85) 90000-0000"
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Mensagem
              <textarea
                rows={4}
                value={form.message}
                onChange={set("message")}
                className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Quantas mesas? Usa Saipos ou TOTVS? Conte o que precisar."
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Ao enviar, você concorda com os <Link to="/termos" className="underline text-primary">Termos de Uso</Link> e a Política de Privacidade.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {sent ? (
              <div className="flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Contato recebido! Vamos responder no seu e-mail.
              </div>
            ) : (
              <button
                type="submit"
                disabled={sending}
                className="h-12 rounded-full bg-primary font-display font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Quero o TIPE no meu restaurante"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <img src={logo.url} alt="TIPE" className="h-10 w-auto object-contain" />
        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
          <a href="#fale-conosco" className="hover:text-foreground">Fale com a equipe</a>
          <Link to="/entrar" className="hover:text-foreground">Área do restaurante</Link>
        </nav>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TIPE · Fortaleza, CE · tipe.digital
      </p>
    </footer>
  );
}
