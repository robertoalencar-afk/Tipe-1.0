import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Cardápio digital: o cliente vê o cardápio e pede pela própria mesa. O pedido
// cai no mesmo table_bill_items / KDS / conta do QR. Público (sem login): o
// pedido é autorizado pela sessão da mesa e pela opção ligada no restaurante.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export type PublicMenu = {
  selfOrder: boolean;
  categories: { id: string; name: string }[];
  items: { id: string; categoryId: string | null; code: string; name: string; price: number; description: string | null }[];
};

/** Cardápio público do restaurante para o cliente. Só itens disponíveis; nada sensível. */
export const getPublicMenu = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data }): Promise<PublicMenu | { error: "not_found" }> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`menu:${data.slug}:${clientIp()}`, 60, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, self_order_enabled").eq("slug", data.slug).maybeSingle();
    if (!r) return { error: "not_found" };
    const [cats, items] = await Promise.all([
      supabaseAdmin.from("pdv_menu_categories").select("id, name, position").eq("restaurant_id", r.id).order("position"),
      supabaseAdmin.from("pdv_menu_items").select("id, category_id, code, name, price, available, position, description").eq("restaurant_id", r.id).eq("available", true).order("position"),
    ]);
    return {
      selfOrder: (r as { self_order_enabled?: boolean }).self_order_enabled ?? false,
      categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
      items: (items.data ?? []).map((i) => ({ id: i.id, categoryId: i.category_id, code: i.code, name: i.name, price: Number(i.price), description: i.description })),
    };
  });

/**
 * Cliente lança pedido na própria mesa. Autoriza pela sessão da mesa (mesma do
 * QR), limita a taxa e chama a RPC service_role. Idempotente por requestId.
 */
export const placeCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    slug: Slug,
    code: z.string().min(1).max(32),
    session: z.string().min(1).max(96),
    requestId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    customer: z.string().trim().max(40).optional(),
    items: z.array(z.object({ code: z.string().min(1).max(16), qty: z.number().int().min(1).max(99), notes: z.string().max(140).optional() })).min(1).max(60),
  }).parse(d))
  .handler(async ({ data }): Promise<{ items: number; total: number } | { error: "invalid" | "disabled" | "unavailable" | "failed" }> => {
    const { enforceRate, clientIp, safeEqual, logSecurityEvent } = await import("./security.server");
    await enforceRate(`order:${data.slug}:${data.code}:${clientIp()}`, 20, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, self_order_enabled").eq("slug", data.slug).maybeSingle();
    if (!r) return { error: "invalid" };
    if (!(r as { self_order_enabled?: boolean }).self_order_enabled) return { error: "disabled" };
    // Autoriza pela sessão da conta ativa da mesa (igual ao pagamento do QR).
    const { data: t } = await supabaseAdmin.from("restaurant_tables").select("number, active, session_token" as never).eq("restaurant_id", r.id).eq("code", data.code.toLowerCase()).maybeSingle() as unknown as { data: { number: string; active: boolean; session_token: string } | null };
    if (!t || !t.active || !safeEqual(t.session_token, data.session)) {
      await logSecurityEvent({ action: "customer_order_denied", resource: `mesa:${data.code}`, result: "denied", restaurantSlug: data.slug, restaurantId: r.id, detail: `ip=${clientIp()}` });
      return { error: "invalid" };
    }
    const { data: res, error } = await supabaseAdmin.rpc("pdv_customer_order", {
      p_slug: data.slug, p_table: t.number, p_items: data.items, p_customer: data.customer ?? "", p_request_id: data.requestId,
    });
    if (error) {
      if (error.message.includes("desativado")) return { error: "disabled" };
      if (error.message.includes("indisponível") || error.message.includes("Mesa inativa")) return { error: "unavailable" };
      return { error: "failed" };
    }
    const out = res as { items: number; total: number };
    return { items: Number(out.items), total: Number(out.total) };
  });
