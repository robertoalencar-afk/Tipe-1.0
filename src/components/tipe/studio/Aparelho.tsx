/**
 * Celular realista e fluido para as aulas do Estúdio: moldura de titânio escovado, borda preta,
 * ilha dinâmica, botões laterais e brilho no vidro. Ocupa a largura do pai (proporção de um
 * iPhone Pro), então funciona em qualquer tamanho sem escala fixa.
 * O CelularPro (src/components/tipe/CelularPro.tsx) é o aparelho em tamanho real das prévias;
 * este é a versão miniatura, desenhada em porcentagem.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TITANIO =
  "linear-gradient(145deg,#d9d4cc 0%,#8f8a83 18%,#e9e5de 34%,#7d7871 52%,#cfcac2 70%,#6f6a64 86%,#bdb8b0 100%)";

export function Aparelho({
  children,
  className,
  apagado = false,
}: {
  children: ReactNode;
  className?: string;
  /** Moldura escura (grafite), usada no exemplo "Evite". */
  apagado?: boolean;
}) {
  return (
    <div className={cn("relative aspect-[9/19.2] w-full", className)}>
      {[
        ["left", "17%", "4%"],
        ["left", "24%", "7%"],
        ["left", "32.5%", "7%"],
        ["right", "27%", "11%"],
      ].map(([lado, top, h], i) => (
        <span
          key={i}
          aria-hidden
          className="absolute w-[2.5%] rounded-sm"
          style={{
            [lado as "left"]: "-1.6%",
            top,
            height: h,
            background: apagado ? "#3a3d42" : TITANIO,
          }}
        />
      ))}
      <div
        className="absolute inset-0 rounded-[17%/8%] p-[1.6%]"
        style={{
          background: apagado
            ? "linear-gradient(145deg,#4b4f55,#26292d 40%,#55595f 70%,#2b2e32)"
            : TITANIO,
          boxShadow:
            "0 40px 70px -28px rgba(0,0,0,.65), 0 14px 28px -16px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.3)",
        }}
      >
        <div className="h-full w-full rounded-[16%/7.4%] bg-[#050505] p-[3.2%]">
          <div className="relative h-full w-full overflow-hidden rounded-[13.5%/6.3%] bg-black">
            {children}
            <span
              aria-hidden
              className="absolute left-1/2 top-[1.6%] h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.16)_0%,rgba(255,255,255,0)_32%)]"
            />
            <span
              aria-hidden
              className="absolute bottom-[1.2%] left-1/2 h-[0.6%] w-[34%] -translate-x-1/2 rounded-full bg-white/70"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
