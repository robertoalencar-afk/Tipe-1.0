import { leadScore } from "../leads-score";
import { can, PLANS, PLAN_ORDER, ROLE_LABEL, type Action } from "./permissions";
import { goalProgress, metricValue, monthKey } from "./metrics";
import {
  campaignAudience,
  consumerProfiles,
  DEFAULT_MODULES,
  DEMO_CONSUMERS,
  DEMO_WAITERS,
  menuFor,
  METHOD_LABEL,
  MODULES,
  ONBOARDING,
  planForTables,
  RESTAURANT_PLAN_ORDER,
  restaurantPlan,
  SEGMENT_LABEL,
  SITE_SAMPLES,
  SITE_SOURCE,
  stepDone,
} from "./ecosystem";
import type {
  Activity,
  BillMethod,
  Challenge,
  Comment,
  Company,
  Consumer,
  ConsumerSegment,
  Contact,
  CrmState,
  Deal,
  EntityRef,
  Goal,
  GoalMetric,
  ID,
  Lead,
  LeadProfile,
  Membership,
  Message,
  ModuleKey,
  OnboardingKey,
  Org,
  PagarmeStatus,
  PdvStatus,
  Pipeline,
  PlanId,
  Priority,
  RestaurantAccount,
  RestaurantPlan,
  Role,
  Stage,
  Task,
  TaskStatus,
  TaskType,
  Ticket,
  TicketStatus,
  XpKind,
} from "./types";

// Motor do CRM: a única camada que escreve no estado. Cada comando confere sessão,
// organização, papel, limites do plano e validações antes de alterar qualquer dado,
// e registra atividade, auditoria, notificações e pontos de gamificação no mesmo passo.
// A interface pode esconder botões, mas quem decide é sempre esta camada.

export type Command =
  | { type: "login"; email: string; password: string }
  | { type: "logout" }
  | { type: "switchOrg"; orgId: ID }
  | { type: "createOrg"; name: string; segment: string }
  | {
      type: "updateOrgSettings";
      name?: string | undefined;
      responseSlaMin?: number | undefined;
      dailyTaskXpCap?: number | undefined;
      xp?: Partial<Record<XpKind, number>>;
    }
  | { type: "updateProfile"; name: string; title: string }
  | { type: "inviteMember"; email: string; name: string; role: Role; teamId?: ID | undefined }
  | { type: "acceptInvite"; inviteId: ID }
  | { type: "revokeInvite"; inviteId: ID }
  | { type: "changeRole"; membershipId: ID; role: Role }
  | {
      type: "setMemberTeam";
      membershipId: ID;
      teamId?: ID | undefined;
      departmentId?: ID | undefined;
    }
  | { type: "removeMember"; membershipId: ID }
  | { type: "createTeam"; name: string }
  | { type: "createDepartment"; name: string }
  | { type: "createContact"; data: ContactInput }
  | { type: "updateContact"; id: ID; data: Partial<ContactInput> }
  | { type: "deleteContact"; id: ID }
  | { type: "createCompany"; data: CompanyInput }
  | { type: "updateCompany"; id: ID; data: Partial<CompanyInput> }
  | { type: "addNote"; contactId?: ID | undefined; dealId?: ID | undefined; text: string }
  | { type: "createLead"; data: LeadInput }
  | { type: "updateLead"; id: ID; data: Partial<LeadInput> }
  | { type: "qualifyLead"; id: ID }
  | { type: "disqualifyLead"; id: ID; reason: string }
  | { type: "convertLead"; id: ID; title: string; value: number; pipelineId?: ID | undefined }
  | { type: "createDeal"; data: DealInput }
  | { type: "updateDeal"; id: ID; data: Partial<DealInput> }
  | { type: "moveDeal"; id: ID; stageId: ID; lostReason?: string | undefined }
  | { type: "deleteDeal"; id: ID }
  | { type: "createPipeline"; name: string }
  | { type: "updateStages"; pipelineId: ID; stages: Stage[] }
  | { type: "createTask"; data: TaskInput }
  | { type: "updateTask"; id: ID; data: Partial<TaskInput> }
  | { type: "setTaskStatus"; id: ID; status: TaskStatus }
  | { type: "commentTask"; id: ID; text: string }
  | { type: "deleteTask"; id: ID }
  | {
      type: "simulateInbound";
      contactId?: ID | undefined;
      name?: string | undefined;
      phone?: string | undefined;
      text: string;
    }
  | { type: "sendMessage"; conversationId: ID; text: string }
  | { type: "addInternalNote"; conversationId: ID; text: string }
  | { type: "assignConversation"; conversationId: ID; userId: ID }
  | {
      type: "setConversationStatus";
      conversationId: ID;
      status: "aberta" | "pendente" | "encerrada";
    }
  | { type: "setConversationTags"; conversationId: ID; tags: string[] }
  | { type: "markConversationRead"; conversationId: ID }
  | { type: "createDealFromConversation"; conversationId: ID; title: string; value: number }
  | { type: "createLeadFromConversation"; conversationId: ID }
  | { type: "createQuickReply"; shortcut: string; text: string }
  | { type: "deleteQuickReply"; id: ID }
  | {
      type: "createTicket";
      title: string;
      description: string;
      category: string;
      priority: Priority;
      accountId?: ID | undefined;
    }
  | {
      type: "updateTicket";
      id: ID;
      status?: TicketStatus | undefined;
      assigneeId?: ID | undefined;
      priority?: Priority | undefined;
    }
  | { type: "commentTicket"; id: ID; text: string }
  | {
      type: "createGoal";
      scope: "individual" | "equipe";
      userId?: ID | undefined;
      teamId?: ID | undefined;
      metric: GoalMetric;
      target: number;
      period: string;
    }
  | { type: "deleteGoal"; id: ID }
  | {
      type: "createChallenge";
      title: string;
      description: string;
      metric: Challenge["metric"];
      target: number;
      days: number;
      reward: number;
    }
  | { type: "changePlan"; planId: PlanId }
  | { type: "cancelSubscription" }
  | { type: "reactivateSubscription" }
  | { type: "payInvoice"; id: ID }
  | { type: "createWaInstance"; name: string; phone: string }
  | {
      type: "createWaTemplate";
      name: string;
      category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
      body: string;
    }
  | { type: "markNotificationsRead" }
  // Ecossistema: entrada pelo site, contas de restaurante e clientes finais.
  | { type: "simulateSiteLead" }
  | { type: "completeOnboardingStep"; accountId: ID; key: OnboardingKey }
  | { type: "reopenOnboardingStep"; accountId: ID; key: OnboardingKey }
  | { type: "setAccountModule"; accountId: ID; module: ModuleKey; enabled: boolean }
  | { type: "changeAccountPlan"; accountId: ID; plan: RestaurantPlan; tables: number }
  | {
      type: "setAccountIntegration";
      accountId: ID;
      pdv?: PdvStatus | undefined;
      pagarme?: PagarmeStatus | undefined;
    }
  | {
      type: "setAccountStatus";
      accountId: ID;
      status: "ativa" | "pausada" | "cancelada";
      reason?: string | undefined;
    }
  | { type: "assignAccountCsm"; accountId: ID; userId: ID }
  | { type: "simulateVisit"; accountId: ID }
  | {
      type: "createCampaign";
      accountId: ID;
      name: string;
      segment: ConsumerSegment;
      message: string;
    };

export type ContactInput = {
  name: string;
  companyId?: ID | undefined;
  phone: string;
  whatsapp: string;
  email: string;
  jobTitle: string;
  source: string;
  ownerId: ID;
  status: Contact["status"];
  tags: string[];
  notes: string;
};
export type CompanyInput = {
  name: string;
  segment: string;
  city: string;
  neighborhood: string;
  size: string;
  pdv: string;
  ownerId: ID;
  tags: string[];
};
export type LeadInput = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  ownerId: ID;
  profile: LeadProfile;
};
export type DealInput = {
  title: string;
  contactId: ID;
  companyId?: ID | undefined;
  value: number;
  ownerId: ID;
  probability: number;
  priority: Priority;
  expectedClose: string;
  pipelineId: ID;
  stageId: ID;
};
export type TaskInput = {
  title: string;
  description: string;
  type: TaskType;
  assigneeId: ID;
  priority: Priority;
  dueAt: string;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
};

export type Result =
  | { ok: true; state: CrmState; id?: ID | undefined; message?: string | undefined }
  | { ok: false; state: CrmState; error: string };

class Denied extends Error {}
class Invalid extends Error {}

let seq = 0;
export function newId(prefix: string) {
  seq = (seq + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: string | undefined) => (v ?? "").trim();
const digits = (v: string) => v.replace(/\D/g, "");
export const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Ctx = { s: CrmState; now: string; userId: ID; orgId: ID; role: Role; org: Org };

function ctxOf(s: CrmState, now: string): Ctx {
  if (!s.session) throw new Denied("Entre com um usuário para continuar.");
  const { userId, orgId } = s.session;
  const m = s.memberships.find(
    (x) => x.userId === userId && x.orgId === orgId && x.status === "ativo",
  );
  const org = s.orgs.find((o) => o.id === orgId);
  if (!m || !org) throw new Denied("Você não participa desta organização.");
  return { s, now, userId, orgId, role: m.role, org };
}

function audit(
  s: CrmState,
  now: string,
  orgId: ID | null,
  actorId: ID | null,
  action: string,
  target: string,
  result: "ok" | "negado",
) {
  s.audit.unshift({ id: newId("aud"), orgId, actorId, action, target, result, at: now });
  if (s.audit.length > 500) s.audit.length = 500;
}

function need(c: Ctx, action: Action) {
  if (!can(c.role, action)) throw new Denied("Seu papel nesta organização não permite esta ação.");
}

/** Busca um registro garantindo que ele pertence à organização da sessão. */
function own<T extends { id: ID; orgId: ID }>(
  c: Ctx,
  list: T[],
  id: ID | undefined,
  label: string,
): T {
  const item = list.find((x) => x.id === id);
  if (!item || item.orgId !== c.orgId)
    throw new Denied(`${label} não encontrado nesta organização.`);
  return item;
}

function memberOf(c: Ctx, userId: ID | undefined, label = "Responsável") {
  if (
    !userId ||
    !c.s.memberships.some((m) => m.orgId === c.orgId && m.userId === userId && m.status === "ativo")
  )
    throw new Invalid(`${label} precisa fazer parte da organização.`);
}

function activity(
  c: Ctx,
  kind: string,
  summary: string,
  entity: EntityRef,
  extra: Partial<Activity> = {},
) {
  c.s.activities.unshift({
    id: newId("act"),
    orgId: c.orgId,
    at: c.now,
    actorId: c.userId,
    kind,
    summary,
    entity,
    ...extra,
  });
  if (c.s.activities.length > 2000) c.s.activities.length = 2000;
}

function notify(c: Ctx, userIds: ID[], text: string, href: string) {
  for (const userId of new Set(userIds)) {
    if (userId === c.userId) continue;
    c.s.notifications.unshift({
      id: newId("ntf"),
      orgId: c.orgId,
      userId,
      text,
      href,
      at: c.now,
      read: false,
    });
  }
  if (c.s.notifications.length > 400) c.s.notifications.length = 400;
}

function managers(c: Ctx) {
  return c.s.memberships
    .filter(
      (m) =>
        m.orgId === c.orgId &&
        m.status === "ativo" &&
        (m.role === "owner" || m.role === "admin" || m.role === "manager"),
    )
    .map((m) => m.userId);
}

function diff<T extends object>(before: T, patch: { [K in keyof T]?: T[K] | undefined }) {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(patch) as (keyof T)[]) {
    const a = before[k];
    const b = patch[k];
    if (b !== undefined && JSON.stringify(a) !== JSON.stringify(b)) changes[String(k)] = [a, b];
  }
  return changes;
}

// ---------- Gamificação: pontos só por fatos reais, uma vez por fato ----------

function netXp(s: CrmState, ref: string) {
  return s.xp.filter((e) => e.ref === ref).reduce((a, e) => a + e.points, 0);
}

