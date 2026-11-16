import { useState, type ReactNode } from "react";
import { TipeLogo } from "@/components/tipe/Logo";
import espera from "@/assets/mascot-waiting.webp";
import obrigada from "@/assets/mascot-thanks.webp";
import conta from "@/assets/mascot-table-closed.webp";
import estrela from "@/assets/mascot-rating.webp";

const POSES = { espera, obrigada, conta, estrela } as const;
const ORDEM = ["espera", "obrigada", "conta", "estrela"] as const;

/** Página de erro da marca Tipe (404, falha ao carregar, sem internet). */
export function ErroPagina({
  codigo,
  titulo,
  texto,
  acoes,
  detalhe,
  pose = "espera",
  piadas = [],
}: {
  codigo?: string | undefined;
  titulo: string;
  texto: string;
  acoes: ReactNode;
  detalhe?: string | undefined;
  /** Pose inicial da Lebre; cada cutucada troca de pose. */
  pose?: keyof typeof POSES;
  /** Frases do balão da Lebre; cada cutucada mostra a próxima. */
  piadas?: string[];
}) {
  const [toques, setToques] = useState(0);
  const atual = ORDEM[(ORDEM.indexOf(pose) + toques) % ORDEM.length]!;
  const fala = piadas.length ? piadas[toques % piadas.length] : undefined;
  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center py-6">
        <a href="/" aria-label="Página inicial da Tipe">
          <TipeLogo variant="dark" className="h-8 w-auto" />
        </a>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pb-16 text-center">
        {fala && (
          <p
            key={toques}
            aria-live="polite"
            className="pop-in relative mb-3 max-w-xs rounded-2xl bg-brand/20 px-4 py-2.5 text-sm font-medium leading-snug after:absolute after:-bottom-1.5 after:left-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:rotate-45 after:bg-[color-mix(in_oklab,var(--brand-primary)_20%,var(--background))]"
          >
            {fala}
          </p>
        )}
        <button
          type="button"
          onClick={() => setToques((t) => t + 1)}
          aria-label="Cutucar a Lebre"
          className="group relative h-40 w-32 cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-48 sm:w-40"
        >
          <span key={toques} className="lebre-tropeco absolute inset-0 block">
            <span className="lebre-balanco absolute inset-0 block">
              {ORDEM.map((k) => (
                <img
                  key={k}
                  src={POSES[k]}
                  alt=""
                  aria-hidden
                  width={640}
                  height={640}
                  className={`absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-300 ${k === atual ? "opacity-100" : "opacity-0"}`}
                />
              ))}
            </span>
          </span>
        </button>
        {fala && <p className="mt-1 text-xs text-muted-foreground">Dá para cutucar a Lebre.</p>}
        {codigo && (
          <p className="mt-6 font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-strong">{codigo}</p>
        )}
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        <p className="mt-3 text-base text-muted-foreground">{texto}</p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{acoes}</div>
        {detalhe && <p className="mt-8 font-mono text-xs text-muted-foreground">Código do erro: {detalhe}</p>}
        <p className="mt-10 text-sm text-muted-foreground">
          Precisa de ajuda? Veja a <a href="/ajuda" className="underline underline-offset-4 hover:text-foreground">Central de ajuda</a>.
        </p>
      </div>
    </main>
  );
}

export const botaoPrimario =
  "inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
export const botaoSecundario =
  "inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
