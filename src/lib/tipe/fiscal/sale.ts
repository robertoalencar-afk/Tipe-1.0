import { z } from "zod";
import { CampoMonetarioFiscal, calcularTributos } from "./calculation";
import { PerfilProdutoFiscal, type DadosPerfilProdutoFiscal } from "./schemas";
import type { JsonFiscal } from "./contract";

const Item = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  price: z.number().finite().nonnegative(),
  quantity: z.number().finite().positive(),
  paid: z.number().finite().nonnegative(),
  reserved: z.number().finite().nonnegative(),
});
const Payment = z.object({
  id: z.string().uuid(),
  method: z.string(),
  status: z.string(),
  amount: z.number().finite().nonnegative(),
  service_fee: z.number().finite().nonnegative(),
  establishment_method: z.string().nullable(),
  provider: z.string().nullable(),
  provider_order_id: z.string().nullable(),
});
export const VendaFiscal = z.object({
  items: z.array(Item).min(1).max(990),
  payments: z.array(Payment).min(1).max(1000),
});
export type VendaFiscal = z.infer<typeof VendaFiscal>;
export type ProdutoFiscalDaVenda = {
  code: string;
  profile: DadosPerfilProdutoFiscal;
};
export type PagamentoFiscalValidado = {
  paymentId: string;
  amountCents: number;
  fields: Record<string, JsonFiscal>;
};

export function pagamentosAprovadosDaVenda(sale: VendaFiscal) {
  if (sale.payments.some((p) => !["approved", "failed", "cancelled"].includes(p.status)))
    throw new Error("Há pagamentos que exigem conciliação antes da emissão");
  return sale.payments.filter((p) => p.status === "approved");
}

function cents(value: number) {
  const result = Math.round(value * 100);
  if (!Number.isSafeInteger(result) || Math.abs(result / 100 - value) > 0.000001)
    throw new Error("Valor da venda não está em centavos");
  return result;
}
function lineCents(price: number, quantity: number) {
  const units = String(quantity);
  if (!/^\d{1,8}(?:\.\d{1,4})?$/.test(units)) throw new Error("Quantidade fiscal inválida");
  const [whole, fraction = ""] = units.split(".");
  const q = BigInt(whole!) * 10000n + BigInt(fraction.padEnd(4, "0"));
  const value = Number((BigInt(cents(price)) * q + 5000n) / 10000n);
  if (!Number.isSafeInteger(value)) throw new Error("Total fiscal excede limite");
  return value;
}

/** Rateio proporcional em centavos com desempate estável; a soma nunca muda. */
export function ratearDespesasFiscais(gross: number[], expenses: number) {
  if (
    !Number.isSafeInteger(expenses) ||
    expenses < 0 ||
    gross.some((v) => !Number.isSafeInteger(v) || v < 0)
  )
    throw new Error("Rateio fiscal inválido");
  const total = gross.reduce((sum, v) => sum + BigInt(v), 0n);
  if (total === 0n) {
    if (expenses) throw new Error("Não é possível ratear em produtos sem valor");
    return gross.map(() => 0);
  }
  const fractions = gross.map((v, index) => ({
    index,
    quotient: (BigInt(v) * BigInt(expenses)) / total,
    remainder: (BigInt(v) * BigInt(expenses)) % total,
  }));
  let remaining = BigInt(expenses) - fractions.reduce((sum, f) => sum + f.quotient, 0n);
  const sorted = [...fractions].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const f of sorted) {
    if (remaining <= 0n) break;
    f.quotient++;
    remaining--;
  }
  return fractions.map((f) => Number(f.quotient));
}

/** Constrói somente a venda presencial interna de produtos, a partir de fatos do servidor.
 * Frete, serviço, desconto e operação interestadual exigem tratamento fiscal próprio.
 */
