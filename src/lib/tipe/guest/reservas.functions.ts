// Tipe Reserva · Fase 5: reservas dentro do painel do restaurante.
// O módulo só aparece quando a flag "guest.reservations" está ligada para o restaurante (equipe Tipe).
// Dentro dele, o dono decide quando abrir para o público (accepting). Toda mudança de reserva passa
// pelas funções do banco (0042), que revalidam papel, estado, política e capacidade.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addDays,
  dayRange,
  GUEST_RESERVATIONS_FLAG,
  parseTstzRange,
  reservationMetrics,
  type ReservationStatus,
} from "./reservas";
import { guestCan, guestGrantsFrom, guestRoleFrom, type GuestAction } from "./permissoes";

// Linhas cruas do PostgREST (tabelas do Guest fora dos tipos gerados).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
type Ctx = { supabase: SupabaseClient; userId: string };
type Role = "owner" | "manager" | "cashier" | "waiter";

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // As tabelas do Guest ainda não estão nos tipos gerados; o acesso é só no servidor.
  return supabaseAdmin as unknown as SupabaseClient;
}

const slugSchema = z.string().min(1).max(64);
const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Restaurante, papéis do usuário, flag e módulo contratado. Recusa quem não é da equipe e quem
 * não tem a permissão da matriz do Guest (permissoes.ts; no banco, 0057 quando aplicada).
 */
async function acesso(ctx: Ctx, slug: string, need: GuestAction = "ver_reservas") {
  const { data: r } = await ctx.supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado ou sem acesso");
  const db = await admin();
  const { data: rs } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("restaurant_id", r.id);
  const roles = (rs ?? [])
    .map((x: { role: string }) => x.role)
    .filter((x): x is Role => ["owner", "manager", "cashier", "waiter"].includes(x));
  const guestRole = guestRoleFrom(roles);
  if (!guestRole) throw new Error("Sem permissão");
  // Concessões "conforme autorização" (0051). Sem a tabela aplicada: nenhuma concessão.
  const { data: gs } = await db
    .from("restaurant_permission_grants")
    .select("permission")
    .eq("user_id", ctx.userId)
    .eq("restaurant_id", r.id);
  const grants = guestGrantsFrom((gs ?? []).map((x: { permission: string }) => x.permission));
  if (!guestCan(guestRole, need, grants)) throw new Error("Sem permissão para esta ação");
  const [{ data: flag }, { data: modulo }] = await Promise.all([
    db.rpc("guest_flag_enabled", { p_restaurant_id: r.id, p_key: GUEST_RESERVATIONS_FLAG }),
    db.rpc("restaurant_has_module", { p_rid: r.id, p_module: "guest" }),
  ]);
  return {
    id: r.id as string,
    name: r.name as string,
    roles,
    guestRole,
    grants,
    enabled: flag === true && modulo === true,
    db,
  };
}

async function ligado(ctx: Ctx, slug: string, need: GuestAction = "ver_reservas") {
  const a = await acesso(ctx, slug, need);
  if (!a.enabled) throw new Error("Reservas não estão disponíveis para este restaurante");
  return a;
}

/** Leve: o painel usa para decidir se mostra a seção. */
export const getReservasAcesso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const a = await acesso(context as Ctx, data.slug);
      return { enabled: a.enabled };
    } catch {
      return { enabled: false };
    }
  });

export type PainelReserva = {
  id: string;
  name: string;
  phone: string | null;
  party: number;
  start: string;
  end: string;
  status: ReservationStatus;
  channel: string;
  notes: string | null;
  occasion: string | null;
  tableIds: string[];
  seatedTableId: string | null;
};

export type PainelMesa = {
  id: string;
  number: string;
  active: boolean;
  reservable: boolean;
  seatsMin: number | null;
  seatsMax: number | null;
  areaId: string | null;
};

const RES_COLS =
  "id, guest_name, guest_phone, party_size, slot, status, channel, notes, occasion, table_ids, seated_table_id";

function mapReserva(x: Row): PainelReserva | null {
  const r = parseTstzRange(String(x.slot));
  if (!r) return null;
  return {
    id: x.id as string,
    name: x.guest_name as string,
    phone: (x.guest_phone as string | null) ?? null,
    party: Number(x.party_size),
    start: r.start.toISOString(),
    end: r.end.toISOString(),
    status: x.status as ReservationStatus,
    channel: x.channel as string,
    notes: (x.notes as string | null) ?? null,
    occasion: (x.occasion as string | null) ?? null,
    tableIds: (x.table_ids as string[]) ?? [],
    seatedTableId: (x.seated_table_id as string | null) ?? null,
  };
}

