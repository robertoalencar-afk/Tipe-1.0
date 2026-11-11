import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_MODULES, planForTables, SITE_SOURCE } from "./ecosystem";
import type {
  BillMethod,
  EntitledModule,
  Entitlement,
  EntitlementState,
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
  moduleRows: PlatformModuleRow[] = [],
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
  const entitlements = entitlementsFromPlatform(moduleRows);
  for (const [key, e] of Object.entries(entitlements))
    if (e.state === "ativo") modules.add(key as EntitledModule);
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
    entitlements,
    pdv: { provider: r.pos_provider, status: pdv },
    stepsDone,
    subscriptionStatus: sub?.status ?? "sem_assinatura",
    trialEndsAt: sub?.trial_ends_at,
  };
}

// ---------- Camada B: contrato dos módulos à parte (Tipe Order) ----------

/**
 * Linha de restaurant_modules (migração 0027 do Tipe Order). Tipada aqui porque a
 * tabela ainda não está no types.ts gerado desta branch.
 */
export type PlatformModuleRow = {
  module: string;
  status: string;
  reason: string | null;
  changed_at: string;
};

const PLATFORM_MODULE: Record<EntitledModule, string> = { pedido_na_mesa: "order" };
const PLATFORM_STATE: Record<EntitlementState, string> = {
  ativo: "active",
  suspenso: "suspended",
  cancelado: "cancelled",
};

/** Estado dos módulos à parte lido da plataforma. Linhas de módulos que o CRM não conhece ficam de fora. */
export function entitlementsFromPlatform(rows: PlatformModuleRow[]) {
  const out: Partial<Record<EntitledModule, Entitlement>> = {};
  for (const r of rows) {
    const key = (Object.keys(PLATFORM_MODULE) as EntitledModule[]).find(
      (k) => PLATFORM_MODULE[k] === r.module,
    );
    const state = (Object.keys(PLATFORM_STATE) as EntitlementState[]).find(
      (k) => PLATFORM_STATE[k] === r.status,
    );
    if (key && state) out[key] = { state, reason: r.reason ?? undefined, changedAt: r.changed_at };
  }
  return out;
}

/**
 * Argumentos de set_restaurant_module (só service_role, chamado pelo servidor com 2FA
 * do fundador) para gravar na plataforma a mudança feita no card do CRM.
 */
export function entitlementToPlatform(
  restaurantId: string,
  module: EntitledModule,
  state: EntitlementState,
  reason?: string,
) {
  return {
    p_rid: restaurantId,
    p_module: PLATFORM_MODULE[module],
    p_status: PLATFORM_STATE[state],
    p_reason: state === "ativo" ? null : (reason ?? "").trim() || null,
    p_actor_kind: "crm" as const,
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
    what: "Contrato do Tipe Order",
    source: "restaurant_modules (migração 0027)",
    status: "adaptador",
    note: "entitlementsFromPlatform() lê o estado; entitlementToPlatform() monta a gravação via set_restaurant_module.",
  },
  {
    layer: "B",
    what: "Uso e saúde da conta",
    source: "table_payment_requests, waiter_ratings",
    status: "adaptador",
    note: "visitFromPayment() transforma pagamentos aprovados em uso diário.",
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
