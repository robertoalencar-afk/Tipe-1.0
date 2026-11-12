import { describe, expect, it } from "vitest";
import { filterMenu, MenuConfigSchema, readMenuConfig, relatedItems, safeMenuLink, translatedItem } from "./menu-intelligence";

const item = (code: string, name: string, config = {}) => ({ code, name, categoryId: "food", description: "Feijão com queijo", price: 19.95, config: readMenuConfig(config) });
describe("cardápio inteligente", () => {
  it("finds accented names, ingredients and categories", () => {
    const items = [item("B", "Baião")];
    for (const query of ["baiao", " QUEIJO ", "refeicoes"]) expect(filterMenu(items, query, "", "", () => "Refeições")).toHaveLength(1);
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
    expect(relatedItems(["B", "X", "C", "C"], [item("B", "Baião"), item("C", "Caju")], "B").map((i) => i.code)).toEqual(["C"]);
  });
  it("translates display text without changing the product code or price", () => {
    const source = item("B", "Baião", { translations: { en: { name: "Rice and beans", description: "Rice, beans and cheese" } } });
    expect(translatedItem(source, "en")).toMatchObject({ code: "B", price: 19.95, name: "Rice and beans" });
    expect(source.name).toBe("Baião");
  });
  it("falls back field by field when translations are missing", () => {
    const source = item("B", "Baião", { translations: { en: { name: "Rice" } } });
    expect(translatedItem(source, "en").description).toBe(source.description);
    expect(translatedItem(source, "es").name).toBe(source.name);
  });
  it("tolerates an absent or malformed migration without hiding the menu", () => {
    for (const raw of [null, undefined, "bad", { diets: ["invented"] }]) expect(readMenuConfig(raw).diets).toEqual([]);
  });
  it("bounds recommendation groups and translations", () => {
    expect(MenuConfigSchema.safeParse({ addons: Array(9).fill("A") }).success).toBe(false);
    expect(MenuConfigSchema.safeParse({ translations: { en: { name: "X".repeat(81) } } }).success).toBe(false);
  });
  it.each(["https://instagram.com/restaurante", "https://www.tripadvisor.com.br/Restaurant_Review", "https://maps.app.goo.gl/example", ""])("allows a supported link: %s", (url) => expect(safeMenuLink(url)).toBe(true));
  it.each(["javascript:alert(1)", "http://instagram.com/a", "https://instagram.com.evil.test", "https://evil.test/?instagram.com", "https://user:pass@instagram.com/a"])("rejects unsafe or deceptive links: %s", (url) => expect(safeMenuLink(url)).toBe(false));
});
