import type { CrmState, Deal, Goal, GoalMetric, ID, Pipeline, User } from "./types";

// Indicadores calculados a partir das mesmas entidades dos módulos (oportunidades, leads,
// contatos, tarefas e conversas). Nenhum número do painel existe fora destas funções.

export type Range = { from: string; to: string };
export type Scope = { orgId: ID; ownerId?: ID | undefined; teamId?: ID | undefined };

const inRange = (iso: string | undefined, r: Range) => !!iso && iso >= r.from && iso <= r.to;
export const monthKey = (iso: string) => iso.slice(0, 7);

export function monthRange(period: string): Range {
  const [y, m] = period.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1) - 1).toISOString();
  return { from, to };
}

export function periodRange(kind: "mes" | "30d" | "trimestre" | "ano", now: string): Range {
  const n = new Date(now);
  if (kind === "mes") return { from: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString(), to: now };
  if (kind === "30d") return { from: new Date(n.getTime() - 30 * 864e5).toISOString(), to: now };
  if (kind === "trimestre") return { from: new Date(n.getTime() - 90 * 864e5).toISOString(), to: now };
  return { from: new Date(n.getTime() - 365 * 864e5).toISOString(), to: now };
}

export function previousRange(r: Range): Range {
  const len = new Date(r.to).getTime() - new Date(r.from).getTime();
  return { from: new Date(new Date(r.from).getTime() - len).toISOString(), to: r.from };
}

function teamUserIds(s: CrmState, orgId: ID, teamId: ID) {
  return new Set(s.memberships.filter((m) => m.orgId === orgId && m.teamId === teamId).map((m) => m.userId));
}

function ownerFilter(s: CrmState, scope: Scope) {
  if (scope.ownerId) return (id: ID | undefined) => id === scope.ownerId;
  if (scope.teamId) { const ids = teamUserIds(s, scope.orgId, scope.teamId); return (id: ID | undefined) => !!id && ids.has(id); }
  return () => true;
}

export function orgDeals(s: CrmState, scope: Scope) {
  const f = ownerFilter(s, scope);
  return s.deals.filter((d) => d.orgId === scope.orgId && f(d.ownerId));
}

/** Valor de uma métrica de meta para uma pessoa (ou conjunto de pessoas) num intervalo. */
export function metricValue(s: CrmState, orgId: ID, userIds: Set<ID>, metric: GoalMetric | "reunioes", r: Range): number {
  switch (metric) {
    case "receita":
      return s.deals.filter((d) => d.orgId === orgId && d.status === "ganha" && userIds.has(d.ownerId) && inRange(d.closedAt, r)).reduce((a, d) => a + d.value, 0);
    case "negocios_ganhos":
      return s.deals.filter((d) => d.orgId === orgId && d.status === "ganha" && userIds.has(d.ownerId) && inRange(d.closedAt, r)).length;
    case "tarefas_concluidas":
      return s.tasks.filter((t) => t.orgId === orgId && t.status === "concluida" && userIds.has(t.assigneeId) && inRange(t.completedAt, r)).length;
    case "reunioes":
      return s.tasks.filter((t) => t.orgId === orgId && t.type === "reuniao" && t.status === "concluida" && userIds.has(t.assigneeId) && inRange(t.completedAt, r)).length;
    case "leads_qualificados":
      return s.leads.filter((l) => l.orgId === orgId && userIds.has(l.ownerId) && inRange(l.qualifiedAt, r)).length;
  }
}

export function goalUsers(s: CrmState, g: Goal): Set<ID> {
  if (g.scope === "individual") return new Set(g.userId ? [g.userId] : []);
  return g.teamId ? teamUserIds(s, g.orgId, g.teamId) : new Set();
}

export function goalProgress(s: CrmState, g: Goal) {
  const value = metricValue(s, g.orgId, goalUsers(s, g), g.metric, monthRange(g.period));
  return { value, pct: g.target > 0 ? Math.min(100, Math.round((value / g.target) * 100)) : 0, hit: value >= g.target };
}

