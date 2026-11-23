import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AccompanimentsSchema, readMenuConfig } from "./menu-intelligence";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Lançamento TIPE (adaptador manual). Integrações externas entram pelos
// adaptadores em src/lib/tipe/pdv e escrevem no mesmo modelo canônico.

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export type PublicTable = {
  restaurantName: string;
  logoUrl: string | null;
  tableNumber: string;
  waiterName: string;
  session: string;
  billMethods: string[];
  serviceRate: number;
  serviceWaived: boolean;
  /** Link de avaliação no Google definido pelo restaurante (ou null). */
  googleReviewUrl: string | null;
  /** Tipe Order ativo e pedido pela mesa ligado: a tela mostra Pedir e Pagar. Sem isso, só a conta (Pay). */
  selfOrder: boolean;
  /** Com o Order: se este celular pode pedir agora, se a mesa ainda não foi liberada ou se falta o código. */
  ordering: "open" | "closed" | "code" | null;
  /** Google Pay ativo nesta conta (conta Pagar.me com ID informado), ou null. */
  googlePay: import("./carteiras").GooglePayConfig | null;
  items: { item_code: string; item_name: string; unit_price: number; ordered_quantity: number; reserved_portion: number; paid_portion: number; ordered_at: string }[];
  payments: { id: string; customer_name: string; payment_method: string; status: import("./payment-state").PaymentStatus; amount: number; item_quantities: Record<string, number>; created_at: string; establishment_method: string | null; cash_received: number | null; change_due: number | null }[];
};

// Leitura pública da mesa pelo cliente (link do QR). Nunca expõe dados da equipe.
export const getPublicTable = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, code: z.string().min(1).max(32), token: z.string().max(64).optional(), session: z.string().max(96).optional(), device: z.string().max(96).optional() }).parse(d))
  .handler(async ({ data }): Promise<PublicTable | { error: "not_found" | "invalid_token" | "inactive" }> => {
    const { enforceRate, clientIp, safeEqual, logSecurityEvent } = await import("./security.server");
    // Limite generoso: vários clientes podem compartilhar o Wi-Fi do restaurante (mesmo IP).
    await enforceRate(`qr:${data.slug}:${data.code}:${clientIp()}`, 90, 60, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, name, bill_payment_methods, service_rate").eq("slug", data.slug).maybeSingle();
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
    const [items, payments, waiter, waiver, account, review, orderBlock, walletRow] = await Promise.all([
      supabaseAdmin.from("table_bill_items").select("item_code, item_name, unit_price, ordered_quantity, reserved_portion, paid_portion, ordered_at")
        .eq("restaurant_slug", data.slug).eq("table_number", t.number).order("ordered_at"),
      supabaseAdmin.from("table_payment_requests").select("id, customer_name, payment_method, status, amount, item_quantities, created_at, establishment_method, cash_received, change_due")
        .eq("restaurant_slug", data.slug).eq("table_number", t.number).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
      t.waiter_id ? supabaseAdmin.from("pdv_waiters").select("name").eq("id", t.waiter_id).maybeSingle() : Promise.resolve({ data: null }),
      supabaseAdmin.from("service_fee_waivers").select("id").eq("restaurant_id", r.id).eq("table_number", t.number).eq("session_token", t.session_token).limit(1),
      // Só o status: a chave nunca sai do servidor.
      supabaseAdmin.from("restaurant_pagarme_accounts").select("status").eq("restaurant_id", r.id).maybeSingle(),
      // Consulta separada: se a coluna ainda não existir (migração pendente), a mesa abre normalmente.
      supabaseAdmin.from("restaurants").select("google_review_url").eq("id", r.id).maybeSingle(),
      // Order: módulo, opção do restaurante e liberação da mesa decididos no banco (migração 0027).
      // Se a migração ainda não existir, dá erro e a mesa abre só com a conta, como antes.
      supabaseAdmin.rpc("table_ordering_block", { p_rid: r.id, p_table: t.number, p_device: data.device ?? null }),
      // Idem para o ID da conta Pagar.me usado pelo Google Pay (migração 0031).
      supabaseAdmin.from("restaurant_pagarme_accounts").select("account_id, key_mode, status" as never).eq("restaurant_id", r.id).maybeSingle(),
    ]);
    const block = orderBlock.error ? "module" : (orderBlock.data as string | null);
    const selfOrder = block === null || block === "closed" || block === "code";
    const { usableBillMethods } = await import("./pagarme.server");
    const { googlePayConfig } = await import("./carteiras");
    const wallet = walletRow.error ? null : (walletRow.data as { account_id?: string | null; key_mode?: string; status?: string } | null);
    if (items.error || payments.error) throw new Error("Não foi possível atualizar a mesa");
    if (!(items.data ?? []).length) {
      const { data: over } = await supabaseAdmin.rpc("table_is_over_limit", { p_rid: r.id, p_number: t.number });
      if (over) return { error: "inactive" };
    }
    // Consulta separada: sem a migração 0056 a coluna não existe e a mesa abre sem logomarca.
    const { data: logoRow } = await supabaseAdmin.from("restaurants").select("logo_url").eq("id", r.id).maybeSingle();
    return {
      restaurantName: r.name,
      logoUrl: ((logoRow as { logo_url?: string | null } | null)?.logo_url) ?? null,
      tableNumber: t.number,
      session: t.session_token,
      // Sem conta Pagar.me ativa (e fora de simulação), só o pagamento no estabelecimento aparece.
      billMethods: usableBillMethods((r as { bill_payment_methods?: string[] }).bill_payment_methods ?? ["pix", "apple_pay", "google_pay", "at_establishment"], (account.data as { status?: string } | null)?.status === "active", data.slug),
      serviceRate: Number((r as { service_rate?: number }).service_rate ?? 0.1),
      serviceWaived: (waiver.data ?? []).length > 0,
      googleReviewUrl: review.error ? null : ((review.data as { google_review_url?: string | null } | null)?.google_review_url ?? null),
      selfOrder,
      ordering: !selfOrder ? null : block === null ? "open" : (block as "closed" | "code"),
      googlePay: wallet?.status === "active" ? googlePayConfig({ accountId: wallet.account_id, keyMode: wallet.key_mode, merchantId: process.env["GOOGLE_PAY_MERCHANT_ID"], merchantName: r.name }) : null,
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
  for (const k of ["Sem permissão", "Mesa inativa", "Garçom inválido", "Pedido vazio", "Item indisponível", "Quantidade", "Há pagamentos", "Informe o motivo", "acima do limite"]) if (msg.includes(k)) return msg;
  return fallback;
};

export const getPdvData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const [cats, items, waiters, tables] = await Promise.all([
      context.supabase.from("pdv_menu_categories").select("id, name, position").eq("restaurant_id", rid).order("position"),
      context.supabase.from("pdv_menu_items").select("id, category_id, code, name, price, available, position, sector, description, menu_config, model_url").eq("restaurant_id", rid).order("position"),
      context.supabase.from("pdv_waiters").select("id, code, name, active, email, user_id").eq("restaurant_id", rid).order("code"),
      context.supabase.from("restaurant_tables").select("id, number, code, active, access_token, waiter_id").eq("restaurant_id", rid),
    ]);
    return {
      categories: cats.data ?? [],
      items: (items.data ?? []).map((i) => ({ ...i, menu_config: readMenuConfig(i.menu_config), price: Number(i.price) })),
      waiters: waiters.data ?? [],
      tables: (tables.data ?? []).sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number)),
    };
  });

