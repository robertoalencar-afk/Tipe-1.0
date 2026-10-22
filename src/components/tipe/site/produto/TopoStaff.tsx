/**
 * Topo do Tipe Staff: foto editorial de um garçom no salão com os avisos do Tipe
 * Staff flutuando por cima, como no celular dele durante o turno. Os avisos entram
 * um a um (subida curta, leve escala e foco), ficam em camadas com sombra macia e
 * seguem levemente o cursor no computador. Os valores são demonstrativos e a
 * legenda abaixo da foto diz isso. Com movimento reduzido, tudo aparece parado.
 */
import type { CSSProperties, ReactNode } from "react";
import { Check, HandCoins, Star } from "lucide-react";
import { TipeSymbol } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";
import { Foto } from "../Foto";
import { useProfundidade } from "./useProfundidade";

const ESTILO = `
.staff-camada {
  transform: translate3d(calc(var(--mx, 0) * var(--z, 0) * 1px), calc(var(--my, 0) * var(--z, 0) * 1px), 0);
  transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
@keyframes staff-entra {
  from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.94); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: none; }
}
.staff-entra { animation: staff-entra 820ms cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d, 0ms); }
@keyframes staff-brilho {
  0%, 100% { box-shadow: 0 0 0 0 rgb(15 201 189 / 0); }
  40% { box-shadow: 0 0 0 6px rgb(15 201 189 / 0.18); }
}
.staff-novo { animation: staff-brilho 1600ms ease-out both; animation-delay: var(--d, 0ms); }
@media (prefers-reduced-motion: reduce) {
  .staff-camada { transform: none; transition: none; }
  .staff-entra, .staff-novo { animation: none; }
}
`;

function IconeApp() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] bg-[#021E34] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] sm:h-10 sm:w-10">
      <TipeSymbol className="h-[1.1rem] w-[1.1rem] [--color-primary:#0FC9BD] sm:h-6 sm:w-6" />
    </span>
  );
}

function Aviso({
  titulo,
  quando,
  selo,
  children,
  atraso,
  novo = false,
}: {
  titulo: string;
  quando: string;
  selo: ReactNode;
  children: ReactNode;
  atraso: number;
  novo?: boolean;
}) {
  return (
    <li
      className={cn(
        "staff-entra flex items-center gap-2.5 rounded-[1.05rem] border border-white/60 bg-white/[0.86] px-2.5 py-2 text-[#021E34] sm:items-start sm:gap-3 shadow-[0_22px_44px_-22px_rgb(2_30_52/0.55),0_2px_6px_-2px_rgb(2_30_52/0.12)] backdrop-blur-md sm:rounded-[1.3rem] sm:p-3.5",
        novo && "staff-novo",
      )}
      style={{ "--d": `${atraso}ms` } as CSSProperties}
    >
      <IconeApp />
      <div className="min-w-0 flex-1">
        <p className="hidden items-center justify-between gap-2 text-[0.68rem] font-medium uppercase tracking-[0.06em] text-[#021E34]/55 sm:flex">
          <span className="flex items-center gap-1.5">
            Tipe Staff
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">{selo}</span>
          </span>
          <span className="normal-case tracking-normal">{quando}</span>
        </p>
        <p className="flex items-baseline justify-between gap-2 text-[0.84rem] font-semibold leading-snug tracking-[-0.01em] sm:mt-0.5 sm:text-[0.95rem]">
          <span className="truncate">{titulo}</span>
          <span className="shrink-0 text-[0.68rem] font-normal text-[#021E34]/55 sm:hidden">{quando}</span>
        </p>
        <div className="truncate text-[0.78rem] leading-snug text-[#021E34]/70 sm:mt-0.5 sm:text-[0.86rem]">{children}</div>
      </div>
    </li>
  );
}

