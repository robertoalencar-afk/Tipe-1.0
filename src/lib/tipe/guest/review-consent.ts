// Tipe Guest · Fase 2: consentimento para exibir a avaliação no futuro app.
// Texto versionado: quem aceita, aceita esta versão. Mudou o texto, muda a versão.
// Rascunho para revisão jurídica (docs/tipe-guest/AVALIACOES-LGPD.md).

export const REVIEW_CONSENT_VERSION = "guest-avaliacao-v1";

export const REVIEW_CONSENT_TEXT = {
  question: "Posso exibir esta avaliação no futuro app da Tipe para outras pessoas?",
  detail:
    "Opcional. Só aparece depois de revisada pela equipe da Tipe e se o pagamento desta conta for confirmado. Sem marcar, ela fica só com o restaurante.",
  identityLabel: "Como você quer aparecer",
  identityAnonymous: "Sem nome (\"Cliente verificado\")",
  identityFirstName: "Só o primeiro nome",
} as const;

export type PublicIdentity = "anonimo" | "primeiro_nome";

export type ReviewConsentInput = {
  publishConsent?: boolean | undefined;
  publicIdentity?: PublicIdentity | undefined;
};

export type ReviewConsent = {
  publishConsent: boolean;
  publicIdentity: PublicIdentity;
  consentVersion: string | null;
};

/** Sem consentimento explícito não há versão aceita nem nome: a avaliação fica interna. */
export function normalizeReviewConsent(input: ReviewConsentInput): ReviewConsent {
  if (input.publishConsent !== true) {
    return { publishConsent: false, publicIdentity: "anonimo", consentVersion: null };
  }
  return {
    publishConsent: true,
    publicIdentity: input.publicIdentity === "primeiro_nome" ? "primeiro_nome" : "anonimo",
    consentVersion: REVIEW_CONSENT_VERSION,
  };
}

export const GUEST_REVIEWS_FLAG = "guest.reviews_v2";

export const isPaymentUuid = (v: string | null | undefined): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