export function prepararNfcePresencial(input: {
  cnpj: string;
  taxDate: string;
  sale: VendaFiscal;
  products: ProdutoFiscalDaVenda[];
  payments: PagamentoFiscalValidado[];
  serviceFee?: { policy: "blocked" | "allocate_expenses"; review: string | null };
}) {
  const sale = VendaFiscal.parse(input.sale);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(input.cnpj)) throw new Error("Emitente inválido");
  if (new Set(sale.items.map((i) => i.code)).size !== sale.items.length)
    throw new Error("Produto duplicado no snapshot");
  if (sale.items.some((i) => Math.abs(i.quantity - i.paid) > 0.0001 || i.reserved > 0.0001))
    throw new Error("A conta precisa estar integralmente paga");
  const approved = pagamentosAprovadosDaVenda(sale);
  const serviceFeeCents = approved.reduce((sum, p) => sum + cents(p.service_fee), 0);
  if (
    serviceFeeCents > 0 &&
    (input.serviceFee?.policy !== "allocate_expenses" || !input.serviceFee.review?.trim())
  )
    throw new Error("Defina com a contabilidade o tratamento fiscal da taxa de serviço");
  const grossCents = sale.items.map((item) => lineCents(item.price, item.quantity));
  const expenses = ratearDespesasFiscais(grossCents, serviceFeeCents);
  const items = sale.items.map((item, index) => {
    const candidates = input.products.filter(
      (p) =>
        p.code === item.code &&
        p.profile.validFrom <= input.taxDate &&
        (!p.profile.validUntil || p.profile.validUntil >= input.taxDate),
    );
    if (candidates.length !== 1)
      throw new Error(`Revise a vigência fiscal do produto ${item.code}`);
    const profile = PerfilProdutoFiscal.parse(candidates[0]!.profile);
    if (!profile.cfop.startsWith("5"))
      throw new Error("CFOP incompatível com venda interna presencial");
    for (const [field, value] of Object.entries(profile.attributes)) {
      if (
        CampoMonetarioFiscal.safeParse(field).success &&
        Number(value) !== 0 &&
        !profile.calculationRules.some((rule) => rule.target === field)
      )
        throw new Error(`Valor tributário fixo exige regra de cálculo no produto ${item.code}`);
    }
    const gross = grossCents[index]!;
    const tax = calcularTributos(profile.attributes, profile.calculationRules, {
      grossCents: gross,
      expensesCents: expenses[index]!,
      quantity: item.quantity,
    });
    for (const required of [
      "icms_origem",
      "icms_situacao_tributaria",
      "pis_situacao_tributaria",
      "cofins_situacao_tributaria",
    ])
      if (tax[required] === undefined || tax[required] === "")
        throw new Error(`Tributo obrigatório ausente no produto ${item.code}`);
    return {
      ...tax,
      numero_item: index + 1,
      codigo_produto: item.code,
      descricao: item.name,
      codigo_ncm: profile.ncm,
      cfop: profile.cfop,
      unidade_comercial: profile.unit,
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.price,
      valor_bruto: gross / 100,
      valor_outras_despesas: expenses[index]! / 100,
      unidade_tributavel: profile.unit,
      quantidade_tributavel: item.quantity,
      valor_unitario_tributavel: item.price,
    };
  });
  const totalCents =
    items.reduce((sum, item) => sum + cents(item.valor_bruto), 0) + serviceFeeCents;
  const paymentIds = new Set<string>();
  for (const p of input.payments) {
    const original = approved.find((s) => s.id === p.paymentId);
    if (!original || paymentIds.has(p.paymentId) || cents(original.amount) !== p.amountCents)
      throw new Error("Pagamento fiscal não corresponde ao pagamento aprovado");
    paymentIds.add(p.paymentId);
  }
  if (
    paymentIds.size !== approved.length ||
    input.payments.reduce((sum, p) => sum + p.amountCents, 0) !== totalCents
  )
    throw new Error("O total dos pagamentos difere do total dos produtos");
  return {
    amountCents: totalCents,
    payload: {
      cnpj_emitente: input.cnpj,
      valor_outras_despesas: serviceFeeCents / 100,
      natureza_operacao: "VENDA AO CONSUMIDOR",
      modalidade_frete: "9",
      local_destino: "1",
      presenca_comprador: "1",
      consumidor_final: "1",
      items,
      formas_pagamento: input.payments.map((p) => ({
        ...p.fields,
        valor_pagamento: p.amountCents / 100,
      })),
    } as Record<string, JsonFiscal>,
    profileSnapshots: input.products.filter((p) => sale.items.some((i) => i.code === p.code)),
  };
}
