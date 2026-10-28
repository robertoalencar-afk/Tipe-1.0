import { PLANS as RESTAURANT_PLANS } from "../plans";
import type {
  AccountStatus,
  BillMethod,
  Consumer,
  ConsumerSegment,
  CrmState,
  EntitledModule,
  EntitlementState,
  ID,
  ModuleKey,
  OnboardingKey,
  PagarmeStatus,
  PdvStatus,
  RestaurantAccount,
  RestaurantPlan,
  Visit,
} from "./types";

// Ecossistema Tipe em três camadas, todas na mesma base:
//   A. Comercial (vender a Tipe): lead → oportunidade → ganho
//   B. Conta do restaurante: implantação → ativação → uso, saúde e suporte
//   C. Clientes do restaurante: cada conta paga vira visita; quem se identifica vira cliente
// Este módulo só lê o estado (funções puras). Quem escreve é o motor.

const DAY = 864e5;

// ---------- Camada B: implantação ----------

export const ONBOARDING: { key: OnboardingKey; label: string; hint: string; auto?: boolean }[] = [
  { key: "contrato", label: "Contrato assinado", hint: "Marcado quando a oportunidade é ganha." },
  {
    key: "cadastro",
    label: "Cadastro e CNPJ",
    hint: "Restaurante criado na plataforma (signup_restaurant).",
  },
  { key: "cardapio", label: "Cardápio importado", hint: "Itens e preços conferidos com o PDV." },
  { key: "mesas_qr", label: "Mesas e QR Codes", hint: "Mesas cadastradas e totens impressos." },
  {
    key: "pagamentos",
    label: "Recebimentos ativos",
    hint: "Conta de recebimento aprovada e Pix, Apple Pay e Google Pay ligados.",
  },
  { key: "equipe", label: "Equipe cadastrada", hint: "Garçons com acesso e mesa atribuída." },
  { key: "treinamento", label: "Treinamento no salão", hint: "Turno acompanhado pela Tipe." },
  {
    key: "primeira_conta",
    label: "Primeira conta paga",
    hint: "Marcada sozinha quando a primeira conta é paga pela Tipe.",
    auto: true,
  },
];

export const ONBOARDING_LABEL = Object.fromEntries(
  ONBOARDING.map((o) => [o.key, o.label]),
) as Record<OnboardingKey, string>;

export function onboardingProgress(a: RestaurantAccount) {
  const done = a.onboarding.filter((x) => x.doneAt).length;
  const next = ONBOARDING.find((o) => !a.onboarding.find((x) => x.key === o.key)?.doneAt);
  return {
    done,
    total: ONBOARDING.length,
    pct: Math.round((done / ONBOARDING.length) * 100),
    next,
  };
}

export function stepDone(a: RestaurantAccount, key: OnboardingKey) {
  return !!a.onboarding.find((x) => x.key === key)?.doneAt;
}

export const ACCOUNT_STATUS: Record<
  AccountStatus,
  { label: string; tone: "info" | "success" | "warning" | "neutral" }
