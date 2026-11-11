import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaymentStatus } from "./payment-state";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

async function rest(supabase: any, slug: string) {
  const { data } = await supabase.from("restaurants").select("id, slug, name, pos_provider, pos_mode, service_rate, phone, address, opening_hours, bill_payment_methods").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("Restaurante não encontrado ou sem acesso");
  // Consultas separadas para não derrubar o painel se as migrações 0021, 0024 e 0025 ainda não rodaram.
  const { data: rv, error: rvErr } = await supabase.from("restaurants").select("google_review_url").eq("id", data.id).maybeSingle();
  data.google_review_url = rvErr ? null : (rv?.google_review_url ?? null);
  const { data: so, error: soErr } = await supabase.from("restaurants").select("self_order_enabled").eq("id", data.id).maybeSingle();
  data.self_order_enabled = soErr ? false : (so?.self_order_enabled ?? false);
  const { data: om, error: omErr } = await supabase.from("restaurants").select("order_session_mode").eq("id", data.id).maybeSingle();
  data.order_session_mode = omErr ? "staff_opens" : (om?.order_session_mode ?? "staff_opens");
  const { data: tt, error: ttErr } = await supabase.from("restaurants").select("totem_enabled").eq("id", data.id).maybeSingle();
  data.totem_enabled = ttErr ? false : (tt?.totem_enabled ?? false);
  return data as { id: string; slug: string; name: string; pos_provider: string; pos_mode: string; service_rate: number; phone: string | null; address: string | null; opening_hours: string | null; bill_payment_methods: string[]; google_review_url: string | null; self_order_enabled: boolean; order_session_mode: "staff_opens" | "table_code"; totem_enabled: boolean };
}
const err = (m: string, fb: string) => {
  for (const k of ["Sem permissão", "Já existe", "Abra o caixa", "Nenhum caixa", "Valor inválido", "Valor contado inválido", "Escolha outra", "Há pagamentos", "Mesa inativa", "Informe o motivo", "Quantidade"]) if (m.includes(k)) return m;
  return fb;
};

// Dados operacionais: caixa, cozinha/bar (hoje), estornos, integração
export type CashExpected = { opening: number; deposits: number; withdrawals: number; counterCash: number; counterCard: number; counterPix: number; tableCash: number; tableCard: number; expectedCash: number; expectedCard: number };

function toCashExpected(j: Record<string, unknown>): CashExpected {
  const n = (k: string) => Number(j[k] ?? 0);
  return { opening: n("opening"), deposits: n("deposits"), withdrawals: n("withdrawals"), counterCash: n("counter_cash"), counterCard: n("counter_card"), counterPix: n("counter_pix"), tableCash: n("table_cash"), tableCard: n("table_card"), expectedCash: n("expected_cash"), expectedCard: n("expected_card") };
}

