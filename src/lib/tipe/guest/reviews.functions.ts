// Tipe Guest · Fase 2: consentimento na conta, moderação no Backoffice e contestação no painel.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GUEST_REVIEWS_FLAG, REVIEW_CONSENT_TEXT, REVIEW_CONSENT_VERSION } from "./review-consent";

const TableInput = z.object({ restaurantId: z.string().max(64), tableId: z.string().max(16), session: z.string().min(16).max(96) });

/** A conta do QR pergunta se mostra o consentimento. Desligado = tela igual à de sempre. */
export const getReviewConsentConfig = createServerFn({ method: "POST" })
  .inputValidator((d) => TableInput.parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession } = await import("../security.server");
    const ok = await verifyTableSession(data.restaurantId, data.tableId, data.session);
    if (!ok) return { enabled: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { guestReviewsEnabled } = await import("./reviews.server");
    if (!(await guestReviewsEnabled(supabaseAdmin as never, ok.restaurantId))) return { enabled: false as const };
    return { enabled: true as const, version: REVIEW_CONSENT_VERSION, text: REVIEW_CONSENT_TEXT };
  });

// ------------------------------------------------------------- equipe Tipe (2FA)

async function requireFounder(ctx: { supabase: unknown; userId: string; claims?: unknown }) {
  const { requireFounder2fa } = await import("../founder-guard");
  await requireFounder2fa(ctx as never);
}

export type GuestReviewQueueItem = {
  id: string; restaurant: string; stars: number; comment: string | null; verified: boolean;
  status: "pendente" | "aprovada" | "oculta" | "em_revisao"; identity: string; createdAt: string;
  openReports: { kind: string; reason: string }[];
};

/** Fila de moderação: só avaliações com consentimento (as demais nunca saem do restaurante). */
export const listGuestReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["pendente", "em_revisao", "aprovada", "oculta"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (db.from("guest_reviews" as never) as any)
      .select("id, restaurant_id, service_stars, comment, verification, moderation_status, public_identity, public_first_name, created_at")
      .eq("publish_consent", true).eq("moderation_status", data.status).order("created_at", { ascending: true }).limit(100);
    if (error) throw new Error("Não foi possível ler a fila de avaliações");
    const list = (rows ?? []) as Array<{ id: string; restaurant_id: string; service_stars: number; comment: string | null; verification: string; moderation_status: GuestReviewQueueItem["status"]; public_identity: string; public_first_name: string | null; created_at: string }>;
    const ids = [...new Set(list.map((r) => r.restaurant_id))];
    const [{ data: rest }, { data: reps }] = await Promise.all([
      ids.length ? db.from("restaurants").select("id, name").in("id", ids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      list.length ? (db.from("guest_review_reports" as never) as any).select("review_id, kind, reason").eq("status", "aberta").in("review_id", list.map((r) => r.id)) : Promise.resolve({ data: [] }),
    ]);
    const names = new Map((rest ?? []).map((r) => [r.id, r.name]));
    const reports = (reps ?? []) as { review_id: string; kind: string; reason: string }[];
    return list.map<GuestReviewQueueItem>((r) => ({
      id: r.id, restaurant: names.get(r.restaurant_id) ?? "Restaurante", stars: r.service_stars, comment: r.comment,
      verified: r.verification === "visita_paga_verificada", status: r.moderation_status,
      identity: r.public_identity === "primeiro_nome" && r.public_first_name ? r.public_first_name : "Cliente verificado",
      createdAt: r.created_at, openReports: reports.filter((x) => x.review_id === r.id).map(({ kind, reason }) => ({ kind, reason })),
    }));
  });

export const moderateGuestReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reviewId: z.string().uuid(), action: z.enum(["aprovar", "ocultar", "reabrir"]), reason: z.string().trim().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: status, error } = await (db.rpc as any)("guest_moderate_review", {
      p_actor: context.userId, p_review_id: data.reviewId, p_action: data.action, p_reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    const { logSecurityEvent } = await import("../security.server");
    await logSecurityEvent({ action: "guest_review_moderated", resource: `guest_review:${data.reviewId}`, actorId: context.userId, detail: data.action });
    return { status: status as string };
  });

