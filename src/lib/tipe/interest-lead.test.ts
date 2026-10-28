import { describe, expect, it } from "vitest";
import { interestSchema, linhaInteresse, ROTULO_AVISO_GUEST } from "./interest-lead";

const base = { contactName: "Ana Souza", email: "ana@exemplo.com", privacyAccepted: true as const };

describe("lead de interesse (Guest e Restaurante Fundador)", () => {
  it("aviso do Guest: só nome e e-mail, grava origem e rótulo fixo", () => {
    const d = interestSchema.parse({ ...base, origem: "tipe-guest" });
    const l = linhaInteresse(d, new Date("2026-10-28T12:00:00Z"));
    expect(l.origin_page).toBe("tipe-guest");
    expect(l.restaurant_name).toBe(ROTULO_AVISO_GUEST);
    expect(l.marketing_opt_in).toBe(false);
    expect(l.privacy_accepted_at).toBe("2026-10-28T12:00:00.000Z");
    expect(l.notes).toContain("Tipe Guest");
  });

  it("sem consentimento não passa", () => {
    expect(() =>
      interestSchema.parse({ ...base, origem: "tipe-guest", privacyAccepted: false }),
    ).toThrow();
  });

  it("Fundador exige restaurante e WhatsApp", () => {
    expect(() => interestSchema.parse({ ...base, origem: "restaurante-fundador" })).toThrow();
    const d = interestSchema.parse({
      ...base,
      origem: "restaurante-fundador",
      restaurantName: "Maré Alta",
      phone: "(85) 99999-0000",
      city: "Fortaleza",
    });
    const l = linhaInteresse(d);
    expect(l.origin_page).toBe("restaurante-fundador");
    expect(l.restaurant_name).toBe("Maré Alta");
    expect(l.notes).toContain("Restaurante Fundador");
  });

  it("campo-isca preenchido é recusado", () => {
    expect(() => interestSchema.parse({ ...base, origem: "tipe-guest", site: "x" })).toThrow();
  });

  it("origem desconhecida é recusada", () => {
    expect(() => interestSchema.parse({ ...base, origem: "fundador" })).toThrow();
  });
});
