import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ciclo único do pedido (paridade com o Colibri): venda no balcão com senha,
// KDS por pedido e painel de senhas. Toda regra roda nas RPCs pdv_* do banco.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

const friendly = (msg: string, fallback: string) => {
  for (const k of [
    "Sem permissão", "Abra o caixa", "Forma de pagamento", "Pedido vazio", "Item indisponível", "Quantidade",
    "Valor recebido", "Pedido cancelado", "Pedido já cancelado", "caixa desta venda", "Informe o motivo",
    "Pedidos de mesa", "A senha só pode", "Status inválido", "Setor inválido",
  ]) if (msg.includes(k)) return msg;
  return fallback;
};

export const PAY_METHODS = ["cash", "card", "pix"] as const;
export type CounterPayMethod = (typeof PAY_METHODS)[number];

/** Venda no balcão: cobra no caixa aberto, gera a senha do dia e envia para a cozinha. */
export const counterSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug,
    requestId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    customer: z.string().trim().max(40).optional(),
    method: z.enum(PAY_METHODS),
    cashReceived: z.number().min(0).max(100000).optional(),
    items: z.array(z.object({ code: z.string().min(1).max(16), qty: z.number().int().min(1).max(99), notes: z.string().max(140).optional() })).min(1).max(60),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("pdv_counter_sale", {
      p_slug: data.slug, p_items: data.items, p_customer: data.customer ?? "", p_method: data.method,
      p_cash_received: data.method === "cash" ? (data.cashReceived ?? 0) : null as unknown as number, p_request_id: data.requestId,
    });
    if (error) throw new Error(friendly(error.message, "Não foi possível concluir a venda"));
    const r = res as { order_id: string; ticket: number; total: number; change: number | null };
    return { orderId: r.order_id, ticket: Number(r.ticket), total: Number(r.total), change: r.change === null ? null : Number(r.change) };
  });

export const cancelCounterSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(3).max(140) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_counter_cancel", { p_order: data.orderId, p_reason: data.reason });
    if (error) throw new Error(friendly(error.message, "Não foi possível cancelar a venda"));
    return { ok: true };
  });

/** KDS por pedido: move todos os itens do pedido (ou só os do setor da tela). */
export const bumpOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(),
    status: z.enum(["received", "preparing", "ready", "delivered"]),
    sector: z.enum(["kitchen", "bar"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_order_bump", { p_order: data.orderId, p_status: data.status, ...(data.sector ? { p_sector: data.sector } : {}) });
    if (error) throw new Error(friendly(error.message, "Não foi possível atualizar o pedido"));
    return { ok: true };
  });

/** Chama a senha de novo no painel. */
export const callTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_order_call", { p_order: data.orderId });
    if (error) throw new Error(friendly(error.message, "Não foi possível chamar a senha"));
    return { ok: true };
  });

/** Token do painel de senhas (dono ou caixa). rotate=true desconecta as TVs atuais. */
export const getDisplayToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, rotate: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: token, error } = await context.supabase.rpc("pdv_display_token", { p_slug: data.slug, p_rotate: data.rotate ?? false });
    if (error) throw new Error(friendly(error.message, "Somente dono ou caixa configuram o painel de senhas"));
    return { token: String(token) };
  });

export type TicketBoard = {
  restaurantName: string;
  preparing: { id: string; ticket: number; name: string | null }[];
  ready: { id: string; ticket: number; name: string | null; calledAt: string }[];
  serverTime: string;
};

/**
 * Painel de senhas público (TV na loja). Sem login: autoriza pelo token do dispositivo
 * e devolve só senha, primeiro nome e status. Nada de valores, itens ou equipe.
 */
export const getTicketBoard = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, token: z.string().min(16).max(64) }).parse(d))
  .handler(async ({ data }): Promise<TicketBoard | { error: "not_found" | "invalid_token" }> => {
    const { enforceRate, clientIp, safeEqual, logSecurityEvent } = await import("./security.server");
    await enforceRate(`senhas:${data.slug}:${clientIp()}`, 120, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, name").eq("slug", data.slug).maybeSingle();
    if (!r) return { error: "not_found" };
    const { data: tok } = await supabaseAdmin.from("order_display_tokens").select("token").eq("restaurant_id", r.id).maybeSingle();
    if (!tok || !safeEqual(tok.token, data.token)) {
      await logSecurityEvent({ action: "display_token_denied", resource: "painel_senhas", result: "denied", restaurantSlug: data.slug, restaurantId: r.id, detail: `ip=${clientIp()}` });
      return { error: "invalid_token" };
    }
    const { data: day } = await supabaseAdmin.rpc("pdv_service_day");
    const { data: rows, error } = await supabaseAdmin.from("pdv_orders")
      .select("id, ticket_number, customer_name, called_at, created_at")
      .eq("restaurant_id", r.id).eq("service_day", String(day)).not("ticket_number", "is", null)
      .is("cancelled_at", null).is("picked_up_at", null)
      .order("created_at", { ascending: true }).limit(80);
    if (error) throw new Error("Não foi possível atualizar o painel");
    const first = (n: string | null) => (n ? n.trim().split(/\s+/)[0]!.slice(0, 16) : null);
    const list = rows ?? [];
    return {
      restaurantName: r.name,
      preparing: list.filter((o) => !o.called_at).map((o) => ({ id: o.id, ticket: o.ticket_number!, name: first(o.customer_name) })),
      // Pronto há mais de 45 min e não marcado como retirado: some da TV para não acumular.
      ready: list.filter((o) => !!o.called_at && Date.now() - new Date(o.called_at).getTime() < 45 * 60000)
        .sort((a, b) => b.called_at!.localeCompare(a.called_at!))
        .slice(0, 12)
        .map((o) => ({ id: o.id, ticket: o.ticket_number!, name: first(o.customer_name), calledAt: o.called_at! })),
      serverTime: new Date().toISOString(),
    };
  });