const RequestId = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const launchOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, table: z.string().min(1).max(16), waiterId: z.string().uuid(),
    items: z.array(z.object({ code: z.string().min(1).max(16), qty: z.number().int().min(1).max(99), notes: z.string().max(140).optional() })).min(1).max(60),
    // Mesma chave em toque duplo ou nova tentativa: o banco devolve o pedido já lançado.
    requestId: RequestId,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pdv_launch_order" as never, { p_slug: data.slug, p_table: data.table, p_waiter: data.waiterId, p_items: data.items, p_request_id: data.requestId } as never);
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

/** Uso de mesas do plano. Plano e upgrade só para o dono; demais veem só o limite. */
export const getTablePlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("restaurants").select("id, name").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("restaurant_id", r.id).eq("user_id", context.userId);
    const isOwner = (roles ?? []).some((x) => x.role === "owner");
    const { tableLimitInfo, upgradeLink } = await import("./table-limit.server");
    const info = await tableLimitInfo(r.id);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    // Mesas que o PDV tentou criar acima do limite (últimos 30 dias) e que ainda não existem.
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [{ data: blocks }, { data: all }, { data: plan }] = await Promise.all([
      db.from("table_limit_blocks").select("table_number, source").eq("restaurant_id", r.id).gte("created_at", since),
      db.from("restaurant_tables").select("number").eq("restaurant_id", r.id),
      db.from("plan_catalog").select("name").eq("id", info.plan).maybeSingle(),
    ]);
    const existing = new Set((all ?? []).map((t) => t.number));
    const pdvMissing = new Set((blocks ?? []).filter((b) => !b.source.startsWith("lancamento_tipe") && !existing.has(b.table_number)).map((b) => b.table_number));
    const planName = plan?.name ?? info.plan;
    return {
      active: info.active, limit: info.limit, isOwner,
      plan: isOwner ? planName : null,
      upgradeUrl: isOwner ? upgradeLink(r.name, planName) : null,
      pdvTotal: pdvMissing.size ? info.active + pdvMissing.size : null,
    };
  });

/** Dono ou caixa remove a taxa de serviço da conta aberta da mesa (motivo obrigatório). */
export const waiveServiceFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: z.string().max(16), reason: z.string().trim().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: amount, error } = await context.supabase.rpc("waive_service_fee", { p_slug: data.slug, p_table: data.table, p_reason: data.reason });
    if (error) throw new Error(friendly(error.message, "Não foi possível remover a taxa"));
    return { amount: Number(amount ?? 0) };
  });

