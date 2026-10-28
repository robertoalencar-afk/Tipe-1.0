/**
 * Peças visuais da demonstração. Mesma linguagem em todos os perfis: superfícies brancas
 * sobre cinza muito claro, azul-marinho para navegação e seleção, turquesa só para dinheiro
 * entrando (pagar, pago, progresso da conta). Valores sempre com algarismos tabulares.
 */
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-2xl border border-border/70 bg-surface shadow-[0_1px_2px_oklch(0.2_0.04_250/0.04)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-3 px-5 pt-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

/** Controle segmentado (abas). `role="tab"` para leitores de tela e para os testes. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  tone = "light",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; badge?: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex gap-0.5 rounded-full p-0.5",
        tone === "dark" ? "bg-white/8" : "bg-[oklch(0.94_0.006_250)]",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,box-shadow] duration-200",
            size === "sm" ? "h-7 px-3 text-xs" : "h-9 px-4 text-[13px]",
            value === o.id
              ? tone === "dark"
                ? "bg-white text-ink"
                : "bg-surface text-foreground shadow-[0_1px_3px_oklch(0.2_0.04_250/0.12)]"
              : tone === "dark"
                ? "text-white/60 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.badge}
        </button>
      ))}
    </div>
  );
}

/** Iniciais num círculo: pessoas e o restaurante, sem foto inventada. */
export function Avatar({
  name,
  className,
  tone = "ink",
}: {
  name: string;
  className?: string;
  tone?: "ink" | "brand" | "muted";
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
        tone === "ink" && "bg-ink text-white",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        tone === "muted" && "bg-[oklch(0.94_0.006_250)] text-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export type DotTone = "neutral" | "brand" | "warning" | "success" | "danger" | "info";
const DOT: Record<DotTone, string> = {
  neutral: "bg-muted-foreground/40",
  brand: "bg-brand",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
  info: "bg-info",
};
export const Dot = ({ tone, className }: { tone: DotTone; className?: string }) => (
  <span
    aria-hidden
    className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone], className)}
  />
);

/** Folha que sobe do rodapé no celular e vira painel centralizado no computador. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="demo-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div className="demo-sheet relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[28px] bg-surface shadow-[0_-12px_40px_oklch(0.2_0.04_250/0.18)] sm:rounded-[28px]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 px-5 pb-2 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[oklch(0.95_0.005_250)] text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-border/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Botão principal em pílula. `pay` = turquesa (dinheiro), `ink` = seguir/confirmar. */
export function PrimaryButton({
  children,
  tone = "ink",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ink" | "pay" | "light" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[transform,background-color,opacity] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35",
        tone === "ink" && "bg-ink text-white hover:bg-ink-soft",
        tone === "pay" && "bg-brand text-ink hover:bg-[oklch(0.73_0.14_178)]",
        tone === "light" &&
          "bg-[oklch(0.95_0.005_250)] text-foreground hover:bg-[oklch(0.92_0.006_250)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Indicador compacto: rótulo pequeno, número grande, contexto em uma linha. */
export function Metric({
  label,
  value,
  sub,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="money mt-1 truncate font-display text-[22px] font-semibold leading-none tracking-heading">
        {value}
      </p>
      {sub && <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * Barras verticais de uma série só (sem legenda: o título nomeia a série). Passar o mouse
 * ou tocar mostra o valor; a tabela escondida dá o mesmo dado a quem usa leitor de tela.
 */
export function BarChart({
  data,
  format,
  label,
  height = 168,
}: {
  data: { key: string; label: string; value: number; detail?: string }[];
  format: (v: number) => string;
  label: string;
  height?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks.at(-1)!;
  return (
    <figure className="relative">
      <div className="flex gap-3" style={{ height }}>
        <div
          className="flex flex-col-reverse justify-between pb-6 text-right text-[10px] text-muted-foreground"
          aria-hidden
        >
          {ticks.map((t) => (
            <span key={t} className="money -translate-y-1/2 leading-none first:translate-y-0">
              {format(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col-reverse justify-between"
            aria-hidden
          >
            {ticks.map((t) => (
              <span key={t} className="h-px bg-border/70" />
            ))}
          </div>
          <div
            className="absolute inset-0 flex items-end gap-[6%] px-1"
            role="img"
            aria-label={label}
          >
            {data.map((d) => (
              <div
                key={d.key}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setHover(d.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === d.key ? null : d.key)}
              >
                <div className="flex w-full flex-1 items-end justify-center pb-0">
                  <div
                    className={cn(
                      "w-full max-w-9 rounded-t-[4px] transition-[height,background-color] duration-500 ease-out",
                      hover && hover !== d.key ? "bg-brand/45" : "bg-brand",
                    )}
                    style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 3 : 0 }}
                  />
                </div>
                <span className="mt-2 h-4 text-[10px] text-muted-foreground">{d.label}</span>
                {hover === d.key && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                    <span className="block font-semibold">
                      {d.label} · <span className="money">{format(d.value)}</span>
                    </span>
                    {d.detail && <span className="block text-white/65">{d.detail}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceTicks(max: number) {
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Barra horizontal fina com rótulo e valor: participação de cada parte no todo. */
export function ShareBar({
  label,
  value,
  share,
  tone = "ink",
}: {
  label: ReactNode;
  value: ReactNode;
  share: number;
  tone?: "ink" | "brand";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="money shrink-0 font-medium">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[oklch(0.94_0.006_250)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "ink" ? "bg-ink" : "bg-brand",
          )}
          style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
        />
      </div>
    </div>
  );
}

export const shortBrl = (cents: number) =>
  cents >= 100_000
    ? `R$ ${(cents / 100_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;

export const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
