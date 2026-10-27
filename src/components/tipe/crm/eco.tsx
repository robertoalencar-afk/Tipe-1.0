import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ACCOUNT_STATUS, type Health, type JourneyStep } from "@/lib/tipe/crm/ecosystem";
import type { AccountStatus } from "@/lib/tipe/crm/types";
import logoNavy from "@/assets/marca/tipe-logo.svg";
import { dateBR, Pill } from "./ui";

/**
 * Logo oficial da Tipe (texto azul-marinho, para fundo claro), vetorizado sem redesenho a partir
 * do arquivo oficial e guardado no repositório: funciona fora do Lovable (testes, Cloudflare).
 */
export function CrmLogo({ className }: { className?: string | undefined }) {
  return <img src={logoNavy} alt="Tipe" className={cn("h-6 w-auto", className)} />;
}

// Peças visuais do ecossistema (camadas A, B e C) usadas no painel, nas contas e nos clientes.

export const LAYER: Record<"A" | "B" | "C", { name: string; short: string; cls: string }> = {
  A: { name: "Comercial", short: "A", cls: "bg-secondary text-secondary-foreground" },
  B: { name: "Restaurante", short: "B", cls: "bg-primary text-primary-foreground" },
  C: { name: "Clientes", short: "C", cls: "bg-highlight text-highlight-foreground" },
};

export function LayerTag({ layer, withName }: { layer: "A" | "B" | "C"; withName?: boolean }) {
  const l = LAYER[layer];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full font-display text-[0.6rem] font-bold",
          l.cls,
        )}
        aria-label={`Camada ${layer}: ${l.name}`}
      >
        {l.short}
      </span>
      {withName && <span className="text-xs font-medium text-muted-foreground">{l.name}</span>}
    </span>
  );
}

/** Camada de uma atividade, pelo prefixo do tipo de evento. */
export function layerOf(kind: string): "A" | "B" | "C" {
  if (kind.startsWith("account") || kind.startsWith("ticket")) return "B";
  if (kind.startsWith("visit") || kind.startsWith("campaign")) return "C";
  return "A";
}

export function HealthPill({ h }: { h: Health }) {
  return (
    <Pill tone={h.tone === "neutral" ? "neutral" : h.tone}>
      {h.label}
      {h.score !== null && <span className="tabular-nums opacity-80">· {h.score}</span>}
    </Pill>
  );
}

export function AccountStatusPill({ status }: { status: AccountStatus }) {
  const st = ACCOUNT_STATUS[status];
  return <Pill tone={st.tone}>{st.label}</Pill>;
}

/** Medidor em meia-lua, como no painel de referência, com a cor da marca. */
export function Gauge({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string | undefined;
}) {
  const v = Math.max(0, Math.min(100, value));
  const angle = -90 + v * 1.8;
  return (
    <svg
      viewBox="0 0 200 112"
      className={cn("w-full", className)}
      role="img"
      aria-label={`${label}: ${Math.round(v)} de 100`}
    >
      <defs>
        <linearGradient id="gauge-fill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand-primary)" />
        </linearGradient>
      </defs>
      <path
        d="M 16 100 A 84 84 0 0 1 184 100"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 16 100 A 84 84 0 0 1 184 100"
        fill="none"
        stroke="url(#gauge-fill)"
        strokeWidth="22"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${v} 100`}
      />
      <g transform={`rotate(${angle} 100 100)`}>
        <path d="M 100 38 L 109 100 L 91 100 Z" fill="var(--foreground)" />
      </g>
      <circle cx="100" cy="100" r="9" fill="var(--foreground)" />
      <circle cx="100" cy="100" r="3.5" fill="var(--card)" />
    </svg>
  );
}

/** Linha do tempo da jornada: lead → negócio → conta → contas pagas pelos clientes. */
export function JourneyTimeline({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="relative space-y-3 pl-1">
      <span aria-hidden className="absolute bottom-2 left-[0.9rem] top-2 w-px bg-border" />
      {steps.map((st, i) => (
        <li key={`${st.label}-${i}`} className="relative flex gap-3">
          <LayerTag layer={st.layer} />
          <div className="min-w-0 flex-1 rounded-xl px-1">
            <p className="text-sm font-medium leading-tight">
              {st.href ? (
                <Link
                  to={st.href.split("?")[0] ?? st.href}
                  search={
                    Object.fromEntries(new URLSearchParams(st.href.split("?")[1] ?? "")) as never
                  }
                  className="hover:underline"
                >
                  {st.label}
                </Link>
              ) : (
                st.label
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {st.at ? dateBR(st.at) : ""}
              {st.detail ? ` · ${st.detail}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Contador redondo com selo, como os atalhos de integrações do painel de referência. */
export function CountChip({
  icon,
  label,
  count,
  to,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      aria-label={`${label}: ${count}`}
      title={label}
      className="relative grid h-12 w-12 place-items-center rounded-full bg-card text-foreground ring-1 ring-border transition-colors hover:bg-muted"
    >
      {icon}
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-destructive-foreground ring-2 ring-card">
          {count}
        </span>
      )}
    </Link>
  );
}
