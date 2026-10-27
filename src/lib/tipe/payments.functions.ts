import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GORJETA_MINIMA, SERVICE_FEE, resolveServiceFee } from "./rules";

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
  // Token criptografado do Apple Pay ou do Google Pay (JSON da carteira, validado em carteiras.ts).
  walletToken: z.string().min(32).max(16000).optional(),
  establishmentMethod: z.enum(["cash", "card_terminal"]).optional(),
  cashReceived: z.number().min(0).max(100000).optional(),
  // Só a escolha da taxa vem do navegador; o servidor valida e recalcula.
  serviceFee: z.object({ kind: z.enum(["suggested", "percent", "amount"]), value: z.unknown().optional() }).optional(),
  // Gorjeta extra: pagamento da conta a que ela se refere (o teto é o valor dessa conta).
  billPaymentId: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (data.target === "tipe" && data.tip < GORJETA_MINIMA) {
    ctx.addIssue({ code: "custom", path: ["tip"], message: "A gorjeta mínima é R$ 2,00" });
  }
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
      // Arredondamento cumulativo por item (bill-math.ts): a soma das partes de
      // um item dividido é sempre exatamente o valor do item.
      const { itemChargeCents, roundPortion } = await import("./bill-math");
      let subtotalCents = 0;
      for (const item of billItems ?? []) {
        const requested = roundPortion(data.itemQuantities[item.item_code] ?? 0);
        if (requested <= 0) continue;
        const consumed = roundPortion(Number(item.reserved_portion) + Number(item.paid_portion));
        const available = roundPortion(Number(item.ordered_quantity) - consumed);
        const qty = Math.min(requested, Math.max(0, available));
        if (qty <= 0) continue;
        subtotalCents += itemChargeCents(Number(item.unit_price), consumed, qty);
        itemQuantities[item.item_code] = qty;
      }
      const subtotal = subtotalCents / 100;
      if (subtotal <= 0) throw new Error("Nenhum item disponível para pagamento");
      // Taxa removida pelo restaurante para esta conta (vale até a mesa ser reaberta).
      const restId = (rest as { id?: string } | null)?.id;
      const { data: tbl } = await supabaseAdmin.from("restaurant_tables").select("session_token" as never).eq("restaurant_id", restId ?? "").eq("number", data.tableId).maybeSingle() as unknown as { data: { session_token: string } | null };
      const { data: waiver } = tbl ? await supabaseAdmin.from("service_fee_waivers").select("id").eq("restaurant_id", restId ?? "").eq("table_number", data.tableId).eq("session_token", tbl.session_token).limit(1) : { data: [] };
      const waived = (waiver ?? []).length > 0;
      const suggestedRate = waived ? 0 : Number((rest as { service_rate?: number } | null)?.service_rate ?? SERVICE_FEE);
      // A taxa é definida pelo restaurante; qualquer escolha vinda do navegador é recusada.
      const raw = data.serviceFee ?? { kind: "suggested" as const };
      const fee = raw.kind === "suggested" ? resolveServiceFee(subtotal, suggestedRate, { kind: "suggested" }) : null;
      if (!fee) {
        const { logSecurityEvent } = await import("./security.server");
        await logSecurityEvent({ action: "service_fee_rejected", resource: `mesa:${data.tableId}`, result: "denied", restaurantSlug: data.restaurantId, restaurantId: (rest as { id?: string } | null)?.id, detail: `kind=${raw.kind} value=${String(raw.value).slice(0, 30)} ip=${clientIp()}` });
        throw new Error("A taxa de serviço é definida pelo restaurante.");
      }
      const suggestedFee = resolveServiceFee(subtotal, suggestedRate, { kind: "suggested" })!.amount;
      feeRecord = { service_rate_suggested: suggestedRate, service_fee_suggested: suggestedFee, service_fee_amount: fee.amount, service_fee_changed: fee.changed };
      amount = +(subtotal + fee.amount).toFixed(2);
    } else {
      if (data.tip <= 0) throw new Error("Informe o valor da gorjeta");
      amount = Math.round(data.tip * 100) / 100;
      if (data.billPaymentId) {
        // Teto: a gorjeta extra não passa do valor pago pela conta desta mesa.
        const { data: conta } = await supabaseAdmin.from("table_payment_requests").select("amount")
          .eq("id", data.billPaymentId).eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId)
          .eq("payment_target", "restaurant").maybeSingle();
        if (!conta) throw new Error("Pague a conta antes de deixar a gorjeta");
        if (amount > Number(conta.amount) + 0.005) throw new Error("A gorjeta não pode passar do valor da sua conta");
      }
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
      const { avisarPagamento } = await import("./avisos-equipe.server");
      await avisarPagamento(supabaseAdmin, payId);
      return { id, status: "pending", provider: "estabelecimento" };
    }

    const { pagarmeEnabled, pagarme, simulatedPaymentsAllowed, isSimulationRestaurant } = await import("./pagarme.server");

    // Restaurante de teste: aprova simulado sem tocar em nenhuma conta Pagar.me.
    if (isSimulationRestaurant(data.restaurantId)) {
      const simId = await register("approved");
      const { avisarPagamento } = await import("./avisos-equipe.server");
      await avisarPagamento(supabaseAdmin, simId);
      return { id: simId, status: "approved", provider: "simulado" };
    }

    const split: unknown[] | undefined = undefined;
    let secretKey: string | undefined;
    let restauranteDbId: string | undefined;
    if (data.target === "restaurant") {
      // A conta vai direto para a conta Pagar.me do próprio restaurante.
      const { restaurantPagarmeKey } = await import("./pagarme.server");
      const { data: rest } = await supabaseAdmin.from("restaurants").select("id").eq("slug", data.restaurantId).maybeSingle();
      restauranteDbId = rest?.id;
      secretKey = (rest ? await restaurantPagarmeKey(rest.id) : null) ?? undefined;
    }

    // Sem conta Pagar.me: em produção o pagamento digital é recusado antes de
    // reservar qualquer item; só ambientes de teste/demonstração aprovam simulado.
    if (data.target === "restaurant" ? !secretKey : !pagarmeEnabled()) {
      if (!simulatedPaymentsAllowed()) {
        throw new Error(data.target === "restaurant"
          ? "Este restaurante ainda não aceita pagamento digital pela TIPE. Pague no estabelecimento."
          : "A gorjeta digital ainda não está disponível. Você pode deixar a gorjeta diretamente com a equipe.");
      }
      const simId = await register("approved");
      const { avisarPagamento } = await import("./avisos-equipe.server");
      await avisarPagamento(supabaseAdmin, simId);
      return { id: simId, status: "approved", provider: "simulado" };
    }

    // Apple Pay e Google Pay: cobrados como cartão no Pagar.me, com o token da carteira.
    let carteira: Record<string, unknown> | undefined;
    if (data.method === "apple_pay" || data.method === "google_pay") {
      const nomeCarteira = data.method === "apple_pay" ? "Apple Pay" : "Google Pay";
      if (data.target !== "restaurant") throw new Error(`A gorjeta extra ainda não aceita ${nomeCarteira}. Use Pix.`);
      const { data: conta } = await supabaseAdmin.from("restaurant_pagarme_accounts").select("account_id" as never)
        .eq("restaurant_id", restauranteDbId ?? "").maybeSingle() as unknown as { data: { account_id: string | null } | null };
      if (!data.walletToken || !conta?.account_id) throw new Error(`O ${nomeCarteira} ainda não está ativo neste restaurante. Use Pix.`);
      const { payloadCarteira } = await import("./carteiras");
      carteira = payloadCarteira(data.method, data.walletToken, conta.account_id);
    }
    if (data.method === "card" && !data.cardToken) throw new Error("Informe os dados do cartão");

    // Reserva os itens antes de cobrar; se a cobrança falhar, a reserva é liberada.
    const payId = await register("pending");
    const localRef = `local_${data.idempotencyKey}`;
    await supabaseAdmin.from("table_payment_requests").update({ provider: "pagarme", provider_order_id: localRef }).eq("id", payId);

    const payment = data.method === "pix"
      ? { payment_method: "pix", pix: { expires_in: 900 }, ...(split ? { split } : {}) }
      : carteira
        ? { payment_method: "credit_card", credit_card: { installments: 1, statement_descriptor: "TIPE", payload: carteira }, ...(split ? { split } : {}) }
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
      throw new Error(data.method === "pix" ? "Não foi possível gerar o Pix. Tente novamente." : carteira ? "A carteira recusou o pagamento. Tente outro cartão da carteira ou use Pix." : "Pagamento recusado. Confira os dados do cartão.");
    }

    await supabaseAdmin.from("table_payment_requests").update({ provider_order_id: order.id }).eq("id", payId);
    // Mesma decisão do webhook e do reconciliador (inclui conferência do valor pago).
    const { applyProviderOrder } = await import("./payment-settlement.server");
    const outcome = await applyProviderOrder(supabaseAdmin, order.id, order);
    if (outcome === "settle_paid") return { id: payId, status: "approved", provider: "pagarme" };
    if (outcome === "settle_failed") throw new Error("Pagamento recusado. Tente outro meio de pagamento.");
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
  status: import("./payment-state").PaymentStatus;
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
export const getPaymentConfig = createServerFn({ method: "GET" })
  .inputValidator((d: { slug?: string } | undefined) => ({ slug: typeof d?.slug === "string" ? d.slug.slice(0, 80) : undefined }))
  .handler(async ({ data }) => {
    const { isSimulationRestaurant } = await import("./pagarme.server");
    const sim = isSimulationRestaurant(data.slug);
    return {
      live: !sim && !!process.env["PAGARME_SECRET_KEY"],
      publicKey: sim ? null : process.env["PAGARME_PUBLIC_KEY"] ?? null,
      // Gorjeta extra é recebida na conta TIPE: só aparece se ela estiver configurada (ou em simulação).
      tipsAvailable: sim || !!process.env["PAGARME_SECRET_KEY"] || process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"] === "true",
    };
  });

