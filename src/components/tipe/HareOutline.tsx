import { useId } from "react";

/**
 * Ícone de traço da lebre TIPE (orelhas longas com pontas cheias, focinho e
 * bigodes), na cor do texto ao redor. Versão simples do mascote 3D.
 */
export function HareOutline({ className = "" }: { className?: string }) {
  const tip = useId();
  return (
    <svg
      viewBox="0 0 32 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Lebre TIPE"
    >
      <clipPath id={tip}>
        <rect x="0" y="0" width="32" height="6.5" />
      </clipPath>
      <g transform="rotate(-9 11.5 18)">
        <ellipse cx="11.5" cy="10.5" rx="3.2" ry="8.3" />
        <ellipse
          cx="11.5"
          cy="10.5"
          rx="3.2"
          ry="8.3"
          fill="currentColor"
          clipPath={`url(#${tip})`}
        />
      </g>
      <g transform="rotate(9 20.5 18)">
        <ellipse cx="20.5" cy="10.5" rx="3.2" ry="8.3" />
        <ellipse
          cx="20.5"
          cy="10.5"
          rx="3.2"
          ry="8.3"
          fill="currentColor"
          clipPath={`url(#${tip})`}
        />
      </g>
      <circle cx="16" cy="28" r="9.2" />
      <g fill="currentColor" stroke="none">
        <circle cx="12.4" cy="26.6" r="1.15" />
        <circle cx="19.6" cy="26.6" r="1.15" />
        <ellipse cx="16" cy="29.6" rx="1.5" ry="1.05" />
      </g>
      <path d="M14.2 32.2c1.1.9 2.5.9 3.6 0" strokeWidth="1.4" />
      <path
        d="M11.5 30.4 4.5 29.4M11.5 32 4.8 33.4M20.5 30.4l7-1M20.5 32l6.7 1.4"
        strokeWidth="1.1"
      />
    </svg>
  );
}