> = {
  implantacao: { label: "Em implantação", tone: "info" },
  ativa: { label: "Ativa", tone: "success" },
  pausada: { label: "Pausada", tone: "warning" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

export const MODULES: {
  key: ModuleKey;
  label: string;
  group: "Pagamento da conta" | "Experiência" | "Operação";
  minPlan?: RestaurantPlan | undefined;
}[] = [
  { key: "pix", label: "Pix", group: "Pagamento da conta" },
  { key: "apple_pay", label: "Apple Pay", group: "Pagamento da conta" },
  { key: "google_pay", label: "Google Pay", group: "Pagamento da conta" },
  {
    key: "pagar_no_estabelecimento",
    label: "Pagar no estabelecimento",
    group: "Pagamento da conta",
  },
  { key: "gorjeta", label: "Gorjeta extra para o garçom", group: "Experiência" },
  { key: "avaliacao", label: "Avaliação do atendimento", group: "Experiência" },
  { key: "lebre", label: "Assistente Lebre", group: "Experiência" },
  { key: "pedido_na_mesa", label: "Pedido pela mesa", group: "Operação" },
  { key: "totem", label: "Totens personalizados", group: "Operação", minPlan: "profissional" },
  { key: "kds", label: "Cozinha e bar (KDS)", group: "Operação", minPlan: "premium" },
];
export const MODULE_LABEL = Object.fromEntries(MODULES.map((m) => [m.key, m.label])) as Record<
  ModuleKey,
  string
>;
export const DEFAULT_MODULES: ModuleKey[] = [
  "pix",
  "apple_pay",
  "google_pay",
  "pagar_no_estabelecimento",
  "gorjeta",
  "avaliacao",
];

export const ENTITLED_MODULES: EntitledModule[] = ["pedido_na_mesa"];
export const ENTITLEMENT_STATE: Record<
  EntitlementState | "nao_contratado",
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  ativo: { label: "Ativo", tone: "success" },
  suspenso: { label: "Suspenso", tone: "warning" },
  cancelado: { label: "Cancelado", tone: "neutral" },
  nao_contratado: { label: "Não contratado", tone: "neutral" },
};

/** Estado do contrato de um módulo à parte. Contas antigas só têm a chave em `modules`. */
export function entitlementOf(
  a: Pick<RestaurantAccount, "modules" | "entitlements">,
  key: EntitledModule,
): EntitlementState | "nao_contratado" {
  return a.entitlements?.[key]?.state ?? (a.modules.includes(key) ? "ativo" : "nao_contratado");
}

export const PDV_STATUS: Record<PdvStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_homologacao: "Em homologação",
  conectada: "Conectada",
  lancamento_tipe: "Lançamento Tipe (sem PDV externo)",
};
export const PAGARME_STATUS: Record<PagarmeStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovada: "Aprovada",
};

export const METHOD_LABEL: Record<BillMethod, string> = {
  pix: "Pix",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  estabelecimento: "No estabelecimento",
};

export const RESTAURANT_PLAN_ORDER: RestaurantPlan[] = ["essencial", "profissional", "premium"];
export function restaurantPlan(id: RestaurantPlan) {
  const p = RESTAURANT_PLANS.find((x) => x.id === id);
  if (!p) throw new Error(`Plano desconhecido: ${id}`);
  return p;
}

/** Plano indicado pelo número de mesas informado no lead ou na empresa. */
export function planForTables(range: string | undefined): {
  plan: RestaurantPlan;
  tables: number;
} {
  const r = (range ?? "").toLowerCase();
  if (r.includes("40_mais") || r.includes("mais de 40")) return { plan: "premium", tables: 40 };
  if (r.includes("21")) return { plan: "premium", tables: 28 };
  if (r.includes("11")) return { plan: "profissional", tables: 16 };
  return { plan: "essencial", tables: 8 };
}

// ---------- Uso e saúde da conta ----------

export type Window = { from: number; to: number };
const inWin = (iso: string, w: Window) => {
  const t = new Date(iso).getTime();
  return t >= w.from && t < w.to;
};
export const lastDays = (days: number, now: string): Window => {
  const to = new Date(now).getTime();
  return { from: to - days * DAY, to: to + 1 };
};

export function accountVisits(s: CrmState, accountId: ID, w?: Window) {
  return s.visits.filter((v) => v.accountId === accountId && (!w || inWin(v.at, w)));
}

export function orgVisits(s: CrmState, orgId: ID, w?: Window) {
  return s.visits.filter((v) => v.orgId === orgId && (!w || inWin(v.at, w)));
}

export function usageSummary(visits: Visit[]) {
  const n = visits.length;
  const gmv = visits.reduce((a, v) => a + v.amount, 0);
  const tips = visits.reduce((a, v) => a + v.tip, 0);
  const rated = visits.filter((v) => v.rating !== undefined);
  const identified = visits.filter((v) => v.consumerId).length;
  const methods = (Object.keys(METHOD_LABEL) as BillMethod[]).map((m) => ({
    method: m,
    label: METHOD_LABEL[m],
    count: visits.filter((v) => v.method === m).length,
  }));
  return {
    bills: n,
    gmv,
    tips,
    tipRate: n ? Math.round((visits.filter((v) => v.tip > 0).length / n) * 100) : null,
    avgTicket: n ? gmv / n : null,
    rating: rated.length ? rated.reduce((a, v) => a + (v.rating ?? 0), 0) / rated.length : null,
    ratings: rated.length,
    identifiedPct: n ? Math.round((identified / n) * 100) : null,
    tablesUsed: new Set(visits.map((v) => v.table)).size,
    methods,
  };
}

