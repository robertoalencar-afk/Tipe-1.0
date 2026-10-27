import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Check,
  CircleDot,
  CreditCard,
  LifeBuoy,
  Lock,
  QrCode,
  ReceiptText,
  RotateCcw,
  Star,
  Store,
  Users,
} from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { TICKET_STATUS } from "@/components/tipe/crm/labels";
import {
  AccountStatusPill,
  Gauge,
  HealthPill,
  JourneyTimeline,
  LayerTag,
} from "@/components/tipe/crm/eco";
import {
  axis,
  brl,
  brlShort,
  Btn,
  chartTooltip,
  dateBR,
  dateTimeBR,
  Empty,
  Field,
  Kpi,
  Panel,
  Pill,
  PriorityPill,
  Progress,
  relative,
  Segmented,
  Select,
  TextArea,
  TextInput,
} from "@/components/tipe/crm/ui";
import {
  accountHealth,
  accountJourney,
  accountVisits,
  consumerProfiles,
  dailySeries,
  lastDays,
  maskPhone,
  METHOD_LABEL,
  MODULES,
  ONBOARDING,
  onboardingProgress,
  PAGARME_STATUS,
  PDV_STATUS,
  RESTAURANT_PLAN_ORDER,
  restaurantPlan,
  SEGMENT_LABEL,
  stepDone,
  usageSummary,
  visitsByHour,
} from "@/lib/tipe/crm/ecosystem";
import type { PagarmeStatus, PdvStatus, RestaurantPlan } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/contas/$id")({ component: Conta });

type Tab = "visao" | "implantacao" | "modulos" | "clientes" | "suporte" | "jornada";

