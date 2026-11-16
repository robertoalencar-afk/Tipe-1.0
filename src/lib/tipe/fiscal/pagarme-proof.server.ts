import { z } from "zod";
import { ProvaPagamentoFiscal, type ProvaPagamentoFiscal as Proof } from "./payments";
const Money = z.number().int().positive().safe();
// Apenas campos fiscais necessários; dados de cartão, pagador e antifraude são descartados.
const Transaction = z.object({
  transaction_type: z.enum(["credit_card", "debit_card", "pix"]),
  amount: Money,
  status: z.string(),
  success: z.literal(true),
  acquirer_auth_code: z.string().optional(),
  end_to_end_id: z.string().optional(),
  card: z.object({ brand: z.string() }).optional(),
  network_token: z.object({ brand: z.string() }).optional(),
});
const Order = z.object({
  id: z.string(),
  status: z.literal("paid"),
  amount: Money,
  charges: z
    .array(
      z.object({
        status: z.literal("paid"),
        amount: Money,
        paid_amount: Money,
        refunded_amount: z.number().int().nonnegative().optional(),
        last_transaction: Transaction,
      }),
    )
    .length(1),
});
const BRANDS: Record<string, string> = {
  visa: "01",
  mastercard: "02",
  amex: "03",
  americanexpress: "03",
  elo: "06",
  hipercard: "07",
  diners: "05",
  dinersclub: "05",
  sorocred: "04",
  jcb: "18",
  aura: "08",
  cabal: "09",
  discover: "14",
};
export function extrairComprovacaoPagarme(
  raw: unknown,
  expected: { paymentId: string; orderId: string; amountCents: number; acquirerCnpj: string },
): Proof {
  const parsed = Order.safeParse(raw);
  if (!parsed.success) throw new Error("O adquirente não confirmou integralmente o pagamento");
  const order = parsed.data;
  const charge = order.charges[0]!;
  const t = charge.last_transaction;
  if (
    order.id !== expected.orderId ||
    order.amount !== expected.amountCents ||
    charge.amount !== expected.amountCents ||
    charge.paid_amount !== expected.amountCents ||
    t.amount !== expected.amountCents ||
    (charge.refunded_amount ?? 0) !== 0
  )
    throw new Error("Os valores do adquirente diferem do pagamento da venda");
  const pix = t.transaction_type === "pix";
  if (pix ? t.status !== "paid" : t.status !== "captured")
    throw new Error("A transação ainda não foi efetivamente liquidada");
  const brandName = t.network_token?.brand ?? t.card?.brand;
  const brand =
    !pix && brandName ? BRANDS[brandName.toLowerCase().replace(/[\s_-]/g, "")] : undefined;
  if (!pix && !brand) throw new Error("Bandeira não reconhecida para a vinculação fiscal");
  const result = ProvaPagamentoFiscal.safeParse({
    ...expected,
    captured: true,
    type: pix ? "pix" : t.transaction_type === "debit_card" ? "debit" : "credit",
    authorization: pix ? t.end_to_end_id : t.acquirer_auth_code,
    ...(brand ? { brand } : {}),
  });
  if (!result.success)
    throw new Error("Complete os identificadores fiscais do pagamento com o adquirente");
  return result.data;
}

/** Consulta fiscal pontual: não substitui webhooks ou altera o estado financeiro. */
export async function consultarComprovacaoPagarme(
  expected: { paymentId: string; orderId: string; amountCents: number; acquirerCnpj: string },
  secretKey: string,
  request: typeof fetch = fetch,
) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(expected.orderId) || !/^[\x21-\x7E]+$/.test(secretKey))
    throw new Error("Identificador ou credencial de pagamento inválidos");
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10000);
  try {
    const response = await request(`https://api.pagar.me/core/v5/orders/${expected.orderId}`, {
      method: "GET",
      redirect: "error",
      signal: abort.signal,
      headers: { Authorization: `Basic ${btoa(`${secretKey}:`)}`, Accept: "application/json" },
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 2 * 1024 * 1024)
      throw new Error("provider_read");
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) throw new Error("provider_read");
    return extrairComprovacaoPagarme(JSON.parse(text), expected);
  } catch {
    throw new Error(
      "Não foi possível comprovar o pagamento no adquirente. A nota não foi enviada.",
    );
  } finally {
    clearTimeout(timer);
  }
}
