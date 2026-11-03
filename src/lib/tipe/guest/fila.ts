// Tipe Guest · fila de espera presencial: regras puras (mesmas da migração 0043).

/** Precisão máxima aceita da localização do aparelho, em metros. */
export const MAX_ACCURACY_M = 150;
/** Folga dada à imprecisão do GPS na conferência do raio. */
export const ACCURACY_SLACK_M = 50;

/** Distância em metros entre dois pontos (haversine), igual a guest_distance_m. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/** Mesmo critério do banco: precisão boa e dentro do raio (com folga limitada). */
export function insideRadius(a: {
  place: { lat: number; lng: number; radiusM: number };
  lat: number;
  lng: number;
  accuracyM: number;
}): { ok: true } | { ok: false; reason: "imprecisa" | "longe" } {
  if (a.accuracyM > MAX_ACCURACY_M) return { ok: false, reason: "imprecisa" };
  const d = distanceM(a.place.lat, a.place.lng, a.lat, a.lng);
  return d <= a.place.radiusM + Math.min(a.accuracyM, ACCURACY_SLACK_M)
    ? { ok: true }
    : { ok: false, reason: "longe" };
}

/** Endereço que vai no QR da porta. */
export function doorUrl(origin: string, slug: string, token: string) {
  return `${origin.replace(/\/$/, "")}/${slug}/fila?t=${encodeURIComponent(token)}`;
}

/** Texto da posição: sempre estimativa. */
export function walkinPositionLabel(position: number) {
  if (position <= 0) return "";
  return position === 1
    ? "Você é o próximo"
    : `${position - 1} ${position === 2 ? "grupo" : "grupos"} na sua frente`;
}
