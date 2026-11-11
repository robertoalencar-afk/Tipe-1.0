import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Tipe Order, Fase 2: módulos contratados e liberação de pedidos na mesa.
// A regra mora no banco (restaurant_has_module, table_ordering_block e
// pdv_customer_order); aqui só autorizamos quem chama e traduzimos os erros.

const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
const TableNumber = z.string().min(1).max(16);

export const MODULES = ["order", "kds", "totem", "three_d"] as const;
export type ModuleKey = (typeof MODULES)[number];
export const MODULE_STATES = ["active", "suspended", "cancelled"] as const;
export type ModuleState = (typeof MODULE_STATES)[number];
export type OrderSessionMode = "staff_opens" | "table_code";

/** Como a mesa está para pedir agora, do ponto de vista do cliente. */
export type OrderingState = "open" | "closed" | "code";

const friendly = (msg: string, fallback: string) => {
  for (const k of [
    "Sem permissão",
    "não está ativo",
    "Mesa inativa",
    "Informe o motivo",
    "Módulo inválido",
    "Estado inválido",
  ]) {
    if (msg.includes(k)) return msg;
  }
  return fallback;
};

/** Equipe libera pedidos pelo celular numa mesa. No modo código, devolve os 4 dígitos para passar ao cliente. */
export const openTableOrdering = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: TableNumber }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("open_table_ordering", {
      p_slug: data.slug,
      p_table: data.table,
    });
    if (error)
      throw new Error(friendly(error.message, "Não foi possível liberar os pedidos desta mesa"));
    const r = res as {
      id: string;
      code: string | null;
      requires_code: boolean;
      expires_at: string;
      reused: boolean;
    };
    return {
      id: r.id,
      code: r.code,
      requiresCode: r.requires_code,
      expiresAt: r.expires_at,
      reused: r.reused,
    };
  });

export const closeTableOrdering = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, table: TableNumber }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("close_table_ordering", {
      p_slug: data.slug,
      p_table: data.table,
    });
    if (error)
      throw new Error(friendly(error.message, "Não foi possível encerrar os pedidos desta mesa"));
    return { ok: true };
  });

export type RestaurantOrderAccess = {
  modules: Partial<Record<ModuleKey, ModuleState>>;
  orderActive: boolean;
  mode: OrderSessionMode;
  /** Mesas com pedidos liberados agora (a conta atual da mesa). */
  open: {
    table: string;
    code: string | null;
    requiresCode: boolean;
    expiresAt: string;
    locked: boolean;
  }[];
};

/** Painel e garçom: módulos do restaurante e mesas liberadas. Leitura pela RLS de membro. */
export const getOrderAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }): Promise<RestaurantOrderAccess> => {
    const sb = context.supabase;
    const { data: r } = await sb
      .from("restaurants")
      .select("id, order_session_mode")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado ou sem acesso");
    const [mods, sessions, tables] = await Promise.all([
      sb.from("restaurant_modules").select("module, status").eq("restaurant_id", r.id),
      sb
        .from("table_order_sessions")
        .select(
          "table_number, bill_session, short_code, requires_code, expires_at, failed_attempts",
        )
        .eq("restaurant_id", r.id)
        .is("closed_at", null),
      sb
        .from("restaurant_tables")
        .select("number, session_token" as never)
        .eq("restaurant_id", r.id),
    ]);
    const modules: RestaurantOrderAccess["modules"] = {};
    for (const m of mods.data ?? []) modules[m.module as ModuleKey] = m.status as ModuleState;
    const bill = new Map(
      ((tables.data ?? []) as unknown as { number: string; session_token: string }[]).map((t) => [
        t.number,
        t.session_token,
      ]),
    );
    const now = Date.now();
    const open = (sessions.data ?? [])
      .filter(
        (s) =>
          bill.get(s.table_number) === s.bill_session && new Date(s.expires_at).getTime() > now,
      )
      .map((s) => ({
        table: s.table_number,
        code: s.short_code,
        requiresCode: s.requires_code,
        expiresAt: s.expires_at,
        locked: s.failed_attempts >= 10,
      }));
    return {
      modules,
      orderActive: modules.order === "active",
      mode: (r.order_session_mode as OrderSessionMode) ?? "staff_opens",
      open,
    };
  });