/** Série diária (contas pagas, volume e gorjetas) para gráficos. */
export function dailySeries(visits: Visit[], days: number, now: string) {
  const end = new Date(now);
  // Meia-noite de hoje em Fortaleza (UTC-3).
  end.setUTCHours(3, 0, 0, 0);
  if (end.getTime() > new Date(now).getTime()) end.setTime(end.getTime() - DAY);
  const out: { dia: string; contas: number; volume: number; gorjetas: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = end.getTime() - i * DAY;
    const w = { from, to: from + DAY };
    const vs = visits.filter((v) => inWin(v.at, w));
    out.push({
      dia: new Date(from + 4 * 36e5).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      contas: vs.length,
      volume: Math.round(vs.reduce((a, v) => a + v.amount, 0)),
      gorjetas: Math.round(vs.reduce((a, v) => a + v.tip, 0)),
    });
  }
  return out;
}

export type Health = {
  score: number | null;
  label: "Saudável" | "Atenção" | "Em risco" | "Em implantação" | "Inativa";
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  reasons: string[];
};

/**
 * Saúde da conta (0 a 100), calculada só de fatos: tendência de uso, avaliações,
 * chamados abertos e dias com movimento. Contas em implantação ainda não têm nota.
 */
export function accountHealth(s: CrmState, a: RestaurantAccount, now: string): Health {
  if (a.status === "implantacao")
    return { score: null, label: "Em implantação", tone: "info", reasons: [] };
  if (a.status !== "ativa") return { score: null, label: "Inativa", tone: "neutral", reasons: [] };
  const t = new Date(now).getTime();
  const recent = accountVisits(s, a.id, lastDays(14, now));
  const before = accountVisits(s, a.id, { from: t - 28 * DAY, to: t - 14 * DAY });
  const reasons: string[] = [];
  let score = 0;
  // Tendência de uso (até 40)
  if (!before.length) score += recent.length ? 32 : 10;
  else {
    const ratio = recent.length / before.length;
    score += Math.max(0, Math.min(40, Math.round(ratio * 34)));
    if (ratio < 0.75) reasons.push(`Uso caiu ${Math.round((1 - ratio) * 100)}% em 14 dias`);
  }
  // Avaliação (até 25)
  const u = usageSummary(accountVisits(s, a.id, lastDays(30, now)));
  if (u.rating === null) score += 15;
  else {
    score += Math.max(0, Math.min(25, Math.round(((u.rating - 3) / 2) * 25)));
    if (u.rating < 4.2) reasons.push(`Avaliação média ${u.rating.toFixed(1).replace(".", ",")}`);
  }
  // Chamados abertos (até 20)
  const open = s.tickets.filter((x) => x.accountId === a.id && x.status !== "resolvido");
  score += Math.max(0, 20 - open.reduce((acc, x) => acc + (x.priority === "alta" ? 12 : 6), 0));
  if (open.length)
    reasons.push(`${open.length} chamado${open.length > 1 ? "s abertos" : " aberto"}`);
  // Dias com movimento na última semana (até 15)
  const days7 = new Set(accountVisits(s, a.id, lastDays(7, now)).map((v) => v.at.slice(0, 10)))
    .size;
  score += Math.round((Math.min(days7, 7) / 7) * 15);
  if (days7 <= 3) reasons.push(`Movimento em só ${days7} dos últimos 7 dias`);
  score = Math.max(0, Math.min(100, score));
  if (score >= 70) return { score, label: "Saudável", tone: "success", reasons };
  if (score >= 45) return { score, label: "Atenção", tone: "warning", reasons };
  return { score, label: "Em risco", tone: "danger", reasons };
}

// ---------- Camada C: clientes do restaurante ----------

export const SEGMENT_LABEL: Record<ConsumerSegment, string> = {
  todos: "Todos",
  novos: "Novos",
  recorrentes: "Recorrentes",
  fieis: "Fiéis",
  em_risco: "Sumidos",
};
export const SEGMENT_HINT: Record<ConsumerSegment, string> = {
  todos: "Todos os clientes identificados.",
  novos: "Uma visita até agora.",
  recorrentes: "De 2 a 4 visitas.",
  fieis: "5 visitas ou mais.",
  em_risco: "Já voltaram antes, mas não aparecem há mais de 30 dias.",
};

