import { describe, expect, it } from "vitest";
import { canTransition, decideSettlement, paidCents, type PaymentStatus, type ProviderOrderView } from "./payment-state";

const order = (status: string, charge?: string, paid?: number): ProviderOrderView => ({
  status,
  amount: 5000,
  charges: charge ? [{ status: charge, amount: 5000, ...(paid === undefined ? {} : { paid_amount: paid }) }] : [],
});
const decide = (local: PaymentStatus, o: ProviderOrderView, ageMs = 60_000) => decideSettlement({ local, order: o, expectedCents: 5000, ageMs });

describe("máquina de estados", () => {
  it("pendente só vai para aprovado, falho ou cancelado", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "refunded")).toBe(false);
  });
  it("aprovado só pode ser estornado ou contestado", () => {
    expect(canTransition("approved", "refunded")).toBe(true);
    expect(canTransition("approved", "pending")).toBe(false);
    expect(canTransition("approved", "failed")).toBe(false);
  });
  it("estados finais não mudam", () => {
    for (const s of ["failed", "cancelled", "refunded", "chargeback"] as const) {
      for (const t of ["pending", "approved", "failed", "cancelled", "refunded", "chargeback"] as const) expect(canTransition(s, t)).toBe(false);
    }
  });
});

describe("decisão de liquidação", () => {
  it("pedido pago liquida o pendente", () => expect(decide("pending", order("paid", "paid", 5000))).toEqual({ action: "settle_paid" }));
  it("pedido recusado libera a reserva", () => expect(decide("pending", order("failed", "failed"))).toEqual({ action: "settle_failed" }));
  it("Pix expirado (cancelado) libera a reserva", () => expect(decide("pending", order("canceled", "canceled"))).toEqual({ action: "settle_failed" }));
  it("pendente recente aguarda", () => expect(decide("pending", order("pending", "pending"))).toEqual({ action: "wait" }));
  it("pendente antigo vira pendência", () => expect(decide("pending", order("pending", "pending"), 3 * 3_600_000).action).toBe("incident"));

  it("webhook duplicado de pagamento aprovado não faz nada", () => expect(decide("approved", order("paid", "paid", 5000))).toEqual({ action: "noop" }));
  it("webhook de falha chegando depois da aprovação (fora de ordem) não desfaz o pagamento", () => {
    // O pedido é reconsultado: se o provedor diz pago, nada muda.
    expect(decide("approved", order("paid", "paid", 5000))).toEqual({ action: "noop" });
  });
  it("estorno: cobrança cancelada depois de paga", () => expect(decide("approved", order("canceled", "canceled"))).toEqual({ action: "reverse", kind: "refunded" }));
  it("contestação (chargeback)", () => expect(decide("approved", order("paid", "chargedback"))).toEqual({ action: "reverse", kind: "chargeback" }));
  it("contestação repetida é ignorada", () => expect(decide("chargeback", order("paid", "chargedback"))).toEqual({ action: "noop" }));
  it("estornado não volta a ser aprovado", () => expect(decide("refunded", order("paid", "paid", 5000))).toEqual({ action: "noop" }));

  it("valor pago diferente do esperado não aprova", () => {
    const d = decide("pending", order("paid", "paid", 4000));
    expect(d.action).toBe("incident");
    expect(d.action === "incident" && d.kind).toBe("amount_mismatch");
  });
  it("pagamento a menor (underpaid) não aprova", () => expect(decide("pending", order("pending", "underpaid", 1000)).action).toBe("incident"));
  it("pagamento confirmado depois que a reserva foi liberada gera pendência", () => {
    const d = decide("failed", order("paid", "paid", 5000));
    expect(d.action === "incident" && d.kind).toBe("paid_after_release");
  });
  it("centavos pagos vêm do paid_amount da cobrança", () => expect(paidCents(order("paid", "paid", 4999))).toBe(4999));
  it("sem cobranças, usa o valor do pedido", () => expect(paidCents({ status: "paid", amount: 1234 })).toBe(1234));
});
