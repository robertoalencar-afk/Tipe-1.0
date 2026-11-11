import type { ReactNode } from "react";
import { TipeLogo } from "@/components/tipe/Logo";
import lebre from "@/assets/mascot-waiting.webp";

/** Página de erro da marca Tipe (404, falha ao carregar, sem internet). */
export function ErroPagina({
  codigo,
  titulo,
  texto,
  acoes,
  detalhe,
}: {
  codigo?: string | undefined;
  titulo: string;
  texto: string;
  acoes: ReactNode;
  detalhe?: string | undefined;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center py-6">
        <a href="/" aria-label="Página inicial da Tipe">
          <TipeLogo variant="dark" className="h-8 w-auto" />
        </a>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pb-16 text-center">
        <img src={lebre} alt="" width={160} height={160} className="h-32 w-32 object-contain sm:h-40 sm:w-40" />
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
