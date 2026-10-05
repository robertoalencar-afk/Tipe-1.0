// Cliente Pagar.me (API v5), usado somente no servidor.
// Sem PAGARME_SECRET_KEY o app continua em modo de simulação.
const BASE = "https://api.pagar.me/core/v5";

export function pagarmeEnabled() {
  return !!process.env["PAGARME_SECRET_KEY"];
}

export async function pagarme<T = any>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const key = process.env["PAGARME_SECRET_KEY"];
  if (!key) throw new Error("Pagar.me não configurado");
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${btoa(key + ":")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("pagarme", path, res.status, JSON.stringify(j).slice(0, 500));
    throw new PagarmeError(j?.message ?? "Erro no provedor de pagamento", res.status);
  }
  return j as T;
}

export class PagarmeError extends Error {
  constructor(msg: string, public status: number) { super(msg); }
}

/** Taxa da TIPE sobre a conta do restaurante (percentual inteiro). Condição comercial pendente: padrão 0. */
export function platformFeePercent() {
  const n = Number(process.env["TIPE_PLATFORM_FEE_PERCENT"] ?? "0");
  return Number.isFinite(n) && n >= 0 && n < 50 ? Math.round(n) : 0;
}

/** Regras de divisão: restaurante recebe a conta; TIPE recebe a taxa, se houver. */
export function restaurantSplit(restaurantRecipientId: string) {
  const fee = platformFeePercent();
  const tipeRecipient = process.env["PAGARME_TIPE_RECIPIENT_ID"];
  const opts = { charge_processing_fee: true, charge_remainder_fee: true, liable: true };
  if (fee > 0 && tipeRecipient) {
    return [
      { type: "percentage", amount: 100 - fee, recipient_id: restaurantRecipientId, options: opts },
      { type: "percentage", amount: fee, recipient_id: tipeRecipient, options: { charge_processing_fee: false, charge_remainder_fee: false, liable: false } },
    ];
  }
  return [{ type: "percentage", amount: 100, recipient_id: restaurantRecipientId, options: opts }];
}

export type PagarmeOrder = { id: string; status: string; charges?: Array<{ status: string; last_transaction?: { qr_code?: string; qr_code_url?: string; status?: string } }> };

export function orderPaid(o: PagarmeOrder) {
  return o.status === "paid" || o.charges?.[0]?.status === "paid";
}
export function orderFailed(o: PagarmeOrder) {
  return ["failed", "canceled"].includes(o.status) || ["failed", "canceled"].includes(o.charges?.[0]?.status ?? "");
}
