import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Flag, Medal, Plus, Target, Trash2, Trophy, Zap } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  Avatar,
  axis,
  brl,
  Btn,
  chartTooltip,
  ConfirmAction,
  dateBR,
  Empty,
  Field,
  Hint,
  IconBtn,
  PageHeader,
  Panel,
  Pill,
  Progress,
  relative,
  Segmented,
  Select,
  TextArea,
  TextInput,
} from "@/components/tipe/crm/ui";
import {
  achievements,
  goalProgress,
  levelFor,
  LEVELS,
  METRIC_LABEL,
  metricValue,
  periodRange,
  previousRange,
  teamPerformance,
  xpTotal,
} from "@/lib/tipe/crm/metrics";
import { ROLE_LABEL } from "@/lib/tipe/crm/permissions";
import type { Challenge, GoalMetric, XpKind } from "@/lib/tipe/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crm/gamificacao")({ component: Gamificacao });

const XP_LABEL: Record<XpKind, string> = {
  lead_qualificado: "Lead qualificado",
  tarefa_concluida: "Tarefa concluída",
  reuniao_realizada: "Reunião realizada",
  oportunidade_ganha: "Oportunidade ganha",
  meta_atingida: "Meta atingida",
  desafio_concluido: "Desafio concluído",
};
const fmtMetric = (m: GoalMetric | "reunioes", v: number) => (m === "receita" ? brl(v) : String(v));

