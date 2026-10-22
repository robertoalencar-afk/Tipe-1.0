/**
 * Carrossel de histórias no formato da gravação de referência (V5): cards altos 4:5 lado a lado,
 * o primeiro é o filme do fluxo do produto e os outros são fotos do casting com a frase por cima.
 * No celular desliza com o dedo (scroll-snap nativo) mostrando a ponta do próximo card; setas e
 * pontos embaixo. A foto ativa assenta com zoom lento e a frase sobe.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fios } from "./Bigode";
import { fotoSrc, type NomeFoto } from "./Foto";
import { Secao } from "./Site";
import { VideoProduto } from "./VideoProduto";

type Historia = { id: string; foto?: NomeFoto; posicao?: string; frase?: string; dado?: string; legenda?: string; alt?: string };

// O primeiro card é o vídeo; a foto "dividir" ficou na abertura e não se repete aqui.
const HISTORIAS: Historia[] = [
  { id: "video" },
  {
    id: "pix",
    foto: "pix-mao",
    posicao: "50% 50%",
    frase: "Ninguém levanta a mão para pedir a conta.",
    dado: "0 aplicativos",
    legenda: "A conta abre na câmera do celular.",
    alt: "Cliente pagando com Pix no celular à mesa",
  },
  {
    id: "gorjeta",
    foto: "gorjeta-mao",
    posicao: "50% 45%",
    frase: "A gorjeta chega com o nome de quem atendeu.",
    dado: "70%",
    legenda: "da gorjeta extra vai para o saldo do garçom.",
    alt: "Garçom recebendo aviso de gorjeta no celular",
  },
  {
    id: "caixa",
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

  // Ativo = o card mais perto da borda esquerda do trilho (vários cabem na tela no desktop).
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-i]"));
      const origem = cards[0]?.offsetLeft ?? 0;
      let melhor = 0;
      let menor = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - origem - el.scrollLeft);
        if (d < menor) {
          menor = d;
          melhor = i;
        }
      });
      // No fim do trilho, o último card conta como ativo.
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) melhor = cards.length - 1;
      setAtivo(melhor);
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    el.addEventListener("scroll", aoRolar, { passive: true });
    medir();
    return () => {
      el.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
    };
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
          const classe =
            "relative w-[82vw] max-w-[30rem] shrink-0 snap-start overflow-hidden rounded-[1.75rem] sm:w-[44vw] lg:w-[min(30rem,31vw)] lg:rounded-[2.25rem]";
          if (!h.foto)
            return (
              <div key={h.id} data-i={i} aria-roledescription="slide" aria-label={`${i + 1} de ${HISTORIAS.length}`} className={classe}>
                <VideoProduto className="!rounded-none" />
              </div>
            );
          const f = fotoSrc(h.foto);
          return (
            <figure
              key={h.id}
              data-i={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${HISTORIAS.length}`}
              className={classe}
            >
              <img
                src={f.src}
                srcSet={f.srcSet}
                sizes="(min-width: 1024px) 30rem, 82vw"
                alt={h.alt}
                loading="lazy"
                decoding="async"
                width={1080}
                height={1350}
                className={cn(
                  "aspect-[4/5] w-full object-cover transition-transform duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  ativo === i ? "scale-100" : "scale-[1.08]",
                )}
                style={{ objectPosition: h.posicao }}
              />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.5)_0%,transparent_40%,transparent_58%,rgb(0_0_0/0.6)_100%)]" />
              <figcaption className="absolute inset-0 flex flex-col justify-between p-6 text-white sm:p-8">
                <p
                  className={cn(
                    "max-w-[15ch] font-display text-[clamp(1.7rem,1.2rem+1.5vw,2.5rem)] font-normal leading-[1.02] tracking-[-0.04em] transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    ativo === i ? "translate-y-0 opacity-100" : "translate-y-3 opacity-80",
                  )}
                >
                  {h.frase}
                </p>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-none tracking-[-0.04em] text-[#0FC9BD]">
                    {h.dado}
                  </span>
                  <span className="text-[0.95rem] text-white/85">{h.legenda}</span>
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
          aria-label="História anterior"
          className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {HISTORIAS.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir para a história ${i + 1}`}
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
          aria-label="Próxima história"
          className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
        >
          <ArrowRight className="seta h-5 w-5" />
          <Fios intensidade="leve" />
        </button>
      </div>
    </Secao>
  );
}
