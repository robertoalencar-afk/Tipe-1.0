// Avisos de troca de chave Pix (dono do restaurante e o próprio garçom).
export async function notifyPixChange(i: { waiterId: string; waiterName: string; waiterUserId: string; restaurantId: string; restaurantName: string; keyMasked: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const until = new Date(Date.now() + 48 * 3600_000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const base = { waiter: i.waiterName, restaurant: i.restaurantName, keyMasked: i.keyMasked, until };
  const emailOf = async (uid: string) => (await supabaseAdmin.auth.admin.getUserById(uid)).data.user?.email ?? null;
  const { data: owners } = await supabaseAdmin.from("user_roles").select("user_id").eq("restaurant_id", i.restaurantId).eq("role", "owner");
  const sends: Promise<unknown>[] = [];
  for (const o of owners ?? []) {
    const to = await emailOf(o.user_id);
    if (to) sends.push(sendTemplateEmail("pix-change-notice", to, { templateData: { ...base, audience: "owner" }, idempotencyKey: `pix-owner-${i.waiterId}-${o.user_id}-${Date.now()}` }));
  }
  const waiterEmail = await emailOf(i.waiterUserId);
  if (waiterEmail) sends.push(sendTemplateEmail("pix-change-notice", waiterEmail, { templateData: { ...base, audience: "waiter" } }));
  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("pix_notice", r.reason);
}
