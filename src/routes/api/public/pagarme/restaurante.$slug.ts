import { createFileRoute } from "@tanstack/react-router";

// Webhook da conta Pagar.me própria de cada restaurante.
// Autenticação básica: usuário "tipe" e senha = token exibido na aba Recebimentos.
// O corpo nunca é confiado: o pedido é reconsultado com a chave do restaurante.
export const Route = createFileRoute("/api/public/pagarme/restaurante/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!/^[a-z0-9-]{2,64}$/.test(params.slug)) return new Response("not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { safeEqual, logSecurityEvent } = await import("@/lib/tipe/security.server");
        const { data: rest } = await supabaseAdmin.from("restaurants").select("id").eq("slug", params.slug).maybeSingle();
        if (!rest) return new Response("not found", { status: 404 });
        const { data: acc } = await supabaseAdmin.from("restaurant_pagarme_accounts").select("secret_key_enc, webhook_token, status").eq("restaurant_id", rest.id).maybeSingle();
        if (!acc || acc.status !== "active") return new Response("not configured", { status: 503 });
        if (!safeEqual(request.headers.get("authorization") ?? "", `Basic ${btoa(`tipe:${acc.webhook_token}`)}`)) {
          await logSecurityEvent({ action: "pagarme_restaurant_webhook_denied", result: "denied", restaurantId: rest.id, restaurantSlug: params.slug });
          return new Response("unauthorized", { status: 401 });
        }
        let body: { type?: string; data?: { id?: string; order?: { id?: string } } };
        try { body = JSON.parse((await request.text()).slice(0, 200_000)); } catch { return new Response("bad request", { status: 400 }); }
        const type = String(body.type ?? "");
        if (!type.startsWith("order.") && !type.startsWith("charge.")) return new Response("ok");
        const orderId = type.startsWith("order.") ? body.data?.id : body.data?.order?.id;
        if (!orderId || !/^or_[A-Za-z0-9]+$/.test(orderId)) return new Response("ok");
        // Só liquida pedidos que pertencem a este restaurante.
        const { data: pay } = await supabaseAdmin.from("table_payment_requests").select("id").eq("provider_order_id", orderId).eq("restaurant_slug", params.slug).maybeSingle();
        if (!pay) return new Response("ok");
        const { pagarme, orderPaid, orderFailed, decryptSecret } = await import("@/lib/tipe/pagarme.server");
        const order = await pagarme(`/orders/${orderId}`, { secretKey: await decryptSecret(acc.secret_key_enc) });
        if (orderPaid(order)) await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: true } as never);
        else if (orderFailed(order)) await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: false } as never);
        return new Response("ok");
      },
    },
  },
});