export const getOpsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const r = await rest(sb, data.slug);
    const since = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
    const [session, kds, integ, log] = await Promise.all([
      sb.from("cash_sessions").select("*").eq("restaurant_id", r.id).is("closed_at", null).maybeSingle(),
      sb.from("pdv_order_items").select("id, item_name, quantity, notes, sector, status, created_at, order_id, pdv_orders(table_number, channel, ticket_number, customer_name, created_at)").eq("restaurant_id", r.id).in("status", ["received", "preparing", "ready"]).gte("created_at", since).order("created_at"),
      sb.from("pos_integrations").select("provider, key_prefix, status, last_sync_at").eq("restaurant_id", r.id).maybeSingle(),
      sb.from("pos_sync_log").select("id, event, status, detail, created_at").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(20),
    ]);
    let movements: any[] = [];
    let received = 0;
    // Esperado do caixa calculado no banco (cash_expected). Só dono e caixa leem; sem
    // permissão ou antes da migração 0033 fica null e a tela não mostra o fechamento.
    let expected: CashExpected | null = null;
    // Vendas no balcão deste caixa (canceladas ficam de fora dos totais, mas aparecem na lista).
    let counterOrders: { id: string; ticket: number; customer: string | null; method: string; total: number; change: number | null; at: string; cancelled: boolean; ready: boolean; pickedUp: boolean }[] = [];
    const counter = { total: 0, cash: 0, card: 0, pix: 0, count: 0 };
    if (session.data) {
      const [mv, pays, orders, exp] = await Promise.all([
        sb.from("cash_movements").select("id, kind, amount, reason, created_at").eq("session_id", session.data.id).order("created_at"),
        sb.from("payment_audit_log").select("amount").eq("restaurant_slug", data.slug).eq("action", "confirm").gte("created_at", session.data.opened_at),
        sb.from("pdv_orders").select("id, ticket_number, customer_name, payment_method, total, change_due, created_at, cancelled_at, called_at, picked_up_at").eq("cash_session_id", session.data.id).order("created_at", { ascending: false }).limit(200),
        sb.rpc("cash_expected" as never, { p_slug: data.slug } as never) as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>,
      ]);
      expected = exp.error || !exp.data ? null : toCashExpected(exp.data);
      movements = (mv.data ?? []).map((m) => ({ ...m, amount: Number(m.amount) }));
      received = (pays.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
      counterOrders = (orders.data ?? []).map((o) => ({
        id: o.id, ticket: o.ticket_number ?? 0, customer: o.customer_name, method: o.payment_method ?? "", total: Number(o.total ?? 0),
        change: o.change_due === null ? null : Number(o.change_due), at: o.created_at, cancelled: !!o.cancelled_at, ready: !!o.called_at, pickedUp: !!o.picked_up_at,
      }));
      for (const o of counterOrders) {
        if (o.cancelled) continue;
        counter.total += o.total; counter.count += 1;
        if (o.method === "cash" || o.method === "card" || o.method === "pix") counter[o.method] += o.total;
      }
    }
    // Pedidos do totem aguardando o caixa cobrar (ainda não foram para a cozinha).
    const { data: totemRows } = await sb.from("pdv_orders")
      .select("id, ticket_number, customer_name, total, created_at, pdv_order_items(item_name, quantity)")
      .eq("restaurant_id", r.id).eq("channel", "totem").is("cash_session_id", null).is("cancelled_at", null)
      .gte("created_at", since).order("created_at", { ascending: true }).limit(50);
    const totemPending = (totemRows ?? []).map((o: any) => ({
      id: o.id as string, ticket: (o.ticket_number as number | null) ?? 0, customer: (o.customer_name as string | null),
      total: Number(o.total ?? 0), at: o.created_at as string,
      items: ((o.pdv_order_items ?? []) as { item_name: string; quantity: number }[]).map((i) => ({ name: i.item_name, qty: i.quantity })),
    }));
    return {
      totemPending,
      restaurant: { ...r, service_rate: Number(r.service_rate) },
      session: session.data ? { ...session.data, opening_amount: Number(session.data.opening_amount) } : null,
      movements, received, counter, counterOrders, expected,
      kds: (kds.data ?? []).map((k: any) => ({
        id: k.id, item_name: k.item_name, quantity: k.quantity, notes: k.notes, sector: k.sector as "kitchen" | "bar", status: k.status as "received" | "preparing" | "ready", created_at: k.created_at,
        order_id: k.order_id as string, table: (k.pdv_orders?.table_number as string | null) ?? null, channel: (k.pdv_orders?.channel as string | undefined) ?? "mesa",
        ticket: (k.pdv_orders?.ticket_number as number | null) ?? null, customer: (k.pdv_orders?.customer_name as string | null) ?? null, order_at: (k.pdv_orders?.created_at as string | undefined) ?? k.created_at,
      })),
      integration: integ.data,
      syncLog: log.data ?? [],
    };
  });

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, days: z.number().int().min(1).max(90) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const r = await rest(sb, data.slug);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const [items, pays, arch, voids, waiters, waivers] = await Promise.all([
      sb.from("pdv_order_items").select("item_code, item_name, unit_price, quantity, created_at, pdv_orders(waiter_id, table_number, channel)").eq("restaurant_id", r.id).neq("status", "cancelled").gte("created_at", since).limit(5000),
      sb.from("table_payment_requests").select("id, table_number, customer_name, payment_method, payment_target, amount, status, created_at, waiter_id, service_fee_amount").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("archived_payments").select("id, table_number, customer_name, payment_method, payment_target, amount, status, created_at, waiter_id, service_fee_amount").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("pdv_voids").select("item_name, quantity, unit_price, reason, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
      sb.from("pdv_waiters").select("id, name").eq("restaurant_id", r.id),
      sb.from("service_fee_waivers").select("table_number, reason, waived_amount, actor_name, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
    ]);
    return {
      feeWaivers: (waivers.data ?? []).map((w) => ({ table: w.table_number, reason: w.reason, amount: Number(w.waived_amount), by: w.actor_name ?? "Equipe", at: w.created_at })),
      items: (items.data ?? []).map((i: any) => ({ code: i.item_code, name: i.item_name, price: Number(i.unit_price), qty: i.quantity, at: i.created_at, waiter: i.pdv_orders?.waiter_id as string | null, table: (i.pdv_orders?.table_number as string | null) ?? "Balcão", channel: (i.pdv_orders?.channel as string | undefined) ?? "mesa" })),
      payments: [...(pays.data ?? []), ...(arch.data ?? [])].filter((p) => p.status === "approved").map((p) => ({ method: p.payment_method, target: p.payment_target, amount: Number(p.amount), at: p.created_at, waiter: p.waiter_id as string | null, serviceFee: Number(p.service_fee_amount ?? 0) })),
      // Pagamentos da conta em todos os estados, para a lista com filtros e a planilha.
      billPayments: [...(pays.data ?? []), ...(arch.data ?? [])].filter((p) => p.payment_target === "restaurant").sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => ({ id: p.id, table: p.table_number, customer: p.customer_name, method: p.payment_method, status: p.status as PaymentStatus, amount: Number(p.amount), at: p.created_at, waiter: p.waiter_id as string | null })),
      voids: (voids.data ?? []).map((v) => ({ ...v, unit_price: Number(v.unit_price) })),
      waiters: waiters.data ?? [],
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, name: z.string().trim().min(2).max(80), serviceRate: z.number().min(0).max(0.2),
    phone: z.string().trim().max(30), address: z.string().trim().max(160), openingHours: z.string().trim().max(120),
    billMethods: z.array(z.enum(["pix", "apple_pay", "google_pay", "at_establishment"])).min(1, "Escolha ao menos um meio de pagamento").max(4),
    googleReviewUrl: z.string().trim().max(300).optional(),
    selfOrder: z.boolean().optional(),
    orderSessionMode: z.enum(["staff_opens", "table_code"]).optional(),
    totem: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { isGoogleReviewUrl } = await import("./rules");
    const review = data.googleReviewUrl ? data.googleReviewUrl : null;
    if (review && !isGoogleReviewUrl(review)) throw new Error("Valor inválido: use o link de avaliação do Google (começa com https://g.page/ ou https://maps.app.goo.gl/, por exemplo)");
    const { data: rows, error } = await context.supabase.from("restaurants").update({ name: data.name, service_rate: data.serviceRate, phone: data.phone || null, address: data.address || null, opening_hours: data.openingHours || null, bill_payment_methods: Array.from(new Set(data.billMethods)), ...(data.googleReviewUrl !== undefined ? { google_review_url: review } : {}), ...(data.orderSessionMode !== undefined ? { order_session_mode: data.orderSessionMode } : {}), ...(data.selfOrder !== undefined ? { self_order_enabled: data.selfOrder } : {}), ...(data.totem !== undefined ? { totem_enabled: data.totem } : {}) }).eq("slug", data.slug).select("id");
    if (error || !rows?.length) throw new Error("Somente o dono pode alterar as configurações");
    return { ok: true };
  });

