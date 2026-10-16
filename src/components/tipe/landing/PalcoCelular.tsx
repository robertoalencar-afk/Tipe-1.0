/**
 * Palco do celular: um painel escuro com o celular inclinado em 3D e moedas
 * flutuando, no formato do vídeo da página Digital Bill da sunday (lido com o
 * REA). Conforme a página rola, a tela muda pelos 4 passos reais do cliente.
 * Com movimento reduzido, nada se mexe e os passos trocam pelos botões.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PhoneShot, type Tela } from "./PhoneShot";

export type Passo = { tela: Tela; t: string; d: string; alt: string };

const MOEDAS: { x: string; y: string; s: string; r: number; z: number; v: number }[] = [
  { x: "8%", y: "48%", s: "clamp(7rem,14vw,13rem)", r: -32, z: 0.9, v: 1 },
  { x: "80%", y: "10%", s: "clamp(5rem,10vw,9rem)", r: 24, z: 0.6, v: -1 },
  { x: "86%", y: "62%", s: "clamp(3rem,5vw,4.5rem)", r: 40, z: 0.35, v: 1 },
  { x: "18%", y: "6%", s: "clamp(2.4rem,4vw,3.6rem)", r: -18, z: 0.25, v: -1 },
];

function Moeda({ style, r }: { style: CSSProperties; r: number }) {
  return (
    <div aria-hidden className="absolute will-change-transform" style={style}>
      <div
        className="palco-moeda aspect-square w-full rounded-full"
        style={{ transform: `rotateX(58deg) rotateZ(${r}deg)` }}
      />
    </div>
  );
}

export function PalcoCelular({ passos }: { passos: Passo[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [parado, setParado] = useState(false);

  useEffect(() => {
    const el = trilho.current;
    const st = palco.current;
    if (!el || !st) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setParado(true);
      return;
    }
    let frame = 0;
    const medir = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      st.style.setProperty("--p", p.toFixed(4));
      setAtivo(Math.min(passos.length - 1, Math.floor(p * passos.length * 0.999)));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, [passos.length]);

  const atual = passos[ativo] ?? passos[0];

  return (
    <div ref={trilho} className={cn("relative", parado ? "" : "h-[340vh]")}>
      <div
        ref={palco}
        className={cn(
          "palco relative isolate overflow-hidden rounded-[1.75rem] bg-black text-white sm:rounded-[2.25rem]",
          parado ? "h-[46rem]" : "sticky top-[4.75rem] h-[calc(100svh-6rem)] min-h-[34rem]",
        )}
        style={{ "--p": 0 } as CSSProperties}
      >
        {/* brilhos da marca, como as luzes do vídeo de referência */}
        <div
          aria-hidden
          className="absolute -left-[10%] -top-[20%] h-[70%] w-[45%] rounded-full bg-[var(--color-brand)] opacity-45 blur-[90px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-[30%] left-[20%] h-[80%] w-[80%] rounded-full bg-[var(--color-brand-strong)] opacity-50 blur-[120px]"
        />
        <div
          aria-hidden
          className="absolute right-[4%] top-[48%] h-40 w-40 rounded-full bg-[var(--color-brand)] opacity-60 blur-[60px]"
        />

        {MOEDAS.map((m, i) => (
          <Moeda
            key={i}
            r={m.r}
            style={{
              left: m.x,
              top: m.y,
              width: m.s,
              transform: `translate3d(0, calc(${m.v} * (var(--p) - 0.5) * ${m.z * 160}px), 0) rotate(calc(var(--p) * ${m.v * 40}deg))`,
              filter: m.z < 0.4 ? "blur(2px)" : undefined,
            }}
          />
        ))}

        {/* celular inclinado, com as telas reais da Tipe */}
        <div className="absolute inset-0 flex items-center justify-center [perspective:1800px]">
          <div
            className="relative w-[min(17rem,58vw)] will-change-transform sm:w-[19rem] lg:w-[21rem]"
            style={{
              transform:
                "translateY(calc((0.5 - var(--p)) * 30px)) rotateX(26deg) rotateY(calc(-14deg + var(--p) * 10deg)) rotateZ(calc(-22deg + var(--p) * 8deg))",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="grid">
              {passos.map((x, i) => (
                <div
                  key={x.tela}
                  className={cn(
                    "col-start-1 row-start-1 transition-opacity duration-500",
                    i === ativo ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden={i !== ativo}
                >
                  <PhoneShot
                    tela={x.tela}
                    alt={x.alt}
                    priority={i === 0}
                    sizes="(min-width: 1024px) 21rem, 60vw"
                    className="shadow-[0_80px_120px_-40px_rgb(0_0_0/0.9)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* barra de passos, na posição da barra branca do vídeo de referência */}
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:left-1/2 sm:w-[min(44rem,90%)] sm:-translate-x-1/2">
          <div className="rounded-[1.4rem] bg-[var(--color-brand)]/70 p-1.5 shadow-[0_20px_60px_-20px_var(--color-brand)]">
            <div className="flex items-center gap-3 rounded-[1.1rem] bg-white px-4 py-3 text-[oklch(0.15_0_0)] sm:px-5">
              <span className="font-display text-sm tabular-nums text-[oklch(0.5_0_0)]">
                {ativo + 1}/{passos.length}
              </span>
              <p className="min-w-0 flex-1" aria-live="polite">
                <span className="block font-display text-[1.02rem] sm:truncate font-medium leading-tight">
                  {atual?.t}
                </span>
                <span className="block text-[0.85rem] sm:truncate text-[oklch(0.45_0_0)]">
                  {atual?.d}
                </span>
              </p>
              <span className="flex gap-1.5">
                {passos.map((x, i) => (
                  <button
                    key={x.tela}
                    type="button"
                    aria-label={`Ver passo ${i + 1}: ${x.t}`}
                    aria-pressed={i === ativo}
                    onClick={() => {
                      if (parado) return setAtivo(i);
                      const el = trilho.current;
                      if (!el) return;
                      const total = el.offsetHeight - window.innerHeight;
                      const topo = el.getBoundingClientRect().top + window.scrollY;
                      window.scrollTo({
                        top: topo + total * ((i + 0.5) / passos.length),
                        behavior: "smooth",
                      });
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === ativo ? "w-6 bg-[oklch(0.15_0_0)]" : "w-2 bg-[oklch(0.15_0_0/0.2)]",
                    )}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
