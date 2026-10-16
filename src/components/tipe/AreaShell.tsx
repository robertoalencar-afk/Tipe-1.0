import type { ReactNode } from "react";
import { TipeLogo } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";

/**
 * Moldura das áreas internas (restaurante e garçom): barra superior leve e
 * conteúdo em fundo claro. As ações da direita usam botões `ghost` comuns.
 */
export function AreaShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  wide = true,
}: {
  eyebrow: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const w = wide ? "max-w-[88rem]" : "max-w-3xl";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl print:hidden">
        <div className={cn("mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6", w)}>
          <div className="flex min-w-0 items-center gap-3">
            <TipeLogo variant="dark" className="h-7" />
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <span className="hidden truncate text-[0.95rem] text-muted-foreground sm:inline">
              {eyebrow}
            </span>
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>
      <main className={cn("mx-auto px-4 pb-24 pt-8 sm:px-6 lg:pb-16 lg:pt-10", w)}>
        {title && (
          <div className="mb-8">
            <p className="eyebrow text-muted-foreground sm:hidden">{eyebrow}</p>
            <h1 className="mt-1 text-[clamp(2rem,1.5rem+1.6vw,3rem)] font-medium leading-[1.04] tracking-[-0.035em]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-[1.02rem] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