export function award(
  s: CrmState,
  orgId: ID,
  userId: ID,
  kind: XpKind,
  ref: string,
  reason: string,
  now: string,
) {
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org || netXp(s, ref) > 0) return false;
  if (kind === "tarefa_concluida" || kind === "reuniao_realizada") {
    const day = now.slice(0, 10);
    const today = s.xp.filter(
      (e) =>
        e.orgId === orgId &&
        e.userId === userId &&
        (e.kind === "tarefa_concluida" || e.kind === "reuniao_realizada") &&
        e.at.slice(0, 10) === day &&
        e.points > 0,
    ).length;
    if (today >= org.settings.dailyTaskXpCap) return false;
  }
  const points = org.settings.xp[kind];
  if (!points) return false;
  s.xp.push({ id: newId("xp"), orgId, userId, kind, points, ref, at: now, reason });
  return true;
}

function revoke(s: CrmState, ref: string, now: string, reason: string) {
  const net = netXp(s, ref);
  const last = [...s.xp].reverse().find((e) => e.ref === ref && e.points > 0);
  if (net <= 0 || !last) return;
  s.xp.push({ ...last, id: newId("xp"), points: -net, at: now, reason });
}

/** Reavalia metas e desafios de quem foi afetado por um evento. */
export function settleGoals(s: CrmState, orgId: ID, userIds: ID[], now: string) {
  const affected = new Set(userIds);
  for (const g of s.goals) {
    if (g.orgId !== orgId) continue;
    const users =
      g.scope === "individual"
        ? g.userId
          ? [g.userId]
          : []
        : s.memberships
            .filter((m) => m.orgId === orgId && m.teamId === g.teamId)
            .map((m) => m.userId);
    if (!users.some((u) => affected.has(u))) continue;
    const { hit } = goalProgress(s, g);
    for (const u of users) {
      const ref = `meta:${g.id}:${u}`;
      if (hit) award(s, orgId, u, "meta_atingida", ref, `Meta de ${g.period} atingida`, now);
      else revoke(s, ref, now, "Meta deixou de estar atingida");
    }
  }
  for (const ch of s.challenges) {
    if (ch.orgId !== orgId || now < ch.startsAt || now > ch.endsAt) continue;
    for (const u of affected) {
      const value = metricValue(s, orgId, new Set([u]), ch.metric, {
        from: ch.startsAt,
        to: ch.endsAt,
      });
      const ref = `desafio:${ch.id}:${u}`;
      if (value >= ch.target) {
        if (netXp(s, ref) <= 0)
          s.xp.push({
            id: newId("xp"),
            orgId,
            userId: u,
            kind: "desafio_concluido",
            points: ch.reward,
            ref,
            at: now,
            reason: `Desafio: ${ch.title}`,
          });
      } else revoke(s, ref, now, "Desafio deixou de estar concluído");
    }
  }
}

// ---------- Planos ----------

function subOf(s: CrmState, orgId: ID) {
  return s.subscriptions.find((x) => x.orgId === orgId);
}

export function usage(s: CrmState, orgId: ID) {
  return {
    users:
      s.memberships.filter((m) => m.orgId === orgId && m.status === "ativo").length +
      s.invites.filter((i) => i.orgId === orgId && i.status === "pendente").length,
    contacts: s.contacts.filter((x) => x.orgId === orgId).length,
    pipelines: s.pipelines.filter((x) => x.orgId === orgId).length,
    whatsappInstances: s.waInstances.filter((x) => x.orgId === orgId).length,
  };
}

function limit(c: Ctx, key: keyof ReturnType<typeof usage>, label: string) {
  const sub = subOf(c.s, c.orgId);
  if (!sub || sub.status === "cancelada")
    throw new Invalid(
      "A assinatura desta organização está cancelada. Reative um plano para continuar.",
    );
  const max = PLANS[sub.planId].limits[key];
  if (usage(c.s, c.orgId)[key] >= max)
    throw new Invalid(
      `O plano ${PLANS[sub.planId].name} permite até ${max} ${label}. Mude de plano em Planos para continuar.`,
    );
}

// ---------- Validações ----------

function validateContact(c: Ctx, d: Partial<ContactInput>, full: boolean) {
  if (full || d.name !== undefined)
    if (clean(d.name).length < 2) throw new Invalid("Informe o nome do contato.");
  if (d.email && !EMAIL.test(clean(d.email)))
    throw new Invalid("O e-mail não parece válido. Confira e tente de novo.");
  for (const [k, v] of [
    ["telefone", d.phone],
    ["WhatsApp", d.whatsapp],
  ] as const)
    if (v && digits(v).length > 0 && (digits(v).length < 10 || digits(v).length > 13))
      throw new Invalid(`O ${k} precisa ter DDD e número.`);
  if (full && !clean(d.email) && !digits(d.phone ?? "") && !digits(d.whatsapp ?? ""))
    throw new Invalid("Informe ao menos um e-mail, telefone ou WhatsApp.");
  if (d.ownerId !== undefined) memberOf(c, d.ownerId);
  if (d.companyId) own(c, c.s.companies, d.companyId, "Empresa");
}

function stageOf(p: Pipeline, stageId: ID) {
  const st = p.stages.find((x) => x.id === stageId);
  if (!st) throw new Invalid("Etapa não encontrada neste funil.");
  return st;
}

function canEditDeal(c: Ctx, d: Deal) {
  if (can(c.role, "deals.write_any")) return;
  if (can(c.role, "deals.write_own") && d.ownerId === c.userId) return;
  throw new Denied("Você só pode alterar as próprias oportunidades.");
}

function canEditTask(c: Ctx, t: Task) {
  need(c, "tasks.write");
  if (t.assigneeId === c.userId || t.createdBy === c.userId || can(c.role, "tasks.assign_others"))
    return;
  throw new Denied("Esta tarefa é de outra pessoa.");
}

function defaultStages(): Stage[] {
  return [
    { id: newId("stg"), name: "Novo lead", probability: 10, kind: "aberta" },
    { id: newId("stg"), name: "Primeiro contato", probability: 20, kind: "aberta" },
    { id: newId("stg"), name: "Qualificação", probability: 35, kind: "aberta" },
    { id: newId("stg"), name: "Proposta", probability: 55, kind: "aberta" },
    { id: newId("stg"), name: "Negociação", probability: 75, kind: "aberta" },
    { id: newId("stg"), name: "Ganho", probability: 100, kind: "ganho" },
    { id: newId("stg"), name: "Perdido", probability: 0, kind: "perdido" },
  ];
}

export function defaultSettings(): Org["settings"] {
  return {
    timezone: "America/Fortaleza",
    responseSlaMin: 15,
    dailyTaskXpCap: 12,
    xp: {
      lead_qualificado: 30,
      tarefa_concluida: 10,
      reuniao_realizada: 40,
      oportunidade_ganha: 150,
      meta_atingida: 300,
      desafio_concluido: 0,
    },
  };
}

/** Pontos de uma oportunidade ganha: base fixa, nunca proporcional ao valor (evita inflar valores). */
function dealWon(c: Ctx, d: Deal) {
  award(
    c.s,
    c.orgId,
    d.ownerId,
    "oportunidade_ganha",
    `deal:${d.id}`,
    `Oportunidade ganha: ${d.title}`,
    c.now,
  );
  const contact = c.s.contacts.find((x) => x.id === d.contactId);
  if (contact && contact.status !== "cliente") contact.status = "cliente";
  notify(
    c,
    [...managers(c), d.ownerId],
    `${userName(c.s, d.ownerId)} ganhou ${d.title} (${brl(d.value)})`,
    `/crm/oportunidades?deal=${d.id}`,
  );
  openAccount(c, d);
}

// ---------- Camada B: o negócio ganho vira conta de restaurante ----------

/** Responsável de sucesso: quem cuida de menos implantações no time de Sucesso do cliente. */
function csmFor(c: Ctx, fallback: ID) {
  const success = new Set(
    c.s.departments
      .filter((d) => d.orgId === c.orgId && d.name.toLowerCase().includes("sucesso"))
      .map((d) => d.id),
  );
  const people = c.s.memberships.filter(
    (m) =>
      m.orgId === c.orgId &&
      m.status === "ativo" &&
      m.role !== "viewer" &&
      m.departmentId &&
      success.has(m.departmentId),
  );
  if (!people.length) return fallback;
  const load = (u: ID) =>
    c.s.accounts.filter((a) => a.csmId === u && a.status === "implantacao").length;
  return [...people].sort((a, b) => load(a.userId) - load(b.userId))[0]!.userId;
}

function openAccount(c: Ctx, d: Deal) {
  const existing = c.s.accounts.find(
    (a) =>
      a.orgId === c.orgId &&
      a.status !== "cancelada" &&
      (a.dealId === d.id || (!!d.companyId && a.companyId === d.companyId)),
  );
  if (existing) return existing;
  const company = c.s.companies.find((x) => x.id === d.companyId);
  const contact = c.s.contacts.find((x) => x.id === d.contactId);
  const lead = c.s.leads.find(
    (l) => l.orgId === c.orgId && (l.id === d.leadId || l.dealId === d.id),
  );
  const { plan, tables } = planForTables(lead?.profile.tables_range ?? company?.size);
  const csmId = csmFor(c, d.ownerId);
  const name = company?.name ?? contact?.name ?? d.title;
  const account: RestaurantAccount = {
    id: newId("acc"),
    orgId: c.orgId,
    name,
    slug: slugify(name),
    segment: company?.segment ?? "Restaurante",
    city: company?.city ?? "Fortaleza",
    neighborhood: company?.neighborhood ?? "",
    companyId: company?.id,
    contactId: contact?.id,
    dealId: d.id,
    leadId: lead?.id,
    csmId,
    plan,
    tables,
    status: "implantacao",
    onboarding: ONBOARDING.map((o) =>
      o.key === "contrato" ? { key: o.key, doneAt: c.now, doneBy: d.ownerId } : { key: o.key },
    ),
    modules: [...DEFAULT_MODULES],
    pdv: {
      provider: company?.pdv || lead?.profile.pdv_system || "A definir",
      status: "nao_iniciada",
    },
    pagarme: "pendente",
    createdAt: c.now,
    statusChangedAt: c.now,
  };
  c.s.accounts.push(account);
  const due = (days: number) => new Date(new Date(c.now).getTime() + days * 864e5).toISOString();
  const plan3: [string, Task["type"], number][] = [
    ["Kickoff de implantação", "reuniao", 1],
    ["Cadastrar cardápio, mesas e QR Codes", "tarefa", 3],
    ["Treinar a equipe no salão", "reuniao", 7],
  ];
  for (const [title, type, days] of plan3)
    c.s.tasks.push({
      id: newId("tsk"),
      orgId: c.orgId,
      title: `${title}: ${name}`,
      description: "Criada automaticamente quando o negócio foi ganho.",
      type,
      assigneeId: csmId,
      createdBy: c.userId,
      priority: days === 1 ? "alta" : "media",
      status: "pendente",
      dueAt: due(days),
      contactId: contact?.id,
      dealId: d.id,
      accountId: account.id,
      comments: [],
      createdAt: c.now,
    });
  activity(
    c,
    "account.created",
    `Conta ${name} criada: implantação iniciada com ${userName(c.s, csmId)}`,
    { type: "account", id: account.id },
    { contactId: contact?.id, dealId: d.id },
  );
  notify(c, [csmId], `Nova implantação para você: ${name}`, `/crm/contas/${account.id}`);
  return account;
}

/** Reabrir um negócio ganho desfaz a conta só se a implantação ainda nem começou. */
function dealReopened(c: Ctx, d: Deal) {
  const a = c.s.accounts.find((x) => x.orgId === c.orgId && x.dealId === d.id);
  if (!a || a.status !== "implantacao") return;
  const started = a.onboarding.some((x) => x.doneAt && x.key !== "contrato");
  if (started || c.s.visits.some((v) => v.accountId === a.id)) {
    notify(
      c,
      [a.csmId],
      `${d.title} foi reaberto no comercial: confira a implantação de ${a.name}`,
      `/crm/contas/${a.id}`,
    );
    return;
  }
  c.s.accounts = c.s.accounts.filter((x) => x.id !== a.id);
  c.s.tasks = c.s.tasks.filter((t) => t.accountId !== a.id || t.status === "concluida");
  activity(c, "account.removed", `Implantação de ${a.name} desfeita: negócio reaberto`, {
    type: "deal",
    id: d.id,
  });
}