export const addTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, number: z.string().trim().min(1).max(8).regex(/^[0-9A-Za-z]+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    const { data: rows, error } = await context.supabase.from("restaurant_tables").insert({ restaurant_id: rid, number: data.number, code: `mesa${data.number.toLowerCase()}` }).select("id");
    if (error) throw new Error(error.code === "23505" ? "Essa mesa já existe" : "Somente o dono pode cadastrar mesas");
    if (!rows?.length) { const { LIMIT_MESSAGE } = await import("./table-limit.server"); throw new Error(LIMIT_MESSAGE); }
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
    if (!error && !rows?.length && data.active) {
      // A mesa existe e é visível, mas o banco recusou a reativação: limite do plano.
      const { data: seen } = await context.supabase.from("restaurant_tables").select("id").eq("id", data.id).maybeSingle();
      if (seen) { const { LIMIT_MESSAGE } = await import("./table-limit.server"); throw new Error(LIMIT_MESSAGE); }
    }
    if (error || !rows?.length) throw new Error("Somente o dono pode alterar mesas");
    return { ok: true };
  });

export const editTable = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(d=>z.object({id:z.string().uuid(),number:z.string().trim().min(1).max(12).optional(),remove:z.boolean().default(false)}).parse(d)).handler(async({data,context})=>{
 const {error}=await context.supabase.rpc("edit_unused_table" as never,{p_id:data.id,p_number:data.number??null,p_delete:data.remove} as never);
 if(error){
  // Só as mensagens de regra de negócio da função chegam ao navegador; o resto fica no log.
  for(const k of ["Somente o dono","Edite esta mesa no PDV","tem movimentação ou reservas","Desative a mesa antes","Número inválido","já existe"]) if(error.message.includes(k)) throw new Error(error.message);
  console.error("edit_unused_table", error.message);
  throw new Error("Não foi possível alterar a mesa");
 }
 return {ok:true};
});

export const saveMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug, id: z.string().uuid().optional(), categoryId: z.string().uuid().nullable(),
    code: z.string().trim().min(1).max(16), name: z.string().trim().min(2).max(80), price: z.number().min(0).max(10000), available: z.boolean(),
    accompaniments: AccompanimentsSchema.optional(),
    sector: z.enum(["kitchen", "bar"]).optional(), description: z.string().trim().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await restaurantId(context.supabase, data.slug);
    // Only an explicitly scoped owner may change choice rules. Keep unrelated editorial data.
    const db = context.supabase as SupabaseClient;
    const { data: owner, error: roleError } = await db.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: rid, _roles: ["owner"] });
    if (roleError || !owner) throw new Error("Somente o dono pode editar o cardápio");
    let config: Record<string, Json | undefined> | undefined;
    let previousConfig: Json | undefined;
    if (data.accompaniments !== undefined) {
      if (data.id) {
        const { data: current, error } = await db.from("pdv_menu_items").select("menu_config").eq("restaurant_id", rid).eq("id", data.id).single();
        if (error || !current) throw new Error("Prato não encontrado neste restaurante");
        previousConfig = current.menu_config;
        config = { ...current.menu_config, accompaniments: data.accompaniments };
      } else config = { accompaniments: data.accompaniments };
      const codes = data.accompaniments.choices.map(c => c.code);
      if (codes.length) {
        const { data: matches, error } = await db.from("pdv_menu_items").select("code").eq("restaurant_id", rid).in("code", codes);
        if (error || matches?.length !== codes.length || codes.includes(data.code.toUpperCase())) throw new Error("Escolha acompanhamentos cadastrados neste restaurante, diferentes do prato.");
      }
    }
    const row = { ...(config ? { menu_config: config } : {}), restaurant_id: rid, category_id: data.categoryId, code: data.code.toUpperCase(), name: data.name, price: data.price, available: data.available, ...(data.sector ? { sector: data.sector } : {}), ...(data.description !== undefined ? { description: data.description || null } : {}) };
    let update = context.supabase.from("pdv_menu_items").update(row).eq("restaurant_id", rid).eq("id", data.id ?? "");
    if (previousConfig !== undefined) update = previousConfig === null ? update.is("menu_config", null) : update.eq("menu_config", previousConfig);
    const q = data.id ? update.select("id") : context.supabase.from("pdv_menu_items").insert(row).select("id");
    const { data: rows, error } = await q;
    if (error || !rows?.length) throw new Error(error?.code === "23505" ? "Código já usado" : "O prato pode ter sido atualizado. Reabra a edição e tente novamente.");
    return { ok: true, itemId: rows[0]!.id as string };
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
    const { data: inserted, error } = await context.supabase.from("restaurant_tables").insert(rows).select("id");
    if (error) throw new Error("Somente o dono pode cadastrar mesas");
    const created = inserted?.length ?? 0;
    if (created < rows.length) {
      const { LIMIT_MESSAGE } = await import("./table-limit.server");
      if (created === 0) throw new Error(LIMIT_MESSAGE);
      return { created, limited: `${created} mesa(s) criada(s). ${LIMIT_MESSAGE}` };
    }
    return { created };
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
