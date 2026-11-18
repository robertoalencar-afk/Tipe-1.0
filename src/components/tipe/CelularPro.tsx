/**
 * Celular de verdade em CSS para prévias ao vivo: tela de 440 × 956 pontos (o tamanho
 * lógico do maior iPhone Pro), moldura de titânio, ilha dinâmica, barra de status com a
 * hora atual, botões laterais e indicador de início. O conteúdo é desenhado no tamanho
 * real e depois reduzido para caber na janela, então o layout é o mesmo do celular.
 * O `transform` da tela também prende os elementos `fixed` do conteúdo (como a barra do
 * carrinho) dentro do aparelho, como num celular.
 */
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TELA = { w: 440, h: 956 } as const;
const BORDA = 11; // moldura + borda preta
const CORPO = { w: TELA.w + BORDA * 2, h: TELA.h + BORDA * 2 };

/** Escala para o aparelho caber em `altura` px (nunca maior que o tamanho real). */
function escalaCelular(altura: number, largura = Infinity) {
  return Math.max(0.3, Math.min(1, altura / CORPO.h, largura / (CORPO.w + 8)));
}

function useHora() {
  const [hora, setHora] = useState(() => agora());
  useEffect(() => {
    const t = setInterval(() => setHora(agora()), 15000);
    return () => clearInterval(t);
  }, []);
  return hora;
}
function agora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function useEscala(fracao: number) {
  const calc = () =>
    typeof window === "undefined"
      ? 0.7
      : escalaCelular(window.innerHeight * fracao, window.innerWidth - 32);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const f = () => setS(calc());
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fracao]);
  return s;
}

export function CelularPro({
  children,
  fracaoAltura = 0.8,
  className,
}: {
  children: ReactNode;
  /** Quanto da altura da janela o aparelho pode ocupar. */
  fracaoAltura?: number;
  className?: string;
}) {
  const s = useEscala(fracaoAltura);
  const hora = useHora();
  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: CORPO.w * s, height: CORPO.h * s }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: CORPO.w, height: CORPO.h, transform: `scale(${s})` }}
      >
        {/* Botões laterais: ação e volume à esquerda; lateral e Controle da Câmera à direita. */}
        <Botao lado="esq" top={190} h={34} />
        <Botao lado="esq" top={262} h={64} />
        <Botao lado="esq" top={340} h={64} />
        <Botao lado="dir" top={290} h={104} />
        <Botao lado="dir" top={620} h={52} rasa />
        {/* Moldura de titânio escovado. */}
        <div
          className="absolute inset-0 rounded-[78px] p-[3px]"
          style={{
            background:
              "linear-gradient(145deg,#d9d4cc 0%,#8f8a83 18%,#e9e5de 34%,#7d7871 52%,#cfcac2 70%,#6f6a64 86%,#bdb8b0 100%)",
            boxShadow:
              "0 50px 90px -30px rgba(2,30,52,.55), 0 18px 36px -18px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.35)",
          }}
        >
          <div className="h-full w-full rounded-[75px] bg-[#050505] p-[8px]">
            {/* Tela: o transform faz dela o bloco de contenção dos elementos fixed. */}
            <div
              className="relative h-full w-full overflow-hidden rounded-[67px] bg-background text-foreground [&_.fixed.bottom-0]:pb-[30px]"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="h-full overflow-y-auto overscroll-contain px-5 pb-10 pt-[62px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children}
              </div>
              <BarraStatus hora={hora} />
              {/* Ilha dinâmica (menor, como na geração nova). */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[13px] z-[60] h-[32px] w-[104px] -translate-x-1/2 rounded-full bg-black"
              >
                <span className="absolute right-[12px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#1d2b4a,#05070c_70%)] ring-1 ring-[#11151d]" />
              </div>
              {/* Indicador de início. */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-[9px] left-1/2 z-[60] h-[5px] w-[146px] -translate-x-1/2 rounded-full bg-foreground/80"
              />
              {/* Brilho do vidro. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[61] rounded-[67px] bg-[linear-gradient(115deg,rgba(255,255,255,.07)_0%,transparent_28%)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Botao({
  lado,
  top,
  h,
  rasa,
}: {
  lado: "esq" | "dir";
  top: number;
  h: number;
  rasa?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute w-[5px]",
        lado === "esq" ? "-left-[3px] rounded-l-[3px]" : "-right-[3px] rounded-r-[3px]",
        rasa && "w-[4px] opacity-80",
      )}
      style={{
        top,
        height: h,
        background: "linear-gradient(90deg,#77726b,#d8d3cb 45%,#8a857e)",
      }}
    />
  );
}

function BarraStatus({ hora }: { hora: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[59] flex h-[56px] items-center justify-between bg-gradient-to-b from-background via-background/90 to-transparent px-[34px] pt-[4px] text-[17px] font-semibold tracking-[-0.01em]"
    >
      <span className="w-[86px] text-center">{hora}</span>
      <span className="flex items-center gap-[7px]">
        <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor">
          <rect x="0" y="8" width="3.2" height="4" rx="1" />
          <rect x="5" y="5.5" width="3.2" height="6.5" rx="1" />
          <rect x="10" y="3" width="3.2" height="9" rx="1" />
          <rect x="15" y="0" width="3.2" height="12" rx="1" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8.5.7 10.2 10.2 0 0 0 1.3 3.6l1.2 1.2a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.7.5 3.6 1.4l1.2-1.2a6.8 6.8 0 0 0-9.6 0l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.5 0 .9.2 1.2.5L8.5 11 7.3 9.7c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <span className="relative flex h-[13px] w-[27px] items-center rounded-[4px] border border-current/40 p-[1.5px]">
          <span className="h-full w-[78%] rounded-[2px] bg-current" />
          <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-current/50" />
        </span>
      </span>
    </div>
  );
}
