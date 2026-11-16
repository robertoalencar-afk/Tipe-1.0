import { z } from "zod";

/** Regras declarativas revisadas pela contabilidade. Nenhuma alíquota é presumida. */
export const CampoMonetarioFiscal = z
  .string()
  .regex(
    /^(?:icms_base_calculo(?:_st)?|icms_valor(?:_[a-z_]+)?|pis_base_calculo|pis_valor|cofins_base_calculo|cofins_valor|ibs_cbs_base_calculo|ibs_uf_valor|ibs_mun_valor|ibs_valor_total|cbs_valor|fcp_base_calculo|fcp_valor|ipi_base_calculo|ipi_valor|is_base_calculo|is_valor|imposto_importacao_base_calculo|imposto_importacao_valor)$/,
  );
const RateField = z
  .string()
  .regex(/^(?:icms_|pis_|cofins_|ibs_|cbs_|fcp_|ipi_|is_|imposto_)[a-z_]+$/);
export const RegraCalculoFiscal = z
  .object({
    target: CampoMonetarioFiscal,
    basis: z.enum(["item_gross", "item_with_expenses", "quantity", "field"]),
    basisField: CampoMonetarioFiscal.optional(),
    operation: z.enum(["base", "percent", "multiply"]),
    rateField: RateField.optional(),
    reductionField: RateField.optional(),
    subtractFields: z.array(CampoMonetarioFiscal).max(10).optional(),
    addFields: z.array(CampoMonetarioFiscal).max(10).optional(),
  })
  .strict()
  .superRefine((r, c) => {
    if (r.basis === "field" && !r.basisField)
      c.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o campo de base" });
    if (r.operation !== "base" && !r.rateField)
      c.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a alíquota ou fator" });
    if (r.basis === "quantity" && r.operation !== "multiply")
      c.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantidade exige multiplicação por fator revisado",
      });
  });
export const RegrasCalculoFiscal = z
  .array(RegraCalculoFiscal)
  .max(30)
  .refine(
    (r) => new Set(r.map((x) => x.target)).size === r.length,
    "Cada campo monetário deve ter uma única regra",
  );
export type RegraCalculoFiscal = z.infer<typeof RegraCalculoFiscal>;
const SCALE = 1_000_000n;
function scaled(value: unknown): bigint {
  if (typeof value !== "number" && typeof value !== "string")
    throw new Error("Valor tributário numérico não informado");
  const str = String(value);
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(str)) throw new Error("Valor tributário inválido");
  const [whole, frac = ""] = str.split(".");
  return BigInt(whole!) * SCALE + BigInt(frac.padEnd(6, "0"));
}
function round(value: bigint, divisor: bigint) {
  return (value + divisor / 2n) / divisor;
}
function integer(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Valor monetário inválido");
  return BigInt(value);
}
function numeric(value: bigint) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error("Valor monetário excede limite");
  return n;
}

/** Valores monetários em centavos; percentuais/fatores têm até seis casas. */
export function calcularTributos(
  attributes: Record<string, string | number | boolean>,
  rules: RegraCalculoFiscal[],
  source: { grossCents: number; expensesCents: number; quantity: number },
) {
  const parsed = RegrasCalculoFiscal.parse(rules);
  const result = { ...attributes };
  const targets = new Set(parsed.map((r) => r.target));
  const calculated = new Set<string>();
  const gross = integer(source.grossCents);
  const expenses = integer(source.expensesCents);
  for (const r of parsed) {
    for (const field of [r.basisField, ...(r.subtractFields ?? []), ...(r.addFields ?? [])]) {
      if (field && targets.has(field) && !calculated.has(field))
        throw new Error("As regras tributárias têm dependência fora de ordem ou circular");
    }
    let basis =
      r.basis === "item_gross"
        ? gross
        : r.basis === "item_with_expenses"
          ? gross + expenses
          : r.basis === "quantity"
            ? scaled(source.quantity)
            : round(scaled(result[r.basisField!]) * 100n, SCALE);
    if (r.basis !== "quantity") {
      for (const field of r.subtractFields ?? [])
        basis -= round(scaled(result[field]) * 100n, SCALE);
      for (const field of r.addFields ?? []) basis += round(scaled(result[field]) * 100n, SCALE);
      if (basis < 0n) throw new Error("Base tributária negativa; revise o perfil");
      if (r.reductionField) {
        const reduction = scaled(result[r.reductionField]);
        if (reduction > 100n * SCALE) throw new Error("Redução superior a cem por cento");
        basis = round(basis * (100n * SCALE - reduction), 100n * SCALE);
      }
    } else if (r.subtractFields?.length || r.addFields?.length || r.reductionField)
      throw new Error("Regra por quantidade incompatível com reduções monetárias");
    let cents = basis;
    if (r.operation !== "base") {
      const rate = scaled(result[r.rateField!]);
      if (r.operation === "percent" && rate > 100n * SCALE)
        throw new Error("Alíquota superior a cem por cento");
      cents =
        r.basis === "quantity"
          ? round(basis * rate * 100n, SCALE * SCALE)
          : round(basis * rate, (r.operation === "percent" ? 100n : 1n) * SCALE);
    }
    result[r.target] = numeric(cents) / 100;
    calculated.add(r.target);
  }
  return result;
}
