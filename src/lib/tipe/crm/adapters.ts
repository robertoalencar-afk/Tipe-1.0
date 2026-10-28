import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_MODULES, planForTables, SITE_SOURCE } from "./ecosystem";
import type {
  BillMethod,
  FoundingPartnerChannel,
  FoundingPartnerEnrollment,
  FoundingPartnerFeedback,
  FoundingPartnerRules,
  FoundingPartnerStatus,
  LeadProfile,
  LeadStatus,
  ModuleKey,
  OnboardingKey,
  PdvStatus,
  RestaurantPlan,
  Visit,
} from "./types";

// Pontos de conexão entre o CRM e a plataforma Tipe que já roda no Supabase.
// Funções puras: recebem linhas das tabelas reais (tipos gerados em
// src/integrations/supabase/types.ts) e devolvem os registros do CRM. A troca do modo
// demonstração pelo Supabase usa estas funções, sem mudar telas nem regras do motor.
//
//   restaurant_leads            → Lead (camada A, entrada pelo site)
//   restaurants + subscription  → dados da conta do restaurante (camada B)
//     + restaurant_tables
//   table_payment_requests      → Visit (camadas B e C: uso da conta e histórico do cliente)
//     + waiter_ratings

// ---------- Camada A: lista de espera de tipe.digital ----------

const WAITLIST_STATUS: Record<string, LeadStatus> = {
  novo: "novo",
  contatado: "contatado",
  demo_agendada: "qualificado",
  demo_feita: "qualificado",
  piloto: "qualificado",
  cliente: "convertido",
  perdido: "desqualificado",
};

export function leadFromWaitlist(row: Tables<"restaurant_leads">) {
  const profile: LeadProfile = {
    tables_range: row.tables_range ?? undefined,
    peak_queue: row.peak_queue ?? undefined,
    close_time: row.close_time ?? undefined,
    contact_role: row.contact_role ?? undefined,
    city: row.city ?? undefined,
    pdv_system: row.pdv_system ?? undefined,
    has_pagarme: row.has_pagarme ?? undefined,
    discovery_source: row.discovery_source ?? undefined,
  };
  return {
    /** Mantém o id da lista de espera para não importar duas vezes. */
    externalId: row.id,
    name: row.contact_name,
    companyName: row.restaurant_name,
    email: row.email.toLowerCase(),
    phone: row.phone ?? "",
    source: row.utm_source ? `${SITE_SOURCE} · ${row.utm_source}` : SITE_SOURCE,
    status: WAITLIST_STATUS[row.status] ?? "novo",
    profile,
    createdAt: row.created_at,
    marketingOptIn: row.marketing_opt_in,
  };
}

// ---------- Camada B: restaurante na plataforma ----------

const PLAN_IDS: RestaurantPlan[] = ["essencial", "profissional", "premium"];

const METHOD_MODULE: Record<string, ModuleKey> = {
  pix: "pix",
  apple_pay: "apple_pay",
  google_pay: "google_pay",
  at_establishment: "pagar_no_estabelecimento",
};

/**
 * Dados da conta vindos da plataforma. A implantação comercial (contrato, treinamento)
 * continua sendo do CRM; cadastro, mesas e PDV passam a vir do restaurante real.
 */
export function accountFromPlatform(
  r: Tables<"restaurants">,
  sub: Tables<"restaurant_subscriptions"> | null,
  tables: Pick<Tables<"restaurant_tables">, "active" | "waiter_id">[],
) {
  const active = tables.filter((t) => t.active);
  const plan = PLAN_IDS.includes(sub?.plan as RestaurantPlan)
    ? (sub?.plan as RestaurantPlan)
    : planForTables(active.length > 20 ? "21_40" : active.length > 10 ? "11_20" : "ate_10").plan;
  const modules = new Set<ModuleKey>(
    DEFAULT_MODULES.filter((m) => !Object.values(METHOD_MODULE).includes(m)),
  );
  for (const m of r.bill_payment_methods) {
    const key = METHOD_MODULE[m];
    if (key) modules.add(key);
  }
  const pdv: PdvStatus =
    r.pos_mode === "external"
      ? r.onboarding_step === "pos"
        ? "em_homologacao"
        : "conectada"
      : "lancamento_tipe";
  const stepsDone: OnboardingKey[] = ["cadastro"];
  if (r.onboarding_step === "done") stepsDone.push("cardapio");
  if (active.length) stepsDone.push("mesas_qr");
  if (active.some((t) => t.waiter_id)) stepsDone.push("equipe");
  return {
    platformRestaurantId: r.id,
    name: r.name,
    slug: r.slug,
    plan,
    tables: active.length,
    modules: [...modules],
    pdv: { provider: r.pos_provider, status: pdv },
    stepsDone,
    subscriptionStatus: sub?.status ?? "sem_assinatura",
    trialEndsAt: sub?.trial_ends_at,
  };
}

