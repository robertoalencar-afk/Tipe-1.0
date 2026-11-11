import { z } from "zod";
import { CnpjFiscal } from "./schemas";
import { pagamentosAprovadosDaVenda, type PagamentoFiscalValidado, type VendaFiscal } from "./sale";

/** Prova obtida pelo servidor no adquirente; nunca construída com campos do cliente. */
export const ProvaPagamentoFiscal = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().min(1),
  amountCents: z.number().int().positive().safe(),
  captured: z.literal(true),
  type: z.enum(["credit", "debit", "pix"]),
  acquirerCnpj: CnpjFiscal,
  authorization: z.string().trim().min(1).max(128),
  brand: z
    .string()
    .regex(/^\d{2}$/)
    .optional(),
});
export type ProvaPagamentoFiscal = z.infer<typeof ProvaPagamentoFiscal>;

export function prepararPagamentosFiscais(
  sale: VendaFiscal,
  proofs: ProvaPagamentoFiscal[],
): PagamentoFiscalValidado[] {
  if (new Set(proofs.map((p) => p.paymentId)).size !== proofs.length)
    throw new Error("Prova de pagamento duplicada");
  return pagamentosAprovadosDaVenda(sale).map((p) => {
    const amountCents = Math.round(p.amount * 100);
    if (p.status !== "approved" || !Number.isSafeInteger(amountCents) || amountCents <= 0)
      throw new Error("Pagamento não aprovado ou valor inválido");
    if (p.method === "at_establishment" && p.establishment_method === "cash")
      return { paymentId: p.id, amountCents, fields: { forma_pagamento: "01" } };
    if (
      !["apple_pay", "google_pay", "pix"].includes(p.method) ||
      p.provider !== "pagarme" ||
      !p.provider_order_id
    )
      throw new Error("Complete a conciliação fiscal do meio de pagamento");
    const proof = ProvaPagamentoFiscal.parse(proofs.find((v) => v.paymentId === p.id));
    if (
      proof.orderId !== p.provider_order_id ||
      proof.amountCents !== amountCents ||
      (p.method === "pix" ? proof.type !== "pix" : proof.type !== "credit")
    )
      throw new Error("Comprovação do adquirente difere do pagamento");
    if (proof.type !== "pix" && !proof.brand)
      throw new Error("Bandeira do cartão não informada pelo adquirente");
    return {
      paymentId: p.id,
      amountCents,
      fields: {
        forma_pagamento: proof.type === "pix" ? "17" : proof.type === "debit" ? "04" : "03",
        tipo_integracao: "1",
        cnpj_credenciadora: proof.acquirerCnpj,
        numero_autorizacao: proof.authorization,
        ...(proof.brand ? { bandeira_operadora: proof.brand } : {}),
      },
    };
  });
}
