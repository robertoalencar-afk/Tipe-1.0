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

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: r } = await sb.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const { data: s } = await sb.from("restaurant_subscriptions" as never).select("plan, status, trial_ends_at, current_period_end").eq("restaurant_id", r.id).maybeSingle();
    return (s as { plan: string; status: string; trial_ends_at: string; current_period_end: string | null } | null);
  });

// Assinatura mensal no cartão via Pagar.me. O cartão é tokenizado no navegador.
export const startSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, cardToken: z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { pagarmeEnabled, pagarme } = await import("./pagarme.server");
    if (!pagarmeEnabled()) return { ok: false as const, message: "A cobrança mensal será liberada em breve. Seu teste grátis continua ativo." };
    if (!data.cardToken) return { ok: false as const, message: "Informe o cartão para ativar a assinatura." };
    const sb = context.supabase;
    const { data: r } = await sb.from("restaurants").select("id, name, cnpj").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const { data: ok } = await sb.rpc("has_restaurant_role" as never, { _user_id: context.userId, _restaurant_id: r.id, _roles: ["owner"] } as never);
    if (!ok) throw new Error("Somente o dono pode ativar a assinatura");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("restaurant_subscriptions").select("plan, status, trial_ends_at, provider_subscription_id").eq("restaurant_id", r.id).maybeSingle();
    if (!s) throw new Error("Assinatura não encontrada");
    if (s.provider_subscription_id && s.status === "active") return { ok: true as const, message: "Assinatura já ativa" };
    const { planById } = await import("./plans");
    const plan = planById(s.plan);
    if (!plan) throw new Error("Plano personalizado: fale com a equipe TIPE");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const trialEnd = new Date(s.trial_ends_at);
    const sub = await pagarme<{ id: string; status: string; customer?: { id: string } }>("/subscriptions", {
      method: "POST",
      idempotencyKey: `sub_${r.id}`,
      body: {
        payment_method: "credit_card", interval: "month", interval_count: 1, billing_type: "prepaid", installments: 1,
        ...(trialEnd > new Date() ? { start_at: trialEnd.toISOString() } : {}),
        statement_descriptor: "TIPE",
        card_token: data.cardToken,
        customer: { name: r.name, email: u.user?.email, document: r.cnpj, type: "company" },
        items: [{ description: `TIPE ${plan.name}`, quantity: 1, pricing_scheme: { scheme_type: "Unit", price: Math.round(plan.price * 100) } }],
        metadata: { restaurant_id: r.id },
      },
    });
    await supabaseAdmin.from("restaurant_subscriptions").update({
      provider: "pagarme", provider_subscription_id: sub.id, provider_customer_id: sub.customer?.id ?? null,
      status: trialEnd > new Date() ? "trialing" : "active",
    }).eq("restaurant_id", r.id);
    return { ok: true as const, message: trialEnd > new Date() ? "Cartão cadastrado. A primeira cobrança acontece ao fim do teste grátis." : "Assinatura ativada" };
  });

export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("finish_onboarding" as never, { p_slug: data.slug } as never);
    if (error) throw new Error("Somente o dono pode concluir a integração");
    return { ok: true };
  });
