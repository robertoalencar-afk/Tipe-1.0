import { describe, expect, it } from "vitest";
import { googlePayConfig, payloadCarteira } from "./carteiras";

const google = JSON.stringify({
  signature: "MEUCIQDexemploAssinaturaGoogle",
  intermediateSigningKey: { signedKey: "{\"keyValue\":\"chaveIntermediaria\"}", signatures: ["MEYCIQCassinaturaIntermediaria"] },
  protocolVersion: "ECv2",
  signedMessage: "{\"encryptedMessage\":\"abc\",\"ephemeralPublicKey\":\"def\",\"tag\":\"ghi\"}",
});
const apple = JSON.stringify({
  version: "EC_v1",
  data: "dadosCriptografadosApplePay",
  signature: "assinaturaApplePayExemplo",
  header: { ephemeralPublicKey: "chaveEfemeraApplePay", publicKeyHash: "hashDaChavePublicaApple", transactionId: "transacao123" },
});

describe("carteiras digitais no Pagar.me", () => {
  it("Google Pay vira payload google_pay com os campos que o Pagar.me pede", () => {
    const p = payloadCarteira("google_pay", google, "acc_ABCdef12345") as { type: string; google_pay: Record<string, unknown> };
    expect(p.type).toBe("google_pay");
    expect(p.google_pay).toEqual({
      version: "ECv2",
      signature: "MEUCIQDexemploAssinaturaGoogle",
      intermediate_signing_key: { signed_key: "{\"keyValue\":\"chaveIntermediaria\"}", signatures: ["MEYCIQCassinaturaIntermediaria"] },
      signed_message: "{\"encryptedMessage\":\"abc\",\"ephemeralPublicKey\":\"def\",\"tag\":\"ghi\"}",
      merchant_identifier: "acc_ABCdef12345",
    });
  });
  it("Apple Pay vira payload apple_pay com o cabeçalho em snake_case", () => {
    const p = payloadCarteira("apple_pay", apple, "acc_ABCdef12345") as { type: string; apple_pay: { header: Record<string, string> } };
    expect(p.type).toBe("apple_pay");
    expect(p.apple_pay.header).toEqual({ ephemeral_public_key: "chaveEfemeraApplePay", public_key_hash: "hashDaChavePublicaApple", transaction_id: "transacao123" });
  });
  it("token que não é JSON ou não tem o formato da carteira é recusado antes de cobrar", () => {
    expect(() => payloadCarteira("google_pay", "nao-e-json", "acc_ABCdef12345")).toThrow(/Pix/);
    expect(() => payloadCarteira("google_pay", apple, "acc_ABCdef12345")).toThrow(/Google Pay/);
    expect(() => payloadCarteira("apple_pay", google, "acc_ABCdef12345")).toThrow(/Apple Pay/);
  });
});

describe("configuração pública do Google Pay", () => {
  const base = { merchantName: "Bistrô" };
  it("sem ID da conta, o Google Pay fica desligado", () =>
    expect(googlePayConfig({ ...base, accountId: null, keyMode: "live", merchantId: "BCR2DN" })).toBeNull());
  it("ID fora do formato acc_ é ignorado", () =>
    expect(googlePayConfig({ ...base, accountId: "conta-123", keyMode: "test", merchantId: undefined })).toBeNull());
  it("chave de teste usa o ambiente TEST do Google, sem merchantId", () =>
    expect(googlePayConfig({ ...base, accountId: "acc_ABCdef12345", keyMode: "test", merchantId: undefined })).toEqual({ environment: "TEST", gatewayMerchantId: "acc_ABCdef12345", merchantId: null, merchantName: "Bistrô" }));
  it("produção exige o merchantId emitido pelo Google", () => {
    expect(googlePayConfig({ ...base, accountId: "acc_ABCdef12345", keyMode: "live", merchantId: undefined })).toBeNull();
    expect(googlePayConfig({ ...base, accountId: "acc_ABCdef12345", keyMode: "live", merchantId: "BCR2DN4T" })?.environment).toBe("PRODUCTION");
  });
});
