import { describe, expect, it } from "vitest";
import { isPaymentUuid, normalizeReviewConsent, REVIEW_CONSENT_VERSION } from "./review-consent";

describe("consentimento da avaliação para o Guest", () => {
  it("sem marcar fica interna, anônima e sem versão aceita", () => {
    expect(normalizeReviewConsent({})).toEqual({ publishConsent: false, publicIdentity: "anonimo", consentVersion: null });
    expect(normalizeReviewConsent({ publishConsent: false, publicIdentity: "primeiro_nome" })).toEqual({
      publishConsent: false,
      publicIdentity: "anonimo",
      consentVersion: null,
    });
  });
  it("com consentimento registra a versão do texto e o padrão é anônimo", () => {
    expect(normalizeReviewConsent({ publishConsent: true })).toEqual({
      publishConsent: true,
      publicIdentity: "anonimo",
      consentVersion: REVIEW_CONSENT_VERSION,
    });
    expect(normalizeReviewConsent({ publishConsent: true, publicIdentity: "primeiro_nome" }).publicIdentity).toBe("primeiro_nome");
  });
  it("só valores booleanos verdadeiros contam como consentimento", () => {
    expect(normalizeReviewConsent({ publishConsent: "true" as unknown as boolean }).publishConsent).toBe(false);
  });
  it("reconhece só id de pagamento no formato uuid", () => {
    expect(isPaymentUuid("0b9e2f8a-1c2d-4e5f-8a9b-0c1d2e3f4a5b")).toBe(true);
    expect(isPaymentUuid("pix-local-123")).toBe(false);
    expect(isPaymentUuid(null)).toBe(false);
  });
});