function activateIfReady(c: Ctx, a: RestaurantAccount) {
  if (a.status !== "implantacao" || !ONBOARDING.every((o) => stepDone(a, o.key))) return;
  a.status = "ativa";
  a.activatedAt = c.now;
  a.statusChangedAt = c.now;
  a.statusReason = undefined;
  const deal = c.s.deals.find((d) => d.id === a.dealId);
  activity(c, "account.activated", `${a.name} está ativa na Tipe`, { type: "account", id: a.id });
  notify(
    c,
    [a.csmId, ...(deal ? [deal.ownerId] : []), ...managers(c)],
    `${a.name} concluiu a implantação e está ativa`,
    `/crm/contas/${a.id}`,
  );
}

function accountStep(a: RestaurantAccount, key: OnboardingKey) {
  const st = a.onboarding.find((x) => x.key === key);
  if (st) return st;
  const created = { key };
  a.onboarding.push(created);
  return created as RestaurantAccount["onboarding"][number];
}

const MODULE_OF: Record<BillMethod, ModuleKey> = {
  pix: "pix",
  apple_pay: "apple_pay",
  google_pay: "google_pay",
  estabelecimento: "pagar_no_estabelecimento",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const userName = (s: CrmState, id: ID | undefined) =>
  s.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "Alguém";

function upsertContactFrom(
  c: Ctx,
  name: string,
  email: string,
  phone: string,
  companyName: string,
  source: string,
  ownerId: ID,
) {
  const byEmail = email
    ? c.s.contacts.find((x) => x.orgId === c.orgId && x.email.toLowerCase() === email.toLowerCase())
    : undefined;
  const byPhone = phone
    ? c.s.contacts.find(
        (x) =>
          x.orgId === c.orgId &&
          (digits(x.whatsapp) === digits(phone) || digits(x.phone) === digits(phone)),
      )
    : undefined;
  let contact = byEmail ?? byPhone;
  let company = companyName
    ? c.s.companies.find(
        (x) => x.orgId === c.orgId && x.name.toLowerCase() === companyName.toLowerCase(),
      )
    : undefined;
  if (companyName && !company) {
    company = {
      id: newId("cmp"),
      orgId: c.orgId,
      name: companyName,
      segment: "Restaurante",
      city: "Fortaleza",
      neighborhood: "",
      size: "",
      pdv: "",
      ownerId,
      tags: [],
      createdAt: c.now,
    };
    c.s.companies.push(company);
    activity(c, "company.created", `Empresa ${company.name} criada`, {
      type: "company",
      id: company.id,
    });
  }
  if (!contact) {
    limit(c, "contacts", "contatos");
    contact = {
      id: newId("ctt"),
      orgId: c.orgId,
      name,
      companyId: company?.id,
      phone,
      whatsapp: phone,
      email,
      jobTitle: "",
      source,
      ownerId,
      status: "ativo",
      tags: [],
      notes: "",
      createdAt: c.now,
      updatedAt: c.now,
    };
    c.s.contacts.push(contact);
    activity(
      c,
      "contact.created",
      `Contato ${name} criado`,
      { type: "contact", id: contact.id },
      { contactId: contact.id },
    );
  }
  return { contact, company };
}

function conversationContact(c: Ctx, conversationId: ID) {
  const conv = own(c, c.s.conversations, conversationId, "Conversa");
  const contact = own(c, c.s.contacts, conv.contactId, "Contato");
  return { conv, contact };
}

function firstPipeline(c: Ctx, pipelineId?: ID) {
  const p = pipelineId
    ? own(c, c.s.pipelines, pipelineId, "Funil")
    : c.s.pipelines.find((x) => x.orgId === c.orgId);
  if (!p) throw new Invalid("Crie um funil antes de criar oportunidades.");
  return p;
}

function msg(
  c: Ctx,
  conversationId: ID,
  direction: Message["direction"],
  text: string,
  authorId?: ID,
): Message {
  const m: Message = {
    id: newId("msg"),
    orgId: c.orgId,
    conversationId,
    direction,
    authorId,
    text,
    at: c.now,
    status: "simulada",
    simulated: true,
  };
  c.s.messages.push(m);
  return m;
}

function waLog(c: Ctx, direction: "webhook" | "envio", event: string, detail: string) {
  c.s.waLogs.unshift({
    id: newId("wal"),
    orgId: c.orgId,
    at: c.now,
    direction,
    event,
    status: "simulado",
    detail,
  });
  if (c.s.waLogs.length > 300) c.s.waLogs.length = 300;
}

// ---------- Execução ----------

export function dispatch(state: CrmState, cmd: Command, now = new Date().toISOString()): Result {
  const s: CrmState = structuredClone(state);
  try {
    const out = run(s, cmd, now);
    return { ok: true, state: s, ...(out ?? {}) };
  } catch (e) {
    if (e instanceof Denied || e instanceof Invalid) {
      if (e instanceof Denied) {
        const failed = structuredClone(state);
        audit(
          failed,
          now,
          state.session?.orgId ?? null,
          state.session?.userId ?? null,
          cmd.type,
          e.message,
          "negado",
        );
        return { ok: false, state: failed, error: e.message };
      }
      return { ok: false, state, error: e.message };
    }
    throw e;
  }
}

function run(
  s: CrmState,
  cmd: Command,
  now: string,
): { id?: ID | undefined; message?: string | undefined } | void {
  if (cmd.type === "login") {
    const u = s.users.find((x) => x.email.toLowerCase() === clean(cmd.email).toLowerCase());
    if (!u || u.password !== cmd.password)
      throw new Invalid("E-mail ou senha não conferem. Use uma das contas de demonstração.");
    const m = s.memberships.find((x) => x.userId === u.id && x.status === "ativo");
    if (!m) throw new Invalid("Esta conta ainda não participa de nenhuma organização.");
    s.session = { userId: u.id, orgId: m.orgId };
    audit(s, now, m.orgId, u.id, "login", u.email, "ok");
    return;
  }
  if (cmd.type === "logout") {
    s.session = null;
    return;
  }

  const c = ctxOf(s, now);

  switch (cmd.type) {
    case "switchOrg": {
      const m = s.memberships.find(
        (x) => x.userId === c.userId && x.orgId === cmd.orgId && x.status === "ativo",
      );
      if (!m) throw new Denied("Você não participa desta organização.");
      s.session = { userId: c.userId, orgId: cmd.orgId };
      audit(s, now, cmd.orgId, c.userId, "org.switch", cmd.orgId, "ok");
      return;
    }
    case "createOrg": {
      const name = clean(cmd.name);
      if (name.length < 3)
        throw new Invalid("Dê um nome com pelo menos 3 letras para a organização.");
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (s.orgs.some((o) => o.slug === slug))
        throw new Invalid("Já existe uma organização com esse nome.");
      const org: Org = {
        id: newId("org"),
        name,
        slug,
        segment: clean(cmd.segment) || "Comercial",
        createdAt: now,
        status: "ativa",
        settings: defaultSettings(),
      };
      s.orgs.push(org);
      s.memberships.push({
        id: newId("mem"),
        orgId: org.id,
        userId: c.userId,
        role: "owner",
        status: "ativo",
        joinedAt: now,
      });
      s.pipelines.push({
        id: newId("pip"),
        orgId: org.id,
        name: "Funil comercial",
        stages: defaultStages(),
        createdAt: now,
      });
      const trialEnds = new Date(new Date(now).getTime() + 14 * 864e5).toISOString();
      s.subscriptions.push({
        orgId: org.id,
        planId: "starter",
        status: "teste",
        cycle: "mensal",
        startedAt: now,
        renewsAt: trialEnds,
        trialEndsAt: trialEnds,
      });
      s.waInstances.push({
        id: newId("wai"),
        orgId: org.id,
        name: "Número de demonstração",
        phone: "+55 85 90000-0000",
        provider: "demo",
        status: "demonstracao",
        createdAt: now,
      });
      s.quickReplies.push({
        id: newId("qr"),
        orgId: org.id,
        shortcut: "/ola",
        text: "Olá! Obrigado pelo contato. Como posso ajudar?",
      });
      s.session = { userId: c.userId, orgId: org.id };
      audit(s, now, org.id, c.userId, "org.create", name, "ok");
      s.activities.unshift({
        id: newId("act"),
        orgId: org.id,
        at: now,
        actorId: c.userId,
        kind: "org.created",
        summary: `Organização ${name} criada`,
        entity: { type: "org", id: org.id },
      });
      return { id: org.id, message: `${name} criada com teste grátis de 14 dias no Starter.` };
    }
    case "updateOrgSettings": {
      need(c, "org.settings");
      if (cmd.name !== undefined) {
        if (clean(cmd.name).length < 3) throw new Invalid("Dê um nome com pelo menos 3 letras.");
        c.org.name = clean(cmd.name);
      }
      if (cmd.responseSlaMin !== undefined) {
        if (cmd.responseSlaMin < 1 || cmd.responseSlaMin > 1440)
          throw new Invalid("O prazo de resposta vai de 1 a 1440 minutos.");
        c.org.settings.responseSlaMin = cmd.responseSlaMin;
      }
      if (cmd.dailyTaskXpCap !== undefined) {
        if (cmd.dailyTaskXpCap < 0 || cmd.dailyTaskXpCap > 100)
          throw new Invalid("O limite diário vai de 0 a 100 tarefas.");
        c.org.settings.dailyTaskXpCap = cmd.dailyTaskXpCap;
      }
      if (cmd.xp)
        for (const [k, v] of Object.entries(cmd.xp)) {
          if (v === undefined || v < 0 || v > 2000)
            throw new Invalid("Os pontos por evento vão de 0 a 2000.");
          c.org.settings.xp[k as XpKind] = v;
        }
      audit(s, now, c.orgId, c.userId, "org.settings", c.org.name, "ok");
      activity(c, "org.updated", "Configurações da organização atualizadas", {
        type: "org",
        id: c.orgId,
      });
      return;
    }
    case "updateProfile": {
      if (clean(cmd.name).length < 3) throw new Invalid("Informe seu nome completo.");
      const u = s.users.find((x) => x.id === c.userId)!;
      u.name = clean(cmd.name);
      u.title = clean(cmd.title);
      return;
    }
    case "inviteMember": {
      need(c, "members.invite");
      const email = clean(cmd.email).toLowerCase();
      if (!EMAIL.test(email)) throw new Invalid("O e-mail do convite não parece válido.");
      if (clean(cmd.name).length < 2) throw new Invalid("Informe o nome de quem será convidado.");
      if (cmd.role === "owner" && c.role !== "owner")
        throw new Denied("Só o proprietário pode convidar outro proprietário.");
      const existing = s.users.find((u) => u.email.toLowerCase() === email);
      if (
        existing &&
        s.memberships.some(
          (m) => m.orgId === c.orgId && m.userId === existing.id && m.status === "ativo",
        )
      )
        throw new Invalid("Essa pessoa já faz parte da organização.");
      if (
        s.invites.some((i) => i.orgId === c.orgId && i.email === email && i.status === "pendente")
      )
        throw new Invalid("Já existe um convite pendente para esse e-mail.");
      if (cmd.teamId) own(c, s.teams, cmd.teamId, "Equipe");
      limit(c, "users", "usuários");
      const inv = {
        id: newId("inv"),
        orgId: c.orgId,
        email,
        name: clean(cmd.name),
        role: cmd.role,
        teamId: cmd.teamId,
        status: "pendente" as const,
        invitedBy: c.userId,
        createdAt: now,
      };
      s.invites.push(inv);
      audit(s, now, c.orgId, c.userId, "member.invite", email, "ok");
      activity(c, "member.invited", `Convite enviado para ${inv.name}`, {
        type: "member",
        id: inv.id,
      });
      return {
        id: inv.id,
        message: "Convite registrado. No modo demonstração nenhum e-mail é enviado.",
      };
    }
    case "acceptInvite": {
      need(c, "members.invite");
      const inv = own(c, s.invites, cmd.inviteId, "Convite");
      if (inv.status !== "pendente") throw new Invalid("Este convite não está mais pendente.");
      let user = s.users.find((u) => u.email.toLowerCase() === inv.email);
      if (!user) {
        user = {
          id: newId("usr"),
          name: inv.name,
          email: inv.email,
          password: "demo1234",
          title: "",
          createdAt: now,
        };
        s.users.push(user);
      }
      s.memberships.push({
        id: newId("mem"),
        orgId: c.orgId,
        userId: user.id,
        role: inv.role,
        teamId: inv.teamId,
        status: "ativo",
        joinedAt: now,
      });
      inv.status = "aceito";
      audit(s, now, c.orgId, user.id, "member.join", inv.email, "ok");
      activity(c, "member.joined", `${user.name} entrou como ${ROLE_LABEL[inv.role]}`, {
        type: "member",
        id: user.id,
      });
      return { id: user.id, message: `${user.name} entrou. Senha de demonstração: demo1234.` };
    }
    case "revokeInvite": {
      need(c, "members.invite");
      const inv = own(c, s.invites, cmd.inviteId, "Convite");
      inv.status = "revogado";
      audit(s, now, c.orgId, c.userId, "member.invite_revoke", inv.email, "ok");
      return;
    }
    case "changeRole": {
      need(c, "members.role");
      const m = own(c, s.memberships, cmd.membershipId, "Membro") as Membership;
      if ((m.role === "owner" || cmd.role === "owner") && c.role !== "owner")
        throw new Denied("Só o proprietário altera o papel de proprietário.");
      if (
        m.role === "owner" &&
        cmd.role !== "owner" &&
        s.memberships.filter(
          (x) => x.orgId === c.orgId && x.role === "owner" && x.status === "ativo",
        ).length <= 1
      )
        throw new Invalid("A organização precisa de pelo menos um proprietário.");
      const before = m.role;
      m.role = cmd.role;
      audit(
        s,
        now,
        c.orgId,
        c.userId,
        "member.role",
        `${userName(s, m.userId)}: ${ROLE_LABEL[before]} → ${ROLE_LABEL[cmd.role]}`,
        "ok",
      );
      activity(
        c,
        "member.role",
        `${userName(s, m.userId)} agora é ${ROLE_LABEL[cmd.role]}`,
        { type: "member", id: m.userId },
        { changes: { role: [before, cmd.role] } },
      );
      notify(c, [m.userId], `Seu papel em ${c.org.name} mudou`, "/crm/perfil");
      return;
    }
    case "setMemberTeam": {
      need(c, "teams.manage");
      const m = own(c, s.memberships, cmd.membershipId, "Membro") as Membership;
      if (cmd.teamId) own(c, s.teams, cmd.teamId, "Equipe");
      if (cmd.departmentId) own(c, s.departments, cmd.departmentId, "Departamento");
      m.teamId = cmd.teamId;
      m.departmentId = cmd.departmentId;
      activity(c, "member.team", `${userName(s, m.userId)} mudou de equipe`, {
        type: "member",
        id: m.userId,
      });
      return;
    }
    case "removeMember": {
      need(c, "members.role");
      const m = own(c, s.memberships, cmd.membershipId, "Membro") as Membership;
      if (m.userId === c.userId) throw new Invalid("Você não pode remover a si mesmo.");
      if (m.role === "owner" && c.role !== "owner")
        throw new Denied("Só o proprietário remove outro proprietário.");
      m.status = "suspenso";
      audit(s, now, c.orgId, c.userId, "member.remove", userName(s, m.userId), "ok");
      activity(c, "member.removed", `${userName(s, m.userId)} perdeu o acesso`, {
        type: "member",
        id: m.userId,
      });
      return;
    }
    case "createTeam":
    case "createDepartment": {
      need(c, "teams.manage");
      const name = clean(cmd.name);
      if (name.length < 2) throw new Invalid("Informe o nome.");
      const list = cmd.type === "createTeam" ? s.teams : s.departments;
      if (list.some((t) => t.orgId === c.orgId && t.name.toLowerCase() === name.toLowerCase()))
        throw new Invalid("Esse nome já existe.");
      const item = { id: newId(cmd.type === "createTeam" ? "tm" : "dep"), orgId: c.orgId, name };
      list.push(item);
      return { id: item.id };
    }

    case "createContact": {
      need(c, "contacts.write");
      validateContact(c, cmd.data, true);
      limit(c, "contacts", "contatos");
      const d = cmd.data;
      const dupe =
        d.email &&
        s.contacts.find(
          (x) => x.orgId === c.orgId && x.email.toLowerCase() === clean(d.email).toLowerCase(),
        );
      if (dupe) throw new Invalid(`Já existe um contato com esse e-mail: ${dupe.name}.`);
      const contact: Contact = {
        id: newId("ctt"),
        orgId: c.orgId,
        name: clean(d.name),
        companyId: d.companyId || undefined,
        phone: clean(d.phone),
        whatsapp: clean(d.whatsapp),
        email: clean(d.email).toLowerCase(),
        jobTitle: clean(d.jobTitle),
        source: d.source || "Manual",
        ownerId: d.ownerId,
        status: d.status ?? "ativo",
        tags: d.tags ?? [],
        notes: clean(d.notes),
        createdAt: now,
        updatedAt: now,
      };
      s.contacts.push(contact);
      activity(
        c,
        "contact.created",
        `Contato ${contact.name} criado`,
        { type: "contact", id: contact.id },
        { contactId: contact.id },
      );
      if (contact.ownerId !== c.userId)
        notify(
          c,
          [contact.ownerId],
          `Novo contato para você: ${contact.name}`,
          `/crm/contatos/${contact.id}`,
        );
      return { id: contact.id };
    }
    case "updateContact": {
      need(c, "contacts.write");
      const contact = own(c, s.contacts, cmd.id, "Contato");
      validateContact(c, cmd.data, false);
      const patch = {
        ...cmd.data,
        ...(cmd.data.email !== undefined ? { email: clean(cmd.data.email).toLowerCase() } : {}),
      };
      const changes = diff(contact, patch);
      if (!Object.keys(changes).length) return;
      Object.assign(contact, patch, { updatedAt: now });
      activity(
        c,
        "contact.updated",
        `Contato ${contact.name} atualizado`,
        { type: "contact", id: contact.id },
        { contactId: contact.id, changes },
      );
      return;
    }
    case "deleteContact": {
      need(c, "contacts.delete");
      const contact = own(c, s.contacts, cmd.id, "Contato");
      if (s.deals.some((d) => d.contactId === contact.id && d.status === "aberta"))
        throw new Invalid(
          "Este contato tem oportunidades abertas. Encerre ou transfira antes de excluir.",
        );
      s.contacts = s.contacts.filter((x) => x.id !== contact.id);
      s.tasks.forEach((t) => {
        if (t.contactId === contact.id) t.contactId = undefined;
      });
      audit(s, now, c.orgId, c.userId, "contact.delete", contact.name, "ok");
      activity(c, "contact.deleted", `Contato ${contact.name} excluído`, {
        type: "contact",
        id: contact.id,
      });
      return;
    }
    case "createCompany": {
      need(c, "contacts.write");
      const name = clean(cmd.data.name);
      if (name.length < 2) throw new Invalid("Informe o nome da empresa.");
      if (
        s.companies.some((x) => x.orgId === c.orgId && x.name.toLowerCase() === name.toLowerCase())
      )
        throw new Invalid("Já existe uma empresa com esse nome.");
      memberOf(c, cmd.data.ownerId);
      const company: Company = {
        id: newId("cmp"),
        orgId: c.orgId,
        ...cmd.data,
        name,
        tags: cmd.data.tags ?? [],
        createdAt: now,
      };
      s.companies.push(company);
      activity(c, "company.created", `Empresa ${name} criada`, { type: "company", id: company.id });
      return { id: company.id };
    }
    case "updateCompany": {
      need(c, "contacts.write");
      const company = own(c, s.companies, cmd.id, "Empresa");
      if (cmd.data.name !== undefined && clean(cmd.data.name).length < 2)
        throw new Invalid("Informe o nome da empresa.");
      if (cmd.data.ownerId) memberOf(c, cmd.data.ownerId);
      const changes = diff(company, cmd.data);
      Object.assign(company, cmd.data);
      activity(
        c,
        "company.updated",
        `Empresa ${company.name} atualizada`,
        { type: "company", id: company.id },
        { changes },
      );
      return;
    }
    case "addNote": {
      if (c.role === "viewer") throw new Denied("Seu papel é somente leitura.");
      const text = clean(cmd.text);
      if (!text) throw new Invalid("Escreva a anotação.");
      if (cmd.contactId) own(c, s.contacts, cmd.contactId, "Contato");
      if (cmd.dealId) own(c, s.deals, cmd.dealId, "Oportunidade");
      const note = {
        id: newId("not"),
        orgId: c.orgId,
        contactId: cmd.contactId,
        dealId: cmd.dealId,
        userId: c.userId,
        text,
        at: now,
      };
      s.notes.push(note);
      activity(
        c,
        "note.added",
        "Anotação registrada",
        { type: cmd.dealId ? "deal" : "contact", id: (cmd.dealId ?? cmd.contactId)! },
        { contactId: cmd.contactId, dealId: cmd.dealId },
      );
      return { id: note.id };
    }

    case "createLead": {
      need(c, "leads.write");
      const d = cmd.data;
      if (clean(d.name).length < 2) throw new Invalid("Informe o nome do lead.");
      if (!clean(d.email) && !digits(d.phone))
        throw new Invalid("Informe e-mail ou telefone para poder contatar o lead.");
      if (d.email && !EMAIL.test(clean(d.email))) throw new Invalid("O e-mail não parece válido.");
      memberOf(c, d.ownerId);
      const lead: Lead = {
        id: newId("lea"),
        orgId: c.orgId,
        name: clean(d.name),
        companyName: clean(d.companyName),
        email: clean(d.email).toLowerCase(),
        phone: clean(d.phone),
        source: d.source || "Manual",
        status: "novo",
        ownerId: d.ownerId,
        profile: d.profile ?? {},
        createdAt: now,
      };
      s.leads.push(lead);
      activity(c, "lead.created", `Lead ${lead.name} criado`, { type: "lead", id: lead.id });
      notify(c, [lead.ownerId], `Novo lead para você: ${lead.name}`, `/crm/leads?lead=${lead.id}`);
      return { id: lead.id };
    }
    case "updateLead": {
      need(c, "leads.write");
      const lead = own(c, s.leads, cmd.id, "Lead");
      if (lead.status === "convertido")
        throw new Invalid("Lead convertido: edite o contato ou a oportunidade.");
      if (cmd.data.ownerId) memberOf(c, cmd.data.ownerId);
      if (cmd.data.email && !EMAIL.test(clean(cmd.data.email)))
        throw new Invalid("O e-mail não parece válido.");
      const changes = diff(lead, cmd.data);
      Object.assign(lead, cmd.data);
      if (lead.status === "novo" && changes["profile"]) lead.status = "contatado";
      activity(
        c,
        "lead.updated",
        `Lead ${lead.name} atualizado`,
        { type: "lead", id: lead.id },
        { changes },
      );
      return;
    }
    case "qualifyLead": {
      need(c, "leads.write");
      const lead = own(c, s.leads, cmd.id, "Lead");
      if (lead.status === "convertido" || lead.status === "qualificado")
        throw new Invalid("Este lead já foi qualificado.");
      const filled = Object.values(lead.profile).filter(Boolean).length;
      if (filled < 3)
        throw new Invalid(
          "Preencha pelo menos 3 informações do perfil (mesas, PDV, fila…) antes de qualificar.",
        );
      lead.status = "qualificado";
      lead.qualifiedAt = now;
      activity(
        c,
        "lead.qualified",
        `Lead ${lead.name} qualificado (pontuação ${leadScore(lead.profile)})`,
        { type: "lead", id: lead.id },
      );
      award(
        s,
        c.orgId,
        lead.ownerId,
        "lead_qualificado",
        `lead:${lead.id}`,
        `Lead qualificado: ${lead.name}`,
        now,
      );
      settleGoals(s, c.orgId, [lead.ownerId], now);
      return;
    }
    case "disqualifyLead": {
      need(c, "leads.write");
      const lead = own(c, s.leads, cmd.id, "Lead");
      if (!clean(cmd.reason)) throw new Invalid("Escolha o motivo.");
      if (lead.status === "convertido") throw new Invalid("Lead já convertido.");
      lead.status = "desqualificado";
      lead.disqualifyReason = cmd.reason;
      activity(c, "lead.disqualified", `Lead ${lead.name} desqualificado: ${cmd.reason}`, {
        type: "lead",
        id: lead.id,
      });
      return;
    }
    case "convertLead": {
      need(c, "leads.write");
      need(c, "deals.create");
      const lead = own(c, s.leads, cmd.id, "Lead");
      if (lead.status === "convertido") throw new Invalid("Este lead já virou oportunidade.");
      if (lead.status === "desqualificado") throw new Invalid("Reabra o lead antes de converter.");
      if (!(cmd.value > 0)) throw new Invalid("Informe o valor estimado da oportunidade.");
      const p = firstPipeline(c, cmd.pipelineId);
      if (!lead.qualifiedAt) {
        lead.qualifiedAt = now;
        award(
          s,
          c.orgId,
          lead.ownerId,
          "lead_qualificado",
          `lead:${lead.id}`,
          `Lead qualificado: ${lead.name}`,
          now,
        );
      }
      const { contact, company } = upsertContactFrom(
        c,
        lead.name,
        lead.email,
        lead.phone,
        lead.companyName,
        lead.source,
        lead.ownerId,
      );
      const stage =
        p.stages.find((st) => st.name === "Qualificação") ??
        p.stages.find((st) => st.kind === "aberta")!;
      const deal: Deal = {
        id: newId("dea"),
        orgId: c.orgId,
        pipelineId: p.id,
        stageId: stage.id,
        title: clean(cmd.title) || `${lead.companyName || lead.name}: assinatura Tipe`,
        contactId: contact.id,
        companyId: company?.id,
        leadId: lead.id,
        value: Math.round(cmd.value),
        ownerId: lead.ownerId,
        probability: stage.probability,
        priority: "media",
        status: "aberta",
        expectedClose: new Date(new Date(now).getTime() + 30 * 864e5).toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      s.deals.push(deal);
      lead.status = "convertido";
      lead.convertedAt = now;
      lead.contactId = contact.id;
      lead.dealId = deal.id;
      activity(
        c,
        "lead.converted",
        `Lead ${lead.name} convertido em oportunidade`,
        { type: "deal", id: deal.id },
        { contactId: contact.id, dealId: deal.id },
      );
      settleGoals(s, c.orgId, [lead.ownerId], now);
      return { id: deal.id };
    }

    case "createDeal": {
      need(c, "deals.create");
      const d = cmd.data;
      if (clean(d.title).length < 3) throw new Invalid("Dê um título para a oportunidade.");
      if (!(d.value >= 0)) throw new Invalid("O valor não pode ser negativo.");
      if (d.probability < 0 || d.probability > 100)
        throw new Invalid("A probabilidade vai de 0 a 100%.");
      own(c, s.contacts, d.contactId, "Cliente");
      if (d.companyId) own(c, s.companies, d.companyId, "Empresa");
      memberOf(c, d.ownerId);
      if (d.ownerId !== c.userId && !can(c.role, "deals.write_any") && c.role !== "agent")
        throw new Denied("Você só pode criar oportunidades para si.");
      const p = own(c, s.pipelines, d.pipelineId, "Funil");
      const st = stageOf(p, d.stageId);
      if (st.kind !== "aberta")
        throw new Invalid("Crie a oportunidade numa etapa aberta e mova depois.");
      const deal: Deal = {
        id: newId("dea"),
        orgId: c.orgId,
        ...d,
        title: clean(d.title),
        value: Math.round(d.value),
        status: "aberta",
        createdAt: now,
        updatedAt: now,
      };
      s.deals.push(deal);
      activity(
        c,
        "deal.created",
        `Oportunidade ${deal.title} criada`,
        { type: "deal", id: deal.id },
        { contactId: deal.contactId, dealId: deal.id },
      );
      notify(
        c,
        [deal.ownerId],
        `Nova oportunidade para você: ${deal.title}`,
        `/crm/oportunidades?deal=${deal.id}`,
      );
      return { id: deal.id };
    }
    case "updateDeal": {
      const deal = own(c, s.deals, cmd.id, "Oportunidade");
      canEditDeal(c, deal);
      const d = cmd.data;
      if (d.title !== undefined && clean(d.title).length < 3)
        throw new Invalid("Dê um título para a oportunidade.");
      if (d.value !== undefined && !(d.value >= 0))
        throw new Invalid("O valor não pode ser negativo.");
      if (d.probability !== undefined && (d.probability < 0 || d.probability > 100))
        throw new Invalid("A probabilidade vai de 0 a 100%.");
      if (d.ownerId) {
        memberOf(c, d.ownerId);
        if (d.ownerId !== deal.ownerId && !can(c.role, "deals.write_any"))
          throw new Denied("Só gestores transferem oportunidades.");
      }
      if (d.contactId) own(c, s.contacts, d.contactId, "Cliente");
      if (d.stageId && d.stageId !== deal.stageId)
        throw new Invalid("Use o funil para mudar a etapa.");
      const changes = diff(deal, d);
      const prevOwner = deal.ownerId;
      Object.assign(deal, d, { updatedAt: now });
      if (deal.status === "ganha" && (changes["ownerId"] || changes["value"])) {
        revoke(s, `deal:${deal.id}`, now, "Oportunidade ganha alterada");
        award(
          s,
          c.orgId,
          deal.ownerId,
          "oportunidade_ganha",
          `deal:${deal.id}`,
          `Oportunidade ganha: ${deal.title}`,
          now,
        );
        settleGoals(s, c.orgId, [prevOwner, deal.ownerId], now);
      }
      activity(
        c,
        "deal.updated",
        `Oportunidade ${deal.title} atualizada`,
        { type: "deal", id: deal.id },
        { contactId: deal.contactId, dealId: deal.id, changes },
      );
      return;
    }
    case "moveDeal": {
      const deal = own(c, s.deals, cmd.id, "Oportunidade");
      canEditDeal(c, deal);
      const p = own(c, s.pipelines, deal.pipelineId, "Funil");
      const from = stageOf(p, deal.stageId);
      const to = stageOf(p, cmd.stageId);
      if (from.id === to.id) return;
      if (to.kind === "perdido" && !clean(cmd.lostReason))
        throw new Invalid("Informe o motivo da perda.");
      const wasWon = deal.status === "ganha";
      deal.stageId = to.id;
      deal.updatedAt = now;
      deal.probability = to.probability;
      if (to.kind === "ganho") {
        deal.status = "ganha";
        deal.closedAt = now;
        deal.lostReason = undefined;
      } else if (to.kind === "perdido") {
        deal.status = "perdida";
        deal.closedAt = now;
        deal.lostReason = clean(cmd.lostReason);
      } else {
        deal.status = "aberta";
        deal.closedAt = undefined;
        deal.lostReason = undefined;
      }
      activity(
        c,
        to.kind === "ganho" ? "deal.won" : to.kind === "perdido" ? "deal.lost" : "deal.moved",
        `${deal.title}: ${from.name} → ${to.name}`,
        { type: "deal", id: deal.id },
        { contactId: deal.contactId, dealId: deal.id, changes: { etapa: [from.name, to.name] } },
      );
      if (to.kind === "ganho") dealWon(c, deal);
      if (wasWon && to.kind !== "ganho") {
        revoke(s, `deal:${deal.id}`, now, `Oportunidade reaberta: ${deal.title}`);
        dealReopened(c, deal);
      }
      settleGoals(s, c.orgId, [deal.ownerId], now);
      return;
    }
    case "deleteDeal": {
      need(c, "deals.delete");
      const deal = own(c, s.deals, cmd.id, "Oportunidade");
      revoke(s, `deal:${deal.id}`, now, "Oportunidade excluída");
      s.deals = s.deals.filter((d) => d.id !== deal.id);
      s.tasks.forEach((t) => {
        if (t.dealId === deal.id) t.dealId = undefined;
      });
      settleGoals(s, c.orgId, [deal.ownerId], now);
      audit(s, now, c.orgId, c.userId, "deal.delete", deal.title, "ok");
      activity(
        c,
        "deal.deleted",
        `Oportunidade ${deal.title} excluída`,
        { type: "deal", id: deal.id },
        { contactId: deal.contactId },
      );
      return;
    }
    case "createPipeline": {
      need(c, "pipelines.manage");
      if (clean(cmd.name).length < 3) throw new Invalid("Dê um nome ao funil.");
      limit(c, "pipelines", "funis");
      const p: Pipeline = {
        id: newId("pip"),
        orgId: c.orgId,
        name: clean(cmd.name),
        stages: defaultStages(),
        createdAt: now,
      };
      s.pipelines.push(p);
      activity(c, "pipeline.created", `Funil ${p.name} criado`, { type: "pipeline", id: p.id });
      return { id: p.id };
    }
    case "updateStages": {
      need(c, "pipelines.manage");
      const p = own(c, s.pipelines, cmd.pipelineId, "Funil");
      const stages = cmd.stages.map((st) => ({ ...st, name: clean(st.name) }));
      if (stages.some((st) => st.name.length < 2)) throw new Invalid("Toda etapa precisa de nome.");
      if (
        stages.filter((st) => st.kind === "ganho").length !== 1 ||
        stages.filter((st) => st.kind === "perdido").length !== 1
      )
        throw new Invalid("O funil precisa de exatamente uma etapa de ganho e uma de perda.");
      if (stages.filter((st) => st.kind === "aberta").length < 1)
        throw new Invalid("O funil precisa de ao menos uma etapa aberta.");
      if (stages.some((st) => st.probability < 0 || st.probability > 100))
        throw new Invalid("A probabilidade vai de 0 a 100%.");
      const removed = p.stages.filter((st) => !stages.some((n) => n.id === st.id));
      const blocked = removed.find((st) => s.deals.some((d) => d.stageId === st.id));
      if (blocked)
        throw new Invalid(
          `A etapa ${blocked.name} ainda tem oportunidades. Mova-as antes de remover.`,
        );
      p.stages = stages.map((st) => ({ ...st, id: st.id || newId("stg") }));
      activity(c, "pipeline.updated", `Etapas do funil ${p.name} atualizadas`, {
        type: "pipeline",
        id: p.id,
      });
      return;
    }

    case "createTask": {
      need(c, "tasks.write");
      const d = cmd.data;
      if (clean(d.title).length < 3) throw new Invalid("Descreva a tarefa em pelo menos 3 letras.");
      if (!d.dueAt || Number.isNaN(Date.parse(d.dueAt))) throw new Invalid("Escolha o prazo.");
      memberOf(c, d.assigneeId);
      if (d.assigneeId !== c.userId && !can(c.role, "tasks.assign_others"))
        throw new Denied("Seu papel só permite criar tarefas para você.");
      if (d.contactId) own(c, s.contacts, d.contactId, "Contato");
      if (d.dealId) own(c, s.deals, d.dealId, "Oportunidade");
      const task: Task = {
        id: newId("tsk"),
        orgId: c.orgId,
        title: clean(d.title),
        description: clean(d.description),
        type: d.type,
        assigneeId: d.assigneeId,
        createdBy: c.userId,
        priority: d.priority,
        status: "pendente",
        dueAt: d.dueAt,
        contactId: d.contactId || undefined,
        dealId: d.dealId || undefined,
        comments: [],
        createdAt: now,
      };
      s.tasks.push(task);
      activity(
        c,
        "task.created",
        `Tarefa ${task.title} criada`,
        { type: "task", id: task.id },
        { contactId: task.contactId, dealId: task.dealId },
      );
      notify(
        c,
        [task.assigneeId],
        `${userName(s, c.userId)} atribuiu a você: ${task.title}`,
        `/crm/tarefas?tarefa=${task.id}`,
      );
      return { id: task.id };
    }
    case "updateTask": {
      const task = own(c, s.tasks, cmd.id, "Tarefa");
      canEditTask(c, task);
      const d = cmd.data;
      if (d.title !== undefined && clean(d.title).length < 3)
        throw new Invalid("Descreva a tarefa em pelo menos 3 letras.");
      if (d.assigneeId && d.assigneeId !== task.assigneeId) {
        memberOf(c, d.assigneeId);
        if (!can(c.role, "tasks.assign_others") && d.assigneeId !== c.userId)
          throw new Denied("Seu papel não permite passar tarefas para outra pessoa.");
        notify(
          c,
          [d.assigneeId],
          `${userName(s, c.userId)} atribuiu a você: ${task.title}`,
          `/crm/tarefas?tarefa=${task.id}`,
        );
      }
      if (d.contactId) own(c, s.contacts, d.contactId, "Contato");
      if (d.dealId) own(c, s.deals, d.dealId, "Oportunidade");
      const changes = diff(task, d);
      Object.assign(task, d);
      activity(
        c,
        "task.updated",
        `Tarefa ${task.title} atualizada`,
        { type: "task", id: task.id },
        { contactId: task.contactId, dealId: task.dealId, changes },
      );
      return;
    }
    case "setTaskStatus": {
      const task = own(c, s.tasks, cmd.id, "Tarefa");
      canEditTask(c, task);
      if (task.status === cmd.status) return;
      const was = task.status;
      task.status = cmd.status;
      const ref = `task:${task.id}`;
      if (cmd.status === "concluida") {
        task.completedAt = now;
        // Anti-fraude: tarefa criada e concluída em menos de 5 minutos pela própria pessoa,
        // sem vínculo com contato ou oportunidade, não gera pontos.
        const quick =
          new Date(now).getTime() - new Date(task.createdAt).getTime() < 5 * 60000 &&
          task.createdBy === task.assigneeId &&
          !task.contactId &&
          !task.dealId;
        if (!quick)
          award(
            s,
            c.orgId,
            task.assigneeId,
            task.type === "reuniao" ? "reuniao_realizada" : "tarefa_concluida",
            ref,
            `${task.type === "reuniao" ? "Reunião realizada" : "Tarefa concluída"}: ${task.title}`,
            now,
          );
        activity(
          c,
          task.type === "reuniao" ? "meeting.done" : "task.done",
          `${task.type === "reuniao" ? "Reunião realizada" : "Tarefa concluída"}: ${task.title}`,
          { type: "task", id: task.id },
          { contactId: task.contactId, dealId: task.dealId },
        );
        if (task.createdBy !== task.assigneeId)
          notify(
            c,
            [task.createdBy],
            `${userName(s, task.assigneeId)} concluiu: ${task.title}`,
            `/crm/tarefas?tarefa=${task.id}`,
          );
      } else {
        task.completedAt = undefined;
        if (was === "concluida") revoke(s, ref, now, `Tarefa reaberta: ${task.title}`);
        activity(
          c,
          "task.status",
          `Tarefa ${task.title}: ${cmd.status.replace("_", " ")}`,
          { type: "task", id: task.id },
          { contactId: task.contactId, dealId: task.dealId },
        );
      }
      settleGoals(s, c.orgId, [task.assigneeId], now);
      return;
    }
    case "commentTask": {
      const task = own(c, s.tasks, cmd.id, "Tarefa");
      need(c, "tasks.write");
      if (!clean(cmd.text)) throw new Invalid("Escreva o comentário.");
      const comment: Comment = {
        id: newId("cmt"),
        userId: c.userId,
        text: clean(cmd.text),
        at: now,
      };
      task.comments.push(comment);
      notify(
        c,
        [task.assigneeId, task.createdBy],
        `${userName(s, c.userId)} comentou em ${task.title}`,
        `/crm/tarefas?tarefa=${task.id}`,
      );
      return;
    }
    case "deleteTask": {
      const task = own(c, s.tasks, cmd.id, "Tarefa");
      canEditTask(c, task);
      revoke(s, `task:${task.id}`, now, "Tarefa excluída");
      s.tasks = s.tasks.filter((t) => t.id !== task.id);
      settleGoals(s, c.orgId, [task.assigneeId], now);
      activity(
        c,
        "task.deleted",
        `Tarefa ${task.title} excluída`,
        { type: "task", id: task.id },
        { contactId: task.contactId, dealId: task.dealId },
      );
      return;
    }

    case "simulateInbound": {
      need(c, "inbox.simulate");
      const text = clean(cmd.text);
      if (!text) throw new Invalid("Escreva a mensagem simulada.");
      let contact = cmd.contactId ? own(c, s.contacts, cmd.contactId, "Contato") : undefined;
      if (!contact) {
        const phone = clean(cmd.phone);
        if (digits(phone).length < 10)
          throw new Invalid("Informe o telefone com DDD de quem enviou.");
        contact = s.contacts.find(
          (x) =>
            x.orgId === c.orgId &&
            (digits(x.whatsapp) === digits(phone) || digits(x.phone) === digits(phone)),
        );
        if (!contact)
          contact = upsertContactFrom(
            c,
            clean(cmd.name) || `WhatsApp ${phone}`,
            "",
            phone,
            "",
            "WhatsApp",
            c.userId,
          ).contact;
      }
      let conv = s.conversations.find(
        (x) => x.orgId === c.orgId && x.contactId === contact!.id && x.status !== "encerrada",
      );
      if (!conv) {
        const inst = s.waInstances.find((w) => w.orgId === c.orgId);
        conv = {
          id: newId("cnv"),
          orgId: c.orgId,
          contactId: contact.id,
          channel: "whatsapp",
          instanceId: inst?.id,
          status: "aberta",
          tags: [],
          unread: 0,
          createdAt: now,
          lastMessageAt: now,
        };
        s.conversations.push(conv);
      }
      conv.unread += 1;
      conv.lastMessageAt = now;
      if (conv.status === "pendente") conv.status = "aberta";
      msg(c, conv.id, "entrada", text);
      waLog(c, "webhook", "messages", `Mensagem simulada recebida de ${contact.name}`);
      notify(
        c,
        conv.assigneeId ? [conv.assigneeId] : managers(c),
        `Nova mensagem de ${contact.name}`,
        `/crm/atendimento?conversa=${conv.id}`,
      );
      activity(
        c,
        "conversation.in",
        `Mensagem recebida de ${contact.name} (simulada)`,
        { type: "conversation", id: conv.id },
        { contactId: contact.id },
      );
      return { id: conv.id };
    }
    case "sendMessage": {
      need(c, "inbox.reply");
      const { conv, contact } = conversationContact(c, cmd.conversationId);
      const text = clean(cmd.text);
      if (!text) throw new Invalid("Escreva a mensagem.");
      if (conv.status === "encerrada") throw new Invalid("Reabra a conversa para responder.");
      if (!conv.assigneeId) conv.assigneeId = c.userId;
      msg(c, conv.id, "saida", text, c.userId);
      conv.lastMessageAt = now;
      conv.unread = 0;
      waLog(
        c,
        "envio",
        "messages.send",
        `Envio simulado para ${contact.name}: nenhuma mensagem saiu para o WhatsApp`,
      );
      activity(
        c,
        "conversation.out",
        `Resposta para ${contact.name} (simulada)`,
        { type: "conversation", id: conv.id },
        { contactId: contact.id },
      );
      return;
    }
    case "addInternalNote": {
      need(c, "inbox.reply");
      const { conv } = conversationContact(c, cmd.conversationId);
      if (!clean(cmd.text)) throw new Invalid("Escreva a nota interna.");
      msg(c, conv.id, "nota", clean(cmd.text), c.userId);
      return;
    }
    case "assignConversation": {
      need(c, "inbox.assign");
      const { conv, contact } = conversationContact(c, cmd.conversationId);
      memberOf(c, cmd.userId, "Atendente");
      const before = conv.assigneeId;
      conv.assigneeId = cmd.userId;
      msg(
        c,
        conv.id,
        "nota",
        before
          ? `Transferida de ${userName(s, before)} para ${userName(s, cmd.userId)} por ${userName(s, c.userId)}`
          : `Atribuída a ${userName(s, cmd.userId)} por ${userName(s, c.userId)}`,
        c.userId,
      );
      notify(
        c,
        [cmd.userId],
        `Conversa com ${contact.name} atribuída a você`,
        `/crm/atendimento?conversa=${conv.id}`,
      );
      activity(
        c,
        before ? "conversation.transfer" : "conversation.assign",
        `Conversa com ${contact.name} ${before ? "transferida" : "atribuída"} para ${userName(s, cmd.userId)}`,
        { type: "conversation", id: conv.id },
        { contactId: contact.id },
      );
      return;
    }
    case "setConversationStatus": {
      need(c, "inbox.reply");
      const { conv, contact } = conversationContact(c, cmd.conversationId);
      conv.status = cmd.status;
      conv.closedAt = cmd.status === "encerrada" ? now : undefined;
      if (cmd.status === "encerrada") conv.unread = 0;
      activity(
        c,
        `conversation.${cmd.status}`,
        `Atendimento de ${contact.name}: ${cmd.status}`,
        { type: "conversation", id: conv.id },
        { contactId: contact.id },
      );
      return;
    }
    case "setConversationTags": {
      need(c, "inbox.reply");
      const { conv } = conversationContact(c, cmd.conversationId);
      conv.tags = [...new Set(cmd.tags.map(clean).filter(Boolean))].slice(0, 8);
      return;
    }
    case "markConversationRead": {
      const { conv } = conversationContact(c, cmd.conversationId);
      conv.unread = 0;
      return;
    }
    case "createDealFromConversation": {
      need(c, "deals.create");
      const { conv, contact } = conversationContact(c, cmd.conversationId);
      if (!(cmd.value > 0)) throw new Invalid("Informe o valor estimado.");
      const p = firstPipeline(c);
      const stage = p.stages.find((st) => st.kind === "aberta")!;
      const owner =
        can(c.role, "deals.write_own") || can(c.role, "deals.write_any")
          ? c.userId
          : contact.ownerId;
      const deal: Deal = {
        id: newId("dea"),
        orgId: c.orgId,
        pipelineId: p.id,
        stageId: stage.id,
        title: clean(cmd.title) || `${contact.name}: assinatura Tipe`,
        contactId: contact.id,
        companyId: contact.companyId,
        conversationId: conv.id,
        value: Math.round(cmd.value),
        ownerId: owner,
        probability: stage.probability,
        priority: "media",
        status: "aberta",
        expectedClose: new Date(new Date(now).getTime() + 30 * 864e5).toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      s.deals.push(deal);
      msg(c, conv.id, "nota", `Oportunidade criada: ${deal.title} (${brl(deal.value)})`, c.userId);
      activity(
        c,
        "deal.created",
        `Oportunidade ${deal.title} criada no atendimento`,
        { type: "deal", id: deal.id },
        { contactId: contact.id, dealId: deal.id },
      );
      notify(
        c,
        [owner],
        `Nova oportunidade do atendimento: ${deal.title}`,
        `/crm/oportunidades?deal=${deal.id}`,
      );
      return { id: deal.id };
    }
    case "createLeadFromConversation": {
      need(c, "leads.write");
      const { conv, contact } = conversationContact(c, cmd.conversationId);
      if (
        s.leads.some(
          (l) =>
            l.orgId === c.orgId &&
            l.contactId === contact.id &&
            l.status !== "desqualificado" &&
            l.status !== "convertido",
        )
      )
        throw new Invalid("Já existe um lead aberto para este contato.");
      const company = s.companies.find((x) => x.id === contact.companyId);
      const lead: Lead = {
        id: newId("lea"),
        orgId: c.orgId,
        name: contact.name,
        companyName: company?.name ?? "",
        email: contact.email,
        phone: contact.whatsapp || contact.phone,
        source: "WhatsApp",
        status: "contatado",
        ownerId: c.userId,
        profile: {},
        contactId: contact.id,
        createdAt: now,
      };
      s.leads.push(lead);
      msg(c, conv.id, "nota", `Lead criado para ${contact.name}`, c.userId);
      activity(
        c,
        "lead.created",
        `Lead ${lead.name} criado no atendimento`,
        { type: "lead", id: lead.id },
        { contactId: contact.id },
      );
      return { id: lead.id };
    }
    case "createQuickReply": {
      need(c, "inbox.assign");
      const shortcut = clean(cmd.shortcut).startsWith("/")
        ? clean(cmd.shortcut)
        : `/${clean(cmd.shortcut)}`;
      if (shortcut.length < 3 || !clean(cmd.text)) throw new Invalid("Informe atalho e texto.");
      if (s.quickReplies.some((q) => q.orgId === c.orgId && q.shortcut === shortcut))
        throw new Invalid("Esse atalho já existe.");
      s.quickReplies.push({ id: newId("qr"), orgId: c.orgId, shortcut, text: clean(cmd.text) });
      return;
    }
    case "deleteQuickReply": {
      need(c, "inbox.assign");
      own(c, s.quickReplies, cmd.id, "Resposta rápida");
      s.quickReplies = s.quickReplies.filter((q) => q.id !== cmd.id);
      return;
    }

    case "createTicket": {
      need(c, "tickets.write");
      if (clean(cmd.title).length < 4) throw new Invalid("Descreva o assunto do chamado.");
      if (clean(cmd.description).length < 10)
        throw new Invalid("Explique o que aconteceu em pelo menos 10 letras.");
      const acc = cmd.accountId ? own(c, s.accounts, cmd.accountId, "Conta") : undefined;
      const t: Ticket = {
        id: newId("tkt"),
        orgId: c.orgId,
        title: clean(cmd.title),
        description: clean(cmd.description),
        category: cmd.category,
        requesterId: c.userId,
        accountId: acc?.id,
        priority: cmd.priority,
        status: "aberto",
        comments: [],
        createdAt: now,
      };
      s.tickets.push(t);
      notify(
        c,
        [
          ...s.memberships
            .filter(
              (m) =>
                m.orgId === c.orgId &&
                (m.role === "agent" || m.role === "admin" || m.role === "owner"),
            )
            .map((m) => m.userId),
          ...(acc ? [acc.csmId] : []),
        ],
        acc ? `Chamado de ${acc.name}: ${t.title}` : `Novo chamado interno: ${t.title}`,
        `/crm/suporte?chamado=${t.id}`,
      );
      activity(c, "ticket.created", `Chamado ${t.title} aberto`, { type: "ticket", id: t.id });
      return { id: t.id };
    }
    case "updateTicket": {
      const t = own(c, s.tickets, cmd.id, "Chamado");
      if (!can(c.role, "tickets.manage") && t.requesterId !== c.userId)
        throw new Denied("Só a equipe de suporte altera chamados de outras pessoas.");
      if (cmd.assigneeId) {
        need(c, "tickets.manage");
        memberOf(c, cmd.assigneeId, "Atendente");
      }
      const changes = diff(t, {
        status: cmd.status,
        assigneeId: cmd.assigneeId,
        priority: cmd.priority,
      });
      if (cmd.status) {
        t.status = cmd.status;
        t.resolvedAt = cmd.status === "resolvido" ? now : undefined;
      }
      if (cmd.assigneeId) t.assigneeId = cmd.assigneeId;
      if (cmd.priority) t.priority = cmd.priority;
      if (cmd.status === "resolvido")
        notify(c, [t.requesterId], `Chamado resolvido: ${t.title}`, `/crm/suporte?chamado=${t.id}`);
      activity(
        c,
        "ticket.updated",
        `Chamado ${t.title} atualizado`,
        { type: "ticket", id: t.id },
        { changes },
      );
      return;
    }
    case "commentTicket": {
      const t = own(c, s.tickets, cmd.id, "Chamado");
      need(c, "tickets.write");
      if (!clean(cmd.text)) throw new Invalid("Escreva a resposta.");
      t.comments.push({ id: newId("cmt"), userId: c.userId, text: clean(cmd.text), at: now });
      if (t.status === "aberto" && can(c.role, "tickets.manage")) t.status = "em_andamento";
      notify(
        c,
        [t.requesterId, t.assigneeId ?? ""].filter(Boolean),
        `Nova resposta em ${t.title}`,
        `/crm/suporte?chamado=${t.id}`,
      );
      return;
    }

    case "createGoal": {
      need(c, "goals.manage");
      if (!(cmd.target > 0)) throw new Invalid("A meta precisa ser maior que zero.");
      if (!/^\d{4}-\d{2}$/.test(cmd.period)) throw new Invalid("Escolha o mês da meta.");
      if (cmd.scope === "individual") memberOf(c, cmd.userId, "Pessoa");
      else own(c, s.teams, cmd.teamId, "Equipe");
      const g: Goal = {
        id: newId("gol"),
        orgId: c.orgId,
        scope: cmd.scope,
        userId: cmd.scope === "individual" ? cmd.userId : undefined,
        teamId: cmd.scope === "equipe" ? cmd.teamId : undefined,
        metric: cmd.metric,
        target: cmd.target,
        period: cmd.period,
      };
      s.goals.push(g);
      settleGoals(
        s,
        c.orgId,
        cmd.scope === "individual"
          ? [cmd.userId!]
          : s.memberships
              .filter((m) => m.orgId === c.orgId && m.teamId === cmd.teamId)
              .map((m) => m.userId),
        now,
      );
      activity(c, "goal.created", "Meta criada", { type: "goal", id: g.id });
      return { id: g.id };
    }
    case "deleteGoal": {
      need(c, "goals.manage");
      const g = own(c, s.goals, cmd.id, "Meta");
      for (const e of s.xp.filter((x) => x.ref.startsWith(`meta:${g.id}:`)))
        revoke(s, e.ref, now, "Meta removida");
      s.goals = s.goals.filter((x) => x.id !== g.id);
      return;
    }
    case "createChallenge": {
      need(c, "goals.manage");
      if (clean(cmd.title).length < 4) throw new Invalid("Dê um nome ao desafio.");
      if (!(cmd.target > 0) || !(cmd.days > 0) || cmd.days > 90)
        throw new Invalid("Defina alvo e duração (até 90 dias).");
      if (cmd.reward < 0 || cmd.reward > 2000)
        throw new Invalid("A recompensa vai de 0 a 2000 pontos.");
      const ch: Challenge = {
        id: newId("chl"),
        orgId: c.orgId,
        title: clean(cmd.title),
        description: clean(cmd.description),
        metric: cmd.metric,
        target: cmd.target,
        startsAt: now,
        endsAt: new Date(new Date(now).getTime() + cmd.days * 864e5).toISOString(),
        reward: cmd.reward,
      };
      s.challenges.push(ch);
      return { id: ch.id };
    }

    case "changePlan": {
      need(c, "org.billing");
      const sub = subOf(s, c.orgId);
      if (!sub) throw new Invalid("Organização sem assinatura.");
      if (sub.planId === cmd.planId && sub.status === "ativa")
        throw new Invalid("Este já é o plano atual.");
      const plan = PLANS[cmd.planId];
      const u = usage(s, c.orgId);
      const over = (Object.keys(plan.limits) as (keyof typeof plan.limits)[]).find(
        (k) => u[k] > plan.limits[k],
      );
      if (over)
        throw new Invalid(
          `O uso atual passa do limite do ${plan.name} (${over}). Reduza o uso antes de mudar.`,
        );
      const before = sub.planId;
      sub.planId = cmd.planId;
      sub.status = "ativa";
      sub.trialEndsAt = undefined;
      sub.canceledAt = undefined;
      sub.renewsAt = new Date(new Date(now).getTime() + 30 * 864e5).toISOString();
      const n = s.invoices.filter((i) => i.orgId === c.orgId).length + 1;
      s.invoices.unshift({
        id: newId("fat"),
        orgId: c.orgId,
        number: `DEMO-${c.org.slug.slice(0, 6).toUpperCase()}-${String(n).padStart(4, "0")}`,
        description: `Plano ${plan.name}: mensalidade (${PLAN_ORDER.indexOf(cmd.planId) > PLAN_ORDER.indexOf(before) ? "upgrade" : "mudança"})`,
        amount: plan.priceMonthly,
        status: "paga",
        issuedAt: now,
        dueAt: now,
        paidAt: now,
        simulated: true,
      });
      audit(s, now, c.orgId, c.userId, "subscription.change", `${before} → ${cmd.planId}`, "ok");
      activity(
        c,
        "subscription.changed",
        `Plano alterado para ${plan.name} (contratação simulada)`,
        { type: "subscription", id: c.orgId },
        { changes: { plano: [before, cmd.planId] } },
      );
      return {
        message: `Plano ${plan.name} contratado em modo demonstração. Nenhum pagamento real foi processado.`,
      };
    }
    case "cancelSubscription": {
      need(c, "org.billing");
      const sub = subOf(s, c.orgId)!;
      if (sub.status === "cancelada") throw new Invalid("A assinatura já está cancelada.");
      sub.status = "cancelada";
      sub.canceledAt = now;
      audit(s, now, c.orgId, c.userId, "subscription.cancel", sub.planId, "ok");
      activity(c, "subscription.canceled", "Assinatura cancelada (simulação)", {
        type: "subscription",
        id: c.orgId,
      });
      return;
    }
    case "reactivateSubscription": {
      need(c, "org.billing");
      const sub = subOf(s, c.orgId)!;
      if (sub.status !== "cancelada") throw new Invalid("A assinatura não está cancelada.");
      sub.status = "ativa";
      sub.canceledAt = undefined;
      sub.renewsAt = new Date(new Date(now).getTime() + 30 * 864e5).toISOString();
      audit(s, now, c.orgId, c.userId, "subscription.reactivate", sub.planId, "ok");
      return;
    }
    case "payInvoice": {
      need(c, "org.billing");
      const inv = own(c, s.invoices, cmd.id, "Fatura");
      if (inv.status === "paga") throw new Invalid("Esta fatura já está paga.");
      inv.status = "paga";
      inv.paidAt = now;
      const sub = subOf(s, c.orgId);
      if (
        sub?.status === "em_atraso" &&
        !s.invoices.some((i) => i.orgId === c.orgId && i.status === "vencida")
      )
        sub.status = "ativa";
      audit(s, now, c.orgId, c.userId, "invoice.pay", inv.number, "ok");
      return { message: "Pagamento simulado registrado. Nenhum valor foi cobrado." };
    }
    case "createWaInstance": {
      need(c, "whatsapp.manage");
      if (clean(cmd.name).length < 2 || digits(cmd.phone).length < 12)
        throw new Invalid("Informe nome e número com código do país e DDD.");
      limit(c, "whatsappInstances", "números de WhatsApp");
      s.waInstances.push({
        id: newId("wai"),
        orgId: c.orgId,
        name: clean(cmd.name),
        phone: clean(cmd.phone),
        provider: "cloud_api",
        status: "aguardando_credenciais",
        createdAt: now,
      });
      audit(s, now, c.orgId, c.userId, "whatsapp.instance", clean(cmd.phone), "ok");
      return;
    }
    case "createWaTemplate": {
      need(c, "whatsapp.manage");
      const name = clean(cmd.name)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");
      if (name.length < 3 || clean(cmd.body).length < 5)
        throw new Invalid("Informe nome e texto do modelo.");
      if (s.waTemplates.some((t) => t.orgId === c.orgId && t.name === name))
        throw new Invalid("Já existe um modelo com esse nome.");
      s.waTemplates.push({
        id: newId("wat"),
        orgId: c.orgId,
        name,
        category: cmd.category,
        language: "pt_BR",
        body: clean(cmd.body),
        status: "pendente",
      });
      waLog(
        c,
        "envio",
        "message_templates.create",
        `Modelo ${name} registrado localmente. A aprovação real acontece na Meta.`,
      );
      return;
    }
    case "markNotificationsRead": {
      s.notifications.forEach((n) => {
        if (n.userId === c.userId && n.orgId === c.orgId) n.read = true;
      });
      return;
    }

    // ---------- Entrada pelo site (lista de espera de tipe.digital) ----------
    case "simulateSiteLead": {
      need(c, "leads.write");
      const n = s.leads.filter((l) => l.orgId === c.orgId && l.source === SITE_SOURCE).length;
      const sample = SITE_SAMPLES[n % SITE_SAMPLES.length]!;
      const round = Math.floor(n / SITE_SAMPLES.length);
      const companyName = round ? `${sample.company} ${round + 1}` : sample.company;
      // Distribui para quem vende e tem menos leads abertos.
      const sellers = s.memberships.filter(
        (m) =>
          m.orgId === c.orgId &&
          m.status === "ativo" &&
          (m.role === "seller" || m.role === "manager"),
      );
      const openLeads = (u: ID) =>
        s.leads.filter(
          (l) =>
            l.orgId === c.orgId &&
            l.ownerId === u &&
            (l.status === "novo" || l.status === "contatado"),
        ).length;
      const owner =
        [...sellers].sort((a, b) => openLeads(a.userId) - openLeads(b.userId))[0]?.userId ??
        c.userId;
      const lead: Lead = {
        id: newId("lea"),
        orgId: c.orgId,
        name: sample.name,
        companyName,
        email: `${slugify(sample.name).replace(/-/g, ".")}${round || ""}@exemplo.demo`,
        phone: `(85) 90000-${String(7100 + n).padStart(4, "0")}`,
        source: SITE_SOURCE,
        status: "novo",
        ownerId: owner,
        profile: { ...sample.profile, city: "Fortaleza" },
        createdAt: now,
      };
      s.leads.push(lead);
      activity(c, "lead.created", `Novo cadastro no site: ${companyName}`, {
        type: "lead",
        id: lead.id,
      });
      notify(
        c,
        [owner],
        `Novo lead do site para você: ${companyName} (${sample.neighborhood})`,
        `/crm/leads?lead=${lead.id}`,
      );
      return {
        id: lead.id,
        message: `Cadastro de ${companyName} recebido do site e distribuído para ${userName(s, owner)}.`,
      };
    }

    // ---------- Camada B: implantação, módulos, integrações e status ----------
    case "completeOnboardingStep": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      if (a.status === "cancelada")
        throw new Invalid("Conta cancelada: reative antes de continuar a implantação.");
      const def = ONBOARDING.find((o) => o.key === cmd.key);
      if (!def) throw new Invalid("Etapa desconhecida.");
      if (def.auto)
        throw new Invalid("Esta etapa é marcada sozinha quando a primeira conta é paga pela Tipe.");
      if (cmd.key === "pagamentos" && a.pagarme !== "aprovada")
        throw new Invalid(
          "A conta de recebimento ainda não foi aprovada. Atualize em Módulos e integrações.",
        );
      const st = accountStep(a, cmd.key);
      if (st.doneAt) return;
      st.doneAt = now;
      st.doneBy = c.userId;
      activity(c, "account.step", `${a.name}: ${def.label}`, { type: "account", id: a.id });
      activateIfReady(c, a);
      return;
    }
    case "reopenOnboardingStep": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      if (a.status !== "implantacao")
        throw new Invalid("Só dá para reabrir etapas durante a implantação.");
      if (cmd.key === "contrato" || cmd.key === "primeira_conta")
        throw new Invalid("Esta etapa vem de um fato registrado e não pode ser reaberta.");
      const st = accountStep(a, cmd.key);
      st.doneAt = undefined;
      st.doneBy = undefined;
      activity(c, "account.step_reopened", `${a.name}: etapa reaberta`, {
        type: "account",
        id: a.id,
      });
      return;
    }
    case "setAccountModule": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      const def = MODULES.find((m) => m.key === cmd.module);
      if (!def) throw new Invalid("Módulo desconhecido.");
      const has = a.modules.includes(cmd.module);
      if (has === cmd.enabled) return;
      if (
        cmd.enabled &&
        def.minPlan &&
        RESTAURANT_PLAN_ORDER.indexOf(a.plan) < RESTAURANT_PLAN_ORDER.indexOf(def.minPlan)
      )
        throw new Invalid(
          `${def.label} faz parte do plano ${restaurantPlan(def.minPlan).name}. Mude o plano da conta para ativar.`,
        );
      const next = cmd.enabled
        ? [...a.modules, cmd.module]
        : a.modules.filter((m) => m !== cmd.module);
      if (!(Object.values(MODULE_OF) as ModuleKey[]).some((m) => next.includes(m)))
        throw new Invalid("Deixe ao menos uma forma de pagar a conta ligada.");
      a.modules = next;
      activity(
        c,
        "account.module",
        `${a.name}: ${def.label} ${cmd.enabled ? "ligado" : "desligado"}`,
        { type: "account", id: a.id },
      );
      return;
    }
    case "changeAccountPlan": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      const plan = restaurantPlan(cmd.plan);
      const tables = Math.round(cmd.tables);
      if (!(tables >= 1)) throw new Invalid("Informe o número de mesas.");
      if (tables > plan.maxTables)
        throw new Invalid(`O plano ${plan.name} vai até ${plan.maxTables} mesas.`);
      const blocked = MODULES.filter(
        (m) =>
          m.minPlan &&
          a.modules.includes(m.key) &&
          RESTAURANT_PLAN_ORDER.indexOf(cmd.plan) < RESTAURANT_PLAN_ORDER.indexOf(m.minPlan),
      );
      if (blocked.length)
        throw new Invalid(
          `Desligue ${blocked.map((m) => m.label).join(" e ")} antes de mudar para o ${plan.name}.`,
        );
      const changes = diff(a, { plan: cmd.plan, tables });
      a.plan = cmd.plan;
      a.tables = tables;
      activity(
        c,
        "account.plan",
        `${a.name}: plano ${plan.name} com ${tables} mesas`,
        { type: "account", id: a.id },
        { changes },
      );
      return;
    }
    case "setAccountIntegration": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      if (cmd.pdv) a.pdv.status = cmd.pdv;
      if (cmd.pagarme) a.pagarme = cmd.pagarme;
      activity(c, "account.integration", `${a.name}: integrações atualizadas`, {
        type: "account",
        id: a.id,
      });
      return;
    }
    case "setAccountStatus": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      if (a.status === cmd.status) return;
      const reason = clean(cmd.reason);
      if (cmd.status !== "ativa" && reason.length < 3) throw new Invalid("Informe o motivo.");
      if (cmd.status === "pausada" && a.status !== "ativa")
        throw new Invalid("Só contas ativas podem ser pausadas.");
      if (cmd.status === "ativa" && !a.activatedAt)
        throw new Invalid("Esta conta ainda não concluiu a implantação.");
      const before = a.status;
      a.status = cmd.status;
      a.statusChangedAt = now;
      a.statusReason = cmd.status === "ativa" ? undefined : reason;
      const deal = s.deals.find((d) => d.id === a.dealId);
      audit(
        s,
        now,
        c.orgId,
        c.userId,
        "account.status",
        `${a.name}: ${before} → ${cmd.status}`,
        "ok",
      );
      activity(
        c,
        `account.${cmd.status}`,
        cmd.status === "ativa"
          ? `${a.name} reativada`
          : `${a.name} ${cmd.status === "pausada" ? "pausada" : "cancelada"}: ${reason}`,
        { type: "account", id: a.id },
        { changes: { status: [before, cmd.status] } },
      );
      notify(
        c,
        [a.csmId, ...(deal ? [deal.ownerId] : []), ...managers(c)],
        cmd.status === "ativa"
          ? `${a.name} foi reativada`
          : `${a.name} ${cmd.status === "pausada" ? "foi pausada" : "cancelou"}: ${reason}`,
        `/crm/contas/${a.id}`,
      );
      return;
    }
    case "assignAccountCsm": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      memberOf(c, cmd.userId);
      if (a.csmId === cmd.userId) return;
      a.csmId = cmd.userId;
      notify(c, [cmd.userId], `${a.name} agora é sua conta`, `/crm/contas/${a.id}`);
      activity(c, "account.csm", `${a.name}: responsável agora é ${userName(s, cmd.userId)}`, {
        type: "account",
        id: a.id,
      });
      return;
    }

    // ---------- Camada C: conta paga no salão (simulada) e campanhas ----------
    case "simulateVisit": {
      need(c, "accounts.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      if (a.status === "pausada" || a.status === "cancelada")
        throw new Invalid("Conta pausada ou cancelada não recebe pagamentos.");
      if (!stepDone(a, "mesas_qr") || !stepDone(a, "pagamentos"))
        throw new Invalid(
          "Conclua Mesas e QR Codes e Recebimentos ativos antes de receber a primeira conta.",
        );
      const methods = (Object.keys(MODULE_OF) as BillMethod[]).filter((m) =>
        a.modules.includes(MODULE_OF[m]),
      );
      const r = Math.random;
      const pick = <T>(list: readonly T[]) => list[Math.floor(r() * list.length)]!;
      const pool = s.consumers.filter((x) => x.accountId === a.id);
      let consumer: Consumer | undefined;
      if (r() < 0.6) {
        if (pool.length && r() < 0.55) consumer = pick(pool);
        else {
          const optIn = r() < 0.6;
          consumer = {
            id: newId("cli"),
            orgId: c.orgId,
            accountId: a.id,
            name: pick(DEMO_CONSUMERS),
            phoneLast4: String(1000 + Math.floor(r() * 9000)),
            marketingOptIn: optIn,
            optInAt: optIn ? now : undefined,
            createdAt: now,
          };
          s.consumers.push(consumer);
        }
      }
      const menu = menuFor(a.segment);
      const amount = Math.round((55 + r() * 230) * 100) / 100;
      const tip =
        a.modules.includes("gorjeta") && r() < 0.45
          ? Math.round(amount * pick([0.03, 0.05, 0.05, 0.08]) * 100) / 100
          : 0;
      const visit = {
        id: newId("vis"),
        orgId: c.orgId,
        accountId: a.id,
        consumerId: consumer?.id,
        at: now,
        table: String(1 + Math.floor(r() * a.tables)),
        waiter: pick(DEMO_WAITERS),
        amount,
        serviceFee: Math.round(amount * 0.1 * 100) / 100,
        tip,
        method: pick(methods),
        rating: a.modules.includes("avaliacao") && r() < 0.7 ? pick([5, 5, 5, 4, 4, 3]) : undefined,
        items: Array.from({ length: 1 + Math.floor(r() * 3) }, () => pick(menu)),
        source: "demo" as const,
      };
      s.visits.push(visit);
      const first = !stepDone(a, "primeira_conta");
      if (first) {
        const st = accountStep(a, "primeira_conta");
        st.doneAt = now;
        st.doneBy = c.userId;
        const deal = s.deals.find((d) => d.id === a.dealId);
        notify(
          c,
          [a.csmId, ...(deal ? [deal.ownerId] : [])],
          `${a.name} recebeu a primeira conta pela Tipe`,
          `/crm/contas/${a.id}`,
        );
      }
      activity(
        c,
        first ? "account.first_bill" : "visit.paid",
        `${a.name}: mesa ${visit.table} pagou ${brl(amount)} com ${METHOD_LABEL[visit.method]}${tip ? ` e deixou gorjeta de ${brl(tip)}` : ""} (simulado)`,
        { type: "account", id: a.id },
      );
      activateIfReady(c, a);
      return {
        id: visit.id,
        message: first
          ? `Primeira conta paga em ${a.name}. ${a.status === "ativa" ? "Implantação concluída: conta ativa!" : "Falta concluir as outras etapas da implantação."}`
          : `Mesa ${visit.table} pagou com ${METHOD_LABEL[visit.method]} (simulado).`,
      };
    }
    case "createCampaign": {
      need(c, "campaigns.manage");
      const a = own(c, s.accounts, cmd.accountId, "Conta");
      const name = clean(cmd.name);
      const message = clean(cmd.message);
      if (name.length < 3) throw new Invalid("Dê um nome para a campanha.");
      if (message.length < 10) throw new Invalid("Escreva a mensagem, com pelo menos 10 letras.");
      if (!SEGMENT_LABEL[cmd.segment]) throw new Invalid("Escolha o grupo de clientes.");
      const audience = campaignAudience(
        consumerProfiles(s, c.orgId, now, a.id),
        cmd.segment,
      ).length;
      if (!audience)
        throw new Invalid(
          "Ninguém deste grupo autorizou receber mensagens. A campanha só vai para quem deu consentimento.",
        );
      const campaign = {
        id: newId("cpg"),
        orgId: c.orgId,
        accountId: a.id,
        name,
        segment: cmd.segment,
        message,
        channel: "whatsapp" as const,
        status: "simulada" as const,
        audience,
        createdBy: c.userId,
        createdAt: now,
      };
      s.campaigns.unshift(campaign);
      activity(
        c,
        "campaign.created",
        `Campanha ${name} de ${a.name} para ${audience} clientes (simulada)`,
        { type: "campaign", id: campaign.id },
      );
      return {
        id: campaign.id,
        message: `Campanha simulada para ${audience} clientes com consentimento. Nenhuma mensagem foi enviada.`,
      };
    }
  }
}

export { monthKey };
