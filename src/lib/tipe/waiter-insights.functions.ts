import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WaiterInsight = {
  id: string; name: string; active: boolean;
  tips: number; teamTips: number; tipeFee: number; tipCount: number; tablesPaid: number; ratingAvg: number | null; ratingCount: number;
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
    const { coletarGarcons } = await import("./garcom-ranking.server");
    const list = await coletarGarcons({ id: r.id, slug: data.slug }, data.days);
    return list.sort((a, b) => b.tips - a.tips || a.name.localeCompare(b.name));
  });
