import type {
  CrmState,
  FoundingPartnerChannel,
  FoundingPartnerEnrollment,
  FoundingPartnerFeedback,
  FoundingPartnerRules,
  FoundingPartnerStatus,
  ID,
  RestaurantAccount,
} from "./types";

// Programa Restaurante Fundador: regras puras (sem React, sem Supabase).
// O motor (engine.ts) chama estas funções antes de escrever; a migração
// drizzle/migrations/0041_founding_partner_program.sql repete as mesmas transições no banco.
//
// Nome: "founding partner", nunca "founder". "founder" é o papel da equipe Tipe.

export const FP_STATUS_ORDER: FoundingPartnerStatus[] = [
  "convidado",
  "interessado",
  "elegivel",
  "participante",
  "selecionado_piloto",
  "suspenso",
  "encerrado",
];

export const FP_STATUS: Record<
  FoundingPartnerStatus,
  { label: string; tone: "neutral" | "info" | "primary" | "success" | "warning"; hint: string }
> = {
  convidado: {
    label: "Convidado",
    tone: "neutral",
    hint: "Recebeu o convite e ainda não respondeu.",
  },
  interessado: { label: "Interessado", tone: "info", hint: "Demonstrou interesse em participar." },
  elegivel: {
    label: "Elegível",
    tone: "info",
    hint: "Conta conferida pela Tipe. Falta aceitar os termos para participar.",
  },
  participante: {
    label: "Participante",
    tone: "success",
    hint: "Aceitou os termos e faz parte do programa.",
  },
  selecionado_piloto: {
    label: "Selecionado para o piloto",
    tone: "primary",
    hint: "Participante escolhido para testar primeiro as novidades da Tipe.",
  },
  suspenso: {
    label: "Suspenso",
    tone: "warning",
    hint: "Participação parada, com motivo registrado.",
  },
  encerrado: { label: "Encerrado", tone: "neutral", hint: "Saiu do programa. Estado final." },
};

/** Transições permitidas. Tudo que não está aqui é recusado pelo motor e pelo banco. */
export const FP_TRANSITIONS: Record<FoundingPartnerStatus, FoundingPartnerStatus[]> = {
  convidado: ["interessado", "encerrado"],
  interessado: ["elegivel", "encerrado"],
  elegivel: ["participante", "interessado", "encerrado"],
  participante: ["selecionado_piloto", "suspenso", "encerrado"],
  selecionado_piloto: ["participante", "suspenso", "encerrado"],
  suspenso: ["participante", "encerrado"],
  encerrado: [],
};

/** Mudanças que pedem motivo escrito (ficam na trilha de auditoria). */
export function reasonRequired(from: FoundingPartnerStatus, to: FoundingPartnerStatus) {
  return to === "suspenso" || to === "encerrado" || (from === "elegivel" && to === "interessado");
}

/** Rótulo do botão de cada transição: verbo primeiro, o nome do restaurante vai na confirmação. */
export const FP_ACTION_LABEL: Record<FoundingPartnerStatus, string> = {
  convidado: "Convidar",
  interessado: "Marcar como interessado",
  elegivel: "Confirmar elegibilidade",
  participante: "Tornar participante",
  selecionado_piloto: "Selecionar para o piloto",
  suspenso: "Suspender participação",
  encerrado: "Encerrar participação",
};

/** Rótulo da ação considerando de onde se parte (voltar do piloto não é "tornar participante"). */
export function fpActionLabel(from: FoundingPartnerStatus, to: FoundingPartnerStatus) {
  if (from === "selecionado_piloto" && to === "participante") return "Tirar do piloto";
  if (from === "suspenso" && to === "participante") return "Reativar participação";
  if (from === "elegivel" && to === "interessado") return "Voltar para interessado";
  return FP_ACTION_LABEL[to];
}

export const FP_CHANNEL_LABEL: Record<FoundingPartnerChannel, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  presencial: "Presencial",
};

export const FP_FEEDBACK_TOPIC: Record<FoundingPartnerFeedback["topic"], string> = {
  produto: "Produto",
  atendimento: "Atendimento",
  implantacao: "Implantação",
  programa: "Programa",
  outro: "Outro",
};

export const PENDING_COMMERCIAL = "Pendente de aprovação comercial";

/**
 * Regras comerciais definidas pelo Roberto em 28/10/2026 (delegou a definição ao time, dentro das
 * regras do prompt do Guest): sem preço, desconto ou escassez artificial. As vagas são limite
 * interno de operação e não aparecem em texto público. Detalhes em docs/tipe-guest/FUNDADOR.md.
 */
export const FOUNDING_PARTNER_APPROVED_RULES = {
  slots: 30,
  enrollmentOpensAt: "2026-10-28T00:00:00-03:00",
  enrollmentClosesAt: "2027-03-31T23:59:59-03:00",
  advantages: [
    "Selo Restaurante Fundador para o salão e as redes",
    "Canal direto com a equipe Tipe durante a implantação",
    "Convite para o piloto do Tipe Guest antes da abertura ao público",
    "Encontros trimestrais de feedback sobre o produto",
    "Identificação como Restaurante Fundador no perfil do Tipe Guest, quando lançado",
  ],
  approvedAt: "2026-10-28T10:05:43Z",
  approvalRef: "Roberto Alencar, thread Tipe Guest, 28/10/2026",
} as const;

/** Versão do texto dos termos (rascunho em FUNDADOR.md, pendente de revisão jurídica). */
export const FOUNDING_PARTNER_TERMS_VERSION = "fundador-v1";

