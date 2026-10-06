import type { ReactNode } from "react";
import { TipeLogo } from "@/components/tipe/Logo";

/** Topo das áreas internas no mesmo visual da landing: faixa azul TIPE com brilho turquesa. */
export function AreaShell({ eyebrow, title, subtitle, actions, children, wide = true }: {
  eyebrow: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const w = wide ? "max-w-7xl" : "max-w-3xl";
  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden text-secondary-foreground print:hidden" style={{ background: "var(--gradient-brand)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className={`relative mx-auto ${w} px-4 sm:px-6`}>
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <TipeLogo className="h-9" />
              <span className="hidden rounded-full bg-secondary-foreground/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.18em] text-primary sm:inline">{eyebrow}</span>
            </div>
            <div className="flex items-center gap-1">{actions}</div>
          </div>
          {title && (
            <div className="pb-8 pt-2 sm:pb-10">
              <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary sm:hidden">{eyebrow}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-sm text-secondary-foreground/80 sm:text-base">{subtitle}</p>}
            </div>
          )}
        </div>
      </header>
      <main className={`relative mx-auto ${w} px-4 pb-10 sm:px-6 ${title ? "-mt-4" : "pt-6"}`}>
        <div className={title ? "rounded-t-3xl bg-background pt-6" : ""}>{children}</div>
      </main>
    </div>
  );
}
