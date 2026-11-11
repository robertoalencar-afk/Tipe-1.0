import { z } from "zod";
import { RegrasCalculoFiscal } from "./calculation";
import { FUSOS_FISCAIS_BR, UFS_FISCAIS } from "./contract";

/** Receita Federal: ASCII - 48 e módulo 11; mantém CNPJs numéricos e alfanuméricos. */
export function normalizarCnpjFiscal(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[.\s/-]/g, "");
}
export function cnpjFiscalValido(value: string) {
  const cnpj = normalizarCnpjFiscal(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    let peso = 2;
    let soma = 0;
    for (let i = base.length - 1; i >= 0; i--) {
      soma += (base.charCodeAt(i) - 48) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? "0" : String(11 - resto);
  };
  const primeiro = digito(cnpj.slice(0, 12));
  return cnpj.slice(12) === primeiro + digito(cnpj.slice(0, 12) + primeiro);
}

export const CnpjFiscal = z
  .string()
  .max(24)
  .transform(normalizarCnpjFiscal)
  .refine(cnpjFiscalValido, "CNPJ inválido");
const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const Dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(Date.parse(`${v}T00:00:00Z`)) &&
      new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
export const SlugFiscal = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const ConfiguracaoFiscal = z
  .object({
    provider: z.literal("focus"),
    environment: z.enum(["homologacao", "producao"]),
    cnpj: CnpjFiscal,
    legalName: texto(2, 160),
    stateRegistration: texto(1, 24),
    uf: z.enum(UFS_FISCAIS),
    timeZone: z.enum(FUSOS_FISCAIS_BR),
    acquirerCnpj: CnpjFiscal.nullable().default(null),
    serviceFeePolicy: z.enum(["blocked", "allocate_expenses"]).default("blocked"),
    serviceFeeReview: texto(3, 200).nullable().default(null),
    municipalityCode: z.string().regex(/^\d{7}$/),
    taxRegime: z.enum(["1", "2", "3", "4"]),
    address: z
      .object({
        street: texto(2, 120),
        number: texto(1, 20),
        district: texto(2, 80),
        city: texto(2, 80),
        postalCode: z.string().regex(/^\d{8}$/),
        complement: texto(0, 80).optional(),
      })
      .strict(),
    // Token pertence somente ao ambiente escolhido; nunca volta nas respostas.
    token: z
      .string()
      .min(8)
      .max(1000)
      .regex(/^[\x21-\x7E]+$/)
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.serviceFeePolicy === "blocked" || Boolean(v.serviceFeeReview),
    "Registre a revisão contábil da taxa de serviço",
  );

// Metadados fiscais permitem evoluir layout, mas não sobrescrever produto, quantidade ou preço.
const CampoTributario = z
  .string()
  .regex(/^(icms_|pis_|cofins_|ibs_|cbs_|fcp_|ipi_|is_|imposto_)[a-z0-9_]+$/)
  .max(100);
const ValorTributario = z.union([
  z.string().max(200),
  z.number().finite().nonnegative(),
  z.boolean(),
]);
export const PerfilProdutoFiscal = z
  .object({
    itemId: z.string().uuid(),
    validFrom: Dia,
    validUntil: Dia.nullable(),
    ncm: z.string().regex(/^\d{8}$/),
    cfop: z.string().regex(/^[123567]\d{3}$/),
    unit: texto(1, 6),
    layoutVersion: texto(1, 40),
    tablesVersion: texto(1, 80),
    reviewReference: texto(3, 200),
    calculationRules: RegrasCalculoFiscal.default([]),
    attributes: z
      .record(CampoTributario, ValorTributario)
      .refine(
        (v) => Object.keys(v).length > 0 && Object.keys(v).length <= 100,
        "Informe os tributos revisados do produto",
      ),
  })
  .strict()
  .refine(
    (v) => !v.validUntil || v.validUntil >= v.validFrom,
    "Fim de vigência anterior ao início",
  );

export type DadosConfiguracaoFiscal = z.infer<typeof ConfiguracaoFiscal>;
export type DadosPerfilProdutoFiscal = z.infer<typeof PerfilProdutoFiscal>;
