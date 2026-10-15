import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { EditorialPhoto } from "@/components/tipe/landing/EditorialPhoto";
import { Lebre } from "@/components/tipe/landing/Lebre";
import { cn } from "@/lib/utils";

const TITLE = `Teste grátis por ${TRIAL_DAYS} dias | TIPE`;
const DESC =
  "Coloque a Tipe nas mesas do seu restaurante: pagamento por QR Code com Pix, Apple Pay e Google Pay, divisão da conta e gorjeta extra para a equipe.";

export const Route = createFileRoute("/teste-gratis")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
  component: TesteGratis,
});

const SLIDES = [
  {
    eyebrow: "Gire mais mesas",
    titulo: "A mesa fecha sem esperar a maquininha.",
    texto:
      "O cliente paga pelo celular na hora em que quer ir embora, e a mesa fica livre para o próximo.",
    scene: "salao",
    alt: "Salão de restaurante cheio, com clientes pagando pelo celular",
    selo: ["Mesa 12 fechada", "Paga por 3 pessoas, sem chamar ninguém"],
  },
  {
    eyebrow: "Equipe mais feliz",
    titulo: "A gorjeta extra chega no relógio do garçom.",
    texto:
      "70% da gorjeta extra vai para o saldo de quem atendeu, com saque por Pix a cada quinzena.",
    scene: "garcom",
    alt: "Garçom sorrindo ao ver no relógio que recebeu uma gorjeta extra",
    selo: ["Gorjeta extra da Mesa 12", "R$ 7,00 no seu saldo"],
  },
  {
    eyebrow: "Clientes satisfeitos",
    titulo: "Cada um paga o seu, do jeito que quiser.",
    texto:
      "Pix, Apple Pay, Google Pay ou no estabelecimento, com divisão por item, em partes iguais ou por valor.",
    scene: "amigos",
    alt: "Amigos rindo à mesa enquanto dividem a conta pelo celular",
    selo: ["Ana pagou a parte dela", "Apple Pay · R$ 56,00"],
  },
] as const;

function TesteGratis() {
  return (
    <div className="sunday min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main id="conteudo">
        <section className="container-page grid gap-12 pb-20 pt-10 sm:pt-16 lg:grid-cols-[1fr_0.95fr] lg:gap-20 lg:pb-28">
          <div className="lg:pt-10">
            <p className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] text-brand-strong">
              Teste grátis por {TRIAL_DAYS} dias
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,1.4rem+4.6vw,5.6rem)] font-medium leading-[0.96]">
              Coloque a Tipe nas suas mesas.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Os primeiros restaurantes ganham {TRIAL_DAYS} dias grátis, sem cartão de crédito.
              Deixe seus dados: a equipe Tipe responde, faz uma demonstração e acompanha a
              implantação com você.
            </p>
            <ul className="mt-8 space-y-3.5 text-[1.05rem]">
              {[
                "Vagas na ordem de chegada",
                "Demonstração gratuita com a equipe",
                "Implantação acompanhada, do totem ao primeiro pagamento",
                "Sem taxa nenhuma para quem está na mesa",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-ink">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-muted-foreground">
              Quer ver antes?{" "}
              <Link
                to="/simulador"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Teste o simulador da Mesa 12
              </Link>
              .
            </p>
          </div>

          <div className="relative lg:pt-16">
            <Lebre
              humor="atenta"
              className="absolute -top-2 right-10 z-0 w-24 text-foreground lg:top-2"
            />
            <div className="relative z-10 rounded-[2rem] border border-border bg-surface p-5 shadow-[0_40px_80px_-40px_oklch(0.2_0.04_250/0.35)] sm:p-8">
              <WaitlistForm />
            </div>
          </div>
        </section>

        <Carrossel />
      </main>
      <LandingFooter />
    </div>
  );
}

function Carrossel() {
  const [i, setI] = useState(0);
  const s = SLIDES[i] ?? SLIDES[0];
  const ir = (d: number) => setI((v) => (v + d + SLIDES.length) % SLIDES.length);
  return (
    <section aria-label="Por que a Tipe" className="container-page pb-24 sm:pb-32">
      <div className="grid overflow-hidden rounded-[2.5rem] bg-background-muted lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <div key={i} className="hero-in">
            <p className="font-display text-[clamp(1.4rem,1.1rem+1vw,2rem)] text-brand-strong">
              {s.eyebrow}
            </p>
            <h2 className="mt-6 font-display text-[clamp(2.2rem,1.4rem+2.6vw,3.6rem)] font-medium leading-[1.02]">
              {s.titulo}
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{s.texto}</p>
          </div>
          <div className="mt-10 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Anterior"
                className="btn-press grid h-14 w-14 place-items-center rounded-full border border-border bg-surface hover:border-foreground/40"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Próximo"
                className="btn-press grid h-14 w-14 place-items-center rounded-full border border-border bg-surface hover:border-foreground/40"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2" role="tablist" aria-label="Escolher destaque">
              {SLIDES.map((x, n) => (
                <button
                  key={x.eyebrow}
                  type="button"
                  role="tab"
                  aria-selected={n === i}
                  aria-label={x.eyebrow}
                  onClick={() => setI(n)}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    n === i ? "w-7 bg-foreground" : "w-2.5 bg-foreground/20",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="relative min-h-[22rem]">
          {SLIDES.map((x, n) => (
            <div
              key={x.scene}
              aria-hidden={n !== i}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none",
                n === i ? "opacity-100" : "opacity-0",
              )}
            >
              <EditorialPhoto
                scene={x.scene}
                alt={x.alt}
                aspect="4/3"
                sizes="(min-width: 1024px) 50vw, 100vw"
                radius="0"
                reveal={false}
                className="!aspect-auto h-full"
              />
            </div>
          ))}
          <div
            key={`selo${i}`}
            className="pop-in absolute bottom-6 right-6 max-w-[16rem] rounded-2xl border border-white/15 bg-[oklch(0.15_0_0/0.6)] p-4 text-white backdrop-blur-xl"
          >
            <p className="flex items-center gap-2 font-semibold">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-ink">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {s.selo[0]}
            </p>
            <p className="mt-1 pl-8 text-sm text-white/70">{s.selo[1]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
