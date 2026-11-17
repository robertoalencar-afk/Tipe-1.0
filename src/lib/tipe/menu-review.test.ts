import { expect, it } from "vitest";
import { menuScore, reviewMenu, type ReviewItem } from "./menu-review";
const cats = [
  { id: "c1", name: "Principais" },
  { id: "c2", name: "Bebidas" },
  { id: "c3", name: "Para organizar" },
  { id: "c4", name: "Sobremesas" },
];
const base: ReviewItem = {
  id: "x",
  name: "Moqueca de camarão",
  price: 120,
  categoryId: "c1",
  sector: "kitchen",
  description: "Camarão no leite de coco e dendê, com arroz e pirão.",
  available: true,
  photo: "/f.webp",
  depth: "/d.png",
  photoSize: { w: 1440, h: 1800 },
  translated: true,
};
it("item completo não gera pendência", () => {
  expect(reviewMenu([base], cats)).toEqual([]);
  expect(menuScore([base], [])).toBe(100);
});
it("aponta foto pequena, nome em maiúsculas, bebida fora do lugar e setor", () => {
  const kinds = reviewMenu(
    [
      { ...base, id: "a", photoSize: { w: 640, h: 480 } },
      { ...base, id: "b", name: "SUCO DE CAJU", categoryId: "c1", description: "" },
      { ...base, id: "c", name: "Pudim", categoryId: "c3", photo: null },
    ],
    cats,
  ).map((i) => `${i.itemId}:${i.kind}:${JSON.stringify(i.fix ?? null)}`);
  expect(kinds).toEqual([
    "a:foto-pequena:null",
    "b:sem-descricao:null",
    'b:nome-maiusculo:{"name":"Suco de Caju"}',
    'b:categoria-errada:{"categoryName":"Bebidas"}',
    'b:setor-errado:{"sector":"bar"}',
    "c:sem-foto:null",
    'c:sem-categoria:{"categoryName":"Sobremesas"}',
  ]);
});
it("detecta preço fora da curva e repetidos", () => {
  const items = [1, 2, 3, 4].map((n) => ({ ...base, id: `p${n}`, name: `Prato ${n}`, price: 50 }));
  items.push({ ...base, id: "p5", name: "Prato 1", price: 5000 });
  const issues = reviewMenu(items, cats);
  expect(issues.filter((i) => i.kind === "preco-fora").map((i) => i.itemId)).toEqual(["p5"]);
  expect(issues.filter((i) => i.kind === "repetido").map((i) => i.itemId)).toEqual(["p1", "p5"]);
});
