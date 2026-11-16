import { describe, expect, it } from "vitest";
import { FUSOS_FISCAIS_BR } from "./contract";
import { instanteFiscal } from "./time";

describe("horário fiscal do estabelecimento", () => {
  it("preserva a data local mesmo quando o UTC já virou o dia", () => {
    const now = new Date("2026-11-12T03:30:00Z");
    expect(instanteFiscal(now, "America/Fortaleza")).toBe("2026-11-12T00:30:00-03:00");
    expect(instanteFiscal(now, "America/Rio_Branco")).toBe("2026-11-11T22:30:00-05:00");
    expect(instanteFiscal(now, "America/Noronha")).toBe("2026-11-12T01:30:00-02:00");
  });
  it("representa o mesmo instante em todos os fusos oferecidos", () => {
    const now = new Date("2026-11-11T15:40:21Z");
    for (const zone of FUSOS_FISCAIS_BR) {
      expect(new Date(instanteFiscal(now, zone)).getTime()).toBe(now.getTime());
    }
  });
  it("rejeita data inválida e fuso fora do cadastro", () => {
    expect(() => instanteFiscal(new Date("invalid"), "America/Fortaleza")).toThrow();
    expect(() => instanteFiscal(new Date(), "Europe/London")).toThrow();
  });
});
