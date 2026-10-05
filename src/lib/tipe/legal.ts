// Versões dos documentos legais. Ao alterar materialmente um documento,
// crie uma nova versão (não sobrescreva) para que novo aceite possa ser exigido.
export const LEGAL = {
  consumer_terms: { version: "2.0", effective: "05/10/2026" },
  privacy_policy: { version: "1.0", effective: "05/10/2026" },
  cookie_policy: { version: "1.0", effective: "05/10/2026" },
  partner_terms: { version: "1.0", effective: "05/10/2026" },
} as const;

export type LegalDoc = keyof typeof LEGAL;

export const PENDING = "[INFORMAÇÃO PENDENTE]";
export const PRIVACY_EMAIL = "contato@tipe.digital";
