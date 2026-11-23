import { z } from "zod";
import { PostI18n } from "./menu-i18n";
export const MENU_POST_TAGS = {
  promo: "Promoção",
  novo: "Novo no cardápio",
  evento: "Evento",
} as const;
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const MenuPost = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(70),
  caption: z.string().trim().max(180),
  itemCode: z.string().max(16),
  theme: z.enum(["photo", "paper"]),
  enabled: z.boolean(),
  /** Selo da arte: promoção, prato novo ou evento. */
  tag: z.enum(["promo", "novo", "evento"]).optional(),
  /** Dias da semana em que aparece (0 = domingo). Vazio ou ausente: todos os dias. */
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  /** Tradução para o cliente estrangeiro (feita pela Lebre). */
  i18n: PostI18n.optional().catch(undefined),
});
export const MenuPosts = z.array(MenuPost).max(8);
export type MenuPost = z.infer<typeof MenuPost>;
export function readMenuPosts(value: unknown): MenuPost[] {
  const parsed = MenuPosts.safeParse(value);
  return parsed.success ? parsed.data : [];
}
/** A publicação vale no dia da semana informado (0 = domingo)? */
export function postShowsOn(post: Pick<MenuPost, "days">, weekday: number): boolean {
  return !post.days?.length || post.days.includes(weekday);
}
/** "Toda terça", "Sábado e domingo", "Segunda a sexta"; vazio quando vale todo dia. */
export function postDaysLabel(days: number[] | undefined): string {
  const d = [...new Set(days ?? [])].sort();
  if (!d.length || d.length === 7) return "";
  if (d.join() === "1,2,3,4,5") return "Segunda a sexta";
  if (d.join() === "0,6") return "Sábado e domingo";
  const names = d.map((n) => WEEKDAY_NAMES[n]!);
  if (names.length === 1)
    return `Toda ${names[0]}`
      .replace("Toda sábado", "Todo sábado")
      .replace("Toda domingo", "Todo domingo");
  const text = `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
  return text[0]!.toUpperCase() + text.slice(1);
}
