import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(2).max(64).regex(/^[a-z0-9-]+$/);

async function ownerRestaurant(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id, name").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o dono pode ver e alterar os recebimentos");
  return r as { id: string; name: string };
}

function webhookUrl(slug: string) {
  return `https://tipe.digital/api/public/pagarme/restaurante/${slug}`;
}

/** Situação da conta Pagar.me própria do restaurante. A chave nunca é devolvida. */
export const getPayoutAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await supabaseAdmin.from("restaurant_pagarme_accounts").select("key_prefix, key_mode, webhook_token, status, connected_at").eq("restaurant_id", r.id).maybeSingle();
    if (!a || a.status !== "active") return { connected: false as const };
    // Consulta separada: antes da migração 0031 a coluna não existe e a tela segue funcionando.
    const acc = await supabaseAdmin.from("restaurant_pagarme_accounts").select("account_id" as never).eq("restaurant_id", r.id).maybeSingle();
    return {
      connected: true as const,
      keyMasked: `${a.key_prefix}••••••••`,
      mode: a.key_mode as "live" | "test",
      connectedAt: a.connected_at,
      accountId: acc.error ? null : ((acc.data as { account_id?: string | null } | null)?.account_id ?? null),
      webhook: { url: webhookUrl(data.slug), user: "tipe", password: a.webhook_token },
    };
  });

export const connectPagarme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug,
    secretKey: z.string().trim().regex(/^sk_(test_)?[A-Za-z0-9]{16,80}$/, "Chave secreta inválida. Ela começa com sk_"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`pagarme-connect:${r.id}`, 10, 3600, data.slug);
    const { pagarme, encryptSecret } = await import("./pagarme.server");
    try {
      await pagarme("/orders?page=1&size=1", { secretKey: data.secretKey });
    } catch {
      await logSecurityEvent({ action: "pagarme_connect_failed", result: "error", restaurantId: r.id, actorId: context.userId });
      throw new Error("A Pagar.me não aceitou essa chave. Confira se copiou a chave secreta completa.");
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("restaurant_pagarme_accounts").upsert({
      restaurant_id: r.id,
      secret_key_enc: await encryptSecret(data.secretKey),
      key_prefix: data.secretKey.slice(0, data.secretKey.startsWith("sk_test_") ? 12 : 7),
      key_mode: data.secretKey.startsWith("sk_test_") ? "test" : "live",
      webhook_token: token,
      status: "active",
      connected_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Não foi possível salvar a conexão");
    await logSecurityEvent({ action: "pagarme_connected", resource: "restaurant_pagarme_accounts", restaurantId: r.id, actorId: context.userId });
    return { ok: true };
  });

// ID da conta Pagar.me (acc_...) usado pelo Google Pay; pode ser informado depois de conectar.
export const savePagarmeAccountId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, accountId: z.string().trim().regex(/^acc_[A-Za-z0-9]{8,40}$/, "ID da conta inválido. Ele começa com acc_") }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("restaurant_pagarme_accounts").update({ account_id: data.accountId, updated_at: new Date().toISOString() } as never)
      .eq("restaurant_id", r.id).eq("status", "active").select("restaurant_id").maybeSingle();
    if (error) throw new Error("Não foi possível salvar o ID da conta. Tente de novo em alguns minutos.");
    if (!row) throw new Error("Conecte a conta Pagar.me antes de informar o ID.");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "pagarme_account_id_saved", resource: "restaurant_pagarme_accounts", restaurantId: r.id, actorId: context.userId });
    return { ok: true };
  });

export const disconnectPagarme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("restaurant_pagarme_accounts").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("restaurant_id", r.id);
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "pagarme_disconnected", resource: "restaurant_pagarme_accounts", restaurantId: r.id, actorId: context.userId });
    return { ok: true };
  });
