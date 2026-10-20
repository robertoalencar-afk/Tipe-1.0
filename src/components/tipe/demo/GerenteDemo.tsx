import { Download, Scale, Star } from "lucide-react";
import { useState } from "react";
import { StatCard } from "@/components/tipe/ds";
import { Button } from "@/components/ui/button";
import {
  brlCents,
  dashboard,
  METHOD_LABEL,
  reconcile,
  tableView,
  totalCents,
  type DemoState,
  type ReconRow,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { Alerts } from "./GarcomDemo";
import { Pill } from "./DemoShell";

type Tab = "agora" | "salao" | "pagamentos" | "equipe" | "conciliacao";
const TABS: [Tab, string][] = [
  ["agora", "Agora"],
  ["salao", "Salão"],
  ["pagamentos", "Pagamentos"],
  ["equipe", "Equipe"],
  ["conciliacao", "Conciliação"],
];

export function GerenteDemo() {
  const { state } = useDemo();
  const [tab, setTab] = useState<Tab>("agora");
  if (!state) return null;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {state.restaurant.name} · Carla Mendes (gerente)
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-heading">
            Painel do restaurante
          </h1>
        </div>
        <div
          className="flex gap-1 overflow-x-auto rounded-full bg-surface p-1 shadow-xs"
          role="tablist"
        >
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
                tab === id ? "bg-ink text-white" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "agora" && <Agora state={state} />}
      {tab === "salao" && <Salao state={state} />}
      {tab === "pagamentos" && <Pagamentos state={state} />}
      {tab === "equipe" && <Equipe state={state} />}
      {tab === "conciliacao" && <Conciliacao state={state} />}
    </div>
  );
}

