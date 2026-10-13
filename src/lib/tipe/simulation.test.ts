import { describe, expect, it } from "vitest";
import { simulatedPaymentsAllowed, usableBillMethods } from "./pagarme.server";

const comFlag = <T>(valor: string | undefined, fn: () => T): T => {
  const antes = process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"];
  if (valor === undefined) delete process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"]; else process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"] = valor;
  try { return fn(); } finally { if (antes === undefined) delete process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"]; else process.env["TIPE_ALLOW_SIMULATED_PAYMENTS"] = antes; }
};
const todos = ["pix", "apple_pay", "google_pay", "at_establishment"];

describe("pagamento simulado só quando ligado de propósito", () => {
  it("desligado por padrão (produção)", () => comFlag(undefined, () => expect(simulatedPaymentsAllowed()).toBe(false)));
  it("qualquer valor diferente de 'true' mantém desligado", () => comFlag("1", () => expect(simulatedPaymentsAllowed()).toBe(false)));
  it("ligado só com TIPE_ALLOW_SIMULATED_PAYMENTS=true", () => comFlag("true", () => expect(simulatedPaymentsAllowed()).toBe(true)));

  it("sem Pagar.me e sem simulação, o cliente só vê pagamento no estabelecimento", () =>
    comFlag(undefined, () => expect(usableBillMethods(todos, false)).toEqual(["at_establishment"])));
  it("mesmo que o restaurante tenha desligado o presencial, nunca fica sem meio de pagamento", () =>
    comFlag(undefined, () => expect(usableBillMethods(["pix"], false)).toEqual(["at_establishment"])));
  it("com Pagar.me ativa, valem os meios escolhidos pelo restaurante", () =>
    comFlag(undefined, () => expect(usableBillMethods(todos, true)).toEqual(todos)));
  it("em ambiente de demonstração, todos os meios aparecem", () =>
    comFlag("true", () => expect(usableBillMethods(todos, false)).toEqual(todos)));
});
