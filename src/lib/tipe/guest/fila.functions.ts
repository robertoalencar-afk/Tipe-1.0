// Tipe Guest · fila de espera presencial (0043). O cliente entra pelo QR da porta e o aparelho
// confirma, uma única vez, que ele está no restaurante. O banco confere token, raio e precisão e não
// guarda coordenadas. A recepção também pode incluir quem chegou sem celular.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GUEST_RESERVATIONS_FLAG } from "./reservas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
type Ctx = { supabase: SupabaseClient; userId: string };

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
const Token = z.string().regex(/^[a-f0-9]{32}$/);
const DeviceKey = z.string().regex(/^[A-Za-z0-9_-]{16,80}$/);
const Phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ""))
  .refine((s) => s === "" || /^\+?[0-9]{10,15}$/.test(s), "Telefone inválido");

export class FilaError extends Error {
  status = 409;
}

/** Mensagens do banco já são escritas para o cliente; o resto vira uma frase genérica. */
function msg(e: { message: string } | null | undefined) {
  const m = e?.message ?? "";
  return /[A-Za-zÀ-ú]{3,} [A-Za-zÀ-ú]/.test(m) && !/permission|violates|relation|function/i.test(m)
    ? m
    : "Não foi possível concluir agora. Tente de novo";
}

async function rateIp(action: string, max: number, slug?: string) {
  const { enforceRate, clientIp } = await import("@/lib/tipe/security.server");
  await enforceRate(`guest-fila:${action}:${clientIp()}`, max, 60, slug);
}

/** Restaurante do endereço e o QR conferido em tempo constante. null quando não batem. */
async function portaDoRestaurante(slug: string, token: string) {
  const db = await admin();
  const { data: r } = await db
    .from("restaurants")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!r) return null;
  const { data: w } = await db
    .from("guest_walkin_settings")
    .select("enabled, door_token")
    .eq("restaurant_id", r.id)
    .maybeSingle();
  const { safeEqual } = await import("@/lib/tipe/security.server");
  if (!w || !safeEqual(String(w.door_token), token)) return null;
  return { db, r: r as { id: string; name: string }, w: w as { enabled: boolean } };
}

// ---------------------------------------------------------------- público (cliente na porta)

export type FilaInfo =
  | {
      ok: true;
      restaurant: string;
      open: boolean;
      minParty: number;
      maxParty: number;
      waiting: number;
    }
  | { ok: false; error: "invalid_token" };

/** Tela inicial do QR: nome do restaurante, se a fila está aberta e quantos grupos aguardam. */
export const infoFila = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug, token: Token }).parse(d))
  .handler(async ({ data }): Promise<FilaInfo> => {
    await rateIp("info", 60, data.slug);
    const porta = await portaDoRestaurante(data.slug, data.token);
    if (!porta) return { ok: false, error: "invalid_token" };
    const { db, r, w } = porta;
    const [flag, settings, fila] = await Promise.all([
      db.rpc("guest_flag_enabled", { p_restaurant_id: r.id, p_key: GUEST_RESERVATIONS_FLAG }),
      db.rpc("guest_settings", { p_restaurant_id: r.id }),
      db
        .from("guest_waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", r.id)
        .eq("kind", "presencial")
        .in("status", ["aguardando", "convocado"]),
    ]);
    const s = (Array.isArray(settings.data) ? settings.data[0] : settings.data) as Row;
    return {
      ok: true,
      restaurant: r.name as string,
      open: w.enabled === true && flag.data === true,
      minParty: Number(s?.min_party ?? 1),
      maxParty: Number(s?.max_party ?? 12),
      waiting: fila.count ?? 0,
    };
  });

