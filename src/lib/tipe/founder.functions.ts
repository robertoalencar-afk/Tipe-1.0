import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "./plans";
import { TIP_SPLIT } from "./rules";

async function requireFounder(ctx: { supabase: any; userId: string; claims?: any }) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(ctx);
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
      db.from("restaurant_pagarme_accounts").select("restaurant_id, status"),
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

/** Teto diário da Lebre: leitura e ajuste (somente founder com 2FA). */
export const getLebreLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const [lim, use] = await Promise.all([
      db.from("lebre_limits").select("panel_daily, public_daily").eq("id", "default").maybeSingle(),
      db.from("lebre_usage").select("scope, hits").eq("day", day).order("hits", { ascending: false }).limit(20),
    ]);
    return { panelDaily: lim.data?.panel_daily ?? 200, publicDaily: lim.data?.public_daily ?? 2000, today: use.data ?? [] };
  });

export const setLebreLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { panelDaily: number; publicDaily: number }) => {
    const ok = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max;
    if (!ok(d.panelDaily, 100000) || !ok(d.publicDaily, 1000000)) throw new Error("Limite inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("lebre_limits").update({ panel_daily: data.panelDaily, public_daily: data.publicDaily, updated_at: new Date().toISOString(), updated_by: context.userId }).eq("id", "default");
    if (error) throw new Error("Não foi possível salvar os limites");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "lebre_limits_changed", resource: "lebre_limits", actorId: context.userId, detail: `painel=${data.panelDaily} publica=${data.publicDaily}` });
    return { ok: true };
  });

/** Planos e limites de mesas (somente founder com 2FA). */
export const getPlansAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [cat, rest, subs, tables] = await Promise.all([
      db.from("plan_catalog").select("id, name, max_tables, founder_price, full_price").order("position"),
      db.from("restaurants").select("id, slug, name").order("name"),
      db.from("restaurant_subscriptions").select("restaurant_id, plan, status, trial_ends_at, custom_table_limit, founder_price, founder_price_until, billing_period"),
      db.from("restaurant_tables").select("restaurant_id").eq("active", true),
    ]);
    const catalog = cat.data ?? [];
    const active = new Map<string, number>();
    (tables.data ?? []).forEach((t) => active.set(t.restaurant_id, (active.get(t.restaurant_id) ?? 0) + 1));
    const restaurants = (rest.data ?? []).map((r) => {
      const s = (subs.data ?? []).find((x) => x.restaurant_id === r.id);
      const plan = s?.plan ?? "profissional";
      const limit = s?.custom_table_limit ?? catalog.find((c) => c.id === plan)?.max_tables ?? 20;
      return { id: r.id, slug: r.slug, name: r.name, plan, status: s?.status ?? "trialing", trialEndsAt: s?.trial_ends_at ?? null, customLimit: s?.custom_table_limit ?? null,
        founderPrice: s?.founder_price ?? false, founderUntil: s?.founder_price_until ?? null, billing: s?.billing_period ?? "monthly", active: active.get(r.id) ?? 0, limit };
    });
    return { catalog: catalog.map((c) => ({ ...c, founder_price: c.founder_price === null ? null : Number(c.founder_price), full_price: c.full_price === null ? null : Number(c.full_price) })), restaurants };
  });

export const savePlanCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; maxTables: number | null; founderPrice: number | null; fullPrice: number | null }) => {
    if (!["essencial", "profissional", "premium", "personalizado"].includes(d.id)) throw new Error("Plano inválido");
    const okN = (n: number | null, max: number) => n === null || (Number.isFinite(n) && n >= 0 && n <= max);
    if (!okN(d.maxTables, 5000) || !okN(d.founderPrice, 100000) || !okN(d.fullPrice, 100000) || d.maxTables === 0) throw new Error("Valor inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("plan_catalog").update({ max_tables: data.maxTables, founder_price: data.founderPrice, full_price: data.fullPrice, updated_at: new Date().toISOString(), updated_by: context.userId }).eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar o plano");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "plan_catalog_changed", resource: `plano:${data.id}`, actorId: context.userId, detail: `mesas=${data.maxTables} fundador=${data.founderPrice} cheio=${data.fullPrice}` });
    return { ok: true };
  });

export const saveRestaurantPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { restaurantId: string; plan: string; customLimit: number | null; founderPrice: boolean; billing: string; status: string }) => {
    if (!/^[0-9a-f-]{36}$/.test(d.restaurantId)) throw new Error("Restaurante inválido");
    if (!["essencial", "profissional", "premium", "personalizado"].includes(d.plan)) throw new Error("Plano inválido");
    if (!["monthly", "annual"].includes(d.billing)) throw new Error("Periodicidade inválida");
    if (!["trialing", "active", "suspended", "canceled"].includes(d.status)) throw new Error("Status inválido");
    if (d.customLimit !== null && (!Number.isInteger(d.customLimit) || d.customLimit < 1 || d.customLimit > 5000)) throw new Error("Limite inválido");
    if (d.plan === "personalizado" && d.customLimit === null) throw new Error("Defina o limite de mesas do plano Personalizado");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: before } = await db.from("restaurant_subscriptions").select("plan, founder_price, founder_price_until").eq("restaurant_id", data.restaurantId).maybeSingle();
    const { data: oldLimit } = await db.rpc("restaurant_table_limit", { p_rid: data.restaurantId });
    const founderUntil = data.founderPrice ? (before?.founder_price && before.founder_price_until ? before.founder_price_until : new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)) : null;
    const row = { restaurant_id: data.restaurantId, plan: data.plan, custom_table_limit: data.customLimit, founder_price: data.founderPrice, founder_price_until: founderUntil, billing_period: data.billing, status: data.status };
    const { error } = await db.from("restaurant_subscriptions").upsert(row, { onConflict: "restaurant_id" });
    if (error) throw new Error("Não foi possível salvar o plano do restaurante");
    const { data: newLimit } = await db.rpc("restaurant_table_limit", { p_rid: data.restaurantId });
    await db.from("plan_changes").insert({ restaurant_id: data.restaurantId, actor_id: context.userId, old_plan: before?.plan ?? null, new_plan: data.plan, old_limit: oldLimit ?? null, new_limit: newLimit ?? null, detail: `status=${data.status} periodicidade=${data.billing} fundador=${data.founderPrice}` });
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "plan_changed", resource: `restaurante:${data.restaurantId}`, restaurantId: data.restaurantId, actorId: context.userId, detail: `${before?.plan ?? "-"} -> ${data.plan}, limite ${oldLimit} -> ${newLimit}` });
    return { ok: true, limit: Number(newLimit ?? 0) };
  });
