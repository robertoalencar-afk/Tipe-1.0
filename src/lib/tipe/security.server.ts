// Helpers de segurança executados apenas no servidor (usam o cliente administrativo).
// Toda operação com supabaseAdmin ignora RLS: a autorização precisa ser feita aqui.
import { getRequestHeader } from "@tanstack/react-start/server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function clientIp(): string {
  try {
    return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
  } catch {
    return "unknown";
  }
}

export class RateLimitError extends Error {
  status = 429;
  constructor() { super("Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente de novo."); }
}

/** Retorna true se dentro do limite. Falha aberta se o banco não responder (não derruba o restaurante). */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const db = await admin();
  const { data, error } = await db.rpc("rate_limit_hit" as never, { p_key: key, p_max: max, p_window_seconds: windowSeconds } as never);
  if (error) { console.error("rate_limit", error.message); return true; }
  return data !== false;
}

export async function enforceRate(key: string, max: number, windowSeconds: number, slug?: string) {
  if (await rateLimit(key, max, windowSeconds)) return;
  await logSecurityEvent({ action: "rate_limited", resource: key.split(":")[0] ?? "unknown", result: "denied", restaurantSlug: slug });
  throw new RateLimitError();
}

export async function logSecurityEvent(e: { action: string; resource?: string | undefined; result?: "ok" | "denied" | "error"; restaurantSlug?: string | undefined; restaurantId?: string | undefined; actorId?: string | undefined; detail?: string | undefined }) {
  try {
    const db = await admin();
    await db.from("security_events" as never).insert({
      action: e.action, resource: e.resource ?? null, result: e.result ?? "ok",
      restaurant_slug: e.restaurantSlug ?? null, restaurant_id: e.restaurantId ?? null,
      actor_id: e.actorId ?? null, detail: e.detail?.slice(0, 300) ?? null,
    } as never);
  } catch (err) {
    console.error("security_event", err);
  }
}

/**
 * Verifica que a sessão da conta pertence exatamente a esta mesa deste restaurante.
 * A sessão muda sempre que a mesa é reaberta, então uma sessão antiga nunca
 * autoriza a conta nova.
 */
export async function verifyTableSession(slug: string, tableNumber: string, session: string) {
  const db = await admin();
  const { data: r } = await db.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!r) return null;
  const { data: t } = await db.from("restaurant_tables").select("number, active, session_token" as never).eq("restaurant_id", r.id).eq("number", tableNumber).maybeSingle();
  const row = t as { number: string; active: boolean; session_token: string } | null;
  if (!row || !row.active || !safeEqual(row.session_token, session)) {
    await logSecurityEvent({ action: "table_session_denied", resource: `mesa:${tableNumber}`, result: "denied", restaurantSlug: slug, restaurantId: r.id, detail: `ip=${clientIp()}` });
    return null;
  }
  return { restaurantId: r.id as string };
}

export function safeEqual(a: string, b: string) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
