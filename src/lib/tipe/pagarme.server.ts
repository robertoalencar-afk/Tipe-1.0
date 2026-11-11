// Cliente Pagar.me (API v5), usado somente no servidor.
// Sem PAGARME_SECRET_KEY o app continua em modo de simulação.
const BASE = "https://api.pagar.me/core/v5";

export function pagarmeEnabled() {
  return !!process.env["PAGARME_SECRET_KEY"];
}

/**
 * Aprovação simulada (sem provedor de pagamento) só existe quando ligada de
 * propósito, em ambientes de teste ou demonstração: TIPE_ALLOW_SIMULATED_PAYMENTS=true.
 * Em produção fica desligada: sem conta Pagar.me, nenhum pagamento digital é aceito.
 */
/**
 * Empresas virtuais: sempre simulam e nunca cobram de verdade. Servem para a
 * revisão visual e para a demonstração a clientes (pitch), com todos os meios
 * aprovados, inclusive Apple Pay e Google Pay. As duas últimas são criadas por
 * scripts/db/criar-empresas-teste.mjs.
 */
export const SIMULATION_RESTAURANT_SLUGS = ["teste-tipe", "bistro-teste", "bar-teste"] as const;

export function isSimulationRestaurant(slug?: string | null) {
  return !!slug && (SIMULATION_RESTAURANT_SLUGS as readonly string[]).includes(slug);
}

export function simulatedPaymentsAllowed(slug?: string | null) {
  return process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"] === "true" || isSimulationRestaurant(slug);
}

/** Meios da conta que o cliente pode usar de fato neste restaurante agora. */
export function usableBillMethods(configured: string[], hasProvider: boolean, slug?: string | null) {
  if (hasProvider || simulatedPaymentsAllowed(slug)) return configured;
  const presencial = configured.filter((m) => m === "at_establishment");
  return presencial.length ? presencial : ["at_establishment"];
}

export async function pagarme<T = any>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string; secretKey?: string } = {}): Promise<T> {
  const key = init.secretKey ?? process.env["PAGARME_SECRET_KEY"];
  if (!key) throw new Error("Pagar.me não configurado");
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${btoa(key + ":")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : null,
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

export type PagarmeOrder = { id: string; status: string; amount?: number; charges?: Array<{ status: string; amount?: number; paid_amount?: number; last_transaction?: { qr_code?: string; qr_code_url?: string; status?: string } }> };

export function orderPaid(o: PagarmeOrder) {
  return o.status === "paid" || o.charges?.[0]?.status === "paid";
}
export function orderFailed(o: PagarmeOrder) {
  return ["failed", "canceled"].includes(o.status) || ["failed", "canceled"].includes(o.charges?.[0]?.status ?? "");
}

// Chave do restaurante guardada com AES-GCM; nunca volta para o navegador.
async function cryptoKey() {
  const raw = process.env["TIPE_ENCRYPTION_KEY"];
  if (!raw) throw new Error("Criptografia não configurada");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptSecret(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(plain)));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function decryptSecret(enc: string) {
  const [iv, ct] = enc.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv!) }, await cryptoKey(), unb64(ct!));
  return new TextDecoder().decode(pt);
}

/** Chave Pagar.me própria do restaurante, se conectada. */
export async function restaurantPagarmeKey(restaurantId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("restaurant_pagarme_accounts").select("secret_key_enc, status").eq("restaurant_id", restaurantId).maybeSingle();
  if (!data || data.status !== "active") return null;
  return decryptSecret(data.secret_key_enc);
}
