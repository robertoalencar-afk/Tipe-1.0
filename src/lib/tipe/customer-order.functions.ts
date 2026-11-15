import { readMenuPosts, type MenuPost } from "./menu-posts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  MenuLinksSchema,
  publishedMenuLanguages,
  readMenuConfig,
  type MenuLanguage,
  type MenuConfig,
} from "./menu-intelligence";

// Cardápio digital: o cliente vê o cardápio e pede pela própria mesa. O pedido
// cai no mesmo table_bill_items / KDS / conta do QR. Público (sem login): o
// pedido é autorizado pela sessão da mesa e pela opção ligada no restaurante.

const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

export type PublicMenu = {
  posts?: MenuPost[];
  languages?: MenuLanguage[];
  selfOrder: boolean;
  restaurantName: string;
  logoUrl: string | null;
  links?: { instagram: string; reviews: string };
  categories: { id: string; name: string }[];
  items: {
    id: string;
    categoryId: string | null;
    code: string;
    name: string;
    price: number;
    description: string | null;
    imageUrl: string | null;
    depthUrl: string | null;
    modelUrl: string | null;
    badge: string | null;
    allergens: string[];
    config?: MenuConfig;
  }[];
};

/** Cardápio público do restaurante para o cliente. Só itens disponíveis; nada sensível. */
export const getPublicMenu = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data }): Promise<PublicMenu | { error: "not_found" }> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`menu:${data.slug}:${clientIp()}`, 60, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, self_order_enabled")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!r) return { error: "not_found" };
    // Cardápio de pedido só com o módulo Order ativo (a checagem que vale é a do pedido, no banco).
    const { data: hasOrder } = await supabaseAdmin.rpc("restaurant_has_module", {
      p_rid: r.id,
      p_module: "order",
    });
    const [cats, items] = await Promise.all([
      supabaseAdmin
        .from("pdv_menu_categories")
        .select("id, name, position")
        .eq("restaurant_id", r.id)
        .order("position"),
      supabaseAdmin
        .from("pdv_menu_items")
        .select(
          "id, category_id, code, name, price, available, position, description, image_url, depth_url, model_url, badge, allergens",
        )
        .eq("restaurant_id", r.id)
        .eq("available", true)
        .order("position"),
    ]);
    const { data: logoRow } = await supabaseAdmin
      .from("restaurants")
      .select("logo_url")
      .eq("id", r.id)
      .maybeSingle();
    if (cats.error || items.error) throw new Error("Não foi possível carregar o cardápio");
    // Separate reads preserve the menu while migration 0061 is rolling out.
    const db = supabaseAdmin as SupabaseClient;
    const [editorial, social, assistant] = await Promise.all([
      db
        .from("pdv_menu_items")
        .select("id,name,description,menu_config")
        .eq("restaurant_id", r.id)
        .eq("available", true),
      db.from("restaurants").select("menu_links,menu_posts").eq("id", r.id).maybeSingle(),
      db
        .from("menu_assistant")
        .select("auto_translate,languages")
        .eq("restaurant_id", r.id)
        .maybeSingle(),
    ]);
    const configs = new Map<string, unknown>(
      (editorial.data ?? []).map((i: { id: string; menu_config: unknown }) => [
        i.id,
        i.menu_config,
      ]),
    );
    const links = MenuLinksSchema.safeParse(social.data?.menu_links ?? {});
    return {
      posts: readMenuPosts(social.data?.menu_posts).filter((p) => p.enabled),
      languages: publishedMenuLanguages(assistant.data, editorial.data ?? []),
      links: links.success ? links.data : { instagram: "", reviews: "" },
      logoUrl: (logoRow as { logo_url?: string | null } | null)?.logo_url ?? null,
      restaurantName: (r as { name?: string }).name ?? "",
      selfOrder:
        hasOrder === true && ((r as { self_order_enabled?: boolean }).self_order_enabled ?? false),
      categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
      items: (items.data ?? []).map((i) => ({
        id: i.id,
        categoryId: i.category_id,
        code: i.code,
        name: i.name,
        price: Number(i.price),
        description: i.description,
        imageUrl: i.image_url ?? null,
        depthUrl: i.depth_url ?? null,
        modelUrl: i.model_url ?? null,
        badge: i.badge ?? null,
        allergens: i.allergens ?? [],
        config: readMenuConfig(configs.get(i.id)),
      })),
    };
  });

/**
 * Cliente lança pedido na própria mesa. Autoriza pela sessão da mesa (mesma do
 * QR), limita a taxa e chama a RPC service_role. Idempotente por requestId.
 */
