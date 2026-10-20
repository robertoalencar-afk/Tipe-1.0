import { StatCard } from "@/components/tipe/ds";
import { PLANS } from "@/lib/tipe/plans";
import { brlCents, dashboard, totalCents } from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { Pill } from "./DemoShell";

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
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Backoffice Tipe · Equipe Tipe</p>
        <h1 className="font-display text-2xl font-semibold tracking-heading">
          Restaurantes na plataforma
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Na Tipe real, o backoffice vê só agregados e exige 2FA. O acesso à operação do restaurante
          depende de um papel dado pelo próprio restaurante.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Volume digital processado"
          value={brlCents(processed)}
          hint="Pix e carteiras, simulados"
        />
        <StatCard label="Gorjetas no período" value={brlCents(d.tips)} />
        <StatCard
          label="Parte Tipe da gorjeta extra"
          value={brlCents(tipeTipShare)}
          hint={`Regra ${Math.round(state.restaurant.tipShareWaiter * 100)}/${Math.round((1 - state.restaurant.tipShareWaiter) * 100)}`}
        />
        <StatCard label="Restaurantes ativos" value="1" hint="só o de demonstração" />
      </div>
      <section className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Restaurante</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Mesas</th>
              <th className="p-3">Meios ativos</th>
              <th className="p-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-3 font-medium">
                {state.restaurant.name}
                <p className="text-xs text-muted-foreground">{state.restaurant.slug}</p>
              </td>
              <td className="p-3">{plan.name}</td>
              <td className="p-3">
                {state.tables.length} de {plan.maxTables}
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  <Pill>Pix</Pill>
                  <Pill>Apple Pay</Pill>
                  <Pill>Google Pay</Pill>
                  <Pill>No local</Pill>
                </div>
              </td>
              <td className="p-3">
                <Pill tone="warning">Demonstração</Pill>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className="surface-card p-4">
        <h2 className="text-sm font-semibold">Recursos do plano {plan.name}</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {plan.features.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Feature flags por plano, cobrança recorrente e incidentes já existem no backoffice real
          (/backoffice); esta tela é só a visão de demonstração.
        </p>
      </section>
    </div>
  );
}
