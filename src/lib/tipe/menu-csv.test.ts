import { describe, expect, it } from "vitest";
import { parseMenuCsv, MenuImportRows } from "./menu-csv";
describe("migração CSV", () => {
  it("preserva preços decimais exportados em ambos os formatos", () => {
    expect(
      parseMenuCsv(
        "categoria;codigo;item;preco;ativo\nPratos;p1;Prato;12.50;sim\nPratos;p2;Outro;12,50;não",
      ).map((r) => r.price),
    ).toEqual([12.5, 12.5]);
  });
  it("ignora separadores dentro de aspas ao detectar formato sem cabeçalho", () => {
    expect(parseMenuCsv('Pratos,P1,"Prato; especial",12.50,sim')[0]?.name).toBe("Prato; especial");
  });
  it("lê milhar brasileiro sem alterar os centavos", () => {
    expect(parseMenuCsv("Pratos;P1;Prato;1.234,56;sim")[0]?.price).toBe(1234.56);
  });
  it("lê BOM, aspas, separadores e quebras dentro dos nomes", () => {
    const rows = parseMenuCsv(
      '\uFEFFcategoria,codigo,item,preco,ativo\r\nPratos,P1,"Prato, com ""queijo""\nextra","12,50",sim',
    );
    expect(rows[0]).toMatchObject({ name: 'Prato, com "queijo"\nextra', price: 12.5 });
  });
  it.each([
    "Pratos;P1;Prato;abc;sim",
    "Pratos;P1;Prato;-12;sim",
    "Pratos;P1;Prato;12;talvez",
    'Pratos;P1;"Prato;12;sim',
  ])("rejeita dados inválidos sem converter em preço zero: %s", (csv) => {
    expect(() => parseMenuCsv(csv)).toThrow();
  });
  it("rejeita códigos repetidos também na validação do servidor", () => {
    const row = { category: "Pratos", code: "p1", name: "Prato", price: 12, available: true };
    expect(MenuImportRows.safeParse([row, { ...row, code: "P1" }]).success).toBe(false);
  });
});