function ResumoTurno({ atraso }: { atraso: number }) {
  const barras = [32, 48, 40, 72, 100, 64];
  return (
    <div
      className="staff-entra w-[10.5rem] rounded-[1.05rem] border border-white/10 bg-[#021E34]/[0.9] p-3 text-white shadow-[0_26px_50px_-24px_rgb(0_0_0/0.7)] backdrop-blur-md sm:w-[14.5rem] sm:rounded-[1.4rem] sm:p-4"
      style={{ "--d": `${atraso}ms` } as CSSProperties}
    >
      <p className="flex items-center justify-between text-[0.68rem] font-medium uppercase tracking-[0.06em] text-white/60">
        Resumo do turno <HandCoins className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden />
      </p>
      <p className="mt-1 text-[0.74rem] text-white/70 sm:mt-1.5 sm:text-[0.78rem]">Suas gorjetas hoje</p>
      <p className="money font-display text-[1.45rem] leading-none tracking-[-0.03em] sm:text-[2rem]">R$ 84,70</p>
      <div aria-hidden className="mt-3 hidden h-10 items-end gap-1 sm:flex">
        {barras.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-[3px]", i === barras.length - 2 ? "bg-[#0FC9BD]" : "bg-white/25")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[0.72rem] text-white/60 sm:mt-2 sm:text-[0.76rem]">
        9 mesas atendidas<span className="hidden sm:inline"> · 18h às 23h</span>
      </p>
    </div>
  );
}

export function TopoStaff({ children }: { children: ReactNode }) {
  const ref = useProfundidade<HTMLElement>();
  return (
    <section ref={ref} data-tema="claro" className="relative -mt-16 pt-16">
      <style>{ESTILO}</style>
      <div className="container-page grid items-center gap-8 pb-14 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20">
        <figure className="relative order-2 m-0 lg:order-1">
          <div className="relative">
            {/* Fundo: a foto se move ao contrário, bem pouco */}
            <div className="staff-camada overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]" style={{ "--z": -5 } as CSSProperties}>
              <Foto
                nome="staff"
                prioridade
                alt="Garçom no salão de um restaurante, com dois pratos numa mão, sorrindo ao ver um aviso no celular"
                posicao="58% 40%"
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="aspect-[4/5.6] scale-[1.03] sm:aspect-[4/5]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#021E34]/55 via-[#021E34]/15 to-transparent"
              />
            </div>

            {/* Resumo do turno: camada do meio */}
            <div
              className="staff-camada absolute left-3 top-3 sm:left-6 sm:top-6 xl:-left-8"
              style={{ "--z": 10 } as CSSProperties}
            >
              <ResumoTurno atraso={2700} />
            </div>

            {/* Avisos: camada da frente, do mais antigo (embaixo) ao mais novo (em cima) */}
            <div
              className="staff-camada absolute inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:bottom-7 sm:left-7 sm:w-[min(24rem,78%)] xl:-left-10"
              style={{ "--z": 18 } as CSSProperties}
            >
              <ol aria-label="Exemplo de avisos do Tipe Staff" className="flex flex-col-reverse gap-1.5 sm:gap-2.5">
                <Aviso titulo="Mesa 14 · pagamento confirmado" quando="5 min" selo={<Check className="h-2.5 w-2.5" strokeWidth={3.5} />} atraso={600}>
                  Pix aprovado · <span className="money">R$ 186,90</span>
                  <span className="hidden sm:inline"> · conta quitada</span>
                </Aviso>
                <Aviso titulo="Nova gorjeta recebida" quando="2 min" selo={<HandCoins className="h-2.5 w-2.5" />} atraso={1300}>
                  <span className="hidden sm:inline">Mesa 14 · </span>
                  <span className="money">R$ 10,00</span> ·{" "}
                  <span className="font-medium text-[#03665f]">
                    <span className="money">R$ 7,00</span> para você (70%)
                  </span>
                </Aviso>
                <Aviso titulo="Avaliação positiva" quando="agora" selo={<Star className="h-2.5 w-2.5 fill-current" />} atraso={2000} novo>
                  <span className="flex items-center gap-1.5">
                    <span className="flex gap-0.5 text-[#e8a317]" role="img" aria-label="5 de 5 estrelas">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                      ))}
                    </span>
                    <span className="truncate">“Atendimento atencioso”</span>
                  </span>
                </Aviso>
              </ol>
            </div>
          </div>
          <figcaption className="mt-3 flex items-start gap-2 text-[0.8rem] leading-snug text-muted-foreground">
            <span aria-hidden className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0FC9BD]" />
            Valores demonstrativos. Avisos como os que o garçom vê no Tipe Staff.
          </figcaption>
        </figure>
        <div className="order-1 lg:order-2">{children}</div>
      </div>
    </section>
  );
}
