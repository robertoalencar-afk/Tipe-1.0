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
import logo from "@/assets/marca/tipe-logo.svg";
import { resetDemo } from "@/lib/tipe/demo/store";
import type { Role } from "@/lib/tipe/demo/engine";
import { cn } from "@/lib/utils";

export const ROLES: { id: Role; label: string; who: string; icon: typeof UserRound }[] = [
  { id: "cliente", label: "Cliente", who: "Pede pelo celular, divide e paga", icon: Smartphone },
  { id: "garcom", label: "Garçom", who: "Mesas, avisos e pedidos na mão", icon: Bell },
  { id: "cozinha", label: "Cozinha", who: "Fila de preparo por estação", icon: ChefHat },
  {
    id: "gerente",
    label: "Gerente",
    who: "Indicadores, salão e conciliação",
    icon: LayoutDashboard,
  },
  { id: "tipe", label: "Tipe", who: "Backoffice da plataforma", icon: ShieldCheck },
];

/** Animações próprias da demonstração (sem mexer no CSS global, que outros PRs editam). */
const DEMO_CSS = `
@keyframes demo-sheet-in { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes demo-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes demo-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
@keyframes demo-step { from { transform: translateX(12px); opacity: 0 } to { transform: none; opacity: 1 } }
.demo-sheet { animation: demo-sheet-in 280ms cubic-bezier(.22,1,.36,1) both }
.demo-fade { animation: demo-fade-in 200ms ease-out both }
.demo-pop { animation: demo-pop 520ms cubic-bezier(.22,1,.36,1) both }
.demo-step { animation: demo-step 260ms cubic-bezier(.22,1,.36,1) both }
.demo-scroll { scrollbar-width: none } .demo-scroll::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) { .demo-sheet, .demo-fade, .demo-pop, .demo-step { animation: none } }
`;

/** Moldura comum: marca Tipe, selo de dados fictícios sempre visível e troca de perfil. */
export function DemoShell({
  role,
  children,
  width = "md",
}: {
  role: Role | null;
  children: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  return (
    <div className="min-h-screen bg-[oklch(0.975_0.004_250)] text-foreground">
      <style>{DEMO_CSS}</style>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to="/demo" className="shrink-0" aria-label="Tipe, início da demonstração">
            <img src={logo} alt="Tipe" width={462} height={141} className="h-[22px] w-auto" />
          </Link>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[oklch(0.96_0.06_85)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.42_0.1_60)]"
            title="Restaurante, pessoas e pagamentos fictícios. Nenhum valor real é cobrado."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.15_65)]" aria-hidden />
            Demonstração
          </span>
          <nav
            aria-label="Perfis da demonstração"
            className="ml-auto hidden items-center gap-0.5 rounded-full bg-[oklch(0.95_0.005_250)] p-0.5 md:flex"
          >
            {ROLES.map((r) => (
              <RoleLink key={r.id} r={r} active={role === r.id} />
            ))}
          </nav>
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
            className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-[oklch(0.95_0.005_250)] hover:text-foreground md:ml-0"
            title="Recomeçar a demonstração"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">Recomeçar</span>
          </button>
        </div>
        <nav
          aria-label="Perfis da demonstração"
          className="demo-scroll flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-1.5 md:hidden"
        >
          {ROLES.map((r) => (
            <RoleLink key={r.id} r={r} active={role === r.id} />
          ))}
        </nav>
      </header>
      <main
        className={cn(
          "mx-auto px-4 pb-16 pt-5 sm:pt-8",
          width === "md" && "max-w-md",
          width === "lg" && "max-w-5xl",
          width === "xl" && "max-w-7xl",
        )}
      >
        {children}
      </main>
      <p className="pb-8 text-center text-[11px] text-muted-foreground">
        Demonstração com restaurante, pessoas e pagamentos fictícios. Nenhum valor real é cobrado.
      </p>
    </div>
  );
}

function RoleLink({ r, active }: { r: (typeof ROLES)[number]; active: boolean }) {
  return (
    <Link
      to="/demo"
      search={{ papel: r.id }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
        active
          ? "bg-ink text-white shadow-sm"
          : "text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      <r.icon className="h-3.5 w-3.5" aria-hidden /> {r.label}
    </Link>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "warning" | "success" | "danger";
  className?: string;
}) {
  const cls = {
    neutral: "bg-[oklch(0.95_0.005_250)] text-muted-foreground",
    brand: "bg-brand-soft text-brand-strong",
    warning: "bg-warning/18 text-[oklch(0.45_0.11_60)]",
    success: "bg-success/14 text-[oklch(0.42_0.12_150)]",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cls,
        className,
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
