/** Dados por garçom no período (somente servidor). Mesa paga pelo QR = mesa+dia com pagamento aprovado. */
import type { WaiterInsight } from "./waiter-insights.functions";

export async function coletarGarcons(restaurant: { id: string; slug: string }, days: number): Promise<WaiterInsight[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const slug = restaurant.slug;
  const r = restaurant;
  const [waiters, ratings, live, arch] = await Promise.all([
    db.from("pdv_waiters").select("id, name, active").eq("restaurant_id", r.id),
    db.from("waiter_ratings").select("waiter_id, stars, comment, table_number, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
    db.from("table_payment_requests").select("waiter_id, amount, payment_target, table_number, created_at").eq("restaurant_slug", slug).eq("status", "approved").gte("created_at", since),
    db.from("archived_payments").select("waiter_id, amount, payment_target, table_number, created_at").eq("restaurant_slug", slug).eq("status", "approved").gte("created_at", since),
  ]);
  const pagos = [...(live.data ?? []), ...(arch.data ?? [])];
  return (waiters.data ?? []).map((w) => {
    const rs = (ratings.data ?? []).filter((x) => x.waiter_id === w.id);
    const meus = pagos.filter((p) => p.waiter_id === w.id);
    const ts = meus.filter((p) => p.payment_target === "tipe");
    const mesas = new Set(meus.map((p) => `${p.table_number}|${String(p.created_at).slice(0, 10)}`));
    return {
      id: w.id, name: w.name, active: w.active,
      tips: ts.reduce((s, p) => s + Number(p.amount), 0),
      teamTips: ts.reduce((s, p) => s + Number(p.amount) * 0.7, 0),
      tipeFee: ts.reduce((s, p) => s + Number(p.amount) * 0.3, 0),
      tipCount: ts.length,
      tablesPaid: mesas.size,
      ratingAvg: rs.length ? rs.reduce((s, x) => s + x.stars, 0) / rs.length : null, ratingCount: rs.length,
      comments: rs.filter((x) => x.comment).map((x) => ({ stars: x.stars, comment: x.comment as string, table: x.table_number, at: x.created_at })),
    };
  });
}
