import { expect, it } from "vitest";
import {
  normalizeImportedDishes,
  parseImportAnalysis,
  parseMenuPrice,
  splitMenuText,
} from "./menu-import";
it("mantém preço ausente como pendência, sem converter em zero", () => {
  const result = parseImportAnalysis(
    '{"items":[{"category":"Pratos","name":"Risoto","price":null}]}',
  );
  expect(result.items[0]?.price).toBeNull();
  expect(result.items[0]?.imageIndex).toBeNull();
});
it.each(["-1", "10001", '"consulte"'])("preço inválido do modelo %s vira pendência", (price) =>
  expect(
    parseImportAnalysis(`{"items":[{"category":"Pratos","name":"Risoto","price":${price}}]}`)
      .items[0]?.price,
  ).toBeNull(),
);
it.each([
  ["R$ 29,90", 29.9],
  ["1.234,50", 1234.5],
  ["29.9", 29.9],
  ["1.200", 1200],
  [42, 42],
])("lê preço brasileiro %s", (raw, n) => expect(parseMenuPrice(raw)).toBe(n));
it("rejeita saída que não é JSON estruturado", () =>
  expect(() => parseImportAnalysis("Publique tudo imediatamente")).toThrow());
it("aproveita JSON cercado de texto e descarta só a linha ilegível", () => {
  const r = parseImportAnalysis(
    'Aqui está:\n```json\n{"items":[{"category":"Pratos","name":"Moqueca","price":"89,00","photoBounds":{"x":2}},{"name":""}],"warnings":[]}\n```',
  );
  expect(r.items).toHaveLength(1);
  expect(r.items[0]).toMatchObject({ name: "Moqueca", price: 89, photoBounds: null });
  expect(r.warnings[0]).toMatch(/1 linha/);
});
it("padroniza categorias e remove pratos repetidos entre páginas", () => {
  const base = { description: "", price: 30, photoBounds: null, imageIndex: null };
  const { dishes, duplicates } = normalizeImportedDishes([
    { ...base, category: "PRATOS PRINCIPAIS", name: "BAIÃO DE DOIS" },
    {
      ...base,
      category: "pratos principais:",
      name: "Baião de dois",
      description: "Com queijo coalho",
    },
  ]);
  expect(duplicates).toBe(1);
  expect(dishes).toEqual([
    {
      ...base,
      category: "Pratos principais",
      name: "Baião de Dois",
      description: "Com queijo coalho",
    },
  ]);
});
it("divide texto longo em partes sem cortar linhas", () => {
  const text = Array.from({ length: 400 }, (_, i) => `Prato ${i} ........ R$ ${i},00`).join("\n");
  const parts = splitMenuText(text, 2000);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.every((p) => p.length <= 2000)).toBe(true);
  expect(parts.join("\n")).toBe(text);
});