/** Entra na fila. A localização é usada só nesta conferência e não fica salva. */
export const entrarNaFila = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        token: Token,
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().min(0).max(100000),
        deviceKey: DeviceKey,
        name: z.string().trim().min(2).max(60),
        party: z.number().int().min(1).max(30),
        phone: Phone.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await rateIp("entrar", 10, data.slug);
    // O QR precisa ser deste restaurante (o endereço e o token batem) antes de qualquer escrita.
    const porta = await portaDoRestaurante(data.slug, data.token);
    if (!porta) throw new FilaError("QR Code inválido ou trocado. Escaneie o QR da porta de novo");
    const { data: rows, error } = await porta.db.rpc("guest_join_walkin", {
      p_door_token: data.token,
      p_lat: data.lat,
      p_lng: data.lng,
      p_accuracy_m: data.accuracy,
      p_device_key: data.deviceKey,
      p_guest_user_id: null,
      p_guest_name: data.name,
      p_party: data.party,
      p_guest_phone: data.phone || null,
    });
    if (error) throw new FilaError(msg(error));
    const row = (rows as Row[])?.[0];
    if (!row) throw new FilaError("Não foi possível entrar na fila. Tente de novo");
    return { entryId: row.entry_id as string, position: Number(row.position_estimate) };
  });

export type FilaStatus = {
  status: "aguardando" | "convocado" | "confirmado" | "cancelado" | "expirado";
  position: number;
  respondBy: string | null;
  restaurant: string;
  party: number;
} | null;

/** Acompanhamento: o celular consulta a cada poucos segundos. Só o aparelho que entrou vê. */
export const statusFila = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ entryId: z.string().uuid(), deviceKey: DeviceKey }).parse(d))
  .handler(async ({ data }): Promise<FilaStatus> => {
    await rateIp("status", 30);
    const db = await admin();
    const { data: rows, error } = await db.rpc("guest_walkin_status", {
      p_entry_id: data.entryId,
      p_device_key: data.deviceKey,
    });
    if (error) throw new FilaError(msg(error));
    const x = (rows as Row[])?.[0];
    if (!x) return null;
    return {
      status: x.status,
      position: Number(x.position_estimate ?? 0),
      respondBy: (x.respond_by as string | null) ?? null,
      restaurant: x.restaurant_name as string,
      party: Number(x.party_size),
    };
  });

export const sairDaFila = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ entryId: z.string().uuid(), deviceKey: DeviceKey }).parse(d))
  .handler(async ({ data }) => {
    await rateIp("sair", 10);
    const db = await admin();
    const { error } = await db.rpc("guest_leave_walkin", {
      p_entry_id: data.entryId,
      p_device_key: data.deviceKey,
    });
    if (error) throw new FilaError(msg(error));
    return { ok: true };
  });

// ---------------------------------------------------------------- equipe (painel)

async function equipe(ctx: Ctx, slug: string) {
  const { data: r } = await ctx.supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado ou sem acesso");
  return { id: r.id as string, db: await admin() };
}

async function limiteEquipe(action: string, userId: string) {
  const { enforceRate } = await import("@/lib/tipe/security.server");
  await enforceRate(`guest-fila:${action}:user:${userId}`, 30, 60);
}

/** Recepção inclui quem chegou sem celular (verificado pela equipe). */
export const adicionarNaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        name: z.string().trim().min(2).max(60),
        party: z.number().int().min(1).max(30),
        phone: Phone.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await limiteEquipe("add", ctx.userId);
    const a = await equipe(ctx, data.slug);
    const { data: id, error } = await a.db.rpc("guest_add_walkin", {
      p_restaurant_id: a.id,
      p_actor: ctx.userId,
      p_guest_name: data.name,
      p_party: data.party,
      p_guest_phone: data.phone || null,
    });
    if (error) throw new FilaError(msg(error));
    return { id: id as string };
  });

