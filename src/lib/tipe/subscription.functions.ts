import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(2).max(64).regex(/^[a-z0-9-]+$/);

export const signupRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().trim().min(2).max(80),
    slug: Slug,
    plan: z.enum(["essencial", "profissional", "premium"]),
    tables: z.number().int().min(1).max(500),
    displayName: z.string().trim().min(2).max(80),
    cnpj: z.string().regex(/^\d{14}$/),
    address: z.string().trim().min(8).max(160),
    phone: z.string().trim().max(30),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: slug, error } = await context.supabase.rpc("signup_restaurant" as never, {
      p_name: data.name, p_slug: data.slug, p_plan: data.plan, p_tables: data.tables, p_display_name: data.displayName, p_cnpj: data.cnpj, p_address: data.address, p_phone: data.phone,
    } as never);
    if (error) {
      const m = error.message;
      for (const k of ["Já existe", "Escolha outro", "Quantidade de mesas", "Limite de restaurantes", "Plano inválido", "CNPJ", "endereço completo"]) if (m.includes(k)) throw new Error(m);
      throw new Error("Não foi possível cadastrar o restaurante");
    }
    return { slug: slug as unknown as string };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente do Supabase do usuário; tipos de RPC novos vêm de types.ts
type Sb = { from: (t: string) => any; rpc: (f: string, a: unknown) => any };

async function restaurantBySlug(sb: Sb, slug: string) {
  const { data: r } = await sb.from("restaurants").select("id, name, cnpj").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  return r as { id: string; name: string; cnpj: string | null };
}

async function requireOwner(sb: Sb, userId: string, rid: string) {
  const { data: ok } = await sb.rpc("has_restaurant_role", { _user_id: userId, _restaurant_id: rid, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o dono pode mudar a assinatura");
}

/** Estado de acesso da conta (liberada, carência ou bloqueada). Qualquer membro lê. */
export const getAccountAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const r = await restaurantBySlug(sb, data.slug);
    const { data: a, error } = await sb.rpc("my_restaurant_access", { p_rid: r.id });
    if (error) throw new Error("Não foi possível ler a assinatura");
    const { parseAccess } = await import("./assinatura");
    return parseAccess(a);
  });

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const r = await restaurantBySlug(sb, data.slug);
    const { data: s } = await sb.from("restaurant_subscriptions").select("plan, status, trial_ends_at, current_period_end, provider_subscription_id, founder_price, canceled_at, exempt").eq("restaurant_id", r.id).maybeSingle();
    if (!s) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: a }, { data: cat }] = await Promise.all([
      supabaseAdmin.rpc("restaurant_access", { p_rid: r.id }),
      supabaseAdmin.from("plan_catalog").select("id, name, max_tables, founder_price, full_price, included_modules").order("position"),
    ]);
    const { parseAccess } = await import("./assinatura");
    const sub = s as { plan: string; status: string; trial_ends_at: string; current_period_end: string | null; provider_subscription_id: string | null; founder_price: boolean; canceled_at: string | null; exempt: boolean };
    return {
      plan: sub.plan, status: sub.status, trial_ends_at: sub.trial_ends_at, current_period_end: sub.current_period_end,
      canceled_at: sub.canceled_at, exempt: sub.exempt, founderPrice: sub.founder_price, hasCard: !!sub.provider_subscription_id,
      access: parseAccess(a),
      catalog: (cat ?? []).filter((c) => c.id !== "personalizado").map((c) => ({
        id: c.id, name: c.name, maxTables: c.max_tables, modules: c.included_modules ?? [],
        price: sub.founder_price ? (c.founder_price === null ? null : Number(c.founder_price)) : (c.full_price === null ? null : Number(c.full_price)),
      })),
    };
  });

/** Dono escolhe o plano enquanto ainda não há cobrança recorrente no cartão. */
export const chooseSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, plan: z.enum(["essencial", "profissional", "premium"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const r = await restaurantBySlug(sb, data.slug);
    await requireOwner(sb, context.userId, r.id);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: s } = await db.from("restaurant_subscriptions").select("plan, status, provider_subscription_id, custom_table_limit").eq("restaurant_id", r.id).maybeSingle();
    if (!s) throw new Error("Assinatura não encontrada");
    if (s.plan === "personalizado" || s.custom_table_limit !== null) throw new Error("Seu plano tem condições próprias: fale com a equipe TIPE para mudar");
    if (s.provider_subscription_id && ["active", "past_due"].includes(s.status)) throw new Error("Com a cobrança mensal ativa, a mudança de plano é feita pela equipe TIPE");
    if (s.plan === data.plan) return { ok: true as const };
    const { data: oldLimit } = await db.rpc("restaurant_table_limit", { p_rid: r.id });
    const { error } = await db.from("restaurant_subscriptions").update({ plan: data.plan }).eq("restaurant_id", r.id);
    if (error) throw new Error("Não foi possível mudar o plano");
    const { data: newLimit } = await db.rpc("restaurant_table_limit", { p_rid: r.id });
    await db.from("plan_changes").insert({ restaurant_id: r.id, actor_id: context.userId, old_plan: s.plan, new_plan: data.plan, old_limit: oldLimit ?? null, new_limit: newLimit ?? null, detail: "escolhido pelo dono no painel" });
    return { ok: true as const };
  });