export const transferTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, from: z.string().max(16), to: z.string().max(16) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_transfer_table", { p_slug: data.slug, p_from: data.from, p_to: data.to });
    if (error) throw new Error(err(error.message, "Não foi possível transferir"));
    return { ok: true };
  });

export const setItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["received", "preparing", "ready", "delivered"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_set_item_status", { p_item: data.id, p_status: data.status });
    if (error) throw new Error(err(error.message, "Não foi possível atualizar"));
    return { ok: true };
  });

export const cashAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.discriminatedUnion("action", [
    z.object({ action: z.literal("open"), slug: Slug, amount: z.number().min(0).max(100000) }),
    z.object({ action: z.literal("move"), slug: Slug, kind: z.enum(["withdrawal", "deposit"]), amount: z.number().positive().max(100000), reason: z.string().trim().max(140) }),
    // Fechamento: só a contagem vem do navegador; esperado e diferença são do servidor.
    z.object({ action: z.literal("close"), slug: Slug, countedCash: z.number().min(0).max(1000000), countedCard: z.number().min(0).max(1000000), notes: z.string().max(300) }),
  ]).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.action === "close") {
      const res = await (sb.rpc("cash_close_counted" as never, { p_slug: data.slug, p_counted_cash: data.countedCash, p_counted_card: data.countedCard, p_notes: data.notes } as never) as unknown as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>);
      if (res.error) throw new Error(err(res.error.message, "Não foi possível fechar o caixa"));
      const fechamento = res.data ? toCashExpected(res.data) : null;
      return { ok: true, differenceCash: Number(res.data?.["difference_cash"] ?? 0), differenceCard: Number(res.data?.["difference_card"] ?? 0), expected: fechamento };
    }
    const res = data.action === "open" ? await sb.rpc("cash_open", { p_slug: data.slug, p_amount: data.amount })
      : await sb.rpc("cash_move", { p_slug: data.slug, p_kind: data.kind, p_amount: data.amount, p_reason: data.reason });
    if (res.error) throw new Error(err(res.error.message, "Não foi possível concluir"));
    return { ok: true };
  });


