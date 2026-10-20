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
      { title: "Demonstração Tipe 2.0" },
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
  ["Cliente", "Escaneia a mesa 1, pede pelo cardápio (escolha um lugar para cada prato)"],
  ["Cozinha", "Começa e finaliza o preparo; o garçom recebe o aviso"],
  ["Garçom", "Serve o prato e lança mais um pedido na mesma conta"],
  ["Cliente", "Abre a conta, divide (partes iguais, itens ou lugar), escolhe gorjeta e paga"],
  ["Cliente", "Recebe o comprovante e avalia o atendimento"],
  ["Gerente", "Vê indicadores, aprova estorno e confere a conciliação"],
  ["Tipe", "Acompanha o restaurante no backoffice"],
] as const;

function DemoPage() {
  const { papel, mesa } = Route.useSearch();
  const navigate = useNavigate({ from: "/demo" });
  const wide = papel === "cozinha" || papel === "gerente" || papel === "tipe";

  return (
    <DemoShell role={papel ?? null} wide={wide || !papel}>
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
      {!papel && (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-brand-strong">Tipe 2.0</p>
            <h1 className="mt-3 font-display text-headline font-semibold tracking-display text-balance">
              Um restaurante inteiro para você testar
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Do QR Code na mesa à conciliação do caixa. Abra cada perfil numa aba diferente: o que
              um faz aparece para os outros na hora.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <Link
                  key={r.id}
                  to="/demo"
                  search={{ papel: r.id }}
                  className="surface-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                    <r.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.who}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </div>
          <ol className="surface-card space-y-3 p-5">
            <li className="text-sm font-semibold">Jornada sugerida</li>
            {JOURNEY.map(([who, what], i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <b>{who}:</b> {what}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </DemoShell>
  );
}
