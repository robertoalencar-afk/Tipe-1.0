import { describe, expect, it } from "vitest";
import {
  daysWithoutPromo,
  promoActiveOn,
  promoHoursLabel,
  readMenuPromos,
  type MenuPromo,
} from "./menu-promos";

const base: MenuPromo = {
  id: "7d1f3c2a-1b2c-4d5e-8f90-123456789abc",
  name: "Terça do camarão",
  kind: "cortesia",
  itemCodes: ["BT-INTERNAC"],
  days: [2],
  start: "",
  end: "",
  rule: "Sobremesa cortesia para cada prato de camarão para dois. Não cumulativa.",
  until: "",
  enabled: true,
};
const terca = new Date(2026, 10, 17, 20, 0); // terça
const quarta = new Date(2026, 10, 18, 20, 0);

describe("promoções do cardápio", () => {
  it("vale só nos dias, ativa e dentro da validade", () => {
    expect(promoActiveOn(base, terca)).toBe(true);
    expect(promoActiveOn(base, quarta)).toBe(false);
    expect(promoActiveOn({ ...base, enabled: false }, terca)).toBe(false);
    expect(promoActiveOn({ ...base, until: "2026-11-16" }, terca)).toBe(false);
    expect(promoActiveOn({ ...base, until: "2026-11-17" }, terca)).toBe(true);
    expect(promoActiveOn({ ...base, days: [] }, quarta)).toBe(true);
  });
  it("descreve o horário", () => {
    expect(promoHoursLabel({ start: "17:00", end: "19:00" })).toBe("das 17h às 19h");
    expect(promoHoursLabel({ start: "18:30", end: "" })).toBe("a partir das 18:30");
    expect(promoHoursLabel({ start: "", end: "" })).toBe("");
  });
  it("aponta dias sem promoção e rejeita dados inválidos", () => {
    expect(daysWithoutPromo([base])).toEqual([0, 1, 3, 4, 5, 6]);
    expect(readMenuPromos([{ ...base, rule: "" }])).toEqual([]);
    expect(readMenuPromos([{ ...base, start: "25:00" }])).toEqual([]);
    expect(readMenuPromos([base])).toHaveLength(1);
  });
});
