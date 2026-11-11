// Tipe Guest · taxa de garantia da reserva (modelo OpenTable). Regras puras, em centavos.
// O cliente paga um valor simbólico para confirmar; no dia ele vira crédito na conta da mesa.
// Cancelou no prazo ou o restaurante cancelou: devolução integral. Cancelou fora do prazo ou não
// apareceu: o valor fica com o Tipe (decisão do Roberto, 03/11). Estornos: a tarifa é do Tipe.
// Pagamento só por Pix, Apple Pay ou Google Pay.

const MIN = 60_000;

export type GuaranteeSettings = {
  /** Valor por pessoa, em centavos. 0 = restaurante não cobra garantia. */
  perPersonCents: number;
  /** Prazo para cancelar com devolução, em minutos antes do horário. */
  refundCutoffMin: number;
};

export const GUARANTEE_LIMITS = { minPerPersonCents: 500, maxPerPersonCents: 10_000 } as const;
export const GUARANTEE_METHODS = ["pix", "apple_pay", "google_pay"] as const;
export type GuaranteeMethod = (typeof GUARANTEE_METHODS)[number];

export function guaranteeAmountCents(s: GuaranteeSettings, party: number) {
  if (s.perPersonCents <= 0) return 0;
  return s.perPersonCents * Math.max(1, Math.floor(party));
}

export type GuaranteeEvent =
  "cancelada_cliente" | "cancelada_restaurante" | "nao_compareceu" | "sentada";
export type GuaranteeOutcome = "devolvida" | "retida" | "credito";

/** O que acontece com a garantia em cada desfecho da reserva. */
export function guaranteeOutcome(a: {
  event: GuaranteeEvent;
  start: Date;
  at: Date;
  refundCutoffMin: number;
}): GuaranteeOutcome {
  switch (a.event) {
    case "sentada":
      return "credito";
    case "cancelada_restaurante":
      return "devolvida";
    case "nao_compareceu":
      return "retida";
    case "cancelada_cliente":
      return a.at.getTime() <= a.start.getTime() - a.refundCutoffMin * MIN ? "devolvida" : "retida";
  }
}

/** Abate a garantia da conta. Se a garantia for maior que a conta, a diferença volta ao cliente. */
export function applyGuaranteeCredit(billCents: number, creditCents: number) {
  const used = Math.min(Math.max(0, billCents), Math.max(0, creditCents));
  return { used, toPay: Math.max(0, billCents) - used, refund: Math.max(0, creditCents) - used };
}

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function prazo(min: number) {
  if (min % 1440 === 0) return `${min / 1440} ${min === 1440 ? "dia" : "dias"}`;
  if (min % 60 === 0) return `${min / 60} ${min === 60 ? "hora" : "horas"}`;
  return `${min} minutos`;
}

/** Texto que o cliente lê e aceita antes de pagar. */
export function guaranteePolicyLines(s: GuaranteeSettings, party: number) {
  const total = guaranteeAmountCents(s, party);
  return [
    `Você paga ${brl(total)} agora (${brl(s.perPersonCents)} por pessoa) para confirmar a reserva.`,
    `No dia, o valor vira crédito e é descontado da conta da mesa.`,
    `Cancelou até ${prazo(s.refundCutoffMin)} antes do horário: devolvemos tudo.`,
    `Cancelou depois disso ou não compareceu: o valor não é devolvido.`,
    `Se o restaurante cancelar, você recebe tudo de volta.`,
  ];
}

// ---------------------------------------------------------------- estado do pagamento e webhooks
// Nada aqui cobra ou devolve dinheiro de verdade: é só a regra que o backend vai seguir quando o
// gateway for escolhido. Regras de retenção ainda não são decisão jurídica final.

export type GuaranteePaymentStatus =
  "aguardando" | "paga" | "falhou" | "devolvida" | "retida" | "creditada";

export type GuaranteeState = {
  status: GuaranteePaymentStatus;
  amountCents: number;
  /** Ids de eventos do gateway já aplicados: o mesmo webhook duas vezes não muda nada. */
  seenEventIds: readonly string[];
};

export type GuaranteeWebhook = {
  id: string;
  type: "pagamento_aprovado" | "pagamento_recusado" | "estorno_confirmado";
  amountCents: number;
};

const NEXT: Record<
  GuaranteeWebhook["type"],
  Partial<Record<GuaranteePaymentStatus, GuaranteePaymentStatus>>
> = {
  pagamento_aprovado: { aguardando: "paga", falhou: "paga" },
  pagamento_recusado: { aguardando: "falhou" },
  estorno_confirmado: { paga: "devolvida" },
};

/**
 * Aplica um webhook do gateway. Idempotente pelo id; ignora valor divergente e transições
 * fora de ordem (ex.: recusa depois de aprovado). Devolve se mudou algo e por quê.
 */
export function applyGuaranteeWebhook(s: GuaranteeState, w: GuaranteeWebhook) {
  if (s.seenEventIds.includes(w.id))
    return { state: s, changed: false, reason: "duplicado" } as const;
  const seen = [...s.seenEventIds, w.id];
  if (w.amountCents !== s.amountCents)
    return {
      state: { ...s, seenEventIds: seen },
      changed: false,
      reason: "valor_divergente",
    } as const;
  const to = NEXT[w.type][s.status];
  if (!to)
    return {
      state: { ...s, seenEventIds: seen },
      changed: false,
      reason: "fora_de_ordem",
    } as const;
  return { state: { ...s, status: to, seenEventIds: seen }, changed: true, reason: "ok" } as const;
}

/** Fecha a garantia paga conforme o desfecho da reserva. Só age em garantia "paga". */
export function settleGuarantee(
  s: GuaranteeState,
  outcome: GuaranteeOutcome,
  billCents = 0,
): { state: GuaranteeState; refundCents: number; creditUsedCents: number; billToPayCents: number } {
  if (s.status !== "paga")
    return { state: s, refundCents: 0, creditUsedCents: 0, billToPayCents: Math.max(0, billCents) };
  if (outcome === "devolvida")
    return {
      state: { ...s, status: "devolvida" },
      refundCents: s.amountCents,
      creditUsedCents: 0,
      billToPayCents: Math.max(0, billCents),
    };
  if (outcome === "retida")
    return {
      state: { ...s, status: "retida" },
      refundCents: 0,
      creditUsedCents: 0,
      billToPayCents: 0,
    };
  const c = applyGuaranteeCredit(billCents, s.amountCents);
  return {
    state: { ...s, status: "creditada" },
    refundCents: c.refund,
    creditUsedCents: c.used,
    billToPayCents: c.toPay,
  };
}
