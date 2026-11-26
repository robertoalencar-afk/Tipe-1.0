import { cn } from "@/lib/utils";

/**
 * Estados de espera da TIPE: a lebre pulando + reticências em onda.
 * Leve (SVG + CSS, sem JS de animação) e com fallback sem movimento
 * (prefers-reduced-motion). Classes em styles.css (".tipe-espera-*").
 */

/** Lebre de traço que pula (orelhas balançam, sombra encolhe no ar). */
export function LebrePulando({ className = "size-10" }: { className?: string }) {
  return (
    <span className={cn("tipe-espera-lebre relative inline-block shrink-0", className)} aria-hidden>
      <svg
        viewBox="0 0 32 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tipe-espera-corpo absolute inset-0 h-full w-full overflow-visible"
      >
        <g className="tipe-espera-orelha-e">
          <ellipse cx="11.5" cy="10.5" rx="3.2" ry="8.3" transform="rotate(-9 11.5 18)" />
        </g>
        <g className="tipe-espera-orelha-d">
          <ellipse cx="20.5" cy="10.5" rx="3.2" ry="8.3" transform="rotate(9 20.5 18)" />
        </g>
        <circle cx="16" cy="28" r="9.2" />
        <g fill="currentColor" stroke="none">
          <circle className="tipe-espera-olho" cx="12.4" cy="26.6" r="1.15" />
          <circle className="tipe-espera-olho" cx="19.6" cy="26.6" r="1.15" />
          <ellipse cx="16" cy="29.6" rx="1.5" ry="1.05" />
        </g>
        <path d="M14.2 32.2c1.1.9 2.5.9 3.6 0" strokeWidth="1.4" />
      </svg>
      <span className="tipe-espera-sombra absolute -bottom-1 left-[20%] h-1 w-3/5 rounded-full bg-current opacity-20" />
    </span>
  );
}

/** Três pontos em onda: cabe dentro de botão, ao lado do texto. */
export function PontosCarregando({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn("tipe-espera-pontos inline-flex items-end gap-[0.18em]", className)}
      aria-hidden
    >
      <i />
      <i />
      <i />
    </span>
  );
}

/** Conteúdo de botão ocupado: "Entrando" + pontos em onda. */
export function TextoOcupado({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span>{children}</span>
      <PontosCarregando />
    </span>
  );
}

type Tamanho = "sm" | "md" | "tela";

/**
 * Espera com a marca: lebre pulando + mensagem.
 * - "sm": linha discreta dentro de cards/listas.
 * - "md": bloco centralizado numa área.
 * - "tela": ocupa a tela (entrada, troca de conta).
 */
export function Carregando({
  texto = "Carregando",
  detalhe,
  tamanho = "md",
  className = "",
}: {
  texto?: string;
  detalhe?: string;
  tamanho?: Tamanho;
  className?: string;
}) {
  const limpo = texto.replace(/[.…]+$/u, "");
  if (tamanho === "sm")
    return (
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "tipe-espera-in flex items-center gap-2.5 text-sm text-muted-foreground",
          className,
        )}
      >
        <LebrePulando className="size-5 text-primary" />
        <span>
          {limpo}
          <PontosCarregando className="ml-0.5" />
        </span>
      </p>
    );
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "tipe-espera-in flex flex-col items-center justify-center gap-3 text-center",
        tamanho === "tela" ? "min-h-[60vh] p-10" : "py-10",
        className,
      )}
    >
      <LebrePulando className={cn("text-primary", tamanho === "tela" ? "size-14" : "size-11")} />
      <p
        className={cn("font-medium text-foreground", tamanho === "tela" ? "text-base" : "text-sm")}
      >
        {limpo}
        <PontosCarregando className="ml-0.5" />
      </p>
      {detalhe && <p className="max-w-xs text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}
