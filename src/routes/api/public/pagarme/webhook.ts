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
        let body: { type?: string; data?: { id?: string; order?: { id?: string }; subscription?: { id?: string } } & Record<string, unknown> };
        try { body = JSON.parse((await request.text()).slice(0, 200_000)); } catch { return new Response("bad request", { status: 400 }); }
        const type = String(body.type ?? "");
        const { pagarme } = await import("@/lib/tipe/pagarme.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Pagamentos, estornos e contestações: o pedido é reconsultado e a decisão
        // segue a mesma regra do reconciliador (payment-settlement.server.ts).
        const { isPaymentEvent, findOrderId, findPaymentByOrder, applyProviderOrder } = await import("@/lib/tipe/payment-settlement.server");
        if (isPaymentEvent(type)) {
          const orderId = findOrderId(body.data);
          if (!orderId) return new Response("ok");
          // Conta da TIPE: só gorjetas extras. Contas de mesa chegam pelo webhook do restaurante.
          const pay = await findPaymentByOrder(supabaseAdmin, orderId);
          if (!pay || pay.payment_target !== "tipe") return new Response("ok");
          const order = await pagarme<import("@/lib/tipe/pagarme.server").PagarmeOrder>(`/orders/${orderId}`);
          await applyProviderOrder(supabaseAdmin, orderId, order, pay);
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
