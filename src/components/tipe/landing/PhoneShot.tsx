/**
 * Celular com uma tela real da Tipe. As imagens são capturas do simulador
 * (/simulador) em 3x, então o que aparece aqui é exatamente o que o cliente vê.
 * Para refazer: rode o roteiro de captura descrito em docs/landing-v3/IMAGENS.md.
 */
import { cn } from "@/lib/utils";
import totem390 from "@/assets/telas/totem-390.webp";
import totem780 from "@/assets/telas/totem-780.webp";
import conta390 from "@/assets/telas/conta-390.webp";
import conta780 from "@/assets/telas/conta-780.webp";
import selecao390 from "@/assets/telas/selecao-390.webp";
import selecao780 from "@/assets/telas/selecao-780.webp";
import pagamento390 from "@/assets/telas/pagamento-390.webp";
import pagamento780 from "@/assets/telas/pagamento-780.webp";
import aprovado390 from "@/assets/telas/aprovado-390.webp";
import aprovado780 from "@/assets/telas/aprovado-780.webp";
import gorjeta390 from "@/assets/telas/gorjeta-390.webp";
import gorjeta780 from "@/assets/telas/gorjeta-780.webp";

const TELAS = {
  totem: { s: totem390, l: totem780, dark: true },
  conta: { s: conta390, l: conta780, dark: false },
  selecao: { s: selecao390, l: selecao780, dark: false },
  pagamento: { s: pagamento390, l: pagamento780, dark: false },
  aprovado: { s: aprovado390, l: aprovado780, dark: false },
  gorjeta: { s: gorjeta390, l: gorjeta780, dark: false },
} as const;

export type Tela = keyof typeof TELAS;

export function PhoneShot({
  tela,
  alt,
  className,
  sizes = "280px",
  priority = false,
}: {
  tela: Tela;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const t = TELAS[tela];
  return (
    <figure
      className={cn(
        "relative w-full rounded-[2.9rem] bg-[oklch(0.17_0_0)] p-[9px] shadow-[0_60px_90px_-40px_oklch(0.2_0.05_250/0.6),0_0_0_1px_oklch(0.4_0_0/0.6),inset_0_0_0_1.5px_oklch(0.3_0_0)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[2.35rem]",
          t.dark ? "bg-[#0b1f3a] text-white" : "bg-[#f7f9fa] text-[oklch(0.15_0_0)]",
        )}
      >
        <div
          aria-hidden
          className="flex h-[30px] items-end justify-between px-[11%] pb-0.5 text-[11px] font-semibold"
        >
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 17 11" className="h-2.5 w-auto fill-current">
              <rect x="0" y="7" width="3" height="4" rx="0.7" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.7" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
            </svg>
            <svg viewBox="0 0 25 12" className="h-2.5 w-auto">
              <rect
                x="0.5"
                y="0.5"
                width="21"
                height="11"
                rx="3"
                fill="none"
                stroke="currentColor"
                opacity="0.4"
              />
              <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
              <rect
                x="22.5"
                y="4"
                width="1.6"
                height="4"
                rx="0.8"
                fill="currentColor"
                opacity="0.4"
              />
            </svg>
          </span>
        </div>
        <span
          aria-hidden
          className="absolute left-1/2 top-[7px] h-[20px] w-[30%] -translate-x-1/2 rounded-full bg-black"
        />
        <img
          src={t.s}
          srcSet={`${t.s} 390w, ${t.l} 780w`}
          sizes={sizes}
          alt={alt}
          width={390}
          height={844}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </figure>
  );
}
