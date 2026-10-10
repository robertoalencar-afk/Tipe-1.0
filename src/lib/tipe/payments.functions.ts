import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SERVICE_FEE, resolveServiceFee, type ServiceFeeChoice } from "./rules";

const Input = z.object({
  method: z.enum(["pix", "card", "apple_pay", "google_pay", "at_establishment"]),
  tip: z.number().min(0).max(1000),
  tableId: z.string().max(16),
  restaurantId: z.string().max(64),
  idempotencyKey: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/),
  session: z.string().min(16).max(96),
  customerName: z.string().min(1).max(40),
  itemQuantities: z.record(z.string(), z.number().min(0).max(99).multipleOf(0.0001)),
  target: z.enum(["restaurant", "tipe"]),
  cardToken: z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/).optional(),
  establishmentMethod: z.enum(["cash", "card_terminal"]).optional(),
  cashReceived: z.number().min(0).max(100000).optional(),
  // Só a escolha da taxa vem do navegador; o servidor valida e recalcula.
  serviceFee: z.object({ kind: z.enum(["suggested", "percent", "amount"]), value: z.unknown().optional() }).optional(),
}).superRefine((data, ctx) => {
  if (data.method === "at_establishment" && !data.establishmentMethod) {
    ctx.addIssue({ code: "custom", path: ["establishmentMethod"], message: "Escolha dinheiro ou maquininha" });
  }
  if (data.method !== "at_establishment" && (data.establishmentMethod || data.cashReceived !== undefined)) {
    ctx.addIssue({ code: "custom", path: ["establishmentMethod"], message: "Dados presenciais inválidos" });
  }
  if (data.establishmentMethod === "cash" && data.cashReceived === undefined) {
    ctx.addIssue({ code: "custom", path: ["cashReceived"], message: "Informe o valor entregue em dinheiro" });
  }
  if (data.establishmentMethod === "card_terminal" && data.cashReceived !== undefined) {
    ctx.addIssue({ code: "custom", path: ["cashReceived"], message: "Valor em dinheiro inválido" });
  }
});

export type PaymentResult = {
  id: string;
  status: "approved" | "pending";
  provider: "pagarme" | "simulado" | "estabelecimento";
  pixCode?: string | undefined;
  pixQrUrl?: string | undefined;
};

