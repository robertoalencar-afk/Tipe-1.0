import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Lançamento TIPE (adaptador manual). Integrações externas entram pelos
// adaptadores em src/lib/tipe/pdv e escrevem no mesmo modelo canônico.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export type PublicTable = {
  restaurantName: string;
  tableNumber: string;
  waiterName: string;
  session: string;
  billMethods: string[];
  items: { item_code: string; item_name: string; unit_price: number; ordered_quantity: number; reserved_portion: number; paid_portion: number; ordered_at: string }[];
  payments: { id: string; customer_name: string; payment_method: string; status: "pending" | "approved" | "cancelled" | "failed"; amount: number; item_quantities: Record<string, number>; created_at: string; establishment_method: string | null; cash_received: number | null; change_due: number | null }[];
};

// Leitura pública da mesa pelo cliente (link do QR). Nunca expõe dados da equipe.
export const getPublicTable = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, code: z.string().min(1).max(32), token: z.string().max(64).optional(), session: z.string().max(96).optional() }).parse(d))
  .handler(async ({ data }): Promise<PublicTable | { error: "not_found" | "invalid_token" | "inactive" }> => {
    const { enforceRate, clientIp, safeEqual, logSecurityEvent } = await import("./security.server");
    // Limite generoso: vários clientes podem compartilhar o Wi-Fi do restaurante (mesmo IP).
    await enforceRate(`qr:${data.slug}:${data.code}:${clientIp()}`, 90, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, name, bill_payment_methods").eq("slug", data.slug).maybeSingle();
    if (!r) return { error: "not_found" };
    const { data: t } = await supabaseAdmin.from("restaurant_tables").select("number, active, access_token, waiter_id, session_token" as never).eq("restaurant_id", r.id).eq("code", data.code.toLowerCase()).maybeSingle() as unknown as { data: { number: string; active: boolean; access_token: string; waiter_id: string | null; session_token: string } | null };
    if (!t) return { error: "not_found" };
    if (!t.active) return { error: "inactive" };
    // Autoriza com o token do QR da mesa (físico) OU com a sessão da conta ativa.
    const viaQr = !!data.token && safeEqual(data.token, t.access_token);
    const viaSession = !!data.session && safeEqual(data.session, t.session_token);
    if (!viaQr && !viaSession) {
      await logSecurityEvent({ action: "table_token_denied", resource: `mesa:${t.number}`, result: "denied", restaurantSlug: data.slug, restaurantId: r.id, detail: `ip=${clientIp()}` });
      return { error: "invalid_token" };
    }
    const [items, payments, waiter] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("item_code, item_name, unit_price, ordered_quantity, reserved_portion, paid_portion, ordered_at")
        .eq("restaurant_slug", data.slug).eq("table_number", t.number).order("ordered_at"),
      supabaseAdmin.from("table_payment_requests").select("id, customer_name, payment_method, status, amount, item_quantities, created_at, establishment_method, cash_received, change_due")
        .eq("restaurant_slug", data.slug).eq("table_number", t.number).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
      t.waiter_id ? supabaseAdmin.from("pdv_waiters").select("name").eq("id", t.waiter_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (items.error || payments.error) throw new Error("Não foi possível atualizar a mesa");
    return {
      restaurantName: r.name,
      tableNumber: t.number,
      session: t.session_token,
      billMethods: (r as { bill_payment_methods?: string[] }).bill_payment_methods ?? ["pix", "apple_pay", "google_pay", "at_establishment"],
      waiterName: (waiter.data as { name: string } | null)?.name?.split(" ")[0] ?? "",
      items: (items.data ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price), ordered_quantity: Number(i.ordered_quantity), reserved_portion: Number(i.reserved_portion), paid_portion: Number(i.paid_portion) })),
      payments: (payments.data ?? []).map((p) => ({ ...p, amount: Number(p.amount), cash_received: p.cash_received === null ? null : Number(p.cash_received), change_due: p.change_due === null ? null : Number(p.change_due), item_quantities: (p.item_quantities ?? {}) as Record<string, number> })) as PublicTable["payments"],
    };
  });

async function restaurantId(supabase: any, slug: string) {
  const { data } = await supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("Restaurante não encontrado ou sem acesso");
  return data.id as string;
}

const friendly = (msg: string, fallback: string) => {
  for (const k of ["Sem permissão", "Mesa inativa", "Garçom inválido", "Pedido vazio", "Item indisponível", "Quantidade", "Há pagamentos", "Informe o motivo"]) if (msg.includes(k)) return msg;
  return fallback;
};

export const getPdvData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const [cats, items, waiters, tables] = await Promise.all([
      context.supabase.from("pdv_menu_categories").select("id, name, position").eq("restaurant_id", rid).order("position"),
      context.supabase.from("pdv_menu_items").select("id, category_id, code, name, price, available, position, sector, description").eq("restaurant_id", rid).order("position"),
      context.supabase.from("pdv_waiters").select("id, code, name, active, email, user_id").eq("restaurant_id", rid).order("code"),
      context.supabase.from("restaurant_tables").select("id, number, code, active, access_token, waiter_id").eq("restaurant_id", rid),
    ]);
    return {
      categories: cats.data ?? [],
      items: (items.data ?? []).map((i) => ({ ...i, price: Number(i.price) })),
      waiters: waiters.data ?? [],
      tables: (tables.data ?? []).sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number)),
    };
  });