export const setIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, provider: z.string().regex(/^[a-z0-9-]{2,40}$/), newKey: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    let key: string | null = null, hash: string | null = null, prefix: string | null = null;
    if (data.provider !== "tipe" && data.newKey) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      key = "tipe_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
      hash = Array.from(new Uint8Array(dig), (b) => b.toString(16).padStart(2, "0")).join("");
      prefix = key.slice(0, 10);
    }
    const { error } = await context.supabase.rpc("pos_integration_set", { p_slug: data.slug, p_provider: data.provider, p_key_hash: hash as any, p_key_prefix: prefix as any });
    if (error) throw new Error(err(error.message, "Não foi possível salvar a integração"));
    return { key };
  });

// Fechamento do dia (dono ou caixa): pagamentos da conta, inclusive de mesas já reabertas.
export const getDailyClose = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const r = await rest(sb, data.slug);
    const { data: allowed } = await sb.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: r.id, _roles: ["owner", "cashier"] });
    if (!allowed) throw new Error("Sem permissão: o fechamento é do dono ou do caixa");
    const { businessDayRange, dailyCloseCsv, buildDailyClose } = await import("./daily-close");
    const { start, end } = businessDayRange(data.date);
    const cols = "id, created_at, table_number, customer_name, payment_method, establishment_method, status, amount, service_fee_amount, payment_target";
    const [cur, arch, inc] = await Promise.all([
      sb.from("table_payment_requests").select(cols).eq("restaurant_slug", data.slug).eq("payment_target", "restaurant").gte("created_at", start).lt("created_at", end),
      sb.from("archived_payments").select(cols).eq("restaurant_slug", data.slug).eq("payment_target", "restaurant").gte("created_at", start).lt("created_at", end),
      sb.from("payment_incidents" as never).select("kind, amount, resolved_at").eq("restaurant_id" as never, r.id as never).gte("created_at" as never, start as never).lt("created_at" as never, end as never) as unknown as Promise<{ data: { kind: string; amount: number | null; resolved_at: string | null }[] | null }>,
    ]);
    if (cur.error || arch.error) throw new Error("Não foi possível montar o fechamento");
    const seen = new Set<string>();
    const payments = [...(cur.data ?? []), ...(arch.data ?? [])].filter((p) => !seen.has(p.id) && seen.add(p.id)).map((p) => ({
      id: p.id, created_at: p.created_at, table_number: p.table_number, customer_name: p.customer_name, payment_method: p.payment_method,
      establishment_method: p.establishment_method ?? null, status: p.status, amount: Number(p.amount), service_fee_amount: p.service_fee_amount === null ? null : Number(p.service_fee_amount),
    }));
    const incidents = (inc.data ?? []).map((i) => ({ kind: i.kind, amount: i.amount === null ? null : Number(i.amount), resolved: !!i.resolved_at }));
    return { summary: buildDailyClose(payments, incidents), csv: dailyCloseCsv(r.name, data.date, payments, incidents) };
  });