// Pagamentos digitais via Pagar.me (Pix e cartão tokenizado no navegador).
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
    let feeRecord: { service_rate_suggested: number; service_fee_suggested: number; service_fee_amount: number; service_fee_changed: boolean } | null = null;
    if (data.target === "restaurant") {
      const { data: rest } = await supabaseAdmin.from("restaurants").select("id, bill_payment_methods, service_rate").eq("slug", data.restaurantId).maybeSingle();
      const allowed = (rest as { bill_payment_methods?: string[] } | null)?.bill_payment_methods ?? ["pix", "apple_pay", "google_pay", "at_establishment"];
      if (!allowed.includes(data.method)) throw new Error("Este meio de pagamento não é aceito por este restaurante.");
      const { data: billItems, error } = await supabaseAdmin
        .from("table_bill_items")
        .select("item_code, unit_price, ordered_quantity, reserved_portion, paid_portion")
        .eq("restaurant_slug", data.restaurantId)
        .eq("table_number", data.tableId);
      if (error) throw new Error("Não foi possível ler a conta da mesa");
      let subtotal = 0;
      for (const item of billItems ?? []) {
        const requested = Math.round((data.itemQuantities[item.item_code] ?? 0) * 10000) / 10000;
        if (requested <= 0) continue;
        const available = Number(item.ordered_quantity) - Number(item.reserved_portion) - Number(item.paid_portion);
        const qty = Math.min(requested, Math.max(0, available));
        if (qty <= 0) continue;
        subtotal += Number(item.unit_price) * qty;
        itemQuantities[item.item_code] = qty;
      }
      if (subtotal <= 0) throw new Error("Nenhum item disponível para pagamento");
      const suggestedRate = Number((rest as { service_rate?: number } | null)?.service_rate ?? SERVICE_FEE);
      const raw = data.serviceFee ?? { kind: "suggested" as const };
      const choice = (raw.kind === "suggested" ? { kind: "suggested" } : { kind: raw.kind, value: typeof raw.value === "number" ? raw.value : NaN }) as ServiceFeeChoice;
      const fee = resolveServiceFee(subtotal, suggestedRate, choice);
      if (!fee) {
        const { logSecurityEvent } = await import("./security.server");
        await logSecurityEvent({ action: "service_fee_rejected", resource: `mesa:${data.tableId}`, result: "denied", restaurantSlug: data.restaurantId, restaurantId: (rest as { id?: string } | null)?.id, detail: `kind=${raw.kind} value=${String(raw.value).slice(0, 30)} ip=${clientIp()}` });
        throw new Error("Valor da taxa de serviço inválido. Escolha entre 0% e 20%.");
      }
      const suggestedFee = resolveServiceFee(subtotal, suggestedRate, { kind: "suggested" })!.amount;
      feeRecord = { service_rate_suggested: suggestedRate, service_fee_suggested: suggestedFee, service_fee_amount: fee.amount, service_fee_changed: fee.changed };
      amount = +(subtotal + fee.amount).toFixed(2);
    } else {
      if (data.tip <= 0) throw new Error("Informe o valor da gorjeta");
      amount = Math.round(data.tip * 100) / 100;
    }
    const cents = Math.round(amount * 100);

    const register = async (status: "approved" | "pending"): Promise<string> => {
      const { data: payId, error } = await supabaseAdmin.rpc("register_table_payment", {
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
      // Vincula o pagamento ao garçom da mesa (usado nas gorjetas e vendas do garçom).
      const { data: rest } = await supabaseAdmin.from("restaurants").select("id").eq("slug", data.restaurantId).maybeSingle();
      if (rest) {
        const { data: t } = await supabaseAdmin.from("restaurant_tables").select("waiter_id").eq("restaurant_id", rest.id).eq("number", data.tableId).maybeSingle();
        if (t?.waiter_id) await supabaseAdmin.from("table_payment_requests").update({ waiter_id: t.waiter_id }).eq("id", payId as unknown as string);
      }
      if (feeRecord) await supabaseAdmin.from("table_payment_requests").update(feeRecord).eq("id", payId as unknown as string);
      return payId as unknown as string;
    };

    if (data.method === "at_establishment") {
      if (data.establishmentMethod === "cash" && (data.cashReceived ?? 0) < amount) {
        throw new Error("O valor em dinheiro precisa cobrir o total da conta");
      }
      const payId = await register("pending");
      const cashReceived = data.establishmentMethod === "cash" ? Math.round((data.cashReceived ?? 0) * 100) / 100 : null;
      const changeDue = cashReceived === null ? null : Math.round((cashReceived - amount) * 100) / 100;
      const { error: detailError } = await supabaseAdmin.from("table_payment_requests").update({
        establishment_method: data.establishmentMethod ?? null,
        cash_received: cashReceived,
        change_due: changeDue,
      }).eq("id", payId);
      if (detailError) throw new Error("Não foi possível registrar a forma de pagamento");
      return { id, status: "pending", provider: "estabelecimento" };
    }

    const { pagarmeEnabled, pagarme, orderPaid, orderFailed } = await import("./pagarme.server");

    const split: unknown[] | undefined = undefined;
    let secretKey: string | undefined;
    if (data.target === "restaurant") {
      // A conta vai direto para a conta Pagar.me do próprio restaurante.
      const { restaurantPagarmeKey } = await import("./pagarme.server");
      const { data: rest } = await supabaseAdmin.from("restaurants").select("id").eq("slug", data.restaurantId).maybeSingle();
      secretKey = (rest ? await restaurantPagarmeKey(rest.id) : null) ?? undefined;
    }

    // Modo simulação: sem conta Pagar.me configurada, nada é cobrado de verdade.
    if (data.target === "restaurant" ? !secretKey : !pagarmeEnabled()) {
      // Em testes, pagamentos digitais são aprovados na hora.
      const simId = await register("approved");
      return { id: simId, status: "approved", provider: "simulado" };
    }

    if (data.method === "apple_pay" || data.method === "google_pay") {
      throw new Error("Apple Pay e Google Pay serão liberados em breve. Use Pix por enquanto.");
    }
    if (data.method === "card" && !data.cardToken) throw new Error("Informe os dados do cartão");

    // Reserva os itens antes de cobrar; se a cobrança falhar, a reserva é liberada.
    const payId = await register("pending");
    const localRef = `local_${data.idempotencyKey}`;
    await supabaseAdmin.from("table_payment_requests").update({ provider: "pagarme", provider_order_id: localRef }).eq("id", payId);

    const payment = data.method === "pix"
      ? { payment_method: "pix", pix: { expires_in: 900 }, ...(split ? { split } : {}) }
      : { payment_method: "credit_card", credit_card: { installments: 1, statement_descriptor: "TIPE", card_token: data.cardToken }, ...(split ? { split } : {}) };

    let order;
    try {
      order = await pagarme<import("./pagarme.server").PagarmeOrder>("/orders", {
        method: "POST",
        idempotencyKey: data.idempotencyKey,
        ...(secretKey ? { secretKey } : {}),
        body: {
          code: payId,
          customer: { name: data.customerName, type: "individual" },
          items: [{ amount: cents, description: data.target === "restaurant" ? `Conta mesa ${data.tableId}` : "Gorjeta extra", quantity: 1, code: data.target }],
          payments: [payment],
          metadata: { payment_id: payId, restaurant: data.restaurantId, table: data.tableId, target: data.target },
        },
      });
    } catch {
      await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: localRef, p_paid: false } as never);
      throw new Error(data.method === "pix" ? "Não foi possível gerar o Pix. Tente novamente." : "Pagamento recusado. Confira os dados do cartão.");
    }

    await supabaseAdmin.from("table_payment_requests").update({ provider_order_id: order.id }).eq("id", payId);
    if (orderPaid(order)) {
      await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: order.id, p_paid: true } as never);
      return { id: payId, status: "approved", provider: "pagarme" };
    }
    if (orderFailed(order)) {
      await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: order.id, p_paid: false } as never);
      throw new Error("Pagamento recusado. Tente outro meio de pagamento.");
    }
    const tx = order.charges?.[0]?.last_transaction;
    return { id: payId, status: "pending", provider: "pagarme", pixCode: tx?.qr_code, pixQrUrl: tx?.qr_code_url };
  });