export const launchOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, table: z.string().min(1).max(16), waiterId: z.string().uuid(),
    items: z.array(z.object({ code: z.string().min(1).max(16), qty: z.number().int().min(1).max(99), notes: z.string().max(140).optional() })).min(1).max(60),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_launch_order", { p_slug: data.slug, p_table: data.table, p_waiter: data.waiterId, p_items: data.items });
    if (error) throw new Error(friendly(error.message, "Não foi possível lançar o pedido"));
    return { ok: true };
  });

export const voidItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: z.string().max(16), code: z.string().max(16), qty: z.number().int().min(1).max(99), reason: z.string().trim().min(3).max(140) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_void_item", { p_slug: data.slug, p_table: data.table, p_code: data.code, p_qty: data.qty, p_reason: data.reason });
    if (error) throw new Error(friendly(error.message, "Não foi possível estornar"));
    return { ok: true };
  });

export const closeTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: z.string().max(16) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_close_table", { p_slug: data.slug, p_table: data.table });
    if (error) throw new Error(friendly(error.message, "Não foi possível fechar a mesa"));
    return { ok: true };
  });

export const addTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, number: z.string().trim().min(1).max(8).regex(/^[0-9A-Za-z]+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const { error } = await context.supabase.from("restaurant_tables").insert({ restaurant_id: rid, number: data.number, code: `mesa${data.number.toLowerCase()}` });
    if (error) throw new Error(error.code === "23505" ? "Essa mesa já existe" : "Somente o dono pode cadastrar mesas");
    return { ok: true };
  });

export const updateTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean().optional(), regenerate: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: { active?: boolean; access_token?: string } = {};
    if (data.active !== undefined) patch.active = data.active;
    if (data.regenerate) patch.access_token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { data: rows, error } = await context.supabase.from("restaurant_tables").update(patch).eq("id", data.id).select("id");
    if (error || !rows?.length) throw new Error("Somente o dono pode alterar mesas");
    return { ok: true };
  });

export const saveMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, id: z.string().uuid().optional(), categoryId: z.string().uuid().nullable(),
    code: z.string().trim().min(1).max(16), name: z.string().trim().min(2).max(80), price: z.number().min(0).max(10000), available: z.boolean(),
    sector: z.enum(["kitchen", "bar"]).optional(), description: z.string().trim().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const row = { restaurant_id: rid, category_id: data.categoryId, code: data.code.toUpperCase(), name: data.name, price: data.price, available: data.available, ...(data.sector ? { sector: data.sector } : {}), ...(data.description !== undefined ? { description: data.description || null } : {}) };
    const q = data.id
      ? context.supabase.from("pdv_menu_items").update(row).eq("id", data.id).select("id")
      : context.supabase.from("pdv_menu_items").insert(row).select("id");
    const { data: rows, error } = await q;
    if (error || !rows?.length) throw new Error(error?.code === "23505" ? "Código já usado" : "Somente o dono pode editar o cardápio");
    return { ok: true };
  });

export const saveWaiter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid().optional(), code: z.string().trim().min(1).max(8), name: z.string().trim().min(2).max(80), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const row = { restaurant_id: rid, code: data.code.toUpperCase(), name: data.name, active: data.active };
    const q = data.id
      ? context.supabase.from("pdv_waiters").update(row).eq("id", data.id).select("id")
      : context.supabase.from("pdv_waiters").insert(row).select("id");
    const { data: rows, error } = await q;
    if (error || !rows?.length) throw new Error(error?.code === "23505" ? "Código já usado" : "Somente o dono pode editar garçons");
    return { ok: true };
  });

export const addTablesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, from: z.number().int().min(1).max(999), to: z.number().int().min(1).max(999) }).refine((x) => x.to >= x.from && x.to - x.from < 100).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const { data: existing } = await context.supabase.from("restaurant_tables").select("number").eq("restaurant_id", rid);
    const have = new Set((existing ?? []).map((t: { number: string }) => t.number));
    const rows = [];
    for (let n = data.from; n <= data.to; n++) if (!have.has(String(n))) rows.push({ restaurant_id: rid, number: String(n), code: `mesa${n}` });
    if (!rows.length) return { created: 0 };
    const { error } = await context.supabase.from("restaurant_tables").insert(rows);
    if (error) throw new Error("Somente o dono pode cadastrar mesas");
    return { created: rows.length };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid().optional(), name: z.string().trim().min(2).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const q = data.id
      ? context.supabase.from("pdv_menu_categories").update({ name: data.name }).eq("id", data.id).select("id")
      : context.supabase.from("pdv_menu_categories").insert({ restaurant_id: rid, name: data.name, position: 99 }).select("id");
    const { data: rows, error } = await q;
    if (error || !rows?.length) throw new Error("Somente o dono pode editar categorias");
    return { ok: true };
  });
