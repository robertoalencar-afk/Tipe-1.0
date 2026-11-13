import { describe, expect, it } from "vitest";
import { menuPriceCents } from "./menu-price";

describe("preço no editor de pratos", () => {
  it("aceita os separadores decimais do teclado sem multiplicar o valor", () => {
    expect(menuPriceCents("29,90")).toBe(2990);
    expect(menuPriceCents("29.90")).toBe(2990);
    expect(menuPriceCents("1.234,56")).toBe(123456);
    expect(menuPriceCents("0")).toBe(0);
  });
  it("recusa valores ambíguos, incompletos e acima do limite do servidor", () => {
    for (const value of ["", "29,", "1.234", "-1", "texto", "10.000,01", "1,2,3"]) expect(menuPriceCents(value)).toBeNull();
  });
});
