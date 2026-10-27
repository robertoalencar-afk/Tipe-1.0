import type {
  Contact,
  ConversationStatus,
  LeadStatus,
  TaskStatus,
  TaskType,
  TicketStatus,
} from "@/lib/tipe/crm/types";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export const CONTACT_STATUS: Record<Contact["status"], { label: string; tone: Tone }> = {
  cliente: { label: "Cliente", tone: "success" },
  ativo: { label: "Ativo", tone: "primary" },
  inativo: { label: "Inativo", tone: "neutral" },
};
export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: Tone }> = {
  novo: { label: "Novo", tone: "info" },
  contatado: { label: "Contatado", tone: "primary" },
  qualificado: { label: "Qualificado", tone: "success" },
  desqualificado: { label: "Desqualificado", tone: "neutral" },
  convertido: { label: "Convertido", tone: "success" },
};
export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "info" },
  concluida: { label: "Concluída", tone: "success" },
};
export const TASK_TYPE: Record<TaskType, string> = {
  tarefa: "Tarefa",
  ligacao: "Ligação",
  reuniao: "Reunião",
  email: "E-mail",
};
export const CONV_STATUS: Record<ConversationStatus, { label: string; tone: Tone }> = {
  aberta: { label: "Aberta", tone: "primary" },
  pendente: { label: "Pendente", tone: "warning" },
  encerrada: { label: "Encerrada", tone: "neutral" },
};
export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  aberto: { label: "Aberto", tone: "warning" },
  em_andamento: { label: "Em andamento", tone: "info" },
  resolvido: { label: "Resolvido", tone: "success" },
};
export const LOST_REASONS = [
  "Preço",
  "Não viu valor",
  "PDV não integra",
  "Já usa concorrente",
  "Sem resposta",
  "Outro",
];
