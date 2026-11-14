import { z } from "zod";

export const dietLabels = {
  vegetarian: "Vegetariano",
  vegan: "Vegano",
  gluten_free: "Sem glúten",
  lactose_free: "Sem lactose",
} as const;
export type MenuLanguage = "pt" | "en" | "es";
const Translation = z.object({
  name: z.string().trim().max(80).default(""),
  description: z.string().trim().max(200).default(""),
});
const Codes = z.array(z.string().trim().min(1).max(16)).max(8).default([]);
export const AccompanimentsSchema = z
  .object({
    enabled: z.boolean().default(false),
    min: z.number().int().min(0).max(4).default(0),
    max: z.number().int().min(1).max(4).default(1),
    choices: z
      .array(z.object({ code: z.string().min(1).max(16), included: z.boolean() }))
      .max(8)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (
      v.enabled &&
      (v.min > v.max ||
        v.choices.length < v.max ||
        new Set(v.choices.map((c) => c.code)).size !== v.choices.length)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione opções suficientes e confira os limites de escolha.",
      });
  });
export type Accompaniments = z.infer<typeof AccompanimentsSchema>;
export const MenuConfigSchema = z.object({
  accompaniments: AccompanimentsSchema.optional(),
  translationSource: z.string().max(1000).optional(),
  featured: z.boolean().default(false),
  diets: z
    .array(z.enum(["vegetarian", "vegan", "gluten_free", "lactose_free"]))
    .max(4)
    .default([]),
  recommendations: Codes,
  addons: Codes,
  variants: Codes,
  translations: z.object({ en: Translation.optional(), es: Translation.optional() }).default({}),
});
export type MenuConfig = z.infer<typeof MenuConfigSchema>;
export function readMenuConfig(value: unknown): MenuConfig {
  const result = MenuConfigSchema.safeParse(value);
  return result.success ? result.data : MenuConfigSchema.parse({});
}
export const normalizedSearch = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function translatedItem<
  T extends { name: string; description: string | null; config?: MenuConfig },
>(item: T, language: MenuLanguage): T {
  const t = language === "pt" ? undefined : item.config?.translations[language];
  return { ...item, name: t?.name || item.name, description: t?.description || item.description };
}
/** Preserve restaurant order; never invent a dietary claim or a price. */
export function filterMenu<
  T extends {
    name: string;
    description: string | null;
    categoryId: string | null;
    config?: MenuConfig;
  },
>(
  items: T[],
  query: string,
  category: string,
  diet: string,
  categoryName: (id: string | null) => string,
) {
  const q = normalizedSearch(query);
  return items.filter(
    (i) =>
      (!category || i.categoryId === category) &&
      (!diet || i.config?.diets.includes(diet as MenuConfig["diets"][number])) &&
      (!q ||
        normalizedSearch(`${i.name} ${i.description ?? ""} ${categoryName(i.categoryId)}`).includes(
          q,
        )),
  );
}
export function relatedItems<T extends { code: string }>(
  codes: string[],
  items: T[],
  ownCode: string,
): T[] {
  const byCode = new Map(items.map((i) => [i.code, i]));
  return [...new Set(codes)]
    .filter((c) => c !== ownCode && byCode.has(c))
    .map((c) => byCode.get(c)!);
}
export function safeMenuLink(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      [
        "instagram.com",
        "google.com",
        "google.com.br",
        "maps.google.com",
        "maps.app.goo.gl",
        "g.page",
        "tripadvisor.com",
        "tripadvisor.com.br",
      ].includes(host)
    );
  } catch {
    return false;
  }
}
export const MenuLinksSchema = z.object({
  instagram: z.string().max(500).refine(safeMenuLink).default(""),
  reviews: z.string().max(500).refine(safeMenuLink).default(""),
});

export const menuLanguages = [
  { id: "pt", flag: "🇧🇷", name: "Português" },
  { id: "en", flag: "🇺🇸", name: "English" },
  { id: "es", flag: "🇪🇸", name: "Español" },
] as const;
export const MenuAssistantSettings = z.object({
  enabled: z.boolean(),
  autoTranslate: z.boolean(),
  languages: z
    .array(z.enum(["pt", "en", "es"]))
    .min(1)
    .max(3)
    .refine((v) => v.includes("pt")),
});
export const menuSource = (item: { name: string; description: string | null }) =>
  JSON.stringify([item.name, item.description ?? ""]);
export const MenuSuggestion = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  kind: z.enum(["featured", "pair"]),
  otherId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(240),
  source: z.string().max(1000),
});
export type MenuSuggestionValue = z.infer<typeof MenuSuggestion>;
export function publishedMenuLanguages(
  settings: { auto_translate?: boolean; languages?: string[] } | null,
  items: { name: string; description: string | null; menu_config: unknown }[],
): MenuLanguage[] {
  if (!settings?.auto_translate || !items.length) return ["pt"];
  return [
    "pt",
    ...(["en", "es"] as const).filter(
      (lang) =>
        settings.languages?.includes(lang) &&
        items.every((item) => {
          const config = readMenuConfig(item.menu_config);
          return (
            config.translationSource === menuSource(item) &&
            !!config.translations[lang]?.name &&
            (!item.description || !!config.translations[lang]?.description)
          );
        }),
    ),
  ];
}
