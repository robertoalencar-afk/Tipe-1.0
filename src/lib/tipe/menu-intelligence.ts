import { z } from "zod";

export const dietLabels = { vegetarian: "Vegetariano", vegan: "Vegano", gluten_free: "Sem glúten", lactose_free: "Sem lactose" } as const;
export type MenuLanguage = "pt" | "en" | "es";
const Translation = z.object({ name: z.string().trim().max(80).default(""), description: z.string().trim().max(200).default("") });
const Codes = z.array(z.string().trim().min(1).max(16)).max(8).default([]);
export const MenuConfigSchema = z.object({
  featured: z.boolean().default(false),
  diets: z.array(z.enum(["vegetarian", "vegan", "gluten_free", "lactose_free"])).max(4).default([]),
  recommendations: Codes, addons: Codes, variants: Codes,
  translations: z.object({ en: Translation.optional(), es: Translation.optional() }).default({}),
});
export type MenuConfig = z.infer<typeof MenuConfigSchema>;
export function readMenuConfig(value: unknown): MenuConfig {
  const result = MenuConfigSchema.safeParse(value);
  return result.success ? result.data : MenuConfigSchema.parse({});
}
export const normalizedSearch = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function translatedItem<T extends { name: string; description: string | null; config?: MenuConfig }>(item: T, language: MenuLanguage): T {
  const t = language === "pt" ? undefined : item.config?.translations[language];
  return { ...item, name: t?.name || item.name, description: t?.description || item.description };
}
/** Preserve restaurant order; never invent a dietary claim or a price. */
export function filterMenu<T extends { name: string; description: string | null; categoryId: string | null; config?: MenuConfig }>(items: T[], query: string, category: string, diet: string, categoryName: (id: string | null) => string) {
  const q = normalizedSearch(query);
  return items.filter((i) => (!category || i.categoryId === category)
    && (!diet || i.config?.diets.includes(diet as MenuConfig["diets"][number]))
    && (!q || normalizedSearch(`${i.name} ${i.description ?? ""} ${categoryName(i.categoryId)}`).includes(q)));
}
export function relatedItems<T extends { code: string }>(codes: string[], items: T[], ownCode: string): T[] {
  const byCode = new Map(items.map((i) => [i.code, i]));
  return [...new Set(codes)].filter((c) => c !== ownCode && byCode.has(c)).map((c) => byCode.get(c)!);
}
export function safeMenuLink(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && !url.username && !url.password && ["instagram.com", "google.com", "google.com.br", "maps.google.com", "maps.app.goo.gl", "g.page", "tripadvisor.com", "tripadvisor.com.br"].includes(host);
  } catch { return false; }
}
export const MenuLinksSchema = z.object({
  instagram: z.string().max(500).refine(safeMenuLink).default(""),
  reviews: z.string().max(500).refine(safeMenuLink).default(""),
});