export function avgFirstResponseMin(s: CrmState, orgId: ID, r: Range, assigneeId?: ID): number | null {
  const times: number[] = [];
  for (const c of s.conversations) {
    if (c.orgId !== orgId || (assigneeId && c.assigneeId !== assigneeId)) continue;
    const msgs = s.messages.filter((m) => m.conversationId === c.id && m.direction !== "nota").sort((a, b) => a.at.localeCompare(b.at));
    const firstIn = msgs.find((m) => m.direction === "entrada");
    if (!firstIn || !inRange(firstIn.at, r)) continue;
    const reply = msgs.find((m) => m.direction === "saida" && m.at >= firstIn.at);
    if (reply) times.push((new Date(reply.at).getTime() - new Date(firstIn.at).getTime()) / 60000);
  }
  if (!times.length) return null;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

export function dashboard(s: CrmState, scope: Scope, r: Range, now: string) {
  const f = ownerFilter(s, scope);
  const deals = orgDeals(s, scope);
  const won = deals.filter((d) => d.status === "ganha" && inRange(d.closedAt, r));
  const lost = deals.filter((d) => d.status === "perdida" && inRange(d.closedAt, r));
  const open = deals.filter((d) => d.status === "aberta");
  const revenueWon = won.reduce((a, d) => a + d.value, 0);
  const leads = s.leads.filter((l) => l.orgId === scope.orgId && f(l.ownerId));
  const tasks = s.tasks.filter((t) => t.orgId === scope.orgId && f(t.assigneeId));
  const convs = s.conversations.filter((c) => c.orgId === scope.orgId && (!scope.ownerId || c.assigneeId === scope.ownerId));
  return {
    revenueWon,
    revenueProjected: Math.round(open.reduce((a, d) => a + (d.value * d.probability) / 100, 0)),
    pipelineValue: open.reduce((a, d) => a + d.value, 0),
    openDeals: open.length,
    activeLeads: leads.filter((l) => l.status === "novo" || l.status === "contatado" || l.status === "qualificado").length,
    newContacts: s.contacts.filter((c) => c.orgId === scope.orgId && f(c.ownerId) && inRange(c.createdAt, r)).length,
    conversionRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    avgTicket: won.length ? Math.round(revenueWon / won.length) : null,
    won: won.length,
    lost: lost.length,
    overdueTasks: tasks.filter((t) => t.status !== "concluida" && t.dueAt < now).length,
    openConversations: convs.filter((c) => c.status !== "encerrada").length,
    unread: convs.reduce((a, c) => a + c.unread, 0),
    avgResponseMin: avgFirstResponseMin(s, scope.orgId, r, scope.ownerId),
  };
}

export function salesByMonth(s: CrmState, scope: Scope, now: string, months = 6) {
  const deals = orgDeals(s, scope).filter((d) => d.status === "ganha" && d.closedAt);
  const n = new Date(now);
  const out: { month: string; label: string; receita: number; negocios: number; meta: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    const ws = deals.filter((x) => monthKey(x.closedAt!) === key);
    const meta = s.goals.filter((g) => g.orgId === scope.orgId && g.period === key && g.metric === "receita" && g.scope === "equipe" && !scope.ownerId).reduce((a, g) => a + g.target, 0);
    out.push({ month: key, label: d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", ""), receita: ws.reduce((a, x) => a + x.value, 0), negocios: ws.length, meta });
  }
  return out;
}

export function conversionFunnel(s: CrmState, scope: Scope, r: Range) {
  const f = ownerFilter(s, scope);
  const leads = s.leads.filter((l) => l.orgId === scope.orgId && f(l.ownerId));
  const deals = orgDeals(s, scope);
  return [
    { stage: "Leads recebidos", value: leads.filter((l) => inRange(l.createdAt, r)).length },
    { stage: "Qualificados", value: leads.filter((l) => inRange(l.qualifiedAt, r)).length },
    { stage: "Oportunidades", value: deals.filter((d) => inRange(d.createdAt, r)).length },
    { stage: "Proposta ou negociação", value: deals.filter((d) => (d.status === "aberta" && stageIndex(s, d) >= 3) || (d.status === "ganha" && inRange(d.closedAt, r))).length },
    { stage: "Ganhos", value: deals.filter((d) => d.status === "ganha" && inRange(d.closedAt, r)).length },
  ];
}

function stageIndex(s: CrmState, d: Deal) {
  const p = s.pipelines.find((x) => x.id === d.pipelineId);
  return p ? p.stages.findIndex((st) => st.id === d.stageId) : -1;
}

export function stageDistribution(s: CrmState, scope: Scope, pipeline: Pipeline) {
  const deals = orgDeals(s, scope).filter((d) => d.pipelineId === pipeline.id && d.status === "aberta");
  return pipeline.stages.filter((st) => st.kind === "aberta").map((st) => {
    const ds = deals.filter((d) => d.stageId === st.id);
    return { stageId: st.id, stage: st.name, quantidade: ds.length, valor: ds.reduce((a, d) => a + d.value, 0) };
  });
}

export function orgMembers(s: CrmState, orgId: ID) {
  return s.memberships
    .filter((m) => m.orgId === orgId && m.status === "ativo")
    .map((m) => ({ membership: m, user: s.users.find((u) => u.id === m.userId)! }))
    .filter((x) => x.user);
}

export function xpTotal(s: CrmState, orgId: ID, userId: ID, r?: Range) {
  return s.xp.filter((e) => e.orgId === orgId && e.userId === userId && (!r || inRange(e.at, r))).reduce((a, e) => a + e.points, 0);
}

export function teamPerformance(s: CrmState, orgId: ID, r: Range) {
  return orgMembers(s, orgId)
    .filter(({ membership }) => membership.role !== "viewer")
    .map(({ user, membership }) => {
      const ids = new Set([user.id]);
      return {
        userId: user.id,
        name: user.name,
        first: user.name.split(" ")[0],
        role: membership.role,
        receita: metricValue(s, orgId, ids, "receita", r),
        ganhos: metricValue(s, orgId, ids, "negocios_ganhos", r),
        tarefas: metricValue(s, orgId, ids, "tarefas_concluidas", r),
        leads: metricValue(s, orgId, ids, "leads_qualificados", r),
        xp: xpTotal(s, orgId, user.id, r),
      };
    })
    .sort((a, b) => b.xp - a.xp || b.receita - a.receita);
}

export function goalTimeline(s: CrmState, orgId: ID, period: string, now: string) {
  const r = monthRange(period);
  const target = s.goals.filter((g) => g.orgId === orgId && g.period === period && g.metric === "receita" && g.scope === "equipe").reduce((a, g) => a + g.target, 0);
  const won = s.deals.filter((d) => d.orgId === orgId && d.status === "ganha" && inRange(d.closedAt, r));
  const start = new Date(r.from);
  const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const today = now < r.to ? new Date(now).getUTCDate() : daysInMonth;
  const out: { dia: string; realizado: number | null; ideal: number }[] = [];
  let acc = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), d)).toISOString().slice(0, 10);
    acc += won.filter((x) => x.closedAt!.slice(0, 10) === key).reduce((a, x) => a + x.value, 0);
    out.push({ dia: String(d), realizado: d <= today ? acc : null, ideal: Math.round((target * d) / daysInMonth) });
  }
  return { target, points: out };
}