const range = (a: Date, b: Date) => `[${a.toISOString()},${b.toISOString()})`;

/** Tudo o que a seção mostra para um dia: reservas, espera, mesas, semana e indicadores reais. */
export const getReservasPainel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: slugSchema, day: daySchema }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await acesso(context as Ctx, data.slug);
    if (!a.enabled) return { enabled: false as const };
    const { db } = a;
    const dia = dayRange(data.day);
    const semana = { start: dia.start, end: dayRange(addDays(data.day, 6)).end };
    const trinta = { start: dayRange(addDays(data.day, -29)).start, end: dia.end };
    const [
      settings,
      rules,
      exceptions,
      tables,
      areas,
      combos,
      dayRes,
      weekRes,
      monthRes,
      waitlist,
      experiences,
    ] = await Promise.all([
      db.rpc("guest_settings", { p_restaurant_id: a.id }),
      db
        .from("guest_availability_rules")
        .select("id, weekday, first_seating, last_seating, active")
        .eq("restaurant_id", a.id)
        .order("weekday"),
      db
        .from("guest_availability_exceptions")
        .select("id, kind, during, table_id, reason")
        .eq("restaurant_id", a.id)
        .overlaps("during", range(dia.start, new Date(dia.start.getTime() + 120 * 86400000))),
      db
        .from("restaurant_tables")
        .select("id, number, active, reservable, seats_min, seats_max, area_id")
        .eq("restaurant_id", a.id)
        .order("number"),
      db.from("guest_areas").select("id, name, active").eq("restaurant_id", a.id).order("position"),
      db
        .from("guest_table_combinations")
        .select("id, table_ids, seats_min, seats_max, active")
        .eq("restaurant_id", a.id),
      db
        .from("guest_reservations")
        .select(RES_COLS)
        .eq("restaurant_id", a.id)
        .overlaps("slot", range(dia.start, dia.end)),
      db
        .from("guest_reservations")
        .select("slot, party_size, status")
        .eq("restaurant_id", a.id)
        .overlaps("slot", range(semana.start, semana.end)),
      db
        .from("guest_reservations")
        .select("party_size, status, channel")
        .eq("restaurant_id", a.id)
        .overlaps("slot", range(trinta.start, trinta.end)),
      db
        .from("guest_waitlist_entries")
        .select(
          "id, guest_name, guest_phone, party_size, wanted, status, respond_by, created_at, kind, verified_by",
        )
        .eq("restaurant_id", a.id)
        .overlaps("wanted", range(dia.start, dia.end))
        .order("created_at"),
      db
        .from("guest_experiences")
        .select("id, kind, title, description, party_min, party_max, price_cents, active")
        .eq("restaurant_id", a.id)
        .order("created_at"),
    ]);
    const err = [
      settings,
      rules,
      exceptions,
      tables,
      areas,
      combos,
      dayRes,
      weekRes,
      monthRes,
      waitlist,
      experiences,
    ].find((x) => x.error)?.error;
    if (err) throw new Error("Não foi possível carregar as reservas");
    const s = (Array.isArray(settings.data) ? settings.data[0] : settings.data) as Row;

    const reservas = (dayRes.data ?? [])
      .map(mapReserva)
      .filter((x): x is PainelReserva => x !== null && x.start >= dia.start.toISOString())
      .sort((x, y) => x.start.localeCompare(y.start) || x.name.localeCompare(y.name))
      // Garçom vê só o necessário para servir: primeiro nome, sem telefone (matriz do Guest).
      .map((x) =>
        a.guestRole === "garcom"
          ? { ...x, name: x.name.trim().split(/\s+/)[0] ?? "", phone: null }
          : x,
      );

    // Contagem por dia local da semana (só reservas ativas ou atendidas).
    const ativas = new Set(["pendente", "confirmada", "chegou", "sentada", "concluida"]);
    const semanaDias = Array.from({ length: 7 }, (_, i) => addDays(data.day, i)).map((day) => {
      const r = dayRange(day);
      const doDia = (weekRes.data ?? []).filter((x: Row) => {
        const p = parseTstzRange(String(x.slot));
        return p && p.start >= r.start && p.start < r.end && ativas.has(String(x.status));
      });
      return {
        day,
        reservas: doDia.length,
        pessoas: doDia.reduce((t: number, x: Row) => t + Number(x.party_size), 0),
      };
    });

    return {
      enabled: true as const,
      restaurant: a.name,
      roles: a.roles,
      guestRole: a.guestRole,
      grants: a.grants,
      settings: {
        accepting: s.accepting === true,
        slotIntervalMin: Number(s.slot_interval_min),
        durationMin: Number(s.duration_min),
        bufferMin: Number(s.buffer_min),
        minAdvanceMin: Number(s.min_advance_min),
        maxAdvanceDays: Number(s.max_advance_days),
        minParty: Number(s.min_party),
        maxParty: Number(s.max_party),
        cancelCutoffMin: Number(s.cancel_cutoff_min),
        autoConfirm: s.auto_confirm === true,
      },
      rules: (rules.data ?? []).map((r: Row) => ({
        id: r.id as string,
        weekday: Number(r.weekday),
        first: String(r.first_seating).slice(0, 5),
        last: String(r.last_seating).slice(0, 5),
        active: r.active === true,
      })),
      exceptions: (exceptions.data ?? []).flatMap((e: Row) => {
        const p = parseTstzRange(String(e.during));
        return p
          ? [
              {
                id: e.id as string,
                kind: e.kind as string,
                start: p.start.toISOString(),
                end: p.end.toISOString(),
                tableId: (e.table_id as string | null) ?? null,
                reason: (e.reason as string | null) ?? null,
              },
            ]
          : [];
      }),
      tables: (tables.data ?? []).map((t: Row): PainelMesa => ({
        id: t.id as string,
        number: String(t.number),
        active: t.active === true,
        reservable: t.reservable === true,
        seatsMin: (t.seats_min as number | null) ?? null,
        seatsMax: (t.seats_max as number | null) ?? null,
        areaId: (t.area_id as string | null) ?? null,
      })),
      areas: (areas.data ?? []).map((x: Row) => ({
        id: x.id as string,
        name: x.name as string,
        active: x.active === true,
      })),
      combinations: (combos.data ?? []).length,
      reservas,
      semana: semanaDias,
      waitlist: (waitlist.data ?? []).flatMap((w: Row) => {
        const p = parseTstzRange(String(w.wanted));
        return p
          ? [
              {
                id: w.id as string,
                name: w.guest_name as string,
                party: Number(w.party_size),
                from: p.start.toISOString(),
                to: p.end.toISOString(),
                status: w.status as string,
                respondBy: (w.respond_by as string | null) ?? null,
                kind: (w.kind === "presencial" ? "presencial" : "reserva") as
                  "presencial" | "reserva",
                phone: (w.guest_phone as string | null) ?? null,
                viaQr: w.verified_by === "qr_local",
                createdAt: w.created_at as string,
              },
            ]
          : [];
      }),
      experiences: (experiences.data ?? []).map((x: Row) => ({
        id: x.id as string,
        kind: x.kind as string,
        title: x.title as string,
        description: (x.description as string | null) ?? null,
        partyMin: Number(x.party_min),
        partyMax: Number(x.party_max),
        priceCents: (x.price_cents as number | null) ?? null,
        active: x.active === true,
      })),
      metricas30: !guestCan(a.guestRole, "ver_relatorios", a.grants)
        ? null
        : reservationMetrics(
            (monthRes.data ?? []).map((x: Row) => ({
              status: x.status as ReservationStatus,
              partySize: Number(x.party_size),
              channel: String(x.channel),
            })),
          ),
    };
  });

