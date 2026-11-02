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
 * Focinho dos CTAs (V62, 27/10): a direção entre as opções A (nariz e boca) e B (meio
 * focinho com bigodes). Nariz turquesa pequeno, arredondado e simétrico; boca mínima em
 * "Y" com curvas; bigodes curtos e finos. Três microvariações para comparar em
 * /interno/focinho: 1 só nariz e boca, 2 com dois bigodes curtos de cada lado (a usada
 * no site), 3 com um bigode longo de cada lado.
 *
 * Movimento: parado, o nariz fareja quase imperceptível a cada ~6 s e os bigodes
 * acompanham. No hover, no foco por teclado e no toque, uma farejada dupla e os bigodes
 * abrem de leve. Nada se desloca: a caixa é fixa e a largura do botão não muda.
 * Com movimento reduzido fica parado.
 */
export type VarianteFocinho = 1 | 2 | 3;

const FZ_NARIZ =
  "M12 11.8 C9.5 11.1 7.7 9.7 7.8 8.4 C7.9 7.3 9.8 6.8 12 6.8 C14.2 6.8 16.1 7.3 16.2 8.4 C16.3 9.7 14.5 11.1 12 11.8Z";
const FZ_BOCA =
  "M12 11.8 V12.6 M12 12.6 C11.4 14.1 9.8 14.6 8.8 13.8 M12 12.6 C12.6 14.1 14.2 14.6 15.2 13.8";
/** Cada variação recorta o desenho no seu viewBox, então o focinho ocupa a altura do texto. */
const FZ_VIEWBOX: Record<VarianteFocinho, string> = {
  1: "7.2 6.2 9.6 9.2",
  2: "2.6 6.2 18.8 9.2",
  3: "1.2 6.2 21.6 9.2",
};
const FZ_BIGODES: Record<VarianteFocinho, { esq: string[]; dir: string[] }> = {
  1: { esq: [], dir: [] },
  2: {
    esq: ["M7.9 9.6 Q5.7 9 3.4 9.4", "M8 11.4 Q5.9 11.7 3.8 12.6"],
    dir: ["M16.1 9.6 Q18.3 9 20.6 9.4", "M16 11.4 Q18.1 11.7 20.2 12.6"],
  },
  3: {
    esq: ["M7.9 10.4 Q4.9 9.8 1.8 10.7"],
    dir: ["M16.1 10.4 Q19.1 9.8 22.2 10.7"],
  },
};

export function FocinhoCta({
  variante = 2,
  auto = true,
  className,
}: {
  variante?: VarianteFocinho | undefined;
  /** Farejada sutil sozinha, sem hover (padrão). */
  auto?: boolean | undefined;
  className?: string | undefined;
}) {
  const b = FZ_BIGODES[variante];
  return (
    <svg
      viewBox={FZ_VIEWBOX[variante]}
      aria-hidden
      focusable="false"
      data-v={variante}
      className={cn("focinho-cta", auto && "focinho-cta-auto", className)}
    >
      {(["esq", "dir"] as const).map((lado) =>
        b[lado].length ? (
          <g key={lado} className={`fz-bigodes fz-${lado}`}>
            {b[lado].map((d) => (
              <path key={d} className="fz-fio" d={d} />
            ))}
          </g>
        ) : null,
      )}
      <path className="fz-boca" d={FZ_BOCA} />
      <path className="fz-nariz" d={FZ_NARIZ} />
    </svg>
  );
}

/**
 * O ícone dos CTAs. Fica dentro do botão (que precisa da classe "com-fios"). Desde 02/11
 * é só o bigode (três fios em leque, sem nariz nem boca, também no hover; pedido do
 * Roberto). Sem `seta`, sobram só os fios, soltos na margem
 * direita do botão (para links secundários como "Entrar").
 */
export function SetaFios({
  auto = false,
  seta = true,
  className,
}: {
  /** Mantido por compatibilidade: o focinho já fareja sozinho, de leve. */
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
      viewBox="0 0 20 16"
      aria-hidden
      focusable="false"
      className={cn("bigode-cta", className)}
    >
      <path className="bc-fio" d="M2.5 6 Q9.5 3.7 17.5 2.4" />
      <path className="bc-fio" d="M2.5 8.2 Q10 7.9 18.5 8.5" />
      <path className="bc-fio" d="M2.5 10.4 Q9.5 12.6 17.5 14" />
    </svg>
  );
}

/** Alias antigo (o meio focinho virou a seta de bigodes em 27/10 e o focinho na V62). */
export const MeioFocinho = SetaFios;
