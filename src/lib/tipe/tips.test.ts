import { describe, expect, it } from "vitest";
import { splitGorjeta, splitTip, TIP_SPLIT } from "./rules";

describe("gorjeta extra: divisão garçom/TIPE", () => {
  it("garçom + TIPE somam exatamente a gorjeta, em todos os valores até R$ 1.000", () => {
    for (let c = 1; c <= 100_000; c++) {
      const { waiter, tipe } = splitTip(c / 100);
      expect(Math.round(waiter * 100) + Math.round(tipe * 100)).toBe(c);
    }
  });
  it("splitGorjeta segue a mesma regra (antes perdia centavos, ex.: R$ 0,05)", () => {
    const g = splitGorjeta(0.05);
    expect(Math.round((g.garcom + g.tipe) * 100)).toBe(5);
    expect(g.restaurante).toBe(0);
  });
  it("proporção vigente é a configurada em TIP_SPLIT", () => {
    expect(splitTip(10)).toEqual({ waiter: TIP_SPLIT.waiter * 10, tipe: +(TIP_SPLIT.tipe * 10).toFixed(2) });
  });
});
