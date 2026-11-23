import { z } from "zod";
import { PromoI18n } from "./menu-i18n";

/**
 * Promoções do cardápio. Regras que o estudo de mercado e o CDC pedem: condição
 * clara (dias, horário, limite, validade) visível para o cliente, sem letras miúdas.
 * Nesta versão a promoção é divulgada no cardápio; o desconto ou a cortesia é
 * aplicado pela equipe, não pelo pagamento.
 */
export const PROMO_KINDS = {
  desconto: "Desconto",
  combo: "Combo",
  cortesia: "Cortesia",
  dobro: "Em dobro",
  happy: "Happy hour",
} as const;
const Hour = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);
export const MenuPromo = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  kind: z.enum(["desconto", "combo", "cortesia", "dobro", "happy"]),
  itemCodes: z.array(z.string().max(16)).min(1).max(6),
  /** 0 = domingo. Vazio: todos os dias. */
  days: z.array(z.number().int().min(0).max(6)).max(7),
  start: Hour,
  end: Hour,
  /** Condição completa, como o cliente lê (ex.: "Válido para 2 pessoas, no salão, não cumulativo"). */
  rule: z.string().trim().min(5).max(200),
  /** Último dia (AAAA-MM-DD) ou vazio para sem data de fim. */
  until: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  enabled: z.boolean(),
  /** Sugerida pela Lebre: motivo para o dono (não aparece para o cliente). */
  why: z.string().trim().max(240).optional(),
  /** Tradução para o cliente estrangeiro (feita pela Lebre). */
  i18n: PromoI18n.optional().catch(undefined),
});
export const MenuPromos = z.array(MenuPromo).max(20);
export type MenuPromo = z.infer<typeof MenuPromo>;

export function readMenuPromos(value: unknown): MenuPromo[] {
  const parsed = MenuPromos.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** Data local AAAA-MM-DD (o cliente está no salão; vale o relógio do aparelho). */
export function localDay(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Vale neste dia? (ativa, dia da semana e validade). O horário é informado, não filtrado. */
export function promoActiveOn(p: MenuPromo, date: Date) {
  return (
    p.enabled &&
    (!p.days.length || p.days.includes(date.getDay())) &&
    (!p.until || localDay(date) <= p.until)
  );
}

export function promoHoursLabel(p: Pick<MenuPromo, "start" | "end">) {
  if (p.start && p.end) return `das ${p.start.replace(":00", "h")} às ${p.end.replace(":00", "h")}`;
  if (p.start) return `a partir das ${p.start.replace(":00", "h")}`;
  if (p.end) return `até as ${p.end.replace(":00", "h")}`;
  return "";
}

/** Dias da semana com pouco movimento, segundo o estudo (segunda e terça; quarta é o pico). */
export const WEAK_DAYS = [1, 2];

/** Dias da semana sem nenhuma promoção ativa. */
export function daysWithoutPromo(promos: Pick<MenuPromo, "enabled" | "days">[]) {
  return [0, 1, 2, 3, 4, 5, 6].filter(
    (d) => !promos.some((p) => p.enabled && (!p.days.length || p.days.includes(d))),
  );
}
