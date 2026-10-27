import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIP_SPLIT } from "./rules";

const Slug = z.string().min(2).max(64).regex(/^[a-z0-9-]+$/);

/** Dono libera o acesso de um garçom já cadastrado: envia convite para ele definir a senha. */
export const grantWaiterAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, waiterId: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const { data: ok } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: r.id, _roles: ["owner"] });
    if (!ok) throw new Error("Somente o dono pode liberar o acesso de garçons");
    const { grantWaiterAccessCore } = await import("./waiter-access.server");
    return grantWaiterAccessCore({ restaurantId: r.id, slug: data.slug, waiterId: data.waiterId, email: data.email, actorId: context.userId });
  });

async function myWaiter(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: w } = await supabaseAdmin.from("pdv_waiters").select("id, name, code, active, restaurant_id, restaurants(name, slug)").eq("user_id", userId).maybeSingle();
  if (!w || !w.active) throw new Error("Seu acesso de garçom não está ativo. Fale com o restaurante.");
  return { db: supabaseAdmin, w: w as unknown as { id: string; name: string; code: string; restaurant_id: string; restaurants: { name: string; slug: string } } };
}

export const getWaiterDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, w } = await myWaiter(context.userId);
    await db.rpc("promote_pending_pix", { p_waiter: w.id, p_force: false });
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const today = new Date(); today.setHours(today.getHours() - 3); // Fortaleza
    const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 3)).toISOString();
    const [tipsA, tipsB, bal, orders, bills, acc, wd] = await Promise.all([
      db.from("table_payment_requests").select("amount, created_at, table_number").eq("waiter_id", w.id).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
      db.from("archived_payments").select("amount, created_at, table_number").eq("waiter_id", w.id).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
      db.rpc("waiter_balance", { p_waiter: w.id }),
      db.from("pdv_orders").select("table_number, pdv_order_items(unit_price, quantity)").eq("waiter_id", w.id).gte("created_at", dayStart),
      db.from("table_payment_requests").select("amount").eq("waiter_id", w.id).eq("payment_target", "restaurant").eq("status", "approved").gte("created_at", dayStart),
      db.from("waiter_payout_accounts").select("holder_name, pix_key_type, pix_key, pix_key_enc, pending_pix_key, pending_since").eq("waiter_id", w.id).maybeSingle(),
      db.from("waiter_withdrawals").select("id, amount, status, scheduled_for, blocked_until, requested_at, resolved_at, note").eq("waiter_id", w.id).order("requested_at", { ascending: false }).limit(20),
    ]);
    const tips = [...(tipsA.data ?? []), ...(tipsB.data ?? [])].map((t) => ({ amount: +(Number(t.amount) * TIP_SPLIT.waiter).toFixed(2), at: t.created_at, table: t.table_number }));
    tips.sort((a, b) => b.at.localeCompare(a.at));
    const b = (bal.data as Array<{ available: number; current_cycle: number; withdrawn: number }> | null)?.[0];
    const ord = (orders.data ?? []) as unknown as Array<{ table_number: string; pdv_order_items: Array<{ unit_price: number; quantity: number }> }>;
    const salesToday = ord.reduce((s, o) => s + o.pdv_order_items.reduce((x, i) => x + Number(i.unit_price) * i.quantity, 0), 0);
    const a = acc.data;
    return {
      waiter: { name: w.name, code: w.code, restaurant: w.restaurants.name },
      balance: { available: Number(b?.available ?? 0), currentCycle: Number(b?.current_cycle ?? 0), withdrawn: Number(b?.withdrawn ?? 0) },
      today: {
        tips: tips.filter((t) => t.at >= dayStart).reduce((s, t) => s + t.amount, 0),
        tipsCount: tips.filter((t) => t.at >= dayStart).length,
        sales: +salesToday.toFixed(2),
        tables: new Set(ord.map((o) => o.table_number)).size,
        billsPaid: (bills.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
      },
      tips: tips.slice(0, 50),
      pix: a ? { holderName: a.holder_name, keyType: a.pix_key_type, keyMasked: a.pix_key_enc ? a.pix_key : null, pendingKeyMasked: a.pending_pix_key, pendingUntil: a.pending_since ? new Date(new Date(a.pending_since).getTime() + 48 * 3600_000).toISOString() : null } : null,
      withdrawals: (wd.data ?? []).map((x) => ({ ...x, amount: Number(x.amount) })),
    };
  });