// ---------- Camadas B e C: contas pagas ----------

const BILL_METHOD: Record<string, BillMethod> = {
  pix: "pix",
  apple_pay: "apple_pay",
  google_pay: "google_pay",
  at_establishment: "estabelecimento",
};

/**
 * Uma conta paga pela Tipe vira uma visita. Só pagamentos aprovados da conta do
 * restaurante entram (a gorjeta extra é um segundo pagamento, somado em `tip`).
 * `consumerId` depende do módulo de identificação do cliente, ainda não existente:
 * hoje a tabela guarda só o nome digitado, sem telefone nem consentimento.
 */
export function visitFromPayment(
  p: Tables<"table_payment_requests">,
  ctx: {
    orgId: string;
    accountId: string;
    tip?: number | undefined;
    rating?: Pick<Tables<"waiter_ratings">, "stars"> | undefined;
    waiterName?: string | undefined;
    consumerId?: string | undefined;
  },
): Visit | null {
  if (p.status !== "approved" || p.payment_target !== "restaurant") return null;
  const method = BILL_METHOD[p.payment_method];
  if (!method) return null;
  return {
    id: `tpr_${p.id}`,
    orgId: ctx.orgId,
    accountId: ctx.accountId,
    consumerId: ctx.consumerId,
    at: p.created_at,
    table: p.table_number,
    waiter: ctx.waiterName ?? "",
    amount: Number(p.amount),
    serviceFee: Number(p.service_fee_amount ?? 0),
    tip: ctx.tip ?? 0,
    method,
    rating: ctx.rating?.stars,
    items: [],
    source: "tipe",
  };
}

// ---------- Camada B: programa Restaurante Fundador (migração 0041, não aplicada) ----------
// As tabelas founding_partner_* ainda não estão nos tipos gerados do Supabase; as linhas
// abaixo espelham a migração drizzle/migrations/0041_founding_partner_program.sql.

export type FoundingPartnerRows = {
  enrollment: {
    id: string;
    restaurant_id: string;
    crm_account_id: string | null;
    status: FoundingPartnerStatus;
    created_at: string;
    status_changed_at: string;
    joined_at: string | null;
    pilot_eligible: boolean;
    pilot_note: string | null;
  };
  terms: { version: string; accepted_by_name: string; accepted_at: string; recorded_by: string | null }[];
  invites: { id: string; channel: FoundingPartnerChannel; note: string; sent_by: string | null; sent_at: string }[];
  benefits: {
    id: string;
    advantage: string;
    approval_ref: string;
    granted_at: string;
    granted_by: string | null;
    revoked_at: string | null;
  }[];
  communications: {
    id: string;
    channel: FoundingPartnerChannel;
    direction: "enviada" | "recebida";
    summary: string;
    created_by: string | null;
    created_at: string;
  }[];
  feedback: {
    id: string;
    topic: FoundingPartnerFeedback["topic"];
    body: string;
    created_by: string | null;
    created_at: string;
  }[];
  events: {
    id: number;
    kind: "estado" | "termos" | "piloto" | "convite" | "beneficio";
    from_status: FoundingPartnerStatus | null;
    to_status: FoundingPartnerStatus | null;
    detail: string;
    actor_id: string | null;
    at: string;
  }[];
};

/**
 * Adesão vinda do banco → registro do CRM. A conta do CRM é achada por crm_account_id
 * (ou, sem ele, pelo platformRestaurantId da conta igual a restaurant_id).
 */
export function foundingPartnerFromRows(
  rows: FoundingPartnerRows,
  ctx: { orgId: string; accountId: string },
): FoundingPartnerEnrollment {
  const r = rows.enrollment;
  const latestTerms = [...rows.terms].sort((a, b) => b.accepted_at.localeCompare(a.accepted_at))[0];
  return {
    id: r.id,
    orgId: ctx.orgId,
    accountId: ctx.accountId,
    status: r.status,
    createdAt: r.created_at,
    statusChangedAt: r.status_changed_at,
    joinedAt: r.joined_at ?? undefined,
    terms: latestTerms
      ? {
          version: latestTerms.version,
          acceptedAt: latestTerms.accepted_at,
          acceptedByName: latestTerms.accepted_by_name,
          recordedBy: latestTerms.recorded_by ?? "",
        }
      : undefined,
    pilotEligible: r.pilot_eligible,
    pilotNote: r.pilot_note ?? undefined,
    invites: rows.invites.map((i) => ({
      id: i.id,
      at: i.sent_at,
      channel: i.channel,
      sentBy: i.sent_by ?? "",
      note: i.note,
      simulated: false,
    })),
    benefits: rows.benefits.map((b) => ({
      id: b.id,
      advantage: b.advantage,
      grantedAt: b.granted_at,
      grantedBy: b.granted_by ?? "",
      approvalRef: b.approval_ref,
      revokedAt: b.revoked_at ?? undefined,
    })),
    communications: rows.communications.map((c) => ({
      id: c.id,
      at: c.created_at,
      channel: c.channel,
      direction: c.direction,
      summary: c.summary,
      by: c.created_by ?? "",
    })),
    feedback: rows.feedback.map((f) => ({
      id: f.id,
      at: f.created_at,
      topic: f.topic,
      text: f.body,
      by: f.created_by ?? "",
    })),
    history: [...rows.events]
      .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id)
      .map((e) => ({
        id: String(e.id),
        at: e.at,
        actorId: e.actor_id ?? "",
        kind: e.kind,
        from: e.from_status ?? undefined,
        to: e.to_status ?? undefined,
        detail: e.detail,
      })),
  };
}

