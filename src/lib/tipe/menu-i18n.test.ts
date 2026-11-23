import { describe, expect, it } from "vitest";
import {
  daysLabel,
  localizedCategory,
  localizedPost,
  localizedPromo,
  postSource,
  promoSource,
} from "./menu-i18n";

const post = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  title: "Terça do camarão",
  caption: "Camarão em dobro.",
  itemCode: "SUC",
  theme: "photo" as const,
  enabled: true,
};

describe("menu i18n", () => {
  it("translates a category only while its Portuguese name is unchanged", () => {
    const c = {
      id: "1",
      name: "Entradas",
      i18n: { src: "Entradas", en: "Starters", es: "Entradas" },
    };
    expect(localizedCategory(c, "en").name).toBe("Starters");
    expect(localizedCategory({ ...c, name: "Petiscos" }, "en").name).toBe("Petiscos");
    expect(localizedCategory(c, "pt").name).toBe("Entradas");
  });
  it("uses the banner translation for the current text and falls back otherwise", () => {
    const p = {
      ...post,
      i18n: {
        src: postSource(post),
        es: { title: "Martes de camarón", caption: "Camarón doble." },
      },
    };
    expect(localizedPost(p, "es").title).toBe("Martes de camarón");
    expect(localizedPost({ ...p, title: "Outro" }, "es").title).toBe("Outro");
    expect(localizedPost(p, "en").title).toBe("Terça do camarão");
  });
  it("hides an untranslated promotion from foreign guests", () => {
    const promo = { name: "Happy hour", rule: "Das 17h às 19h, no salão." };
    expect(localizedPromo(promo, "en")).toBeNull();
    expect(localizedPromo(promo, "pt")).toBe(promo);
    const t = {
      ...promo,
      i18n: { src: promoSource(promo), en: { name: "Happy hour", rule: "5 to 7 pm, dine-in." } },
    };
    expect(localizedPromo(t, "en")?.rule).toBe("5 to 7 pm, dine-in.");
  });
  it("names weekdays in each language", () => {
    expect(daysLabel([2], "en")).toBe("Every Tuesday");
    expect(daysLabel([2], "es")).toBe("Todos los martes");
    expect(daysLabel([0, 6], "es")).toBe("Fines de semana");
    expect(daysLabel([1, 3], "en")).toBe("Every Monday and Wednesday");
    expect(daysLabel([], "en")).toBe("");
  });
});
