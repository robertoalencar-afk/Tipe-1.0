import { z } from "zod";
import type { MenuLanguage } from "./menu-intelligence";
import type { MenuPost } from "./menu-posts";
import type { MenuPromo } from "./menu-promos";

/**
 * Traduções do que não é prato: categorias, banners e promoções. Cada tradução guarda
 * `src`, o texto em português de quando foi feita. Se o dono muda o texto, a tradução
 * antiga deixa de valer (o cliente vê o português) até a Lebre traduzir de novo.
 */
export type ForeignLanguage = "en" | "es";
export const FOREIGN: ForeignLanguage[] = ["en", "es"];

export const CategoryI18n = z
  .object({
    src: z.string().max(200),
    en: z.string().trim().min(1).max(60).optional(),
    es: z.string().trim().min(1).max(60).optional(),
  })
  .partial({ src: true });
export type CategoryI18n = z.infer<typeof CategoryI18n>;

const PostText = z.object({
  title: z.string().trim().min(2).max(70),
  caption: z.string().trim().max(180),
});
export const PostI18n = z.object({
  src: z.string().max(400),
  en: PostText.optional(),
  es: PostText.optional(),
});
const PromoText = z.object({
  name: z.string().trim().min(2).max(60),
  rule: z.string().trim().min(5).max(200),
});
export const PromoI18n = z.object({
  src: z.string().max(400),
  en: PromoText.optional(),
  es: PromoText.optional(),
});

export const categorySource = (c: { name: string }) => c.name;
export const postSource = (p: Pick<MenuPost, "title" | "caption">) =>
  JSON.stringify([p.title, p.caption]);
export const promoSource = (p: Pick<MenuPromo, "name" | "rule">) =>
  JSON.stringify([p.name, p.rule]);

export function readCategoryI18n(value: unknown): CategoryI18n {
  const parsed = CategoryI18n.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function localizedCategory<T extends { name: string; i18n?: CategoryI18n }>(
  c: T,
  lang: MenuLanguage,
): T {
  if (lang === "pt" || !c.i18n || c.i18n.src !== categorySource(c)) return c;
  return { ...c, name: c.i18n[lang] || c.name };
}

export function localizedPost<T extends MenuPost>(p: T, lang: MenuLanguage): T {
  const t = lang === "pt" || p.i18n?.src !== postSource(p) ? undefined : p.i18n?.[lang];
  return t ? { ...p, ...t } : p;
}

/** Em inglês ou espanhol a promoção só aparece traduzida (nunca regra em outra língua). */
export function localizedPromo<T extends Pick<MenuPromo, "name" | "rule" | "i18n">>(
  p: T,
  lang: MenuLanguage,
): T | null {
  if (lang === "pt") return p;
  const t = p.i18n?.src === promoSource(p) ? p.i18n?.[lang] : undefined;
  return t ? { ...p, ...t } : null;
}

export const TAG_LABELS: Record<MenuLanguage, Record<"promo" | "novo" | "evento", string>> = {
  pt: { promo: "Promoção", novo: "Novo no cardápio", evento: "Evento" },
  en: { promo: "Special offer", novo: "New on the menu", evento: "Event" },
  es: { promo: "Promoción", novo: "Nuevo en el menú", evento: "Evento" },
};

export const PROMO_KIND_LABELS: Record<
  MenuLanguage,
  Record<"desconto" | "combo" | "cortesia" | "dobro" | "happy", string>
> = {
  pt: {
    desconto: "Desconto",
    combo: "Combo",
    cortesia: "Cortesia",
    dobro: "Em dobro",
    happy: "Happy hour",
  },
  en: {
    desconto: "Discount",
    combo: "Combo",
    cortesia: "On the house",
    dobro: "Double",
    happy: "Happy hour",
  },
  es: {
    desconto: "Descuento",
    combo: "Combo",
    cortesia: "Cortesía",
    dobro: "Doble",
    happy: "Happy hour",
  },
};

export const PROMO_TODAY: Record<MenuLanguage, string> = {
  pt: "Promoções de hoje",
  en: "Today's offers",
  es: "Promociones de hoy",
};

export const SEE_DISH: Record<MenuLanguage, string> = { pt: "Ver", en: "See", es: "Ver" };

const DAY_NAMES: Record<MenuLanguage, string[]> = {
  pt: ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"],
};

/** "Every Tuesday", "Todos los martes", "Monday to Friday"... Vazio quando vale todo dia. */
export function daysLabel(days: number[] | undefined, lang: Exclude<MenuLanguage, "pt">) {
  const d = [...new Set(days ?? [])].sort();
  if (!d.length || d.length === 7) return "";
  if (d.join() === "1,2,3,4,5") return lang === "en" ? "Monday to Friday" : "De lunes a viernes";
  if (d.join() === "0,6") return lang === "en" ? "Weekends" : "Fines de semana";
  const names = d.map((n) => DAY_NAMES[lang][n]!);
  const and = lang === "en" ? "and" : "y";
  const list =
    names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}`;
  if (lang === "en") return `Every ${list}`;
  return names.length === 1 ? `Todos los ${list}` : `Los ${list}`;
}

/** "from 6 pm to 8 pm", "desde las 18h"... */
export function hoursLabel(p: Pick<MenuPromo, "start" | "end">, lang: Exclude<MenuLanguage, "pt">) {
  const h = (s: string) => s.replace(":00", "h");
  if (lang === "en") {
    if (p.start && p.end) return `${h(p.start)} to ${h(p.end)}`;
    if (p.start) return `from ${h(p.start)}`;
    if (p.end) return `until ${h(p.end)}`;
    return "";
  }
  if (p.start && p.end) return `de ${h(p.start)} a ${h(p.end)}`;
  if (p.start) return `desde las ${h(p.start)}`;
  if (p.end) return `hasta las ${h(p.end)}`;
  return "";
}