/** Liga e desliga a nova coleta por restaurante. Padrão: desligada. */
export const listGuestReviewFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [{ data: rest }, { data: flags }] = await Promise.all([
      db.from("restaurants").select("id, name").order("name"),
      (db.from("guest_feature_flags" as never) as any).select("restaurant_id, enabled").eq("flag_key", GUEST_REVIEWS_FLAG),
    ]);
    const rows = (flags ?? []) as { restaurant_id: string | null; enabled: boolean }[];
    const global = rows.find((f) => f.restaurant_id === null)?.enabled ?? false;
    return {
      global,
      restaurants: (rest ?? []).map((r) => {
        const own = rows.find((f) => f.restaurant_id === r.id);
        return { id: r.id, name: r.name, enabled: own ? own.enabled : global, explicit: Boolean(own) };
      }),
    };
  });

export const setGuestReviewFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restaurantId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const table = db.from("guest_feature_flags" as never) as any;
    const { data: existing } = await table.select("id").eq("restaurant_id", data.restaurantId).eq("flag_key", GUEST_REVIEWS_FLAG).maybeSingle();
    const payload = { enabled: data.enabled, updated_by: context.userId, updated_at: new Date().toISOString() };
    const { error } = existing
      ? await (db.from("guest_feature_flags" as never) as any).update(payload).eq("id", existing.id)
      : await (db.from("guest_feature_flags" as never) as any).insert({ ...payload, restaurant_id: data.restaurantId, flag_key: GUEST_REVIEWS_FLAG });
    if (error) throw new Error("Não foi possível salvar");
    const { logSecurityEvent } = await import("../security.server");
    await logSecurityEvent({ action: "guest_flag_changed", resource: GUEST_REVIEWS_FLAG, restaurantId: data.restaurantId, actorId: context.userId, detail: String(data.enabled) });
    return { ok: true };
  });

// ------------------------------------------------------------- dono do restaurante

export type OwnGuestReview = {
  id: string; stars: number; comment: string | null; verified: boolean; consent: boolean;
  status: string; createdAt: string; contested: boolean;
};

/** Avaliações novas do próprio restaurante (RLS: dono e caixa), com o estado de publicação. */
export const listOwnGuestReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: r } = await sb.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado ou sem acesso");
    const [{ data: rows, error }, { data: reps }] = await Promise.all([
      sb.from("guest_reviews").select("id, service_stars, comment, verification, publish_consent, moderation_status, created_at")
        .eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(50),
      sb.from("guest_review_reports").select("review_id").eq("restaurant_id", r.id).eq("status", "aberta"),
    ]);
    // Banco sem a migração 0040: módulo simplesmente não aparece.
    if (error) return { available: false as const, reviews: [] as OwnGuestReview[] };
    const contested = new Set(((reps ?? []) as { review_id: string }[]).map((x) => x.review_id));
    return {
      available: true as const,
      reviews: ((rows ?? []) as Array<{ id: string; service_stars: number; comment: string | null; verification: string; publish_consent: boolean; moderation_status: string; created_at: string }>).map<OwnGuestReview>((x) => ({
        id: x.id, stars: x.service_stars, comment: x.comment, verified: x.verification === "visita_paga_verificada",
        consent: x.publish_consent, status: x.moderation_status, createdAt: x.created_at, contested: contested.has(x.id),
      })),
    };
  });

export const contestGuestReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reviewId: z.string().uuid(), reason: z.string().trim().min(5).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    // Pelo cliente do próprio usuário: a função confere o papel de dono com auth.uid().
    const { error } = await (context.supabase as any).rpc("guest_contest_review", { p_review_id: data.reviewId, p_reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