function Conta() {
  const { id } = Route.useParams();
  const { s, can, run, user } = useCrm();
  const d = useOrgData();
  const [tab, setTab] = useState<Tab>("visao");
  const now = useMemo(() => new Date().toISOString(), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = d.accounts.find((x) => x.id === id);

  const data = useMemo(() => {
    if (!a) return null;
    const v30 = accountVisits(s, a.id, lastDays(30, now));
    return {
      h: accountHealth(s, a, now),
      u30: usageSummary(v30),
      series: dailySeries(v30, 30, now),
      hours: visitsByHour(v30),
      profiles: consumerProfiles(s, a.orgId, now, a.id),
      journey: accountJourney(s, a),
      recent: accountVisits(s, a.id)
        .sort((x, y) => y.at.localeCompare(x.at))
        .slice(0, 8),
    };
  }, [s, a, now]);

  if (!a || !data)
    return (
      <Empty
        icon={Store}
        title="Conta não encontrada"
        text="Ela pode ter sido removida quando a oportunidade foi reaberta, ou pertence a outra organização."
        action={
          <Link to="/crm/contas" className="text-xs font-semibold text-primary hover:underline">
            Voltar para contas
          </Link>
        }
      />
    );

  const { h, u30, series, hours, profiles, journey, recent } = data;
  const prog = onboardingProgress(a);
  const plan = restaurantPlan(a.plan);
  const manage = can("accounts.manage");
  const tickets = d.tickets
    .filter((x) => x.accountId === a.id)
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const openTickets = tickets.filter((x) => x.status !== "resolvido");
  const tasks = d.tasks.filter((x) => x.accountId === a.id && x.status !== "concluida");
  const company = d.companies.find((x) => x.id === a.companyId);
  const deal = d.deals.find((x) => x.id === a.dealId);
  const canBill = stepDone(a, "mesas_qr") && stepDone(a, "pagamentos");

  const tabs: { value: Tab; label: string }[] = [
    { value: "visao", label: "Visão geral" },
    { value: "implantacao", label: `Implantação ${prog.done}/${prog.total}` },
    { value: "modulos", label: "Módulos e integrações" },
    { value: "clientes", label: `Clientes (${profiles.length})` },
    { value: "suporte", label: `Suporte (${openTickets.length})` },
    { value: "jornada", label: "Jornada" },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/crm/contas"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Contas de restaurante
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">
            <LayerTag layer="B" /> Conta do restaurante
          </p>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight">{a.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <AccountStatusPill status={a.status} />
            {h.score !== null && <HealthPill h={h} />}
            <span>
              {a.segment} · {[a.neighborhood, a.city].filter(Boolean).join(", ")}
            </span>
            <span>·</span>
            <span>
              {plan.name}, {a.tables} mesas
            </span>
            <span>·</span>
            <span>Responsável: {user(a.csmId)?.name ?? "sem responsável"}</span>
          </div>
          {(company || deal) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Veio do comercial:{" "}
              {deal && (
                <Link
                  to="/crm/oportunidades"
                  search={{ deal: deal.id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {deal.title}
                </Link>
              )}
              {company && (
                <>
                  {deal ? " · " : ""}
                  <Link
                    to="/crm/empresas"
                    search={{ empresa: company.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {company.name}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        {manage && a.status !== "cancelada" && (
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="outline"
              disabled={!canBill || a.status === "pausada"}
              title={
                canBill
                  ? "Gera uma conta paga fictícia nesta conta"
                  : "Libere mesas e recebimentos na implantação primeiro"
              }
              onClick={() => run({ type: "simulateVisit", accountId: a.id }, "Conta paga simulada")}
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Simular conta paga
            </Btn>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Segmented label="Seções da conta" value={tab} onChange={setTab} options={tabs} />
      </div>

      {tab === "visao" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={ReceiptText}
              label="Contas pagas em 30 dias"
              value={u30.bills.toLocaleString("pt-BR")}
              hint={`${u30.tablesUsed} mesas com movimento`}
            />
            <Kpi
              icon={CreditCard}
              label="Volume pago pela Tipe"
              value={brlShort(u30.gmv)}
              hint={u30.avgTicket ? `Ticket médio ${brl(u30.avgTicket)}` : "Sem contas ainda"}
            />
            <Kpi
              icon={Users}
              label="Gorjetas para a equipe"
              value={brlShort(u30.tips)}
              hint={u30.tipRate !== null ? `${u30.tipRate}% das contas com gorjeta` : "—"}
            />
            <Kpi
              icon={Star}
              label="Avaliação do atendimento"
              value={u30.rating ? u30.rating.toFixed(1).replace(".", ",") : "—"}
              hint={`${u30.ratings} avaliações`}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel
              title="Uso nos últimos 30 dias"
              description="Contas pagas por dia pela Tipe"
              className="xl:col-span-2"
            >
              {u30.bills === 0 ? (
                <Empty
                  icon={QrCode}
                  title="Ainda sem contas pagas"
                  text="O uso aparece aqui assim que o restaurante receber a primeira conta pelo QR Code."
                />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer>
                    <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="acc-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="dia" {...axis} interval={4} />
                      <YAxis {...axis} allowDecimals={false} />
                      <Tooltip {...chartTooltip} />
                      <Area
                        type="monotone"
                        dataKey="contas"
                        name="Contas pagas"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#acc-area)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel title="Saúde da conta" description="De 0 a 100, só com fatos">
              {h.score === null ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {a.status === "implantacao"
                      ? "A nota começa quando a conta é ativada. Até lá, acompanhe a implantação."
                      : "Conta fora de operação."}
                  </p>
                  {a.status === "implantacao" && (
                    <>
                      <Progress value={prog.pct} label="Implantação" />
                      <p className="text-xs text-muted-foreground">
                        Próximo passo: {prog.next?.label}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Gauge value={h.score} label="Saúde da conta" className="mx-auto max-w-56" />
                  <p className="-mt-2 text-center font-display text-3xl font-semibold">{h.score}</p>
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {h.reasons.length === 0 ? (
                      <li className="text-success">Uso estável, boa avaliação e sem chamados.</li>
                    ) : (
                      h.reasons.map((r) => (
                        <li key={r} className="flex gap-1.5 text-muted-foreground">
                          <CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                          {r}
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </Panel>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Como os clientes pagam" description="Contas dos últimos 30 dias">
              <ul className="space-y-2.5">
                {u30.methods.map((m) => (
                  <li key={m.method}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{m.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {u30.bills ? Math.round((m.count / u30.bills) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={u30.bills ? (m.count / u30.bills) * 100 : 0} />
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Pico do salão" description="Contas pagas por hora">
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={hours} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="hora" {...axis} interval={1} />
                    <YAxis {...axis} allowDecimals={false} />
                    <Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
                    <Bar
                      dataKey="contas"
                      name="Contas"
                      fill="var(--chart-2)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Últimas contas pagas" description="Mesa, garçom e forma de pagamento">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                      <span className="min-w-0">
                        <span className="block font-medium">
                          Mesa {v.table} · {v.waiter}
                        </span>
                        <span className="text-muted-foreground">
                          {METHOD_LABEL[v.method]} · {relative(v.at)}
                        </span>
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="block font-semibold">{brl(v.amount)}</span>
                        {v.tip > 0 && (
                          <span className="text-success">+{brl(v.tip, 2)} gorjeta</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "implantacao" && (
        <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
          <Panel
            title="Checklist de implantação"
            description="Do contrato à primeira conta paga. A conta é ativada sozinha quando tudo fica pronto."
            className="xl:col-span-2"
          >
            <div className="mb-4 flex items-center gap-3">
              <Progress value={prog.pct} label="Implantação" />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {prog.done}/{prog.total}
              </span>
            </div>
            <ol className="space-y-2">
              {ONBOARDING.map((o, i) => {
                const st = a.onboarding.find((x) => x.key === o.key);
                const done = !!st?.doneAt;
                const locked = o.key === "pagamentos" && a.pagarme !== "aprovada" && !done;
                return (
                  <li
                    key={o.key}
                    className="flex items-center gap-3 rounded-2xl border border-border px-3.5 py-2.5"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {done && st?.doneAt
                          ? `Concluído em ${dateBR(st.doneAt)}${st.doneBy ? ` por ${user(st.doneBy)?.name ?? "sistema"}` : ""}`
                          : locked
                            ? "Precisa da conta de recebimento aprovada (aba Módulos e integrações)."
                            : o.hint}
                      </span>
                    </span>
                    {manage &&
                      !o.auto &&
                      o.key !== "contrato" &&
                      a.status !== "cancelada" &&
                      (done ? (
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run({ type: "reopenOnboardingStep", accountId: a.id, key: o.key })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir
                        </Btn>
                      ) : (
                        <Btn
                          size="sm"
                          disabled={locked}
                          onClick={() =>
                            run(
                              { type: "completeOnboardingStep", accountId: a.id, key: o.key },
                              "Etapa concluída",
                            )
                          }
                        >
                          {locked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Concluir
                        </Btn>
                      ))}
                    {o.auto && !done && <Pill tone="info">Automática</Pill>}
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title="Tarefas da implantação" description="Criadas quando o negócio foi ganho">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="rounded-2xl border border-border px-3 py-2">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {user(t.assigneeId)?.name} · {dateTimeBR(t.dueAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/crm/tarefas"
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Abrir todas as tarefas
            </Link>
          </Panel>
        </div>
      )}

      {tab === "modulos" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Módulos ligados"
            description="O que o restaurante oferece na mesa. Pelo menos uma forma de pagar a conta fica sempre ligada."
            className="xl:col-span-2"
          >
            {(["Pagamento da conta", "Experiência", "Operação"] as const).map((g) => (
              <div key={g} className="mb-4 last:mb-0">
                <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODULES.filter((m) => m.group === g).map((m) => {
                    const on = a.modules.includes(m.key);
                    const blocked =
                      !!m.minPlan &&
                      RESTAURANT_PLAN_ORDER.indexOf(a.plan) <
                        RESTAURANT_PLAN_ORDER.indexOf(m.minPlan);
                    return (
                      <label
                        key={m.key}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3.5 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{m.label}</span>
                          {blocked && m.minPlan && (
                            <span className="block text-xs text-muted-foreground">
                              A partir do plano {restaurantPlan(m.minPlan).name}
                            </span>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          className="h-4 w-4 accent-[var(--brand-primary)]"
                          checked={on}
                          disabled={!manage || (blocked && !on) || a.status === "cancelada"}
                          onChange={(e) =>
                            run({
                              type: "setAccountModule",
                              accountId: a.id,
                              module: m.key,
                              enabled: e.target.checked,
                            })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>
          <div className="space-y-4">
            <Panel title="Integrações" description="PDV e conta de recebimento">
              <div className="space-y-3">
                <Field label={`PDV (${a.pdv.provider})`}>
                  {(fid) => (
                    <Select
                      id={fid}
                      value={a.pdv.status}
                      disabled={!manage}
                      onChange={(e) =>
                        run({
                          type: "setAccountIntegration",
                          accountId: a.id,
                          pdv: e.target.value as PdvStatus,
                        })
                      }
                    >
                      {Object.entries(PDV_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field
                  label="Conta de recebimento"
                  hint="Aprovada, libera a etapa de recebimentos da implantação."
                >
                  {(fid, desc) => (
                    <Select
                      id={fid}
                      aria-describedby={desc}
                      value={a.pagarme}
                      disabled={!manage}
                      onChange={(e) =>
                        run({
                          type: "setAccountIntegration",
                          accountId: a.id,
                          pagarme: e.target.value as PagarmeStatus,
                        })
                      }
                    >
                      {Object.entries(PAGARME_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <p className="text-xs text-muted-foreground">
                  {a.platformRestaurantId
                    ? `Ligada ao restaurante ${a.platformRestaurantId} da plataforma.`
                    : "Ainda não ligada a um restaurante real da plataforma (modo demonstração)."}
                </p>
              </div>
            </Panel>
            {manage && <ManageAccount key={a.id} accountId={a.id} />}
          </div>
        </div>
      )}

      {tab === "clientes" && (
        <Panel
          title="Clientes deste restaurante"
          description="Quem se identificou ao pagar a conta. Telefone sempre mascarado."
          actions={
            <Link
              to="/crm/clientes"
              search={{ conta: a.id }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Abrir no CRM de clientes
            </Link>
          }
          bodyClassName="p-0"
        >
          {profiles.length === 0 ? (
            <div className="p-5">
              <Empty
                icon={Users}
                title="Nenhum cliente identificado"
                text="Os clientes aparecem quando pagam a conta pela Tipe e informam o telefone."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-semibold">Cliente</th>
                    <th className="px-3 py-2.5 font-semibold">Segmento</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Visitas</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Gasto total</th>
                    <th className="px-3 py-2.5 font-semibold">Última visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.slice(0, 12).map((p) => (
                    <tr key={p.consumer.id}>
                      <td className="px-5 py-2.5">
                        <span className="block font-medium">{p.consumer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {maskPhone(p.consumer.phoneLast4)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill>{SEGMENT_LABEL[p.segment]}</Pill>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{brl(p.total)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {relative(p.last)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "suporte" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Chamados deste restaurante" className="xl:col-span-2" bodyClassName="p-0">
            {tickets.length === 0 ? (
              <div className="p-5">
                <Empty
                  icon={LifeBuoy}
                  title="Nenhum chamado"
                  text="Os chamados abertos para este restaurante aparecem aqui e pesam na saúde da conta."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/crm/suporte"
                      search={{ chamado: t.id }}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.category} · {dateTimeBR(t.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <PriorityPill p={t.priority} />
                        <Pill tone={TICKET_STATUS[t.status].tone}>
                          {TICKET_STATUS[t.status].label}
                        </Pill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {can("tickets.write") && <NewTicket accountId={a.id} />}
        </div>
      )}

      {tab === "jornada" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Do lead ao cliente na mesa"
            description="Rastro completo desta conta nas três camadas"
            className="xl:col-span-2"
          >
            <JourneyTimeline steps={journey} />
          </Panel>
          <Panel title="Legenda">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <LayerTag layer="A" withName /> venda da Tipe ao restaurante
              </li>
              <li className="flex items-center gap-2">
                <LayerTag layer="B" withName /> implantação, uso e suporte
              </li>
              <li className="flex items-center gap-2">
                <LayerTag layer="C" withName /> quem paga a conta na mesa
              </li>
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

function ManageAccount({ accountId }: { accountId: string }) {
  const { s, run, members } = useCrm();
  const a = s.accounts.find((x) => x.id === accountId)!;
  const [plan, setPlan] = useState<RestaurantPlan>(a.plan);
  const [tables, setTables] = useState(String(a.tables));
  const [status, setStatus] = useState<"ativa" | "pausada" | "cancelada">(
    a.status === "pausada" ? "pausada" : a.status === "cancelada" ? "cancelada" : "ativa",
  );
  const [reason, setReason] = useState("");
  const eligible = members.filter((m) => m.membership.role !== "viewer");

  return (
    <Panel title="Gestão da conta" description="Plano, status e responsável">
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label="Plano">
            {(fid) => (
              <Select
                id={fid}
                value={plan}
                onChange={(e) => setPlan(e.target.value as RestaurantPlan)}
              >
                {RESTAURANT_PLAN_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {restaurantPlan(p).name} (até {restaurantPlan(p).maxTables} mesas)
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Mesas">
            {(fid) => (
              <TextInput
                id={fid}
                inputMode="numeric"
                value={tables}
                onChange={(e) => setTables(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
        </div>
        <Btn
          variant="outline"
          className="w-full"
          disabled={plan === a.plan && Number(tables) === a.tables}
          onClick={() =>
            run(
              { type: "changeAccountPlan", accountId: a.id, plan, tables: Number(tables) },
              "Plano atualizado",
            )
          }
        >
          Salvar plano
        </Btn>

        <Field label="Responsável de sucesso">
          {(fid) => (
            <Select
              id={fid}
              value={a.csmId}
              onChange={(e) =>
                run(
                  { type: "assignAccountCsm", accountId: a.id, userId: e.target.value },
                  "Responsável trocado",
                )
              }
            >
              {eligible.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {a.status !== "implantacao" && (
          <div className="space-y-2">
            <Field label="Status">
              {(fid) => (
                <Select
                  id={fid}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                >
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="cancelada">Cancelada</option>
                </Select>
              )}
            </Field>
            {status !== "ativa" && (
              <Field label="Motivo">
                {(fid) => (
                  <TextArea
                    id={fid}
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                )}
              </Field>
            )}
            <Btn
              variant="outline"
              className="w-full"
              disabled={status === a.status}
              onClick={() => {
                const r = run(
                  { type: "setAccountStatus", accountId: a.id, status, reason },
                  "Status atualizado",
                );
                if (r.ok) setReason("");
              }}
            >
              Atualizar status
            </Btn>
          </div>
        )}
      </div>
    </Panel>
  );
}

function NewTicket({ accountId }: { accountId: string }) {
  const { run } = useCrm();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  return (
    <Panel title="Abrir chamado" description="Fica ligado a este restaurante">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = run(
            {
              type: "createTicket",
              title,
              description,
              category: "Restaurante",
              priority,
              accountId,
            },
            "Chamado aberto",
          );
          if (r.ok) {
            setTitle("");
            setDescription("");
          }
        }}
      >
        <Field label="Assunto">
          {(fid) => <TextInput id={fid} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label="O que aconteceu">
          {(fid) => (
            <TextArea
              id={fid}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <Field label="Prioridade">
          {(fid) => (
            <Select
              id={fid}
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </Select>
          )}
        </Field>
        <Btn type="submit" className="w-full">
          <LifeBuoy className="h-3.5 w-3.5" />
          Abrir chamado
        </Btn>
      </form>
    </Panel>
  );
}