export type ConsumerProfile = {
  consumer: Consumer;
  visits: Visit[];
  count: number;
  total: number;
  avgTicket: number;
  tips: number;
  rating: number | null;
  first: string;
  last: string;
  favorite: string[];
  method: BillMethod;
  segment: Exclude<ConsumerSegment, "todos">;
};

export function consumerProfiles(s: CrmState, orgId: ID, now: string, accountId?: ID) {
  const byConsumer = new Map<ID, Visit[]>();
  for (const v of s.visits) {
    if (v.orgId !== orgId || !v.consumerId || (accountId && v.accountId !== accountId)) continue;
    const list = byConsumer.get(v.consumerId);
    if (list) list.push(v);
    else byConsumer.set(v.consumerId, [v]);
  }
  const t = new Date(now).getTime();
  const out: ConsumerProfile[] = [];
  for (const c of s.consumers) {
    if (c.orgId !== orgId || (accountId && c.accountId !== accountId)) continue;
    const vs = (byConsumer.get(c.id) ?? []).sort((a, b) => a.at.localeCompare(b.at));
    const first = vs[0];
    const lastVisit = vs[vs.length - 1];
    if (!first || !lastVisit) continue;
    const total = vs.reduce((a, v) => a + v.amount, 0);
    const rated = vs.filter((v) => v.rating !== undefined);
    const items = new Map<string, number>();
    vs.forEach((v) => v.items.forEach((i) => items.set(i, (items.get(i) ?? 0) + 1)));
    const methods = new Map<BillMethod, number>();
    vs.forEach((v) => methods.set(v.method, (methods.get(v.method) ?? 0) + 1));
    const sinceLast = (t - new Date(lastVisit.at).getTime()) / DAY;
    const segment: ConsumerProfile["segment"] =
      vs.length >= 2 && sinceLast > 30
        ? "em_risco"
        : vs.length >= 5
          ? "fieis"
          : vs.length >= 2
            ? "recorrentes"
            : "novos";
    out.push({
      consumer: c,
      visits: vs,
      count: vs.length,
      total,
      avgTicket: total / vs.length,
      tips: vs.reduce((a, v) => a + v.tip, 0),
      rating: rated.length ? rated.reduce((a, v) => a + (v.rating ?? 0), 0) / rated.length : null,
      first: first.at,
      last: lastVisit.at,
      favorite: [...items.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k),
      method: [...methods.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "pix",
      segment,
    });
  }
  return out.sort((a, b) => b.last.localeCompare(a.last));
}

export function segmentCounts(profiles: ConsumerProfile[]) {
  const c: Record<ConsumerSegment, number> = {
    todos: profiles.length,
    novos: 0,
    recorrentes: 0,
    fieis: 0,
    em_risco: 0,
  };
  profiles.forEach((p) => (c[p.segment] += 1));
  return c;
}

/** Público de uma campanha: só quem deu consentimento (LGPD). */
export function campaignAudience(profiles: ConsumerProfile[], segment: ConsumerSegment) {
  return profiles.filter(
    (p) => p.consumer.marketingOptIn && (segment === "todos" || p.segment === segment),
  );
}

export const maskPhone = (last4: string) => `(••) •••••-${last4}`;

// ---------- Fluxo integrado e rastreabilidade ----------

export const SITE_SOURCE = "Site (lista de espera)";
export const isSiteSource = (src: string) =>
  src === SITE_SOURCE || src === "Lista de espera" || src.startsWith("Site");

/** Contagens de cada etapa da jornada, da lista de espera do site ao cliente final. */
export function journeyCounts(s: CrmState, orgId: ID, now: string) {
  const leads = s.leads.filter((l) => l.orgId === orgId);
  const deals = s.deals.filter((d) => d.orgId === orgId);
  const accounts = s.accounts.filter((a) => a.orgId === orgId);
  const visits30 = orgVisits(s, orgId, lastDays(30, now));
  return {
    siteLeads: leads.filter((l) => isSiteSource(l.source)).length,
    leads: leads.length,
    qualified: leads.filter((l) => l.qualifiedAt).length,
    deals: deals.length,
    open: deals.filter((d) => d.status === "aberta").length,
    won: deals.filter((d) => d.status === "ganha").length,
    accounts: accounts.length,
    onboarding: accounts.filter((a) => a.status === "implantacao").length,
    active: accounts.filter((a) => a.status === "ativa").length,
    churned: accounts.filter((a) => a.status === "cancelada").length,
    bills30: visits30.length,
    gmv30: visits30.reduce((a, v) => a + v.amount, 0),
    tips30: visits30.reduce((a, v) => a + v.tip, 0),
    consumers: s.consumers.filter((c) => c.orgId === orgId).length,
    optIn: s.consumers.filter((c) => c.orgId === orgId && c.marketingOptIn).length,
  };
}

export type JourneyStep = {
  layer: "A" | "B" | "C";
  label: string;
  at?: string | undefined;
  detail?: string | undefined;
  href?: string | undefined;
};

/** Rastro completo de uma conta: do lead que chegou pelo site às contas pagas pelos clientes. */
export function accountJourney(s: CrmState, a: RestaurantAccount): JourneyStep[] {
  const lead = s.leads.find((l) => l.id === a.leadId);
  const deal = s.deals.find((d) => d.id === a.dealId);
  const visits = accountVisits(s, a.id).sort((x, y) => x.at.localeCompare(y.at));
  const steps: JourneyStep[] = [];
  if (lead) {
    steps.push({
      layer: "A",
      label: "Lead recebido",
      at: lead.createdAt,
      detail: `Origem: ${lead.source}`,
      href: `/crm/leads?lead=${lead.id}`,
    });
    if (lead.qualifiedAt)
      steps.push({ layer: "A", label: "Lead qualificado", at: lead.qualifiedAt });
  }
  if (deal) {
    steps.push({
      layer: "A",
      label: "Oportunidade aberta",
      at: deal.createdAt,
      detail: deal.title,
      href: `/crm/oportunidades?deal=${deal.id}`,
    });
    if (deal.status === "ganha" && deal.closedAt)
      steps.push({ layer: "A", label: "Negócio ganho", at: deal.closedAt });
  }
  steps.push({ layer: "B", label: "Conta criada, implantação iniciada", at: a.createdAt });
  for (const o of ONBOARDING) {
    const st = a.onboarding.find((x) => x.key === o.key);
    if (st?.doneAt && o.key !== "contrato" && o.key !== "primeira_conta")
      steps.push({ layer: "B", label: o.label, at: st.doneAt });
  }
  if (a.activatedAt) steps.push({ layer: "B", label: "Conta ativada", at: a.activatedAt });
  const first = visits[0];
  const last = visits[visits.length - 1];
  if (first)
    steps.push({
      layer: "C",
      label: "Primeira conta paga pela Tipe",
      at: first.at,
      detail: `Mesa ${first.table} · ${METHOD_LABEL[first.method]}`,
    });
  if (last && visits.length > 1) {
    const consumers = new Set(visits.map((v) => v.consumerId).filter(Boolean)).size;
    steps.push({
      layer: "C",
      label: `${visits.length.toLocaleString("pt-BR")} contas pagas, ${consumers} clientes identificados`,
      at: last.at,
      href: `/crm/clientes?conta=${a.id}`,
    });
  }
  if (a.status === "pausada" || a.status === "cancelada")
    steps.push({
      layer: "B",
      label: a.status === "pausada" ? "Conta pausada" : "Conta cancelada",
      at: a.statusChangedAt,
      detail: a.statusReason,
    });
  return steps.sort((x, y) => (x.at ?? "").localeCompare(y.at ?? ""));
}

export function accountOfCompany(s: CrmState, companyId: ID | undefined) {
  if (!companyId) return undefined;
  return s.accounts.find((a) => a.companyId === companyId && a.status !== "cancelada");
}

/** Contas pagas por hora do dia (pico de movimento), em horário de Fortaleza. */
export function visitsByHour(visits: Visit[]) {
  const h = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}h`, contas: 0 }));
  for (const v of visits) {
    const slot = h[(new Date(v.at).getUTCHours() + 21) % 24];
    if (slot) slot.contas += 1;
  }
  return h.slice(11, 24);
}

export function topItems(visits: Visit[], n = 6) {
  const m = new Map<string, number>();
  visits.forEach((v) => v.items.forEach((i) => m.set(i, (m.get(i) ?? 0) + 1)));
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item, count]) => ({ item, count }));
}

// ---------- Dados fictícios usados pela demonstração (seed e simulações) ----------

export const DEMO_MENU: Record<string, string[]> = {
  Restaurante: [
    "Baião de dois",
    "Peixe ao molho de coco",
    "Carne de sol com macaxeira",
    "Moqueca de camarão",
    "Suco de cajá",
    "Cartola",
    "Arroz de polvo",
  ],
  Bar: [
    "Chope",
    "Caipirinha de cajá",
    "Isca de peixe",
    "Caranguejo",
    "Petisco da casa",
    "Água de coco",
  ],
  Cafeteria: [
    "Cappuccino",
    "Tapioca de queijo coalho",
    "Bolo de rolo",
    "Pão de queijo",
    "Espresso",
  ],
  "Barraca de praia": ["Caranguejo", "Peixe frito", "Água de coco", "Caipirinha", "Batata frita"],
  Hamburgueria: ["Burger da casa", "Batata rústica", "Milk-shake", "Onion rings", "Refrigerante"],
  Pizzaria: [
    "Pizza margherita",
    "Pizza de carne de sol",
    "Calzone",
    "Vinho da casa",
    "Refrigerante",
  ],
};
export const menuFor = (segment: string) => DEMO_MENU[segment] ?? DEMO_MENU["Restaurante"]!;

export const DEMO_WAITERS = [
  "Joana",
  "Rafael",
  "Cícero",
  "Mirela",
  "Antônio",
  "Kelly",
  "Wellington",
  "Sara",
];

export const DEMO_CONSUMERS = [
  "Amanda Freire",
  "Bernardo Lima",
  "Camila Arruda",
  "Daniel Pontes",
  "Érica Moreira",
  "Felipe Saraiva",
  "Giovana Melo",
  "Hugo Bezerra",
  "Ingrid Fontenele",
  "Jonas Aguiar",
  "Larissa Feitosa",
  "Mateus Brito",
  "Natália Gomes",
  "Otávio Prado",
  "Paula Rolim",
  "Renato Carneiro",
  "Sofia Benevides",
  "Tiago Matos",
  "Úrsula Andrade",
  "Vinícius Costa",
  "Wanda Pinto",
  "Yuri Fernandes",
  "Bianca Távora",
  "Caio Studart",
  "Débora Linhares",
  "Emanuel Bastos",
  "Flávia Cordeiro",
  "Gustavo Parente",
];

/** Cadastros fictícios da lista de espera de tipe.digital, para simular a entrada pelo site. */
export const SITE_SAMPLES: {
  name: string;
  company: string;
  neighborhood: string;
  profile: {
    tables_range: string;
    peak_queue: string;
    close_time: string;
    contact_role: string;
    pdv_system: string;
    discovery_source: string;
  };
}[] = [
  {
    name: "Renata Moura",
    company: "Bistrô Jardim Aldeota",
    neighborhood: "Aldeota",
    profile: {
      tables_range: "21_40",
      peak_queue: "sempre",
      close_time: "10_20",
      contact_role: "dono",
      pdv_system: "Colibri",
      discovery_source: "instagram",
    },
  },
  {
    name: "Igor Sales",
    company: "Bar Cais do Porto",
    neighborhood: "Praia de Iracema",
    profile: {
      tables_range: "11_20",
      peak_queue: "as_vezes",
      close_time: "5_10",
      contact_role: "gerente",
      pdv_system: "Saipos",
      discovery_source: "google",
    },
  },
  {
    name: "Lívia Teles",
    company: "Café Terra Molhada",
    neighborhood: "Varjota",
    profile: {
      tables_range: "ate_10",
      peak_queue: "sempre",
      close_time: "5_10",
      contact_role: "dono",
      pdv_system: "Planilha e maquininha",
      discovery_source: "indicacao",
    },
  },
  {
    name: "Rogério Paiva",
    company: "Churrascaria Fogo Alto",
    neighborhood: "Cocó",
    profile: {
      tables_range: "40_mais",
      peak_queue: "sempre",
      close_time: "20_mais",
      contact_role: "dono",
      pdv_system: "Consumer",
      discovery_source: "evento",
    },
  },
];

/** Contas por bairro (mapa do painel). */
export function accountsByNeighborhood(accounts: RestaurantAccount[]) {
  const m = new Map<string, number>();
  accounts
    .filter((a) => a.status === "ativa" || a.status === "implantacao")
    .forEach((a) => m.set(a.neighborhood || a.city, (m.get(a.neighborhood || a.city) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}
