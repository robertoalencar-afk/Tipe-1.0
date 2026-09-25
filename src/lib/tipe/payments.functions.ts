import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  method: z.enum(["pix", "card", "apple_pay", "google_pay", "at_establishment"]),
  amount: z.number().positive().max(100000),
  tip: z.number().min(0).max(10000),
  tableId: z.string().max(16),
  restaurantId: z.string().max(64),
  idempotencyKey: z.string().max(80),
  customerName: z.string().min(1).max(40),
  itemQuantities: z.record(z.string(), z.number().int().nonnegative()),
  target: z.enum(["restaurant", "tipe"]),
});

export type PaymentResult = {
  id: string;
  status: "approved" | "pending";
  provider: "pagarme" | "stripe" | "simulado" | "estabelecimento";
  pixCode?: string;
};

// Pix -> Pagar.me ; Cartão / Apple Pay / Google Pay -> Stripe.
// Sem chaves configuradas, retorna pagamento simulado.
export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<PaymentResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cents = Math.round((data.amount + data.tip) * 100);
    const id = `tp_${data.idempotencyKey.slice(0, 12)}`;

    const register = async (status: "approved" | "pending") => {
      const { error } = await supabaseAdmin.rpc("register_table_payment", {
        p_restaurant_slug: data.restaurantId,
        p_table_number: data.tableId,
        p_customer_name: data.customerName,
        p_payment_target: data.target,
        p_payment_method: data.method,
        p_status: status,
        p_amount: data.amount + data.tip,
        p_item_quantities: data.itemQuantities,
      });
      if (error) throw new Error(error.message.includes("não está mais disponível") ? error.message : "Não foi possível atualizar a conta");
    };

    if (data.method === "at_establishment") {
      await register("pending");
      return { id, status: "pending", provider: "estabelecimento" };
    }

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
        await register("approved");
        return { id: j.id, status: "approved", provider: "pagarme", pixCode: j.charges?.[0]?.last_transaction?.qr_code };
      }
      await register("approved");
      return { id, status: "approved", provider: "simulado", pixCode: `00020126TIPE${cents}BR.GOV.BCB.PIX5204000053039865802BR` };
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
      await register("approved");
      return { id: j.id, status: "approved", provider: "stripe" };
    }
    await register("approved");
    return { id, status: "approved", provider: "simulado" };
  });

const TableInput = z.object({ restaurantId: z.string().max(64), tableId: z.string().max(16) });

export type SharedBillItem = {
  item_code: string;
  ordered_quantity: number;
  reserved_quantity: number;
  paid_quantity: number;
};

export type SharedPayment = {
  id: string;
  customer_name: string;
  payment_method: string;
  status: "pending" | "approved" | "cancelled" | "failed";
  amount: number;
  created_at: string;
};

export const getSharedTableState = createServerFn({ method: "GET" })
  .inputValidator((d) => TableInput.parse(d))
  .handler(async ({ data }): Promise<{ items: SharedBillItem[]; payments: SharedPayment[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [itemsResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("item_code, ordered_quantity, reserved_quantity, paid_quantity")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId),
      supabaseAdmin.from("table_payment_requests").select("id, customer_name, payment_method, status, amount, created_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
    ]);
    if (itemsResult.error || paymentsResult.error) throw new Error("Não foi possível atualizar a mesa");
    return {
      items: (itemsResult.data ?? []).map((item) => ({ ...item, ordered_quantity: Number(item.ordered_quantity), reserved_quantity: Number(item.reserved_quantity), paid_quantity: Number(item.paid_quantity) })),
      payments: (paymentsResult.data ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) })) as SharedPayment[],
    };
  });
