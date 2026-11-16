import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Estações da cozinha e do bar. Cada tela (PC, tablet, monitor) abre um link criado pelo
// dono ou gerente. O link carrega um token que só aparece na criação: o banco guarda o hash.
// A estação não tem usuário nem senha, e só enxerga e move os pedidos do seu setor.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const Setor = z.enum(["kitchen", "bar", "all"]);

export type Station = {
  id: string;
  name: string;
  sector: "kitchen" | "bar" | "all";
  active: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export type StationItem = {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
  sector: "kitchen" | "bar";
  status: "received" | "preparing" | "ready";
  created_at: string;
  order_id: string;
  table: string | null;
  channel: string;
  ticket: number | null;
  customer: string | null;
  order_at: string;
};

async function sha256(token: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(token).digest("hex");
}

/** Só dono e gerente criam e gerenciam estações. */
async function exigirAdmin(ctx: { supabase: { rpc: (...a: never[]) => unknown }; userId: string }, slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r } = await supabaseAdmin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = (await (ctx.supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ data: boolean | null }>)(
    "has_restaurant_role",
    { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner", "manager"] },
  ));
  if (!ok) throw new Error("Sem permissão: só dono e gerente criam links de cozinha e bar");
  return { db: supabaseAdmin, rid: r.id as string };
}

export const listStations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }): Promise<Station[]> => {
    const { db, rid } = await exigirAdmin(context as never, data.slug);
    const { data: rows, error } = await db
      .from("pdv_stations" as never)
      .select("id, name, sector, active, last_seen_at, created_at")
      .eq("restaurant_id", rid)
      .order("created_at");
    if (error) throw new Error("Não foi possível carregar as estações");
    return ((rows ?? []) as unknown as { id: string; name: string; sector: Station["sector"]; active: boolean; last_seen_at: string | null; created_at: string }[]).map((s) => ({
      id: s.id, name: s.name, sector: s.sector, active: s.active, lastSeenAt: s.last_seen_at, createdAt: s.created_at,
    }));
  });

/** Cria a estação e devolve o link UMA vez. Para gerar outro link, use rotateStation. */
export const createStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, name: z.string().trim().min(2).max(40), sector: Setor }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, rid } = await exigirAdmin(context as never, data.slug);
    const { count } = await db.from("pdv_stations" as never).select("id", { count: "exact", head: true }).eq("restaurant_id", rid);
    if ((count ?? 0) >= 20) throw new Error("Limite de 20 estações por restaurante");
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(24).toString("hex");
    const { data: row, error } = await db
      .from("pdv_stations" as never)
      .insert({ restaurant_id: rid, name: data.name, sector: data.sector, token_hash: await sha256(token), created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível criar a estação");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "station_created", resource: "pdv_stations", restaurantSlug: data.slug, restaurantId: rid, actorId: context.userId, detail: `${data.sector}:${data.name}` });
    return { id: (row as unknown as { id: string }).id, token };
  });

/** Novo link: o anterior para de funcionar na hora. */
export const rotateStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, rid } = await exigirAdmin(context as never, data.slug);
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(24).toString("hex");
    const { error, data: rows } = await db
      .from("pdv_stations" as never)
      .update({ token_hash: await sha256(token), active: true } as never)
      .eq("id", data.id).eq("restaurant_id", rid).select("id");
    if (error || !rows || (rows as unknown[]).length === 0) throw new Error("Estação não encontrada");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "station_rotated", resource: "pdv_stations", restaurantSlug: data.slug, restaurantId: rid, actorId: context.userId, detail: data.id });
    return { token };
  });

export const setStationActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, rid } = await exigirAdmin(context as never, data.slug);
    const { error } = await db.from("pdv_stations" as never).update({ active: data.active } as never).eq("id", data.id).eq("restaurant_id", rid);
    if (error) throw new Error("Não foi possível atualizar a estação");
    return { ok: true };
  });

export const deleteStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, rid } = await exigirAdmin(context as never, data.slug);
    const { error } = await db.from("pdv_stations" as never).delete().eq("id", data.id).eq("restaurant_id", rid);
    if (error) throw new Error("Não foi possível remover a estação");
    return { ok: true };
  });

/** Valida o token da estação. Devolve restaurante e setor, ou null (sem revelar o motivo). */
async function estacaoPorToken(slug: string, token: string) {
  const { enforceRate, clientIp, logSecurityEvent } = await import("./security.server");
  await enforceRate(`estacao:${slug}:${clientIp()}`, 240, 60, slug);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r } = await supabaseAdmin.from("restaurants").select("id, name").eq("slug", slug).maybeSingle();
  if (!r) return null;
  const { data: st } = await supabaseAdmin
    .from("pdv_stations" as never)
    .select("id, name, sector, active")
    .eq("restaurant_id", r.id)
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  const s = st as unknown as { id: string; name: string; sector: Station["sector"]; active: boolean } | null;
  if (!s || !s.active) {
    await logSecurityEvent({ action: "station_token_denied", resource: "pdv_stations", result: "denied", restaurantSlug: slug, restaurantId: r.id, detail: `ip=${clientIp()}` });
    return null;
  }
  void supabaseAdmin.from("pdv_stations" as never).update({ last_seen_at: new Date().toISOString() } as never).eq("id", s.id);
  return { db: supabaseAdmin, rid: r.id as string, restaurantName: r.name as string, station: s };
}

