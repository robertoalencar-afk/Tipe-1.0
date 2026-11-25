/**
 * Barra de status de iPhone (estilo iPhone 16/17/18 com ilha dinâmica): hora à esquerda,
 * sinal de celular, Wi-Fi e bateria com o nível à direita. Regra da marca (25/11/2026):
 * TODA tela de celular em imagem, simulador ou vídeo da Tipe mostra esta barra, para
 * parecer um celular de verdade. Use em qualquer moldura nova de celular.
 *
 * Tudo é medido em `em`: o tamanho segue o `font-size` de quem usa (≈17px num celular
 * em tamanho real de 393 pt; ≈ 4,3% da largura da tela). A hora é fixa por padrão (sem
 * diferença entre servidor e navegador); `aoVivo` troca pela hora do aparelho depois de
 * montar.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type BarraStatusProps = {
  /** Hora mostrada (24 h, como no iPhone em português). */
  hora?: string;
  /** Mostra a hora atual do aparelho depois de montar. */
  aoVivo?: boolean;
  /** Nível da bateria, 0 a 100. */
  bateria?: number;
  /** Cor do texto e ícones: "escuro" sobre tela clara, "claro" sobre foto ou fundo escuro. */
  tom?: "escuro" | "claro";
  /** Fundo da faixa (por padrão transparente, a tela aparece atrás). */
  fundo?: string;
  className?: string;
  style?: CSSProperties;
};

const HORA_PADRAO = "21:16";

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function BarraStatusIOS({
  hora = HORA_PADRAO,
  aoVivo = false,
  bateria = 82,
  tom = "escuro",
  fundo,
  className,
  style,
}: BarraStatusProps) {
  const [agora, setAgora] = useState<string | null>(null);
  useEffect(() => {
    if (!aoVivo) return;
    setAgora(horaAgora());
    const t = setInterval(() => setAgora(horaAgora()), 15000);
    return () => clearInterval(t);
  }, [aoVivo]);
  const cor = tom === "claro" ? "#ffffff" : "#0b1418";
  return (
    <div
      aria-hidden
      data-barra-status
      className={cn(
        "pointer-events-none flex h-[2.9em] w-full shrink-0 select-none items-center justify-between pl-[1.9em] pr-[1.65em] pt-[0.15em] font-semibold leading-none tracking-[-0.02em]",
        className,
      )}
      style={{
        color: cor,
        background: fundo,
        fontFamily: '-apple-system, "SF Pro Text", "Inter Tight", system-ui, sans-serif',
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      <span className="min-w-[3.4em] text-center text-[1em]">{agora ?? hora}</span>
      <span className="flex items-center gap-[0.32em]">
        <IconesStatus bateria={bateria} cor={cor} />
      </span>
    </div>
  );
}

/** Só os ícones (sinal, Wi-Fi, bateria), para quem já tem a própria faixa. */
export function IconesStatus({
  bateria = 82,
  cor = "currentColor",
}: {
  bateria?: number;
  cor?: string;
}) {
  const nivel = Math.max(0, Math.min(100, Math.round(bateria)));
  const baixa = nivel <= 20;
  return (
    <>
      {/* Sinal de celular: 4 barras */}
      <svg viewBox="0 0 18 12" className="h-[0.7em] w-auto" fill={cor}>
        <rect x="0" y="7.6" width="3.2" height="4.4" rx="1" />
        <rect x="4.9" y="5.2" width="3.2" height="6.8" rx="1" />
        <rect x="9.8" y="2.6" width="3.2" height="9.4" rx="1" />
        <rect x="14.7" y="0" width="3.2" height="12" rx="1" />
      </svg>
      {/* Wi-Fi: três faixas em leque */}
      <svg viewBox="0 0 17 12.4" className="h-[0.72em] w-auto" fill={cor}>
        <path d="M8.5 2.55c2.36 0 4.5.9 6.13 2.4l1.23-1.27A10.6 10.6 0 0 0 8.5.8a10.6 10.6 0 0 0-7.36 2.88l1.23 1.27A8.8 8.8 0 0 1 8.5 2.55Z" />
        <path d="M8.5 6.08c1.4 0 2.67.53 3.63 1.4l1.23-1.27A7 7 0 0 0 8.5 4.33a7 7 0 0 0-4.86 1.88l1.23 1.27a5.3 5.3 0 0 1 3.63-1.4Z" />
        <path d="M8.5 7.83c.92 0 1.76.33 2.4.88L8.5 11.2 6.1 8.7c.64-.54 1.48-.87 2.4-.87Z" />
      </svg>
      {/* Bateria com o nível (preenchimento proporcional + número, como no iOS) */}
      <svg viewBox="0 0 28 13" className="h-[0.78em] w-auto">
        <rect
          x="0.5"
          y="0.5"
          width="24"
          height="12"
          rx="3.8"
          fill="none"
          stroke={cor}
          strokeOpacity="0.38"
        />
        <rect
          x="2"
          y="2"
          width={(21 * nivel) / 100}
          height="9"
          rx="2.4"
          fill={baixa ? "#ff3b30" : cor}
        />
        <path
          d="M26 4.4v4.2c.85-.3 1.4-1.1 1.4-2.1s-.55-1.8-1.4-2.1Z"
          fill={cor}
          fillOpacity="0.45"
        />
      </svg>
    </>
  );
}