// Níveis e conquistas: derivados do histórico real de pontos e resultados.
export const LEVELS = [
  { min: 0, name: "Em formação" },
  { min: 300, name: "Consistente" },
  { min: 800, name: "Avançado" },
  { min: 1600, name: "Especialista" },
  { min: 3000, name: "Referência" },
  { min: 5000, name: "Liderança comercial" },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1];
  const cur = LEVELS[i];
  return { level: i + 1, name: cur.name, current: cur.min, next: next?.min ?? null, pct: next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100 };
}

export type Achievement = { id: string; title: string; description: string; earned: boolean; progress: string };

export function achievements(s: CrmState, orgId: ID, user: User): Achievement[] {
  const all: Range = { from: "1970-01-01T00:00:00.000Z", to: "9999-12-31T00:00:00.000Z" };
  const ids = new Set([user.id]);
  const won = metricValue(s, orgId, ids, "negocios_ganhos", all);
  const revenue = metricValue(s, orgId, ids, "receita", all);
  const tasks = metricValue(s, orgId, ids, "tarefas_concluidas", all);
  const leads = metricValue(s, orgId, ids, "leads_qualificados", all);
  const meetings = metricValue(s, orgId, ids, "reunioes", all);
  const goalHit = s.xp.some((e) => e.orgId === orgId && e.userId === user.id && e.kind === "meta_atingida" && e.points > 0);
  const resp = avgFirstResponseMin(s, orgId, all, user.id);
  const convCount = s.conversations.filter((c) => c.orgId === orgId && c.assigneeId === user.id).length;
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return [
    { id: "primeira-venda", title: "Primeira venda", description: "Ganhar a primeira oportunidade.", earned: won >= 1, progress: `${Math.min(won, 1)}/1` },
    { id: "cinco-vitorias", title: "Cinco vitórias", description: "Ganhar cinco oportunidades.", earned: won >= 5, progress: `${Math.min(won, 5)}/5` },
    { id: "cem-mil", title: "R$ 100 mil fechados", description: "Somar R$ 100 mil em negócios ganhos.", earned: revenue >= 100000, progress: `${brl(Math.min(revenue, 100000))} de R$ 100 mil` },
    { id: "qualificador", title: "Qualificador", description: "Qualificar dez leads.", earned: leads >= 10, progress: `${Math.min(leads, 10)}/10` },
    { id: "agenda-em-dia", title: "Agenda em dia", description: "Concluir vinte tarefas.", earned: tasks >= 20, progress: `${Math.min(tasks, 20)}/20` },
    { id: "presenca", title: "Presença", description: "Realizar cinco reuniões.", earned: meetings >= 5, progress: `${Math.min(meetings, 5)}/5` },
    { id: "meta-batida", title: "Meta batida", description: "Atingir uma meta mensal.", earned: goalHit, progress: goalHit ? "Concluída" : "Ainda não" },
    { id: "resposta-rapida", title: "Resposta rápida", description: "Média de primeira resposta abaixo de 10 minutos em 5 conversas.", earned: resp !== null && resp < 10 && convCount >= 5, progress: resp === null ? "Sem conversas" : `${resp} min em ${convCount} conversas` },
  ];
}