// Assinatura mensal no cartão via Pagar.me. O cartão é tokenizado no navegador.
// Também reativa conta cancelada ou troca o cartão de uma assinatura em atraso.
export const startSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, cardToken: z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { pagarmeEnabled, pagarme } = await import("./pagarme.server");
    if (!pagarmeEnabled()) return { ok: false as const, message: "A cobrança mensal será liberada em breve. Fale com a equipe TIPE para manter a conta ativa." };
    if (!data.cardToken) return { ok: false as const, message: "Informe o cartão para ativar a assinatura." };
    const sb = context.supabase as unknown as Sb;
    const r = await restaurantBySlug(sb, data.slug);
    await requireOwner(sb, context.userId, r.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("restaurant_subscriptions").select("plan, status, trial_ends_at, provider_subscription_id, founder_price").eq("restaurant_id", r.id).maybeSingle();
    if (!s) throw new Error("Assinatura não encontrada");
    if (s.provider_subscription_id && s.status === "active") return { ok: true as const, message: "Assinatura já ativa" };
    // Atraso: troca o cartão da mesma assinatura; o Pagar.me tenta de novo.
    if (s.provider_subscription_id && s.status === "past_due") {
      await pagarme(`/subscriptions/${s.provider_subscription_id}/card`, { method: "PATCH", body: { card_token: data.cardToken } });
      return { ok: true as const, message: "Cartão atualizado. Assim que a cobrança for aprovada, o aviso some." };
    }
    const { data: c } = await supabaseAdmin.from("plan_catalog").select("name, founder_price, full_price").eq("id", s.plan).maybeSingle();
    const price = c ? Number(s.founder_price ? c.founder_price : c.full_price) : NaN;
    if (!c || !Number.isFinite(price) || price <= 0) throw new Error("Plano personalizado: fale com a equipe TIPE");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const trialEnd = new Date(s.trial_ends_at);
    const emTeste = s.status === "trialing" && trialEnd > new Date();
    const sub = await pagarme<{ id: string; status: string; customer?: { id: string } }>("/subscriptions", {
      method: "POST",
      // Uma chave por tentativa de assinatura: reativar depois de cancelar cria outra.
      idempotencyKey: `sub_${r.id}_${s.provider_subscription_id ?? "novo"}`,
      body: {
        payment_method: "credit_card", interval: "month", interval_count: 1, billing_type: "prepaid", installments: 1,
        ...(emTeste ? { start_at: trialEnd.toISOString() } : {}),
        statement_descriptor: "TIPE",
        card_token: data.cardToken,
        customer: { name: r.name, email: u.user?.email, document: r.cnpj, type: "company" },
        items: [{ description: `TIPE ${c.name}`, quantity: 1, pricing_scheme: { scheme_type: "Unit", price: Math.round(price * 100) } }],
        metadata: { restaurant_id: r.id },
      },
    });
    // O status final vem só do webhook (fatura paga, reconsultada na API). O
    // fim do teste não é adiado: cartão recusado não ganha dias extras.
    await supabaseAdmin.from("restaurant_subscriptions").update({
      provider: "pagarme", provider_subscription_id: sub.id, provider_customer_id: sub.customer?.id ?? null, status: "trialing",
    }).eq("restaurant_id", r.id);
    return { ok: true as const, message: emTeste ? "Cartão cadastrado. A primeira cobrança acontece ao fim do teste grátis." : "Cartão cadastrado. A conta volta a funcionar assim que a cobrança for aprovada, em geral em poucos minutos." };
  });

/** Cancelamento pelo próprio dono, no painel (sem precisar falar com ninguém). */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, confirm: z.string(), reason: z.string().trim().min(2).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.confirm.trim().toUpperCase() !== "CANCELAR") throw new Error("Digite CANCELAR para confirmar");
    const sb = context.supabase as unknown as Sb;
    const r = await restaurantBySlug(sb, data.slug);
    await requireOwner(sb, context.userId, r.id);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: s } = await db.from("restaurant_subscriptions").select("status, provider_subscription_id, current_period_end, trial_ends_at").eq("restaurant_id", r.id).maybeSingle();
    if (!s) throw new Error("Assinatura não encontrada");
    if (s.status === "canceled") return { ok: true as const, until: s.current_period_end };
    if (s.provider_subscription_id) {
      const { pagarmeEnabled, pagarme } = await import("./pagarme.server");
      if (!pagarmeEnabled()) throw new Error("Não foi possível cancelar agora. Tente de novo em instantes ou fale com a equipe TIPE.");
      // Cancela a recorrência sem gerar nova cobrança; o período pago continua valendo.
      await pagarme(`/subscriptions/${s.provider_subscription_id}`, { method: "DELETE", body: { cancel_pending_invoices: true } });
    }
    // Quem cancela durante o teste usa até o fim do teste; quem pagou, até o fim do período pago.
    const until = s.current_period_end ?? (s.status === "trialing" && Date.parse(s.trial_ends_at) > Date.now() ? s.trial_ends_at : null);
    const { error } = await db.from("restaurant_subscriptions").update({ status: "canceled", cancel_reason: data.reason, current_period_end: until }).eq("restaurant_id", r.id);
    if (error) throw new Error("Não foi possível cancelar a assinatura");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "subscription_canceled", resource: `restaurante:${r.id}`, restaurantId: r.id, actorId: context.userId, detail: data.reason.slice(0, 120) });
    return { ok: true as const, until: until && Date.parse(until) > Date.now() ? until : null };
  });

export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("finish_onboarding" as never, { p_slug: data.slug } as never);
    if (error) throw new Error("Somente o dono pode concluir a integração");
    return { ok: true };
  });
