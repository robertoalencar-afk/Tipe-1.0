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
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`waiter-invite:${r.id}`, 20, 3600, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("pdv_waiters").select("id, name, user_id, active").eq("id", data.waiterId).eq("restaurant_id", r.id).maybeSingle();
    if (!w || !w.active) throw new Error("Garçom não encontrado ou inativo");

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const origin = /^https:\/\/([a-z0-9-]+\.)*(tipe\.digital|lovable\.app)$/.test(getRequestHeader("origin") ?? "") ? getRequestHeader("origin")! : "https://tipe.digital";

    let userId: string | undefined;
    let invited = false;
    const inv = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${origin}/reset-password?garcom=1`, data: { name: w.name } });
    if (inv.data?.user) { userId = inv.data.user.id; invited = true; }
    else {
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        userId = list?.users.find((u) => u.email?.toLowerCase() === data.email)?.id;
        if (!list || list.users.length < 200) break;
      }
    }
    if (!userId) throw new Error("Não foi possível enviar o convite para esse e-mail");
    // Conta já existente: envia o link para definir/redefinir a senha e entrar na área do garçom.
    if (!invited) {
      const { error: rErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo: `${origin}/reset-password?garcom=1` });
      if (rErr) console.error("waiter reset email", rErr.message);
    }
    const { data: other } = await supabaseAdmin.from("pdv_waiters").select("id").eq("user_id", userId).neq("id", w.id).maybeSingle();
    if (other) throw new Error("Esse e-mail já está ligado a outro garçom");

    await supabaseAdmin.from("pdv_waiters").update({ user_id: userId, email: data.email }).eq("id", w.id);
    await supabaseAdmin.from("staff_members").upsert({ user_id: userId, restaurant_id: r.id, display_name: w.name, email: data.email }, { onConflict: "user_id,restaurant_id" });
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, restaurant_id: r.id, role: "waiter" }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true });
    await logSecurityEvent({ action: "waiter_access_granted", resource: `pdv_waiters:${w.id}`, restaurantId: r.id, actorId: context.userId });
    return { invited };
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
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const today = new Date(); today.setHours(today.getHours() - 3); // Fortaleza
    const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 3)).toISOString();
    const [tipsA, tipsB, bal, orders, bills, acc, wd] = await Promise.all([
      db.from("table_payment_requests").select("amount, created_at, table_number").eq("waiter_id", w.id).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
      db.from("archived_payments").select("amount, created_at, table_number").eq("waiter_id", w.id).eq("payment_target", "tipe").eq("status", "approved").gte("created_at", since),
      db.rpc("waiter_balance", { p_waiter: w.id }),
      db.from("pdv_orders").select("table_number, pdv_order_items(unit_price, quantity)").eq("waiter_id", w.id).gte("created_at", dayStart),
      db.from("table_payment_requests").select("amount").eq("waiter_id", w.id).eq("payment_target", "restaurant").eq("status", "approved").gte("created_at", dayStart),
      db.from("waiter_payout_accounts").select("holder_name, pix_key_type, pix_key").eq("waiter_id", w.id).maybeSingle(),
      db.from("waiter_withdrawals").select("id, amount, status, scheduled_for, requested_at, resolved_at, note").eq("waiter_id", w.id).order("requested_at", { ascending: false }).limit(20),
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
      pix: a ? { holderName: a.holder_name, keyType: a.pix_key_type, keyMasked: a.pix_key.length > 6 ? `${a.pix_key.slice(0, 3)}•••${a.pix_key.slice(-3)}` : "•••" } : null,
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
    const { error } = await db.from("waiter_payout_accounts").upsert({ waiter_id: w.id, holder_name: data.holderName, holder_document: data.holderDocument, pix_key_type: data.keyType, pix_key: data.key, updated_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar sua chave Pix");
    await logSecurityEvent({ action: "waiter_pix_saved", resource: `pdv_waiters:${w.id}`, restaurantId: w.restaurant_id, actorId: context.userId });
    return { ok: true };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, w } = await myWaiter(context.userId);
    const { error } = await db.rpc("waiter_request_withdrawal", { p_waiter: w.id });
    if (error) {
      for (const k of ["Cadastre sua chave", "já tem um saque", "Saldo disponível mínimo", "inativo"]) if (error.message.includes(k)) throw new Error(error.message);
      throw new Error("Não foi possível solicitar o saque");
    }
    return { ok: true };
  });

// ---- Fundador TIPE: fila de Pix para garçons ----
async function requireFounder(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "founder" });
  if (!data) throw new Error("Somente a equipe TIPE");
}

export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("waiter_withdrawals").select("id, amount, status, scheduled_for, requested_at, pix_key_type, pix_key, holder_name, pdv_waiters(name), restaurants(name)").order("requested_at", { ascending: false }).limit(100);
    return (data ?? []).map((x: any) => ({ id: x.id as string, amount: Number(x.amount), status: x.status as string, scheduledFor: x.scheduled_for as string, requestedAt: x.requested_at as string, pixKeyType: x.pix_key_type as string, pixKey: x.pix_key as string, holderName: x.holder_name as string, waiter: x.pdv_waiters?.name as string, restaurant: x.restaurants?.name as string }));
  });

export const resolveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["paid", "rejected"]), note: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("waiter_withdrawals")
      .update({ status: data.action, note: data.note ?? null, resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id).eq("status", "requested").select("id");
    if (error || !rows?.length) throw new Error("Saque já resolvido ou inexistente");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: `withdrawal_${data.action}`, resource: `waiter_withdrawals:${data.id}`, actorId: context.userId });
    return { ok: true };
  });
