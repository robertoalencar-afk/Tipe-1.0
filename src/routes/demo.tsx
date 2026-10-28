import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { ClienteDemo } from "@/components/tipe/demo/ClienteDemo";
import { CozinhaDemo } from "@/components/tipe/demo/CozinhaDemo";
import { DemoShell, ROLES } from "@/components/tipe/demo/DemoShell";
import { GarcomDemo } from "@/components/tipe/demo/GarcomDemo";
import { GerenteDemo } from "@/components/tipe/demo/GerenteDemo";
import { TipeDemo } from "@/components/tipe/demo/TipeDemo";

const searchSchema = z.object({
  papel: z.enum(["cliente", "garcom", "cozinha", "gerente", "tipe"]).optional(),
  mesa: z.coerce.number().int().min(1).max(99).optional(),
});

export const Route = createFileRoute("/demo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Demonstração · Tipe" },
      {
        name: "description",
        content:
          "Navegue pela Tipe como cliente, garçom, cozinha, gerente e equipe Tipe num restaurante fictício.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

const JOURNEY = [
  ["Cliente", "Abre a mesa 1 e pede pelo cardápio, escolhendo o lugar de cada prato"],
  ["Cozinha", "Começa e finaliza o preparo; o garçom recebe o aviso"],
  ["Garçom", "Serve o prato e lança mais um pedido na mesma conta"],
  ["Cliente", "Divide a conta, escolhe a gorjeta e paga"],
  ["Cliente", "Recebe o comprovante e avalia o atendimento"],
  ["Gerente", "Vê indicadores, aprova estorno e confere a conciliação"],
  ["Tipe", "Acompanha o restaurante no backoffice"],
] as const;

function DemoPage() {
  const { papel, mesa } = Route.useSearch();
  const navigate = useNavigate({ from: "/demo" });
  const width = papel === "cliente" ? "md" : papel === "garcom" || !papel ? "lg" : "xl";

  return (
    <DemoShell role={papel ?? null} width={width}>
      {papel === "cliente" && (
        <ClienteDemo
          mesa={mesa ?? null}
          onMesa={(n) => void navigate({ search: { papel: "cliente", ...(n ? { mesa: n } : {}) } })}
        />
      )}
      {papel === "garcom" && <GarcomDemo />}
      {papel === "cozinha" && <CozinhaDemo />}
      {papel === "gerente" && <GerenteDemo />}
      {papel === "tipe" && <TipeDemo />}
      {!papel && <Home />}
    </DemoShell>
  );
}

function Home() {
  return (
    <div className="demo-step">
      <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="pt-2">
          <p className="text-[13px] font-semibold text-brand-strong">
            Bistrô da Lebre, um restaurante fictício
          </p>
          <h1 className="mt-3 max-w-[14ch] font-display text-[clamp(2.1rem,1.4rem+2.6vw,3.25rem)] font-semibold leading-[1.04] tracking-display text-balance">
            Um restaurante inteiro para você testar
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Do QR Code na mesa à conciliação do caixa. Abra cada perfil numa aba: o que um faz
            aparece para os outros na hora.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              to="/demo"
              search={{ papel: "cliente", mesa: 1 }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white transition hover:bg-ink-soft"
            >
              Sentar na mesa 1 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/demo"
              search={{ papel: "gerente" }}
              className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-5 text-[14px] font-semibold transition hover:border-ink/30"
            >
              Ver o painel do gerente
            </Link>
          </div>
        </div>
        <ol className="rounded-3xl border border-border/70 bg-surface p-6">
          <li className="mb-4 font-display text-[15px] font-semibold">Jornada sugerida</li>
          {JOURNEY.map(([who, what], i) => (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < JOURNEY.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-border"
                />
              )}
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="text-[13px] leading-snug">
                <b className="font-semibold">{who}</b>
                <span className="block text-muted-foreground">{what}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((r) => (
          <Link
            key={r.id}
            to="/demo"
            search={{ papel: r.id }}
            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4 transition hover:border-ink/25 hover:shadow-[0_10px_30px_-18px_oklch(0.2_0.04_250/0.45)] lg:flex-col lg:items-start"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
              <r.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.who}</span>
            </span>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 lg:hidden"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
