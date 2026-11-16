import { z } from "zod";
export const ImportedDish = z.object({
  category: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200).default(""),
  price: z.number().finite().min(0).max(10000).nullable(),
  photoBounds: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0.02).max(1),
      height: z.number().min(0.02).max(1),
    })
    .refine((b) => b.x + b.width <= 1.01 && b.y + b.height <= 1.01)
    .nullable()
    .default(null),
  imageIndex: z.number().int().min(0).max(59).nullable().default(null),
  /** Descrição redigida pela Lebre sem base no documento: exige conferência do dono. */
  suggested: z.boolean().optional(),
});
export type ImportedDish = z.infer<typeof ImportedDish>;
export const ImportAnalysis = z.object({
  items: z.array(ImportedDish).max(200),
  warnings: z.array(z.string().max(250)).max(12).default([]),
});
export type ImportAnalysis = z.infer<typeof ImportAnalysis>;

/** "R$ 1.234,50", "29,90", "29.9" → número; o resto vira pendência (null), nunca zero. */
export function parseMenuPrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/r\$|\s/gi, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Primeiro objeto JSON da resposta, mesmo com texto ou cercas de código em volta. */
function extractJson(text: string): unknown {
  const clean = text.replace(/```(?:json)?/gi, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Resposta sem JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

/**
 * Lê a resposta do modelo item a item: um prato malformado vira aviso e não
 * derruba a página inteira. Preço fora da faixa fica pendente (null) para revisão.
 */
export function parseImportAnalysis(text: string): ImportAnalysis {
  const raw = extractJson(text) as { items?: unknown; warnings?: unknown };
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items))
    throw new Error("Resposta sem lista de itens");
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((w): w is string => typeof w === "string").map((w) => w.slice(0, 250))
    : [];
  const items: ImportedDish[] = [];
  let dropped = 0;
  for (const entry of raw.items.slice(0, 200)) {
    if (!entry || typeof entry !== "object") {
      dropped++;
      continue;
    }
    const e = entry as Record<string, unknown>;
    let price = parseMenuPrice(e["price"]);
    if (price !== null && (price < 0 || price > 10000)) price = null;
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const base = {
      category: str(e["category"], 60).length >= 2 ? str(e["category"], 60) : "Para organizar",
      name: str(e["name"], 80),
      description: str(e["description"], 200),
      price,
      imageIndex: null,
    };
    // Recorte de foto inválido não invalida o prato: só descarta o recorte.
    const parsed =
      ImportedDish.safeParse({ ...base, photoBounds: e["photoBounds"] ?? null }).data ??
      ImportedDish.safeParse({ ...base, photoBounds: null }).data;
    if (parsed) items.push(parsed);
    else dropped++;
  }
  if (dropped)
    warnings.push(`${dropped} linha(s) ilegível(is) foram ignoradas. Confira o original.`);
  return { items, warnings: warnings.slice(0, 12) };
}

const SMALL = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "com",
  "sem",
  "à",
  "a",
  "ao",
  "em",
  "na",
  "no",
]);
/** "PRATOS PRINCIPAIS" / "pratos principais " → "Pratos principais". */
export function tidyCategory(value: string) {
  const v = value
    .replace(/\s+/g, " ")
    .replace(/[:•\-–—\s]+$/, "")
    .trim();
  if (!v) return "Para organizar";
  const lower = v === v.toUpperCase() || v === v.toLowerCase() ? v.toLowerCase() : v;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
/** Nome em caixa alta vira frase legível; siglas curtas (até 3 letras) ficam. */
export function tidyName(value: string) {
  const v = value.replace(/\s+/g, " ").trim();
  if (v !== v.toUpperCase() || !/[A-ZÀ-Ú]{4}/.test(v)) return v;
  return v
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Junta o resultado de várias partes: padroniza categorias e nomes e remove
 * repetições (mesmo nome e preço, comum quando o PDF repete a página ou o texto
 * aparece também na imagem). Mantém a versão mais completa de cada prato.
 */
export function normalizeImportedDishes(dishes: ImportedDish[]) {
  const categories = new Map<string, string>();
  const out: ImportedDish[] = [];
  const index = new Map<string, number>();
  let duplicates = 0;
  for (const dish of dishes) {
    const cat = tidyCategory(dish.category);
    const ck = key(cat);
    if (!categories.has(ck)) categories.set(ck, cat);
    const item = { ...dish, category: categories.get(ck)!, name: tidyName(dish.name) };
    const k = `${key(item.name)}|${item.price ?? "?"}`;
    const prev = index.get(k);
    if (prev === undefined) {
      index.set(k, out.length);
      out.push(item);
      continue;
    }
    duplicates++;
    const old = out[prev]!;
    out[prev] = {
      ...old,
      description:
        old.description.length >= item.description.length ? old.description : item.description,
      category: old.category === "Para organizar" ? item.category : old.category,
      photoBounds: old.photoBounds ?? item.photoBounds,
      imageIndex: old.imageIndex ?? item.imageIndex,
    };
  }
  return { dishes: out, duplicates };
}

/** Divide textos longos em partes que a IA gratuita lê inteiras (corta em quebra de linha). */
export function splitMenuText(text: string, max = 6000): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    for (let i = 0; i < line.length || i === 0; i += max) {
      const piece = line.slice(i, i + max);
      if (current.length + piece.length + 1 > max && current) {
        parts.push(current);
        current = "";
      }
      current += (current ? "\n" : "") + piece;
      if (!line.length) break;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export type ImportPhoto = {
  name: string;
  url: string;
  width?: number;
  height?: number;
  pageIndex?: number;
  bounds?: import("./menu-photo-source").PhotoBounds;
};
export type ImportPage = { text: string; image?: string };
export type ImportSource = { pages: ImportPage[]; photos: ImportPhoto[]; warnings: string[] };
export const MAX_IMPORT_BYTES = 8_000_000;
