import { Check, Lock, ShieldCheck } from "lucide-react";
import { PLANS } from "@/lib/tipe/plans";
import { brlCents, dashboard, METHOD_LABEL, reconcile, totalCents } from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { Pill } from "./DemoShell";
import { Avatar, Card, CardHeader, Metric, ShareBar } from "./ui";

/** Visão do backoffice da Tipe sobre o restaurante de demonstração (agregados, sem operar a mesa). */
export function TipeDemo() {
  const { state } = useDemo();
  if (!state) return null;
  const d = dashboard(state);
  const processed = state.payments
    .filter((p) => p.status === "aprovado" && p.method !== "estabelecimento")
    .reduce((s, p) => s + totalCents(p), 0);
  const tipeTipShare = Math.round(d.tips * (1 - state.restaurant.tipShareWaiter));
  const plan = PLANS.find((p) => p.id === "premium")!;
  const { summary } = reconcile(state);
  const issues = summary.valor_divergente + summary.sem_extrato + summary.sem_registro_tipe;
  const methodTotal = d.byMethod.reduce((s, m) => s + m.cents, 0) || 1;
  const share = Math.round(state.restaurant.tipShareWaiter * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Backoffice Tipe · Equipe Tipe
          </p>
          <h1 className="mt-0.5 font-display text-[26px] font-semibold leading-tight tracking-heading">
            Restaurantes na plataforma
          </h1>
        </div>
        <p className="inline-flex max-w-md items-start gap-2 rounded-2xl bg-ink px-4 py-3 text-xs text-white/80">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-brand" />
          Só agregados, com 2FA. Operar a mesa de um restaurante exige um papel dado pelo próprio
          restaurante.
        </p>
      </div>

      <Card className="grid grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: "Volume digital processado",
            value: brlCents(processed),
            sub: "Pix e carteiras, simulados",
          },
          { label: "Gorjetas extras", value: brlCents(d.tips), sub: `${d.payments} pagamentos` },
          {
            label: "Parte Tipe da gorjeta",
            value: brlCents(tipeTipShare),
            sub: `Regra ${share}/${100 - share}`,
          },
          { label: "Restaurantes ativos", value: "1", sub: "Só o de demonstração" },
        ].map((m, i) => (
          <Metric
            key={m.label}
            {...m}
            className={`px-5 py-4 ${i > 0 ? "sm:border-l sm:border-border/70" : ""} ${i % 2 === 1 ? "border-l border-border/70" : ""} ${i > 1 ? "border-t border-border/70 sm:border-t-0" : ""}`}
          />
        ))}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Contas" hint="Situação de cada restaurante" className="pb-3" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="text-left text-[11px] text-muted-foreground">
              <tr className="border-y border-border/70">
                <th className="px-5 py-2.5 font-medium">Restaurante</th>
                <th className="px-5 py-2.5 font-medium">Plano</th>
                <th className="px-5 py-2.5 font-medium">Mesas</th>
                <th className="px-5 py-2.5 font-medium">Conciliação</th>
                <th className="px-5 py-2.5 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-3">
                    <Avatar name={state.restaurant.name} className="h-8 w-8 text-[11px]" />
                    <span>
                      <span className="block font-semibold">{state.restaurant.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {state.restaurant.slug}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3.5">{plan.name}</td>
                <td className="px-5 py-3.5">
                  <span className="money">{state.tables.length}</span> de {plan.maxTables}
                  <span className="mt-1.5 block h-1 w-20 overflow-hidden rounded-full bg-[oklch(0.94_0.006_250)]">
                    <span
                      className="block h-full rounded-full bg-ink"
                      style={{ width: `${(state.tables.length / plan.maxTables) * 100}%` }}
                    />
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {issues ? (
                    <Pill tone="danger">{issues} para conferir</Pill>
                  ) : (
                    <Pill tone="success">Em dia</Pill>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <Pill tone="warning">Demonstração</Pill>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Meios de pagamento" hint="Toda a plataforma, hoje" />
          <div className="space-y-3.5 p-5 pt-4">
            {d.byMethod.map((m) => (
              <ShareBar
                key={m.method}
                label={METHOD_LABEL[m.method]}
                value={brlCents(m.cents)}
                share={m.cents / methodTotal}
                tone="brand"
              />
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title={`Plano ${plan.name}`} hint={`R$ ${plan.price}/mês no lançamento`} />
          <ul className="grid gap-2 p-5 pt-4 text-[13px]">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-soft text-brand-strong">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-muted-foreground">
            Feature flags por plano, cobrança recorrente e incidentes já existem no backoffice real
            (/backoffice); esta tela é a visão de demonstração.
          </p>
        </Card>
      </div>
    </div>
  );
}
