/**
 * Trilho de cards de produto com título e setas. No desktop fica dentro da largura do
 * conteúdo: quatro cards cabem inteiros, alinhados às margens do título, e as setas andam
 * um card por vez. No celular sangra à direita de propósito.
 */
import { useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/tipe/landing/motion";
import { CardProduto } from "./CardProduto";
import type { Produto } from "./produtos";

export function TrilhoProdutos({ titulo, produtos }: { titulo: ReactNode; produtos: Produto[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const andar = (dir: number) => {
    const el = trilho.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const passo = card
      ? card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0")
      : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * passo, behavior: "smooth" });
  };
  return (
    <>
      <div className="container-page flex flex-wrap items-end justify-between gap-6">
        {titulo}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => andar(-1)}
            aria-label="Produtos anteriores"
            className="grid h-12 w-12 place-items-center rounded-full border border-border transition-colors hover:border-foreground/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => andar(1)}
            aria-label="Próximos produtos"
            className="grid h-12 w-12 place-items-center rounded-full border border-border transition-colors hover:border-foreground/40"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-page mt-12 max-lg:px-0">
        <div
          ref={trilho}
          className="sem-barra flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 sm:gap-6 sm:scroll-px-10 sm:px-10 lg:scroll-px-0 lg:px-0"
        >
          {produtos.map((p, i) => (
            <Reveal
              key={p.slug}
              delay={Math.min(i, 3) * 110}
              className="flex w-[80vw] max-w-[22rem] shrink-0 snap-start lg:w-[calc((100%-4.5rem)/4)] lg:max-w-none"
            >
              <CardProduto p={p} className="w-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}
