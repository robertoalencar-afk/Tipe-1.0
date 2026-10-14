import type { ReactNode } from "react";
import { TipeLogo } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";

/**
 * Moldura das áreas internas (restaurante e garçom): barra superior leve e
 * conteúdo em fundo claro. As ações da direita usam botões `ghost` comuns.
 */
export function AreaShell({ eyebrow, title, subtitle, actions, children, wide = true }: {
  eyebrow: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const w = wide ? "max-w-[88rem]" : "max-w-3xl";
  return (
    <div className="min-h-screen bg-background-muted">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-xl print:hidden">
        <div className={cn("mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6", w)}>
          <div className="flex min-w-0 items-center gap-3">
            <TipeLogo variant="dark" className="h-7" />
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <span className="hidden truncate text-sm font-semibold text-muted-foreground sm:inline">{eyebrow}</span>
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>
      <main className={cn("mx-auto px-4 pb-24 pt-6 sm:px-6 lg:pb-12", w)}>
        {title && (
          <div className="mb-6">
            <p className="eyebrow text-muted-foreground sm:hidden">{eyebrow}</p>
            <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-heading sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
