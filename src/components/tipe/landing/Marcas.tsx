/**
 * Pequenas marcas desenhadas da Tipe para a landing: os bigodes da lebre (ao
 * lado da frase principal) e o símbolo oficial do logo, usado como separador.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import simbolo from "@/assets/tipe-simbolo.png";

/** Bigodes da lebre: um ponto de focinho e três fios finos de cada lado. */
export function Bigodes({ className, delay = 900 }: { className?: string; delay?: number }) {
  const fio = {
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    fill: "none",
  } as const;
  return (
    <svg
      viewBox="0 0 96 36"
      aria-hidden
      className={cn("doodle", className)}
      style={{ "--d": `${delay}ms`, color: "var(--color-brand-strong)" } as CSSProperties}
    >
      <path pathLength={1} d="M40 15 C 30 11, 18 8, 4 8" {...fio} />
      <path pathLength={1} d="M40 18 C 28 18, 16 18, 3 19" {...fio} />
      <path pathLength={1} d="M40 21 C 30 24, 18 27, 6 30" {...fio} />
      <path pathLength={1} d="M56 15 C 66 11, 78 8, 92 8" {...fio} />
      <path pathLength={1} d="M56 18 C 68 18, 80 18, 93 19" {...fio} />
      <path pathLength={1} d="M56 21 C 66 24, 78 27, 90 30" {...fio} />
      <circle cx="48" cy="18" r="2.6" fill="var(--color-brand)" />
    </svg>
  );
}

/** Símbolo oficial da Tipe (o "Y" de folhas), recortado do logo oficial. */
export function SimboloTipe({ className }: { className?: string }) {
  return <img src={simbolo} alt="" aria-hidden width={140} height={138} className={className} />;
}