/** Trilha de uma reserva (quem fez o quê e quando). */
export const getReservaHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: slugSchema, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug);
    const { data: ev, error } = await a.db
      .from("guest_reservation_events")
      .select("action, actor_kind, from_status, to_status, detail, created_at")
      .eq("restaurant_id", a.id)
      .eq("reservation_id", data.id)
      .order("created_at");
    if (error) throw new Error("Não foi possível carregar o histórico");
    return (ev ?? []).map((e: Row) => ({
      action: e.action as string,
      actor: e.actor_kind as string,
      from: (e.from_status as string | null) ?? null,
      to: (e.to_status as string | null) ?? null,
      at: e.created_at as string,
    }));
  });

/** Confirmar, chegada, não veio, concluir ou cancelar (com motivo). */
export const agirReserva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        id: z.string().uuid(),
        to: z.enum(["confirmada", "chegou", "nao_compareceu", "concluida", "cancelar"]),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await ligado(ctx, data.slug, "confirmar_chegada");
    const srv = await import("./reservas.server");
    if (data.to === "cancelar")
      return srv.cancelReservation({
        reservationId: data.id,
        actorId: ctx.userId,
        by: "restaurante",
        reason: data.reason,
      });
    return srv.setReservationStatus({ reservationId: data.id, actorId: ctx.userId, to: data.to });
  });

