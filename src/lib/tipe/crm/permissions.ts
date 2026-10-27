import type { Plan, PlanId, Role } from "./types";

// Matriz de permissões por papel. O motor (camada de escrita) consulta esta matriz em
// toda ação, e a interface usa a mesma função só para esconder o que não vai funcionar.
// No Supabase, a função crm_can() da migração replica estas regras nas políticas RLS.

export type Action =
  | "org.settings"
  | "org.billing"
  | "members.invite"
  | "members.role"
  | "teams.manage"
  | "contacts.write"
  | "contacts.delete"
  | "leads.write"
  | "deals.create"
  | "deals.write_any"
  | "deals.write_own"
  | "deals.delete"
  | "pipelines.manage"
  | "tasks.write"
  | "tasks.assign_others"
  | "inbox.reply"
  | "inbox.assign"
  | "inbox.simulate"
  | "tickets.write"
  | "tickets.manage"
  | "goals.manage"
  | "reports.view"
  | "finance.view"
  | "whatsapp.manage";

const ALL: Action[] = [
  "org.settings", "org.billing", "members.invite", "members.role", "teams.manage", "contacts.write", "contacts.delete",
  "leads.write", "deals.create", "deals.write_any", "deals.write_own", "deals.delete", "pipelines.manage", "tasks.write",
  "tasks.assign_others", "inbox.reply", "inbox.assign", "inbox.simulate", "tickets.write", "tickets.manage", "goals.manage",
  "reports.view", "finance.view", "whatsapp.manage",
];

const MATRIX: Record<Role, Action[]> = {
  owner: ALL,
  admin: ALL.filter((a) => a !== "org.billing"),
  manager: [
    "contacts.write", "contacts.delete", "leads.write", "deals.create", "deals.write_any", "deals.write_own", "pipelines.manage",
    "tasks.write", "tasks.assign_others", "inbox.reply", "inbox.assign", "inbox.simulate", "tickets.write", "tickets.manage",
    "goals.manage", "reports.view", "teams.manage",
  ],
  seller: ["contacts.write", "leads.write", "deals.create", "deals.write_own", "tasks.write", "inbox.reply", "inbox.simulate", "tickets.write", "reports.view"],
  agent: ["contacts.write", "leads.write", "deals.create", "tasks.write", "inbox.reply", "inbox.assign", "inbox.simulate", "tickets.write", "tickets.manage"],
  viewer: ["reports.view"],
};

export function can(role: Role | null | undefined, action: Action): boolean {
  return !!role && MATRIX[role].includes(action);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  seller: "Vendedor",
  agent: "Atendente",
  viewer: "Somente leitura",
};

export const ROLE_HINT: Record<Role, string> = {
  owner: "Tudo, inclusive plano e cobrança.",
  admin: "Tudo, menos plano e cobrança.",
  manager: "Comercial e atendimento de toda a equipe, metas e funis.",
  seller: "Os próprios contatos, leads, oportunidades e tarefas.",
  agent: "Caixa de entrada, contatos e suporte.",
  viewer: "Consulta painéis e relatórios, sem alterar nada.",
};

export const ROLES: Role[] = ["owner", "admin", "manager", "seller", "agent", "viewer"];

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 149,
    description: "Para começar a organizar o comercial.",
    limits: { users: 3, contacts: 500, pipelines: 1, whatsappInstances: 1 },
    features: ["Contatos, leads e funil", "Tarefas e calendário", "1 número de WhatsApp"],
  },
  professional: {
    id: "professional",
    name: "Professional",
    priceMonthly: 449,
    description: "Equipe comercial e atendimento no mesmo lugar.",
    limits: { users: 15, contacts: 10000, pipelines: 5, whatsappInstances: 3 },
    features: ["Tudo do Starter", "Caixa de entrada compartilhada", "Gamificação e metas", "Relatórios completos"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 1290,
    description: "Várias equipes, auditoria e limites amplos.",
    limits: { users: 100, contacts: 200000, pipelines: 50, whatsappInstances: 20 },
    features: ["Tudo do Professional", "Departamentos e auditoria", "Até 20 números de WhatsApp", "Suporte prioritário"],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "professional", "enterprise"];
