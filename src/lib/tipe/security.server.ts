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
  try { await maybeAlert(e); } catch (err) { console.error("security_alert", err); }
}

const ALERT_TITLES: Record<string, string> = {
  pix_change: "Troca de chave Pix",
  lebre_80: "Lebre perto do limite diário",
  role_change: "Mudança de papel de acesso",
  webhooks_denied: "Webhooks recusados em sequência",
  payment_limit: "Limite de pagamentos estourado",
  lebre_abuse: "Uso anormal da Lebre",
  founder_new_device: "Login de founder em dispositivo novo",
  login_failures: "Pico de falhas de login",
};

async function maybeAlert(e: { action: string; resource?: string | undefined; restaurantSlug?: string | undefined; detail?: string | undefined }) {
  let type: string | null = null;
  if (e.action === "waiter_pix_saved") type = "pix_change";
  else if (e.action.startsWith("role_")) type = "role_change";
  else if (e.action === "founder_new_device") type = "founder_new_device";
  else if (e.action === "login_failed_spike") type = "login_failures";
  else if (e.action === "rate_limited" && e.resource === "pay") type = "payment_limit";
  else if (e.action === "rate_limited" && e.resource?.startsWith("lebre")) type = "lebre_abuse";
  else if (e.action.endsWith("webhook_denied")) {
    const db = await admin();
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await db.from("security_events").select("id", { count: "exact", head: true }).like("action", "%webhook_denied").gte("created_at", since);
    if ((count ?? 0) >= 5) type = "webhooks_denied";
  }
  if (!type) return;
  await sendSecurityAlert(type, `${ALERT_TITLES[type]}${e.restaurantSlug ? ` em ${e.restaurantSlug}` : ""}.${e.resource ? `\nRecurso: ${e.resource}` : ""}${e.detail ? `\n${e.detail}` : ""}`);
}

/** No máximo 1 e-mail por tipo a cada 15 minutos; os demais são contados e entram no próximo. */
export async function sendSecurityAlert(type: string, detail: string) {
  const db = await admin();
  const { data: st } = await db.from("security_alert_state").select("last_sent_at, suppressed_count").eq("alert_type", type).maybeSingle();
  const recent = st?.last_sent_at && Date.now() - new Date(st.last_sent_at).getTime() < 15 * 60_000;
  if (recent) {
    await db.from("security_alert_state").update({ suppressed_count: (st?.suppressed_count ?? 0) + 1 }).eq("alert_type", type);
    return;
  }
  const count = (st?.suppressed_count ?? 0) + 1;
  await db.from("security_alert_state").upsert({ alert_type: type, last_sent_at: new Date().toISOString(), suppressed_count: 0 });
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  await sendTemplateEmail("security-alert", "roberto@tipe.digital", {
    templateData: { title: ALERT_TITLES[type.split(":")[0] ?? type] ?? "Alerta de segurança", detail, count, at: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) },
  });
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

/**
 * Teto diário da Lebre. kind "panel" conta por restaurante; "public" é global.
 * Retorna mensagem educada quando o limite do dia foi atingido; alerta em 80%.
 */
export async function consumeLebreQuota(kind: "panel" | "public", restaurantSlug?: string): Promise<string | null> {
  const db = await admin();
  const scope = kind === "public" ? "public" : `panel:${restaurantSlug}`;
  const { data, error } = await db.rpc("lebre_consume" as never, { p_scope: scope, p_kind: kind } as never);
  if (error) { console.error("lebre_quota", error.message); return null; }
  const r = data as { allowed: boolean; hits: number; limit: number; alert80: boolean };
  const where = kind === "public" ? "Lebre pública (total do site)" : `Lebre do painel em ${restaurantSlug}`;
  if (r.alert80) {
    try { await sendSecurityAlert(`lebre_80:${scope}`, `${where} chegou a ${r.hits} de ${r.limit} mensagens hoje (80% do limite diário).`); } catch (e) { console.error("lebre_alert", e); }
  }
  if (!r.allowed) {
    await logSecurityEvent({ action: "lebre_daily_limit", resource: scope, result: "denied", restaurantSlug });
    return "Hoje eu já respondi todas as perguntas que podia por aqui. Meu limite do dia foi atingido e volto a responder amanhã. Se for urgente, fale com a equipe TIPE no WhatsApp.";
  }
  return null;
}

/** Autoriza operação de restaurante com o cliente da sessão, sem exceção para founder. */
export async function requireRestaurantRoles(
  client: import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >,
  userId: string,
  slug: string,
  roles: ("owner" | "manager" | "cashier" | "waiter")[],
) {
  const { data: restaurant, error } = await client
    .from("restaurants")
    .select("id, slug, cnpj")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !restaurant) throw new Error("Restaurante não encontrado ou sem acesso");
  const { data: allowed, error: denied } = await client.rpc("has_restaurant_role", {
    _user_id: userId,
    _restaurant_id: restaurant.id,
    _roles: roles,
  });
  if (denied || allowed !== true)
    throw new Error("Sua função não permite esta operação no restaurante");
  return restaurant;
}
