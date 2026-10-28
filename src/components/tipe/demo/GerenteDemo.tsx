import {
  ArrowDownToLine,
  BadgeCheck,
  LayoutGrid,
  Radio,
  Scale,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  brlCents,
  dashboard,
  METHOD_LABEL,
  reconcile,
  tableView,
  totalCents,
  type DemoState,
  type PaymentStatus,
  type ReconRow,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { Pill } from "./DemoShell";
import {
  Avatar,
  BarChart,
  Card,
  CardHeader,
  Dot,
  Metric,
  Segmented,
  ShareBar,
  hhmm,
  shortBrl,
  type DotTone,
} from "./ui";

type Tab = "agora" | "salao" | "pagamentos" | "equipe" | "conciliacao";
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "agora", label: "Agora", icon: Radio },
  { id: "salao", label: "Salão", icon: LayoutGrid },
  { id: "pagamentos", label: "Pagamentos", icon: Wallet },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "conciliacao", label: "Conciliação", icon: Scale },
];

export const TABLE_STATE: Record<
  "livre" | "ocupada" | "pagando" | "quitada",
  { label: string; tone: DotTone }
> = {
  livre: { label: "Livre", tone: "neutral" },
  ocupada: { label: "Ocupada", tone: "info" },
  pagando: { label: "Pagando", tone: "warning" },
  quitada: { label: "Quitada", tone: "success" },
};

