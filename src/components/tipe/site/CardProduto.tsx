/**
 * Card de produto no estilo dos cards escuros da sunday ("Built for how you
 * already run"), com identidade própria por produto: cada um tem a sua cor de
 * luz e a sua tela real (conta no celular, gorjetas do garçom, cozinha no
 * tablet, relatórios no computador). O que ainda não existe aparece como "Em breve"
 * com um card ilustrativo, nunca com uma tela que finja ser real.
 */
import type { CSSProperties, ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import avatarLebre from "@/assets/lebre/avatar-ola.webp";
import { SetaFios } from "./Bigode";
import { Celular, Janela, Tablet } from "./Dispositivo";
import type { Produto } from "./produtos";
import { seloDoProduto, useEstadosLancamento } from "./useLancamento";

export const LUZ: Record<string, string> = {
  pay: "#0FC9BD",
  order: "#f4b860",
  staff: "#ff8a65",
  kitchen: "#f25f4c",
  restaurant: "#6ec6ff",
  ai: "#9be7c4",
  guest: "#e8d5b5",
};

function Aviso({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "absolute flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[oklch(0.22_0_0/0.82)] px-3 py-2.5 text-[0.8rem] leading-tight text-white shadow-[0_20px_40px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Selo({ cor }: { cor: string }) {
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#021E34]"
      style={{ background: cor }}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

/**
 * Esquadro do palco (22/10): todo aparelho fica em pé, centrado no mesmo eixo vertical e
 * com o topo na mesma linha (8% do palco); o que passa da altura some no degradê de baixo.
 * Os avisos ficam todos no mesmo canto, sem invadir o botão redondo.
 */
const EIXO =
  "absolute left-1/2 top-[8%] -translate-x-1/2 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-2";
const AVISO_POS = "bottom-6 left-6 right-[4.75rem] group-hover:-translate-y-1";

/** A composição de cada produto dentro do palco do card. */
function Vitrine({ p }: { p: Produto }) {
  const cor = LUZ[p.slug] ?? "#0FC9BD";
  switch (p.slug) {
    case "pay":
      return (
        <>
          <div className={`${EIXO} w-[54%]`}>
            <Celular tela="conta" alt="" sizes="200px" />
          </div>
          <Aviso className={AVISO_POS}>
            <Selo cor={cor} />
            <span>
              <span className="block text-white/60">Mesa 5 · sua parte</span>
              <span className="whitespace-nowrap">
                Pix aprovado <span className="money">R$ 163,10</span>
              </span>
            </span>
          </Aviso>
        </>
      );
    case "staff":
      return (
        <>
          <div className={`${EIXO} w-[54%]`}>
            <Celular tela="garcom" alt="" sizes="200px" />
          </div>
          <Aviso className={AVISO_POS}>
            <Selo cor={cor} />
            <span>
              <span className="block text-white/60">Gorjeta extra · Mesa 5</span>
              <span className="money">R$ 8,00</span> · R$ 5,60 para Joyce
            </span>
          </Aviso>
        </>
      );
    case "kitchen":
      return (
        <div className={`${EIXO} w-[72%]`}>
          <Tablet tela="kds" alt="" sizes="320px" />
        </div>
      );
    case "restaurant":
      return (
        <>
          <div className={`${EIXO} w-[88%]`}>
            <Janela tela="relatorios" alt="" sizes="440px" />
          </div>
          <Aviso className={AVISO_POS}>
            <Selo cor={cor} />
            <span>
              <span className="block text-white/60">Caixa · agora</span>
              Mesa 5 quitada pela Tipe
            </span>
          </Aviso>
        </>
      );
    case "ai":
      return (
        <div className="absolute inset-x-[6%] top-[8%] space-y-2 text-[0.875rem] leading-snug">
          <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[oklch(0.15_0_0)] transition-transform duration-700 group-hover:-translate-y-1">
            Quanto vendemos hoje no almoço?
          </p>
          <div className="flex items-end gap-2 transition-transform delay-75 duration-700 group-hover:-translate-y-1">
            <img
              src={avatarLebre}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full bg-white"
            />
            <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-[oklch(0.26_0_0)] px-3.5 py-2.5 text-white">
              Até agora, 31 mesas e <span className="money">R$ 4.212,40</span>. A mesa 7 ainda está
              aberta.
            </p>
          </div>
          <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[oklch(0.15_0_0)] transition-transform delay-150 duration-700 group-hover:-translate-y-1">
            Fecha a mesa 7, por favor.
          </p>
          <p
            className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#021E34]"
            style={{ background: cor }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Você confirma antes de a Lebre agir
          </p>
        </div>
      );
    default:
      return (
        <div className="absolute inset-x-[6%] top-[8%] rounded-[1.5rem] border border-white/10 bg-[oklch(0.24_0_0)] p-4 text-white transition-transform duration-700 group-hover:-translate-y-2">
          <p className="text-xs text-white/60">{p.cartao.titulo}</p>
          <ul className="mt-3 space-y-2 text-[0.9rem]">
            {p.cartao.linhas.map(([a, b]) => (
              <li key={a} className="flex items-baseline justify-between gap-3">
                <span className="text-white/75">{a}</span>
                <span className="money">{b}</span>
              </li>
            ))}
          </ul>
          <p
            className="mt-3 rounded-xl px-3 py-2 text-sm font-medium text-[#021E34]"
            style={{ background: cor }}
          >
            {p.cartao.rodape}
          </p>
          <p className="mt-3 text-center text-xs text-white/50">Ilustração · em desenvolvimento</p>
        </div>
      );
  }
}

export function CardProduto({ p, className }: { p: Produto; className?: string }) {
  const cor = LUZ[p.slug] ?? "#0FC9BD";
  const selo = seloDoProduto(p, useEstadosLancamento());
  return (
    <a
      href={`/produtos/${p.slug}`}
      aria-label={`${p.nome}${selo ? ` (${selo.toLowerCase()})` : ""}: ${p.resumo}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-[oklch(0.16_0_0)] text-white ring-1 ring-white/[0.07] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:ring-white/15 focus-visible:-translate-y-1",
        className,
      )}
      style={{ "--luz": cor } as CSSProperties}
    >
      <div className="relative z-10 p-6 pb-0">
        <p className="flex h-7 items-center gap-2 text-[0.95rem] text-white/65">
          <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
          {p.nome}
          {selo && (
            <span className="rounded-full border border-white/25 px-2 py-0.5 text-[11px] text-white/80">
              {selo}
            </span>
          )}
        </p>
        <p className="mt-2 min-h-[2.2em] font-display text-[1.5rem] font-normal leading-[1.1] tracking-[-0.03em] text-balance">
          {p.titulo}
        </p>
      </div>
      <div className="relative mt-6 aspect-[1/1] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-[-20%] bottom-[-35%] h-[90%] rounded-[50%] opacity-35 blur-3xl transition-opacity duration-700 group-hover:opacity-55"
          style={{ background: cor }}
        />
        <Vitrine p={p} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[oklch(0.16_0_0)] to-transparent"
        />
      </div>
      <span className="com-fios absolute bottom-6 right-6 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-[#021E34] transition-transform duration-500 group-hover:scale-105">
        <SetaFios className="meio-focinho-redondo" />
      </span>
    </a>
  );
}
