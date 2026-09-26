import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole = "founder" | "owner" | "cashier" | "waiter";

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [rolesRes, restRes] = await Promise.all([
      supabase.from("user_roles").select("role, restaurant_id").eq("user_id", userId),
      supabase.from("restaurants").select("id, slug, name, pos_provider").order("name"),
    ]);
    if (rolesRes.error || restRes.error) throw new Error("Não foi possível carregar seu acesso");
    const roles = rolesRes.data ?? [];
    return {
      email: (context.claims as { email?: string }).email ?? "",
      isFounder: roles.some((r) => r.role === "founder"),
      roles: roles.map((r) => ({ role: r.role as StaffRole, restaurantId: r.restaurant_id })),
      restaurants: restRes.data ?? [],
    };
  });

export const claimFounder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_founder");
    if (error) throw new Error("Não foi possível concluir");
    return { claimed: Boolean(data) };
  });

const Slug = z.object({ slug: z.string().min(1).max(64) });

export const getPanelData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Slug.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: restaurant, error } = await supabase.from("restaurants").select("id, slug, name, pos_provider").eq("slug", data.slug).maybeSingle();
    if (error || !restaurant) throw new Error("Restaurante não encontrado ou sem acesso");
    const [tables, items, payments, staff, roles, audit] = await Promise.all([
      supabase.from("restaurant_tables").select("id, number, active").eq("restaurant_id", restaurant.id),
      supabase.from("table_bill_items").select("table_number, item_code, item_name, unit_price, ordered_quantity, reserved_quantity, paid_quantity, ordered_at").eq("restaurant_slug", data.slug),
      supabase.from("table_payment_requests").select("id, table_number, customer_name, payment_method, status, amount, item_quantities, created_at").eq("restaurant_slug", data.slug).eq("payment_target", "restaurant").order("created_at", { ascending: false }),
      supabase.from("staff_members").select("user_id, display_name, email").eq("restaurant_id", restaurant.id),
      supabase.from("user_roles").select("user_id, role").eq("restaurant_id", restaurant.id),
      supabase.from("payment_audit_log").select("id, table_number, action, amount, created_at").eq("restaurant_slug", data.slug).order("created_at", { ascending: false }).limit(30),
    ]);
    return {
      restaurant,
      tables: (tables.data ?? []).sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number)),
      items: (items.data ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
      payments: (payments.data ?? []).map((p) => ({ ...p, amount: Number(p.amount), item_quantities: (p.item_quantities ?? {}) as Record<string, number> })),
      staff: (staff.data ?? []).map((s) => ({ ...s, roles: (roles.data ?? []).filter((r) => r.user_id === s.user_id).map((r) => r.role as StaffRole) })),
      audit: (audit.data ?? []).map((a) => ({ ...a, amount: Number(a.amount) })),
    };
  });

export const resolvePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid(), action: z.enum(["confirm", "cancel"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_table_payment", { p_payment_id: data.paymentId, p_action: data.action });
    if (error) throw new Error(error.message.includes("permissão") ? "Seu cargo não permite confirmar pagamentos" : error.message.includes("resolvido") ? "Este pagamento já foi resolvido" : "Não foi possível atualizar o pagamento");
    return { ok: true };
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: z.string().min(1).max(64),
    email: z.string().trim().email().max(255),
    name: z.string().trim().min(2).max(80),
    role: z.enum(["owner", "cashier", "waiter"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: restaurant } = await context.supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado");
    const { data: allowed } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: restaurant.id, _roles: ["owner"] });
    if (!allowed) throw new Error("Somente o dono ou o fundador pode adicionar pessoas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let userId: string | undefined;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Não foi possível buscar a conta");
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (list.users.length < 200) break;
    }
    if (!userId) throw new Error("Essa pessoa ainda não tem conta. Peça para ela criar em \"Área do restaurante\" com este e-mail.");

    const { error: staffErr } = await supabaseAdmin.from("staff_members").upsert({ user_id: userId, restaurant_id: restaurant.id, display_name: data.name, email }, { onConflict: "user_id,restaurant_id" });
    const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, restaurant_id: restaurant.id, role: data.role }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true });
    if (staffErr || roleErr) throw new Error("Não foi possível adicionar à equipe");
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(64), userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: restaurant } = await context.supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado");
    const { data: allowed } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: restaurant.id, _roles: ["owner"] });
    if (!allowed) throw new Error("Somente o dono ou o fundador pode remover pessoas");
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("restaurant_id", restaurant.id);
    await supabaseAdmin.from("staff_members").delete().eq("user_id", data.userId).eq("restaurant_id", restaurant.id);
    return { ok: true };
  });

export const createRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/),
    pos: z.enum(["saipos", "totvs", "none"]),
    tables: z.number().int().min(1).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.from("restaurants").insert({ name: data.name, slug: data.slug, pos_provider: data.pos }).select("id").single();
    if (error || !r) throw new Error(error?.code === "23505" ? "Esse endereço já está em uso" : "Somente o fundador pode cadastrar restaurantes");
    const rows = Array.from({ length: data.tables }, (_, i) => ({ restaurant_id: r.id, number: String(i + 1) }));
    const { error: tErr } = await context.supabase.from("restaurant_tables").insert(rows);
    if (tErr) throw new Error("Restaurante criado, mas as mesas não foram cadastradas");
    return { slug: data.slug };
  });