export type StationBoard = {
  restaurantName: string;
  stationName: string;
  sector: "kitchen" | "bar" | "all";
  items: StationItem[];
};

/** Fila da estação: só itens do setor dela, de pedidos ainda não entregues. */
export const getStationBoard = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, token: z.string().min(32).max(64) }).parse(d))
  .handler(async ({ data }): Promise<StationBoard | { error: "invalid" }> => {
    const e = await estacaoPorToken(data.slug, data.token);
    if (!e) return { error: "invalid" };
    const since = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
    let q = e.db
      .from("pdv_order_items")
      .select("id, item_name, quantity, notes, sector, status, created_at, order_id, pdv_orders(table_number, channel, ticket_number, customer_name, created_at, cancelled_at)")
      .eq("restaurant_id", e.rid)
      .in("status", ["received", "preparing", "ready"])
      .gte("created_at", since)
      .order("created_at");
    if (e.station.sector !== "all") q = q.eq("sector", e.station.sector);
    const { data: rows, error } = await q;
    if (error) throw new Error("Não foi possível carregar os pedidos");
    return {
      restaurantName: e.restaurantName,
      stationName: e.station.name,
      sector: e.station.sector,
      items: ((rows ?? []) as any[])
        .filter((k) => !k.pdv_orders?.cancelled_at)
        .map((k) => ({
          id: k.id, item_name: k.item_name, quantity: k.quantity, notes: k.notes,
          sector: k.sector as "kitchen" | "bar", status: k.status as StationItem["status"], created_at: k.created_at,
          order_id: k.order_id as string, table: (k.pdv_orders?.table_number as string | null) ?? null,
          channel: (k.pdv_orders?.channel as string | undefined) ?? "mesa",
          ticket: (k.pdv_orders?.ticket_number as number | null) ?? null,
          customer: (k.pdv_orders?.customer_name as string | null) ?? null,
          order_at: (k.pdv_orders?.created_at as string | undefined) ?? k.created_at,
        })),
    };
  });

/** Move o pedido de etapa, só nos itens do setor da estação. */
export const stationBump = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      slug: Slug,
      token: z.string().min(32).max(64),
      orderId: z.string().uuid(),
      status: z.enum(["received", "preparing", "ready", "delivered"]),
      sector: z.enum(["kitchen", "bar"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const e = await estacaoPorToken(data.slug, data.token);
    if (!e) throw new Error("Link da estação inválido ou desativado");
    const { data: o } = await e.db.from("pdv_orders").select("restaurant_id, cancelled_at").eq("id", data.orderId).maybeSingle();
    if (!o || o.restaurant_id !== e.rid) throw new Error("Pedido não encontrado");
    if (o.cancelled_at) throw new Error("Pedido cancelado");
    // Estação de setor único só mexe no próprio setor, mesmo que a tela peça outro.
    const setor = e.station.sector !== "all" ? e.station.sector : data.sector;
    let q = e.db
      .from("pdv_order_items")
      .update({ status: data.status, status_at: new Date().toISOString() })
      .eq("order_id", data.orderId).eq("restaurant_id", e.rid)
      .neq("status", "cancelled").neq("status", data.status);
    if (setor) q = q.eq("sector", setor);
    const { error } = await q;
    if (error) throw new Error("Não foi possível atualizar o pedido");
    return { ok: true };
  });

// ---------------- Mesa designada ao garçom ----------------

/** Garçons ativos e quem está designado à mesa. Leitura para dono, gerente e caixa. */
export const getTableAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: z.string().min(1).max(16) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: r } = await sb.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const [w, t] = await Promise.all([
      sb.from("pdv_waiters").select("id, name").eq("restaurant_id", r.id).eq("active", true).order("name"),
      sb.from("restaurant_tables").select("waiter_id").eq("restaurant_id", r.id).eq("number", data.table).maybeSingle(),
    ]);
    return { waiters: w.data ?? [], current: (t.data?.waiter_id as string | null | undefined) ?? null };
  });

/**
 * Dono, gerente ou caixa designa o garçom da mesa. Com `abrir`, já libera os pedidos pelo
 * celular da mesa (o garçom designado também pode liberar; os outros não).
 */
export const assignTableWaiter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: Slug, table: z.string().min(1).max(16), waiterId: z.string().uuid().nullable(), abrir: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assign_table_waiter" as never, {
      p_slug: data.slug, p_table: data.table, p_waiter: data.waiterId,
    } as never);
    if (error) {
      for (const k of ["Sem permissão", "Mesa inativa", "Garçom inválido"]) if (error.message.includes(k)) throw new Error(error.message);
      throw new Error("Não foi possível designar o garçom");
    }
    if (data.abrir && data.waiterId) {
      const { error: e2 } = await context.supabase.rpc("open_table_ordering", { p_slug: data.slug, p_table: data.table });
      if (e2) throw new Error("Garçom designado, mas não foi possível liberar os pedidos da mesa");
    }
    return { ok: true };
  });
