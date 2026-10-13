// Comprovante de pagamento enviado por e-mail ao cliente (não é documento fiscal).

export type ReceiptData = {
  restaurant: string;
  table: string;
  customer: string;
  paidAt: string;
  method: string;
  lines: { name: string; portion: string; amount: number | null }[];
  serviceFee: number;
  total: number;
  reference: string;
};

const METODO: Record<string, string> = { pix: "Pix", card: "Cartão", apple_pay: "Apple Pay", google_pay: "Google Pay", at_establishment: "No estabelecimento" };

/** Fração legível: 1, 2, ½, ⅓, ¼ ou percentual. */
export function portionLabel(q: number) {
  const r = Math.round(q * 10000) / 10000;
  const whole = Math.floor(r + 1e-4);
  const frac = r - whole;
  const near = (x: number) => Math.abs(frac - x) < 1e-4;
  const f = near(0) ? "" : near(0.5) ? "½" : near(1 / 3) ? "⅓" : near(0.25) ? "¼" : near(2 / 3) ? "⅔" : near(0.75) ? "¾" : `${Math.round(frac * 100)}%`;
  if (!whole) return f || "0";
  return f ? `${whole} + ${f}` : String(whole);
}

/** Máscara simples para exibir onde o comprovante foi enviado. */
export function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return "";
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export function buildReceipt(input: {
  restaurant: string;
  table: string;
  customer: string;
  createdAt: string;
  paymentMethod: string;
  itemQuantities: Record<string, number>;
  itemNames: Record<string, string>;
  amount: number;
  serviceFee: number | null;
  paymentId: string;
}): ReceiptData {
  const lines = Object.entries(input.itemQuantities)
    .filter(([, q]) => Number(q) > 0)
    .map(([code, q]) => ({ name: input.itemNames[code] ?? "Item da conta", portion: portionLabel(Number(q)), amount: null }));
  return {
    restaurant: input.restaurant,
    table: input.table,
    customer: input.customer,
    paidAt: new Date(input.createdAt).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    method: METODO[input.paymentMethod] ?? input.paymentMethod,
    lines,
    serviceFee: Math.round((input.serviceFee ?? 0) * 100) / 100,
    total: Math.round(input.amount * 100) / 100,
    reference: input.paymentId.slice(0, 8).toUpperCase(),
  };
}
