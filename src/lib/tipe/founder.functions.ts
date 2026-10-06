import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "./plans";
import { TIP_SPLIT } from "./rules";

async function requireFounder(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "founder" });
  if (!data) throw new Error("Somente o fundador TIPE");
}

const planPrice = (plan: string) => {
  const p = PLANS.find((x) => x.id === plan);
  return p ? p.price : 0;
};

/** Visão completa do fundador: restaurantes, garçons, indicadores, leads, LGPD e segurança. */
export const getFounderOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const [rest, subs, tables, waiters, pays, arch, leads, priv, sec, wd, payout] = await Promise.all([
      db.from("restaurants").select("id, slug, name, pos_mode, pos_provider, onboarding_step, cnpj, phone, address, created_at").order("created_at", { ascending: false }),
      db.from("restaurant_subscriptions").select("restaurant_id, plan, status, trial_ends_at, current_period_end"),
      db.from("restaurant_tables").select("restaurant_id, active"),
      db.from("pdv_waiters").select("id, restaurant_id, name, email, code, active, user_id, created_at"),
      db.from("table_payment_requests").select("restaurant_slug, payment_target, status, amount, waiter_id, created_at").gte("created_at", since30),
      db.from("archived_payments").select("restaurant_slug, payment_target, status, amount, waiter_id, created_at").gte("created_at", since30),
      db.from("restaurant_leads").select("id, restaurant_name, contact_name, email, phone, message, created_at").order("created_at", { ascending: false }).limit(50),
      db.from("privacy_requests").select("id, request_type, name, email, status, created_at").order("created_at", { ascending: false }).limit(50),
      db.from("security_events").select("id, created_at, action, restaurant_slug, result, detail").order("created_at", { ascending: false }).limit(40),
      db.from("waiter_withdrawals").select("waiter_id, amount, status"),
      db.from("restaurant_payout_accounts").select("restaurant_id, status"),
    ]);

    const payments = [...(pays.data ?? []), ...(arch.data ?? [])].filter((p) => p.status === "approved");
    const bySlug = new Map<string, { gmv: number; tips: number; count: number }>();
    const byWaiter = new Map<string, number>();
    const daily = new Map<string, number>();
    for (const p of payments) {
      const s = bySlug.get(p.restaurant_slug) ?? { gmv: 0, tips: 0, count: 0 };
      const amt = Number(p.amount);
      if (p.payment_target === "restaurant") { s.gmv += amt; s.count++; const d = p.created_at.slice(0, 10); daily.set(d, (daily.get(d) ?? 0) + amt); }
      else { s.tips += amt; if (p.waiter_id) byWaiter.set(p.waiter_id, (byWaiter.get(p.waiter_id) ?? 0) + amt * TIP_SPLIT.waiter); }
      bySlug.set(p.restaurant_slug, s);
    }
    const subMap = new Map((subs.data ?? []).map((s) => [s.restaurant_id, s]));
    const payoutMap = new Map((payout.data ?? []).map((p) => [p.restaurant_id, p.status]));
    const restName = new Map((rest.data ?? []).map((r) => [r.id, r.name]));

    const restaurants = (rest.data ?? []).map((r) => {
      const sub = subMap.get(r.id);
      const m = bySlug.get(r.slug) ?? { gmv: 0, tips: 0, count: 0 };
      return {
        id: r.id, slug: r.slug, name: r.name, cnpj: r.cnpj, phone: r.phone, address: r.address, createdAt: r.created_at,
        pos: r.pos_mode === "tipe" ? "Sem PDV conectado" : r.pos_provider, onboarding: r.onboarding_step,
        plan: sub?.plan ?? "—", subStatus: sub?.status ?? "sem assinatura", trialEndsAt: sub?.trial_ends_at ?? null,
        tables: (tables.data ?? []).filter((t) => t.restaurant_id === r.id && t.active).length,
        waiters: (waiters.data ?? []).filter((w) => w.restaurant_id === r.id && w.active).length,
        payout: payoutMap.get(r.id) ?? "não cadastrado",
        gmv30: +m.gmv.toFixed(2), tips30: +m.tips.toFixed(2), payments30: m.count,
      };
    });

    const wdPaid = new Map<string, number>();
    for (const w of wd.data ?? []) if (w.status === "paid") wdPaid.set(w.waiter_id, (wdPaid.get(w.waiter_id) ?? 0) + Number(w.amount));
    const waiterList = (waiters.data ?? []).map((w) => ({
      id: w.id, name: w.name, email: w.email, code: w.code, active: w.active, hasLogin: !!w.user_id,
      restaurant: restName.get(w.restaurant_id) ?? "—", tips30: +(byWaiter.get(w.id) ?? 0).toFixed(2), withdrawn: +(wdPaid.get(w.id) ?? 0).toFixed(2),
    })).sort((a, b) => b.tips30 - a.tips30);

    const totalGmv = restaurants.reduce((a, r) => a + r.gmv30, 0);
    const totalTips = restaurants.reduce((a, r) => a + r.tips30, 0);
    const activeSubs = restaurants.filter((r) => r.subStatus === "active");
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
      return { day: d.slice(8, 10) + "/" + d.slice(5, 7), gmv: +(daily.get(d) ?? 0).toFixed(2) };
    });

    return {
      kpis: {
        restaurants: restaurants.length,
        trial: restaurants.filter((r) => r.subStatus === "trialing" || r.subStatus === "trial").length,
        active: activeSubs.length,
        mrr: +activeSubs.reduce((a, r) => a + planPrice(r.plan), 0).toFixed(2),
        onboardingPending: restaurants.filter((r) => r.onboarding !== "done").length,
        tables: restaurants.reduce((a, r) => a + r.tables, 0),
        waiters: waiterList.filter((w) => w.active).length,
        gmv30: +totalGmv.toFixed(2),
        tips30: +totalTips.toFixed(2),
        tipeRevenue30: +(totalTips * TIP_SPLIT.tipe).toFixed(2),
        pendingWithdrawals: (wd.data ?? []).filter((w) => w.status === "requested").length,
        newLeads: (leads.data ?? []).filter((l) => l.created_at >= since30).length,
        openPrivacy: (priv.data ?? []).filter((p) => p.status !== "done" && p.status !== "closed").length,
      },
      days, restaurants, waiters: waiterList,
      leads: leads.data ?? [], privacy: priv.data ?? [], security: sec.data ?? [],
    };
  });
