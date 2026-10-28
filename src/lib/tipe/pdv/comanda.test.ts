import { describe, it, expect } from "vitest";
import {
  chaveLancamento,
  resumoMesa,
  statusMesaSalao,
  totalCarrinho,
  carrinhoParaPedido,
  avisosDeMudanca,
  avisosDeNotas,
  type ItemConta,
} from "./comanda";

const item = (code: string, price: number, qty: number, reserved = 0, paid = 0): ItemConta => ({
  item_code: code,
  item_name: code,
  unit_price: price,
  ordered_quantity: qty,
  reserved_portion: reserved,
  paid_portion: paid,
});

describe("resumoMesa", () => {
  it("mesa vazia zera tudo", () =>
    expect(resumoMesa([])).toEqual({ total: 0, pago: 0, reservado: 0, disponivel: 0, itens: 0 }));
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
  it("pagamento pendente vence tudo", () =>
    expect(statusMesaSalao({ itens: 2, disponivel: 10, reservado: 0 }, 1)).toBe("aguardando"));
  it("tudo pago é fechada", () =>
    expect(statusMesaSalao({ itens: 2, disponivel: 0, reservado: 0 }, 0)).toBe("fechada"));
  it("parte reservada é pagando", () =>
    expect(statusMesaSalao({ itens: 2, disponivel: 5, reservado: 5 }, 0)).toBe("pagando"));
  it("com itens livres é ocupada", () =>
    expect(statusMesaSalao({ itens: 2, disponivel: 20, reservado: 0 }, 0)).toBe("ocupada"));
});

describe("carrinho", () => {
  const preco: Record<string, number> = { A: 10, B: 5.5 };
  it("total do carrinho", () =>
    expect(
      totalCarrinho(
        [
          { code: "A", qty: 2 },
          { code: "B", qty: 1 },
        ],
        (c) => preco[c] ?? 0,
      ),
    ).toBe(25.5));
  it("ignora itens zerados e inclui observação", () => {
    expect(carrinhoParaPedido({ A: 2, B: 0, C: 1 }, { A: " sem cebola ", C: "" })).toEqual([
      { code: "A", qty: 2, notes: "sem cebola" },
      { code: "C", qty: 1 },
    ]);
  });
});

describe("avisosDeMudanca", () => {
  const mesa = (
    number: string,
    status: import("./comanda").StatusMesaSalao,
    total: number,
    pago: number,
    minhaMesa = true,
  ) => ({
    number,
    status,
    total,
    pago,
    disponivel: Math.max(0, total - pago),
    minhaMesa,
  });
  it("avisa quando a mesa fica quitada", () => {
    const a = avisosDeMudanca([mesa("7", "ocupada", 100, 40)], [mesa("7", "fechada", 100, 100)]);
    expect(a).toHaveLength(1);
    expect(a[0]!.tipo).toBe("quitada");
    expect(a[0]!.titulo).toBe("Mesa 7 · Paga por completo");
  });
  it("avisa pagamento parcial com o valor pago e o que falta", () => {
    const [a] = avisosDeMudanca([mesa("3", "ocupada", 100, 0)], [mesa("3", "ocupada", 100, 40)]);
    expect(a!.tipo).toBe("pagamento");
    expect(a!.titulo).toContain("40,00");
    expect(a!.texto).toContain("60,00");
  });
  it("avisa pagamento no local para confirmar", () => {
    const [a] = avisosDeMudanca([mesa("5", "ocupada", 80, 0)], [mesa("5", "aguardando", 80, 0)]);
    expect(a!.tipo).toBe("confirmar");
  });
  it("não avisa nada sem mudança, na primeira leitura ou em mesa de outro garçom", () => {
    expect(avisosDeMudanca([mesa("1", "ocupada", 50, 0)], [mesa("1", "ocupada", 50, 0)])).toEqual(
      [],
    );
    expect(avisosDeMudanca([], [mesa("1", "fechada", 50, 50)])).toEqual([]);
    expect(
      avisosDeMudanca(
        [mesa("2", "ocupada", 50, 0, false), mesa("9", "ocupada", 10, 0)],
        [mesa("2", "fechada", 50, 50, false), mesa("9", "ocupada", 10, 0)],
      ),
    ).toEqual([]);
  });
  it("sem mesas atribuídas, acompanha todas", () => {
    expect(
      avisosDeMudanca([mesa("2", "ocupada", 50, 0, false)], [mesa("2", "fechada", 50, 50, false)]),
    ).toHaveLength(1);
  });
});

describe("avisosDeNotas", () => {
  const nota = (id: string, stars: number, comment: string | null = null) => ({
    id,
    stars,
    comment,
    table: "12",
    at: "2026-10-19T20:00:00Z",
  });
  it("não avisa as notas que já existiam na primeira leitura", () => {
    expect(avisosDeNotas(null, [nota("a", 1)])).toEqual([]);
  });
  it("avisa nota baixa nova, com o comentário entre aspas", () => {
    const [a] = avisosDeNotas(new Set(["a"]), [nota("a", 1), nota("b", 2, " Demorou ")]);
    expect(a).toMatchObject({
      id: "nota:b",
      mesa: "12",
      tipo: "nota",
      titulo: "Mesa 12 · Nota 2 de 5",
      texto: "“Demorou”",
    });
  });
  it("ignora nota acima de 2 e explica quando não há comentário", () => {
    const r = avisosDeNotas(new Set(), [nota("c", 3), nota("d", 1)]);
    expect(r.map((x) => x.texto)).toEqual(["O cliente não deixou comentário."]);
  });
});

describe("chave do lançamento", () => {
  let n = 0;
  const novo = () => `lanc_teste${++n}`;
  it("o mesmo pedido reaproveita a chave (toque duplo ou nova tentativa)", () => {
    const a = chaveLancamento(null, { mesa: "4", itens: [{ code: "suco", qty: 2 }] }, novo);
    const b = chaveLancamento(a, { mesa: "4", itens: [{ code: "suco", qty: 2 }] }, novo);
    expect(b.id).toBe(a.id);
  });
  it("pedido diferente ganha chave nova", () => {
    const a = chaveLancamento(null, { mesa: "4", itens: [{ code: "suco", qty: 2 }] }, novo);
    expect(chaveLancamento(a, { mesa: "4", itens: [{ code: "suco", qty: 3 }] }, novo).id).not.toBe(a.id);
    expect(chaveLancamento(a, { mesa: "5", itens: [{ code: "suco", qty: 2 }] }, novo).id).not.toBe(a.id);
  });
  it("a chave padrão passa na validação do servidor", () => {
    expect(chaveLancamento(null, {}).id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});