export const placeCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        code: z.string().min(1).max(32),
        session: z.string().min(1).max(96),
        requestId: z
          .string()
          .min(8)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
        customer: z.string().trim().max(40).optional(),
        /** Token deste celular no modo código curto (claimTableOrdering). */
        device: z
          .string()
          .regex(/^[0-9a-f]{48}$/)
          .optional(),
        items: z
          .array(
            z.object({
              code: z.string().min(1).max(16),
              qty: z.number().int().min(1).max(99),
              notes: z.string().max(140).optional(),
              sides: z.array(z.string().min(1).max(16)).max(4).optional(),
            }),
          )
          .min(1)
          .max(60),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { items: number; total: number; reviewId?: string; reviewState?: string }
      | { error: "invalid" | "disabled" | "closed" | "code" | "unavailable" | "choices" | "failed" }
    > => {
      const { enforceRate, clientIp, safeEqual, logSecurityEvent } =
        await import("./security.server");
      // Por IP (vários celulares na mesma rede) e por conta da mesa (vários IPs na mesma conta).
      await enforceRate(`order:${data.slug}:${data.code}:${clientIp()}`, 20, 60, data.slug);
      await enforceRate(
        `order-session:${data.slug}:${data.session.slice(0, 16)}`,
        30,
        300,
        data.slug,
      );
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: r } = await supabaseAdmin
        .from("restaurants")
        .select("id, self_order_enabled")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!r) return { error: "invalid" };
      // Módulo, opção e liberação da mesa são checados na RPC (fonte da verdade); aqui só a sessão da conta.
      // Autoriza pela sessão da conta ativa da mesa (igual ao pagamento do QR).
      const { data: t } = (await supabaseAdmin
        .from("restaurant_tables")
        .select("number, active, session_token" as never)
        .eq("restaurant_id", r.id)
        .eq("code", data.code.toLowerCase())
        .maybeSingle()) as unknown as {
        data: { number: string; active: boolean; session_token: string } | null;
      };
      if (!t || !t.active || !safeEqual(t.session_token, data.session)) {
        await logSecurityEvent({
          action: "customer_order_denied",
          resource: `mesa:${data.code}`,
          result: "denied",
          restaurantSlug: data.slug,
          restaurantId: r.id,
          detail: `ip=${clientIp()}`,
        });
        return { error: "invalid" };
      }
      const { data: res, error } = await supabaseAdmin.rpc(
        "pdv_customer_order" as never,
        {
          p_bill_session: data.session,
          p_slug: data.slug,
          p_table: t.number,
          p_items: data.items,
          p_customer: data.customer ?? "",
          p_request_id: data.requestId,
          p_device: data.device ?? null,
        } as never,
      );
      if (error) {
        if (/acompanhamento/i.test(error.message)) return { error: "choices" };
        if (error.message.includes("desativado")) return { error: "disabled" };
        if (error.message.includes("não estão liberados")) return { error: "closed" };
        if (error.message.includes("Código da mesa")) return { error: "code" };
        if (error.message.includes("indisponível") || error.message.includes("Mesa inativa"))
          return { error: "unavailable" };
        return { error: "failed" };
      }
      const out = res as {
        items: number;
        total: number;
        review_id?: string;
        review_state?: string;
        duplicate?: boolean;
      };
      if (out.review_id && out.review_state === "pending" && !out.duplicate) {
        const { avisarConferenciaPedido } = await import("./avisos-equipe.server");
        const { data: mesa } = await supabaseAdmin
          .from("restaurant_tables")
          .select("waiter_id")
          .eq("restaurant_id", r.id)
          .eq("number", t.number)
          .maybeSingle();
        await avisarConferenciaPedido(
          supabaseAdmin,
          r.id,
          mesa?.waiter_id ?? null,
          data.slug,
          t.number,
          out.review_id,
          out.items,
        );
      }
      return {
        items: Number(out.items),
        total: Number(out.total),
        ...(out.review_id ? { reviewId: out.review_id, reviewState: out.review_state } : {}),
      };
    },
  );

/** Consulta só o resultado do próprio envio; não expõe pedidos de outros clientes. */
export const getCustomerOrderReview = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        code: z.string().min(1).max(32),
        session: z.string().min(1).max(96),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ state: string }> => {
    const { enforceRate, clientIp, safeEqual } = await import("./security.server");
    await enforceRate(`order-review:${data.slug}:${clientIp()}`, 120, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!r) return { state: "expired" };
    const { data: t } = (await supabaseAdmin
      .from("restaurant_tables")
      .select("number,active,session_token" as never)
      .eq("restaurant_id", r.id)
      .eq("code", data.code.toLowerCase())
      .maybeSingle()) as unknown as {
      data: { number: string; active: boolean; session_token: string } | null;
    };
    if (!t?.active || !safeEqual(t.session_token, data.session)) return { state: "expired" };
    const { data: review, error } = (await supabaseAdmin
      .from("customer_order_reviews" as never)
      .select("state,created_at")
      .eq("id", data.id)
      .eq("restaurant_id", r.id)
      .eq("table_number", t.number)
      .eq("bill_session", data.session)
      .maybeSingle()) as unknown as {
      data: { state: string; created_at: string } | null;
      error: unknown;
    };
    if (error) throw new Error("Não foi possível consultar o pedido");
    return {
      state:
        !review ||
        (review.state === "pending" &&
          Date.now() - new Date(review.created_at).getTime() > 30 * 60 * 1000)
          ? "expired"
          : review.state,
    };
  });