/** Check-in na mesa: registra a mesa em que o grupo sentou. O pagamento da mesa segue igual. */
export const sentarReserva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: slugSchema, id: z.string().uuid(), tableId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await ligado(ctx, data.slug, "atribuir_mesa");
    const { seatReservation } = await import("./reservas.server");
    return seatReservation({ reservationId: data.id, actorId: ctx.userId, tableId: data.tableId });
  });

/** Reserva anotada pela equipe (telefone ou balcão), pelo mesmo motor do app. */
export const novaReservaEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        start: z.string().datetime({ offset: true }),
        party: z.number().int().min(1).max(99),
        name: z.string().trim().min(1).max(80),
        phone: z
          .string()
          .trim()
          .regex(/^\+?[0-9]{10,15}$/)
          .optional()
          .or(z.literal("")),
        notes: z.string().trim().max(500).optional(),
        channel: z.enum(["telefone", "painel"]).default("telefone"),
        requestId: z.string().min(8).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const a = await ligado(ctx, data.slug, "criar_reserva");
    const srv = await import("./reservas.server");
    const sessionKey = `painel:${ctx.userId}:${data.requestId}`;
    const hold = await srv.createHold({
      restaurantId: a.id,
      userId: null,
      sessionKey,
      party: data.party,
      start: data.start,
    });
    return srv.confirmReservation({
      holdId: hold.holdId,
      sessionKey,
      idempotencyKey: `painel:${data.requestId}`,
      userId: ctx.userId,
      name: data.name,
      phone: data.phone || null,
      notes: data.notes || null,
      channel: data.channel,
    });
  });

/** Avisa o próximo da lista de espera; ele tem o prazo para responder pelo app. */
export const chamarEspera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        id: z.string().uuid(),
        minutes: z.number().int().min(5).max(60).default(15),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await ligado(ctx, data.slug, "gerenciar_espera");
    const { callWaitlist } = await import("./reservas.server");
    return callWaitlist({ entryId: data.id, actorId: ctx.userId, minutes: data.minutes });
  });

// ---------------------------------------------------------------- configuração (só dono)

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const salvarConfigReservas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        accepting: z.boolean(),
        slotIntervalMin: z.union([
          z.literal(10),
          z.literal(15),
          z.literal(20),
          z.literal(30),
          z.literal(60),
        ]),
        durationMin: z.number().int().min(15).max(480),
        bufferMin: z.number().int().min(0).max(120),
        minAdvanceMin: z.number().int().min(0).max(10080),
        maxAdvanceDays: z.number().int().min(1).max(365),
        minParty: z.number().int().min(1).max(99),
        maxParty: z.number().int().min(1).max(99),
        cancelCutoffMin: z.number().int().min(0).max(10080),
        autoConfirm: z.boolean(),
      })
      .refine((x) => x.minParty <= x.maxParty, "Grupo mínimo maior que o máximo")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "configurar_politicas");
    const { error } = await a.db.from("guest_reservation_settings").upsert({
      restaurant_id: a.id,
      accepting: data.accepting,
      slot_interval_min: data.slotIntervalMin,
      duration_min: data.durationMin,
      buffer_min: data.bufferMin,
      min_advance_min: data.minAdvanceMin,
      max_advance_days: data.maxAdvanceDays,
      min_party: data.minParty,
      max_party: data.maxParty,
      cancel_cutoff_min: data.cancelCutoffMin,
      auto_confirm: data.autoConfirm,
    });
    if (error) throw new Error("Não foi possível salvar a configuração");
    return { ok: true };
  });

/** Turnos da semana: substitui todos de uma vez (lista curta, editada inteira). */
export const salvarTurnos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        rules: z
          .array(
            z
              .object({ weekday: z.number().int().min(0).max(6), first: hhmm, last: hhmm })
              .refine((r) => r.first <= r.last, "Primeira chegada depois da última"),
          )
          .max(28),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "alterar_disponibilidade");
    const del = await a.db.from("guest_availability_rules").delete().eq("restaurant_id", a.id);
    if (del.error) throw new Error("Não foi possível salvar os turnos");
    if (data.rules.length) {
      const ins = await a.db.from("guest_availability_rules").insert(
        data.rules.map((r) => ({
          restaurant_id: a.id,
          weekday: r.weekday,
          first_seating: r.first,
          last_seating: r.last,
        })),
      );
      if (ins.error) throw new Error("Não foi possível salvar os turnos");
    }
    return { ok: true };
  });

