import { z } from "zod";
import { CnpjFiscal } from "./schemas";
import { pagamentosAprovadosDaVenda, type PagamentoFiscalValidado, type VendaFiscal } from "./sale";

export const BANDEIRAS_FISCAIS = {
  "01": "Visa",
  "02": "Mastercard",
  "03": "American Express",
  "04": "Sorocred",
  "05": "Diners Club",
  "06": "Elo",
  "07": "Hipercard",
  "08": "Aura",
  "09": "Cabal",
  "10": "Alelo",
  "11": "Banes Card",
  "12": "CalCard",
  "13": "Credz",
  "14": "Discover",
  "15": "GoodCard",
  "16": "GreenCard",
  "17": "Hiper",
  "18": "JCB",
  "19": "Mais",
  "20": "MaxVan",
  "21": "Policard",
  "22": "RedeCompras",
  "23": "Sodexo",
  "24": "ValeCard",
  "25": "Verocheque",
  "26": "VR",
  "27": "Ticket",
  "99": "Outros",
} as const;
export const ManualPagamentoFiscal = z
  .object({
    paymentId: z.string().uuid(),
    cardType: z.enum(["credit", "debit"]),
    brand: z
      .string()
      .refine((v) => Object.hasOwn(BANDEIRAS_FISCAIS, v), "Bandeira fiscal inválida"),
    acquirerCnpj: CnpjFiscal.optional(),
    authorization: z.string().trim().min(1).max(128).optional(),
  })
  .strict();
export type ManualPagamentoFiscal = z.infer<typeof ManualPagamentoFiscal>;

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
  manual: ManualPagamentoFiscal[] = [],
): PagamentoFiscalValidado[] {
  if (new Set(proofs.map((p) => p.paymentId)).size !== proofs.length)
    throw new Error("Prova de pagamento duplicada");
  const manualEntries = z.array(ManualPagamentoFiscal).max(1000).parse(manual);
  const approved = pagamentosAprovadosDaVenda(sale);
  if (
    new Set(manualEntries.map((entry) => entry.paymentId)).size !== manualEntries.length ||
    manualEntries.some(
      (entry) =>
        !approved.some(
          (p) =>
            p.id === entry.paymentId &&
            p.method === "at_establishment" &&
            p.establishment_method === "card_terminal",
        ),
    )
  )
    throw new Error("Os dados da maquininha não correspondem aos pagamentos aprovados desta venda");
  return approved.map((p) => {
    const amountCents = Math.round(p.amount * 100);
    if (p.status !== "approved" || !Number.isSafeInteger(amountCents) || amountCents <= 0)
      throw new Error("Pagamento não aprovado ou valor inválido");
    if (p.method === "at_establishment" && p.establishment_method === "cash")
      return { paymentId: p.id, amountCents, fields: { forma_pagamento: "01" } };
    if (p.method === "at_establishment" && p.establishment_method === "card_terminal") {
      const entry = manualEntries.find((value) => value.paymentId === p.id);
      if (!entry)
        throw new Error("Informe crédito ou débito e a bandeira do comprovante da maquininha");
      return {
        paymentId: p.id,
        amountCents,
        fields: {
          forma_pagamento: entry.cardType === "credit" ? "03" : "04",
          tipo_integracao: "2",
          bandeira_operadora: entry.brand,
          ...(entry.acquirerCnpj ? { cnpj_credenciadora: entry.acquirerCnpj } : {}),
          ...(entry.authorization ? { numero_autorizacao: entry.authorization } : {}),
        },
      };
    }
    if (
      !["apple_pay", "google_pay", "pix", "card"].includes(p.method) ||
      p.provider !== "pagarme" ||
      !p.provider_order_id
    )
      throw new Error("Complete a conciliação fiscal do meio de pagamento");
    const proof = ProvaPagamentoFiscal.parse(proofs.find((v) => v.paymentId === p.id));
    if (
      proof.orderId !== p.provider_order_id ||
      proof.amountCents !== amountCents ||
      (p.method === "pix"
        ? proof.type !== "pix"
        : p.method === "card"
          ? proof.type === "pix"
          : proof.type !== "credit")
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
