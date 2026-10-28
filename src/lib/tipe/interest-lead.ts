/**
 * Leads de interesse que NÃO são o cadastro completo de restaurante do /teste-gratis:
 *  - "tipe-guest": pessoa que quer ser avisada quando o Tipe Guest chegar (cliente final);
 *  - "restaurante-fundador": restaurante interessado no programa Restaurante Fundador.
 *
 * Os dois gravam em `restaurant_leads` (a tabela que /admin/leads já lista), com a origem em
 * `origin_page` e a finalidade do consentimento em `notes`. Sem migração: `restaurant_name`
 * é obrigatório na tabela, então o aviso do Guest grava um rótulo fixo no lugar (pendência
 * documentada em docs/tipe-guest/LANDING.md: coluna própria de tipo de lead).
 *
 * Módulo puro (sem servidor), para o schema e a linha gravada serem testáveis no vitest.
 */
import { z } from "zod";

export const ORIGENS_INTERESSE = ["tipe-guest", "restaurante-fundador"] as const;
export type OrigemInteresse = (typeof ORIGENS_INTERESSE)[number];

/** Rótulo gravado em restaurant_name quando quem se cadastra é cliente final (aviso do Guest). */
export const ROTULO_AVISO_GUEST = "Aviso Tipe Guest (cliente final)";

/** Finalidades mostradas no formulário e gravadas junto do lead (prova do que foi aceito). */
export const FINALIDADE: Record<OrigemInteresse, string> = {
  "tipe-guest":
    "Receber um e-mail da Tipe avisando quando o Tipe Guest estiver disponível. Só para isso.",
  "restaurante-fundador":
    "Ser contatado pela equipe da Tipe sobre o programa Restaurante Fundador e a adoção da Tipe no restaurante.",
};

/** Versão do texto de consentimento exibido (sobe quando o texto mudar). */
export const VERSAO_CONSENTIMENTO = "2026-10-28";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const interestSchema = z
  .object({
    origem: z.enum(ORIGENS_INTERESSE),
    contactName: z.string().trim().min(2, "Informe seu nome").max(120),
    email: z.string().trim().email("E-mail inválido").max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\(\d{2}\) 9\d{4}-\d{4}$/, "WhatsApp inválido")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    restaurantName: opt(120),
    city: opt(80),
    privacyAccepted: z.literal(true),
    marketingOptIn: z.boolean().default(false),
    utm_source: opt(120),
    utm_medium: opt(120),
    utm_campaign: opt(120),
    utm_content: opt(120),
    utm_term: opt(120),
    /** Campo-isca invisível: gente não preenche; robô costuma preencher. */
    site: z.string().max(0).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.origem === "restaurante-fundador") {
      if (!d.restaurantName || d.restaurantName.length < 2)
        ctx.addIssue({
          code: "custom",
          path: ["restaurantName"],
          message: "Informe o restaurante",
        });
      if (!d.phone)
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Informe o WhatsApp" });
    }
  });

export type InteresseEntrada = z.input<typeof interestSchema>;
export type Interesse = z.output<typeof interestSchema>;

/** Linha gravada em restaurant_leads (sem colunas novas). */
export function linhaInteresse(d: Interesse, agora = new Date()) {
  const guest = d.origem === "tipe-guest";
  return {
    restaurant_name: guest ? ROTULO_AVISO_GUEST : (d.restaurantName ?? ""),
    contact_name: d.contactName,
    email: d.email,
    phone: d.phone ?? null,
    city: d.city,
    privacy_accepted_at: agora.toISOString(),
    marketing_opt_in: d.marketingOptIn,
    utm_source: d.utm_source,
    utm_medium: d.utm_medium,
    utm_campaign: d.utm_campaign,
    utm_content: d.utm_content,
    utm_term: d.utm_term,
    origin_page: d.origem,
    used_simulator: false,
    notes: [
      guest ? "Interesse: Tipe Guest (quer ser avisado)." : "Interesse: Restaurante Fundador.",
      `Finalidade aceita (v${VERSAO_CONSENTIMENTO}): ${FINALIDADE[d.origem]}`,
      d.marketingOptIn
        ? "Aceitou também receber novidades da Tipe."
        : "Não aceitou novidades gerais.",
    ].join("\n"),
  };
}
