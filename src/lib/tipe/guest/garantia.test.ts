import { describe, expect, it } from "vitest";
import {
  applyGuaranteeCredit,
  guaranteeAmountCents,
  guaranteeOutcome,
  guaranteePolicyLines,
} from "./garantia";

const S = { perPersonCents: 1000, refundCutoffMin: 120 };
const start = new Date("2026-11-07T23:00:00Z");
const h = (x: number) => new Date(start.getTime() - x * 3_600_000);

describe("garantia da reserva", () => {
  it("cobra por pessoa e zero quando desligada", () => {
    expect(guaranteeAmountCents(S, 4)).toBe(4000);
    expect(guaranteeAmountCents({ ...S, perPersonCents: 0 }, 4)).toBe(0);
  });

  it("devolve no prazo e retém fora dele", () => {
    expect(
      guaranteeOutcome({ event: "cancelada_cliente", start, at: h(3), refundCutoffMin: 120 }),
    ).toBe("devolvida");
    expect(
      guaranteeOutcome({ event: "cancelada_cliente", start, at: h(2), refundCutoffMin: 120 }),
    ).toBe("devolvida");
    expect(
      guaranteeOutcome({ event: "cancelada_cliente", start, at: h(1), refundCutoffMin: 120 }),
    ).toBe("retida");
  });

  it("ausência retém, restaurante cancelando devolve, sentar vira crédito", () => {
    expect(
      guaranteeOutcome({ event: "nao_compareceu", start, at: h(-1), refundCutoffMin: 120 }),
    ).toBe("retida");
    expect(
      guaranteeOutcome({ event: "cancelada_restaurante", start, at: h(0.5), refundCutoffMin: 120 }),
    ).toBe("devolvida");
    expect(guaranteeOutcome({ event: "sentada", start, at: start, refundCutoffMin: 120 })).toBe(
      "credito",
    );
  });

  it("abate da conta e devolve a sobra", () => {
    expect(applyGuaranteeCredit(25000, 4000)).toEqual({ used: 4000, toPay: 21000, refund: 0 });
    expect(applyGuaranteeCredit(3000, 4000)).toEqual({ used: 3000, toPay: 0, refund: 1000 });
  });

  it("explica as regras antes do pagamento", () => {
    const l = guaranteePolicyLines(S, 4).join(" ");
    expect(l).toMatch(/R\$\s40,00/);
    expect(l).toContain("2 horas antes");
    expect(l).toContain("não compareceu");
  });
});
