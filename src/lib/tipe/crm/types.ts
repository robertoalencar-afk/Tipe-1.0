// Modelo de dados do CRM do back office da Tipe.
// Toda entidade de negócio carrega orgId: é a chave do isolamento entre organizações
// (no navegador pelo motor, no Supabase pelas políticas RLS da migração crm).

export type ID = string;
export type ISO = string;

export type Role = "owner" | "admin" | "manager" | "seller" | "agent" | "viewer";
export type Priority = "baixa" | "media" | "alta";

export type User = {
  id: ID;
  name: string;
  email: string;
  /** Somente demonstração: senha fictícia, nunca usada fora do navegador. */
  password: string;
  title: string;
  /** Equipe da plataforma Tipe: única que enxerga a Administração global. */
  platformAdmin?: boolean | undefined;
  createdAt: ISO;
};

export type Membership = {
  id: ID;
  orgId: ID;
  userId: ID;
  role: Role;
  teamId?: ID | undefined;
  departmentId?: ID | undefined;
  status: "ativo" | "suspenso";
  joinedAt: ISO;
};

export type Invite = {
  id: ID;
  orgId: ID;
  email: string;
  name: string;
  role: Role;
  teamId?: ID | undefined;
  status: "pendente" | "aceito" | "revogado";
  invitedBy: ID;
  createdAt: ISO;
};

export type OrgSettings = {
  timezone: string;
  /** Minutos para a primeira resposta antes do alerta de atendimento. */
  responseSlaMin: number;
  /** Pontos por evento real de gamificação. */
  xp: Record<XpKind, number>;
  /** Limite diário de tarefas que rendem pontos, por pessoa. */
  dailyTaskXpCap: number;
};

export type Org = {
  id: ID;
  name: string;
  slug: string;
  segment: string;
  createdAt: ISO;
  status: "ativa" | "suspensa";
  settings: OrgSettings;
};

export type Team = { id: ID; orgId: ID; name: string };
export type Department = { id: ID; orgId: ID; name: string };

export type Company = {
  id: ID;
  orgId: ID;
  name: string;
  segment: string;
  city: string;
  neighborhood: string;
  size: string;
  pdv: string;
  ownerId: ID;
  tags: string[];
  createdAt: ISO;
};

export type ContactStatus = "ativo" | "cliente" | "inativo";

export type Contact = {
  id: ID;
  orgId: ID;
  name: string;
  companyId?: ID | undefined;
  phone: string;
  whatsapp: string;
  email: string;
  jobTitle: string;
  source: string;
  ownerId: ID;
  status: ContactStatus;
  tags: string[];
  notes: string;
  createdAt: ISO;
  updatedAt: ISO;
};

export type LeadStatus = "novo" | "contatado" | "qualificado" | "desqualificado" | "convertido";

/** Perfil do restaurante, os mesmos campos da lista de espera (restaurant_leads). */
export type LeadProfile = {
  tables_range?: string | undefined;
  peak_queue?: string | undefined;
  close_time?: string | undefined;
  contact_role?: string | undefined;
  city?: string | undefined;
  pdv_system?: string | undefined;
  has_pagarme?: string | undefined;
  discovery_source?: string | undefined;
};

export type Lead = {
  id: ID;
  orgId: ID;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  ownerId: ID;
  profile: LeadProfile;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
  disqualifyReason?: string | undefined;
  createdAt: ISO;
  qualifiedAt?: ISO | undefined;
  convertedAt?: ISO | undefined;
};

export type StageKind = "aberta" | "ganho" | "perdido";
export type Stage = { id: ID; name: string; probability: number; kind: StageKind };
export type Pipeline = { id: ID; orgId: ID; name: string; stages: Stage[]; createdAt: ISO };

export type DealStatus = "aberta" | "ganha" | "perdida";

export type Deal = {
  id: ID;
  orgId: ID;
  pipelineId: ID;
  stageId: ID;
  title: string;
  contactId: ID;
  companyId?: ID | undefined;
  leadId?: ID | undefined;
  conversationId?: ID | undefined;
  value: number;
  ownerId: ID;
  probability: number;
  priority: Priority;
  status: DealStatus;
  lostReason?: string | undefined;
  expectedClose: ISO;
  createdAt: ISO;
  updatedAt: ISO;
  closedAt?: ISO | undefined;
};

export type TaskStatus = "pendente" | "em_andamento" | "concluida";
export type TaskType = "tarefa" | "ligacao" | "reuniao" | "email";

export type Comment = { id: ID; userId: ID; text: string; at: ISO };

export type Task = {
  id: ID;
  orgId: ID;
  title: string;
  description: string;
  type: TaskType;
  assigneeId: ID;
  createdBy: ID;
  priority: Priority;
  status: TaskStatus;
  dueAt: ISO;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
  comments: Comment[];
  createdAt: ISO;
  completedAt?: ISO | undefined;
};

export type Note = {
  id: ID;
  orgId: ID;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
  userId: ID;
  text: string;
  at: ISO;
};

export type EntityRef = {
  type:
    | "contact"
    | "company"
    | "lead"
    | "deal"
    | "task"
    | "conversation"
    | "ticket"
    | "org"
    | "member"
    | "subscription"
    | "pipeline"
    | "goal";
  id: ID;
};

