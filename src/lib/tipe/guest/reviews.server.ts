// Tipe Guest · Fase 2: segunda escrita da avaliação, atrás da flag guest.reviews_v2.
// Nunca derruba a avaliação atual: se a coleta nova falhar, a interna já foi gravada.
import { logSecurityEvent } from "../security.server";
import { GUEST_REVIEWS_FLAG, normalizeReviewConsent, type PublicIdentity } from "./review-consent";

type Db = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

export async function guestReviewsEnabled(db: Db, restaurantId: string) {
  const { data, error } = await db.rpc("guest_flag_enabled", { p_restaurant_id: restaurantId, p_key: GUEST_REVIEWS_FLAG });
  // Banco sem a migração 0040 (ou erro): trata como desligado.
  return !error && data === true;
}

export async function recordGuestReview(
  db: Db,
  r: {
    restaurantId: string; restaurantSlug: string; tableNumber: string; waiterRatingId: string;
    paymentId?: string | undefined; stars: number; comment?: string | undefined;
    publishConsent?: boolean | undefined; publicIdentity?: PublicIdentity | undefined;
  },
) {
  if (!(await guestReviewsEnabled(db, r.restaurantId))) return null;
  const consent = normalizeReviewConsent({ publishConsent: r.publishConsent, publicIdentity: r.publicIdentity });
  const { data, error } = await db.rpc("guest_record_review", {
    p_restaurant_id: r.restaurantId, p_table_number: r.tableNumber, p_waiter_rating_id: r.waiterRatingId,
    p_payment_request_id: r.paymentId ?? null, p_service_stars: r.stars, p_comment: r.comment ?? null,
    p_publish_consent: consent.publishConsent, p_public_identity: consent.publicIdentity, p_consent_version: consent.consentVersion,
  });
  if (error) {
    await logSecurityEvent({ action: "guest_review_failed", resource: "guest_reviews", result: "error", restaurantSlug: r.restaurantSlug, restaurantId: r.restaurantId, detail: error.message });
    return null;
  }
  return data as string;
}
