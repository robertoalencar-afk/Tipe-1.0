import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MascoteVivo } from "@/components/tipe/site/MascoteVivo";
import { reduzMovimento } from "@/components/tipe/site/movimento";
import pensando from "@/assets/lebre/rosto-pensando.webp";
import surpresa from "@/assets/lebre/rosto-surpresa.webp";
import feliz from "@/assets/lebre/rosto-feliz.webp";
import dormindo from "@/assets/lebre/rosto-dormindo.webp";
import piscando from "@/assets/lebre/rosto-piscando.webp";
import obrigado from "@/assets/mascot-thanks-hd.webp";
import carta from "@/assets/mascot-table-closed-hd.webp";

/**
 * A lebre certa para cada momento das telas de conta, cada uma com o seu jeito de se mexer.
 * "ola" e "senha" usam a lebre em camadas da landing (MascoteVivo); as outras são as
 * expressões oficiais, animadas por inteiro. Ao passar o mouse ou tocar, ela reage.
 */
export type Humor =
  | "ola"
  | "senha"
  | "pensando"
  | "surpresa"
  | "feliz"
  | "cansada"
  | "piscando"
  | "obrigado"
  | "carta";

const IMG: Record<Exclude<Humor, "ola" | "senha">, string> = {
  pensando,
  surpresa,
  feliz,
  cansada: dormindo,
  piscando,
  obrigado,
  carta,
};

type Quadros = Keyframe[];
// Movimento contínuo de cada humor (em loop) e a reação ao toque/mouse.
const LOOP: Record<keyof typeof IMG, { k: Quadros; ms: number }> = {
  pensando: {
    k: [{ rotate: "-4deg" }, { rotate: "5deg", translate: "0 -3px" }, { rotate: "-4deg" }],
    ms: 3600,
  },
  surpresa: {
    k: [
      { scale: "1" },
      { scale: "1.06", translate: "0 -6px", offset: 0.12 },
      { scale: "1", offset: 0.24 },
      { scale: "1" },
    ],
    ms: 2400,
  },
  feliz: {
    k: [
      { translate: "0 0" },
      { translate: "0 -10px", offset: 0.3 },
      { translate: "0 0", offset: 0.55 },
      { translate: "0 -5px", offset: 0.75 },
      { translate: "0 0" },
    ],
    ms: 1800,
  },
  cansada: {
    k: [
      { scale: "1 1", rotate: "-2deg" },
      { scale: "1.03 0.97", rotate: "2deg" },
      { scale: "1 1", rotate: "-2deg" },
    ],
    ms: 4200,
  },
  piscando: {
    k: [
      { rotate: "0deg" },
      { rotate: "-6deg", offset: 0.2 },
      { rotate: "0deg", offset: 0.4 },
      { rotate: "0deg" },
    ],
    ms: 2600,
  },
  obrigado: {
    k: [
      { rotate: "0deg", translate: "0 0" },
      { rotate: "-3deg", translate: "0 -6px" },
      { rotate: "3deg", translate: "0 -6px" },
      { rotate: "0deg", translate: "0 0" },
    ],
    ms: 2000,
  },
  carta: {
    k: [{ rotate: "-2deg" }, { rotate: "2deg", translate: "0 -4px" }, { rotate: "-2deg" }],
    ms: 2800,
  },
};
const REACAO: Quadros = [
  { scale: "1 1", translate: "0 0" },
  { scale: "1.08 0.9", translate: "0 4px", offset: 0.2 },
  { scale: "0.94 1.08", translate: "0 -16px", offset: 0.5 },
  { scale: "1 1", translate: "0 0" },
];

export function LebreHumor({
  humor,
  className,
  alt = "",
}: {
  humor: Humor;
  className?: string;
  alt?: string;
}) {
  const corpo = useRef<HTMLImageElement>(null);
  const reacao = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (humor === "ola" || humor === "senha" || reduzMovimento()) return;
    const l = LOOP[humor];
    const a = corpo.current?.animate(l.k, {
      duration: l.ms,
      iterations: Infinity,
      easing: "ease-in-out",
    });
    return () => a?.cancel();
  }, [humor]);

  if (humor === "ola" || humor === "senha")
    return <MascoteVivo alt={alt} fecharOlhos={humor === "senha"} className={className ?? ""} />;

  const reagir = () => {
    if (reduzMovimento()) return;
    reacao.current?.animate(REACAO, { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" });
  };

  return (
    <div
      ref={reacao}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      onPointerEnter={reagir}
      onPointerDown={reagir}
      className={cn("relative aspect-square cursor-pointer", className)}
    >
      <img
        ref={corpo}
        key={humor}
        src={IMG[humor]}
        alt=""
        width={512}
        height={512}
        className="h-full w-full select-none object-contain [transform-origin:50%_85%] animate-in fade-in zoom-in-90 duration-300"
      />
      {humor === "cansada" && (
        <span
          aria-hidden
          className="tipe-zzz pointer-events-none absolute right-[8%] top-[12%] font-medium text-[var(--brand-secondary)]"
        >
          z<span className="text-[0.8em]">z</span>
          <span className="text-[0.6em]">z</span>
        </span>
      )}
    </div>
  );
}