/** Avisa o grupo que a mesa está pronta, com o prazo definido na configuração da fila. */
export const avisarFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await limiteEquipe("call", ctx.userId);
    const a = await equipe(ctx, data.slug);
    const { data: w } = await a.db
      .from("guest_walkin_settings")
      .select("call_minutes")
      .eq("restaurant_id", a.id)
      .maybeSingle();
    const { data: by, error } = await a.db.rpc("guest_call_waitlist", {
      p_entry_id: data.id,
      p_actor: ctx.userId,
      p_minutes: Number(w?.call_minutes ?? 10),
    });
    if (error) throw new FilaError(msg(error));
    return { respondBy: by as string };
  });

/** Encerra uma entrada: sentou (vira atendida) ou desistiu. */
export const encerrarFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: Slug, id: z.string().uuid(), seated: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await limiteEquipe("finish", ctx.userId);
    const a = await equipe(ctx, data.slug);
    const { data: st, error } = await a.db.rpc("guest_finish_walkin", {
      p_entry_id: data.id,
      p_actor: ctx.userId,
      p_seated: data.seated,
    });
    if (error) throw new FilaError(msg(error));
    return { status: st as string };
  });

// ---------------------------------------------------------------- configuração (dono)

export type FilaConfig = {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  callMinutes: number;
  token: string | null;
  tokenRotatedAt: string | null;
  isOwner: boolean;
};

async function papeis(db: SupabaseClient, userId: string, rid: string) {
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("restaurant_id", rid);
  return (data ?? []).map((x: { role: string }) => x.role);
}

/** Configuração da fila. O token do QR só vai para o dono. */
export const getFilaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }): Promise<FilaConfig> => {
    const ctx = context as Ctx;
    const a = await equipe(ctx, data.slug);
    const roles = await papeis(a.db, ctx.userId, a.id);
    if (!roles.some((x) => ["owner", "cashier", "waiter"].includes(x)))
      throw new Error("Sem permissão");
    const isOwner = roles.includes("owner");
    const { data: w } = await a.db
      .from("guest_walkin_settings")
      .select("enabled, lat, lng, radius_m, call_minutes, door_token, token_rotated_at")
      .eq("restaurant_id", a.id)
      .maybeSingle();
    return {
      enabled: w?.enabled === true,
      lat: w?.lat ?? null,
      lng: w?.lng ?? null,
      radiusM: Number(w?.radius_m ?? 150),
      callMinutes: Number(w?.call_minutes ?? 10),
      token: isOwner ? ((w?.door_token as string | undefined) ?? null) : null,
      tokenRotatedAt: isOwner ? ((w?.token_rotated_at as string | undefined) ?? null) : null,
      isOwner,
    };
  });

export const salvarFilaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        enabled: z.boolean(),
        lat: z.number().min(-90).max(90).nullable(),
        lng: z.number().min(-180).max(180).nullable(),
        radiusM: z.number().int().min(50).max(500),
        callMinutes: z.number().int().min(5).max(30),
      })
      .refine(
        (x) => !x.enabled || (x.lat !== null && x.lng !== null),
        "Marque a localização do restaurante antes de abrir a fila",
      )
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await limiteEquipe("config", ctx.userId);
    const a = await equipe(ctx, data.slug);
    if (!(await papeis(a.db, ctx.userId, a.id)).includes("owner"))
      throw new Error("Só o dono altera a fila");
    const { error } = await a.db.from("guest_walkin_settings").upsert(
      {
        restaurant_id: a.id,
        enabled: data.enabled,
        lat: data.lat,
        lng: data.lng,
        radius_m: data.radiusM,
        call_minutes: data.callMinutes,
      },
      { onConflict: "restaurant_id" },
    );
    if (error) throw new Error("Não foi possível salvar a fila");
    return { ok: true };
  });

/** Gera um QR novo. Os QR impressos antes deixam de funcionar. */
export const trocarQrPorta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await limiteEquipe("rotate", ctx.userId);
    const a = await equipe(ctx, data.slug);
    const { data: tok, error } = await a.db.rpc("guest_rotate_door_token", {
      p_restaurant_id: a.id,
      p_actor: ctx.userId,
    });
    if (error) throw new FilaError(msg(error));
    return { token: tok as string };
  });
