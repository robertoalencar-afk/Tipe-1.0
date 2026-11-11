import { describe, expect, it } from "vitest";
import {
  acharItem,
  acharMesa,
  escolherGarcom,
  podePropor,
} from "./lebre-operacao";
describe("Lebre: autorização e resolução da proposta", () => {
  for (const role of ["owner", "manager", "cashier", "waiter", "founder"]) {
    it(`respeita matriz de ${role}`, () => {
      expect(podePropor("open_table", [role])).toBe(role !== "founder");
      expect(podePropor("close_table", [role])).toBe(
        ["owner", "manager", "cashier"].includes(role),
      );
      expect(podePropor("add_table", [role])).toBe(role === "owner");
    });
  }
  it("normaliza mesa e rejeita ambiguidade", () => {
    expect(acharMesa("a1", [{ number: "A1" }])?.number).toBe("A1");
    expect(acharMesa("2", [])).toBeUndefined();
    expect(() => acharMesa("a", [{ number: "a" }, { number: "A" }])).toThrow(
      "ambíguos",
    );
  });
  const staff = [
    { id: "w1", user_id: "u1", name: "Um", active: true },
    { id: "w2", user_id: "u2", name: "Dois", active: true },
  ];
  it("usa o próprio garçom; caixa usa o da mesa", () => {
    expect(escolherGarcom("u1", ["waiter"], "w2", staff).id).toBe("w1");
    expect(escolherGarcom("caixa", ["cashier"], "w2", staff).id).toBe("w2");
  });
  it("nunca escolhe primeiro garçom arbitrariamente", () => {
    expect(() => escolherGarcom("caixa", ["cashier"], null, staff)).toThrow(
      "Vincule",
    );
    expect(() => escolherGarcom("sem", ["waiter"], "w2", staff)).toThrow(
      "não está ligado",
    );
    expect(() =>
      escolherGarcom("u1", ["waiter"], null, [
        ...staff,
        { ...staff[0]!, id: "w3" },
      ]),
    ).toThrow("mais de um");
  });
  it("prefere nome exato e recusa nome ambíguo ou inexistente", () => {
    const menu = [
      { code: "1", name: "Chopp", price: 10, available: true },
      { code: "2", name: "Chopp escuro", price: 12, available: true },
    ];
    expect(acharItem("Chopp", menu)).toEqual(menu[0]);
    expect(typeof acharItem("cho", menu)).toBe("string");
    expect(typeof acharItem("pizza", menu)).toBe("string");
  });
});
