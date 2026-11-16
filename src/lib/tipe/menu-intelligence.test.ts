import { describe, expect, it } from "vitest";
import {
  MenuAssistantSettings,
  menuSource,
  publishedMenuLanguages,
  filterMenu,
  MenuConfigSchema,
  readMenuConfig,
  relatedItems,
  safeMenuLink,
  translatedItem,
  menuPhotoCredit,
} from "./menu-intelligence";

const item = (code: string, name: string, config = {}) => ({
  code,
  name,
  categoryId: "food",
  description: "Feijão com queijo",
  price: 19.95,
  config: readMenuConfig(config),
});
describe("cardápio inteligente", () => {
  const credit = {
    imageUrl: "https://storage.example/photo.webp",
    illustrative: true,
    author: "Fotógrafo",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  };
  it("preserves attribution but never attaches it to a replacement photo", () => {
    const config = readMenuConfig({ photoCredit: credit, diets: ["vegetarian"] });
    expect(menuPhotoCredit(config, credit.imageUrl)).toEqual(credit);
    expect(menuPhotoCredit(config, "https://storage.example/new.webp")).toBeUndefined();
    expect(menuPhotoCredit(config, null)).toBeUndefined();
  });
  it.each(["javascript:alert(1)", "data:text/html,bad", "https://user:password@example.com"])(
    "ignores unsafe credit links without losing menu settings: %s",
    (sourceUrl) => {
      const config = readMenuConfig({
        photoCredit: { ...credit, sourceUrl },
        diets: ["vegetarian"],
      });
      expect(config.photoCredit).toBeUndefined();
      expect(config.diets).toEqual(["vegetarian"]);
    },
  );
  it("finds accented names, ingredients and categories", () => {
    const items = [item("B", "Baião")];
    for (const query of ["baiao", " QUEIJO ", "refeicoes"])
      expect(filterMenu(items, query, "", "", () => "Refeições")).toHaveLength(1);
  });
  it("combines category and search instead of bypassing the category", () => {
    expect(filterMenu([item("B", "Baião")], "baiao", "drinks", "", () => "")).toEqual([]);
  });
  it("never infers dietary safety from ingredients or missing allergens", () => {
    expect(filterMenu([item("B", "Vegano sem glúten")], "", "", "vegan", () => "")).toEqual([]);
  });
  it("shows only explicit dietary declarations", () => {
    const items = [item("B", "Baião", { diets: ["vegetarian"] }), item("C", "Carne")];
    expect(filterMenu(items, "", "", "vegetarian", () => "").map((i) => i.code)).toEqual(["B"]);
  });
  it("keeps unavailable/missing items out of suggestions and excludes itself", () => {
    expect(
      relatedItems(["B", "X", "C", "C"], [item("B", "Baião"), item("C", "Caju")], "B").map(
        (i) => i.code,
      ),
    ).toEqual(["C"]);
  });
  it("translates display text without changing the product code or price", () => {
    const source = item("B", "Baião", {
      translations: { en: { name: "Rice and beans", description: "Rice, beans and cheese" } },
    });
    expect(translatedItem(source, "en")).toMatchObject({
      code: "B",
      price: 19.95,
      name: "Rice and beans",
    });
    expect(source.name).toBe("Baião");
  });
  it("falls back field by field when translations are missing", () => {
    const source = item("B", "Baião", { translations: { en: { name: "Rice" } } });
    expect(translatedItem(source, "en").description).toBe(source.description);
    expect(translatedItem(source, "es").name).toBe(source.name);
  });
  it("tolerates an absent or malformed migration without hiding the menu", () => {
    for (const raw of [null, undefined, "bad", { diets: ["invented"] }])
      expect(readMenuConfig(raw).diets).toEqual([]);
  });
  it("bounds recommendation groups and translations", () => {
    expect(MenuConfigSchema.safeParse({ addons: Array(9).fill("A") }).success).toBe(false);
    expect(
      MenuConfigSchema.safeParse({ translations: { en: { name: "X".repeat(81) } } }).success,
    ).toBe(false);
  });
  it.each([
    "https://instagram.com/restaurante",
    "https://www.tripadvisor.com.br/Restaurant_Review",
    "https://maps.app.goo.gl/example",
    "",
  ])("allows a supported link: %s", (url) => expect(safeMenuLink(url)).toBe(true));
  it.each([
    "javascript:alert(1)",
    "http://instagram.com/a",
    "https://instagram.com.evil.test",
    "https://evil.test/?instagram.com",
    "https://user:pass@instagram.com/a",
  ])("rejects unsafe or deceptive links: %s", (url) => expect(safeMenuLink(url)).toBe(false));
});

describe("idiomas publicados no Order", () => {
  it("keeps Portuguese while disabled, incomplete or stale", () => {
    const dish = { name: "Baião", description: "Feijão", menu_config: {} };
    expect(publishedMenuLanguages(null, [dish])).toEqual(["pt"]);
    expect(
      publishedMenuLanguages({ auto_translate: true, languages: ["pt", "en"] }, [dish]),
    ).toEqual(["pt"]);
    const ready = {
      ...dish,
      menu_config: {
        translationSource: menuSource(dish),
        translations: { en: { name: "Rice and beans", description: "Beans" } },
      },
    };
    expect(
      publishedMenuLanguages({ auto_translate: true, languages: ["pt", "en", "es"] }, [ready]),
    ).toEqual(["pt", "en"]);
    expect(
      publishedMenuLanguages({ auto_translate: false, languages: ["pt", "en"] }, [ready]),
    ).toEqual(["pt"]);
    expect(
      publishedMenuLanguages({ auto_translate: true, languages: ["pt", "en"] }, [ready, dish]),
    ).toEqual(["pt"]);
    expect(
      publishedMenuLanguages({ auto_translate: true, languages: ["pt", "en"] }, [
        { ...ready, name: "Outro prato" },
      ]),
    ).toEqual(["pt"]);
  });
  it("requires a translated description when the original has one", () => {
    const dish = { name: "Suco", description: "Caju", menu_config: {} };
    dish.menu_config = {
      translationSource: menuSource(dish),
      translations: { en: { name: "Juice" } },
    };
    expect(
      publishedMenuLanguages({ auto_translate: true, languages: ["pt", "en"] }, [dish]),
    ).toEqual(["pt"]);
  });
  it("never allows disabling the original Portuguese language", () => {
    expect(
      MenuAssistantSettings.safeParse({ enabled: true, autoTranslate: true, languages: ["en"] })
        .success,
    ).toBe(false);
  });
});

it("validates accompaniment choice bounds and keeps existing menu data", async () => {
  const { AccompanimentsSchema, readMenuConfig } = await import("./menu-intelligence");
  expect(
    AccompanimentsSchema.safeParse({
      enabled: true,
      min: 2,
      max: 1,
      choices: [{ code: "R", included: true }],
    }).success,
  ).toBe(false);
  expect(
    AccompanimentsSchema.safeParse({
      enabled: true,
      min: 0,
      max: 2,
      choices: [
        { code: "R", included: true },
        { code: "R", included: false },
      ],
    }).success,
  ).toBe(false);
  expect(
    readMenuConfig({
      featured: true,
      accompaniments: { enabled: true, min: 1, max: 1, choices: [{ code: "R", included: true }] },
    }).featured,
  ).toBe(true);
  expect(readMenuConfig({ featured: true }).accompaniments).toBeUndefined();
});
