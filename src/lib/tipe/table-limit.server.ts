// Limite de mesas por plano. A regra vive no banco (trigger enforce_table_limit);
// aqui só lemos o estado para explicar ao usuário.
import { WHATSAPP_NUMBER } from "./contact";

export const LIMIT_MESSAGE = "Você atingiu o limite de mesas do seu plano. Fale com a TIPE para fazer upgrade.";

export async function tableLimitInfo(restaurantId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [{ data: limit }, { count }, { data: sub }] = await Promise.all([
    db.rpc("restaurant_table_limit", { p_rid: restaurantId }),
    db.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).eq("active", true),
    db.from("restaurant_subscriptions").select("plan").eq("restaurant_id", restaurantId).maybeSingle(),
  ]);
  return { active: count ?? 0, limit: Number(limit ?? 20), plan: sub?.plan ?? "profissional" };
}

export function upgradeLink(restaurantName: string, planName: string) {
  const msg = `Olá, TIPE! Sou do restaurante ${restaurantName}, no plano ${planName}, e quero ativar mais mesas.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
