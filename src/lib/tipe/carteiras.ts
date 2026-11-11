// Apple Pay e Google Pay na conta da mesa, cobrados pelo Pagar.me (API v5).
// O navegador só entrega o token criptografado da carteira; quem monta a cobrança
// e define o valor é o servidor. Nenhum dado de cartão passa pela TIPE.
import { z } from "zod";

export type Carteira = "apple_pay" | "google_pay";

export const isCarteira = (m: string): m is Carteira => m === "apple_pay" || m === "google_pay";

/** ID da conta Pagar.me do restaurante (gatewayMerchantId do Google Pay). */
export const PAGARME_ACCOUNT_ID = /^acc_[A-Za-z0-9]{8,40}$/;

// Token do Google Pay (paymentMethodData.tokenizationData.token), protocolo ECv2.
const GoogleToken = z.object({
  signature: z.string().min(16).max(2000),
  intermediateSigningKey: z.object({
    signedKey: z.string().min(16).max(4000),
    signatures: z.array(z.string().min(16).max(2000)).min(1).max(5),
  }),
  protocolVersion: z.literal("ECv2"),
  signedMessage: z.string().min(16).max(8000),
});

// Token do Apple Pay (ApplePayPayment.token.paymentData).
const AppleToken = z.object({
  version: z.string().min(4).max(16),
  data: z.string().min(16).max(8000),
  signature: z.string().min(16).max(8000),
  header: z.object({
    ephemeralPublicKey: z.string().min(16).max(400),
    publicKeyHash: z.string().min(16).max(200),
    transactionId: z.string().min(8).max(200),
  }),
});

/**
 * Monta o `credit_card.payload` do pedido no Pagar.me a partir do token da carteira.
 * Google Pay segue a referência "Google Pay™" do Pagar.me (payload.type = google_pay).
 * Apple Pay usa o mesmo formato com payload.type = apple_pay; conferir com o Pagar.me
 * ao habilitar Apple Pay na conta, porque a referência pública não traz o exemplo.
 */
export function payloadCarteira(metodo: Carteira, tokenJson: string, merchantIdentifier: string) {
  let bruto: unknown;
  try {
    bruto = JSON.parse(tokenJson);
  } catch {
    throw new Error("A carteira não devolveu um pagamento válido. Tente de novo ou use Pix.");
  }
  if (metodo === "google_pay") {
    const t = GoogleToken.safeParse(bruto);
    if (!t.success) throw new Error("O Google Pay não devolveu um pagamento válido. Tente de novo ou use Pix.");
    return {
      type: "google_pay",
      google_pay: {
        version: t.data.protocolVersion,
        signature: t.data.signature,
        intermediate_signing_key: {
          signed_key: t.data.intermediateSigningKey.signedKey,
          signatures: t.data.intermediateSigningKey.signatures,
        },
        signed_message: t.data.signedMessage,
        merchant_identifier: merchantIdentifier,
      },
    };
  }
  const t = AppleToken.safeParse(bruto);
  if (!t.success) throw new Error("O Apple Pay não devolveu um pagamento válido. Tente de novo ou use Pix.");
  return {
    type: "apple_pay",
    apple_pay: {
      version: t.data.version,
      data: t.data.data,
      signature: t.data.signature,
      header: {
        ephemeral_public_key: t.data.header.ephemeralPublicKey,
        public_key_hash: t.data.header.publicKeyHash,
        transaction_id: t.data.header.transactionId,
      },
      merchant_identifier: merchantIdentifier,
    },
  };
}

/** Configuração pública do Google Pay para a conta desta mesa, ou null quando não está ativo. */
export type GooglePayConfig = { environment: "TEST" | "PRODUCTION"; gatewayMerchantId: string; merchantId: string | null; merchantName: string };

export function googlePayConfig(opts: { accountId: string | null | undefined; keyMode: string | null | undefined; merchantId: string | undefined; merchantName: string }): GooglePayConfig | null {
  if (!opts.accountId || !PAGARME_ACCOUNT_ID.test(opts.accountId)) return null;
  const environment = opts.keyMode === "test" ? "TEST" : "PRODUCTION";
  // Em produção o Google exige o merchantId emitido depois da aprovação da integração.
  if (environment === "PRODUCTION" && !opts.merchantId) return null;
  return { environment, gatewayMerchantId: opts.accountId, merchantId: opts.merchantId ?? null, merchantName: opts.merchantName.slice(0, 60) };
}
