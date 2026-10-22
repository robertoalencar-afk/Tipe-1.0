/**
 * Moldura das páginas do site (home, produtos, preços, integrações): cabeçalho,
 * rodapé e a troca de fundo claro/escuro por seção, medida na sunday.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { Palavras } from "@/components/tipe/landing/motion";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { cn } from "@/lib/utils";
import { Fios, SetaFios } from "./Bigode";

/** Liga o fundo da página ao tema da seção que cruza o meio da tela. */
function useTemaPorSecao(raiz: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const meio = window.innerHeight * 0.5;
      let tema = "claro";
      for (const s of el.querySelectorAll<HTMLElement>("[data-tema='escuro']")) {
        const r = s.getBoundingClientRect();
        if (r.top <= meio && r.bottom >= meio) {
          tema = "escuro";
          break;
        }
      }
      if (el.dataset["tema"] !== tema) el.dataset["tema"] = tema;
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [raiz]);
}

export function SitePage({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);
  useTemaPorSecao(raiz);
  return (
    <div ref={raiz} data-tema="claro" className="sunday min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo">{children}</main>
      <LandingFooter />
      {extra}
    </div>
  );
}

/** Seção com tema: as escuras viram o fundo da página para preto ao chegar no meio da tela. */
export function Secao({
  tema = "claro",
  id,
  className,
  children,
  ariaLabel,
}: {
  tema?: "claro" | "escuro";
  id?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      data-tema={tema}
      aria-label={ariaLabel}
      className={cn("relative scroll-mt-16 py-16 sm:py-24 lg:py-32", className)}
    >
      {children}
    </section>
  );
}

/** Rótulo + título grande palavra por palavra + texto de apoio. */
export function Titulo({
  rotulo,
  titulo,
  texto,
  centro = false,
  className,
  as = "h2",
}: {
  rotulo?: string;
  titulo: string;
  texto?: string;
  centro?: boolean;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn(centro && "mx-auto text-center", "max-w-4xl", className)}>
      {rotulo && (
        <p className="font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong">
          {rotulo}
        </p>
      )}
      <Palavras
        as={as}
        passo={90}
        className={cn(
          "mt-3 block font-display font-normal leading-[0.98] tracking-[-0.045em] text-balance",
          as === "h1"
            ? "text-[clamp(2.5rem,1.3rem+5vw,5.8rem)]"
            : "text-[clamp(2rem,1.2rem+3.6vw,4.4rem)]",
        )}
      >
        {titulo}
      </Palavras>
      {texto && (
        <p
          className={cn(
            "mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-xl",
            centro && "mx-auto",
          )}
        >
          {texto}
        </p>
      )}
    </div>
  );
}

/**
 * CTA principal: seta com os fios da lebre. `vivo` faz os fios saltarem sozinhos a
 * cada 4,5 s, de leve; use só no CTA principal da página (o do topo).
 */
export function BotaoPrincipal({
  href = "/teste-gratis",
  children = "Teste grátis",
  className,
  vivo = false,
}: {
  href?: string;
  children?: ReactNode;
  className?: string;
  vivo?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "btn-tema com-fios inline-flex h-13 min-h-12 items-center gap-2.5 rounded-full pl-7 pr-6 text-[1rem] font-medium",
        className,
      )}
    >
      {children}
      <SetaFios auto={vivo} />
    </a>
  );
}

export function BotaoSecundario({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "com-fios inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 text-[1rem] font-medium",
        className,
      )}
    >
      {children}
      <Fios />
    </a>
  );
}

/** Faixa final com o gradiente da marca (o "Get a demo" da sunday, nas cores da Tipe). */
export function FaixaCta({
  titulo = "Pague. Sem esperar.",
  texto = `Os primeiros restaurantes ganham ${TRIAL_DAYS} dias grátis, sem cartão de crédito.`,
}: {
  titulo?: string;
  texto?: string;
}) {
  return (
    <section data-tema="claro" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-[linear-gradient(120deg,#021E34_0%,#03465a_45%,#0FC9BD_100%)] px-7 py-14 text-white sm:px-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#0FC9BD]/40 blur-3xl"
        />
        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Palavras
              as="h2"
              className="block max-w-[14ch] font-display text-[clamp(2.6rem,1.4rem+4.4vw,5.2rem)] font-normal leading-[0.95] tracking-[-0.045em]"
            >
              {titulo}
            </Palavras>
            <p className="mt-5 max-w-md text-lg text-white/80">{texto}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/teste-gratis"
              className="com-fios inline-flex min-h-14 items-center gap-2.5 rounded-full bg-white pl-8 pr-7 text-lg font-medium text-[#021E34] hover:bg-white/90"
            >
              Começar o teste grátis <SetaFios />
            </a>
            <a
              href="/simulador"
              className="inline-flex min-h-14 items-center rounded-full border border-white/40 px-8 text-lg font-medium text-white hover:bg-white hover:text-[#021E34]"
            >
              Testar o simulador
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