const TableInput = z.object({ restaurantId: z.string().max(64), tableId: z.string().max(16), session: z.string().min(16).max(96) });

export type SharedBillItem = {
  item_code: string;
  ordered_quantity: number;
  reserved_portion: number;
  paid_portion: number;
};

export type SharedPayment = {
  id: string;
  customer_name: string;
  payment_method: string;
  status: "pending" | "approved" | "cancelled" | "failed";
  amount: number;
  item_quantities: Record<string, number>;
  created_at: string;
  establishment_method: string | null;
  cash_received: number | null;
  change_due: number | null;
};

export const getSharedTableState = createServerFn({ method: "GET" })
  .inputValidator((d) => TableInput.parse(d))
  .handler(async ({ data }): Promise<{ items: SharedBillItem[]; payments: SharedPayment[] }> => {
    const { verifyTableSession } = await import("./security.server");
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) throw new Error("Sessão da mesa expirada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [itemsResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("item_code, ordered_quantity, reserved_portion, paid_portion")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId),
      supabaseAdmin.from("table_payment_requests").select("id, customer_name, payment_method, status, amount, item_quantities, created_at, establishment_method, cash_received, change_due")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
    ]);
    if (itemsResult.error || paymentsResult.error) throw new Error("Não foi possível atualizar a mesa");
    return {
      items: (itemsResult.data ?? []).map((item) => ({ ...item, ordered_quantity: Number(item.ordered_quantity), reserved_portion: Number(item.reserved_portion), paid_portion: Number(item.paid_portion) })),
      payments: (paymentsResult.data ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount), cash_received: payment.cash_received === null ? null : Number(payment.cash_received), change_due: payment.change_due === null ? null : Number(payment.change_due) })) as SharedPayment[],
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
      supabaseAdmin.from("table_bill_items").select("ordered_quantity, reserved_portion, paid_portion, updated_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId),
      supabaseAdmin.from("table_payment_requests").select("status, updated_at")
        .eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).eq("payment_target", "restaurant"),
    ]);
    if (itemsResult.error || paymentsResult.error) throw new Error("Não foi possível verificar a mesa");
    const items = itemsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const closed = items.length > 0
      && items.every((i) => Number(i.ordered_quantity) - Number(i.reserved_portion) - Number(i.paid_portion) <= 0.0001)
      && payments.every((p) => p.status !== "pending");
    if (!closed) return { reopened: false };
    const last = Math.max(...items.map((i) => Date.parse(i.updated_at)), ...payments.map((p) => Date.parse(p.updated_at)));
    if (Date.now() - last < REOPEN_DELAY_MS) return { reopened: false, waitMs: REOPEN_DELAY_MS - (Date.now() - last) };
    // Arquiva os pagamentos (nunca apaga o histórico) e libera a mesa.
    const { error } = await supabaseAdmin.rpc("archive_and_reopen_table", { p_slug: data.restaurantId, p_table: data.tableId });
    if (error) throw new Error("Não foi possível reabrir a mesa");
    return { reopened: true };
  });

// Chave pública do Pagar.me (publicável) para tokenizar cartões no navegador.
export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  live: !!process.env["PAGARME_SECRET_KEY"],
  publicKey: process.env["PAGARME_PUBLIC_KEY"] ?? null,
}));

// Situação de um pagamento da própria mesa (usado para acompanhar o Pix).
export const getPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => TableInput.extend({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession } = await import("./security.server");
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) throw new Error("Sessão da mesa expirada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("table_payment_requests").select("status")
      .eq("id", data.paymentId).eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).maybeSingle();
    return { status: (p?.status ?? "failed") as "pending" | "approved" | "cancelled" | "failed" };
  });

// Avaliação do atendimento: vinculada ao garçom atual da mesa (definido pelo servidor).
export const submitRating = createServerFn({ method: "POST" })
  .inputValidator((d) => TableInput.extend({ stars: z.number().int().min(1).max(5), comment: z.string().trim().max(400).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession, enforceRate } = await import("./security.server");
    const ok = await verifyTableSession(data.restaurantId, data.tableId, data.session);
    if (!ok) throw new Error("Sessão da mesa expirada");
    await enforceRate(`rating:${data.restaurantId}:${data.tableId}:${data.session.slice(0, 12)}`, 5, 600, data.restaurantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin.from("restaurant_tables").select("waiter_id").eq("restaurant_id", ok.restaurantId).eq("number", data.tableId).maybeSingle();
    const { error } = await supabaseAdmin.from("waiter_ratings").insert({
      restaurant_id: ok.restaurantId, waiter_id: t?.waiter_id ?? null, table_number: data.tableId,
      stars: data.stars, comment: data.comment ? data.comment : null,
    });
    if (error) throw new Error("Não foi possível registrar a avaliação");
    return { ok: true };
  });
