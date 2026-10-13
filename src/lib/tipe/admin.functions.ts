import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

async function rest(supabase: any, slug: string) {
  const { data } = await supabase.from("restaurants").select("id, slug, name, pos_provider, pos_mode, service_rate, phone, address, opening_hours, bill_payment_methods").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("Restaurante não encontrado ou sem acesso");
  // Consulta separada para não derrubar o painel se a migração 0021 ainda não rodou.
  const { data: rv, error: rvErr } = await supabase.from("restaurants").select("google_review_url").eq("id", data.id).maybeSingle();
  data.google_review_url = rvErr ? null : (rv?.google_review_url ?? null);
  return data as { id: string; slug: string; name: string; pos_provider: string; pos_mode: string; service_rate: number; phone: string | null; address: string | null; opening_hours: string | null; bill_payment_methods: string[]; google_review_url: string | null };
}
const err = (m: string, fb: string) => {
  for (const k of ["Sem permissão", "Já existe", "Abra o caixa", "Nenhum caixa", "Valor inválido", "Escolha outra", "Há pagamentos", "Mesa inativa", "Informe o motivo", "Quantidade"]) if (m.includes(k)) return m;
  return fb;
};

// Dados operacionais: caixa, cozinha/bar (hoje), estornos, integração
export const getOpsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const r = await rest(sb, data.slug);
    const since = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
    const [session, kds, integ, log] = await Promise.all([
      sb.from("cash_sessions").select("*").eq("restaurant_id", r.id).is("closed_at", null).maybeSingle(),
      sb.from("pdv_order_items").select("id, item_name, quantity, notes, sector, status, created_at, order_id, pdv_orders(table_number)").eq("restaurant_id", r.id).neq("status", "delivered").gte("created_at", since).order("created_at"),
      sb.from("pos_integrations").select("provider, key_prefix, status, last_sync_at").eq("restaurant_id", r.id).maybeSingle(),
      sb.from("pos_sync_log").select("id, event, status, detail, created_at").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(20),
    ]);
    let movements: any[] = [];
    let received = 0;
    if (session.data) {
      const [mv, pays] = await Promise.all([
        sb.from("cash_movements").select("id, kind, amount, reason, created_at").eq("session_id", session.data.id).order("created_at"),
        sb.from("payment_audit_log").select("amount").eq("restaurant_slug", data.slug).eq("action", "confirm").gte("created_at", session.data.opened_at),
      ]);
      movements = (mv.data ?? []).map((m) => ({ ...m, amount: Number(m.amount) }));
      received = (pays.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
    }
    return {
      restaurant: { ...r, service_rate: Number(r.service_rate) },
      session: session.data ? { ...session.data, opening_amount: Number(session.data.opening_amount) } : null,
      movements, received,
      kds: (kds.data ?? []).map((k: any) => ({ id: k.id, item_name: k.item_name, quantity: k.quantity, notes: k.notes, sector: k.sector, status: k.status, created_at: k.created_at, table: k.pdv_orders?.table_number ?? "?" })),
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
      sb.from("pdv_order_items").select("item_code, item_name, unit_price, quantity, created_at, pdv_orders(waiter_id, table_number)").eq("restaurant_id", r.id).gte("created_at", since).limit(5000),
      sb.from("table_payment_requests").select("payment_method, payment_target, amount, status, created_at, waiter_id, service_fee_amount").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("archived_payments").select("payment_method, payment_target, amount, status, created_at, waiter_id, service_fee_amount").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("pdv_voids").select("item_name, quantity, unit_price, reason, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
      sb.from("pdv_waiters").select("id, name").eq("restaurant_id", r.id),
      sb.from("service_fee_waivers").select("table_number, reason, waived_amount, actor_name, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
    ]);
    return {
      feeWaivers: (waivers.data ?? []).map((w) => ({ table: w.table_number, reason: w.reason, amount: Number(w.waived_amount), by: w.actor_name ?? "Equipe", at: w.created_at })),
      items: (items.data ?? []).map((i: any) => ({ code: i.item_code, name: i.item_name, price: Number(i.unit_price), qty: i.quantity, at: i.created_at, waiter: i.pdv_orders?.waiter_id as string | null, table: i.pdv_orders?.table_number as string })),
      payments: [...(pays.data ?? []), ...(arch.data ?? [])].filter((p) => p.status === "approved").map((p) => ({ method: p.payment_method, target: p.payment_target, amount: Number(p.amount), at: p.created_at, waiter: p.waiter_id as string | null, serviceFee: Number(p.service_fee_amount ?? 0) })),
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
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { isGoogleReviewUrl } = await import("./rules");
    const review = data.googleReviewUrl ? data.googleReviewUrl : null;
    if (review && !isGoogleReviewUrl(review)) throw new Error("Valor inválido: use o link de avaliação do Google (começa com https://g.page/ ou https://maps.app.goo.gl/, por exemplo)");
    const { data: rows, error } = await context.supabase.from("restaurants").update({ name: data.name, service_rate: data.serviceRate, phone: data.phone || null, address: data.address || null, opening_hours: data.openingHours || null, bill_payment_methods: Array.from(new Set(data.billMethods)), ...(data.googleReviewUrl !== undefined ? { google_review_url: review } : {}) }).eq("slug", data.slug).select("id");
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
    z.object({ action: z.literal("close"), slug: Slug, counted: z.number().min(0).max(1000000), expected: z.number().min(-1000000).max(1000000), notes: z.string().max(300) }),
  ]).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const res = data.action === "open" ? await sb.rpc("cash_open", { p_slug: data.slug, p_amount: data.amount })
      : data.action === "move" ? await sb.rpc("cash_move", { p_slug: data.slug, p_kind: data.kind, p_amount: data.amount, p_reason: data.reason })
      : await sb.rpc("cash_close", { p_slug: data.slug, p_counted: data.counted, p_expected: data.expected, p_notes: data.notes });
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

