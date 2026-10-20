/**
 * Fotos do site (src/assets/produtos/<nome>-<largura>.webp) com o zoom lento da sunday:
 * a foto entra levemente ampliada e assenta em 2,4 s quando aparece na tela; num card
 * com a classe `group`, o hover aproxima de novo em 1,2 s. Origem: docs/landing-v3/IMAGENS.md.
 */
import type { CSSProperties } from "react";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";

const ARQUIVOS = import.meta.glob("/src/assets/produtos/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type NomeFoto =
  | "pay"
  | "order"
  | "staff"
  | "kitchen"
  | "restaurant"
  | "ai"
  | "integracoes"
  | "pizzaria"
  | "boteco"
  | "japones"
  | "cafe"
  | "hamburgueria"
  | "bistro";

export function fotoSrc(nome: NomeFoto) {
  const tamanhos = Object.entries(ARQUIVOS)
    .map(([p, u]) => {
      const m = p.match(new RegExp(`/${nome}-(\\d+)\\.webp$`));
      return m ? ([Number(m[1]), u] as const) : null;
    })
    .filter((x): x is readonly [number, string] => !!x)
    .sort((a, b) => a[0] - b[0]);
  return {
    src: tamanhos[0]?.[1] ?? "",
    srcSet: tamanhos.map(([w, u]) => `${u} ${w}w`).join(", "),
  };
}

export function Foto({
  nome,
  alt,
  className,
  imgClassName,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  posicao = "50% 50%",
  prioridade = false,
  style,
}: {
  nome: NomeFoto;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  posicao?: string | undefined;
  prioridade?: boolean;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -8% 0px");
  const { src, srcSet } = fotoSrc(nome);
  return (
    <div
      ref={ref}
      data-in={inView || undefined}
      className={cn("foto-zoom relative overflow-hidden bg-background-muted", className)}
      style={style}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={prioridade ? "eager" : "lazy"}
        fetchPriority={prioridade ? "high" : undefined}
        decoding="async"
        className={cn("h-full w-full object-cover", imgClassName)}
        style={{ objectPosition: posicao }}
      />
    </div>
  );
}
