// Versões vigentes (devem bater com os metadados de src/content/legal).
// Versões dos documentos legais. Ao alterar materialmente um documento,
// crie uma nova versão (não sobrescreva) para que novo aceite possa ser exigido.
export const LEGAL = {
  consumer_terms: { version: "3.0", effective: "07/10/2026" },
  privacy_policy: { version: "2.0", effective: "07/10/2026" },
  cookie_policy: { version: "2.0", effective: "07/10/2026" },
  partner_terms: { version: "2.1", effective: "13/11/2026" },
} as const;

export type LegalDoc = keyof typeof LEGAL;

export const PENDING = "[INFORMAÇÃO PENDENTE]";
export const PRIVACY_EMAIL = "contato@tipe.digital";
export const DPO = "Roberto Augusto Freitas Alencar Filho";
export const PAYMENT_PROVIDER = "Pagar.me";

export const COMPANY = {
  legalName: "Tipe Tecnologia de Integração para Pagamento Eletrônico LTDA",
  tradeName: "TIPE",
  cnpj: "69.486.521/0001-05",
  city: "Fortaleza, CE",
  forum: "Comarca de Fortaleza, Ceará",
} as const;
