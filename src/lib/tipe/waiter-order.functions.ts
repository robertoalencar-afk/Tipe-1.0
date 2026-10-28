import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resumoMesa,
  statusMesaSalao,
  type ItemConta,
  type NotaBaixa,
  type StatusMesaSalao,
} from "./pdv/comanda";

// Atendimento do garçom pelo celular. O garçom lança pedido pela mesa, que cai
// no mesmo table_bill_items / KDS / conta do QR do restante do PDV. Ele só
// consegue lançar como ele mesmo: o id do garçom vem sempre do user autenticado.

/** Resolve o garçom logado a partir do user_id (admin, mas sempre escopado ao próprio). */
async function myWaiter(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pdv_waiters")
    .select("id, name, code, active, restaurant_id, restaurants(name, slug)")
    .eq("user_id", userId)
    .maybeSingle();
  const w = data as unknown as {
    id: string;
    name: string;
    code: string;
    active: boolean;
    restaurant_id: string;
    restaurants: { name: string; slug: string };
  } | null;
  if (!w || !w.active)
    throw new Error("Seu acesso de garçom não está ativo. Fale com o restaurante.");
  return { db: supabaseAdmin, w };
}

export type WaiterTable = {
  number: string;
  active: boolean;
  status: StatusMesaSalao;
  total: number;
  pago: number;
  disponivel: number;
  itens: { code: string; name: string; qty: number; unitPrice: number }[];
  minhaMesa: boolean;
};

export type WaiterPos = {
  waiter: { name: string; code: string };
  restaurantName: string;
  categories: { id: string; name: string }[];
  items: {
    id: string;
    categoryId: string | null;
    code: string;
    name: string;
    price: number;
    sector: string;
    description: string | null;
  }[];
  topItems: string[];
  tables: WaiterTable[];
  /** Notas de 2 estrelas ou menos das últimas 12 horas, só do próprio garçom. */
  notasBaixas: NotaBaixa[];
};

/** Mesas + cardápio + conta de cada mesa, para a tela de atendimento do garçom. */
export const getWaiterPos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WaiterPos> => {
    const { db, w } = await myWaiter(context.userId);
    const rid = w.restaurant_id;
    const slug = w.restaurants.slug;
    const [cats, items, tables, bill, pend, top, notas] = await Promise.all([
      db
        .from("pdv_menu_categories")
        .select("id, name, position")
        .eq("restaurant_id", rid)
        .order("position"),
      db
        .from("pdv_menu_items")
        .select("id, category_id, code, name, price, available, position, sector, description")
        .eq("restaurant_id", rid)
        .eq("available", true)
        .order("position"),
      db.from("restaurant_tables").select("number, active, waiter_id").eq("restaurant_id", rid),
      db
        .from("table_bill_items")
        .select(
          "table_number, item_code, item_name, unit_price, ordered_quantity, reserved_portion, paid_portion",
        )
        .eq("restaurant_slug", slug),
      db
        .from("table_payment_requests")
        .select("table_number")
        .eq("restaurant_slug", slug)
        .eq("payment_target", "restaurant")
        .eq("status", "pending"),
      db
        .from("pdv_order_items")
        .select("item_code")
        .eq("restaurant_id", rid)
        .neq("status", "cancelled")
        .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
        .limit(4000),
      db
        .from("waiter_ratings")
        .select("id, stars, comment, table_number, created_at")
        .eq("waiter_id", w.id)
        .lte("stars", 2)
        .gte("created_at", new Date(Date.now() - 12 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const porMesa = new Map<string, ItemConta[]>();
    for (const b of bill.data ?? []) {
      const row: ItemConta = {
        item_code: b.item_code,
        item_name: b.item_name,
        unit_price: Number(b.unit_price),
        ordered_quantity: Number(b.ordered_quantity),
        reserved_portion: Number(b.reserved_portion),
        paid_portion: Number(b.paid_portion),
      };
      const list = porMesa.get(b.table_number) ?? [];
      list.push(row);
      porMesa.set(b.table_number, list);
    }
    const pendPorMesa = new Map<string, number>();
    for (const p of pend.data ?? [])
      pendPorMesa.set(p.table_number, (pendPorMesa.get(p.table_number) ?? 0) + 1);

    // Mais vendidos (contagem simples por código).
    const conta = new Map<string, number>();
    for (const o of top.data ?? []) conta.set(o.item_code, (conta.get(o.item_code) ?? 0) + 1);
    const topItems = [...conta.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c]) => c);

    const tablesOut: WaiterTable[] = (tables.data ?? [])
      .sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number))
      .map((t) => {
        const itens = porMesa.get(t.number) ?? [];
        const r = resumoMesa(itens);
        return {
          number: t.number,
          active: t.active,
          status: statusMesaSalao(r, pendPorMesa.get(t.number) ?? 0),
          total: r.total,
          pago: r.pago,
          disponivel: r.disponivel,
          itens: itens.map((i) => ({
            code: i.item_code,
            name: i.item_name,
            qty: i.ordered_quantity,
            unitPrice: i.unit_price,
          })),
          minhaMesa: t.waiter_id === w.id,
        };
      });

    return {
      waiter: { name: w.name, code: w.code },
      restaurantName: w.restaurants.name,
      categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
      items: (items.data ?? []).map((i) => ({
        id: i.id,
        categoryId: i.category_id,
        code: i.code,
        name: i.name,
        price: Number(i.price),
        sector: i.sector,
        description: i.description,
      })),
      topItems,
      tables: tablesOut,
      notasBaixas: (notas.data ?? []).map((n) => ({
        id: n.id,
        stars: n.stars,
        comment: n.comment,
        table: n.table_number,
        at: n.created_at,
      })),
    };
  });

/** Garçom lança pedido numa mesa. Força o próprio id — não dá para lançar como outro garçom. */
export const waiterLaunchOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        table: z.string().min(1).max(16),
        items: z
          .array(
            z.object({
              code: z.string().min(1).max(16),
              qty: z.number().int().min(1).max(99),
              notes: z.string().max(140).optional(),
            }),
          )
          .min(1)
          .max(60),
        // Mesma chave em toque duplo ou nova tentativa: o banco devolve o pedido já lançado.
        requestId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { w } = await myWaiter(context.userId);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`waiter-order:${w.id}`, 120, 60, w.restaurants.slug);
    // RPC com o contexto autenticado do garçom (papel waiter). p_waiter é sempre o próprio.
    const { error } = await context.supabase.rpc("pdv_launch_order" as never, {
      p_slug: w.restaurants.slug,
      p_table: data.table,
      p_waiter: w.id,
      p_items: data.items,
      p_request_id: data.requestId,
    } as never);
    if (error) {
      for (const k of [
        "Mesa inativa",
        "Garçom inválido",
        "Pedido vazio",
        "Item indisponível",
        "Quantidade",
        "acima do limite",
        "Sem permissão",
      ]) {
        if (error.message.includes(k)) throw new Error(error.message);
      }
      throw new Error("Não foi possível lançar o pedido");
    }
    return { ok: true };
  });
