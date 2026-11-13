/** Aceita preço com vírgula ou ponto decimal, sem transformar 29.90 em R$ 2.990. */
export function menuPriceCents(input: string): number | null {
  const raw = input.trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= 1_000_000 ? cents : null;
}
