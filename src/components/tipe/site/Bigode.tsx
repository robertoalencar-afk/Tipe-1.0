/**
 * Assinatura da lebre no site.
 *
 * Focinho: o nariz e três bigodes de cada lado, em SVG. Fareja de tempos em tempos
 * (o nariz contrai e os bigodes tremem com amplitudes diferentes de cada lado),
 * fareja mais rápido no hover e inclina os bigodes na direção do cursor.
 *
 * Fios: o "Tipe Whisker Motion" dos botões e setas. Três traços curtos saem da
 * borda no hover, no foco do teclado e no toque. É só decoração: o botão diz o
 * que faz pelo texto, sem depender do movimento.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { reduzMovimento } from "./movimento";

const BIGODES_ESQ = [
  "M47 21 C 36 16, 22 12, 6 11",
  "M46 25 C 33 24, 19 24, 3 26",
  "M47 29 C 36 32, 23 37, 9 41",
];
const BIGODES_DIR = [
  "M73 21 C 84 16, 98 12, 114 11",
  "M74 25 C 87 24, 101 24, 117 26",
  "M73 29 C 84 32, 97 37, 111 41",
];

export function Focinho({
  className,
  delay = 900,
  segueCursor = true,
}: {
  className?: string;
  delay?: number;
  segueCursor?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !segueCursor || reduzMovimento()) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    let quadro = 0;
    let x = 0;
    let y = 0;
    const aplicar = () => {
      quadro = 0;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(-1, Math.min(1, (x - cx) / 600));
      const dy = Math.max(-1, Math.min(1, (y - cy) / 400));
      el.style.setProperty("--ox", dx.toFixed(3));
      el.style.setProperty("--oy", dy.toFixed(3));
    };
    const mover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", mover);
    };
  }, [segueCursor]);

  const fio = { strokeWidth: 1.5, strokeLinecap: "round", fill: "none", pathLength: 1 } as const;
  return (
    <svg
      ref={ref}
      viewBox="0 0 120 48"
      aria-hidden
      className={cn("focinho", className)}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      <g className="focinho-lado focinho-esq">
        {BIGODES_ESQ.map((d, i) => (
          <path key={d} d={d} className="focinho-fio" style={{ "--i": i } as CSSProperties} {...fio} />
        ))}
      </g>
      <g className="focinho-lado focinho-dir">
        {BIGODES_DIR.map((d, i) => (
          <path key={d} d={d} className="focinho-fio" style={{ "--i": i } as CSSProperties} {...fio} />
        ))}
      </g>
      <g className="focinho-nariz">
        <path d="M54.5 20.5 C 54.5 17.6, 65.5 17.6, 65.5 20.5 C 65.5 23.4, 62.2 26.6, 60 26.6 C 57.8 26.6, 54.5 23.4, 54.5 20.5 Z" />
        <ellipse cx="57.6" cy="19.6" rx="1.6" ry="0.9" className="focinho-brilho" />
      </g>
    </svg>
  );
}

/**
 * Três fios curtos que saem da borda do elemento pai (que precisa ser relative e
 * ter a classe "com-fios"). intensidade "forte" usa os dois lados.
 */
export function Fios({
  intensidade = "media",
  className,
}: {
  intensidade?: "leve" | "media" | "forte";
  className?: string;
}) {
  const lados = intensidade === "forte" ? (["esq", "dir"] as const) : (["dir"] as const);
  return (
    <span aria-hidden className={cn("fios", `fios-${intensidade}`, className)}>
      {lados.map((lado) => (
        <span key={lado} className={`fios-lado fios-${lado}`}>
          <i style={{ "--i": 0 } as CSSProperties} />
          <i style={{ "--i": 1 } as CSSProperties} />
          <i style={{ "--i": 2 } as CSSProperties} />
        </span>
      ))}
    </span>
  );
}