export const saveWaiterPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    holderName: z.string().trim().min(3).max(120),
    holderDocument: z.string().regex(/^\d{11}$/, "CPF inválido"),
    keyType: z.enum(["cpf", "email", "phone", "random"]),
    key: z.string().trim().min(5).max(120),
  }).refine((v) => v.keyType !== "cpf" || /^\d{11}$/.test(v.key), { message: "Chave CPF inválida" })
    .refine((v) => v.keyType !== "email" || z.string().email().safeParse(v.key).success, { message: "Chave e-mail inválida" })
    .refine((v) => v.keyType !== "phone" || /^\+?\d{10,13}$/.test(v.key), { message: "Telefone inválido" }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, w } = await myWaiter(context.userId);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`waiter-pix:${w.id}`, 10, 3600);
    const { encryptSecret } = await import("./pagarme.server");
    const { maskCpf, maskPix } = await import("./mask");
    // Toda chave nova fica em quarentena de 48h (ou até o dono aprovar). Saques ficam pausados.
    const pending = {
      pending_holder_name: data.holderName,
      pending_holder_document: maskCpf(data.holderDocument), pending_holder_document_enc: await encryptSecret(data.holderDocument),
      pending_pix_key_type: data.keyType, pending_pix_key: maskPix(data.keyType, data.key), pending_pix_key_enc: await encryptSecret(data.key),
      pending_since: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from("waiter_payout_accounts").select("waiter_id").eq("waiter_id", w.id).maybeSingle();
    const { error } = existing
      ? await db.from("waiter_payout_accounts").update(pending).eq("waiter_id", w.id)
      : await db.from("waiter_payout_accounts").insert({ waiter_id: w.id, holder_name: data.holderName, holder_document: "(em verificação)", pix_key_type: data.keyType, pix_key: "(em verificação)", ...pending });
    if (error) throw new Error("Não foi possível salvar sua chave Pix");
    await logSecurityEvent({ action: "waiter_pix_saved", resource: `pdv_waiters:${w.id}`, restaurantId: w.restaurant_id, restaurantSlug: w.restaurants.slug, actorId: context.userId, detail: `quarentena 48h; chave ${pending.pending_pix_key}` });
    const { notifyPixChange } = await import("./pix-quarantine.server");
    await notifyPixChange({ waiterId: w.id, waiterName: w.name, waiterUserId: context.userId, restaurantId: w.restaurant_id, restaurantName: w.restaurants.name, keyMasked: pending.pending_pix_key });
    return { ok: true };
  });

/** Só registra o pedido. O Pix é feito pela TIPE no ciclo quinzenal seguinte; nada é pago na hora. */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, w } = await myWaiter(context.userId);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`withdraw:${w.id}`, 5, 3600);
    const { data: id, error } = await db.rpc("waiter_request_withdrawal", { p_waiter: w.id });
    if (error) {
      for (const k of ["Cadastre sua chave", "já tem um saque", "Saldo disponível mínimo", "inativo"]) if (error.message.includes(k)) throw new Error(error.message);
      throw new Error("Não foi possível solicitar o saque");
    }
    const { data: row } = await db.from("waiter_withdrawals").select("scheduled_for, blocked_until").eq("id", id as string).maybeSingle();
    return { ok: true, scheduledFor: row?.scheduled_for ?? null, blockedUntil: row?.blocked_until ?? null };
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, w } = await myWaiter(context.userId);
    const { data: rows } = await db.from("waiter_withdrawals").update({ status: "cancelled", resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id).eq("waiter_id", w.id).eq("status", "requested").select("id, amount, pix_key");
    const r = rows?.[0];
    if (!r) throw new Error("Pedido já processado ou inexistente");
    await db.from("waiter_withdrawal_events").insert({ withdrawal_id: r.id, waiter_id: w.id, action: "cancelled", amount: r.amount, pix_key_masked: r.pix_key, actor_id: context.userId });
    return { ok: true };
  });

// ---- Fundador TIPE: fila de Pix para garçons ----
async function requireFounder(ctx: { supabase: any; userId: string; claims?: any }) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(ctx);
}

export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("waiter_withdrawals").select("id, amount, status, scheduled_for, blocked_until, requested_at, pix_key_type, pix_key, holder_name, pdv_waiters(name), restaurants(name)").order("scheduled_for", { ascending: true }).limit(200);
    return (data ?? []).map((x: any) => ({ id: x.id as string, amount: Number(x.amount), status: x.status as string, scheduledFor: x.scheduled_for as string, blockedUntil: (x.blocked_until as string | null) ?? null, requestedAt: x.requested_at as string, pixKeyType: x.pix_key_type as string, pixKeyMasked: x.pix_key as string, holderName: x.holder_name as string, waiter: x.pdv_waiters?.name as string, restaurant: x.restaurants?.name as string }));
  });

export const resolveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["paid", "rejected"]), note: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("waiter_withdrawals").select("waiter_id, restaurant_id, blocked_until, scheduled_for").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Saque inexistente");
    if (data.action === "paid") {
      await supabaseAdmin.rpc("promote_pending_pix", { p_waiter: cur.waiter_id, p_force: false });
      const { data: acc } = await supabaseAdmin.from("waiter_payout_accounts").select("pending_since").eq("waiter_id", cur.waiter_id).maybeSingle();
      if (cur.blocked_until && (new Date(cur.blocked_until).getTime() > Date.now() || acc?.pending_since)) throw new Error("Chave Pix ainda em verificação. Esse pedido não entra no repasse antes do fim da quarentena.");
      const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
      if (cur.scheduled_for > today) throw new Error(`Esse pedido é do repasse de ${cur.scheduled_for.split("-").reverse().join("/")}`);
    }
    const { data: rows, error } = await supabaseAdmin.from("waiter_withdrawals")
      .update({ status: data.action, note: data.note ?? null, resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id).eq("status", "requested").select("id, amount, pix_key");
    if (error || !rows?.length) throw new Error("Saque já resolvido ou inexistente");
    await supabaseAdmin.from("waiter_withdrawal_events").insert({ withdrawal_id: data.id, waiter_id: cur.waiter_id, action: data.action, amount: rows[0]!.amount, pix_key_masked: rows[0]!.pix_key, actor_id: context.userId });
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: `withdrawal_${data.action}`, resource: `waiter_withdrawals:${data.id}`, actorId: context.userId });
    const { avisarSaque } = await import("./avisos-equipe.server");
    await avisarSaque(supabaseAdmin, { id: data.id, waiterId: cur.waiter_id, restaurantId: cur.restaurant_id, valor: Number(rows[0]!.amount) }, data.action, data.note);
    return { ok: true };
  });

