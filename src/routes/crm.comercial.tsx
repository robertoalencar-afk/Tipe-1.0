import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlarmClock,
  BadgeDollarSign,
  CircleCheck,
  Clock3,
  Filter,
  Gauge,
  Inbox,
  Layers,
  Percent,
  Receipt,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  Avatar,
  axis,
  brl,
  brlShort,
  chartTooltip,
  Empty,
  Kpi,
  PageHeader,
  Panel,
  Pill,
  Progress,
  relative,
  Segmented,
  Select,
} from "@/components/tipe/crm/ui";
import {
  conversionFunnel,
  dashboard,
  goalProgress,
  goalTimeline,
  METRIC_LABEL,
  periodRange,
  previousRange,
  salesByMonth,
  stageDistribution,
  teamPerformance,
} from "@/lib/tipe/crm/metrics";

export const Route = createFileRoute("/crm/comercial")({ component: Dashboard });

type Period = "mes" | "30d" | "trimestre" | "ano";
const PERIODS: { value: Period; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "30d", label: "30 dias" },
  { value: "trimestre", label: "90 dias" },
  { value: "ano", label: "12 meses" },
];

function delta(cur: number | null, prev: number | null, higherIsGood = true) {
  if (cur === null || prev === null || prev === 0) return null;
  const v = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return { value: v, good: higherIsGood ? v >= 0 : v <= 0 };
}

