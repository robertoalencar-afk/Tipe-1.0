// Google Pay no navegador: abre a folha da carteira e devolve o token criptografado,
// que o servidor repassa ao Pagar.me. Só roda no cliente; o script do Google é
// carregado na primeira vez que alguém escolhe Google Pay.
import type { GooglePayConfig } from "./carteiras";

const SCRIPT = "https://pay.google.com/gp/p/js/pay.js";

type PaymentsClient = {
  isReadyToPay(req: unknown): Promise<{ result: boolean }>;
  loadPaymentData(req: unknown): Promise<{ paymentMethodData: { tokenizationData: { token: string } } }>;
};
type GoogleGlobal = { payments: { api: { PaymentsClient: new (opts: { environment: string }) => PaymentsClient } } };

let carregando: Promise<void> | null = null;

function carregarScript() {
  if ((window as unknown as { google?: GoogleGlobal }).google?.payments) return Promise.resolve();
  carregando ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { carregando = null; reject(new Error("Não foi possível abrir o Google Pay. Confira a conexão ou use Pix.")); };
    document.head.appendChild(s);
  });
  return carregando;
}

const metodoCartao = (cfg: GooglePayConfig) => ({
  type: "CARD",
  parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["MASTERCARD", "VISA"] },
  tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: "pagarme", gatewayMerchantId: cfg.gatewayMerchantId } },
});

/** Erro de quem fechou a folha do Google Pay sem pagar: não é falha, só volta à tela. */
export class GooglePayCancelado extends Error {}

/** Abre o Google Pay para o valor da conta e devolve o token (JSON) para o servidor. */
export async function pedirTokenGooglePay(cfg: GooglePayConfig, valor: number): Promise<string> {
  await carregarScript();
  const google = (window as unknown as { google: GoogleGlobal }).google;
  const client = new google.payments.api.PaymentsClient({ environment: cfg.environment });
  const base = { apiVersion: 2, apiVersionMinor: 0 };
  const pronto = await client.isReadyToPay({ ...base, allowedPaymentMethods: [metodoCartao(cfg)] }).catch(() => ({ result: false }));
  if (!pronto.result) throw new Error("O Google Pay não está disponível neste aparelho. Use Pix.");
  try {
    const dados = await client.loadPaymentData({
      ...base,
      allowedPaymentMethods: [metodoCartao(cfg)],
      merchantInfo: { merchantName: cfg.merchantName, ...(cfg.merchantId ? { merchantId: cfg.merchantId } : {}) },
      transactionInfo: { totalPriceStatus: "FINAL", totalPrice: valor.toFixed(2), currencyCode: "BRL", countryCode: "BR" },
    });
    return dados.paymentMethodData.tokenizationData.token;
  } catch (e) {
    if ((e as { statusCode?: string })?.statusCode === "CANCELED") throw new GooglePayCancelado("cancelado");
    throw new Error("O Google Pay não concluiu o pagamento. Tente de novo ou use Pix.");
  }
}
