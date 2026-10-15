import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Totem de autoatendimento. O cliente monta o pedido no totem e recebe uma
// senha; o pedido fica aguardando pagamento e só vai para a cozinha quando o
// caixa cobra. Dinheiro só se move com a equipe. Reusa a senha e o KDS do balcão.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

/** Confere o token do dispositivo do totem. Retorna o restaurante ou null. */
async function totemAuth(slug: string, token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { safeEqual } = await import("./security.server");
  const { data: r } = await supabaseAdmin.from("restaurants").select("id, name, totem_enabled").eq("slug", slug).maybeSingle();
  if (!r) return null;
  const { data: tok } = await supabaseAdmin.from("totem_tokens").select("token").eq("restaurant_id", r.id).maybeSingle();
  if (!tok || !safeEqual(tok.token, token)) return null;
  return { db: supabaseAdmin, r: r as { id: string; name: string; totem_enabled: boolean } };
}

export type TotemContext = {
  restaurantName: string;
  enabled: boolean;
  categories: { id: string; name: string }[];
  items: { id: string; categoryId: string | null; code: string; name: string; price: number; description: string | null }[];
};

/** Cardápio do totem (tela do dispositivo). Autorizado pelo token do totem. */
export const getTotemContext = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, token: z.string().min(16).max(64) }).parse(d))
  .handler(async ({ data }): Promise<TotemContext | { error: "invalid_token" }> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`totem:${data.slug}:${clientIp()}`, 120, 60, data.slug);
    const auth = await totemAuth(data.slug, data.token);
    if (!auth) return { error: "invalid_token" };
    const [cats, items] = await Promise.all([
      auth.db.from("pdv_menu_categories").select("id, name, position").eq("restaurant_id", auth.r.id).order("position"),
      auth.db.from("pdv_menu_items").select("id, category_id, code, name, price, available, position, description").eq("restaurant_id", auth.r.id).eq("available", true).order("position"),
    ]);
    return {
      restaurantName: auth.r.name,
      enabled: auth.r.totem_enabled,
      categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
      items: (items.data ?? []).map((i) => ({ id: i.id, categoryId: i.category_id, code: i.code, name: i.name, price: Number(i.price), description: i.description })),
    };
  });

/** Pedido do totem: gera a senha e deixa o pedido aguardando pagamento no caixa. */
export const placeTotemOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    slug: Slug,
    token: z.string().min(16).max(64),
    requestId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    customer: z.string().trim().max(40).optional(),
    items: z.array(z.object({ code: z.string().min(1).max(16), qty: z.number().int().min(1).max(99), notes: z.string().max(140).optional() })).min(1).max(60),
  }).parse(d))
  .handler(async ({ data }): Promise<{ ticket: number; total: number } | { error: "invalid_token" | "disabled" | "failed" }> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`totem-order:${data.slug}:${clientIp()}`, 40, 60, data.slug);
    const auth = await totemAuth(data.slug, data.token);
    if (!auth) return { error: "invalid_token" };
    if (!auth.r.totem_enabled) return { error: "disabled" };
    const { data: res, error } = await auth.db.rpc("pdv_totem_order", {
      p_slug: data.slug, p_items: data.items, p_customer: data.customer ?? "", p_request_id: data.requestId,
    });
    if (error) {
      if (error.message.includes("desativado")) return { error: "disabled" };
      return { error: "failed" };
    }
    const out = res as { ticket: number; total: number };
    return { ticket: Number(out.ticket), total: Number(out.total) };
  });

/** Dono ou caixa gera/troca o link do totem. */
export const getTotemToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, rotate: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: token, error } = await context.supabase.rpc("pdv_totem_token", { p_slug: data.slug, p_rotate: data.rotate ?? false });
    if (error) throw new Error("Somente dono ou caixa configuram o totem");
    return { token: String(token) };
  });

/** Caixa cobra um pedido do totem: libera os itens para a cozinha e amarra ao caixa. */
export const settleTotemOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(),
    method: z.enum(["cash", "card", "pix"]),
    cashReceived: z.number().min(0).max(100000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("pdv_settle_totem_order", {
      p_order: data.orderId, p_method: data.method, p_cash_received: data.method === "cash" ? (data.cashReceived ?? 0) : null as unknown as number,
    });
    if (error) {
      for (const k of ["Sem permissão", "Abra o caixa", "já cobrado", "cancelado", "Forma de pagamento", "Valor recebido", "não é do totem"]) {
        if (error.message.includes(k)) throw new Error(error.message);
      }
      throw new Error("Não foi possível cobrar o pedido");
    }
    const r = res as { ticket: number; total: number; change: number | null };
    return { ticket: Number(r.ticket), total: Number(r.total), change: r.change === null ? null : Number(r.change) };
  });
