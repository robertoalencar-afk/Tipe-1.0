/**
 * Logotipo oficial da Tipe em SVG inline (mesma geometria de src/assets/marca/tipe-logo.svg),
 * separado em partes para animar sem deformar a marca: símbolo (as orelhas da lebre),
 * as letras T, I, P, E e o traço turquesa do E.
 *
 * Com `animado`, ao entrar na tela as letras sobem uma a uma, as orelhas espiam de
 * trás da linha de base e o traço do E se desenha como um bigode. Depois as orelhas
 * mexem de leve a cada ~7 s. Com movimento reduzido, a marca aparece parada.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { E, I, LOGO_VIEWBOX, P, SIMBOLO, T, TRACO_E } from "./logoTipe";

export function LogoTipe({
  tom = "claro",
  animado = false,
  className,
  titulo = "Tipe",
}: {
  /** "claro": letras navy (fundo claro). "escuro": letras brancas. */
  tom?: "claro" | "escuro";
  animado?: boolean;
  className?: string;
  /** Nome acessível; passe "" para esconder de leitores de tela (logo decorativo). */
  titulo?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [visto, setVisto] = useState(!animado);

  useEffect(() => {
    const el = ref.current;
    if (!animado || !el) return;
    if (typeof IntersectionObserver === "undefined") return setVisto(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisto(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animado]);

  const letra = tom === "escuro" ? "#ffffff" : "#021E34";
  return (
    <svg
      ref={ref}
      viewBox={LOGO_VIEWBOX}
      role={titulo ? "img" : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
      className={cn("logo-tipe", animado && "logo-vivo", className)}
      data-in={visto ? "" : undefined}
    >
      <g className="lt-simbolo">
        <path fill="#0FC9BD" fillRule="evenodd" d={SIMBOLO} />
      </g>
      {[T, I, P, E].map((d, i) => (
        <path
          key={i}
          className="lt-letra"
          fill={letra}
          fillRule="evenodd"
          d={d}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
      <path className="lt-traco" fill="#0FC9BD" fillRule="evenodd" d={TRACO_E} />
    </svg>
  );
}
