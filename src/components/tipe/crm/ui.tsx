import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Priority, User } from "@/lib/tipe/crm/types";

// Kit visual do CRM da Tipe: a mesma marca do site e do painel do restaurante. Cartões brancos
// de cantos generosos, turquesa como destaque, azul-marinho para texto e seleção, números
// tabulares e cores semânticas só onde há significado.

export const brl = (n: number, digits = 0) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
export const brlShort = (n: number) =>
  Math.abs(n) >= 1000
    ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : brl(n);
export const dateBR = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
export const timeBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const dateTimeBR = (iso: string) => `${dateShort(iso)}, ${timeBR(iso)}`;

export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const fmt = (v: number, u: string) => (diff < 0 ? `há ${v} ${u}` : `em ${v} ${u}`);
  if (m < 1) return "agora";
  if (m < 60) return fmt(m, "min");
  const h = Math.round(m / 60);
  if (h < 24) return fmt(h, h === 1 ? "hora" : "horas");
  const d = Math.round(h / 24);
  if (d < 31) return fmt(d, d === 1 ? "dia" : "dias");
  return dateBR(iso);
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const AVATAR_TONES = [
  "bg-[oklch(0.42_0.08_190)]",
  "bg-[oklch(0.42_0.09_250)]",
  "bg-[oklch(0.45_0.08_160)]",
  "bg-[oklch(0.45_0.08_70)]",
  "bg-[oklch(0.4_0.06_290)]",
  "bg-[oklch(0.42_0.05_220)]",
];

export function Avatar({ name, className }: { name: string; className?: string | undefined }) {
  const tone =
    AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold text-white",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function UserChip({
  user,
  className,
}: {
  user?: Pick<User, "name"> | undefined;
  className?: string | undefined;
}) {
  if (!user) return <span className="text-xs text-muted-foreground">Sem responsável</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Avatar name={user.name} className="h-5 w-5 text-[0.55rem]" />
      <span className="truncate text-xs">{user.name.split(" ")[0]}</span>
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  eyebrow?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 font-display text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <section className={cn("crm-panel min-w-0", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-[0.95rem] font-semibold tracking-tight">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn(title || actions ? "px-5 pb-5 pt-3" : "p-5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  tone = "default",
  help,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string | undefined;
  delta?: { value: number; good: boolean } | null;
  tone?: "default" | "warning" | "danger" | "success" | undefined;
  help?: string | undefined;
}) {
  const toneCls =
    tone === "warning"
      ? "text-warning"
      : tone === "danger"
        ? "text-destructive"
        : tone === "success"
          ? "text-success"
          : "text-primary";
  return (
    <div className="crm-panel flex min-w-0 flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", toneCls)} aria-hidden />
          <span className="truncate" title={label}>
            {label}
          </span>
        </span>
        {help && <Hint text={help} />}
      </div>
      <div className="money font-display text-[1.6rem] font-semibold leading-none tracking-tight">
        {value}
      </div>
      <div className="flex min-h-4 items-center gap-2 text-[0.7rem] text-muted-foreground">
        {delta && <DeltaBadge value={delta.value} good={delta.good} />}
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  );
}

/** Selo de variação, como no painel: verde quando melhora, vermelho quando piora. */
export function DeltaBadge({ value, good }: { value: number; good: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[1.15rem] items-center rounded-full px-1.5 text-[0.65rem] font-bold tabular-nums",
        value === 0
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-success text-success-foreground"
            : "bg-destructive text-destructive-foreground",
      )}
    >
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value)}%
    </span>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded text-muted-foreground/70 hover:text-foreground"
          aria-label={text}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 bg-popover text-popover-foreground ring-1 ring-border">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-56 bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 bg-muted" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <Skeleton className="h-72 bg-muted xl:col-span-2" />
        <Skeleton className="h-72 bg-muted" />
      </div>
    </div>
  );
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/18 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/15 text-info",
};
export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[0.68rem] font-semibold",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};
export function PriorityPill({ p }: { p: Priority }) {
  return (
    <Pill tone={p === "alta" ? "danger" : p === "media" ? "warning" : "neutral"}>
      {PRIORITY_LABEL[p]}
    </Pill>
  );
}

export const Btn = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(function Btn(
  { className, size = "sm", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      className={cn("rounded-full", size === "sm" && "h-8 px-3.5 text-xs", className)}
      {...props}
    />
  );
});

export function IconBtn({
  label,
  icon: Icon,
  onClick,
  className,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
            className,
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-popover text-popover-foreground ring-1 ring-border">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const FIELD =
  "h-9 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string | undefined;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={cn(FIELD, "h-auto min-h-20 py-2", className)} {...props} />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        FIELD,
        "appearance-none bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat pr-8",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="crm-panel max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Manter</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "rounded-full",
              destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Progress({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number;
  tone?: "primary" | "success" | "warning" | undefined;
  className?: string | undefined;
  label?: string | undefined;
}) {
  const bar = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", bar)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex h-8 items-center rounded-full border border-border bg-card p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-full rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            value === o.value &&
              "bg-secondary text-secondary-foreground hover:text-secondary-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string | undefined;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(FIELD, "pl-8")}
      />
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2 text-xs text-info">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export const chartTooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 12px 32px -16px oklch(0.2 0.04 250 / 0.3)",
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", padding: 0 },
  cursor: { fill: "oklch(0.2 0.04 250 / 0.04)" },
};
export const axis = {
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  stroke: "var(--muted-foreground)",
} as const;

export function NoAccessInline({ text }: { text: string }) {
  return <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{text}</p>;
}
