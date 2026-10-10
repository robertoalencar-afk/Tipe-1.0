import { describe, it, expect } from "vitest";
import { resolveServiceFee } from "./rules";

describe("taxa de serviço editável", () => {
  it("sugerida usa o percentual do restaurante", () => expect(resolveServiceFee(100, 0.1, { kind: "suggested" })).toEqual({ amount: 10, changed: false }));
  it("cliente pode zerar", () => expect(resolveServiceFee(100, 0.1, { kind: "amount", value: 0 })).toEqual({ amount: 0, changed: true }));
  it("percentual rápido de 15%", () => expect(resolveServiceFee(80, 0.1, { kind: "percent", value: 15 })?.amount).toBe(12));
  it("aceita exatamente 20%", () => expect(resolveServiceFee(100, 0.1, { kind: "amount", value: 20 })?.amount).toBe(20));
  it("rejeita acima de 20%", () => expect(resolveServiceFee(100, 0.1, { kind: "amount", value: 20.01 })).toBeNull());
  it("rejeita percentual acima de 20", () => expect(resolveServiceFee(100, 0.1, { kind: "percent", value: 21 })).toBeNull());
  it("rejeita negativo", () => expect(resolveServiceFee(100, 0.1, { kind: "amount", value: -1 })).toBeNull());
  it("rejeita não numérico", () => expect(resolveServiceFee(100, 0.1, { kind: "amount", value: Number("abc") })).toBeNull());
  it("taxa desativada sugere zero", () => expect(resolveServiceFee(100, 0, { kind: "suggested" })?.amount).toBe(0));
});
