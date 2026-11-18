import { describe, expect, it } from "vitest";
import {
  cssImpressao,
  formatarCnpj,
  htmlPreConta,
  htmlTicket,
  linkMesa,
  saldoPreConta,
  totaisPreConta,
} from "./imprimir";

describe("impressão", () => {
  it("soma subtotal, serviço e total em centavos", () => {
    const t = totaisPreConta(
      [
        { qty: 2, nome: "A", unit: 10.1 },
        { qty: 1, nome: "B", unit: 0.35 },
      ],
      0.1,
    );
    expect(t).toEqual({ subtotal: 20.55, servico: 2.06, total: 22.61 });
  });
  it("sem taxa não mostra linha de serviço", () => {
    const h = htmlPreConta({
      restaurante: "X",
      mesa: "4",
      hora: new Date(),
      linhas: [{ qty: 1, nome: "Suco", unit: 12 }],
      taxa: 0,
    });
    expect(h).not.toContain("Serviço");
    expect(h).toContain("Sem valor fiscal");
  });
  it("escapa texto do pedido no ticket", () => {
    const h = htmlTicket({
      restaurante: "R",
      titulo: "Mesa 1",
      setor: "Cozinha",
      hora: new Date(),
      itens: [{ qty: 1, nome: "<b>x</b>", obs: 'sem "cebola"' }],
    });
    expect(h).not.toContain("<b>x</b>");
    expect(h).toContain("&lt;b&gt;");
    expect(h).toContain("Obs.: sem &quot;cebola&quot;");
  });
  it("pré-conta leva o QR da conta da mesa para pagar pelo Tipe Pay", () => {
    const h = htmlPreConta({
      restaurante: "X",
      mesa: "4",
      hora: new Date(),
      linhas: [{ qty: 1, nome: "Suco", unit: 12 }],
      taxa: 0.1,
      qrSvg: "<svg></svg>",
    });
    expect(h).toContain("<svg></svg>");
    expect(h).toContain("Tipe Pay");
  });
  it("link da mesa usa o domínio público fora de preview", () => {
    expect(linkMesa("bistro", "m4", "tok", "http://localhost:5173")).toBe(
      "https://tipe.digital/bistro/m4?t=tok",
    );
    expect(linkMesa("bistro", "m4", "tok", "https://tipe.digital")).toBe(
      "https://tipe.digital/bistro/m4?t=tok",
    );
  });
  it("pré-conta traz os dados do estabelecimento e o aviso de não fiscal", () => {
    const h = htmlPreConta({
      restaurante: "Bistrô",
      razaoSocial: "Bistrô Ltda",
      cnpj: "12345678000190",
      endereco: "Rua A, 10",
      telefone: "(85) 9999-0000",
      mesa: "1",
      garcom: "Ana",
      hora: new Date(2026, 10, 17, 20, 5),
      linhas: [{ qty: 2, nome: "Pastel", unit: 17 }],
      taxa: 0.1,
    });
    for (const t of [
      "Bistrô Ltda",
      "CNPJ 12.345.678/0001-90",
      "Rua A, 10",
      "Tel. (85) 9999-0000",
      "Mesa 1",
      "Garçom: Ana",
      "17/11/2026",
      "NÃO É DOCUMENTO FISCAL",
    ])
      expect(h).toContain(t);
    expect(h).toMatch(/R\$\s17,00 cada/);
  });
  it("mostra já pago e falta pagar com serviço proporcional", () => {
    expect(saldoPreConta([{ qty: 2, nome: "A", unit: 50 }], 0.1, 50)).toEqual({
      subtotal: 100,
      servico: 10,
      total: 110,
      pago: 55,
      restante: 55,
    });
    const h = htmlPreConta({
      restaurante: "X",
      mesa: "4",
      hora: new Date(),
      linhas: [{ qty: 2, nome: "A", unit: 50 }],
      taxa: 0.1,
      pagoItens: 50,
    });
    expect(h).toContain("Falta pagar");
    expect(
      htmlPreConta({
        restaurante: "X",
        mesa: "4",
        hora: new Date(),
        linhas: [{ qty: 1, nome: "A", unit: 5 }],
        taxa: 0,
      }),
    ).not.toContain("Falta pagar");
  });
  it("formata CNPJ e mantém valor estranho como veio", () => {
    expect(formatarCnpj("12.345.678/0001-90")).toBe("12.345.678/0001-90");
    expect(formatarCnpj("123")).toBe("123");
  });
  it("CSS de impressão esconde o app e respeita o papel", () => {
    expect(cssImpressao("80")).toContain("size: 80mm auto");
    expect(cssImpressao("a4")).toContain("size: A4");
    expect(cssImpressao("80")).toContain("body > *:not(#tipe-impressao)");
  });
});
