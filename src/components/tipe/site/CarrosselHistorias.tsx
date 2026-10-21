/**
 * Carrossel fotográfico editorial (o "sunday pays for itself" da sunday, com fotos
 * e textos da Tipe): foto grande com a frase por cima, navegação discreta com
 * setas e pontos. No celular desliza com o dedo (scroll-snap nativo); a foto
 * ativa assenta com zoom lento e a frase entra palavra por palavra.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fios } from "./Bigode";
import { fotoSrc, type NomeFoto } from "./Foto";
import { Secao } from "./Site";

const HISTORIAS: { foto: NomeFoto; posicao: string; frase: string; dado: string; legenda: string; alt: string }[] = [
  {
    foto: "pix-mao",
    posicao: "50% 50%",
    frase: "Ninguém levanta a mão para pedir a conta.",
    dado: "0 aplicativos",
    legenda: "A conta abre na câmera do celular.",
    alt: "Cliente pagando com Pix no celular à mesa",
  },
  {
    foto: "dividir",
    posicao: "50% 45%",
    frase: "Cada um paga o seu, sem calculadora.",
    dado: "5 jeitos de dividir",
    legenda: "Tudo, partes iguais, itens, lugar ou valor.",
    alt: "Amigos dividindo a conta pelo celular",
  },
  {
    foto: "gorjeta-mao",
    posicao: "50% 45%",
    frase: "A gorjeta chega com o nome de quem atendeu.",
    dado: "70%",
    legenda: "da gorjeta extra vai para o saldo do garçom.",
    alt: "Garçom recebendo aviso de gorjeta no celular",
  },
  {
    foto: "fechamento",
    posicao: "45% 45%",
    frase: "O caixa fecha mesa por mesa, ao vivo.",
    dado: "R$ 0",
    legenda: "de tarifa da Tipe por transação.",
    alt: "Dona do restaurante conferindo o caixa no fim do dia",
  },
];

export function CarrosselHistorias() {
  const trilho = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset["i"]));
        }
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-i]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const ir = (i: number) => {
    const el = trilho.current;
    const alvo = el?.querySelector<HTMLElement>(`[data-i="${(i + HISTORIAS.length) % HISTORIAS.length}"]`);
    if (el && alvo) el.scrollTo({ left: alvo.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <Secao tema="claro" id="historias" ariaLabel="Por que a Tipe" className="!pt-6 sm:!pt-10">
      <div
        ref={trilho}
        className="sem-barra flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"
        aria-roledescription="carrossel"
      >
        {HISTORIAS.map((h, i) => {
          const f = fotoSrc(h.foto);
          return (
            <figure
              key={h.foto}
              data-i={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${HISTORIAS.length}`}
              className="relative w-[86vw] max-w-[78rem] shrink-0 snap-start overflow-hidden rounded-[1.75rem] sm:w-[88%] lg:rounded-[2.25rem]"
            >
              <img
                src={f.src}
                srcSet={f.srcSet}
                sizes="(min-width: 1024px) 78rem, 88vw"
                alt={h.alt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className={cn(
                  "aspect-[4/5] w-full object-cover transition-transform duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:aspect-[16/9]",
                  ativo === i ? "scale-100" : "scale-[1.08]",
                )}
                style={{ objectPosition: h.posicao }}
              />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.5)_0%,transparent_45%,transparent_60%,rgb(0_0_0/0.55)_100%)]" />
              <figcaption className="absolute inset-0 flex flex-col justify-between p-6 text-white sm:p-10 lg:p-14">
                <p
                  className={cn(
                    "max-w-[16ch] font-display text-[clamp(1.9rem,1.1rem+3.4vw,4.4rem)] font-normal leading-[1] tracking-[-0.045em] transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    ativo === i ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  )}
                >
                  {h.frase}
                </p>
                <p
                  className={cn(
                    "flex flex-wrap items-baseline gap-x-3 transition-[opacity,transform] delay-200 duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    ativo === i ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  )}
                >
                  <span className="font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)] leading-none tracking-[-0.04em] text-[#0FC9BD]">
                    {h.dado}
                  </span>
                  <span className="text-[0.98rem] text-white/85 sm:text-lg">{h.legenda}</span>
                </p>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => ir(ativo - 1)}
          aria-label="Foto anterior"
          className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {HISTORIAS.map((h, i) => (
            <button
              key={h.foto}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir para a foto ${i + 1}`}
              aria-current={ativo === i || undefined}
              className="grid h-6 w-6 place-items-center"
            >
              <span className={cn("block h-1.5 rounded-full transition-all duration-500", ativo === i ? "w-5 bg-foreground" : "w-1.5 bg-foreground/25")} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => ir(ativo + 1)}
          aria-label="Próxima foto"
          className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
        >
          <ArrowRight className="seta h-5 w-5" />
          <Fios intensidade="leve" />
        </button>
      </div>
    </Secao>
  );
}
