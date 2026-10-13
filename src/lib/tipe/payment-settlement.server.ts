// Aplica ao banco o que o provedor informa sobre um pedido. Webhooks, criação
// do pagamento e reconciliador passam por aqui, então todos seguem a mesma
// regra (payment-state.ts) e as mesmas funções do banco, que são idempotentes.
import { decideSettlement, type PaymentStatus, type ProviderOrderView, type SettlementDecision } from "./payment-state";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type LocalPayment = {
  id: string;
  status: PaymentStatus;
  amount: number;
  created_at: string;
  restaurant_slug: string;
  payment_target: string;
  provider_order_id: string | null;
  archived: boolean;
};

const COLS = "id, status, amount, created_at, restaurant_slug, payment_target, provider_order_id";

/** Pagamento local de um pedido do provedor, inclusive de mesas já reabertas (arquivo). */
export async function findPaymentByOrder(admin: Admin, orderId: string): Promise<LocalPayment | null> {
  const { data } = await admin.from("table_payment_requests").select(COLS).eq("provider_order_id", orderId).maybeSingle();
  if (data) return { ...(data as unknown as Omit<LocalPayment, "archived">), amount: Number((data as { amount: number }).amount), archived: false };
  const { data: arch } = await admin.from("archived_payments" as never).select(COLS).eq("provider_order_id" as never, orderId as never).maybeSingle() as unknown as { data: Omit<LocalPayment, "archived"> | null };
  return arch ? { ...arch, amount: Number(arch.amount), archived: true } : null;
}

/** Procura, sem confiar na estrutura do corpo, o primeiro id de pedido Pagar.me (or_...). */
export function findOrderId(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === "string") return /^or_[A-Za-z0-9]{4,64}$/.test(value) ? value : null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  // Caminhos conhecidos primeiro: order.*, charge.order, data.order
  for (const k of ["order_id", "order", "charge", "id"]) {
    if (k in obj) { const found = findOrderId(obj[k], depth + 1); if (found) return found; }
  }
  for (const v of Object.values(obj)) { const found = findOrderId(v, depth + 1); if (found) return found; }
  return null;
}

/** Eventos do Pagar.me que podem mudar um pagamento. */
export function isPaymentEvent(type: string) {
  return type.startsWith("order.") || type.startsWith("charge.") || type.startsWith("chargeback.");
}

/**
 * Reconsulta já feita pelo chamador (`order`) → decisão → função do banco.
 * Devolve a decisão aplicada, para log e testes.
 */
export async function applyProviderOrder(admin: Admin, orderId: string, order: ProviderOrderView, local?: LocalPayment | null): Promise<SettlementDecision["action"] | "not_found"> {
  const pay = local ?? (await findPaymentByOrder(admin, orderId));
  if (!pay) return "not_found";
  const decision = decideSettlement({
    local: pay.status,
    order,
    expectedCents: Math.round(pay.amount * 100),
    ageMs: Date.now() - Date.parse(pay.created_at),
  });
  switch (decision.action) {
    case "settle_paid":
    case "settle_failed":
      await admin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: decision.action === "settle_paid" } as never);
      break;
    case "reverse":
      await admin.rpc("provider_reverse_payment" as never, { p_order_id: orderId, p_kind: decision.kind } as never);
      break;
    case "incident":
      await admin.rpc("record_payment_incident" as never, { p_payment_id: pay.id, p_kind: decision.kind, p_detail: decision.detail } as never);
      break;
    default:
      break;
  }
  return decision.action;
}