function Gamificacao() {
  const { s, org, me, role, members, can, run, user } = useCrm();
  const d = useOrgData();
  const now = useMemo(() => new Date().toISOString(), []);
  const [period, setPeriod] = useState<"mes" | "trimestre" | "ano">("mes");
  const [goalOpen, setGoalOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const range = periodRange(period, now);
  const prev = previousRange(range);
  const myXp = xpTotal(s, org.id, me.id);
  const level = levelFor(myXp);
  const periodXp = xpTotal(s, org.id, me.id, range);
  const prevXp = xpTotal(s, org.id, me.id, prev);
  const ranking = teamPerformance(s, org.id, range);
  const prevRanking = teamPerformance(s, org.id, prev);
  const myPos = ranking.findIndex((r) => r.userId === me.id) + 1;
  const month = now.slice(0, 7);
  const goals = d.goals.filter((g) => g.period === month);
  const challenges = d.challenges
    .filter((c) => c.endsAt >= now)
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  const badges = achievements(s, org.id, me);
  const history = d.xp
    .filter((e) => e.userId === me.id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  const evolution = useMemo(() => {
    const n = new Date(now);
    const people = members.filter((m) => m.membership.role !== "viewer");
    return Array.from({ length: 6 }, (_, k) => {
      const i = 5 - k;
      const from = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - i, 1)).toISOString();
      const to = new Date(
        Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - i + 1, 1) - 1,
      ).toISOString();
      const r = { from, to };
      const team = people.reduce((a, p) => a + xpTotal(s, org.id, p.user.id, r), 0);
      return {
        label: new Date(from)
          .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
          .replace(".", ""),
        voce: xpTotal(s, org.id, me.id, r),
        media: people.length ? Math.round(team / people.length) : 0,
      };
    });
  }, [s, org.id, me.id, members, now]);

  const delta = prevXp ? Math.round(((periodXp - prevXp) / Math.abs(prevXp)) * 100) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gamificação"
        description="Pontos vêm só de fatos reais: lead qualificado, tarefa concluída, reunião feita, venda ganha, meta e desafio. Cada fato pontua uma vez."
        actions={
          <Segmented
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "mes", label: "Mês" },
              { value: "trimestre", label: "90 dias" },
              { value: "ano", label: "12 meses" },
            ]}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} className="h-12 w-12 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{me.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[role]} · {myPos ? `${myPos}º no ranking do período` : "fora do ranking"}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-muted-foreground">Nível {level.level}</p>
              <p className="font-display text-sm font-semibold text-primary">{level.name}</p>
            </div>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {myXp.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-normal text-muted-foreground">pontos no total</span>
            </p>
            <Progress value={level.pct} className="mt-2" label="Progresso até o próximo nível" />
            <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
              {level.next !== null
                ? `Faltam ${(level.next - myXp).toLocaleString("pt-BR")} pontos para ${LEVELS[level.level]?.name}.`
                : "Nível máximo alcançado."}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <dt className="text-muted-foreground">No período</dt>
              <dd className="font-display text-lg font-semibold tabular-nums">{periodXp}</dd>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <dt className="text-muted-foreground">Período anterior</dt>
              <dd className="font-display text-lg font-semibold tabular-nums">
                {prevXp}
                {delta !== null && (
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      delta >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}%
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Evolução mensal"
          description="Seus pontos por mês e a média da equipe"
          className="lg:col-span-2"
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={40} />
                <Tooltip
                  {...chartTooltip}
                  formatter={(v: number, n: string) => [
                    `${v} pontos`,
                    n === "voce" ? "Você" : "Média da equipe",
                  ]}
                />
                <Bar dataKey="voce" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  dataKey="media"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex gap-4 text-[0.68rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[var(--chart-1)]" />
              Você
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-[var(--chart-3)]" />
              Média da equipe
            </span>
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Ranking"
          description="Ordenado por pontos; empate decide por receita"
          bodyClassName="p-0"
        >
          <ol className="divide-y divide-border">
            {ranking.map((r, i) => {
              const before = prevRanking.findIndex((p) => p.userId === r.userId) + 1;
              const moved = before ? before - (i + 1) : 0;
              return (
                <li
                  key={r.userId}
                  className={cn(
                    "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5",
                    r.userId === me.id && "bg-primary/8",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                      i === 0
                        ? "bg-warning/20 text-warning"
                        : i < 3
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{r.name}</span>
                    <span className="text-[0.7rem] text-muted-foreground">
                      {r.ganhos} {r.ganhos === 1 ? "venda" : "vendas"} · {brl(r.receita)} ·{" "}
                      {r.tarefas} {r.tarefas === 1 ? "tarefa" : "tarefas"} · {r.leads}{" "}
                      {r.leads === 1 ? "lead" : "leads"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-sm font-semibold tabular-nums">
                      {r.xp}
                    </span>
                    <span
                      className={cn(
                        "text-[0.65rem]",
                        moved > 0
                          ? "text-success"
                          : moved < 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {moved > 0 ? `subiu ${moved}` : moved < 0 ? `caiu ${-moved}` : "manteve"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel
          title="Metas do mês"
          description={new Date(now).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
          actions={
            can("goals.manage") && (
              <IconBtn label="Criar meta" icon={Plus} onClick={() => setGoalOpen(true)} />
            )
          }
        >
          {goals.length === 0 ? (
            <Empty
              icon={Target}
              title="Nenhuma meta neste mês"
              text="Metas individuais ou de equipe aparecem aqui com o progresso calculado das vendas, tarefas e leads."
            />
          ) : (
            <ul className="space-y-3">
              {goals.map((g) => {
                const p = goalProgress(s, g);
                const owner =
                  g.scope === "individual"
                    ? user(g.userId)?.name
                    : d.teams.find((t) => t.id === g.teamId)?.name;
                return (
                  <li key={g.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{METRIC_LABEL[g.metric]}</span> · {owner}
                        {p.hit && (
                          <Pill tone="success" className="ml-1.5">
                            Atingida
                          </Pill>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                        {fmtMetric(g.metric, p.value)} de {fmtMetric(g.metric, g.target)}
                        {can("goals.manage") && (
                          <ConfirmAction
                            title="Excluir meta?"
                            description="Os pontos dados por esta meta são estornados de quem os recebeu."
                            confirmLabel="Excluir meta"
                            onConfirm={() => run({ type: "deleteGoal", id: g.id }, "Meta excluída")}
                            trigger={
                              <button
                                type="button"
                                className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                                aria-label={`Excluir meta ${METRIC_LABEL[g.metric]} de ${owner}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                        )}
                      </span>
                    </div>
                    <Progress
                      value={p.pct}
                      tone={p.hit ? "success" : p.pct < 40 ? "warning" : "primary"}
                      className="mt-1.5"
                      label={`${METRIC_LABEL[g.metric]} ${p.pct}%`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Desafios em andamento"
          actions={
            can("goals.manage") && (
              <IconBtn label="Criar desafio" icon={Plus} onClick={() => setChallengeOpen(true)} />
            )
          }
        >
          {challenges.length === 0 ? (
            <Empty
              icon={Flag}
              title="Nenhum desafio ativo"
              text="Desafios têm prazo curto e recompensa em pontos para quem bater o alvo."
            />
          ) : (
            <ul className="space-y-3">
              {challenges.map((c) => (
                <ChallengeRow key={c.id} c={c} now={now} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Conquistas">
          <ul className="grid gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5",
                  b.earned ? "border-primary/40 bg-primary/8" : "border-border opacity-70",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                    b.earned ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.earned ? (
                    <Trophy className="h-4 w-4" aria-hidden />
                  ) : (
                    <Medal className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{b.title}</span>
                  <span className="block text-[0.7rem] text-muted-foreground">{b.description}</span>
                  <span className="mt-0.5 block text-[0.68rem] tabular-nums">
                    {b.earned ? "Conquistada" : b.progress}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Seus últimos pontos" bodyClassName="p-0">
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhum ponto ainda. Qualifique um lead ou conclua uma tarefa para começar.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                  <Zap
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      e.points >= 0 ? "text-primary" : "text-destructive",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {e.reason}
                    <span className="text-muted-foreground"> · {XP_LABEL[e.kind]}</span>
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-semibold",
                      e.points >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {e.points > 0 ? "+" : ""}
                    {e.points}
                  </span>
                  <span className="w-16 text-right text-muted-foreground">{relative(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Regras de pontuação"
          description="Definidas pela organização em Configurações"
        >
          <ul className="space-y-1.5 text-xs">
            {(Object.keys(XP_LABEL) as XpKind[]).map((k) => (
              <li key={k} className="flex justify-between rounded-lg bg-muted/40 px-3 py-1.5">
                <span>{XP_LABEL[k]}</span>
                <span className="font-semibold tabular-nums">
                  {k === "desafio_concluido"
                    ? "definida em cada desafio"
                    : `${org.settings.xp[k]} pontos`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Contra abuso: cada fato pontua uma vez; desfazer o fato estorna os pontos; no máximo{" "}
            {org.settings.dailyTaskXpCap} tarefas pontuam por dia; tarefa criada e concluída em
            menos de 5 minutos, sem contato ou oportunidade, não pontua.
          </p>
        </Panel>
      </div>

      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} month={month} />
      <ChallengeDialog open={challengeOpen} onOpenChange={setChallengeOpen} />
    </div>
  );
}

function ChallengeRow({ c, now }: { c: Challenge; now: string }) {
  const { s, org, me } = useCrm();
  const mine = metricValue(s, org.id, new Set([me.id]), c.metric, {
    from: c.startsAt,
    to: c.endsAt,
  });
  const pct = Math.min(100, Math.round((mine / c.target) * 100));
  const days = Math.max(
    0,
    Math.ceil((new Date(c.endsAt).getTime() - new Date(now).getTime()) / 864e5),
  );
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{c.title}</p>
          <p className="text-xs text-muted-foreground">{c.description}</p>
        </div>
        <Pill tone="primary">
          <Award className="h-3 w-3" aria-hidden />
          {c.reward}
        </Pill>
      </div>
      <Progress
        value={pct}
        tone={pct >= 100 ? "success" : "primary"}
        className="mt-2"
        label={`${c.title}: ${pct}%`}
      />
      <p className="mt-1 flex justify-between text-[0.7rem] text-muted-foreground">
        <span>
          Você: {fmtMetric(c.metric, mine)} de {fmtMetric(c.metric, c.target)} ·{" "}
          {METRIC_LABEL[c.metric]}
        </span>
        <span>{days === 0 ? "termina hoje" : `${days} dias · até ${dateBR(c.endsAt)}`}</span>
      </p>
    </li>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  month,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  month: string;
}) {
  const { run, members } = useCrm();
  const d = useOrgData();
  const blank = {
    scope: "individual" as "individual" | "equipe",
    userId: "",
    teamId: "",
    metric: "receita" as GoalMetric,
    target: "",
    period: month,
  };
  const [f, setF] = useState(blank);
  const [touched, setTouched] = useState(false);
  const target = Number(f.target.replace(/\./g, "").replace(",", "."));
  const errs = {
    who:
      f.scope === "individual"
        ? f.userId
          ? undefined
          : "Escolha a pessoa."
        : f.teamId
          ? undefined
          : "Escolha a equipe.",
    target: target > 0 ? undefined : "Informe um alvo maior que zero.",
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errs.who || errs.target) return;
    if (
      run(
        {
          type: "createGoal",
          scope: f.scope,
          userId: f.userId || undefined,
          teamId: f.teamId || undefined,
          metric: f.metric,
          target,
          period: f.period,
        },
        "Meta criada",
      ).ok
    ) {
      onOpenChange(false);
      setF(blank);
      setTouched(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Criar meta</DialogTitle>
          <DialogDescription className="text-xs">
            O progresso é calculado das oportunidades, tarefas e leads do mês escolhido.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Segmented
            label="Tipo de meta"
            value={f.scope}
            onChange={(v) => setF({ ...f, scope: v })}
            options={[
              { value: "individual", label: "Individual" },
              { value: "equipe", label: "Equipe" },
            ]}
          />
          {f.scope === "individual" ? (
            <Field label="Pessoa" error={touched ? errs.who : undefined}>
              {(id, dd) => (
                <Select
                  id={id}
                  aria-describedby={dd}
                  value={f.userId}
                  onChange={(e) => setF({ ...f, userId: e.target.value })}
                >
                  <option value="">Escolha</option>
                  {members
                    .filter((m) => m.membership.role !== "viewer")
                    .map(({ user: u }) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field label="Equipe" error={touched ? errs.who : undefined}>
              {(id, dd) => (
                <Select
                  id={id}
                  aria-describedby={dd}
                  value={f.teamId}
                  onChange={(e) => setF({ ...f, teamId: e.target.value })}
                >
                  <option value="">Escolha</option>
                  {d.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Métrica">
              {(id) => (
                <Select
                  id={id}
                  value={f.metric}
                  onChange={(e) => setF({ ...f, metric: e.target.value as GoalMetric })}
                >
                  {(
                    [
                      "receita",
                      "negocios_ganhos",
                      "tarefas_concluidas",
                      "leads_qualificados",
                    ] as GoalMetric[]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {METRIC_LABEL[m]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Mês">
              {(id) => (
                <TextInput
                  id={id}
                  type="month"
                  value={f.period}
                  onChange={(e) => setF({ ...f, period: e.target.value })}
                />
              )}
            </Field>
          </div>
          <Field
            label={f.metric === "receita" ? "Alvo em reais" : "Alvo (quantidade)"}
            error={touched ? errs.target : undefined}
          >
            {(id, dd) => (
              <TextInput
                id={id}
                inputMode="decimal"
                aria-describedby={dd}
                value={f.target}
                onChange={(e) => setF({ ...f, target: e.target.value })}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">Criar meta</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChallengeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { run } = useCrm();
  const blank = {
    title: "",
    description: "",
    metric: "tarefas_concluidas" as Challenge["metric"],
    target: "5",
    days: "7",
    reward: "100",
  };
  const [f, setF] = useState(blank);
  const [touched, setTouched] = useState(false);
  const err = f.title.trim().length < 4 ? "Dê um nome com pelo menos 4 letras." : undefined;
  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (err) return;
    if (
      run(
        {
          type: "createChallenge",
          title: f.title,
          description: f.description,
          metric: f.metric,
          target: Number(f.target),
          days: Number(f.days),
          reward: Number(f.reward),
        },
        "Desafio lançado para a equipe",
      ).ok
    ) {
      onOpenChange(false);
      setF(blank);
      setTouched(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Criar desafio</DialogTitle>
          <DialogDescription className="text-xs">
            Começa agora e vale para todos da organização. Quem bater o alvo no prazo ganha a
            recompensa uma vez.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Nome" error={touched ? err : undefined}>
            {(id, dd) => (
              <TextInput
                id={id}
                autoFocus
                aria-describedby={dd}
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            )}
          </Field>
          <Field label="Descrição">
            {(id) => (
              <TextArea
                id={id}
                className="min-h-14"
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
              />
            )}
          </Field>
          <Field label="Métrica">
            {(id) => (
              <Select
                id={id}
                value={f.metric}
                onChange={(e) => setF({ ...f, metric: e.target.value as Challenge["metric"] })}
              >
                {(Object.keys(METRIC_LABEL) as Challenge["metric"][]).map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABEL[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Alvo">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  value={f.target}
                  onChange={(e) => setF({ ...f, target: e.target.value })}
                />
              )}
            </Field>
            <Field label="Dias">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  max={90}
                  value={f.days}
                  onChange={(e) => setF({ ...f, days: e.target.value })}
                />
              )}
            </Field>
            <Field label="Pontos">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={0}
                  max={2000}
                  value={f.reward}
                  onChange={(e) => setF({ ...f, reward: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">Lançar desafio</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
