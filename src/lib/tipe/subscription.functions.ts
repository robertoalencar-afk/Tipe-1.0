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

// Cobrança recorrente via Pagar.me: só fica ativa quando a chave do Pagar.me estiver configurada.
export const startSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async () => {
    if (!process.env["PAGARME_SECRET_KEY"]) {
      return { ok: false as const, message: "A cobrança mensal será liberada em breve. Seu teste grátis continua ativo." };
    }
    return { ok: false as const, message: "Integração de assinatura com o Pagar.me em configuração." };
  });

export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("finish_onboarding" as never, { p_slug: data.slug } as never);
    if (error) throw new Error("Somente o dono pode concluir a integração");
    return { ok: true };
  });