function Dashboard() {
  const { s, org, me, members, user, role } = useCrm();
  const data = useOrgData();
  const [period, setPeriod] = useState<Period>("mes");
  const [who, setWho] = useState(role === "seller" ? me.id : "");
  const now = new Date().toISOString();
  const [ownerId, teamId] = who.startsWith("team:")
    ? [undefined, who.slice(5)]
    : [who || undefined, undefined];
  const scope = { orgId: org.id, ownerId, teamId };
  const range = periodRange(period, now);

  const m = useMemo(() => dashboard(s, scope, range, now), [s, org.id, who, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(
    () => dashboard(s, scope, previousRange(range), range.from),
    [s, org.id, who, period],
  );
  const sales = useMemo(() => salesByMonth(s, scope, now, 6), [s, org.id, who]); // eslint-disable-line react-hooks/exhaustive-deps
  const funnel = useMemo(() => conversionFunnel(s, scope, range), [s, org.id, who, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const pipeline = data.pipelines[0];
  const dist = useMemo(
    () => (pipeline ? stageDistribution(s, scope, pipeline) : []),
    [s, pipeline, who],
  );
  const team = useMemo(() => teamPerformance(s, org.id, range), [s, org.id, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentPeriod = now.slice(0, 7);
  const timeline = useMemo(() => goalTimeline(s, org.id, currentPeriod, now), [s, org.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const goals = data.goals
    .filter((g) => g.period === currentPeriod)
    .map((g) => ({ g, ...goalProgress(s, g) }));
  const teamGoal = goals.find((x) => x.g.scope === "equipe" && x.g.metric === "receita");
  const recent = data.activities.slice(0, 9);
  const hasData = data.deals.length + data.leads.length + data.contacts.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Camada A · ${org.name}`}
        title="Painel comercial"
        description="Venda da Tipe para restaurantes: leads, oportunidades, metas e atendimento, calculados dos registros desta organização."
        actions={
          <>
            <Select
              aria-label="Filtrar por pessoa ou equipe"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="h-8 w-auto min-w-40 text-xs"
            >
              <option value="">Toda a organização</option>
              {data.teams.map((t) => (
                <option key={t.id} value={`team:${t.id}`}>
                  Equipe {t.name}
                </option>
              ))}
              {members
                .filter((x) => x.membership.role !== "viewer")
                .map(({ user: u }) => (
                  <option key={u.id} value={u.id}>
                    {u.id === me.id ? `${u.name} (eu)` : u.name}
                  </option>
                ))}
            </Select>
            <Segmented label="Período" value={period} onChange={setPeriod} options={PERIODS} />
          </>
        }
      />

      {!hasData ? (
        <Empty
          icon={Gauge}
          title="Organização sem dados ainda"
          text="Cadastre contatos, leads e oportunidades: o painel se monta sozinho a partir deles."
          action={
            <Link to="/crm/contatos" className="text-xs font-semibold text-primary hover:underline">
              Cadastrar o primeiro contato
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi
              icon={BadgeDollarSign}
              tone="success"
              label="Receita conquistada"
              value={brlShort(m.revenueWon)}
              delta={delta(m.revenueWon, prev.revenueWon)}
              hint="vs. período anterior"
              help="Soma das oportunidades ganhas no período (contrato anual)."
            />
            <Kpi
              icon={TrendingUp}
              label="Receita projetada"
              value={brlShort(m.revenueProjected)}
              hint="ponderada pela probabilidade"
              help="Soma de valor × probabilidade das oportunidades abertas."
            />
            <Kpi
              icon={Layers}
              label="Valor do pipeline"
              value={brlShort(m.pipelineValue)}
              hint={`${m.openDeals} oportunidades abertas`}
            />
            <Kpi
              icon={Filter}
              label="Leads ativos"
              value={String(m.activeLeads)}
              hint="novos, contatados e qualificados"
            />
            <Kpi
              icon={UserPlus}
              label="Novos contatos"
              value={String(m.newContacts)}
              delta={delta(m.newContacts, prev.newContacts)}
              hint="no período"
            />
            <Kpi
              icon={Percent}
              label="Taxa de conversão"
              value={m.conversionRate === null ? "—" : `${m.conversionRate}%`}
              delta={delta(m.conversionRate, prev.conversionRate)}
              hint="ganhas ÷ encerradas"
              help="Oportunidades ganhas divididas pelas ganhas mais perdidas no período."
            />
            <Kpi
              icon={Receipt}
              label="Ticket médio"
              value={m.avgTicket === null ? "—" : brlShort(m.avgTicket)}
              hint="por negócio ganho"
            />
            <Kpi
              icon={CircleCheck}
              label="Ganhos e perdidos"
              value={`${m.won} / ${m.lost}`}
              delta={delta(m.won, prev.won)}
              hint="no período"
            />
            <Kpi
              icon={AlarmClock}
              tone={m.overdueTasks ? "warning" : "default"}
              label="Tarefas atrasadas"
              value={String(m.overdueTasks)}
              hint={m.overdueTasks ? "pedem atenção hoje" : "nada atrasado"}
            />
            <Kpi
              icon={Inbox}
              label="Conversas abertas"
              value={String(m.openConversations)}
              hint={`${m.unread} mensagens não lidas`}
            />
            <Kpi
              icon={Clock3}
              tone={
                m.avgResponseMin !== null && m.avgResponseMin > org.settings.responseSlaMin
                  ? "warning"
                  : "default"
              }
              label="Tempo de resposta"
              value={m.avgResponseMin === null ? "—" : `${m.avgResponseMin} min`}
              hint={`meta: ${org.settings.responseSlaMin} min`}
              help="Média entre a primeira mensagem do cliente e a primeira resposta da equipe."
            />
            <Kpi
              icon={Target}
              tone={teamGoal?.hit ? "success" : "default"}
              label="Meta do mês"
              value={teamGoal ? `${teamGoal.pct}%` : "—"}
              hint={
                teamGoal
                  ? `${brlShort(teamGoal.value)} de ${brlShort(teamGoal.g.target)}`
                  : "sem meta de equipe"
              }
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <Panel
              title="Evolução das vendas"
              description="Receita ganha por mês e meta de equipe"
              className="xl:col-span-2"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sales} margin={{ left: -8, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis
                      {...axis}
                      width={56}
                      tickFormatter={(v: number) => brlShort(v).replace("R$ ", "")}
                    />
                    <Tooltip
                      {...chartTooltip}
                      formatter={(v: number, n: string) => [
                        brl(v),
                        n === "receita" ? "Receita" : "Meta",
                      ]}
                    />
                    <Bar
                      dataKey="receita"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Line
                      dataKey="meta"
                      stroke="var(--chart-3)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                      type="monotone"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title="Metas comerciais"
              description={`Mês atual · ${goals.length} metas`}
              actions={
                <Link to="/crm/gamificacao" className="text-xs text-primary hover:underline">
                  Ver metas
                </Link>
              }
            >
              {goals.length === 0 ? (
                <Empty
                  icon={Target}
                  title="Sem metas neste mês"
                  text="Gestores criam metas em Gamificação."
                />
              ) : (
                <ul className="space-y-3.5">
                  {goals.map(({ g, value, pct, hit }) => (
                    <li key={g.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate">
                          {g.scope === "equipe"
                            ? `Equipe ${data.teams.find((t) => t.id === g.teamId)?.name ?? ""}`
                            : user(g.userId)?.name}
                          <span className="text-muted-foreground"> · {METRIC_LABEL[g.metric]}</span>
                        </span>
                        <span className="money shrink-0 font-semibold">
                          {g.metric === "receita"
                            ? `${brlShort(value)} / ${brlShort(g.target)}`
                            : `${value} / ${g.target}`}
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        tone={hit ? "success" : pct < 40 ? "warning" : "primary"}
                        label={`Meta ${pct}%`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Funil de conversão" description="Do lead ao negócio ganho, no período">
              <ul className="space-y-2">
                {funnel.map((f, i) => {
                  const pct = funnel[0]?.value ? Math.round((f.value / funnel[0].value) * 100) : 0;
                  return (
                    <li
                      key={f.stage}
                      className="grid grid-cols-[9.5rem_1fr_2rem] items-center gap-2 text-xs"
                    >
                      <span className="truncate text-muted-foreground">{f.stage}</span>
                      <span className="h-6 overflow-hidden rounded-md bg-muted">
                        <span
                          className="block h-full rounded-md"
                          style={{
                            width: `${Math.max(pct, f.value ? 4 : 0)}%`,
                            background: `color-mix(in oklab, var(--chart-1) ${100 - i * 14}%, var(--chart-2))`,
                          }}
                        />
                      </span>
                      <span className="money text-right font-semibold">{f.value}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel
              title="Distribuição por etapa"
              description={pipeline ? `${pipeline.name} · oportunidades abertas` : "Sem funil"}
              actions={
                <Link to="/crm/oportunidades" className="text-xs text-primary hover:underline">
                  Abrir funil
                </Link>
              }
            >
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dist} margin={{ left: -16, right: 4 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      {...axis}
                      interval={0}
                      tickFormatter={(v: string) => v.split(" ")[0] ?? v}
                    />
                    <YAxis
                      {...axis}
                      width={44}
                      tickFormatter={(v: number) => brlShort(v).replace("R$ ", "")}
                    />
                    <Tooltip
                      {...chartTooltip}
                      formatter={(v: number, _n, p) => [
                        `${brl(v)} · ${p.payload.quantidade} oport.`,
                        "Valor",
                      ]}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={34}>
                      {dist.map((d, i) => (
                        <Cell
                          key={d.stageId}
                          fill={`color-mix(in oklab, var(--chart-2) ${100 - i * 15}%, var(--chart-1))`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title="Ranking da equipe"
              description="Pontos de desempenho no período"
              actions={
                <Link to="/crm/gamificacao" className="text-xs text-primary hover:underline">
                  Gamificação
                </Link>
              }
              className="lg:col-span-2 xl:col-span-1"
            >
              <ol className="space-y-2.5">
                {team.slice(0, 6).map((p, i) => (
                  <li key={p.userId} className="flex items-center gap-2.5 text-xs">
                    <span className="money w-4 text-right font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <Avatar name={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {p.name}
                        {p.userId === me.id && (
                          <span className="text-muted-foreground"> (você)</span>
                        )}
                      </span>
                      <span className="block truncate text-[0.68rem] text-muted-foreground">
                        {p.ganhos} ganhos · {brlShort(p.receita)} · {p.tarefas} tarefas
                      </span>
                    </span>
                    <Pill tone={i === 0 ? "primary" : "neutral"}>{p.xp} pts</Pill>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Desempenho da equipe" description="Receita ganha por pessoa no período">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={team.filter((t) => t.role !== "agent")}
                    layout="vertical"
                    margin={{ left: 8, right: 12 }}
                  >
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      {...axis}
                      tickFormatter={(v: number) => brlShort(v).replace("R$ ", "")}
                    />
                    <YAxis type="category" dataKey="first" {...axis} width={64} />
                    <Tooltip {...chartTooltip} formatter={(v: number) => [brl(v), "Receita"]} />
                    <Bar
                      dataKey="receita"
                      fill="var(--chart-1)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title="Evolução da meta"
              description={
                timeline.target
                  ? `Acumulado do mês vs. ritmo ideal para ${brlShort(timeline.target)}`
                  : "Sem meta de receita de equipe neste mês"
              }
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline.points} margin={{ left: -8, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" {...axis} interval={4} />
                    <YAxis
                      {...axis}
                      width={56}
                      tickFormatter={(v: number) => brlShort(v).replace("R$ ", "")}
                    />
                    <Tooltip
                      {...chartTooltip}
                      formatter={(v: number, n: string) => [
                        brl(v),
                        n === "realizado" ? "Realizado" : "Ritmo ideal",
                      ]}
                      labelFormatter={(d) => `Dia ${d}`}
                    />
                    <Area
                      dataKey="ideal"
                      stroke="var(--chart-3)"
                      strokeDasharray="4 4"
                      fill="none"
                      strokeWidth={1.5}
                    />
                    <Area
                      dataKey="realizado"
                      stroke="var(--chart-1)"
                      fill="url(#gMeta)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title="Atividades recentes"
              description="O que mudou na organização"
              className="lg:col-span-2 xl:col-span-1"
              bodyClassName="p-0"
            >
              {recent.length === 0 ? (
                <div className="p-4">
                  <Empty
                    icon={Activity}
                    title="Sem atividade"
                    text="As ações da equipe aparecem aqui."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((a) => (
                    <li key={a.id} className="flex gap-2.5 px-4 py-2.5 text-xs">
                      <Avatar
                        name={user(a.actorId)?.name ?? "?"}
                        className="h-6 w-6 text-[0.55rem]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2">{a.summary}</span>
                        <span className="text-[0.68rem] text-muted-foreground">
                          {user(a.actorId)?.name.split(" ")[0]} · {relative(a.at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
