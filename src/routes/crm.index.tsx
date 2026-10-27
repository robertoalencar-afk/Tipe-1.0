import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Clock3,
  Filter,
  LifeBuoy,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { CountChip, Gauge, HealthPill, LayerTag, layerOf } from "@/components/tipe/crm/eco";
import { openGlobalSearch } from "@/components/tipe/crm/Shell";
import {
  Avatar,
  axis,
  brl,
  brlShort,
  Btn,
  chartTooltip,
  DeltaBadge,
  Panel,
  relative,
  timeBR,
} from "@/components/tipe/crm/ui";
import {
  accountHealth,
  accountsByNeighborhood,
  dailySeries,
  isSiteSource,
  journeyCounts,
  lastDays,
  onboardingProgress,
  orgVisits,
  usageSummary,
} from "@/lib/tipe/crm/ecosystem";
import { dashboard, periodRange, previousRange } from "@/lib/tipe/crm/metrics";

export const Route = createFileRoute("/crm/")({ component: Painel });

const DAY = 864e5;

function pct(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function greeting(now: string) {
  const h = (new Date(now).getUTCHours() + 21) % 24;
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Painel() {
  const { s, org, me, can, run, openCreate, user } = useCrm();
  const d = useOrgData();
  const now = useMemo(() => new Date().toISOString(), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = new Date(now).getTime();

  const j = useMemo(() => journeyCounts(s, org.id, now), [s, org.id, now]);
  const month = periodRange("mes", now);
  const m = useMemo(() => dashboard(s, { orgId: org.id }, month, now), [s, org.id, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const mPrev = useMemo(
    () => dashboard(s, { orgId: org.id }, previousRange(month), month.from),
    [s, org.id, now], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const v30 = useMemo(() => orgVisits(s, org.id, lastDays(30, now)), [s, org.id, now]);
  const vPrev = useMemo(
    () => orgVisits(s, org.id, { from: t - 60 * DAY, to: t - 30 * DAY }),
    [s, org.id, t],
  );
  const usage = usageSummary(v30);
  const activeBefore = d.accounts.filter(
    (a) =>
      a.activatedAt &&
      new Date(a.activatedAt).getTime() < t - 30 * DAY &&
      (a.status !== "cancelada" || new Date(a.statusChangedAt ?? now).getTime() > t - 30 * DAY),
  ).length;

  const health = useMemo(
    () => d.accounts.map((a) => ({ a, h: accountHealth(s, a, now) })),
    [s, d.accounts, now],
  );
  const scored = health.filter((x) => x.h.score !== null);
  const avgHealth = scored.length
    ? Math.round(scored.reduce((a, x) => a + (x.h.score ?? 0), 0) / scored.length)
    : 0;
  const attention = [
    ...health
      .filter((x) => x.h.label === "Em risco" || x.h.label === "Atenção")
      .sort((x, y) => (x.h.score ?? 0) - (y.h.score ?? 0)),
    ...health.filter((x) => x.a.status === "implantacao"),
  ].slice(0, 5);

  const siteNew = d.leads.filter((l) => isSiteSource(l.source) && l.status === "novo");
  const unread = d.conversations.reduce((a, c) => a + (c.status !== "encerrada" ? c.unread : 0), 0);
  const accTickets = d.tickets.filter((x) => x.accountId && x.status !== "resolvido").length;

  // Agenda: tarefas e reuniões de hoje (minhas primeiro).
  const dayStart = new Date(now);
  dayStart.setUTCHours(3, 0, 0, 0);
  if (dayStart.getTime() > t) dayStart.setTime(dayStart.getTime() - DAY);
  const today = d.tasks
    .filter(
      (x) =>
        x.status !== "concluida" &&
        new Date(x.dueAt).getTime() >= dayStart.getTime() &&
        new Date(x.dueAt).getTime() < dayStart.getTime() + DAY,
    )
    .sort((a, b) =>
      a.assigneeId === me.id && b.assigneeId !== me.id
        ? -1
        : b.assigneeId === me.id && a.assigneeId !== me.id
          ? 1
          : a.dueAt.localeCompare(b.dueAt),
    );
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(dayStart.getTime() + (i - 3) * DAY + 4 * 36e5);
    const from = dayStart.getTime() + (i - 3) * DAY;
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      n: day.getUTCDate(),
      count: d.tasks.filter((x) => {
        const due = new Date(x.dueAt).getTime();
        return x.status !== "concluida" && due >= from && due < from + DAY;
      }).length,
      today: i === 3,
    };
  });

  const bars = [
    { etapa: "Leads", valor: j.leads, camada: "A" },
    { etapa: "Qualificados", valor: j.qualified, camada: "A" },
    { etapa: "Negócios", valor: j.deals, camada: "A" },
    { etapa: "Ganhos", valor: j.won, camada: "A" },
    { etapa: "Implantação", valor: j.onboarding, camada: "B" },
    { etapa: "Ativos", valor: j.active, camada: "B" },
  ];
  const series = useMemo(() => dailySeries(v30, 14, now), [v30, now]);
  const hoods = accountsByNeighborhood(d.accounts);
  const topHood = hoods[0];
  const recent = d.activities.slice(0, 7);

  return (
    <div className="space-y-4">
      {/* Linha 1: busca e números principais */}
      <section className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {greeting(now)}, {me.name.split(" ")[0]} · {org.name}
          </p>
          <button
            type="button"
            onClick={openGlobalSearch}
            className="group mt-1 flex w-full max-w-xl items-center justify-between gap-3 border-b border-border pb-2 text-left"
            aria-label="Buscar restaurante, lead ou cliente"
          >
            <h1 className="truncate font-display text-[1.7rem] font-medium tracking-tight text-foreground/90 sm:text-[2.1rem]">
              Buscar restaurante, lead…
            </h1>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card shadow-xs ring-1 ring-border group-hover:bg-muted">
              <Search className="h-4 w-4" />
            </span>
          </button>
        </div>
        <dl className="grid grid-cols-3 gap-4 sm:gap-8">
          <BigStat
            label="Receita contratada no mês"
            value={brlShort(m.revenueWon)}
            delta={pct(m.revenueWon, mPrev.revenueWon)}
          />
          <BigStat
            label="Restaurantes ativos"
            value={String(j.active)}
            delta={pct(j.active, activeBefore)}
          />
          <BigStat
            label="Contas pagas em 30 dias"
            value={v30.length.toLocaleString("pt-BR")}
            delta={pct(v30.length, vPrev.length)}
          />
        </dl>
      </section>

      {/* Linha 2: saúde, lista de espera, agenda e mapa */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Panel
          className="xl:col-span-4"
          title="Saúde da carteira"
          actions={
            <Link
              to="/crm/contas"
              aria-label="Abrir contas de restaurante"
              className="grid h-8 w-8 place-items-center rounded-full bg-muted hover:bg-accent"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid grid-cols-[auto_1fr] items-end gap-3">
            <div>
              <p className="text-[0.7rem] text-muted-foreground">Nota média das contas ativas</p>
              <p className="flex items-center gap-2">
                <span className="money font-display text-[2.6rem] font-semibold leading-none">
                  {avgHealth}
                </span>
                <HealthPill
                  h={{
                    score: null,
                    reasons: [],
                    label: avgHealth >= 70 ? "Saudável" : avgHealth >= 45 ? "Atenção" : "Em risco",
                    tone: avgHealth >= 70 ? "success" : avgHealth >= 45 ? "warning" : "danger",
                  }}
                />
              </p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                {scored.length} contas avaliadas
              </p>
            </div>
            <Gauge
              value={avgHealth}
              label="Saúde média da carteira"
              className="max-w-[210px] justify-self-end"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CountChip
              icon={<Filter className="h-4 w-4" />}
              label="Leads novos do site"
              count={siteNew.length}
              to="/crm/leads"
            />
            <CountChip
              icon={<MessageCircle className="h-4 w-4" />}
              label="Mensagens não lidas"
              count={unread}
              to="/crm/atendimento"
            />
            <CountChip
              icon={<Store className="h-4 w-4" />}
              label="Implantações em curso"
              count={j.onboarding}
              to="/crm/contas"
            />
            <CountChip
              icon={<LifeBuoy className="h-4 w-4" />}
              label="Chamados de restaurantes"
              count={accTickets}
              to="/crm/suporte"
            />
          </div>
        </Panel>

        <section className="relative flex min-h-[15rem] flex-col overflow-hidden rounded-[1.25rem] bg-primary p-5 text-primary-foreground xl:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-[0.95rem] font-semibold leading-tight">
              Lista de espera do site
            </h2>
            <Link
              to="/crm/leads"
              aria-label="Abrir leads"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/30 hover:bg-white/45"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-primary-foreground/75">
            Cadastros de tipe.digital esperando o primeiro contato
          </p>
          {can("leads.write") && (
            <button
              type="button"
              onClick={() => run({ type: "simulateSiteLead" })}
              className="mt-3 inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-card/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Simular cadastro
            </button>
          )}
          <p className="money mt-auto font-display text-[4.2rem] font-semibold leading-none tracking-tight">
            {siteNew.length}
          </p>
        </section>

        <Panel
          className="xl:col-span-3"
          title="Agenda de hoje"
          actions={
            can("tasks.write") ? (
              <button
                type="button"
                onClick={() => openCreate("task")}
                aria-label="Nova tarefa"
                className="grid h-8 w-8 place-items-center rounded-full bg-muted hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : undefined
          }
        >
          {today.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nada marcado para hoje.
            </p>
          ) : (
            <ul className="space-y-2">
              {today.slice(0, 3).map((x) => (
                <li key={x.id}>
                  <Link
                    to="/crm/tarefas"
                    search={{ tarefa: x.id }}
                    className="block rounded-2xl bg-muted/70 p-3 hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground ring-1 ring-border">
                      <Clock3 className="h-3 w-3" />
                      {timeBR(x.dueAt)}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[0.8rem] font-medium leading-snug">
                      {x.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
                      {user(x.assigneeId)?.name.split(" ")[0]}
                      {x.accountId ? " · implantação" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-3"
          title="Restaurantes por bairro"
          bodyClassName="p-0"
          actions={
            <Link
              to="/crm/contas"
              aria-label="Abrir contas"
              className="grid h-8 w-8 place-items-center rounded-full bg-muted hover:bg-accent"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <NeighborhoodMap hoods={hoods} />
          {topHood && (
            <div className="relative mx-4 -mt-12 mb-4 flex items-center gap-3 rounded-full bg-card p-1.5 pr-2 shadow-xs ring-1 ring-border">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </span>
              <span className="money font-display text-2xl font-semibold leading-none">
                {topHood.count}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.7rem] leading-tight text-muted-foreground">
                restaurantes
                <br />
                {topHood.name}
              </span>
              <Link
                to="/crm/contas"
                aria-label="Ver contas"
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          {hoods.length > 1 && (
            <ul className="space-y-1.5 px-5 pb-5 text-xs">
              {hoods.slice(1, 4).map((n) => (
                <li key={n.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">{n.name}</span>
                  <span className="font-semibold tabular-nums">{n.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Linha 3: jornada, agenda da semana e pulso da operação */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Panel
          className="md:col-span-2 xl:col-span-5"
          title="Do lead ao restaurante ativo"
          description="Comercial (hachurado) e contas de restaurante (turquesa), todos os tempos"
          actions={
            <Link to="/crm/jornada" className="text-xs font-semibold text-primary hover:underline">
              Ver jornada
            </Link>
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ left: -18, right: 4, top: 22 }}>
                <defs>
                  <pattern
                    id="hatch-a"
                    width="7"
                    height="7"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="7" height="7" fill="var(--muted)" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="7"
                      stroke="var(--chart-2)"
                      strokeOpacity="0.3"
                      strokeWidth="2.5"
                    />
                  </pattern>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="etapa"
                  {...axis}
                  interval={0}
                  tickFormatter={(v: string) => v.slice(0, 11)}
                />
                <YAxis {...axis} width={40} allowDecimals={false} />
                <Tooltip
                  {...chartTooltip}
                  formatter={(v: number, _n, p) => [
                    v,
                    p.payload.camada === "A" ? "Comercial" : "Restaurantes",
                  ]}
                />
                <Bar dataKey="valor" radius={[14, 14, 14, 14]} maxBarSize={44}>
                  {bars.map((b) => (
                    <Cell
                      key={b.etapa}
                      fill={b.camada === "A" ? "url(#hatch-a)" : "var(--chart-1)"}
                    />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          title="Semana"
          description={new Date(now).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        >
          <ol className="grid grid-cols-7 gap-1 text-center">
            {week.map((w) => (
              <li
                key={`${w.label}${w.n}`}
                className={
                  w.today
                    ? "rounded-2xl bg-secondary py-2 text-secondary-foreground"
                    : "rounded-2xl py-2"
                }
              >
                <span className="block text-[0.62rem] capitalize opacity-70">{w.label}</span>
                <span className="money block font-display text-sm font-semibold">{w.n}</span>
                <span
                  className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${w.count ? (w.today ? "bg-primary" : "bg-highlight") : "bg-transparent"}`}
                  aria-label={`${w.count} tarefas`}
                />
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-[1.1rem] bg-secondary p-4 text-secondary-foreground">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Hoje</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem]">
                {today.length} na agenda
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {today.slice(0, 3).map((x) => (
                <li key={x.id} className="flex items-center gap-2 text-xs">
                  <span className="money w-11 shrink-0 text-white/60">{timeBR(x.dueAt)}</span>
                  <span className="truncate">{x.title}</span>
                </li>
              ))}
              {!today.length && <li className="text-xs text-white/60">Agenda livre.</li>}
            </ul>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-3"
          title="Pulso da operação"
          description="Contas pagas pela Tipe, últimos 14 dias"
        >
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="pulse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip {...chartTooltip} formatter={(v: number) => [v, "Contas pagas"]} />
                <Area
                  dataKey="contas"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#pulse)"
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Volume" value={brlShort(usage.gmv)} />
            <MiniStat label="Gorjetas" value={brlShort(usage.tips)} />
            <MiniStat
              label="Avaliação"
              value={usage.rating === null ? "—" : usage.rating.toFixed(1).replace(".", ",")}
            />
          </dl>
        </Panel>
      </section>

      {/* Linha 4: contas que pedem atenção e atividade das três camadas */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Contas que pedem atenção"
          description="Saúde em queda e implantações em andamento"
          bodyClassName="px-2 pb-3 pt-2"
        >
          <ul>
            {attention.map(({ a, h }) => {
              const prog = onboardingProgress(a);
              return (
                <li key={a.id}>
                  <Link
                    to="/crm/contas/$id"
                    params={{ id: a.id }}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted"
                  >
                    <Avatar name={a.name} className="h-9 w-9 text-[0.65rem]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.status === "implantacao"
                          ? `Implantação ${prog.done}/${prog.total}${prog.next ? ` · próximo: ${prog.next.label}` : ""}`
                          : h.reasons.join(" · ") || a.neighborhood}
                      </span>
                    </span>
                    <HealthPill h={h} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel
          title="Atividade do ecossistema"
          description="Comercial, restaurantes e clientes na mesma linha do tempo"
          bodyClassName="px-2 pb-3 pt-2"
        >
          <ul>
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl px-3 py-2">
                <LayerTag layer={layerOf(a.kind)} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[0.82rem]">{a.summary}</span>
                  <span className="text-[0.68rem] text-muted-foreground">
                    {user(a.actorId)?.name.split(" ")[0]} · {relative(a.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {can("accounts.manage") && (
            <div className="mt-2 flex justify-end px-3">
              <Btn asChild variant="outline">
                <Link to="/crm/jornada">
                  <Sparkles className="h-3.5 w-3.5" />
                  Simular a jornada completa
                </Link>
              </Btn>
            </div>
          )}
        </Panel>
      </section>
      <p className="text-center text-[0.68rem] text-muted-foreground">
        Valores em {brl(0).replace(/\s?0$/, "")} calculados dos registros desta organização. Contas
        pagas e clientes vêm da operação da Tipe no salão (simulada nesta demonstração).
      </p>
    </div>
  );
}

function BigStat({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5">
        <span className="money font-display text-[1.6rem] font-semibold leading-none tracking-tight sm:text-[2.2rem]">
          {value}
        </span>
        {delta !== null && <DeltaBadge value={delta} good={delta >= 0} />}
      </dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 py-2">
      <dt className="text-[0.62rem] text-muted-foreground">{label}</dt>
      <dd className="money font-display text-sm font-semibold">{value}</dd>
    </div>
  );
}

/** Mapa estilizado (ruas abstratas) com um pino por bairro. Não é um mapa real. */
function NeighborhoodMap({ hoods }: { hoods: { name: string; count: number }[] }) {
  const pos = (name: string, i: number) => {
    const h = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return { x: 30 + (h % 240), y: 22 + ((h >>> 8) % 70) + (i % 2) * 8 };
  };
  return (
    <svg
      viewBox="0 0 300 150"
      className="h-44 w-full"
      role="img"
      aria-label="Restaurantes por bairro"
    >
      <rect width="300" height="150" fill="var(--muted)" opacity="0.6" />
      {[18, 52, 90, 128].map((y) => (
        <path
          key={y}
          d={`M0 ${y} C 80 ${y - 10}, 180 ${y + 12}, 300 ${y - 4}`}
          stroke="var(--card)"
          strokeWidth="7"
          fill="none"
        />
      ))}
      {[40, 110, 190, 255].map((x) => (
        <path
          key={x}
          d={`M${x} 0 L ${x + 18} 150`}
          stroke="var(--card)"
          strokeWidth="6"
          fill="none"
        />
      ))}
      <rect x="128" y="62" width="34" height="26" rx="3" fill="none" stroke="var(--border)" />
      {hoods.slice(0, 8).map((n, i) => {
        const p = pos(n.name, i);
        const r = 6 + Math.min(n.count, 5) * 1.6;
        return (
          <g key={n.name}>
            <circle cx={p.x} cy={p.y} r={r + 5} fill="var(--brand-primary)" opacity="0.18" />
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill="var(--brand-primary)"
              stroke="var(--card)"
              strokeWidth="2"
            />
            <text
              x={p.x}
              y={p.y + 3.5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="var(--secondary)"
            >
              {n.count}
            </text>
            <title>{`${n.name}: ${n.count}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