function Agora({ state }: { state: DemoState }) {
  const { run } = useDemo();
  const d = dashboard(state);
  const refunds = state.payments.filter((p) => p.status === "aprovado" && p.refundRequestedBy);
  const max = Math.max(1, ...d.byHour.map((h) => h.orders));
  const maxItem = Math.max(1, ...d.topItems.map((i) => i.cents));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Faturamento (itens + serviço)"
          value={brlCents(d.revenue)}
          hint={`${d.payments} pagamentos aprovados`}
        />
        <StatCard
          label="Ticket médio por conta"
          value={brlCents(d.avgTicket)}
          hint={`${d.tablesServed} contas`}
        />
        <StatCard
          label="Em aberto agora"
          value={brlCents(d.openBalance)}
          hint={`${d.openTables} mesas abertas`}
        />
        <StatCard
          label="Gorjetas"
          value={brlCents(d.tips)}
          hint={
            d.avgRating
              ? `Nota média ${d.avgRating.toFixed(1).replace(".", ",")}`
              : "Sem avaliações"
          }
        />
      </div>
      {refunds.length > 0 && (
        <section className="surface-card p-4">
          <h2 className="text-sm font-semibold">Estornos esperando sua aprovação</h2>
          {refunds.map((p) => (
            <div key={p.id} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex-1">
                Mesa {p.table} · {p.payer} · {brlCents(totalCents(p))} · “{p.refundReason}” (
                {state.staff.find((s) => s.id === p.refundRequestedBy)?.name})
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  run({ type: "approveRefund", actor: "gerente", paymentId: p.id, at: Date.now() })
                }
              >
                Aprovar estorno
              </Button>
            </div>
          ))}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Na conta real, o estorno é feito no provedor de pagamento e não reabre os itens da mesa.
          </p>
        </section>
      )}
      <Alerts state={state} ids={state.alerts.filter((a) => a.to === "gerente").map((a) => a.id)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Pedidos por horário</h2>
          <div className="flex h-36 items-end gap-2" role="img" aria-label="Pedidos por hora">
            {d.byHour.map((h) => (
              <div
                key={h.hour}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-[11px] font-semibold">{h.orders}</span>
                <div
                  className="w-full max-w-12 rounded-t-md bg-brand"
                  style={{ height: `${Math.max(6, (h.orders / max) * 75)}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{h.hour}h</span>
              </div>
            ))}
          </div>
        </section>
        <section className="surface-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Mais vendidos</h2>
          <ul className="space-y-2">
            {d.topItems.map((i) => (
              <li key={i.name} className="text-sm">
                <div className="flex justify-between">
                  <span>
                    {i.qty}× {i.name}
                  </span>
                  <span className="money">{brlCents(i.cents)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${(i.cents / maxItem) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="surface-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Meios de pagamento</h2>
        <div className="flex flex-wrap gap-2">
          {d.byMethod.map((m) => (
            <Pill key={m.method}>
              {METHOD_LABEL[m.method]}: {brlCents(m.cents)}
            </Pill>
          ))}
          {d.byMethod.length === 0 && (
            <span className="text-sm text-muted-foreground">Sem pagamentos ainda.</span>
          )}
        </div>
      </section>
    </div>
  );
}

function Salao({ state }: { state: DemoState }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {state.tables.map((t) => {
        const v = tableView(state, t.number);
        const tone = {
          livre: "bg-surface",
          ocupada: "bg-brand-soft",
          pagando: "bg-warning/20",
          quitada: "bg-success/15",
        }[v.state];
        return (
          <div key={t.number} className={cn("rounded-2xl border border-border p-4", tone)}>
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-semibold">Mesa {t.number}</span>
              <span className="text-xs text-muted-foreground">{t.seats} lugares</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{v.waiter.name}</p>
            <p className="mt-3 text-sm font-semibold capitalize">{v.state}</p>
            {v.state !== "livre" && (
              <p className="money text-sm">
                {brlCents(v.bill)} · falta{" "}
                {brlCents(Math.round(v.remaining * (1 + state.restaurant.serviceRate)))}
              </p>
            )}
            {t.openedAt && (
              <p className="text-[11px] text-muted-foreground">
                Aberta há {Math.max(0, Math.round((Date.now() - t.openedAt) / 60_000))} min
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Pagamentos({ state }: { state: DemoState }) {
  const [status, setStatus] = useState<string>("todos");
  const rows = [...state.payments]
    .reverse()
    .filter((p) => status === "todos" || p.status === status);
  function exportCsv() {
    const header = "id;mesa;cliente;meio;status;itens;servico;gorjeta;total;garcom;criado_em";
    const body = rows.map((p) =>
      [
        p.id,
        p.table,
        p.payer,
        METHOD_LABEL[p.method],
        p.status,
        p.subtotalCents / 100,
        p.serviceCents / 100,
        p.tipCents / 100,
        totalCents(p) / 100,
        state.staff.find((s) => s.id === p.waiterId)?.name ?? "",
        new Date(p.createdAt).toISOString(),
      ].join(";"),
    );
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pagamentos-demonstracao.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label className="text-sm" htmlFor="filtro-status">
          Status
        </label>
        <select
          id="filtro-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        >
          {["todos", "aprovado", "pendente", "falhou", "estornado"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportCsv}>
          <Download /> Planilha (CSV)
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Hora</th>
              <th className="p-3">Mesa</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Meio</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  {new Date(p.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3">{p.table}</td>
                <td className="p-3">{p.payer}</td>
                <td className="p-3">{METHOD_LABEL[p.method]}</td>
                <td className="money p-3 text-right">{brlCents(totalCents(p))}</td>
                <td className="p-3">
                  <Pill
                    tone={
                      p.status === "aprovado"
                        ? "success"
                        : p.status === "pendente"
                          ? "warning"
                          : p.status === "estornado"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {p.status}
                  </Pill>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nenhum pagamento com esse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Equipe({ state }: { state: DemoState }) {
  const d = dashboard(state);
  return (
    <section className="surface-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-background-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3">Garçom</th>
            <th className="p-3 text-right">Vendas</th>
            <th className="p-3 text-right">Gorjeta bruta</th>
            <th className="p-3 text-right">Parte do garçom</th>
            <th className="p-3">Nota</th>
          </tr>
        </thead>
        <tbody>
          {d.byWaiter.map((w) => (
            <tr key={w.id} className="border-t border-border">
              <td className="p-3 font-medium">{w.name}</td>
              <td className="money p-3 text-right">{brlCents(w.sales)}</td>
              <td className="money p-3 text-right">{brlCents(w.tips)}</td>
              <td className="money p-3 text-right">{brlCents(w.tipToWaiter)}</td>
              <td className="p-3">
                {w.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />{" "}
                    {w.rating.toFixed(1).replace(".", ",")} ({w.ratings})
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-3 text-[11px] text-muted-foreground">
        Divisão da gorjeta extra conforme a regra atual da Tipe (
        {Math.round(state.restaurant.tipShareWaiter * 100)}% garçom). Caixinha e rateio entre
        equipes ainda não existem.
      </p>
    </section>
  );
}

const RECON_LABEL: Record<ReconRow["kind"], string> = {
  conciliado: "Conciliado",
  valor_divergente: "Valor diferente",
  sem_extrato: "Sem extrato do provedor",
  sem_registro_tipe: "No extrato, sem registro na Tipe",
  conferir_caixa: "Conferir no caixa",
};

function Conciliacao({ state }: { state: DemoState }) {
  const { run } = useDemo();
  const { rows, summary } = reconcile(state);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(Object.keys(RECON_LABEL) as ReconRow["kind"][]).map((k) => (
          <StatCard
            key={k}
            label={RECON_LABEL[k]}
            value={String(summary[k])}
            tone={
              k === "conciliado" || k === "conferir_caixa"
                ? undefined
                : summary[k]
                  ? "warning"
                  : undefined
            }
          />
        ))}
      </div>
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <Scale className="h-4 w-4" aria-hidden />
          <p className="text-sm">
            Regra determinística: cada pagamento digital é casado com o extrato do provedor pela
            referência e comparado ao centavo.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => run({ type: "injectProviderDivergence", at: Date.now() })}
          >
            Simular lançamento estranho no extrato
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Situação</th>
                <th className="p-3">Referência</th>
                <th className="p-3 text-right">Tipe</th>
                <th className="p-3 text-right">Provedor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3">
                    <Pill
                      tone={
                        r.kind === "conciliado"
                          ? "success"
                          : r.kind === "conferir_caixa"
                            ? r.confirmed
                              ? "neutral"
                              : "warning"
                            : "danger"
                      }
                    >
                      {RECON_LABEL[r.kind]}
                    </Pill>
                  </td>
                  <td className="p-3 font-mono text-xs">{"ref" in r ? r.ref : r.paymentId}</td>
                  <td className="money p-3 text-right">
                    {r.kind === "sem_registro_tipe"
                      ? "—"
                      : brlCents(r.kind === "valor_divergente" ? r.tipeCents : r.cents)}
                  </td>
                  <td className="money p-3 text-right">
                    {r.kind === "sem_extrato" || r.kind === "conferir_caixa"
                      ? "—"
                      : brlCents(r.kind === "valor_divergente" ? r.providerCents : r.cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Ainda sem IA: este é o motor de regras que a IA de conciliação vai explicar e resumir.
        Valores financeiros nunca são decididos por IA.
      </p>
    </div>
  );
}
