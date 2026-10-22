/**
 * Celular com uma tela REAL do app do cliente. As imagens de src/assets/telas-reais
 * foram capturadas do código atual do app com dados de teste do restaurante
 * fictício "Maré Alta" (mesa 12, garçom Joyce, cliente Lucas). As telas antigas de
 * src/assets/telas e src/assets/telas-v4 não entram aqui.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import conta390 from "@/assets/telas-reais/conta-390.webp";
import conta780 from "@/assets/telas-reais/conta-780.webp";
import dividir390 from "@/assets/telas-reais/dividir-390.webp";
import dividir780 from "@/assets/telas-reais/dividir-780.webp";
import metodos390 from "@/assets/telas-reais/metodos-390.webp";
import metodos780 from "@/assets/telas-reais/metodos-780.webp";
import pix390 from "@/assets/telas-reais/pix-390.webp";
import pix780 from "@/assets/telas-reais/pix-780.webp";
import pago390 from "@/assets/telas-reais/pago-390.webp";
import pago780 from "@/assets/telas-reais/pago-780.webp";
import gorjeta390 from "@/assets/telas-reais/gorjeta-390.webp";
import gorjeta780 from "@/assets/telas-reais/gorjeta-780.webp";
import gorjetaMetodo390 from "@/assets/telas-reais/gorjeta-metodo-390.webp";
import gorjetaMetodo780 from "@/assets/telas-reais/gorjeta-metodo-780.webp";
import gorjetaPix390 from "@/assets/telas-reais/gorjeta-pix-390.webp";
import gorjetaPix780 from "@/assets/telas-reais/gorjeta-pix-780.webp";
import avaliacao390 from "@/assets/telas-reais/avaliacao-390.webp";
import avaliacao780 from "@/assets/telas-reais/avaliacao-780.webp";

export const TELAS_REAIS = {
  conta: [conta390, conta780],
  dividir: [dividir390, dividir780],
  metodos: [metodos390, metodos780],
  pix: [pix390, pix780],
  pago: [pago390, pago780],
  gorjeta: [gorjeta390, gorjeta780],
  "gorjeta-metodo": [gorjetaMetodo390, gorjetaMetodo780],
  "gorjeta-pix": [gorjetaPix390, gorjetaPix780],
  avaliacao: [avaliacao390, avaliacao780],
} as const;

export type TelaReal = keyof typeof TELAS_REAIS;

export function CelularReal({
  tela,
  alt,
  className,
  sizes = "280px",
  prioridade = false,
  style,
}: {
  tela: TelaReal;
  alt: string;
  className?: string;
  sizes?: string;
  prioridade?: boolean;
  style?: CSSProperties;
}) {
  const [p, g] = TELAS_REAIS[tela];
  return (
    <figure
      style={style}
      className={cn(
        "relative w-full rounded-[13%/6%] bg-[oklch(0.17_0_0)] p-[2.6%] shadow-[0_50px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55),inset_0_0_0_1.5px_oklch(0.3_0_0)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[11%/5%] bg-white pt-[7%]">
        <span aria-hidden className="absolute left-1/2 top-[1.4%] h-[2.2%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        <img
          src={p}
          srcSet={`${p} 390w, ${g} 780w`}
          sizes={sizes}
          alt={alt}
          width={390}
          height={844}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </figure>
  );
}
