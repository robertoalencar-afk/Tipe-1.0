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
 * desenham e somem. `Fios` nasce da borda do botão; `SetaFios` é o meio focinho
 * (pedido do Roberto em 22/10, no lugar da seta) com os bigodes saindo da bochecha. Os dois respondem a hover,
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
  /** "claro": bigodes navy (fundo claro). "escuro": bigodes brancos. "auto": segue o tema da página. */
  tom?: "auto" | "claro" | "escuro";
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
 * Meio focinho: a metade direita do focinho da lebre (meio nariz turquesa e o lado
 * direito da boca em "Y"), igual à do Focinho. A linha
 * do corte fica no eixo do nariz, então o desenho aponta para a direita e faz o papel
 * da seta nos CTAs. No hover, foco ou toque o nariz fareja, dá um passinho e os três
 * bigodes saem da bochecha (os fios). Com movimento reduzido os bigodes só aparecem.
 *
 * É a metade direita exata do NARIZ e da BOCA do Focinho (deslocada 58 unidades), com o corte
 * reto em x = 2. viewBox 20 × 38; os bigodes vão até x 36 por fora da caixa (overflow
 * visível) e caem no respiro direito do botão.
 */
export const MEIO_NARIZ = "M2 14 Q9.5 14 17 18 Q13 32 2 35.5Z";
export const MEIA_BOCA = "M2 35 V41 Q7.5 47.5 14 44";

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
      viewBox="0 12 20 38"
      aria-hidden
      focusable="false"
      className={cn("seta-fios meio-focinho", auto && "seta-fios-auto", className)}
    >
      <g className="mf-corpo">
        <path className="sf-fio" d="M17 23 Q25 19 35 17" pathLength={1} />
        <path className="sf-fio" d="M17.5 28.5 Q26 28 36 29.5" pathLength={1} />
        <path className="sf-fio" d="M16 33.5 Q24 37.5 33 41" pathLength={1} />
        <path className="mf-boca" d={MEIA_BOCA} />
        <path className="mf-nariz" d={MEIO_NARIZ} />
      </g>
    </svg>
  );
}

/** Alias com o nome novo, para quem preferir ler "MeioFocinho" no JSX. */
export const MeioFocinho = SetaFios;
