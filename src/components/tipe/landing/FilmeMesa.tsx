/**
 * "Filme da mesa": a evolução da animação MesaViva da landing publicada.
 * Antes era um loop de ~33 s que tocava sozinho; agora cada cena acompanha a
 * rolagem (sticky storytelling), com as telas reais da conta. Só fluxos que
 * existem hoje: QR Code, conta ao vivo, divisão, Pix e gorjeta extra.
 */
import type { CSSProperties, ReactNode } from "react";
import { Check, Heart, QrCode, Users } from "lucide-react";
import { PhoneFrame } from "@/components/tipe/ds";
import {
  ScreenBill,
  ScreenDone,
  ScreenScan,
  ScreenSplit,
  ScreenTip,
  money,
  DEMO_TOTAL,
} from "@/components/tipe/landing/ProductScreens";
import { useScrollScenes } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";

type Cena = {
  id: string;
  titulo: [string, string];
  texto: string;
  Screen: (p: { className?: string }) => ReactNode;
  chips: { t: string; s?: string; icon: typeof Check; pos: string }[];
};

const CENAS: Cena[] = [
  {
    id: "aponte",
    titulo: ["Aponte", "a câmera."],
    texto: "O QR Code fica na mesa. A conta abre no navegador, sem baixar aplicativo.",
    Screen: ScreenScan,
    chips: [{ t: "Sem app", s: "Abre na câmera", icon: QrCode, pos: "left-[-30%] top-[18%]" }],
  },
  {
    id: "conta",
    titulo: ["A conta,", "ao vivo."],
    texto: "Cada pedido lançado aparece na hora. Ninguém precisa pedir a conta.",
    Screen: ScreenBill,
    chips: [{ t: "Caipirinha ×2", s: "lançada agora", icon: Check, pos: "right-[-34%] top-[30%]" }],
  },
  {
    id: "divide",
    titulo: ["Cada um", "paga o seu."],
    texto:
      "Por item, em partes iguais, por valor ou porcentagem. Dá até para dividir a moqueca em três.",
    Screen: ScreenSplit,
    chips: [{ t: "Ana pagou", s: "a parte dela", icon: Users, pos: "left-[-36%] top-[44%]" }],
  },
  {
    id: "pix",
    titulo: ["Pix", "e pronto."],
    texto:
      "Aprovado pelo banco, a mesa já mostra o que falta. Prefere dinheiro ou maquininha? O garçom confirma.",
    Screen: ScreenDone,
    chips: [
      { t: "Pix aprovado", s: money(DEMO_TOTAL), icon: Check, pos: "right-[-32%] top-[22%]" },
    ],
  },
  {
    id: "gorjeta",
    titulo: ["Gostou?", "Agradeça."],
    texto: "Uma gorjeta extra opcional, depois do pagamento. 70% vai para a equipe.",
    Screen: ScreenTip,
    chips: [
      { t: "Obrigado!", s: "R$ 10 para a equipe", icon: Heart, pos: "left-[-34%] bottom-[22%]" },
    ],
  },
];

export function FilmeMesa() {
  const [ref, cena] = useScrollScenes<HTMLElement>(CENAS.length);
  return (
    <section
      ref={ref}
      id="como-funciona"
      aria-label="Como funciona"
      className="relative scroll-mt-16 bg-ink text-white"
      style={{ height: `${CENAS.length * 85 + 15}svh` } as CSSProperties}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-[-10%] h-[620px] w-[620px] rounded-full bg-brand/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 bottom-[-20%] h-[520px] w-[520px] rounded-full bg-highlight/10 blur-3xl"
        />

        <div className="container-page relative grid flex-1 items-center gap-6 pt-20 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-16">
          {/* Texto da cena */}
          <div className="relative min-h-[11rem] sm:min-h-[15rem] lg:min-h-[22rem]">
            <p className="eyebrow text-brand">Como funciona</p>
            {CENAS.map((c, i) => (
              <div
                key={c.id}
                aria-hidden={i !== cena}
                className={cn(
                  "absolute inset-x-0 top-8 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] motion-reduce:transition-none",
                  i === cena ? "opacity-100" : "pointer-events-none opacity-0",
                  i < cena ? "-translate-y-6" : i > cena ? "translate-y-6" : "translate-y-0",
                )}
              >
                <h2 className="font-display text-[clamp(2.6rem,1.4rem+5vw,6.5rem)] font-semibold leading-[0.92] tracking-display">
                  <span className="block">{c.titulo[0]}</span>
                  <span className="block text-brand">{c.titulo[1]}</span>
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 text-pretty sm:text-lg">
                  {c.texto}
                </p>
              </div>
            ))}
          </div>

          {/* Celular com as telas reais */}
          <div className="relative mx-auto w-[min(62vw,300px,calc((100svh-15rem)*0.48))]">
            <PhoneFrame className="shadow-[0_60px_120px_-40px_oklch(0_0_0/0.8)]">
              <div className="relative aspect-[300/620]">
                {CENAS.map((c, i) => (
                  <div
                    key={c.id}
                    aria-hidden
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
                      i === cena ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
                    )}
                  >
                    <c.Screen />
                  </div>
                ))}
              </div>
            </PhoneFrame>
            {CENAS.map((c, i) =>
              c.chips.map((ch) => (
                <div
                  key={c.id + ch.t}
                  aria-hidden
                  className={cn(
                    "absolute z-10 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-700 ease-[var(--ease-spring)] sm:flex motion-reduce:transition-none",
                    ch.pos,
                    i === cena
                      ? "translate-y-0 scale-100 opacity-100"
                      : "translate-y-4 scale-95 opacity-0",
                  )}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-ink">
                    <ch.icon className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{ch.t}</span>
                    {ch.s && <span className="block text-[11px] text-white/60">{ch.s}</span>}
                  </span>
                </div>
              )),
            )}
          </div>
        </div>

        {/* Progresso: uma barra por cena */}
        <div className="container-page relative pb-6">
          <ol className="flex gap-2" aria-label="Etapas">
            {CENAS.map((c, i) => (
              <li key={c.id} className="flex-1">
                <span className="block h-[3px] overflow-hidden rounded-full bg-white/12">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full bg-brand transition-transform duration-500",
                      i <= cena ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "mt-2 hidden text-xs font-semibold sm:block",
                    i === cena ? "text-white" : "text-white/40",
                  )}
                >
                  {["QR Code", "Conta", "Divisão", "Pagamento", "Gorjeta"][i]}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-white/40">Demonstração com dados fictícios.</p>
        </div>
      </div>
    </section>
  );
}
