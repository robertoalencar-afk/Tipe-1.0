/**
 * Pequenas marcas desenhadas da Tipe para a landing: os bigodes da lebre (ao
 * lado da frase principal) e o símbolo do logo (o "Y" de folhas) para usar
 * dentro das telas desenhadas e como separador.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Focinho e bigodes da lebre, em traço grosso, que se desenham ao carregar. */
export function Bigodes({ className, delay = 900 }: { className?: string; delay?: number }) {
  const traco = {
    stroke: "currentColor",
    strokeWidth: 5,
    strokeLinecap: "round",
    fill: "none",
  } as const;
  return (
    <svg
      viewBox="0 0 72 44"
      aria-hidden
      className={cn("doodle", className)}
      style={{ "--d": `${delay}ms`, color: "var(--color-brand-strong)" } as CSSProperties}
    >
      {/* bigodes da esquerda */}
      <path pathLength={1} d="M24 18 C 17 14, 10 11, 3 10" {...traco} />
      <path pathLength={1} d="M24 23 C 16 23, 9 23, 2 24" {...traco} />
      <path pathLength={1} d="M24 28 C 17 31, 10 34, 4 37" {...traco} />
      {/* bigodes da direita */}
      <path pathLength={1} d="M48 18 C 55 14, 62 11, 69 10" {...traco} />
      <path pathLength={1} d="M48 23 C 56 23, 63 23, 70 24" {...traco} />
      <path pathLength={1} d="M48 28 C 55 31, 62 34, 68 37" {...traco} />
      {/* focinho e boquinha */}
      <path
        d="M29 15 h14 a2 2 0 0 1 1.5 3.2 l-6.8 7.3 a2.4 2.4 0 0 1 -3.4 0 l-6.8 -7.3 A2 2 0 0 1 29 15 z"
        fill="var(--color-brand)"
      />
      <path
        pathLength={1}
        d="M36 26 v4 M36 30 c -2 4, -7 4, -8 0 M36 30 c 2 4, 7 4, 8 0"
        {...traco}
        strokeWidth={4}
      />
    </svg>
  );
}

/** Símbolo da Tipe (o "Y" de folhas), para usar dentro das telas desenhadas. */
export function SimboloTipe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" aria-hidden className={className}>
      <g fill="var(--color-brand, #19c6b4)">
        <path d="M28 36 C 14 30, 5 16, 7 2 C 20 6, 31 18, 31 34 Z" />
        <path d="M32 36 C 46 30, 55 16, 53 2 C 40 6, 29 18, 29 34 Z" />
        <rect x="25" y="30" width="10" height="38" rx="5" />
      </g>
    </svg>
  );
}