export type Activity = {
  id: ID;
  orgId: ID;
  at: ISO;
  actorId: ID;
  kind: string;
  summary: string;
  entity: EntityRef;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
  /** Histórico de alterações: campo → [antes, depois]. */
  changes?: Record<string, [unknown, unknown]>;
};

export type ConversationStatus = "aberta" | "pendente" | "encerrada";

export type Conversation = {
  id: ID;
  orgId: ID;
  contactId: ID;
  channel: "whatsapp" | "site";
  instanceId?: ID | undefined;
  status: ConversationStatus;
  assigneeId?: ID | undefined;
  tags: string[];
  unread: number;
  createdAt: ISO;
  lastMessageAt: ISO;
  closedAt?: ISO | undefined;
};

export type MessageStatus = "simulada" | "enviada" | "entregue" | "lida" | "falhou";

export type Message = {
  id: ID;
  orgId: ID;
  conversationId: ID;
  direction: "entrada" | "saida" | "nota";
  authorId?: ID | undefined;
  text: string;
  at: ISO;
  status: MessageStatus;
  /** Sempre true no modo demonstração: nada saiu para o WhatsApp. */
  simulated: boolean;
};

export type QuickReply = { id: ID; orgId: ID; shortcut: string; text: string };

export type TicketStatus = "aberto" | "em_andamento" | "resolvido";

export type Ticket = {
  id: ID;
  orgId: ID;
  title: string;
  description: string;
  category: string;
  requesterId: ID;
  assigneeId?: ID | undefined;
  priority: Priority;
  status: TicketStatus;
  comments: Comment[];
  createdAt: ISO;
  resolvedAt?: ISO | undefined;
};

export type GoalMetric =
  "receita" | "negocios_ganhos" | "tarefas_concluidas" | "leads_qualificados";

export type Goal = {
  id: ID;
  orgId: ID;
  scope: "individual" | "equipe";
  userId?: ID | undefined;
  teamId?: ID | undefined;
  metric: GoalMetric;
  target: number;
  /** Mês no formato AAAA-MM. */
  period: string;
};

export type XpKind =
  | "lead_qualificado"
  | "tarefa_concluida"
  | "reuniao_realizada"
  | "oportunidade_ganha"
  | "meta_atingida"
  | "desafio_concluido";

export type XpEvent = {
  id: ID;
  orgId: ID;
  userId: ID;
  kind: XpKind;
  points: number;
  /** Chave do fato real que gerou os pontos. A soma por ref nunca passa de um prêmio. */
  ref: string;
  at: ISO;
  reason: string;
};

export type Challenge = {
  id: ID;
  orgId: ID;
  title: string;
  description: string;
  metric: GoalMetric | "reunioes";
  target: number;
  startsAt: ISO;
  endsAt: ISO;
  reward: number;
};

export type PlanId = "starter" | "professional" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  description: string;
  limits: { users: number; contacts: number; pipelines: number; whatsappInstances: number };
  features: string[];
};

export type Subscription = {
  orgId: ID;
  planId: PlanId;
  status: "teste" | "ativa" | "em_atraso" | "cancelada";
  cycle: "mensal";
  startedAt: ISO;
  renewsAt: ISO;
  trialEndsAt?: ISO | undefined;
  canceledAt?: ISO | undefined;
};

export type Invoice = {
  id: ID;
  orgId: ID;
  number: string;
  description: string;
  amount: number;
  status: "paga" | "aberta" | "vencida" | "cancelada";
  issuedAt: ISO;
  dueAt: ISO;
  paidAt?: ISO | undefined;
  /** Cobrança fictícia: nenhum pagamento real é processado. */
  simulated: true;
};

export type WaInstance = {
  id: ID;
  orgId: ID;
  name: string;
  phone: string;
  provider: "demo" | "cloud_api";
  status: "demonstracao" | "aguardando_credenciais" | "conectada" | "erro";
  createdAt: ISO;
};

export type WaTemplate = {
  id: ID;
  orgId: ID;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: "pt_BR";
  body: string;
  status: "aprovado" | "pendente" | "rejeitado";
};

export type WaLog = {
  id: ID;
  orgId: ID;
  at: ISO;
  direction: "webhook" | "envio";
  event: string;
  status: "ok" | "erro" | "simulado";
  detail: string;
};

export type Notification = {
  id: ID;
  orgId: ID;
  userId: ID;
  text: string;
  href: string;
  at: ISO;
  read: boolean;
};

export type AuditEntry = {
  id: ID;
  orgId: ID | null;
  actorId: ID | null;
  action: string;
  target: string;
  result: "ok" | "negado";
  at: ISO;
};

export type Session = { userId: ID; orgId: ID };

export type CrmState = {
  version: number;
  seededAt: ISO;
  users: User[];
  orgs: Org[];
  memberships: Membership[];
  invites: Invite[];
  teams: Team[];
  departments: Department[];
  companies: Company[];
  contacts: Contact[];
  leads: Lead[];
  pipelines: Pipeline[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  activities: Activity[];
  conversations: Conversation[];
  messages: Message[];
  quickReplies: QuickReply[];
  tickets: Ticket[];
  goals: Goal[];
  xp: XpEvent[];
  challenges: Challenge[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  waInstances: WaInstance[];
  waTemplates: WaTemplate[];
  waLogs: WaLog[];
  notifications: Notification[];
  audit: AuditEntry[];
  session: Session | null;
};
