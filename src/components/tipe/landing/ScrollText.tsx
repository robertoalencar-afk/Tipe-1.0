/**
 * Frases grandes guiadas pela rolagem, no espírito das referências:
 * - `Letreiro`: linhas enormes que andam para os lados conforme a página rola,
 *   alternando a direção.
 * - `FraseAcende`: um parágrafo grande em que as palavras vão "acendendo"
 *   enquanto o visitante rola.
 * Com movimento reduzido, ambas ficam paradas e legíveis.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Progresso (0 a 1) do elemento atravessando a janela. */
function useScrollProgress<T extends HTMLElement>(onProgress: (p: number) => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cb.current(-1);
      return;
    }
    let frame = 0;
    let visivel = false;
    const medir = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      cb.current(Math.min(1, Math.max(0, (h - r.top) / (h + r.height))));
    };
    const on = () => {
      if (visivel && !frame) frame = requestAnimationFrame(medir);
    };
    const io = new IntersectionObserver(([e]) => {
      visivel = !!e?.isIntersecting;
      if (visivel) on();
    });
    io.observe(el);
    medir();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

export function Letreiro({ linhas, className }: { linhas: ReactNode[]; className?: string }) {
  const trilhos = useRef<(HTMLDivElement | null)[]>([]);
  const ref = useScrollProgress<HTMLDivElement>((p) => {
    trilhos.current.forEach((t, i) => {
      if (!t) return;
      if (p < 0) {
        t.style.transform = "none";
        return;
      }
      const dir = i % 2 === 0 ? -1 : 1;
      // anda até ~22% da largura ao longo da travessia
      t.style.transform = `translate3d(${dir * (p - 0.5) * 22 + (dir > 0 ? -12 : 0)}%,0,0)`;
    });
  });
  return (
    <div ref={ref} aria-hidden className={cn("overflow-hidden py-6 sm:py-10", className)}>
      {linhas.map((l, i) => (
        <div
          key={i}
          ref={(el) => {
            trilhos.current[i] = el;
          }}
          className="whitespace-nowrap font-display text-[clamp(3.2rem,1.5rem+7.5vw,10rem)] font-medium leading-[1.02] tracking-[-0.045em] will-change-transform"
        >
          {l}
        </div>
      ))}
    </div>
  );
}

export function FraseAcende({ texto, className }: { texto: string; className?: string }) {
  const palavras = texto.split(" ");
  const [acesas, setAcesas] = useState(palavras.length);
  const ref = useScrollProgress<HTMLParagraphElement>((p) => {
    if (p < 0) return setAcesas(palavras.length);
    // começa a acender quando o topo entra e termina perto do meio da tela
    const k = Math.min(1, Math.max(0, (p - 0.12) / 0.45));
    setAcesas(Math.round(k * palavras.length));
  });
  return (
    <p
      ref={ref}
      className={cn(
        "font-display text-[clamp(2rem,1.2rem+3.2vw,4.4rem)] font-medium leading-[1.08] tracking-[-0.035em]",
        className,
      )}
    >
      <span className="sr-only">{texto}</span>
      <span aria-hidden>
        {palavras.map((w, i) => (
          <span
            key={i}
            className={cn(
              "transition-colors duration-300",
              i < acesas ? "text-foreground" : "text-foreground/15",
            )}
          >
            {w}{" "}
          </span>
        ))}
      </span>
    </p>
  );
}
