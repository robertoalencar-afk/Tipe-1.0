/** "A Mesa 12 está aberta": o simulador real da conta dentro de um celular. */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/tipe/ds";
import { LiveSimulator } from "@/components/tipe/landing/LiveSimulator";
import { LineReveal, Reveal } from "@/components/tipe/landing/motion";
import mascotThanks from "@/assets/mascot-thanks-hd.webp";

/* --------------------------------------------------------- Experimente */

export function Experimente() {
  const passos = [
    "Toque no QR Code da mesa",
    "Diga seu nome e veja a conta",
    "Escolha o que consumiu ou divida",
    "Pague, avalie e agradeça",
  ];
  return (
    <section id="experimente" data-tema="claro" className="scroll-mt-16 overflow-hidden py-16 sm:py-28">
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

