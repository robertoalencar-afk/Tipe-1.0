/**
 * Celular, tablet e janela de computador com telas reais da Tipe. As imagens vêm
 * do banco de telas aprovado pelo Roberto (casting-tipe/telas-tipe), renderizadas
 * do simulador e da demonstração com o restaurante fictício "Maré Alta".
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import avaliacao390 from "@/assets/telas-v4/avaliacao-390.webp";
import avaliacao780 from "@/assets/telas-v4/avaliacao-780.webp";
import conta390 from "@/assets/telas-v4/conta-mesa-390.webp";
import conta780 from "@/assets/telas-v4/conta-mesa-780.webp";
import dividir390 from "@/assets/telas-v4/dividir-conta-390.webp";
import dividir780 from "@/assets/telas-v4/dividir-conta-780.webp";
import garcom390 from "@/assets/telas-v4/garcom-gorjetas-390.webp";
import garcom780 from "@/assets/telas-v4/garcom-gorjetas-780.webp";
import gorjeta390 from "@/assets/telas-v4/gorjeta-extra-390.webp";
import gorjeta780 from "@/assets/telas-v4/gorjeta-extra-780.webp";
import confirmado390 from "@/assets/telas-v4/pagamento-confirmado-390.webp";
import confirmado780 from "@/assets/telas-v4/pagamento-confirmado-780.webp";
import metodos390 from "@/assets/telas-v4/pagamento-metodos-390.webp";
import metodos780 from "@/assets/telas-v4/pagamento-metodos-780.webp";
import pix390 from "@/assets/telas-v4/pix-qr-390.webp";
import pix780 from "@/assets/telas-v4/pix-qr-780.webp";
import kds560 from "@/assets/telas-v4/cozinha-kds-560.webp";
import kds1000 from "@/assets/telas-v4/cozinha-kds-1000.webp";
import salao560 from "@/assets/telas-v4/mapa-salao-560.webp";
import salao1000 from "@/assets/telas-v4/mapa-salao-1000.webp";
import caixa900 from "@/assets/telas-v4/caixa-pagamentos-900.webp";
import caixa1600 from "@/assets/telas-v4/caixa-pagamentos-1600.webp";
import relatorios900 from "@/assets/telas-v4/relatorios-faturamento-900.webp";
import relatorios1600 from "@/assets/telas-v4/relatorios-faturamento-1600.webp";

export const TELAS_CELULAR = {
  conta: [conta390, conta780],
  dividir: [dividir390, dividir780],
  gorjeta: [gorjeta390, gorjeta780],
  metodos: [metodos390, metodos780],
  pix: [pix390, pix780],
  confirmado: [confirmado390, confirmado780],
  avaliacao: [avaliacao390, avaliacao780],
  garcom: [garcom390, garcom780],
} as const;
export type TelaCelular = keyof typeof TELAS_CELULAR;

const TELAS_TABLET = { kds: [kds560, kds1000], salao: [salao560, salao1000] } as const;
export type TelaTablet = keyof typeof TELAS_TABLET;

const TELAS_JANELA = { caixa: [caixa900, caixa1600], relatorios: [relatorios900, relatorios1600] } as const;
export type TelaJanela = keyof typeof TELAS_JANELA;

function BarraStatus({ escura = false }: { escura?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-[7.5%] max-h-[30px] items-end justify-between px-[11%] pb-[1%] text-[clamp(7px,2.6cqi,11px)] font-medium",
        escura ? "text-white" : "text-[oklch(0.15_0_0)]",
      )}
    >
      <span>9:41</span>
      <span className="flex items-center gap-[3px]">
        <span className="h-[0.7em] w-[1.1em] rounded-[2px] bg-current opacity-80" />
        <span className="h-[0.75em] w-[1.6em] rounded-[3px] border border-current p-[1px] opacity-80">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

export function Celular({
  tela,
  alt,
  className,
  sizes = "280px",
  prioridade = false,
  style,
}: {
  tela: TelaCelular;
  alt: string;
  className?: string;
  sizes?: string;
  prioridade?: boolean;
  style?: CSSProperties;
}) {
  const [p, g] = TELAS_CELULAR[tela];
  return (
    <figure
      style={style}
      className={cn(
        "relative w-full rounded-[13%/6%] bg-[oklch(0.17_0_0)] p-[2.6%] shadow-[0_50px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55),inset_0_0_0_1.5px_oklch(0.3_0_0)] [container-type:inline-size]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[11%/5%] bg-white">
        <BarraStatus />
        <span aria-hidden className="absolute left-1/2 top-[1.6%] h-[2.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
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

export function Tablet({ tela, alt, className, sizes = "480px" }: { tela: TelaTablet; alt: string; className?: string; sizes?: string }) {
  const [p, g] = TELAS_TABLET[tela];
  return (
    <figure
      className={cn(
        "relative w-full rounded-[6%/4.5%] bg-[oklch(0.17_0_0)] p-[2.8%] shadow-[0_60px_90px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.5)]",
        className,
      )}
    >
      <img
        src={p}
        srcSet={`${p} 560w, ${g} 1000w`}
        sizes={sizes}
        alt={alt}
        width={560}
        height={747}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full rounded-[3.5%/2.6%]"
      />
    </figure>
  );
}

export function Janela({ tela, alt, className, sizes = "720px" }: { tela: TelaJanela; alt: string; className?: string; sizes?: string }) {
  const [p, g] = TELAS_JANELA[tela];
  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden rounded-[1.1rem] bg-white shadow-[0_60px_90px_-40px_oklch(0.2_0.05_250/0.5),0_0_0_1px_oklch(0.85_0_0)]",
        className,
      )}
    >
      <div aria-hidden className="flex h-7 items-center gap-1.5 border-b border-[oklch(0.92_0_0)] bg-[oklch(0.975_0_0)] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto h-4 w-2/5 rounded-full bg-[oklch(0.93_0_0)]" />
      </div>
      <img
        src={p}
        srcSet={`${p} 900w, ${g} 1600w`}
        sizes={sizes}
        alt={alt}
        width={900}
        height={563}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </figure>
  );
}
