import { expect, it } from "vitest";
import {
  normalizeImportedDishes,
  parseImportAnalysis,
  parseMenuPrice,
  splitMenuText,
  menuFromStructuredData,
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
it("lê cardápio de plataforma em JSON (schema.org e formatos de delivery)", () => {
  const { text, photos } = menuFromStructuredData([
    {
      "@type": "Restaurant",
      name: "Casa",
      hasMenu: {
        "@type": "Menu",
        hasMenuSection: [
          {
            "@type": "MenuSection",
            name: "Pratos",
            hasMenuItem: [
              {
                "@type": "MenuItem",
                name: "Moqueca",
                description: "Peixe no dendê",
                offers: { "@type": "Offer", price: "89.90" },
                image: "https://cdn.exemplo.com/m.jpg",
              },
            ],
          },
        ],
      },
    },
    { props: { menu: [{ name: "Bebidas", itens: [{ name: "Suco", price: { amount: 950 } }] }] } },
    { aggregateRating: { name: "Nota", ratingValue: 5 } },
  ]);
  expect(text.split("\n")).toEqual([
    "[Pratos] Moqueca — Peixe no dendê — R$ 89,90",
    "[Bebidas] Suco — R$ 9,50",
  ]);
  expect(photos).toEqual(["https://cdn.exemplo.com/m.jpg"]);
});
