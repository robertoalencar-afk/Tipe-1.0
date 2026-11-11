// Tipe Reserva · taxa de garantia da reserva (modelo OpenTable). Regras puras, em centavos.
// O cliente paga um valor simbólico para confirmar; no dia ele vira crédito na conta da mesa.
// Cancelou no prazo ou o restaurante cancelou: devolução integral. Cancelou fora do prazo ou não
// apareceu: o valor fica com o Tipe (decisão do Roberto, 03/11). Estornos: a tarifa é do Tipe.
// Pagamento só por Pix, Apple Pay ou Google Pay.

const MIN = 60_000;

export type GuaranteeSettings = {
  /** Valor por pessoa, em centavos. 0 = restaurante não cobra garantia. */
  perPersonCents: number;
  /** Prazo para cancelar com devolução, em minutos antes do horário. */
  refundCutoffMin: number;
};

export const GUARANTEE_LIMITS = { minPerPersonCents: 500, maxPerPersonCents: 10_000 } as const;
export const GUARANTEE_METHODS = ["pix", "apple_pay", "google_pay"] as const;
export type GuaranteeMethod = (typeof GUARANTEE_METHODS)[number];

export function guaranteeAmountCents(s: GuaranteeSettings, party: number) {
  if (s.perPersonCents <= 0) return 0;
  return s.perPersonCents * Math.max(1, Math.floor(party));
}

export type GuaranteeEvent =
  "cancelada_cliente" | "cancelada_restaurante" | "nao_compareceu" | "sentada";
export type GuaranteeOutcome = "devolvida" | "retida" | "credito";

/** O que acontece com a garantia em cada desfecho da reserva. */
export function guaranteeOutcome(a: {
  event: GuaranteeEvent;
  start: Date;
  at: Date;
  refundCutoffMin: number;
}): GuaranteeOutcome {
  switch (a.event) {
    case "sentada":
      return "credito";
    case "cancelada_restaurante":
      return "devolvida";
    case "nao_compareceu":
      return "retida";
    case "cancelada_cliente":
      return a.at.getTime() <= a.start.getTime() - a.refundCutoffMin * MIN ? "devolvida" : "retida";
  }
}

/** Abate a garantia da conta. Se a garantia for maior que a conta, a diferença volta ao cliente. */
export function applyGuaranteeCredit(billCents: number, creditCents: number) {
  const used = Math.min(Math.max(0, billCents), Math.max(0, creditCents));
  return { used, toPay: Math.max(0, billCents) - used, refund: Math.max(0, creditCents) - used };
}

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function prazo(min: number) {
  if (min % 1440 === 0) return `${min / 1440} ${min === 1440 ? "dia" : "dias"}`;
  if (min % 60 === 0) return `${min / 60} ${min === 60 ? "hora" : "horas"}`;
  return `${min} minutos`;
}

/** Texto que o cliente lê e aceita antes de pagar. */
export function guaranteePolicyLines(s: GuaranteeSettings, party: number) {
  const total = guaranteeAmountCents(s, party);
  return [
    `Você paga ${brl(total)} agora (${brl(s.perPersonCents)} por pessoa) para confirmar a reserva.`,
    `No dia, o valor vira crédito e é descontado da conta da mesa.`,
    `Cancelou até ${prazo(s.refundCutoffMin)} antes do horário: devolvemos tudo.`,
    `Cancelou depois disso ou não compareceu: o valor não é devolvido.`,
    `Se o restaurante cancelar, você recebe tudo de volta.`,
  ];
}
