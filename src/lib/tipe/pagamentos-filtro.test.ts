import { describe, expect, it } from "vitest";
import { filtrarPagamentos, pagamentosCsv, type PagamentoConta } from "./pagamentos-filtro";

const pag = (id: string, o: Partial<PagamentoConta> = {}): PagamentoConta => ({
  id,
  table: "12",
  customer: "Ana Souza",
  method: "pix",
  status: "approved",
  amount: 42.5,
  at: "2026-10-19T20:00:00Z",
  waiter: "w1",
  ...o,
});
const lista = [
  pag("a"),
  pag("b", { method: "at_establishment", status: "pending", waiter: "w2" }),
  pag("c", { status: "cancelled", waiter: null }),
];

describe("filtrarPagamentos", () => {
  it("sem filtro devolve tudo", () => {
    expect(
      filtrarPagamentos(lista, { status: "todos", metodo: "todos", garcom: "todos" }),
    ).toHaveLength(3);
  });
  it("combina situação, forma e garçom", () => {
    expect(
      filtrarPagamentos(lista, { status: "pending", metodo: "at_establishment", garcom: "w2" }).map(
        (p) => p.id,
      ),
    ).toEqual(["b"]);
    expect(
      filtrarPagamentos(lista, { status: "todos", metodo: "pix", garcom: "todos" }).map(
        (p) => p.id,
      ),
    ).toEqual(["a", "c"]);
  });
  it("separa as mesas sem garçom", () => {
    expect(
      filtrarPagamentos(lista, { status: "todos", metodo: "todos", garcom: "sem" }).map(
        (p) => p.id,
      ),
    ).toEqual(["c"]);
  });
});

describe("pagamentosCsv", () => {
  it("gera cabeçalho, nomes legíveis e vírgula decimal", () => {
    const csv = pagamentosCsv(
      [pag("a", { customer: 'Ana "Bia"; Souza' })],
      [{ id: "w1", name: "Carlos Mendes" }],
    ).split("\n");
    expect(csv[0]).toBe("data;mesa;cliente;forma;situacao;garcom;valor");
    expect(csv[1]).toContain(';12;"Ana ""Bia""; Souza";Pix;Confirmado;Carlos Mendes;42,50');
  });
});