export const salvarExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        kind: z.enum(["feriado", "evento_privado", "bloqueio"]),
        start: z.string().datetime({ offset: true }),
        end: z.string().datetime({ offset: true }),
        tableId: z.string().uuid().nullable().optional(),
        reason: z.string().trim().max(200).optional(),
      })
      .refine((x) => Date.parse(x.start) < Date.parse(x.end), "O fim precisa ser depois do início")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const a = await ligado(ctx, data.slug, "alterar_disponibilidade");
    if (data.tableId) {
      const { data: t } = await a.db
        .from("restaurant_tables")
        .select("id")
        .eq("id", data.tableId)
        .eq("restaurant_id", a.id)
        .maybeSingle();
      if (!t) throw new Error("Mesa não encontrada neste restaurante");
    }
    const { error } = await a.db.from("guest_availability_exceptions").insert({
      restaurant_id: a.id,
      kind: data.kind,
      during: range(new Date(data.start), new Date(data.end)),
      table_id: data.tableId ?? null,
      reason: data.reason || null,
      created_by: ctx.userId,
    });
    if (error) throw new Error("Não foi possível salvar o bloqueio");
    return { ok: true };
  });

export const removerExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: slugSchema, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "alterar_disponibilidade");
    const { error } = await a.db
      .from("guest_availability_exceptions")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", a.id);
    if (error) throw new Error("Não foi possível remover o bloqueio");
    return { ok: true };
  });

/** Mesa entra ou sai das reservas, com lugares e área. Não mexe em número, QR nem conta. */
export const salvarMesaReserva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        tableId: z.string().uuid(),
        reservable: z.boolean(),
        seatsMin: z.number().int().min(1).max(99).nullable(),
        seatsMax: z.number().int().min(1).max(99).nullable(),
        areaId: z.string().uuid().nullable(),
      })
      .refine((x) => !x.reservable || x.seatsMax !== null, "Informe quantos lugares a mesa tem")
      .refine(
        (x) => x.seatsMin === null || x.seatsMax === null || x.seatsMin <= x.seatsMax,
        "Mínimo maior que o máximo",
      )
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "alterar_disponibilidade");
    if (data.areaId) {
      const { data: ar } = await a.db
        .from("guest_areas")
        .select("id")
        .eq("id", data.areaId)
        .eq("restaurant_id", a.id)
        .maybeSingle();
      if (!ar) throw new Error("Área não encontrada");
    }
    const { data: up, error } = await a.db
      .from("restaurant_tables")
      .update({
        reservable: data.reservable,
        seats_min: data.seatsMin,
        seats_max: data.seatsMax,
        area_id: data.areaId,
      })
      .eq("id", data.tableId)
      .eq("restaurant_id", a.id)
      .select("id");
    if (error || !up?.length) throw new Error("Não foi possível salvar a mesa");
    return { ok: true };
  });

export const salvarArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: slugSchema, name: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "alterar_disponibilidade");
    const { error } = await a.db
      .from("guest_areas")
      .insert({ restaurant_id: a.id, name: data.name });
    if (error)
      throw new Error(
        error.code === "23505"
          ? "Já existe uma área com esse nome"
          : "Não foi possível criar a área",
      );
    return { ok: true };
  });

/** Experiências (menu degustação, evento, grupo). Pré-pagamento continua travado no banco. */
export const salvarExperiencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        id: z.string().uuid().optional(),
        kind: z.enum(["menu_degustacao", "evento", "grupo"]),
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().max(600).optional(),
        partyMin: z.number().int().min(1).max(99),
        partyMax: z.number().int().min(1).max(99),
        priceCents: z.number().int().min(0).max(10_000_000).nullable(),
        active: z.boolean(),
      })
      .refine((x) => x.partyMin <= x.partyMax, "Grupo mínimo maior que o máximo")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await ligado(context as Ctx, data.slug, "gerenciar_experiencias");
    const row = {
      restaurant_id: a.id,
      kind: data.kind,
      title: data.title,
      description: data.description || null,
      party_min: data.partyMin,
      party_max: data.partyMax,
      price_cents: data.priceCents,
      active: data.active,
    };
    const res = data.id
      ? await a.db
          .from("guest_experiences")
          .update(row)
          .eq("id", data.id)
          .eq("restaurant_id", a.id)
          .select("id")
      : await a.db.from("guest_experiences").insert(row).select("id");
    if (res.error || !res.data?.length) throw new Error("Não foi possível salvar a experiência");
    return { ok: true };
  });