export function foundingPartnerRulesFromRow(
  row: {
    slots: number | null;
    enrollment_opens_at: string | null;
    enrollment_closes_at: string | null;
    advantages: string[];
    terms_version: string | null;
    approved_at: string | null;
    approved_by: string | null;
    approval_ref: string | null;
    updated_at: string | null;
  },
  orgId: string,
): FoundingPartnerRules {
  return {
    orgId,
    slots: row.slots,
    enrollmentOpensAt: row.enrollment_opens_at,
    enrollmentClosesAt: row.enrollment_closes_at,
    advantages: row.advantages,
    termsVersion: row.terms_version,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    approvalRef: row.approval_ref,
    updatedAt: row.updated_at,
  };
}

/** O que cada camada já consegue ler do Supabase e o que ainda depende de módulo externo. */
export const INTEGRATION_POINTS: {
  layer: "A" | "B" | "C";
  what: string;
  source: string;
  status: "pronto" | "adaptador" | "depende";
  note: string;
}[] = [
  {
    layer: "A",
    what: "Negócio ganho abre a conta",
    source: "Motor do CRM",
    status: "pronto",
    note: "Cria a conta, escolhe o responsável de sucesso e agenda kickoff, mesas e treinamento.",
  },
  {
    layer: "B",
    what: "Implantação, módulos e saúde",
    source: "Motor do CRM",
    status: "pronto",
    note: "Checklist de 8 etapas, regras de plano, ativação na primeira conta paga e nota de saúde.",
  },
  {
    layer: "C",
    what: "Segmentos e consentimento",
    source: "Motor do CRM",
    status: "pronto",
    note: "Novos, recorrentes, fiéis e sumidos; campanhas só alcançam quem aceitou.",
  },
  {
    layer: "A",
    what: "Leads do site",
    source: "restaurant_leads",
    status: "adaptador",
    note: "leadFromWaitlist() converte a lista de espera; falta o job de importação no servidor.",
  },
  {
    layer: "A",
    what: "WhatsApp comercial",
    source: "/api/public/whatsapp/webhook",
    status: "depende",
    note: "Cloud API oficial pronta no código; precisa das credenciais da Meta.",
  },
  {
    layer: "B",
    what: "Cadastro, plano e mesas",
    source: "restaurants, restaurant_subscriptions, restaurant_tables",
    status: "adaptador",
    note: "accountFromPlatform() lê a conta real; a ligação é por platformRestaurantId.",
  },
  {
    layer: "B",
    what: "PDV e recebimentos",
    source: "pos_integrations, restaurant_pagarme_accounts",
    status: "adaptador",
    note: "Status do PDV vem de restaurants.pos_mode e onboarding_step.",
  },
  {
    layer: "B",
    what: "Uso e saúde da conta",
    source: "table_payment_requests, waiter_ratings",
    status: "adaptador",
    note: "visitFromPayment() transforma pagamentos aprovados em uso diário.",
  },
  {
    layer: "B",
    what: "Restaurante Fundador",
    source: "founding_partner_* (migração 0041)",
    status: "adaptador",
    note: "foundingPartnerFromRows() lê adesão, termos, convites, benefícios e trilha; a migração ainda não foi aplicada.",
  },
  {
    layer: "C",
    what: "Histórico do cliente final",
    source: "table_payment_requests",
    status: "depende",
    note: "Hoje o pagamento guarda só o nome. Identificar o cliente exige telefone e consentimento na conta.",
  },
  {
    layer: "C",
    what: "Campanhas do restaurante",
    source: "WhatsApp do restaurante",
    status: "depende",
    note: "Envio real depende do número do restaurante na Cloud API e de modelos aprovados pela Meta.",
  },
];
