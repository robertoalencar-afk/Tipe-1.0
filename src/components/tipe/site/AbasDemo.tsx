/**
 * Abas que trocam texto, foto e tela real ao mesmo tempo (como "You run the room"
 * na sunday): a foto faz fusão com leve zoom, a tela do celular sobe por cima e
 * uma linha de progresso avança sozinha até a próxima aba. Tocar numa aba para a
 * troca automática. Com movimento reduzido, nada avança sozinho.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { PhoneShot, type Tela } from "@/components/tipe/landing/PhoneShot";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { fotoSrc, type NomeFoto } from "./Foto";

export type ItemAba = {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  foto: NomeFoto;
  posicao?: string | undefined;
  altFoto: string;
  tela?: Tela | undefined;
  altTela?: string | undefined;
  /** Card de interface no lugar do celular (painel, cozinha, Lebre). */
  extra?: ReactNode;
  href?: string | undefined;
  link?: string | undefined;
};

const TEMPO = 6500;

export function AbasDemo({ itens, className }: { itens: ItemAba[]; className?: string }) {
  const [ativa, setAtiva] = useState(0);
  const [auto, setAuto] = useState(true);
  const [ref, visivel] = useInView<HTMLDivElement>("0px 0px -20% 0px");
  const reduzido = useRef(false);

  useEffect(() => {
    reduzido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!auto || !visivel || reduzido.current) return;
    const t = window.setTimeout(() => setAtiva((a) => (a + 1) % itens.length), TEMPO);
    return () => window.clearTimeout(t);
  }, [ativa, auto, visivel, itens.length]);

  const escolher = (i: number) => {
    setAuto(false);
    setAtiva(i);
  };
  const atual = itens[ativa]!;

  return (
    <div ref={ref} className={cn("grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14", className)}>
      {/* Abas: lista vertical no computador, faixa rolável no celular */}
      <div className="min-w-0 lg:order-1">
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
              {/* Texto da aba ativa abre embaixo dela no computador */}
              <div
                className={cn(
                  "hidden transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:grid",
                  ativa === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="pb-6 text-[1rem] leading-relaxed text-muted-foreground">
                    {it.texto}
                  </p>
                  {it.href && (
                    <a
                      href={it.href}
                      tabIndex={ativa === i ? undefined : -1}
                      className="-mt-2 mb-6 inline-flex items-center gap-1.5 text-[0.95rem] font-medium text-foreground"
                    >
                      {it.link ?? "Saiba mais"} <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              {/* Linha de progresso */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[2px] lg:bottom-auto lg:top-[-1px]"
              >
                <span
                  key={`${ativa}-${auto}-${visivel}`}
                  className={cn(
                    "block h-full origin-left bg-foreground",
                    ativa === i ? (auto && visivel ? "aba-progresso" : "scale-x-100") : "scale-x-0",
                  )}
                  style={{ "--tempo": `${TEMPO}ms` } as CSSProperties}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Palco: fotos em fusão + tela real por cima */}
      <div
        id={`painel-${atual.id}`}
        role="tabpanel"
        aria-labelledby={`aba-${atual.id}`}
        className="relative min-w-0 lg:order-2"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-background-muted sm:aspect-[16/12] lg:aspect-[16/13]">
          {itens.map((it, i) => {
            const f = fotoSrc(it.foto);
            return (
              <img
                key={it.id}
                src={f.src}
                srcSet={f.srcSet}
                sizes="(min-width: 1024px) 55vw, 100vw"
                alt={i === ativa ? it.altFoto : ""}
                aria-hidden={i !== ativa || undefined}
                loading="lazy"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  i === ativa ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
                )}
                style={{ objectPosition: it.posicao ?? "50% 50%" }}
              />
            );
          })}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
          />
          {itens.map((it, i) =>
            it.tela ? (
              <div
                key={`t-${it.id}`}
                className={cn(
                  "absolute bottom-[-14%] right-[6%] w-[42%] max-w-[15rem] transition-[opacity,transform] duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[30%]",
                  i === ativa ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
                )}
                style={{ transitionDelay: i === ativa ? "250ms" : "0ms" }}
                aria-hidden={i !== ativa || undefined}
              >
                <PhoneShot tela={it.tela} alt={it.altTela ?? ""} sizes="240px" />
              </div>
            ) : it.extra ? (
              <div
                key={`x-${it.id}`}
                className={cn(
                  "absolute bottom-5 right-5 w-[min(82%,20rem)] transition-[opacity,transform] duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:bottom-8 sm:right-8",
                  i === ativa ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                )}
                style={{ transitionDelay: i === ativa ? "250ms" : "0ms" }}
                aria-hidden={i !== ativa || undefined}
              >
                {it.extra}
              </div>
            ) : null,
          )}
        </div>
        {/* Texto da aba no celular */}
        <div key={atual.id} className="troca-in mt-6 lg:hidden">
          <p className="font-display text-[1.6rem] leading-[1.1] tracking-[-0.03em]">
            {atual.titulo}
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{atual.texto}</p>
          {atual.href && (
            <a href={atual.href} className="mt-4 inline-flex items-center gap-1.5 font-medium">
              {atual.link ?? "Saiba mais"} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