/**
 * Cliente digita o código curto da mesa (modo table_code). Limite por IP e mesa
 * além do bloqueio de 10 erros no banco: adivinhar 4 dígitos não compensa.
 */
export const claimTableOrdering = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        code: z.string().min(1).max(32),
        session: z.string().min(1).max(96),
        pin: z.string().regex(/^[0-9]{4}$/),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; token: string | null }
      | { ok: false; reason: "closed" | "locked" | "wrong_code" | "invalid" }
    > => {
      const { enforceRate, clientIp, safeEqual, logSecurityEvent } =
        await import("./security.server");
      await enforceRate(`order-pin:${data.slug}:${data.code}:${clientIp()}`, 8, 600, data.slug);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: r } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!r) return { ok: false, reason: "invalid" };
      const { data: t } = (await supabaseAdmin
        .from("restaurant_tables")
        .select("number, active, session_token" as never)
        .eq("restaurant_id", r.id)
        .eq("code", data.code.toLowerCase())
        .maybeSingle()) as unknown as {
        data: { number: string; active: boolean; session_token: string } | null;
      };
      if (!t || !t.active || !safeEqual(t.session_token, data.session))
        return { ok: false, reason: "invalid" };
      const { data: res, error } = await supabaseAdmin.rpc("claim_table_ordering", {
        p_slug: data.slug,
        p_table: t.number,
        p_bill_session: data.session,
        p_code: data.pin,
      });
      if (error) return { ok: false, reason: "invalid" };
      const out = res as {
        ok: boolean;
        token?: string | null;
        reason?: "closed" | "locked" | "wrong_code";
      };
      if (!out.ok) {
        if (out.reason !== "closed")
          await logSecurityEvent({
            action: "order_pin_denied",
            resource: `mesa:${t.number}`,
            result: "denied",
            restaurantSlug: data.slug,
            restaurantId: r.id,
            detail: `motivo=${out.reason} ip=${clientIp()}`,
          });
        return { ok: false, reason: out.reason ?? "invalid" };
      }
      return { ok: true, token: out.token ?? null };
    },
  );

/** Fundador (com 2FA) contrata, suspende ou cancela um módulo. Fica na trilha e em security_events. */
export const setRestaurantModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurantId: z.string().uuid(),
        module: z.enum(MODULES),
        status: z.enum(MODULE_STATES),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireFounder2fa } = await import("./founder-guard");
    await requireFounder2fa(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("set_restaurant_module", {
      p_rid: data.restaurantId,
      p_module: data.module,
      p_status: data.status,
      p_reason: data.reason ?? null,
      p_actor: context.userId,
      p_actor_kind: "founder",
    });
    if (error) throw new Error(friendly(error.message, "Não foi possível mudar o módulo"));
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({
      action: "module_changed",
      resource: `modulo:${data.module}`,
      restaurantId: data.restaurantId,
      actorId: context.userId,
      detail: `estado=${data.status}${data.reason ? ` motivo=${data.reason}` : ""}`,
    });
    return res as { module: ModuleKey; status: ModuleState; changed: boolean };
  });

/** Fundador: módulos de todos os restaurantes, para o backoffice. */
export const listRestaurantModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireFounder2fa } = await import("./founder-guard");
    await requireFounder2fa(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("restaurant_modules")
      .select("restaurant_id, module, status, reason, changed_at");
    return (data ?? []).map((m) => ({
      restaurantId: m.restaurant_id,
      module: m.module as ModuleKey,
      status: m.status as ModuleState,
      reason: m.reason,
      changedAt: m.changed_at,
    }));
  });
