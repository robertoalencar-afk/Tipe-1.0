import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";
import { MascoteVivo } from "@/components/tipe/site/MascoteVivo";

/**
 * Moldura das telas de conta (esqueci a senha, nova senha): lebre ilustrando o momento
 * à esquerda no desktop e no topo no celular, conteúdo à direita.
 */
export function TelaConta({
  lebreAlt,
  balao,
  fundo = "menta",
  children,
}: {
  lebreAlt: string;
  /** Fala curta da lebre, no balão do painel ilustrado. */
  balao: string;
  fundo?: "menta" | "laranja" | "marinho";
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[84rem] gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-6">
        <section
          aria-hidden
          className={cn(
            "relative hidden overflow-hidden rounded-[2rem] lg:flex lg:flex-col lg:items-center lg:justify-center",
            fundo === "menta" &&
              "bg-[radial-gradient(120%_90%_at_50%_100%,var(--brand-primary)_0%,var(--brand-primary-soft)_55%,#fff_100%)]",
            fundo === "laranja" &&
              "bg-[radial-gradient(120%_90%_at_50%_100%,oklch(0.83_0.13_60)_0%,oklch(0.96_0.04_70)_55%,#fff_100%)]",
            fundo === "marinho" &&
              "bg-[radial-gradient(120%_90%_at_50%_100%,var(--brand-secondary-soft)_0%,var(--brand-secondary)_70%)]",
          )}
        >
          <Confete escuro={fundo === "marinho"} />
          <div className="relative flex flex-col items-center">
            <p
              className={cn(
                "relative mb-6 max-w-[19rem] rounded-[1.4rem] px-5 py-3 text-center text-[1.05rem] font-medium leading-snug shadow-[0_10px_30px_-12px_rgb(15_23_42/0.35)]",
                fundo === "marinho"
                  ? "bg-white text-[var(--brand-secondary)]"
                  : "bg-white text-foreground",
                "after:absolute after:-bottom-2 after:left-1/2 after:h-4 after:w-4 after:-translate-x-1/2 after:rotate-45 after:bg-white",
              )}
            >
              {balao}
            </p>
            <MascoteVivo className="tipe-lebre-flutua w-[min(24rem,44vh)] drop-shadow-[0_24px_30px_rgb(15_23_42/0.18)]" />
          </div>
          <ul
            className={cn(
              "absolute inset-x-6 bottom-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.8rem] font-medium",
              fundo === "marinho" ? "text-white/80" : "text-[var(--brand-secondary)]/75",
            )}
          >
            <li className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Link de uso único
            </li>
            <li className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" /> Vale por 1 hora
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão protegida
            </li>
          </ul>
        </section>

        <section className="flex flex-col">
          <Link to="/" aria-label="TIPE, voltar ao site" className="w-fit pt-2">
            <TipeLogo variant="dark" className="h-9" />
          </Link>
          <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
            <div
              className={cn(
                "mb-6 grid h-28 w-28 place-items-center rounded-full lg:hidden",
                fundo === "laranja"
                  ? "bg-[oklch(0.95_0.05_70)]"
                  : fundo === "marinho"
                    ? "bg-[var(--brand-secondary)]"
                    : "bg-[var(--brand-primary-soft)]",
              )}
            >
              <MascoteVivo alt={lebreAlt} className="w-24" />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

/** Pontinhos coloridos de fundo, nas cores da marca. */
function Confete({ escuro }: { escuro: boolean }) {
  const pontos = [
    [12, 18, 10, "var(--brand-primary)"],
    [82, 14, 14, "oklch(0.8 0.14 65)"],
    [20, 62, 8, "var(--brand-secondary)"],
    [88, 52, 9, "var(--brand-primary)"],
    [8, 40, 6, "oklch(0.8 0.14 65)"],
    [70, 30, 6, "var(--brand-secondary)"],
    [30, 10, 6, "oklch(0.8 0.14 65)"],
  ] as const;
  return (
    <>
      {pontos.map(([x, y, s, c], i) => (
        <span
          key={i}
          className={cn("absolute rounded-full", escuro ? "opacity-60" : "opacity-80")}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: s,
            height: s,
            background: escuro && c === "var(--brand-secondary)" ? "#fff" : c,
          }}
        />
      ))}
    </>
  );
}

/** Título + texto padrão das telas de conta. */
export function CabecalhoConta({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <>
      <h1 className="text-[clamp(2rem,1.5rem+2vw,2.9rem)] font-medium leading-[1.04] tracking-[-0.04em]">
        {titulo}
      </h1>
      {children && (
        <div className="mt-3 text-[1.02rem] leading-relaxed text-muted-foreground">{children}</div>
      )}
    </>
  );
}
