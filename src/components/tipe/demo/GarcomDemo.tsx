import { Bell, Check, HandCoins, Plus, Star, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  brlCents,
  dashboard,
  METHOD_LABEL,
  tableView,
  totalCents,
  type DemoState,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { newKey, Pill } from "./DemoShell";

const STATE_LABEL = {
  livre: "Livre",
  ocupada: "Ocupada",
  pagando: "Pagando",
  quitada: "Quitada",
} as const;
const STATE_TONE = {
  livre: "neutral",
  ocupada: "brand",
  pagando: "warning",
  quitada: "success",
} as const;

export function GarcomDemo() {
  const { state } = useDemo();
  const [waiterId, setWaiterId] = useState("g-ana");
  const [open, setOpen] = useState<number | null>(null);
  if (!state) return null;
  const waiters = state.staff.filter((s) => s.role === "garcom");
  const me = waiters.find((w) => w.id === waiterId)!;
  const mine = state.tables.filter((t) => t.waiterId === waiterId);
  const alerts = state.alerts.filter((a) => a.to === "garcom" && a.staffId === waiterId);
  const stats = dashboard(state).byWaiter.find((w) => w.id === waiterId)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {waiters.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setWaiterId(w.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              w.id === waiterId ? "bg-ink text-white" : "bg-surface",
            )}
          >
            {w.name.split(" ")[0]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Vendas do turno" value={brlCents(stats.sales)} />
        <Stat label="Suas gorjetas" value={brlCents(stats.tipToWaiter)} />
        <Stat
          label="Nota média"
          value={stats.rating ? stats.rating.toFixed(1).replace(".", ",") : "—"}
        />
      </div>

      <Alerts state={state} ids={alerts.map((a) => a.id)} />

      <h2 className="pt-2 font-display text-lg font-semibold">Mesas de {me.name.split(" ")[0]}</h2>
      <div className="space-y-2">
        {mine.map((t) => {
          const v = tableView(state, t.number);
          const ready = v.lines.filter((l) => l.status === "pronto").length;
          return (
            <div key={t.number} className="surface-card overflow-hidden">
              <button
                type="button"
                aria-expanded={open === t.number}
                aria-label={`Mesa ${t.number}: ${STATE_LABEL[v.state]}${ready ? `, ${ready} pronto para servir` : ""}`}
                onClick={() => setOpen(open === t.number ? null : t.number)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-background-muted font-display text-lg font-semibold">
                  {t.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={STATE_TONE[v.state]}>{STATE_LABEL[v.state]}</Pill>
                    {ready > 0 && (
                      <Pill tone="brand">
                        {ready} pronto{ready > 1 ? "s" : ""} para servir
                      </Pill>
                    )}
                    {v.pending.some((p) => p.method === "estabelecimento") && (
                      <Pill tone="warning">Pagar no local</Pill>
                    )}
                  </div>
                  {v.state !== "livre" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Conta {brlCents(v.bill)} · falta{" "}
                      {brlCents(Math.round(v.remaining * (1 + state.restaurant.serviceRate)))}
                    </p>
                  )}
                </div>
              </button>
              {open === t.number && (
                <TableDetail state={state} table={t.number} waiterId={waiterId} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="surface-card p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="money mt-1 font-display text-lg font-semibold">{value}</p>
  </div>
);

export function Alerts({ state, ids }: { state: DemoState; ids: string[] }) {
  const { run } = useDemo();
  const list = state.alerts.filter((a) => ids.includes(a.id)).slice(0, 6);
  const unread = list.filter((a) => !a.read);
  return (
    <div className="surface-card p-4" aria-live="polite">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4" aria-hidden />
        <p className="text-sm font-semibold">
          Avisos{" "}
          {unread.length > 0 && (
            <span className="ml-1 rounded-full bg-brand px-1.5 text-xs text-ink">
              {unread.length}
            </span>
          )}
        </p>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={() => run({ type: "readAlerts", ids: unread.map((a) => a.id) })}
            className="ml-auto text-xs text-muted-foreground underline"
          >
            Marcar como lidos
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada novo. Pagamentos, pratos prontos e notas baixas aparecem aqui na hora.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm",
                a.read
                  ? "text-muted-foreground"
                  : a.kind === "nota_baixa"
                    ? "bg-destructive/10"
                    : "bg-brand-soft",
              )}
            >
              {a.text}{" "}
              <span className="text-[11px] text-muted-foreground">
                ·{" "}
                {new Date(a.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
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

  return (
    <div className="space-y-3 border-t border-border bg-background-muted/50 p-4 text-sm">
      {msg && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">
          {msg}
        </p>
      )}
      {v.lines.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            {l.qty}× {l.name}
            {l.seat ? <span className="text-muted-foreground"> · lugar {l.seat}</span> : null}
          </span>
          {l.status === "pronto" ? (
            <Button
              size="sm"
              onClick={() =>
                act(run({ type: "deliverLine", actor: "garcom", lineId: l.id, at: Date.now() }))
              }
            >
              <Check /> Servir
            </Button>
          ) : (
            <Pill>
              {l.status === "entregue"
                ? "Servido"
                : l.status === "preparo"
                  ? "Em preparo"
                  : "Na fila"}
            </Pill>
          )}
        </div>
      ))}
      {v.payments.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pagamentos
          </p>
          {v.payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                {p.payer} · {METHOD_LABEL[p.method]} ·{" "}
                <span className="money">{brlCents(totalCents(p))}</span>
                {p.tipCents ? (
                  <span className="text-muted-foreground"> (gorjeta {brlCents(p.tipCents)})</span>
                ) : null}
              </span>
              {p.status === "pendente" && p.method === "estabelecimento" ? (
                <Button
                  size="sm"
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
                >
                  <HandCoins /> Recebi
                </Button>
              ) : p.status === "aprovado" && !p.refundRequestedBy ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                  onClick={() => {
                    const reason = window.prompt("Motivo do estorno (vai para o gerente aprovar):");
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
            </div>
          ))}
        </div>
      )}
      {state.ratings
        .filter((r) => r.table === table && v.payments.some((p) => p.id === r.paymentId))
        .map((r) => (
          <p key={r.id} className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {r.stars}{" "}
            {r.comment && `· “${r.comment}”`}
          </p>
        ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus /> Lançar pedido
        </Button>
        {v.state === "quitada" && (
          <Button
            size="sm"
            onClick={() => act(run({ type: "closeTable", actor: "garcom", table, at: Date.now() }))}
          >
            Liberar mesa
          </Button>
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
    <div className="rounded-xl bg-surface p-3">
      <div className="grid grid-cols-2 gap-1.5">
        {state.menu
          .filter((m) => m.available)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setQty({ ...qty, [m.id]: (qty[m.id] ?? 0) + 1 })}
              className="flex items-center justify-between rounded-lg bg-background-muted px-2 py-1.5 text-left text-xs"
            >
              <span className="truncate">{m.name}</span>
              {qty[m.id] ? (
                <span className="ml-1 rounded-full bg-ink px-1.5 text-white">{qty[m.id]}</span>
              ) : null}
            </button>
          ))}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <Button
        size="sm"
        className="mt-2 w-full"
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
      </Button>
    </div>
  );
}
