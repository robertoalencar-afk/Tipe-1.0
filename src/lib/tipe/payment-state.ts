// Máquina de estados dos pagamentos da TIPE e decisão de liquidação.
//
// Fonte da verdade: o pedido reconsultado no provedor (Pagar.me). Webhook,
// reconciliador e retorno da criação do pedido passam todos por
// decideSettlement, então chegar duplicado, fora de ordem ou atrasado leva
// sempre à mesma decisão.

export type PaymentStatus = "pending" | "approved" | "failed" | "cancelled" | "refunded" | "chargeback";

/** Transições permitidas. Estados finais não saem do lugar. */
export const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["approved", "failed", "cancelled"],
  approved: ["refunded", "chargeback"],
  failed: [],
  cancelled: [],
  refunded: [],
  chargeback: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus) {
  return TRANSITIONS[from].includes(to);
}

/** Visão mínima do pedido no provedor (Pagar.me v5). */
export type ProviderOrderView = {
  status: string;
  amount?: number | undefined;
  charges?: Array<{ status: string; amount?: number | undefined; paid_amount?: number | undefined }> | undefined;
};

export type IncidentKind = "amount_mismatch" | "paid_after_release" | "stuck_pending" | "refund" | "chargeback";

export type SettlementDecision =
  | { action: "settle_paid" }
  | { action: "settle_failed" }
  | { action: "reverse"; kind: "refunded" | "chargeback" }
  | { action: "incident"; kind: IncidentKind; detail: string }
  | { action: "wait" }
  | { action: "noop" };

/** Depois disso, um pagamento ainda pendente no provedor vira pendência para o restaurante. */
export const STUCK_AFTER_MS = 2 * 60 * 60 * 1000;

const PAID = new Set(["paid", "overpaid"]);
const FAILED = new Set(["failed", "canceled"]);

function chargeOf(order: ProviderOrderView) {
  return order.charges?.[0];
}

/** Centavos efetivamente pagos segundo o provedor, quando informados. */
export function paidCents(order: ProviderOrderView): number | null {
  const c = chargeOf(order);
  const v = c?.paid_amount ?? c?.amount ?? order.amount;
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

export function decideSettlement(input: {
  local: PaymentStatus;
  order: ProviderOrderView;
  /** Valor que a TIPE calculou e cobrou, em centavos. */
  expectedCents: number;
  /** Idade do pagamento local. */
  ageMs: number;
}): SettlementDecision {
  const { local, order, expectedCents, ageMs } = input;
  const charge = chargeOf(order)?.status ?? "";
  const orderStatus = order.status ?? "";

  if (charge === "chargedback") {
    if (local === "approved") return { action: "reverse", kind: "chargeback" };
    return local === "chargeback" ? { action: "noop" } : { action: "incident", kind: "chargeback", detail: `Contestação recebida com o pagamento em "${local}".` };
  }

  const paid = PAID.has(charge) || (orderStatus === "paid" && !FAILED.has(charge));
  const failed = FAILED.has(orderStatus) || FAILED.has(charge);

  if (charge === "underpaid" || charge === "overpaid" || (paid && paidCents(order) !== null && paidCents(order) !== expectedCents)) {
    if (local === "pending" || local === "approved") {
      return { action: "incident", kind: "amount_mismatch", detail: `Provedor informa ${paidCents(order) ?? "?"} centavos; a TIPE esperava ${expectedCents}.` };
    }
  }

  switch (local) {
    case "pending":
      if (paid) return { action: "settle_paid" };
      if (failed) return { action: "settle_failed" };
      return ageMs > STUCK_AFTER_MS
        ? { action: "incident", kind: "stuck_pending", detail: `Pagamento sem confirmação do provedor há mais de ${Math.round(STUCK_AFTER_MS / 3_600_000)}h.` }
        : { action: "wait" };
    case "approved":
      // Cobrança cancelada depois de paga = estorno no Pagar.me v5.
      if (charge === "canceled" || (orderStatus === "canceled" && !PAID.has(charge))) return { action: "reverse", kind: "refunded" };
      return { action: "noop" };
    case "failed":
    case "cancelled":
      // Dinheiro entrou depois que a reserva foi liberada: alguém precisa olhar.
      return paid ? { action: "incident", kind: "paid_after_release", detail: "O provedor confirmou o pagamento depois que os itens foram liberados." } : { action: "noop" };
    default:
      return { action: "noop" };
  }
}

/** Rótulo para o cliente e para o painel. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendente",
  approved: "Confirmado",
  failed: "Não concluído",
  cancelled: "Cancelado",
  refunded: "Estornado",
  chargeback: "Contestado",
};
