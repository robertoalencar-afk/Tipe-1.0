/**
 * Abas das páginas de produto: trocam texto e palco ao mesmo tempo, como AbasDemo,
 * mas o palco pode ser uma foto (com a tela REAL do app do cliente subindo por
 * cima, ou um card de interface) ou um painel desenhado sem foto (a conversa da
 * Lebre, por exemplo). Uma linha de progresso avança sozinha até a próxima aba;
 * tocar numa aba para a troca automática. Com movimento reduzido, nada avança.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { fotoSrc, type NomeFoto } from "../Foto";
import { reduzMovimento } from "../movimento";
import { CelularReal, type TelaReal } from "./TelaReal";

export type AbaProduto = {
  id: string;
  rotulo: string;
  texto: string;
  /** Foto de fundo do palco. Sem foto, `painel` ocupa o palco inteiro. */
  foto?: NomeFoto | undefined;
  posicao?: string | undefined;
  altFoto?: string | undefined;
  painel?: ReactNode;
  tela?: TelaReal | undefined;
  altTela?: string | undefined;
  /** Card de interface por cima da foto, quando não há tela. */
  extra?: ReactNode;
};

const TEMPO = 6500;
const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function AbasProduto({ itens, className }: { itens: AbaProduto[]; className?: string }) {
  const [ativa, setAtiva] = useState(0);
  const [auto, setAuto] = useState(true);
  const [reduzido, setReduzido] = useState(false);
  const [ref, visivel] = useInView<HTMLDivElement>("0px 0px -20% 0px");

  useEffect(() => setReduzido(reduzMovimento()), []);

  useEffect(() => {
    if (!auto || !visivel || reduzido) return;
    const t = window.setTimeout(() => setAtiva((a) => (a + 1) % itens.length), TEMPO);
    return () => window.clearTimeout(t);
  }, [ativa, auto, visivel, reduzido, itens.length]);

  const escolher = (i: number) => {
    setAuto(false);
    setAtiva(i);
  };
  const atual = itens[ativa]!;
  const andando = auto && visivel && !reduzido;

  return (
    <div ref={ref} className={cn("grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14", className)}>
      <div className="min-w-0">
        <div
          role="tablist"
          aria-label="Escolha um tema"
          className="sem-barra -mx-4 flex gap-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0"
        >
          {itens.map((it, i) => (
            <div key={it.id} className="relative shrink-0 lg:border-t lg:border-border">
              <button
                type="button"
                role="tab"
                id={`aba-${it.id}`}
                aria-selected={ativa === i}
                aria-controls={`painel-${it.id}`}
                onClick={() => escolher(i)}
                className={cn(
                  "block w-full pb-3 pt-1 text-left transition-colors duration-500 lg:py-5",
                  ativa === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block whitespace-nowrap text-[0.98rem] font-medium lg:whitespace-normal lg:font-display lg:text-[1.35rem] lg:font-normal lg:tracking-[-0.03em]">
                  {it.rotulo}
                </span>
              </button>
              <div
                className={cn(
                  "hidden transition-[grid-template-rows,opacity] duration-700 lg:grid",
                  EASE,
                  ativa === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="pb-6 text-[1rem] leading-relaxed text-muted-foreground">
                    {it.texto}
                  </p>
                </div>
              </div>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[2px] lg:bottom-auto lg:top-[-1px]"
              >
                <span
                  key={`${ativa}-${andando}`}
                  className={cn(
                    "block h-full origin-left bg-foreground",
                    ativa === i ? (andando ? "aba-progresso" : "scale-x-100") : "scale-x-0",
                  )}
                  style={{ "--tempo": `${TEMPO}ms` } as CSSProperties}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        id={`painel-${atual.id}`}
        role="tabpanel"
        aria-labelledby={`aba-${atual.id}`}
        className="relative min-w-0"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-background-muted sm:aspect-[16/12] lg:aspect-[16/13]">
          {itens.map((it, i) => {
            const on = i === ativa;
            const base = cn(
              "absolute inset-0 transition-[opacity,transform] duration-[1400ms]",
              EASE,
              on ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
            );
            if (it.foto) {
              const f = fotoSrc(it.foto);
              return (
                <img
                  key={it.id}
                  src={f.src}
                  srcSet={f.srcSet}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  alt={on ? (it.altFoto ?? "") : ""}
                  aria-hidden={!on || undefined}
                  loading="lazy"
                  decoding="async"
                  className={cn(base, "h-full w-full object-cover")}
                  style={{ objectPosition: it.posicao ?? "50% 50%" }}
                />
              );
            }
            return (
              <div key={it.id} aria-hidden={!on || undefined} className={base}>
                {it.painel}
              </div>
            );
          })}
          {atual.foto && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
            />
          )}
          {itens.map((it, i) => {
            const on = i === ativa;
            const cls = cn(
              "absolute transition-[opacity,transform] duration-[1000ms]",
              EASE,
              on ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            );
            const delay = { transitionDelay: on ? "250ms" : "0ms" };
            if (it.tela)
              return (
                <div
                  key={`t-${it.id}`}
                  className={cn(cls, "bottom-[-16%] right-[6%] w-[44%] max-w-[15rem] sm:w-[30%]")}
                  style={delay}
                  aria-hidden={!on || undefined}
                >
                  <CelularReal tela={it.tela} alt={on ? (it.altTela ?? "") : ""} sizes="240px" />
                </div>
              );
            if (it.extra)
              return (
                <div
                  key={`x-${it.id}`}
                  className={cn(cls, "bottom-5 right-5 w-[min(82%,20rem)] sm:bottom-8 sm:right-8")}
                  style={delay}
                  aria-hidden={!on || undefined}
                >
                  {it.extra}
                </div>
              );
            return null;
          })}
        </div>
        <div key={atual.id} className="troca-in mt-6 lg:hidden">
          <p className="font-display text-[1.6rem] leading-[1.1] tracking-[-0.03em]">
            {atual.rotulo}
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{atual.texto}</p>
        </div>
      </div>
    </div>
  );
}
