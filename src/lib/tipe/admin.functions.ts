import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

async function rest(supabase: any, slug: string) {
  const { data } = await supabase.from("restaurants").select("id, slug, name, pos_provider, pos_mode, service_rate, phone, address, opening_hours").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("Restaurante não encontrado ou sem acesso");
  return data as { id: string; slug: string; name: string; pos_provider: string; pos_mode: string; service_rate: number; phone: string | null; address: string | null; opening_hours: string | null };
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
    const [items, pays, arch, voids, waiters] = await Promise.all([
      sb.from("pdv_order_items").select("item_code, item_name, unit_price, quantity, created_at, pdv_orders(waiter_id, table_number)").eq("restaurant_id", r.id).gte("created_at", since).limit(5000),
      sb.from("table_payment_requests").select("payment_method, payment_target, amount, status, created_at").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("archived_payments").select("payment_method, payment_target, amount, status, created_at").eq("restaurant_slug", data.slug).gte("created_at", since),
      sb.from("pdv_voids").select("item_name, quantity, unit_price, reason, created_at").eq("restaurant_id", r.id).gte("created_at", since).order("created_at", { ascending: false }),
      sb.from("pdv_waiters").select("id, name").eq("restaurant_id", r.id),
    ]);
    return {
      items: (items.data ?? []).map((i: any) => ({ code: i.item_code, name: i.item_name, price: Number(i.unit_price), qty: i.quantity, at: i.created_at, waiter: i.pdv_orders?.waiter_id as string | null, table: i.pdv_orders?.table_number as string })),
      payments: [...(pays.data ?? []), ...(arch.data ?? [])].filter((p) => p.status === "approved").map((p) => ({ method: p.payment_method, target: p.payment_target, amount: Number(p.amount), at: p.created_at })),
      voids: (voids.data ?? []).map((v) => ({ ...v, unit_price: Number(v.unit_price) })),
      waiters: waiters.data ?? [],
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, name: z.string().trim().min(2).max(80), serviceRate: z.number().min(0).max(0.3),
    phone: z.string().trim().max(30), address: z.string().trim().max(160), openingHours: z.string().trim().max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("restaurants").update({ name: data.name, service_rate: data.serviceRate, phone: data.phone || null, address: data.address || null, opening_hours: data.openingHours || null }).eq("slug", data.slug).select("id");
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

const PROVIDERS = ["tipe", "saipos", "totvs", "consumer", "goomer", "anotaai", "linx", "colibri", "outro"] as const;

export const setIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, provider: z.enum(PROVIDERS), newKey: z.boolean() }).parse(d))
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
