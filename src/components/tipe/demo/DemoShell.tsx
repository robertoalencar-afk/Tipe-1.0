import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChefHat,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { resetDemo } from "@/lib/tipe/demo/store";
import type { Role } from "@/lib/tipe/demo/engine";
import { cn } from "@/lib/utils";

export const ROLES: { id: Role; label: string; who: string; icon: typeof UserRound }[] = [
  { id: "cliente", label: "Cliente", who: "Escaneia o QR, pede e paga", icon: Smartphone },
  { id: "garcom", label: "Garçom", who: "Ana Souza, mesas pares e ímpares", icon: Bell },
  { id: "cozinha", label: "Cozinha", who: "Fila de preparo por estação", icon: ChefHat },
  {
    id: "gerente",
    label: "Gerente",
    who: "Operação, indicadores e conciliação",
    icon: LayoutDashboard,
  },
  { id: "tipe", label: "Tipe", who: "Backoffice da plataforma", icon: ShieldCheck },
];

/** Moldura comum: aviso de dados fictícios sempre visível e troca de perfil. */
export function DemoShell({
  role,
  children,
  wide = false,
}: {
  role: Role | null;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background-muted">
      <div className="sticky top-0 z-40 border-b border-warning/40 bg-[oklch(0.97_0.05_85)] text-[oklch(0.35_0.08_60)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs sm:text-sm">
          <span className="rounded-full bg-[oklch(0.35_0.08_60)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Demonstração
          </span>
          <p className="min-w-0 flex-1 truncate">
            Restaurante, pessoas e pagamentos fictícios. Nenhum valor real é cobrado.
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Recomeçar a demonstração do zero? Pedidos e pagamentos simulados serão apagados.",
                )
              )
                void resetDemo();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-semibold hover:bg-black/5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />{" "}
            <span className="hidden sm:inline">Recomeçar</span>
          </button>
        </div>
      </div>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5">
          <Link
            to="/demo"
            className="mr-2 shrink-0 font-display text-lg font-bold tracking-heading text-ink"
          >
            tipe<span className="text-brand">.</span>{" "}
            <span className="text-sm font-medium text-muted-foreground">2.0</span>
          </Link>
          <nav aria-label="Perfis da demonstração" className="flex gap-1">
            {ROLES.map((r) => (
              <Link
                key={r.id}
                to="/demo"
                search={{ papel: r.id }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                  role === r.id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={role === r.id ? "page" : undefined}
              >
                <r.icon className="h-4 w-4" aria-hidden /> {r.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto px-4 py-6", wide ? "max-w-7xl" : "max-w-md")}>{children}</main>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "warning" | "success" | "danger";
}) {
  const cls = {
    neutral: "bg-muted text-muted-foreground",
    brand: "bg-brand-soft text-brand-strong",
    warning: "bg-warning/20 text-[oklch(0.45_0.11_60)]",
    success: "bg-success/15 text-[oklch(0.42_0.12_150)]",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

export function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}
