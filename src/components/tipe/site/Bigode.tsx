/**
 * Assinatura da lebre no site.
 *
 * Focinho: nariz turquesa no centro exato do desenho (x = 60 no viewBox 120 × 64),
 * boca em "Y" e três bigodes de cada lado. Mexe-se sozinho, sem depender do mouse:
 * o nariz fareja em rajadas com pausa, os lados se abrem de leve a cada farejada e
 * cada bigode oscila no seu próprio ritmo e amplitude, então os dois lados nunca
 * ficam iguais. No hover os bigodes se abrem mais. Com movimento reduzido fica parado.
 *
 * Fios: a linguagem dos botões. Três traços curtos, como metade dos bigodes, que se
 * desenham e somem. `Fios` nasce da borda do botão; `SetaFios` é a seta de bigodes
 * (27/10: o nariz é a cauda e três bigodes formam a ponta). Os dois respondem a hover,
 * :focus-visible e toque; com `auto` saltam sozinhos a cada 4,5 s. É só decoração:
 * o botão diz o que faz pelo texto.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Cada bigode: caminho, ritmo (s), defasagem (s), amplitude (graus) e quanto abre no hover. */
const BIGODES = {
  esq: [
    { d: "M44 25 Q26 16 4 11", t: 3.9, f: -0.4, a: 7, h: 1 },
    { d: "M43 30 Q24 29 1 31", t: 4.7, f: -1.9, a: 5, h: 0.25 },
    { d: "M44 35 Q26 43 6 52", t: 5.3, f: -3.1, a: 8, h: -1 },
  ],
  dir: [
    { d: "M76 25 Q94 16 116 11", t: 4.3, f: -2.6, a: 6, h: 1 },
    { d: "M77 30 Q96 29 119 31", t: 3.6, f: -0.9, a: 5, h: 0.25 },
    { d: "M76 35 Q94 43 114 52", t: 5.8, f: -4.2, a: 8, h: -1 },
  ],
} as const;

/** Nariz em coração invertido arredondado, simétrico em torno de x = 60. */
const NARIZ = "M45 18 Q60 10 75 18 Q71 32 60 35.5 Q49 32 45 18Z";
const BOCA = "M60 35 V41 M60 41 Q54.5 47.5 48 44 M60 41 Q65.5 47.5 72 44";

/** Marca o elemento quando entra na tela (uma vez). */
function useApareceu<T extends Element>(ativo: boolean) {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(!ativo);
  useEffect(() => {
    const el = ref.current;
    if (!ativo || !el) return;
    if (typeof IntersectionObserver === "undefined") return setVisto(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisto(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ativo]);
  return [ref, visto] as const;
}

export function Focinho({
  className,
  delay = 900,
  tom = "auto",
  quandoVisivel = false,
}: {
  className?: string;
  /** Atraso (ms) para os bigodes se desenharem na entrada. */
  delay?: number;
  /** "claro": bigodes navy (fundo claro). "escuro": bigodes brancos. "palco": fundo turquesa (bigodes navy, nariz branco). "auto": segue o tema da página. */
  tom?: "auto" | "claro" | "escuro" | "palco";
  /** Só desenha os bigodes quando o focinho entra na tela (para usar fora da primeira dobra). */
  quandoVisivel?: boolean;
  /** @deprecated O focinho agora se mexe sozinho; mantido só para compatibilidade. */
  segueCursor?: boolean;
}) {
  const [ref, visto] = useApareceu<SVGSVGElement>(quandoVisivel);
  const fio = { pathLength: 1, fill: "none" } as const;
  return (
    <svg
      ref={ref}
      viewBox="0 0 120 64"
      aria-hidden
      focusable="false"
      data-tom={tom}
      data-espera={visto ? undefined : ""}
      className={cn("focinho", className)}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {(["esq", "dir"] as const).map((lado) => (
        <g key={lado} className={`focinho-lado focinho-${lado}`}>
          {BIGODES[lado].map((b, i) => (
            <g key={b.d} className="focinho-leque" style={{ "--h": b.h } as CSSProperties}>
              <path
                d={b.d}
                className="focinho-fio"
                style={
                  {
                    "--i": i,
                    "--t": `${b.t}s`,
                    "--f": `${b.f}s`,
                    "--a": `${b.a}deg`,
                  } as CSSProperties
                }
                {...fio}
              />
            </g>
          ))}
        </g>
      ))}
      <path className="focinho-boca" d={BOCA} fill="none" />
      <path className="focinho-nariz" d={NARIZ} />
    </svg>
  );
}

/**
 * Três fios curtos que nascem da borda do elemento pai (que precisa ter a classe
 * "com-fios"). intensidade "forte" usa os dois lados. A cor vem de --fio.
 */
export function Fios({
  intensidade = "media",
  auto = false,
  className,
}: {
  intensidade?: "leve" | "media" | "forte";
  /** Salta sozinho de tempos em tempos, além do hover. */
  auto?: boolean;
  className?: string;
}) {
  const lados = intensidade === "forte" ? (["esq", "dir"] as const) : (["dir"] as const);
  return (
    <span aria-hidden className={cn("fios", `fios-${intensidade}`, auto && "fios-auto", className)}>
      {lados.map((lado) => (
        <svg key={lado} viewBox="0 0 16 16" className={`fios-lado fios-${lado}`} focusable="false">
          <path d="M1 4.6 Q7 2.6 14.5 1.4" pathLength={1} />
          <path d="M1 8 Q8 7.6 15.5 8.4" pathLength={1} />
          <path d="M1 11.4 Q7 13.4 14 14.8" pathLength={1} />
        </svg>
      ))}
    </span>
  );
}

/**
 * O ícone dos CTAs (substitui a seta). Fica dentro do botão (que precisa da classe
 * "com-fios"). Sem `seta`, sobram só os fios, soltos na margem direita do botão (para
 * links secundários como "Entrar").
 */
export function SetaFios({
  auto = false,
  seta = true,
  className,
}: {
  /** Os bigodes saltam sozinhos a cada 4,5 s (só no CTA principal da página). */
  auto?: boolean;
  seta?: boolean;
  className?: string;
}) {
  if (!seta) {
    return (
      <svg
        viewBox="12 0 16 16"
        aria-hidden
        focusable="false"
        className={cn("seta-fios seta-fios-solto", auto && "seta-fios-auto", className)}
      >
        <path className="sf-fio" d="M14.5 5.4 Q20 3.2 26 2" pathLength={1} />
        <path className="sf-fio" d="M15 8 Q21 7.7 27 8.4" pathLength={1} />
        <path className="sf-fio" d="M14.5 10.6 Q20 12.8 26 14" pathLength={1} />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={cn("seta-fios seta-bigodes", auto && "seta-fios-auto", className)}
    >
      <g className="sb-corpo">
        <path className="sb-fio sb-cima" d="M9.5 6.4 Q15.5 8.4 20.4 12" />
        <path className="sb-fio" d="M9.2 12 H20.4" />
        <path className="sb-fio sb-baixo" d="M9.5 17.6 Q15.5 15.6 20.4 12" />
        <circle className="sb-nariz" cx="5" cy="12" r="3" />
      </g>
    </svg>
  );
}

/** Alias antigo (o meio focinho virou a seta de bigodes em 27/10). */
export const MeioFocinho = SetaFios;
