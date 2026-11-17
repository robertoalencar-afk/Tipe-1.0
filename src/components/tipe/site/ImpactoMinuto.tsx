/**
 * "O impacto de cada minuto.": indicadores públicos do Sunday, com atribuição
 * e links para as fontes, servindo de ponte para a calculadora de giro logo
 * abaixo. Não são resultados da Tipe nem promessa. Números contam ao entrar na
 * tela; com movimento reduzido aparecem prontos.
 */
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Palavras } from "@/components/tipe/landing/motion";
import { FONTES, INDICADORES_SUNDAY as S } from "@/lib/tipe/giro/cenarios";
import { useContagem } from "./calculadora/animacao";

const NOTA =
  "Indicadores de referência divulgados pela Sunday, plataforma internacional de pagamentos para restaurantes. Os resultados podem variar e não representam desempenho comprovado do Tipe.";

function Contador({
  alvo,
  antes = "",
  depois,
  className,
}: {
  alvo: number;
  antes?: string | undefined;
  depois: ReactNode;
  className?: string;
}) {
  const [ref, valor] = useContagem(alvo);
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      <span className="sr-only">
        {antes}
        {alvo}
      </span>
      <span aria-hidden className="tabular-nums">
        {antes}
        {Math.round(valor)}
      </span>
      {depois}
    </span>
  );
}

/** Arredonda coordenadas: servidor e navegador calculam trigonometria com diferenças mínimas. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** O minuto em destaque: anel de relógio que desenha 12 dos 60 minutos. */
function Relogio() {
  const [ref, valor] = useContagem(S.minutosPorMesa, 1800);
  const R = 46;
  const C = 2 * Math.PI * R;
  const fracao = valor / 60;
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative aspect-square w-[min(15rem,62vw)] shrink-0 sm:w-[16rem] lg:w-[18rem]"
    >
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="1.2"
        />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * 2 * Math.PI;
          const forte = i % 5 === 0;
          const r1 = forte ? 39.5 : 41.5;
          return (
            <line
              key={i}
              x1={r3(50 + r1 * Math.cos(a))}
              y1={r3(50 + r1 * Math.sin(a))}
              x2={r3(50 + 43 * Math.cos(a))}
              y2={r3(50 + 43 * Math.sin(a))}
              stroke={i < Math.round(valor) ? "#0FC9BD" : "rgb(255 255 255 / 0.22)"}
              strokeWidth={forte ? 0.9 : 0.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#0FC9BD"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={`${r3(C * fracao)} ${r3(C)}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-[clamp(4.2rem,3rem+5vw,6.6rem)] font-normal leading-[0.85] tracking-[-0.06em] text-white">
            <span className="sr-only">{S.minutosPorMesa}</span>
            <span aria-hidden className="tabular-nums">
              {Math.round(valor)}
            </span>
            <span className="ml-1 text-[0.32em] tracking-[-0.02em] text-[#0FC9BD]">min</span>
          </p>
          <p className="mx-auto mt-2 max-w-[11ch] text-[0.85rem] leading-snug text-white/70">
            economizados por mesa
          </p>
        </div>
      </div>
    </div>
  );
}

const SECUNDARIOS = [
  {
    alvo: S.minutosPorGarcomTurno,
    depois: <span className="ml-1 text-[0.4em] tracking-[-0.02em] text-[#0FC9BD]">min</span>,
    texto: "de salão recuperados por garçom a cada turno",
  },
  {
    alvo: S.avaliacoesMultiplo,
    depois: <span className="text-[0.55em] text-[#0FC9BD]">×</span>,
    texto: "mais avaliações 5 estrelas no Google",
  },
  {
    alvo: S.gorjetasPct,
    antes: "+",
    depois: <span className="text-[0.55em] text-[#0FC9BD]">%</span>,
    texto: "em gorjetas para a equipe",
  },
];

export function ImpactoMinuto() {
  return (
    <section
      data-tema="claro"
      aria-label="O impacto de cada minuto"
      className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#021E34] text-white lg:rounded-[2.75rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_18%_35%,rgb(15_201_189/0.20),transparent_70%),radial-gradient(45%_60%_at_100%_100%,rgb(15_201_189/0.12),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.25),transparent)]"
        />

        <div className="relative px-6 pb-8 pt-12 sm:px-12 sm:pt-16 lg:px-16 lg:pt-20">
          <p className="font-display text-[1.05rem] tracking-[-0.02em] text-[#0FC9BD] sm:text-[1.2rem]">
            Referências de mercado
          </p>
          <Palavras
            as="h2"
            passo={110}
            className="mt-3 block max-w-[12ch] font-display text-[clamp(2.6rem,1.4rem+4.6vw,5.4rem)] font-normal leading-[0.95] tracking-[-0.05em]"
          >
            O impacto de cada minuto.
          </Palavras>
          <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-white/70 sm:text-[1.1rem]">
            Quando a conta chega pelo celular, a mesa não fica parada esperando a maquininha. Veja o
            que a Sunday divulga sobre restaurantes que pagam pelo QR Code.
          </p>

          <div className="mt-10 grid items-center gap-10 sm:mt-14 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
            <div className="flex justify-center lg:justify-start">
              <Relogio />
            </div>
            <ul className="grid border-y border-white/10 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {SECUNDARIOS.map((s) => (
                <li
                  key={s.texto}
                  className="flex items-end gap-4 border-white/10 py-5 [&:not(:last-child)]:border-b sm:flex-col sm:items-start sm:gap-2 sm:px-5 sm:py-7 sm:first:pl-0 sm:[&:not(:first-child)]:border-l sm:[&:not(:last-child)]:border-b-0 lg:flex-row lg:items-end lg:gap-5 lg:px-0 lg:[&:not(:first-child)]:border-l-0 lg:[&:not(:last-child)]:border-b xl:flex-col xl:items-start xl:gap-2 xl:px-6 xl:first:pl-0 xl:[&:not(:first-child)]:border-l xl:[&:not(:last-child)]:border-b-0"
                >
                  <Contador
                    alvo={s.alvo}
                    antes={s.antes}
                    depois={s.depois}
                    className="min-w-[3.6ch] font-display text-[clamp(2.8rem,2rem+2.6vw,4.2rem)] font-normal leading-[0.9] tracking-[-0.055em]"
                  />
                  <p className="pb-1 text-[0.9rem] leading-snug text-white/70 sm:max-w-[16ch]">
                    {s.texto}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 sm:mt-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.8rem] leading-relaxed text-white/55">{NOTA}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem]">
                <a
                  href={FONTES.home.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white/75 underline-offset-4 hover:text-white hover:underline"
                >
                  Fonte: sundayapp.com (EUA) <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
                <a
                  href={FONTES.roi.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white/75 underline-offset-4 hover:text-white hover:underline"
                >
                  Estudo de ROI da Sunday (maio de 2026){" "}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </p>
            </div>
            <a
              href="#calculadora"
              className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full py-1 text-[1rem] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:self-auto"
            >
              E no seu salão? Faça a conta.
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34] transition-transform duration-500 group-hover:translate-y-0.5">
                <ArrowDown className="h-4 w-4" aria-hidden />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
