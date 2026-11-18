import { describe, expect, it } from "vitest";
import { proximosPassos } from "./EstudioCardapio";

const item = {
  id: "1",
  name: "Moqueca",
  price: 100,
  category_id: "c",
  sector: "kitchen",
  description: "x",
  available: true,
  menu_config: {},
};

describe("próximos passos da Lebre", () => {
  it("cardápio vazio começa pela importação", () => {
    expect(
      proximosPassos({ items: [], fotos: 0, semFicha: 0, indicados: 0, promos: [], banners: 0 })[0]
        ?.aba,
    ).toBe("importar");
  });
  it("aponta foto, indicação, dia fraco e banner, no máximo quatro", () => {
    const s = proximosPassos({
      items: [item, { ...item, id: "2" }],
      fotos: 1,
      semFicha: 1,
      indicados: 0,
      promos: [{ enabled: true, days: [3] }],
      banners: 0,
    });
    expect(s.map((x) => x.aba)).toEqual(["pratos", "lebre", "lebre", "promocoes"]);
    expect(s[3]?.text).toMatch(/Segunda e Terça/);
  });
  it("cardápio completo não tem pendências", () => {
    expect(
      proximosPassos({
        items: [item],
        fotos: 1,
        semFicha: 0,
        indicados: 2,
        promos: [{ enabled: true, days: [] }],
        banners: 3,
      }),
    ).toEqual([]);
  });
});