export const METRIC_LABEL: Record<GoalMetric | "reunioes", string> = {
  receita: "Receita ganha",
  negocios_ganhos: "Negócios ganhos",
  tarefas_concluidas: "Tarefas concluídas",
  leads_qualificados: "Leads qualificados",
  reunioes: "Reuniões realizadas",
};

// ---------- Relatórios ----------

export function lostReasons(s: CrmState, scope: Scope, r: Range) {
  const counts = new Map<string, { quantidade: number; valor: number }>();
  for (const d of orgDeals(s, scope)) {
    if (d.status !== "perdida" || !inRange(d.closedAt, r)) continue;
    const k = d.lostReason || "Sem motivo";
    const cur = counts.get(k) ?? { quantidade: 0, valor: 0 };
    counts.set(k, { quantidade: cur.quantidade + 1, valor: cur.valor + d.value });
  }
  return [...counts.entries()].map(([motivo, v]) => ({ motivo, ...v })).sort((a, b) => b.quantidade - a.quantidade);
}

export function leadsBySource(s: CrmState, scope: Scope, r: Range) {
  const f = ownerFilter(s, scope);
  const rows = new Map<string, { recebidos: number; qualificados: number; convertidos: number; receita: number }>();
  for (const l of s.leads) {
    if (l.orgId !== scope.orgId || !f(l.ownerId) || !inRange(l.createdAt, r)) continue;
    const row = rows.get(l.source) ?? { recebidos: 0, qualificados: 0, convertidos: 0, receita: 0 };
    row.recebidos++;
    if (l.qualifiedAt || l.status === "convertido") row.qualificados++;
    if (l.status === "convertido") row.convertidos++;
    const deal = l.dealId ? s.deals.find((d) => d.id === l.dealId) : undefined;
    if (deal?.status === "ganha") row.receita += deal.value;
    rows.set(l.source, row);
  }
  return [...rows.entries()].map(([origem, v]) => ({ origem, ...v, taxa: v.recebidos ? Math.round((v.convertidos / v.recebidos) * 100) : 0 })).sort((a, b) => b.recebidos - a.recebidos);
}

/** Dias médios entre criar e ganhar uma oportunidade no período. */
export function salesCycleDays(s: CrmState, scope: Scope, r: Range): number | null {
  const won = orgDeals(s, scope).filter((d) => d.status === "ganha" && inRange(d.closedAt, r));
  if (!won.length) return null;
  return Math.round(won.reduce((a, d) => a + (new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()) / 864e5, 0) / won.length);
}

/** Conversas do período cuja primeira resposta passou do prazo da organização (ou ainda não veio). */
export function slaReport(s: CrmState, orgId: ID, r: Range, slaMin: number, now: string) {
  let total = 0;
  let late = 0;
  for (const c of s.conversations) {
    if (c.orgId !== orgId) continue;
    const msgs = s.messages.filter((m) => m.conversationId === c.id && m.direction !== "nota").sort((a, b) => a.at.localeCompare(b.at));
    const firstIn = msgs.find((m) => m.direction === "entrada");
    if (!firstIn || !inRange(firstIn.at, r)) continue;
    total++;
    const reply = msgs.find((m) => m.direction === "saida" && m.at >= firstIn.at);
    const end = reply ? reply.at : now;
    if ((new Date(end).getTime() - new Date(firstIn.at).getTime()) / 60000 > slaMin) late++;
  }
  return { total, late, onTime: total - late, pct: total ? Math.round(((total - late) / total) * 100) : null };
}
