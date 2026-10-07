import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WaiterInsight = {
  id: string; name: string; active: boolean;
  tips: number; teamTips: number; tipeFee: number; tipCount: number; ratingAvg: number | null; ratingCount: number;
  comments: { stars: number; comment: string; table: string; at: string }[];
};

export const getWaiterInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(64), days: z.number().int().min(1).max(365) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado ou sem acesso");
    const { data: allowed } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: r.id, _roles: ["owner", "cashier"] });
    if (!allowed) throw new Error("Sem permissão");
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [waiters, ratings, live, arch] = await Promise.all([
      db.from("pdv_waiters").select("id, name, active").eq("restaurant_id", r.id),
      db.from("waiter_ratings").select("waiter_id, stars, comment, table_number, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
      db.from("table_payment_requests").select("waiter_id, amount").eq("restaurant_slug", data.slug).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
      db.from("archived_payments").select("waiter_id, amount").eq("restaurant_slug", data.slug).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
    ]);
    const list: WaiterInsight[] = (waiters.data ?? []).map((w) => {
      const rs = (ratings.data ?? []).filter((x) => x.waiter_id === w.id);
      const ts = [...(live.data ?? []), ...(arch.data ?? [])].filter((p) => p.waiter_id === w.id);
      return {
        id: w.id, name: w.name, active: w.active,
        tips: ts.reduce((s, p) => s + Number(p.amount), 0),
        teamTips: ts.reduce((s, p) => s + Number(p.amount) * 0.7, 0),
        tipeFee: ts.reduce((s, p) => s + Number(p.amount) * 0.3, 0),
        tipCount: ts.length,
        ratingAvg: rs.length ? rs.reduce((s, x) => s + x.stars, 0) / rs.length : null, ratingCount: rs.length,
        comments: rs.filter((x) => x.comment).map((x) => ({ stars: x.stars, comment: x.comment as string, table: x.table_number, at: x.created_at })),
      };
    });
    return list.sort((a, b) => b.tips - a.tips || a.name.localeCompare(b.name));
  });