/** Founder revela a chave Pix completa de um saque para pagar; cada visualização fica registrada. */
export const revealWithdrawalPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("waiter_withdrawals").select("pix_key_enc, restaurant_id").eq("id", data.id).maybeSingle();
    if (!row?.pix_key_enc) throw new Error("Chave indisponível");
    const { decryptSecret } = await import("./pagarme.server");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "pix_key_revealed", resource: `waiter_withdrawals:${data.id}`, restaurantId: row.restaurant_id, actorId: context.userId });
    return { pixKey: await decryptSecret(row.pix_key_enc) };
  });

// ---- Dono do restaurante: chaves Pix em quarentena ----
async function ownerRestaurant(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o dono do restaurante");
  return r.id as string;
}

export const listWaiterPix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ws } = await supabaseAdmin.from("pdv_waiters").select("id, name").eq("restaurant_id", rid);
    const ids = (ws ?? []).map((w) => w.id);
    if (!ids.length) return [];
    for (const id of ids) await supabaseAdmin.rpc("promote_pending_pix", { p_waiter: id, p_force: false });
    const { data: accs } = await supabaseAdmin.from("waiter_payout_accounts").select("waiter_id, holder_name, holder_document, pix_key_type, pix_key, pix_key_enc, pending_holder_name, pending_pix_key_type, pending_pix_key, pending_since").in("waiter_id", ids);
    return (accs ?? []).map((a) => ({
      waiterId: a.waiter_id, waiter: ws?.find((w) => w.id === a.waiter_id)?.name ?? "",
      active: a.pix_key_enc ? { holderName: a.holder_name, document: a.holder_document, keyType: a.pix_key_type, key: a.pix_key } : null,
      pending: a.pending_since ? { holderName: a.pending_holder_name, keyType: a.pending_pix_key_type, key: a.pending_pix_key, until: new Date(new Date(a.pending_since).getTime() + 48 * 3600_000).toISOString() } : null,
    }));
  });

export const resolveWaiterPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, waiterId: z.string().uuid(), action: z.enum(["approve", "refuse"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("pdv_waiters").select("id").eq("id", data.waiterId).eq("restaurant_id", rid).maybeSingle();
    if (!w) throw new Error("Garçom não encontrado");
    if (data.action === "approve") {
      const { data: ok } = await supabaseAdmin.rpc("promote_pending_pix", { p_waiter: w.id, p_force: true });
      if (!ok) throw new Error("Não há chave aguardando aprovação");
    } else {
      await supabaseAdmin.from("waiter_payout_accounts").update({ pending_holder_name: null, pending_holder_document: null, pending_holder_document_enc: null, pending_pix_key_type: null, pending_pix_key: null, pending_pix_key_enc: null, pending_since: null }).eq("waiter_id", w.id);
    }
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: `waiter_pix_${data.action === "approve" ? "approved" : "refused"}`, resource: `pdv_waiters:${w.id}`, restaurantId: rid, restaurantSlug: data.slug, actorId: context.userId });
    return { ok: true };
  });

/** Dono revela CPF e chave Pix completos de um garçom; cada visualização fica registrada. */
export const revealWaiterPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, waiterId: z.string().uuid(), which: z.enum(["active", "pending"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const rid = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("pdv_waiters").select("id").eq("id", data.waiterId).eq("restaurant_id", rid).maybeSingle();
    if (!w) throw new Error("Garçom não encontrado");
    const { data: a } = await supabaseAdmin.from("waiter_payout_accounts").select("holder_document_enc, pix_key_enc, pending_holder_document_enc, pending_pix_key_enc").eq("waiter_id", w.id).maybeSingle();
    const docEnc = data.which === "active" ? a?.holder_document_enc : a?.pending_holder_document_enc;
    const keyEnc = data.which === "active" ? a?.pix_key_enc : a?.pending_pix_key_enc;
    if (!docEnc || !keyEnc) throw new Error("Dado indisponível");
    const { decryptSecret } = await import("./pagarme.server");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "pix_key_revealed", resource: `pdv_waiters:${w.id}:${data.which}`, restaurantId: rid, restaurantSlug: data.slug, actorId: context.userId });
    return { document: await decryptSecret(docEnc), key: await decryptSecret(keyEnc) };
  });