export function GerenteDemo() {
  const { state } = useDemo();
  const [tab, setTab] = useState<Tab>("agora");
  if (!state) return null;
  const refunds = state.payments.filter(
    (p) => p.status === "aprovado" && p.refundRequestedBy,
  ).length;
  const date = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = date.charAt(0).toUpperCase() + date.slice(1);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="mb-4 hidden items-center gap-3 lg:flex">
          <Avatar name={state.restaurant.name} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{state.restaurant.name}</p>
            <p className="truncate text-xs text-muted-foreground">Carla Mendes · gerente</p>
          </div>
        </div>
        <nav
          role="tablist"
          aria-label="Seções do painel"
          className="demo-scroll -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors lg:w-full lg:rounded-xl",
                tab === t.id
                  ? "bg-ink text-white"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" aria-hidden />
              {t.label}
              {t.id === "agora" && refunds > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] text-white">
                  {refunds}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{today}</p>
            <h1 className="mt-0.5 font-display text-[26px] font-semibold leading-tight tracking-heading">
              {tab === "agora" ? `${greeting()}, Carla` : TABS.find((t) => t.id === tab)!.label}
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Ao vivo
          </span>
        </header>
        <div key={tab} className="demo-fade">
          {tab === "agora" && <Agora state={state} />}
          {tab === "salao" && <Salao state={state} />}
          {tab === "pagamentos" && <Pagamentos state={state} />}
          {tab === "equipe" && <Equipe state={state} />}
          {tab === "conciliacao" && <Conciliacao state={state} />}
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Agora({ state }: { state: DemoState }) {
  const { run } = useDemo();
  const d = dashboard(state);
  const refunds = state.payments.filter((p) => p.status === "aprovado" && p.refundRequestedBy);
  const alerts = state.alerts.filter((a) => a.to === "gerente");
  const unread = alerts.filter((a) => !a.read);
  const methodTotal = d.byMethod.reduce((s, m) => s + m.cents, 0) || 1;
  const itemTop = Math.max(1, ...d.topItems.map((i) => i.cents));
  const hours = fillHours(d.byHour);
  const peak = [...d.byHour].sort((a, b) => b.cents - a.cents)[0];

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 divide-border/70 sm:grid-cols-4 sm:divide-x">
        {[
          {
            label: "Faturamento hoje",
            value: brlCents(d.revenue),
            sub: `${d.payments} pagamentos aprovados`,
          },
          {
            label: "Ticket médio",
            value: brlCents(d.avgTicket),
            sub: `${d.tablesServed} contas fechadas`,
          },
          {
            label: "Em aberto agora",
            value: brlCents(d.openBalance),
            sub: `${d.openTables} ${d.openTables === 1 ? "mesa aberta" : "mesas abertas"}`,
          },
          {
            label: "Gorjetas extras",
            value: brlCents(d.tips),
            sub: d.avgRating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />{" "}
                {d.avgRating.toFixed(1).replace(".", ",")} de média
              </span>
            ) : (
              "Sem avaliações"
            ),
          },
        ].map((m, i) => (
          <Metric
            key={m.label}
            {...m}
            className={cn(
              "px-5 py-4",
              i > 1 && "border-t border-border/70 sm:border-t-0",
              i % 2 === 1 && "border-l border-border/70 sm:border-l-0",
            )}
          />
        ))}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Faturamento por hora"
            hint={
              peak
                ? `Pico às ${peak.hour}h, com ${brlCents(peak.cents)}`
                : "Ainda sem pagamentos hoje"
            }
          />
          <div className="px-5 pb-4 pt-4">
            <BarChart
              label="Faturamento por hora (itens + serviço)"
              format={shortBrl}
              data={hours.map((h) => ({
                key: String(h.hour),
                label: `${h.hour}h`,
                value: h.cents,
                detail: `${h.orders} ${h.orders === 1 ? "pedido" : "pedidos"}`,
              }))}
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Precisa de você"
            hint={
              refunds.length + unread.length
                ? `${refunds.length + unread.length} ${refunds.length + unread.length === 1 ? "item" : "itens"}`
                : "Tudo em dia"
            }
            action={
              unread.length > 0 && (
                <button
                  type="button"
                  onClick={() => run({ type: "readAlerts", ids: unread.map((a) => a.id) })}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Marcar como lidos
                </button>
              )
            }
          />
          <ul className="mt-2 flex-1 divide-y divide-border/70 px-5 pb-2" aria-live="polite">
            {refunds.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-start gap-3">
                  <IconDot icon={ArrowDownToLine} tone="danger" />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <p className="font-semibold">Estorno pedido · Mesa {p.table}</p>
                    <p className="text-muted-foreground">
                      {p.payer}, <span className="money">{brlCents(totalCents(p))}</span>: “
                      {p.refundReason}” (
                      {state.staff.find((s) => s.id === p.refundRequestedBy)?.name.split(" ")[0]})
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        run({
                          type: "approveRefund",
                          actor: "gerente",
                          paymentId: p.id,
                          at: Date.now(),
                        })
                      }
                      className="mt-2 inline-flex h-8 items-center rounded-full bg-destructive px-3.5 text-xs font-semibold text-white hover:bg-destructive/90"
                    >
                      Aprovar estorno
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {alerts.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className={cn("flex items-start gap-3 py-3 text-[13px]", a.read && "opacity-55")}
              >
                <IconDot
                  icon={
                    a.kind === "nota_baixa"
                      ? Star
                      : a.kind === "estorno"
                        ? ArrowDownToLine
                        : BadgeCheck
                  }
                  tone={
                    a.kind === "nota_baixa" ? "warning" : a.kind === "estorno" ? "danger" : "brand"
                  }
                />
                <p className="min-w-0 flex-1">
                  {a.text}
                  <span className="block text-[11px] text-muted-foreground">
                    {hhmm(a.createdAt)}
                  </span>
                </p>
                {!a.read && <Dot tone="brand" className="mt-1.5 h-2 w-2" />}
              </li>
            ))}
            {refunds.length + alerts.length === 0 && (
              <li className="flex flex-col items-center py-10 text-center text-[13px] text-muted-foreground">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-success/14 text-[oklch(0.42_0.12_150)]">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                Nada pendente. Estornos, notas baixas e divergências aparecem aqui na hora.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Salão agora"
            hint={`${d.openTables} de ${state.tables.length} mesas ocupadas`}
          />
          <div className="grid grid-cols-4 gap-2 p-5 pt-4">
            {state.tables.map((t) => {
              const v = tableView(state, t.number);
              const st = TABLE_STATE[v.state];
              return (
                <div
                  key={t.number}
                  title={`Mesa ${t.number}: ${st.label}`}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl border text-center",
                    v.state === "livre"
                      ? "border-dashed border-border bg-transparent"
                      : "border-transparent bg-[oklch(0.965_0.005_250)]",
                  )}
                >
                  <span className="font-display text-[15px] font-semibold leading-none">
                    {t.number}
                  </span>
                  <Dot tone={st.tone} className="mt-1.5 h-2 w-2" />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-5 pb-4 text-[11px] text-muted-foreground">
            {Object.values(TABLE_STATE).map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <Dot tone={s.tone} /> {s.label}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Meios de pagamento" hint="Valor pago, com serviço e gorjeta" />
          <div className="space-y-3.5 p-5 pt-4">
            {d.byMethod.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Sem pagamentos ainda.</p>
            )}
            {d.byMethod.map((m) => (
              <ShareBar
                key={m.method}
                label={
                  <>
                    {METHOD_LABEL[m.method]}{" "}
                    <span className="text-muted-foreground">
                      · {Math.round((m.cents / methodTotal) * 100)}%
                    </span>
                  </>
                }
                value={brlCents(m.cents)}
                share={m.cents / methodTotal}
                tone="brand"
              />
            ))}
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader title="Mais vendidos" hint="Por faturamento, hoje" />
          <ol className="space-y-3.5 p-5 pt-4">
            {d.topItems.map((i, n) => (
              <li key={i.name} className="flex items-center gap-3">
                <span className="w-4 self-start pt-px text-xs font-semibold text-muted-foreground">
                  {n + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <ShareBar
                    label={`${i.name} · ${i.qty}`}
                    value={brlCents(i.cents)}
                    share={i.cents / itemTop}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function IconDot({ icon: Icon, tone }: { icon: LucideIcon; tone: "danger" | "warning" | "brand" }) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "warning" && "bg-warning/18 text-[oklch(0.5_0.12_60)]",
        tone === "brand" && "bg-brand-soft text-brand-strong",
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

/** Horas contínuas entre o primeiro e o último movimento, para o gráfico não pular buracos. */
function fillHours(rows: { hour: number; orders: number; cents: number }[]) {
  if (!rows.length) return [];
  const from = Math.min(...rows.map((r) => r.hour));
  const to = Math.max(...rows.map((r) => r.hour));
  return Array.from(
    { length: to - from + 1 },
    (_, i) => rows.find((r) => r.hour === from + i) ?? { hour: from + i, orders: 0, cents: 0 },
  );
}

function Salao({ state }: { state: DemoState }) {
  const rate = state.restaurant.serviceRate;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {state.tables.map((t) => {
        const v = tableView(state, t.number);
        const st = TABLE_STATE[v.state];
        const total = Math.round(v.bill * (1 + rate));
        const left = Math.round(v.remaining * (1 + rate));
        const ready = v.lines.filter((l) => l.status === "pronto").length;
        return (
          <Card
            key={t.number}
            as="div"
            className={cn("p-4", v.state === "livre" && "border-dashed bg-transparent shadow-none")}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[19px] font-semibold leading-none">
                  Mesa {t.number}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t.seats} lugares · {v.waiter.name.split(" ")[0]}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <Dot tone={st.tone} className="h-2 w-2" />
                {st.label}
              </span>
            </div>
            {v.state !== "livre" ? (
              <>
                <p className="money mt-4 font-display text-lg font-semibold leading-none">
                  {brlCents(left)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  falta de <span className="money">{brlCents(total)}</span>
                  {t.openedAt &&
                    ` · há ${Math.max(0, Math.round((Date.now() - t.openedAt) / 60_000))} min`}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[oklch(0.94_0.006_250)]">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${v.bill ? (1 - v.remaining / v.bill) * 100 : 0}%` }}
                  />
                </div>
                {ready > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-brand-strong">
                    {ready} pronto para servir
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Esperando clientes</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

const PAY_STATUS: Record<
  PaymentStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  aprovado: { label: "Aprovado", tone: "success" },
  pendente: { label: "Aguardando", tone: "warning" },
  estornado: { label: "Estornado", tone: "danger" },
  falhou: { label: "Não concluído", tone: "neutral" },
};

function Pagamentos({ state }: { state: DemoState }) {
  const [status, setStatus] = useState<"todos" | PaymentStatus>("todos");
  const all = [...state.payments].reverse();
  const rows = all.filter((p) => status === "todos" || p.status === status);
  const count = (s: PaymentStatus) => all.filter((p) => p.status === s).length;
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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
        <div className="demo-scroll max-w-full overflow-x-auto">
          <Segmented
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { id: "todos", label: `Todos · ${all.length}` },
              { id: "aprovado", label: `Aprovados · ${count("aprovado")}` },
              { id: "pendente", label: `Aguardando · ${count("pendente")}` },
              { id: "estornado", label: `Estornados · ${count("estornado")}` },
            ]}
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:border-ink/30"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Planilha (CSV)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead className="text-left text-[11px] text-muted-foreground">
            <tr className="border-b border-border/70">
              <th className="px-4 py-2.5 font-medium">Hora</th>
              <th className="px-4 py-2.5 font-medium">Mesa</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Meio</th>
              <th className="px-4 py-2.5 text-right font-medium">Gorjeta</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-[oklch(0.98_0.003_250)]">
                <td className="money px-4 py-3 text-muted-foreground">{hhmm(p.createdAt)}</td>
                <td className="px-4 py-3">{p.table}</td>
                <td className="px-4 py-3 font-medium">{p.payer}</td>
                <td className="px-4 py-3">{METHOD_LABEL[p.method]}</td>
                <td className="money px-4 py-3 text-right text-muted-foreground">
                  {p.tipCents ? brlCents(p.tipCents) : "—"}
                </td>
                <td className="money px-4 py-3 text-right font-semibold">
                  {brlCents(totalCents(p))}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={PAY_STATUS[p.status].tone}>{PAY_STATUS[p.status].label}</Pill>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum pagamento com esse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Equipe({ state }: { state: DemoState }) {
  const d = dashboard(state);
  const top = Math.max(1, ...d.byWaiter.map((w) => w.sales));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {d.byWaiter.map((w) => (
          <Card key={w.id} className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={w.name} tone="brand" className="h-11 w-11 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{w.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {w.rating ? (
                    <>
                      <Star className="h-3 w-3 fill-warning text-warning" />{" "}
                      {w.rating.toFixed(1).replace(".", ",")} em {w.ratings}{" "}
                      {w.ratings === 1 ? "avaliação" : "avaliações"}
                    </>
                  ) : (
                    "Sem avaliações"
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Vendas" value={shortBrl(w.sales)} />
              <Metric label="Gorjeta bruta" value={brlCents(w.tips)} />
              <Metric label={`Parte de ${w.name.split(" ")[0]}`} value={brlCents(w.tipToWaiter)} />
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[oklch(0.94_0.006_250)]">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${(w.sales / top) * 100}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        A gorjeta extra segue a regra atual da Tipe:{" "}
        {Math.round(state.restaurant.tipShareWaiter * 100)}% para quem atendeu a mesa. Caixinha e
        rateio entre equipes ainda não existem.
      </p>
    </div>
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
  const problems = summary.valor_divergente + summary.sem_extrato + summary.sem_registro_tipe;
  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "flex flex-wrap items-center gap-4 p-5",
          problems ? "border-destructive/30" : "",
        )}
      >
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full",
            problems
              ? "bg-destructive/10 text-destructive"
              : "bg-success/14 text-[oklch(0.42_0.12_150)]",
          )}
        >
          {problems ? <Scale className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-semibold">
            {problems
              ? `${problems} ${problems === 1 ? "divergência" : "divergências"} para conferir`
              : "Dia conciliado, sem divergências"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Cada pagamento digital é casado com o extrato do provedor pela referência e comparado ao
            centavo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => run({ type: "injectProviderDivergence", at: Date.now() })}
          className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold hover:border-ink/30"
        >
          Simular lançamento estranho no extrato
        </button>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {(Object.keys(RECON_LABEL) as ReconRow["kind"][]).map((k) => (
          <Card key={k} as="div" className="px-4 py-3.5">
            <Metric
              label={RECON_LABEL[k]}
              value={
                <span
                  className={cn(
                    summary[k] &&
                      (k === "valor_divergente" ||
                        k === "sem_extrato" ||
                        k === "sem_registro_tipe") &&
                      "text-destructive",
                  )}
                >
                  {summary[k]}
                </span>
              }
            />
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="text-left text-[11px] text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium">Referência</th>
                <th className="px-4 py-2.5 text-right font-medium">Tipe</th>
                <th className="px-4 py-2.5 text-right font-medium">Provedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[...rows]
                .sort((a, b) => Number(a.kind === "conciliado") - Number(b.kind === "conciliado"))
                .map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {"ref" in r ? r.ref : r.paymentId}
                    </td>
                    <td className="money px-4 py-3 text-right">
                      {r.kind === "sem_registro_tipe"
                        ? "—"
                        : brlCents(r.kind === "valor_divergente" ? r.tipeCents : r.cents)}
                    </td>
                    <td className="money px-4 py-3 text-right">
                      {r.kind === "sem_extrato" || r.kind === "conferir_caixa"
                        ? "—"
                        : brlCents(r.kind === "valor_divergente" ? r.providerCents : r.cents)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        Ainda sem IA: este é o motor de regras que a IA de conciliação vai explicar e resumir.
        Valores financeiros nunca são decididos por IA.
      </p>
    </div>
  );
}
