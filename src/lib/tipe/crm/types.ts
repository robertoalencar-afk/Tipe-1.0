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
  /** Tarefa de implantação ou sucesso ligada a uma conta de restaurante. */
  accountId?: ID | undefined;
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
    | "goal"
    | "account"
    | "consumer"
    | "campaign";
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
  /** Chamado de um restaurante cliente (camada B). Sem conta, é um chamado interno. */
  accountId?: ID | undefined;
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

// ---------------------------------------------------------------------------------------
// Camada B: conta do restaurante. Nasce quando uma oportunidade da camada A é ganha e
// acompanha implantação, módulos, integrações, uso e suporte. Em produção espelha
// restaurants, restaurant_subscriptions e restaurant_tables (ver adapters.ts).
// ---------------------------------------------------------------------------------------

/** Mesmos ids de src/lib/tipe/plans.ts (planos por número de mesas). */
export type RestaurantPlan = "essencial" | "profissional" | "premium";
export type AccountStatus = "implantacao" | "ativa" | "pausada" | "cancelada";
export type OnboardingKey =
  | "contrato"
  | "cadastro"
  | "cardapio"
  | "mesas_qr"
  | "pagamentos"
  | "equipe"
  | "treinamento"
  | "primeira_conta";
export type OnboardingStep = {
  key: OnboardingKey;
  doneAt?: ISO | undefined;
  doneBy?: ID | undefined;
};
export type ModuleKey =
  | "pix"
  | "apple_pay"
  | "google_pay"
  | "pagar_no_estabelecimento"
  | "gorjeta"
  | "avaliacao"
  | "pedido_na_mesa"
  | "kds"
  | "totem"
  | "lebre";
/**
 * Módulos vendidos à parte, com contrato próprio. O estado é o mesmo de
 * restaurant_modules na plataforma (migração 0027): ativo, suspenso ou cancelado.
 */
export type EntitledModule = "pedido_na_mesa";
export type EntitlementState = "ativo" | "suspenso" | "cancelado";
export type Entitlement = {
  state: EntitlementState;
  reason?: string | undefined;
  changedAt: ISO;
};
export type PdvStatus = "nao_iniciada" | "em_homologacao" | "conectada" | "lancamento_tipe";
export type PagarmeStatus = "pendente" | "em_analise" | "aprovada";

export type RestaurantAccount = {
  id: ID;
  orgId: ID;
  name: string;
  slug: string;
  segment: string;
  city: string;
  neighborhood: string;
  /** Rastro da camada A: de onde esta conta veio. */
  companyId?: ID | undefined;
  contactId?: ID | undefined;
  dealId?: ID | undefined;
  leadId?: ID | undefined;
  /** Responsável de sucesso do cliente (implantação e saúde da conta). */
  csmId: ID;
  plan: RestaurantPlan;
  tables: number;
  status: AccountStatus;
  onboarding: OnboardingStep[];
  modules: ModuleKey[];
  /** Contrato dos módulos à parte (Tipe Order). Sem registro, vale o que está em `modules`. */
  entitlements?: Partial<Record<EntitledModule, Entitlement>> | undefined;
  pdv: { provider: string; status: PdvStatus };
  pagarme: PagarmeStatus;
  /** restaurants.id no Supabase quando a conta estiver ligada à plataforma real. */
  platformRestaurantId?: string | undefined;
  createdAt: ISO;
  activatedAt?: ISO | undefined;
  statusChangedAt?: ISO | undefined;
  statusReason?: string | undefined;
};

// ---------------------------------------------------------------------------------------
// Camada C: clientes do restaurante. Cada conta paga pela Tipe vira uma visita; quem se
// identifica (telefone para recibo ou fidelidade) vira um cliente com histórico.
// ---------------------------------------------------------------------------------------

/** Formas de pagar a conta pelo QR: as mesmas de table_payment_requests (sem cartão digitado). */
export type BillMethod = "pix" | "apple_pay" | "google_pay" | "estabelecimento";

export type Consumer = {
  id: ID;
  orgId: ID;
  accountId: ID;
  name: string;
  /** Só os 4 últimos dígitos: a equipe da Tipe não precisa do número completo. */
  phoneLast4: string;
  /** Consentimento LGPD para receber campanhas do restaurante. */
  marketingOptIn: boolean;
  optInAt?: ISO | undefined;
  createdAt: ISO;
};

export type Visit = {
  id: ID;
  orgId: ID;
  accountId: ID;
  /** Sem cliente quando a pessoa pagou sem se identificar. */
  consumerId?: ID | undefined;
  at: ISO;
  table: string;
  waiter: string;
  amount: number;
  serviceFee: number;
  /** Gorjeta extra, paga depois da conta, em um segundo pagamento. */
  tip: number;
  method: BillMethod;
  rating?: number | undefined;
  items: string[];
  /** "demo" no navegador; "tipe" quando vier de table_payment_requests. */
  source: "demo" | "tipe";
};

export type ConsumerSegment = "todos" | "novos" | "recorrentes" | "fieis" | "em_risco";

export type Campaign = {
  id: ID;
  orgId: ID;
  accountId: ID;
  name: string;
  segment: ConsumerSegment;
  message: string;
  channel: "whatsapp";
  status: "simulada";
  audience: number;
  createdBy: ID;
  createdAt: ISO;
};

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
  accounts: RestaurantAccount[];
  consumers: Consumer[];
  visits: Visit[];
  campaigns: Campaign[];
  session: Session | null;
};
