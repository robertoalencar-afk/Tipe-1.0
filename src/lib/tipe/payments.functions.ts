import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  method: z.enum(["pix", "card", "apple_pay", "google_pay"]),
  amount: z.number().positive().max(100000),
  tip: z.number().min(0).max(10000),
  tableId: z.string().max(16),
  restaurantId: z.string().max(64),
  idempotencyKey: z.string().max(80),
});

export type PaymentResult = {
  id: string;
  status: "approved" | "pending";
  provider: "pagarme" | "stripe" | "simulado";
  pixCode?: string;
};

// Pix -> Pagar.me ; Cartão / Apple Pay / Google Pay -> Stripe.
// Sem chaves configuradas, retorna pagamento simulado.
export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<PaymentResult> => {
    const cents = Math.round((data.amount + data.tip) * 100);
    const id = `tp_${data.idempotencyKey.slice(0, 12)}`;

    if (data.method === "pix") {
      const key = process.env["PAGARME_SECRET_KEY"];
      if (key) {
        const res = await fetch("https://api.pagar.me/core/v5/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(key + ":")}`,
            "Content-Type": "application/json",
            "Idempotency-Key": data.idempotencyKey,
          },
          body: JSON.stringify({
            items: [{ amount: cents, description: `Mesa ${data.tableId}`, quantity: 1, code: data.tableId }],
            payments: [{ payment_method: "pix", pix: { expires_in: 900 } }],
            closed: true,
          }),
        });
        const j: any = await res.json();
        if (!res.ok) { console.error("Pagar.me", j); throw new Error("Não foi possível gerar o Pix"); }
        return { id: j.id, status: "pending", provider: "pagarme", pixCode: j.charges?.[0]?.last_transaction?.qr_code };
      }
      return { id, status: "pending", provider: "simulado", pixCode: `00020126TIPE${cents}BR.GOV.BCB.PIX5204000053039865802BR` };
    }

    const sk = process.env["STRIPE_SECRET_KEY"];
    if (sk) {
      const body = new URLSearchParams({ amount: String(cents), currency: "brl", "automatic_payment_methods[enabled]": "true" });
      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: { Authorization: `Bearer ${sk}`, "Idempotency-Key": data.idempotencyKey, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const j: any = await res.json();
      if (!res.ok) { console.error("Stripe", j); throw new Error("Pagamento recusado"); }
      return { id: j.id, status: "pending", provider: "stripe" };
    }
    return { id, status: "approved", provider: "simulado" };
  });