// Situação de um pagamento da própria mesa (usado para acompanhar o Pix).
export const getPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => TableInput.extend({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession } = await import("./security.server");
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) throw new Error("Sessão da mesa expirada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("table_payment_requests").select("id, status, amount, created_at, restaurant_slug, payment_target, provider, provider_order_id")
      .eq("id", data.paymentId).eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).maybeSingle();
    // Pix pendente há mais de 1 min enquanto o cliente espera: reconsulta o provedor
    // (no máximo 3× por minuto por pagamento). Cobre webhook perdido sem depender da rotina.
    if (p && p.status === "pending" && p.provider === "pagarme" && p.provider_order_id?.startsWith("or_") && Date.now() - Date.parse(p.created_at) > 60_000) {
      const { rateLimit } = await import("./security.server");
      if (await rateLimit(`paycheck:${p.id}`, 3, 60)) {
        try {
          const { pagarme, restaurantPagarmeKey } = await import("./pagarme.server");
          let secretKey: string | undefined;
          if (p.payment_target === "restaurant") {
            const { data: r } = await supabaseAdmin.from("restaurants").select("id").eq("slug", p.restaurant_slug).maybeSingle();
            secretKey = (r ? await restaurantPagarmeKey(r.id) : null) ?? undefined;
          }
          if (p.payment_target !== "restaurant" || secretKey) {
            const order = await pagarme<import("./pagarme.server").PagarmeOrder>(`/orders/${p.provider_order_id}`, secretKey ? { secretKey } : {});
            const { applyProviderOrder } = await import("./payment-settlement.server");
            const acao = await applyProviderOrder(supabaseAdmin, p.provider_order_id, order, { ...p, amount: Number(p.amount), status: "pending", archived: false });
            if (acao === "settle_paid") return { status: "approved" as const };
            if (acao === "settle_failed") return { status: "failed" as const };
          }
        } catch { /* provedor fora do ar: o webhook ou a rotina resolvem depois */ }
      }
    }
    return { status: (p?.status ?? "failed") as import("./payment-state").PaymentStatus };
  });

