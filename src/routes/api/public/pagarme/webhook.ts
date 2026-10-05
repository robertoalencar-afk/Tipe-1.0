import { createFileRoute } from "@tanstack/react-router";

// Webhook do Pagar.me. Configure no painel do Pagar.me com autenticação básica:
// usuário "tipe" e senha = PAGARME_WEBHOOK_SECRET. O corpo nunca é confiado:
// o status é sempre reconsultado na API do Pagar.me antes de qualquer alteração.
export const Route = createFileRoute("/api/public/pagarme/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAGARME_WEBHOOK_SECRET"];
        if (!secret || !process.env["PAGARME_SECRET_KEY"]) return new Response("not configured", { status: 503 });
        const { safeEqual, logSecurityEvent } = await import("@/lib/tipe/security.server");
        const expected = `Basic ${btoa(`tipe:${secret}`)}`;
        if (!safeEqual(request.headers.get("authorization") ?? "", expected)) {
          await logSecurityEvent({ action: "pagarme_webhook_denied", result: "denied" });
          return new Response("unauthorized", { status: 401 });
        }
        let body: { type?: string; data?: { id?: string; order?: { id?: string }; subscription?: { id?: string } } };
        try { body = JSON.parse((await request.text()).slice(0, 200_000)); } catch { return new Response("bad request", { status: 400 }); }
        const type = String(body.type ?? "");
        const { pagarme, orderPaid, orderFailed } = await import("@/lib/tipe/pagarme.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type.startsWith("order.") || type.startsWith("charge.")) {
          const orderId = type.startsWith("order.") ? body.data?.id : body.data?.order?.id;
          if (!orderId || !/^or_[A-Za-z0-9]+$/.test(orderId)) return new Response("ok");
          const order = await pagarme(`/orders/${orderId}`);
          if (orderPaid(order)) await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: true } as never);
          else if (orderFailed(order)) await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: false } as never);
          return new Response("ok");
        }

        if (type.startsWith("subscription.") || type.startsWith("invoice.")) {
          const subId = type.startsWith("subscription.") ? body.data?.id : body.data?.subscription?.id;
          if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) return new Response("ok");
          const sub = await pagarme<{ status: string; next_billing_at?: string }>(`/subscriptions/${subId}`);
          const map: Record<string, string> = { active: "active", future: "trialing", canceled: "canceled", failed: "past_due" };
          const update: Record<string, unknown> = { status: map[sub.status] ?? "past_due" };
          if (sub.next_billing_at) update["current_period_end"] = sub.next_billing_at;
          await supabaseAdmin.from("restaurant_subscriptions").update(update as never).eq("provider_subscription_id", subId);
          return new Response("ok");
        }
        return new Response("ok");
      },
    },
  },
});
