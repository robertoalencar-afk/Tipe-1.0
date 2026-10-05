// Tokenização de cartão direto no Pagar.me: os dados do cartão nunca passam pelo servidor da TIPE.
export type CardInput = { number: string; holder: string; exp: string; cvv: string };

export async function tokenizeCard(publicKey: string, c: CardInput): Promise<string> {
  const [mm, yy] = c.exp.split("/").map((v) => v.trim());
  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "card", card: { number: c.number.replace(/\D/g, ""), holder_name: c.holder.trim(), exp_month: Number(mm), exp_year: Number(yy), cvv: c.cvv.replace(/\D/g, "") } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.id) throw new Error("Confira os dados do cartão.");
  return j.id as string;
}

export const cardValid = (c: CardInput) =>
  c.number.replace(/\D/g, "").length >= 13 && c.holder.trim().length >= 3 && /^\d{2}\s*\/\s*\d{2,4}$/.test(c.exp) && /^\d{3,4}$/.test(c.cvv);