// Depois de uma queda de conexão: descobre se o pagamento daquela tentativa chegou ao servidor.
export const getPaymentByKey = createServerFn({ method: "POST" })
  .inputValidator((d) => TableInput.extend({ idempotencyKey: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession } = await import("./security.server");
    if (!(await verifyTableSession(data.restaurantId, data.tableId, data.session))) throw new Error("Sessão da mesa expirada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("table_payment_requests").select("id, status")
      .eq("idempotency_key", data.idempotencyKey).eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).maybeSingle();
    return p ? { found: true as const, id: p.id as string, status: p.status as import("./payment-state").PaymentStatus } : { found: false as const };
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
    if (data.stars <= 2) {
      const { avisarNota } = await import("./avisos-equipe.server");
      await avisarNota(supabaseAdmin, ok.restaurantId, t?.waiter_id ?? null, data.tableId, data.stars, data.comment);
    }
    return { ok: true };
  });

// Comprovante por e-mail: só de pagamento aprovado da própria mesa (sessão válida).
// O e-mail é usado só para este envio e não é gravado (LGPD: minimização).
export const sendPaymentReceipt = createServerFn({ method: "POST" })
  .inputValidator((d) => TableInput.extend({ paymentId: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(160) }).parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession, enforceRate, clientIp } = await import("./security.server");
    const ok = await verifyTableSession(data.restaurantId, data.tableId, data.session);
    if (!ok) throw new Error("Sessão da mesa expirada");
    await enforceRate(`receipt:${data.paymentId}`, 3, 600, data.restaurantId);
    await enforceRate(`receipt-ip:${clientIp()}`, 10, 3600, data.restaurantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("table_payment_requests")
      .select("id, customer_name, payment_method, status, amount, item_quantities, created_at, service_fee_amount, payment_target")
      .eq("id", data.paymentId).eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).maybeSingle();
    if (!p || p.payment_target !== "restaurant" || p.status !== "approved") throw new Error("O comprovante fica disponível depois que o pagamento é confirmado.");
    const qtys = (p.item_quantities ?? {}) as Record<string, number>;
    const codes = Object.keys(qtys);
    const [{ data: items }, { data: r }] = await Promise.all([
      codes.length ? supabaseAdmin.from("table_bill_items").select("item_code, item_name").eq("restaurant_slug", data.restaurantId).eq("table_number", data.tableId).in("item_code", codes) : Promise.resolve({ data: [] as { item_code: string; item_name: string }[] }),
      supabaseAdmin.from("restaurants").select("name").eq("slug", data.restaurantId).maybeSingle(),
    ]);
    const { buildReceipt, maskEmail } = await import("./receipt");
    const receipt = buildReceipt({
      restaurant: r?.name ?? "Restaurante", table: data.tableId, customer: p.customer_name, createdAt: p.created_at,
      paymentMethod: p.payment_method, itemQuantities: qtys,
      itemNames: Object.fromEntries((items ?? []).map((i) => [i.item_code, i.item_name])),
      amount: Number(p.amount), serviceFee: p.service_fee_amount === null ? null : Number(p.service_fee_amount), paymentId: p.id,
    });
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.email))), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    try {
      const res = await sendTemplateEmail("payment-receipt", data.email, { templateData: receipt, idempotencyKey: `receipt-${p.id}-${digest}` });
      if (!res.sent) throw new Error("suppressed");
    } catch {
      throw new Error("Não foi possível enviar o comprovante agora. Confira o e-mail e tente de novo.");
    }
    return { sentTo: maskEmail(data.email) };
  });

