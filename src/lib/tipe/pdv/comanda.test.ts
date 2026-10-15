import { describe, it, expect } from "vitest";
import { resumoMesa, statusMesaSalao, totalCarrinho, carrinhoParaPedido, type ItemConta } from "./comanda";

const item = (code: string, price: number, qty: number, reserved = 0, paid = 0): ItemConta => ({
  item_code: code, item_name: code, unit_price: price, ordered_quantity: qty, reserved_portion: reserved, paid_portion: paid,
});

describe("resumoMesa", () => {
  it("mesa vazia zera tudo", () => expect(resumoMesa([])).toEqual({ total: 0, pago: 0, reservado: 0, disponivel: 0, itens: 0 }));
  it("soma total, pago, reservado e disponível", () => {
    const r = resumoMesa([item("A", 10, 3, 1, 1), item("B", 5.5, 2)]);
    expect(r.total).toBe(41); // 30 + 11
    expect(r.pago).toBe(10);
    expect(r.reservado).toBe(10);
    expect(r.disponivel).toBe(21); // (3-1-1)*10 + 2*5.5
    expect(r.itens).toBe(2);
  });
  it("não deixa disponível negativo quando tudo foi pago", () => {
    expect(resumoMesa([item("A", 10, 2, 0, 2)]).disponivel).toBe(0);
  });
  it("arredonda centavos", () => {
    expect(resumoMesa([item("A", 13.9, 3)]).total).toBe(41.7);
  });
});

describe("statusMesaSalao", () => {
  const base = { itens: 0, disponivel: 0, reservado: 0 };
  it("sem itens é livre", () => expect(statusMesaSalao(base, 0)).toBe("livre"));
  it("pagamento pendente vence tudo", () => expect(statusMesaSalao({ itens: 2, disponivel: 10, reservado: 0 }, 1)).toBe("aguardando"));
  it("tudo pago é fechada", () => expect(statusMesaSalao({ itens: 2, disponivel: 0, reservado: 0 }, 0)).toBe("fechada"));
  it("parte reservada é pagando", () => expect(statusMesaSalao({ itens: 2, disponivel: 5, reservado: 5 }, 0)).toBe("pagando"));
  it("com itens livres é ocupada", () => expect(statusMesaSalao({ itens: 2, disponivel: 20, reservado: 0 }, 0)).toBe("ocupada"));
});

describe("carrinho", () => {
  const preco: Record<string, number> = { A: 10, B: 5.5 };
  it("total do carrinho", () => expect(totalCarrinho([{ code: "A", qty: 2 }, { code: "B", qty: 1 }], (c) => preco[c] ?? 0)).toBe(25.5));
  it("ignora itens zerados e inclui observação", () => {
    expect(carrinhoParaPedido({ A: 2, B: 0, C: 1 }, { A: " sem cebola ", C: "" })).toEqual([
      { code: "A", qty: 2, notes: "sem cebola" },
      { code: "C", qty: 1 },
    ]);
  });
});
