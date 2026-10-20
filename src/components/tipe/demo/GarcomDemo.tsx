import {
  Bell,
  Check,
  ChefHat,
  HandCoins,
  Plus,
  Receipt,
  Star,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  brlCents,
  dashboard,
  METHOD_LABEL,
  tableView,
  totalCents,
  type Alert,
  type DemoState,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { newKey, Pill } from "./DemoShell";
import { TABLE_STATE } from "./GerenteDemo";
import { Avatar, Card, Dot, Metric, PrimaryButton, Segmented, Sheet, hhmm } from "./ui";

const ALERT_ICON: Record<Alert["kind"], { icon: LucideIcon; cls: string }> = {
  prato_pronto: { icon: ChefHat, cls: "bg-brand-soft text-brand-strong" },
  pagamento: { icon: Receipt, cls: "bg-success/14 text-[oklch(0.42_0.12_150)]" },
  mesa_quitada: { icon: Check, cls: "bg-success/14 text-[oklch(0.42_0.12_150)]" },
  pagamento_no_local: { icon: HandCoins, cls: "bg-warning/18 text-[oklch(0.5_0.12_60)]" },
  nota_baixa: { icon: Star, cls: "bg-destructive/10 text-destructive" },
  estorno: { icon: Undo2, cls: "bg-destructive/10 text-destructive" },
  atraso: { icon: ChefHat, cls: "bg-warning/18 text-[oklch(0.5_0.12_60)]" },
};

export function GarcomDemo() {
  const { state } = useDemo();
  const [waiterId, setWaiterId] = useState("g-ana");
  const [scope, setScope] = useState<"minhas" | "todas">("minhas");
  const [open, setOpen] = useState<number | null>(null);
  if (!state) return null;
  const waiters = state.staff.filter((s) => s.role === "garcom");
  const me = waiters.find((w) => w.id === waiterId)!;
  const first = me.name.split(" ")[0]!;
  const tables = state.tables.filter((t) => scope === "todas" || t.waiterId === waiterId);
  const mineCount = state.tables.filter((t) => t.waiterId === waiterId).length;
  const alerts = state.alerts.filter((a) => a.to === "garcom" && a.staffId === waiterId);
  const stats = dashboard(state).byWaiter.find((w) => w.id === waiterId)!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={me.name} tone="brand" className="h-11 w-11 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-semibold leading-tight">Olá, {first}</p>
              <p className="text-xs text-muted-foreground">
                Seu turno de hoje no {state.restaurant.name}
              </p>
            </div>
            <Segmented
              size="sm"
              value={waiterId}
              onChange={(id) => {
                setWaiterId(id);
                setOpen(null);
              }}
              options={waiters.map((w) => ({ id: w.id, label: w.name.split(" ")[0]! }))}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
            <Metric label="Vendas" value={brlCents(stats.sales)} />
            <Metric
              label="Suas gorjetas"
              value={brlCents(stats.tipToWaiter)}
              sub={`${Math.round(state.restaurant.tipShareWaiter * 100)}% da gorjeta extra`}
            />
            <Metric
              label="Nota média"
              value={
                stats.rating ? (
                  <span className="inline-flex items-center gap-1">
                    {stats.rating.toFixed(1).replace(".", ",")}
                    <Star className="h-4 w-4 fill-warning text-warning" />
                  </span>
                ) : (
                  "—"
                )
              }
              sub={stats.ratings ? `${stats.ratings} avaliações` : undefined}
            />
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-[17px] font-semibold">Mesas</h2>
            <Segmented
              size="sm"
              value={scope}
              onChange={setScope}
              options={[
                { id: "minhas", label: `Minhas · ${mineCount}` },
                { id: "todas", label: `Todas · ${state.tables.length}` },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {tables.map((t) => {
              const v = tableView(state, t.number);
              const st = TABLE_STATE[v.state];
              const ready = v.lines.filter((l) => l.status === "pronto").length;
              const local = v.pending.some((p) => p.method === "estabelecimento");
              const owner = state.staff.find((s) => s.id === t.waiterId)!;
              return (
                <button
                  key={t.number}
                  type="button"
                  aria-label={`Mesa ${t.number}: ${st.label}${ready ? `, ${ready} pronto para servir` : ""}`}
                  onClick={() => setOpen(t.number)}
                  className={cn(
                    "relative flex min-h-[116px] flex-col rounded-2xl border p-3.5 text-left transition hover:shadow-[0_8px_24px_-14px_oklch(0.2_0.04_250/0.4)]",
                    v.state === "livre"
                      ? "border-dashed border-border bg-transparent"
                      : "border-border/70 bg-surface",
                    (ready > 0 || local) && "border-brand shadow-[0_0_0_1px_oklch(0.77_0.14_178)]",
                  )}
                >
                  <span className="flex items-start justify-between">
                    <span className="font-display text-[22px] font-semibold leading-none">
                      {t.number}
                    </span>
                    {scope === "todas" && (
                      <Avatar
                        name={owner.name}
                        tone={owner.id === waiterId ? "ink" : "muted"}
                        className="h-6 w-6 text-[9px]"
                      />
                    )}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Dot tone={st.tone} className="h-2 w-2" /> {st.label}
                  </span>
                  {v.state !== "livre" && (
                    <span className="money mt-auto pt-3 text-[13px] font-semibold">
                      {brlCents(Math.round(v.remaining * (1 + state.restaurant.serviceRate)))}
                      <span className="font-normal text-muted-foreground"> em aberto</span>
                    </span>
                  )}
                  {(ready > 0 || local) && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-ink">
                      {ready > 0 ? `${ready} pronto` : "Pagar no local"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <Alerts state={state} ids={alerts.map((a) => a.id)} />
      </aside>

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={
          open !== null && (
            <>
              <p className="font-display text-xl font-semibold leading-tight">Mesa {open}</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Dot tone={TABLE_STATE[tableView(state, open).state].tone} className="h-2 w-2" />
                {TABLE_STATE[tableView(state, open).state].label} ·{" "}
                {tableView(state, open).waiter.name}
              </p>
            </>
          )
        }
      >
        {open !== null && <TableDetail state={state} table={open} waiterId={waiterId} />}
      </Sheet>
    </div>
  );
}

export function Alerts({ state, ids }: { state: DemoState; ids: string[] }) {
  const { run } = useDemo();
  const list = state.alerts.filter((a) => ids.includes(a.id)).slice(0, 8);
  const unread = list.filter((a) => !a.read);
  return (
    <section aria-live="polite">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[17px] font-semibold">Avisos</h2>
        {unread.length > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-ink">
            {unread.length}
          </span>
        )}
        {unread.length > 0 && (
          <button
            type="button"
            onClick={() => run({ type: "readAlerts", ids: unread.map((a) => a.id) })}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Marcar como lidos
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[oklch(0.95_0.005_250)] text-muted-foreground">
            <Bell className="h-4 w-4" />
          </span>
          <p className="mt-3 max-w-[240px] text-[13px] text-muted-foreground">
            Prato pronto, pagamento, mesa quitada e nota baixa chegam aqui na hora.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => {
            const ic = ALERT_ICON[a.kind];
            return (
              <li
                key={a.id}
                className={cn(
                  "demo-fade flex items-start gap-3 rounded-2xl border bg-surface px-3.5 py-3 text-[13px] transition-opacity",
                  a.read
                    ? "border-border/50 opacity-60"
                    : "border-border/70 shadow-[0_6px_20px_-14px_oklch(0.2_0.04_250/0.35)]",
                )}
              >
                <span
                  className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", ic.cls)}
                >
                  <ic.icon className="h-4 w-4" />
                </span>
                <p className={cn("min-w-0 flex-1 leading-snug", !a.read && "font-medium")}>
                  {a.text}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {hhmm(a.createdAt)}
                  </span>
                </p>
                {!a.read && <Dot tone="brand" className="mt-1.5 h-2 w-2" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TableDetail({
  state,
  table,
  waiterId,
}: {
  state: DemoState;
  table: number;
  waiterId: string;
}) {
  const { run } = useDemo();
  const v = tableView(state, table);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const act = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    setMsg(r.ok ? null : (r as { error: string }).error);
  };
  const ratings = state.ratings.filter(
    (r) => r.table === table && v.payments.some((p) => p.id === r.paymentId),
  );

  return (
    <div className="space-y-5 pt-1 text-[13px]">
      {msg && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">
          {msg}
        </p>
      )}
      {v.state !== "livre" && (
        <div className="flex items-baseline justify-between rounded-2xl bg-[oklch(0.965_0.005_250)] px-4 py-3">
          <span className="text-muted-foreground">Em aberto</span>
          <span className="money font-display text-lg font-semibold">
            {brlCents(Math.round(v.remaining * (1 + state.restaurant.serviceRate)))}
          </span>
        </div>
      )}

      {v.lines.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Itens</h3>
          <ul className="divide-y divide-border/70">
            {v.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  {l.qty}× {l.name}
                  {l.seat ? <span className="text-muted-foreground"> · lugar {l.seat}</span> : null}
                </span>
                {l.status === "pronto" ? (
                  <button
                    type="button"
                    onClick={() =>
                      act(
                        run({ type: "deliverLine", actor: "garcom", lineId: l.id, at: Date.now() }),
                      )
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3.5 text-xs font-semibold text-ink"
                  >
                    <Check className="h-3.5 w-3.5" /> Servir
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {l.status === "entregue"
                      ? "Servido"
                      : l.status === "preparo"
                        ? "Em preparo"
                        : "Na fila"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {v.payments.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Pagamentos</h3>
          <ul className="divide-y divide-border/70">
            {v.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.payer}</span> · {METHOD_LABEL[p.method]}
                  <span className="money block text-xs text-muted-foreground">
                    {brlCents(totalCents(p))}
                    {p.tipCents ? ` · gorjeta ${brlCents(p.tipCents)}` : ""}
                  </span>
                </span>
                {p.status === "pendente" && p.method === "estabelecimento" ? (
                  <button
                    type="button"
                    onClick={() =>
                      act(
                        run({
                          type: "confirmManual",
                          actor: "garcom",
                          paymentId: p.id,
                          at: Date.now(),
                        }),
                      )
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-semibold text-white"
                  >
                    <HandCoins className="h-3.5 w-3.5" /> Recebi
                  </button>
                ) : p.status === "aprovado" && !p.refundRequestedBy ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const reason = window.prompt(
                        "Motivo do estorno (vai para o gerente aprovar):",
                      );
                      if (reason)
                        void act(
                          run({
                            type: "requestRefund",
                            actor: "garcom",
                            actorId: waiterId,
                            paymentId: p.id,
                            reason,
                            at: Date.now(),
                          }),
                        );
                    }}
                  >
                    <Undo2 className="h-3 w-3" /> Pedir estorno
                  </button>
                ) : (
                  <Pill
                    tone={
                      p.status === "aprovado"
                        ? p.refundRequestedBy
                          ? "warning"
                          : "success"
                        : p.status === "estornado"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {p.status === "aprovado"
                      ? p.refundRequestedBy
                        ? "Estorno pedido"
                        : "Aprovado"
                      : p.status === "estornado"
                        ? "Estornado"
                        : p.status === "falhou"
                          ? "Não concluído"
                          : "Aguardando"}
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ratings.map((r) => (
        <p
          key={r.id}
          className="flex items-center gap-1.5 rounded-xl bg-[oklch(0.965_0.005_250)] px-3 py-2 text-xs"
        >
          <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {r.stars}{" "}
          {r.comment && `· “${r.comment}”`}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-semibold hover:border-ink/30"
        >
          <Plus className="h-4 w-4" /> Lançar pedido
        </button>
        {v.state === "quitada" && (
          <button
            type="button"
            onClick={() => act(run({ type: "closeTable", actor: "garcom", table, at: Date.now() }))}
            className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
          >
            Liberar mesa
          </button>
        )}
      </div>
      {adding && (
        <QuickOrder
          state={state}
          table={table}
          waiterId={waiterId}
          onDone={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function QuickOrder({
  state,
  table,
  waiterId,
  onDone,
}: {
  state: DemoState;
  table: number;
  waiterId: string;
  onDone: () => void;
}) {
  const { run } = useDemo();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [key] = useState(newKey);
  const [err, setErr] = useState<string | null>(null);
  const items = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([menuId, q]) => ({ menuId, qty: q }));
  return (
    <div className="demo-fade rounded-2xl border border-border/70 p-3">
      <div className="grid grid-cols-2 gap-1.5">
        {state.menu
          .filter((m) => m.available)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setQty({ ...qty, [m.id]: (qty[m.id] ?? 0) + 1 })}
              className={cn(
                "flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                qty[m.id]
                  ? "bg-ink text-white"
                  : "bg-[oklch(0.965_0.005_250)] hover:bg-[oklch(0.94_0.006_250)]",
              )}
            >
              <span className="truncate">{m.name}</span>
              {qty[m.id] ? <span className="font-semibold">{qty[m.id]}</span> : null}
            </button>
          ))}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-3">
        <PrimaryButton
          className="h-10 text-[13px]"
          disabled={!items.length}
          onClick={async () => {
            const r = await run({
              type: "placeOrder",
              actor: "garcom",
              actorId: waiterId,
              table,
              source: "garcom",
              items,
              idempotencyKey: key,
              guests: 2,
              at: Date.now(),
            });
            if (r.ok) onDone();
            else setErr(r.error);
          }}
        >
          Enviar para a cozinha
        </PrimaryButton>
      </div>
    </div>
  );
}
