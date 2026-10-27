/**
 * Fotografia editorial da landing.
 *
 * As fotos ficam em src/assets/fotos/ com o nome `<cena>-<largura>.<formato>`
 * (ex.: garcom-1600.avif, garcom-1600.webp, garcom-800.jpg). Basta adicionar ou
 * trocar os arquivos: o srcset é montado sozinho. Origem e licença de cada foto
 * ficam em docs/landing-v3/IMAGENS.md. Sem foto, a cena mostra a lebre da TIPE
 * sobre um fundo da marca, para a página nunca quebrar.
 */
import type { CSSProperties, ReactNode } from "react";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import mascotThanks from "@/assets/lebre/rosto-feliz.webp";
import mascotWaiting from "@/assets/lebre/rosto-ola.webp";
import mascotRating from "@/assets/lebre/rosto-piscando.webp";
import mascotClosed from "@/assets/lebre/rosto-dormindo.webp";

export type Scene = "mesa" | "garcom" | "amigos" | "casal" | "gestor" | "salao";

const FILES = import.meta.glob("/src/assets/fotos/*.{avif,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

type Source = { type: string; srcSet: string };
function sourcesFor(scene: Scene): {
  sources: Source[];
  fallback: string | undefined;
  width: number | undefined;
} {
  const byFormat: Partial<Record<"avif" | "webp" | "jpg", [number, string][]>> = {};
  for (const [path, url] of Object.entries(FILES)) {
    const m = path.match(new RegExp(`/${scene}-(\\d+)\\.(avif|webp|jpg)$`));
    if (m) (byFormat[m[2] as "avif" | "webp" | "jpg"] ??= []).push([Number(m[1]), url]);
  }
  const set = (f: "avif" | "webp" | "jpg") =>
    (byFormat[f] ?? [])
      .sort((a, b) => a[0] - b[0])
      .map(([w, u]) => `${u} ${w}w`)
      .join(", ");
  const jpg = (byFormat.jpg ?? []).sort((a, b) => b[0] - a[0]);
  const sources: Source[] = [];
  if (byFormat.avif) sources.push({ type: "image/avif", srcSet: set("avif") });
  if (byFormat.webp) sources.push({ type: "image/webp", srcSet: set("webp") });
  return { sources, fallback: jpg[0]?.[1] ?? byFormat.webp?.[0]?.[1], width: jpg[0]?.[0] };
}

const FALLBACK: Record<Scene, { img: string; bg: string }> = {
  mesa: {
    img: mascotThanks,
    bg: "from-[oklch(0.86_0.09_60)] via-[oklch(0.8_0.12_45)] to-[oklch(0.62_0.14_35)]",
  },
  garcom: {
    img: mascotThanks,
    bg: "from-[oklch(0.86_0.09_60)] via-[oklch(0.8_0.12_45)] to-[oklch(0.62_0.14_35)]",
  },
  amigos: {
    img: mascotRating,
    bg: "from-[oklch(0.9_0.07_170)] via-[oklch(0.82_0.11_178)] to-[oklch(0.55_0.1_190)]",
  },
  casal: {
    img: mascotClosed,
    bg: "from-[oklch(0.93_0.05_80)] via-[oklch(0.86_0.08_70)] to-[oklch(0.7_0.12_50)]",
  },
  gestor: {
    img: mascotWaiting,
    bg: "from-[oklch(0.42_0.06_250)] via-[oklch(0.3_0.05_250)] to-[oklch(0.2_0.04_250)]",
  },
  salao: {
    img: mascotThanks,
    bg: "from-[oklch(0.5_0.1_45)] via-[oklch(0.33_0.07_40)] to-[oklch(0.2_0.04_250)]",
  },
};

/**
 * `aspect` define a proporção (sem salto de layout). `position` é o ponto focal
 * (object-position) e pode mudar no mobile via `mobilePosition`.
 */
export function EditorialPhoto({
  scene,
  alt,
  className,
  aspect = "4/5",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  position = "50% 50%",
  mobilePosition,
  radius = "2rem",
  children,
  reveal = !priority,
}: {
  scene: Scene;
  alt: string;
  className?: string;
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  position?: string;
  mobilePosition?: string;
  radius?: string;
  children?: ReactNode;
  reveal?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -6% 0px");
  const { sources, fallback, width } = sourcesFor(scene);
  const style = {
    aspectRatio: aspect,
    "--photo-radius": radius,
    "--pos": position,
    "--pos-m": mobilePosition ?? position,
    borderRadius: radius,
  } as CSSProperties;
  return (
    <div
      ref={ref}
      data-in={!reveal || inView || undefined}
      className={cn(
        "relative isolate overflow-hidden bg-background-muted",
        reveal && "photo-reveal",
        className,
      )}
      style={style}
    >
      <div className="photo-zoom absolute inset-0">
        {fallback ? (
          <picture>
            {sources.map((s) => (
              <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={sizes} />
            ))}
            <img
              src={fallback}
              alt={alt}
              width={width}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              {...(priority ? { fetchPriority: "high" as const } : {})}
              className="h-full w-full object-cover [object-position:var(--pos-m)] md:[object-position:var(--pos)]"
            />
          </picture>
        ) : (
          <div
            role="img"
            aria-label={alt}
            className={cn("relative h-full w-full bg-gradient-to-br", FALLBACK[scene].bg)}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]"
            />
            <img
              src={FALLBACK[scene].img}
              alt=""
              aria-hidden
              loading={priority ? "eager" : "lazy"}
              className="absolute bottom-0 left-1/2 h-[78%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.25)]"
            />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
