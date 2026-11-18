/**
 * Aula com foto de verdade: dois celulares lado a lado, "Assim" e "Evite", com fotos de pratos
 * do próprio acervo da Tipe (public/cardapio). Quando não há uma foto real do erro, o defeito é
 * simulado na mesma foto com filtro (escura, tremida) e a legenda diz "simulação".
 * Guias por cima do celular certo mostram o que observar (grade, foco, 45°, luz lateral).
 */
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Foto3D } from "../site/order/Foto3D";

export type Guia = "grade" | "foco" | "angulo" | "luz" | "margem";
export type Lado = {
  src: string;
  legenda: string;
  filtro?: string;
  guia?: Guia;
  simulacao?: boolean;
  posicao?: string;
};
export type Cena =
  | { tipo: "comparar"; certo: Lado; errado: Lado }
  | { tipo: "volume"; foto: string; profundidade: string };

function GuiaSobre({ guia }: { guia: Guia }) {
  if (guia === "grade")
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[1, 2].map((i) => (
          <span
            key={`v${i}`}
            className="absolute inset-y-0 w-px bg-white/45"
            style={{ left: `${(i * 100) / 3}%` }}
          />
        ))}
        {[1, 2].map((i) => (
          <span
            key={`h${i}`}
            className="absolute inset-x-0 h-px bg-white/45"
            style={{ top: `${(i * 100) / 3}%` }}
          />
        ))}
      </div>
    );
  if (guia === "margem")
    return (
      <div
        className="pointer-events-none absolute inset-[12%] rounded-xl border-2 border-dashed border-teal-300/90"
        aria-hidden
      />
    );
  if (guia === "foco")
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="absolute left-1/2 top-[55%] size-16 -translate-x-1/2 -translate-y-1/2 border-2 border-yellow-300 motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]" />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
          1x
        </span>
      </div>
    );
  if (guia === "angulo")
    return (
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute right-2 top-8 size-14"
        aria-hidden
      >
        <circle cx="50" cy="50" r="46" fill="rgba(7,29,43,.6)" />
        <line x1="20" y1="72" x2="82" y2="72" stroke="rgba(255,255,255,.6)" strokeWidth="3" />
        <line
          x1="20"
          y1="72"
          x2="66"
          y2="26"
          stroke="rgb(94 234 212)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M48 72 A28 28 0 0 0 40 52" fill="none" stroke="rgb(94 234 212)" strokeWidth="3" />
        <text x="58" y="64" fill="#fff" fontSize="18" fontWeight="700">
          45°
        </text>
      </svg>
    );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-amber-100/35 to-transparent" />
      <span className="absolute left-2 top-8 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
        ☀ janela
      </span>
    </div>
  );
}

function Celular({ lado, certo }: { lado: Lado; certo: boolean }) {
  return (
    <figure className="min-w-0 flex-1">
      <div
        className={cn(
          "relative mx-auto aspect-[9/16] w-full max-w-[13.5rem] overflow-hidden rounded-[1.6rem] border-[5px] bg-black shadow-2xl transition-transform duration-500",
          certo
            ? "border-white/90 shadow-teal-500/20 motion-safe:sm:-rotate-1"
            : "border-white/25 opacity-95 motion-safe:sm:rotate-1",
        )}
      >
        <img
          src={lado.src}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          style={{ filter: lado.filtro, objectPosition: lado.posicao }}
        />
        {lado.guia && <GuiaSobre guia={lado.guia} />}
        <span
          className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-black/60"
          aria-hidden
        />
        <span
          className={cn(
            "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow",
            certo ? "bg-teal-400 text-[#071d2b]" : "bg-red-500 text-white",
          )}
        >
          {certo ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
          {certo ? "Assim" : "Evite"}
        </span>
        {lado.simulacao && (
          <span className="absolute right-2 top-2 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-white/80">
            simulação
          </span>
        )}
      </div>
      <figcaption
        className={cn(
          "mx-auto mt-3 max-w-[13.5rem] text-center text-[11px] leading-snug sm:text-xs",
          certo ? "text-teal-200" : "text-red-200",
        )}
      >
        {lado.legenda}
      </figcaption>
    </figure>
  );
}

export function CenaFoto({ cena }: { cena: Cena }) {
  if (cena.tipo === "volume")
    return (
      <div className="flex h-full items-center justify-center gap-3 py-2 sm:gap-5">
        <figure className="w-[28%] max-w-[8.5rem]">
          <img
            src={cena.foto}
            alt=""
            className="aspect-[9/16] w-full rounded-2xl object-cover ring-1 ring-white/20"
          />
          <figcaption className="mt-2 text-center text-[11px] text-white/60">Sua foto</figcaption>
        </figure>
        <span className="text-lg text-teal-300" aria-hidden>
          +
        </span>
        <figure className="w-[28%] max-w-[8.5rem]">
          <img
            src={cena.profundidade}
            alt=""
            className="aspect-[9/16] w-full rounded-2xl object-cover ring-1 ring-white/20"
          />
          <figcaption className="mt-2 text-center text-[11px] text-white/60">
            Mapa de volume
          </figcaption>
        </figure>
        <span className="text-lg text-teal-300" aria-hidden>
          =
        </span>
        <figure className="w-[34%] max-w-[10.5rem]">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.4rem] border-[4px] border-white/90 shadow-2xl shadow-teal-500/20">
            <Foto3D
              foto={cena.foto}
              profundidade={cena.profundidade}
              alt="Prato com volume"
              className="size-full"
            />
          </div>
          <figcaption className="mt-2 text-center text-[11px] font-medium text-teal-200">
            Ao vivo: mova o dedo ou o mouse
          </figcaption>
        </figure>
      </div>
    );
  return (
    <div className="flex h-full items-start justify-center gap-3 pt-3 sm:gap-6">
      <Celular lado={cena.certo} certo />
      <Celular lado={cena.errado} certo={false} />
    </div>
  );
}
