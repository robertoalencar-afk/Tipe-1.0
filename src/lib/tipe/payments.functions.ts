import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SERVICE_FEE } from "./rules";

const Input = z.object({
  method: z.enum(["pix", "card", "apple_pay", "google_pay", "at_establishment"]),
  tip: z.number().min(0).max(1000),
  tableId: z.string().max(16),
  restaurantId: z.string().max(64),
  idempotencyKey: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/),
  session: z.string().min(16).max(96),
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
// O valor é sempre calculado no servidor a partir da conta da mesa;
// o cliente nunca define quanto será cobrado. Um pagamento só fica
// "approved" quando o provedor confirma a cobrança; sem provedor
// configurado (simulação), fica "pending" para o restaurante confirmar.
export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<PaymentResult> => {
    const { verifyTableSession, enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`pay:${data.restaurantId}:${data.tableId}:${clientIp()}`, 20, 60, data.restaurantId);
    const ok = await verifyTableSession(data.restaurantId, data.tableId, data.session);
    if (!ok) throw new Error("A conta desta mesa foi atualizada. Leia o QR Code da mesa novamente.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = `tp_${data.idempotencyKey.slice(0, 12)}`;

    // Valor derivado no servidor: itens escolhidos (limitados ao disponível)
    // + taxa de serviço; para gorjeta, apenas o valor da gorjeta.
    let amount = 0;
    let itemQuantities: Record<string, number> = {};
    if (data.target === "restaurant") {
      const { data: billItems, error } = await supabaseAdmin
        .from("table_bill_items")
        .select("item_code, unit_price, ordered_quantity, reserved_quantity, paid_quantity")
        .eq("restaurant_slug", data.restaurantId)
        .eq("table_number", data.tableId);
      if (error) throw new Error("Não foi possível ler a conta da mesa");
      let subtotal = 0;
      for (const item of billItems ?? []) {
        const requested = Math.floor(data.itemQuantities[item.item_code] ?? 0);
        if (requested <= 0) continue;
        const available = Number(item.ordered_quantity) - Number(item.reserved_quantity) - Number(item.paid_quantity);
        const qty = Math.min(requested, Math.max(0, available));
        if (qty <= 0) continue;
        subtotal += Number(item.unit_price) * qty;
        itemQuantities[item.item_code] = qty;
      }
      if (subtotal <= 0) throw new Error("Nenhum item disponível para pagamento");
      amount = +(subtotal * (1 + SERVICE_FEE)).toFixed(2);
    } else {
      if (data.tip <= 0) throw new Error("Informe o valor da gorjeta");
      amount = Math.round(data.tip * 100) / 100;
    }
    const cents = Math.round(amount * 100);

    const register = async (status: "approved" | "pending") => {
      const { error } = await supabaseAdmin.rpc("register_table_payment", {
        p_restaurant_slug: data.restaurantId,
        p_table_number: data.tableId,
        p_customer_name: data.customerName,
        p_payment_target: data.target,
        p_payment_method: data.method,
        p_status: status,
        p_amount: amount,
        p_item_quantities: itemQuantities,
        p_idempotency_key: data.idempotencyKey,
      } as never);
      if (error) {
        console.error("register_table_payment", error.message);
        throw new Error(error.message.includes("não está mais disponível") ? "Um item selecionado acabou de ser pago por outra pessoa. A conta foi atualizada." : error.message.includes("já registrado") ? "Este pagamento já foi registrado." : "Não foi possível atualizar a conta");
      }
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
        const paid = j.charges?.[0]?.status === "paid";
        await register(paid ? "approved" : "pending");
        return { id: j.id, status: paid ? "approved" : "pending", provider: "pagarme", pixCode: j.charges?.[0]?.last_transaction?.qr_code };
      }
      await register("pending");
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
      const paid = j.status === "succeeded";
      await register(paid ? "approved" : "pending");
      return { id: j.id, status: paid ? "approved" : "pending", provider: "stripe" };
    }
    await register("pending");
    return { id, status: "pending", provider: "simulado" };
  });

const TableInput = z.object({ restaurantId: z.string().max(64), tableId: z.string().max(16), session: z.string().min(16).max(96) });

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
  item_quantities: Record<string, number>;
  created_at: string;
};

export const getSharedTableState = createServerFn({ method: "GET" })
  .inputValidator((d) => TableInput.parse(d))
  .handler(async ({ data }): Promise<{ items: SharedBillItem[]; payments: SharedPayment[] }> => {
    const { verifyTableSession } = await import("./security.server");
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) throw new Error("Sessão da mesa expirada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [itemsResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("item_code, ordered_quantity, reserved_quantity, paid_quantity")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId),
      supabaseAdmin.from("table_payment_requests").select("id, customer_name, payment_method, status, amount, item_quantities, created_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
    ]);
    if (itemsResult.error || paymentsResult.error) throw new Error("Não foi possível atualizar a mesa");
    return {
      items: (itemsResult.data ?? []).map((item) => ({ ...item, ordered_quantity: Number(item.ordered_quantity), reserved_quantity: Number(item.reserved_quantity), paid_quantity: Number(item.paid_quantity) })),
      payments: (paymentsResult.data ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) })) as SharedPayment[],
    };
  });

const REOPEN_DELAY_MS = 2 * 60 * 1000;

// Reabre a mesa (nova conta) 2 minutos após o encerramento: tudo pago e nada pendente.
export const reopenClosedTable = createServerFn({ method: "POST" })
  .inputValidator((d) => TableInput.parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession, enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`reopen:${data.restaurantId}:${data.tableId}:${clientIp()}`, 30, 60, data.restaurantId);
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) return { reopened: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [itemsResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("ordered_quantity, reserved_quantity, paid_quantity, updated_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId),
      supabaseAdmin.from("table_payment_requests").select("status, updated_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).eq("payment_target", "restaurant"),
    ]);
    if (itemsResult.error || paymentsResult.error) throw new Error("Não foi possível verificar a mesa");
    const items = itemsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const closed = items.length > 0
      && items.every((i) => Number(i.ordered_quantity) - Number(i.reserved_quantity) - Number(i.paid_quantity) <= 0)
      && payments.every((p) => p.status !== "pending");
    if (!closed) return { reopened: false };
    const last = Math.max(...items.map((i) => Date.parse(i.updated_at)), ...payments.map((p) => Date.parse(p.updated_at)));
    if (Date.now() - last < REOPEN_DELAY_MS) return { reopened: false, waitMs: REOPEN_DELAY_MS - (Date.now() - last) };
    // Arquiva os pagamentos (nunca apaga o histórico) e libera a mesa.
    const { error } = await supabaseAdmin.rpc("archive_and_reopen_table", { p_slug: data.restaurantId, p_table: data.tableId });
    if (error) throw new Error("Não foi possível reabrir a mesa");
    return { reopened: true };
  });
