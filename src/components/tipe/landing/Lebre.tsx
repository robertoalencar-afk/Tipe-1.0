/**
 * Lebre da Tipe em traço único, derivada do símbolo do logo: as duas orelhas
 * são as folhas do "Y". Substitui os mascotes ilustrados na landing por uma
 * versão minimalista que conversa com a tipografia. Os humores mudam só olhos
 * e boca; as orelhas balançam de leve (desligado com movimento reduzido).
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type Humor = "atenta" | "feliz" | "piscando" | "surpresa";

export function Lebre({
  humor = "atenta",
  className,
  title,
}: {
  humor?: Humor;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("lebre", className)}
    >
      {/* orelhas: as folhas do Y do logo */}
      <g className="lebre-orelhas">
        <path
          className="lebre-orelha-e"
          d="M50 58 C 30 46, 22 22, 26 6 C 42 12, 54 32, 54 56 Z"
          fill="var(--color-brand, #19c6b4)"
        />
        <path
          className="lebre-orelha-d"
          d="M70 58 C 90 46, 98 22, 94 6 C 78 12, 66 32, 66 56 Z"
          fill="var(--color-brand, #19c6b4)"
        />
      </g>
      {/* cabeça */}
      <circle cx="60" cy="92" r="36" stroke="currentColor" strokeWidth="4" />
      {/* olhos */}
      {humor === "feliz" ? (
        <>
          <path d="M40 88 q6 -7 12 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M68 88 q6 -7 12 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : humor === "piscando" ? (
        <>
          <circle cx="46" cy="87" r="4" fill="currentColor" />
          <path d="M68 88 q6 -7 12 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle
            className="lebre-olho"
            cx="46"
            cy="87"
            r={humor === "surpresa" ? 5 : 4}
            fill="currentColor"
          />
          <circle
            className="lebre-olho"
            cx="74"
            cy="87"
            r={humor === "surpresa" ? 5 : 4}
            fill="currentColor"
          />
        </>
      )}
      {/* focinho e boca */}
      <path d="M56 99 h8 l-4 4 z" fill="var(--color-brand, #19c6b4)" strokeLinejoin="round" />
      {humor === "surpresa" ? (
        <circle cx="60" cy="111" r="3.5" stroke="currentColor" strokeWidth="3" />
      ) : (
        <path
          d="M52 106 q4 5 8 0 q4 5 8 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {/* bigodes */}
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.55">
        <path d="M34 100 L14 96" />
        <path d="M34 105 L13 107" />
        <path d="M86 100 L106 96" />
        <path d="M86 105 L107 107" />
      </g>
    </svg>
  );
}

/** Bigodes da lebre, desenhados à mão ao lado de uma palavra. */
export function Bigodes({ className, delay = 900 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      aria-hidden
      className={cn("doodle", className)}
      style={{ "--d": `${delay}ms`, color: "var(--color-brand-strong)" } as CSSProperties}
    >
      <path d="M0 17 h6 l-3 4 z" fill="var(--color-brand)" strokeLinejoin="round" />
      <path
        pathLength={1}
        d="M9 17 C 18 11, 28 6, 42 3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        pathLength={1}
        d="M9 20 C 20 19, 30 19, 43 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        pathLength={1}
        d="M9 23 C 18 29, 28 34, 41 38"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
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
