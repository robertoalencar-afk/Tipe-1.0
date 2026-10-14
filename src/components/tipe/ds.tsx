/**
 * Design system TIPE — peças de composição reutilizáveis.
 * Tokens e regras de uso: docs/design-system.md.
 */
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rótulo curto acima de títulos. */
export function Eyebrow({ children, className, tone = "brand" }: { children: ReactNode; className?: string; tone?: "brand" | "muted" | "light" }) {
  const color = tone === "brand" ? "text-brand-strong" : tone === "light" ? "text-brand" : "text-muted-foreground";
  return <p className={cn("eyebrow", color, className)}>{children}</p>;
}

/** Título de seção: um eyebrow, uma frase forte e no máximo duas linhas de apoio. */
export function SectionHeading({ eyebrow, title, text, align = "center", invert = false, className }: {
  eyebrow?: ReactNode; title: ReactNode; text?: ReactNode; align?: "center" | "left"; invert?: boolean; className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl", className)}>
      {eyebrow && <Eyebrow tone={invert ? "light" : "brand"}>{eyebrow}</Eyebrow>}
      <h2 className={cn("mt-3 font-display text-headline font-semibold tracking-display text-balance", invert ? "text-white" : "text-foreground")}>{title}</h2>
      {text && <p className={cn("mt-4 text-base leading-relaxed text-pretty sm:text-lg", invert ? "text-white/70" : "text-muted-foreground")}>{text}</p>}
    </div>
  );
}

export type Tone = "success" | "warning" | "error" | "neutral" | "brand" | "info";
const toneClass: Record<Tone, string> = {
  success: "bg-success/12 text-[oklch(0.42_0.12_150)]",
  warning: "bg-warning/18 text-[oklch(0.45_0.11_60)]",
  error: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-brand-strong",
  info: "bg-info/10 text-info",
};
const dotClass: Record<Tone, string> = {
  success: "bg-success", warning: "bg-warning", error: "bg-destructive", neutral: "bg-muted-foreground/50", brand: "bg-brand", info: "bg-info",
};

/** Estado com ponto colorido: mesmo vocabulário visual em todo o produto. */
export function StatusBadge({ tone = "neutral", children, className, live = false }: { tone?: Tone; children: ReactNode; className?: string; live?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none", toneClass[tone], className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass[tone], live && "tipe-live")} aria-hidden />
      {children}
    </span>
  );
}

/** Indicador numérico. `value` sempre vem de dado real; sem dado, use `empty`. */
export function StatCard({ label, value, hint, icon: Icon, tone, empty, className }: {
  label: ReactNode; value?: ReactNode; hint?: ReactNode; icon?: ComponentType<{ className?: string }> | undefined; tone?: "brand" | "warning" | undefined; empty?: ReactNode; className?: string | undefined;
}) {
  return (
    <div className={cn("surface-card flex min-h-[112px] flex-col p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <span className={cn("grid h-7 w-7 place-items-center rounded-lg", tone === "warning" ? "bg-warning/18 text-[oklch(0.45_0.11_60)]" : "bg-brand-soft text-brand-strong")}><Icon className="h-3.5 w-3.5" /></span>}
      </div>
      {value !== undefined && value !== null ? (
        <p className="money mt-auto pt-3 font-display text-2xl font-semibold tracking-heading text-foreground sm:text-[1.65rem]">{value}</p>
      ) : (
        <p className="mt-auto pt-3 text-sm text-muted-foreground">{empty ?? "Sem dados ainda"}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Estado vazio honesto: diz o que vai aparecer e, se houver, a próxima ação real. */
export function EmptyState({ icon: Icon, title, text, action, className }: {
  icon?: ComponentType<{ className?: string }>; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center", className)}>
      {Icon && <span className="grid h-11 w-11 place-items-center rounded-2xl bg-background-muted text-muted-foreground"><Icon className="h-5 w-5" /></span>}
      <p className="mt-3 font-display text-base font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Moldura de celular para demonstrações de produto (sem imagens pesadas). */
export function PhoneFrame({ children, className, screenClassName }: { children: ReactNode; className?: string; screenClassName?: string }) {
  return (
    <div className={cn("relative rounded-[2.6rem] bg-ink p-[7px] shadow-device", className)}>
      <div className={cn("relative overflow-hidden rounded-[2.2rem] bg-surface text-foreground", screenClassName)}>
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/** Cabeçalho de página interna: título, descrição curta e ações à direita. */
export function PageHeader({ title, description, actions, eyebrow, className }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow tone="muted" className="mb-1.5">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-2xl font-semibold tracking-heading sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Bloco de conteúdo com título opcional. */
export function Panel({ title, description, actions, children, className, bodyClassName }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("surface-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="font-display text-[0.95rem] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