/** Regras comerciais padrão: tudo vazio. Nada de vaga, prazo ou vantagem sem aprovação. */
export function defaultFoundingPartnerRules(orgId: ID): FoundingPartnerRules {
  return {
    orgId,
    slots: null,
    enrollmentOpensAt: null,
    enrollmentClosesAt: null,
    advantages: [],
    termsVersion: null,
    approvedAt: null,
    approvedBy: null,
    approvalRef: null,
    updatedAt: null,
  };
}

export function rulesOf(s: CrmState, orgId: ID): FoundingPartnerRules {
  return (
    s.foundingPartnerRules.find((r) => r.orgId === orgId) ?? defaultFoundingPartnerRules(orgId)
  );
}

/** Regras comerciais aprovadas? Sem aprovação, nenhum benefício pode ser concedido. */
export function rulesApproved(r: FoundingPartnerRules) {
  return !!r.approvedAt && !!r.approvalRef && r.advantages.length > 0;
}

export function isActiveMember(status: FoundingPartnerStatus) {
  return status === "participante" || status === "selecionado_piloto";
}

export function enrollmentOf(s: CrmState, accountId: ID) {
  return s.foundingPartners.find((e) => e.accountId === accountId);
}

export function activeMembers(s: CrmState, orgId: ID) {
  return s.foundingPartners.filter((e) => e.orgId === orgId && isActiveMember(e.status)).length;
}

export function withinEnrollmentPeriod(r: FoundingPartnerRules, now: string) {
  const t = new Date(now).getTime();
  if (r.enrollmentOpensAt && t < new Date(r.enrollmentOpensAt).getTime()) return false;
  if (r.enrollmentClosesAt && t > new Date(r.enrollmentClosesAt).getTime()) return false;
  return true;
}

/** A conta pode receber convite? Contas canceladas não entram no programa. */
export function inviteBlocker(
  account: RestaurantAccount,
  existing: FoundingPartnerEnrollment | undefined,
  rules: FoundingPartnerRules,
  now: string,
): string | null {
  if (existing && existing.status !== "encerrado")
    return "Este restaurante já está no programa Restaurante Fundador.";
  if (account.status === "cancelada") return "Conta cancelada não pode ser convidada.";
  if (!withinEnrollmentPeriod(rules, now))
    return "Fora do período de inscrição definido nas regras do programa.";
  return null;
}

/**
 * Confere se a mudança de estado é permitida. Devolve o motivo da recusa ou null.
 * Regras: só transições da tabela; participar exige termos aceitos na versão vigente;
 * piloto exige elegibilidade registrada; vagas, quando definidas, são respeitadas.
 */
export function transitionBlocker(args: {
  enrollment: FoundingPartnerEnrollment;
  to: FoundingPartnerStatus;
  account: RestaurantAccount;
  rules: FoundingPartnerRules;
  activeCount: number;
  reason: string;
}): string | null {
  const { enrollment: e, to, account, rules, activeCount, reason } = args;
  if (e.status === to) return "O restaurante já está neste estado.";
  if (!FP_TRANSITIONS[e.status].includes(to))
    return `Não é possível passar de "${FP_STATUS[e.status].label}" para "${FP_STATUS[to].label}".`;
  if (reasonRequired(e.status, to) && reason.trim().length < 3)
    return "Informe o motivo. Ele fica registrado na trilha de auditoria.";
  if (to === "elegivel" && account.status === "cancelada")
    return "Conta cancelada não pode ficar elegível.";
  if (to === "participante") {
    if (account.status === "cancelada" || account.status === "pausada")
      return "A conta do restaurante precisa estar ativa ou em implantação.";
    if (!rules.termsVersion)
      return "Os termos do programa ainda não têm versão aprovada. Ninguém pode aceitar antes disso.";
    if (!e.terms || e.terms.version !== rules.termsVersion)
      return `Registre o aceite dos termos na versão vigente (${rules.termsVersion}) antes.`;
    const entering = !isActiveMember(e.status);
    if (entering && rules.slots !== null && activeCount >= rules.slots)
      return "Todas as vagas aprovadas para o programa já estão ocupadas.";
  }
  if (to === "selecionado_piloto") {
    if (!e.pilotEligible) return "Marque a conta como elegível para o piloto antes.";
    if (account.status !== "ativa") return "Só contas ativas entram no piloto.";
  }
  return null;
}

/** Benefício só com regra aprovada e texto idêntico a uma vantagem aprovada. */
export function benefitBlocker(
  e: FoundingPartnerEnrollment,
  rules: FoundingPartnerRules,
  advantage: string,
): string | null {
  if (!rulesApproved(rules))
    return `Nenhum benefício pode ser concedido: regras comerciais ${PENDING_COMMERCIAL.toLowerCase()}.`;
  if (!rules.advantages.includes(advantage))
    return "A vantagem precisa estar exatamente como aprovada nas regras comerciais.";
  if (!isActiveMember(e.status)) return "Só participantes recebem benefícios do programa.";
  if (e.benefits.some((b) => b.advantage === advantage && !b.revokedAt))
    return "Este benefício já foi concedido a este restaurante.";
  return null;
}

/** Contagem por estado, para os filtros e indicadores da visão do programa. */
export function statusCounts(list: FoundingPartnerEnrollment[]) {
  const out = Object.fromEntries(FP_STATUS_ORDER.map((k) => [k, 0])) as Record<
    FoundingPartnerStatus,
    number
  >;
  for (const e of list) out[e.status]++;
  return out;
}
