// Central Jurídica: o texto vive em src/content/legal/*.md (um arquivo por livro, com metadados).
// Índice, capa, busca, glossário e histórico são gerados a partir desses arquivos.
import anexos from "@/content/legal/anexos.json";

const RAW = import.meta.glob("/src/content/legal/livro-*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const INTRO_RAW = (import.meta.glob("/src/content/legal/apresentacao.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>)["/src/content/legal/apresentacao.md"] ?? "";

export type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

export type Chapter = { id: string; number: string; title: string; heading: string; blocks: Block[] };
export type Audience = "cliente" | "restaurante" | "ambos";
export type Book = {
  number: number; slug: string; title: string; fullTitle: string; description: string; version: string;
  effective: string; audience: Audience; icon: string; readingMinutes: number; summary: string; chapters: Chapter[];
};

function parseBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!.trim();
    if (!l) { i++; continue; }
    if (l.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("- ")) items.push(lines[i++]!.trim().slice(2));
      out.push({ type: "ul", items });
    } else if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(lines[i++]!.trim().replace(/^\||\|$/g, "").split(" | ").map((c) => c.trim()));
      out.push({ type: "table", head: rows[0] ?? [], rows: rows.slice(1) });
    } else { out.push({ type: "p", text: l }); i++; }
  }
  return out;
}

function parseChapters(body: string): { lead: Block[]; chapters: Chapter[] } {
  const parts = body.split(/^## /m);
  const lead = parseBlocks((parts.shift() ?? "").split("\n"));
  const chapters = parts.map((p) => {
    const [head = "", ...rest] = p.split("\n");
    const m = head.match(/^(.*?)\s*\{#([a-z0-9-]+)\}\s*$/);
    const heading = (m?.[1] ?? head).trim();
    const num = heading.match(/^(\d+\.\d+)\s+(.*)$/);
    return { id: m?.[2] ?? heading, heading, number: num?.[1] ?? "", title: num?.[2] ?? heading, blocks: parseBlocks(rest) };
  });
  return { lead, chapters };
}

function parseBook(raw: string): Book {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {} as Record<"number" | "slug" | "title" | "fullTitle" | "description" | "version" | "effective" | "audience" | "icon" | "readingMinutes" | "summary", string>;
  for (const line of (m?.[1] ?? "").split("\n")) {
    const k = line.indexOf(": ");
    if (k > 0) (meta as Record<string, string>)[line.slice(0, k)] = line.slice(k + 2).replace(/^"|"$/g, "");
  }
  return {
    number: Number(meta.number), slug: meta.slug!, title: meta.title!, fullTitle: meta.fullTitle!, description: meta.description!,
    version: meta.version!, effective: meta.effective!, audience: meta.audience as Audience, icon: meta.icon!,
    readingMinutes: Number(meta.readingMinutes), summary: meta.summary!, chapters: parseChapters(m?.[2] ?? "").chapters,
  };
}

export const BOOKS: Book[] = Object.values(RAW).map(parseBook).sort((a, b) => a.number - b.number);
export const INTRO = parseChapters(INTRO_RAW);
export const getBook = (slug: string) => BOOKS.find((b) => b.slug === slug);

export type GlossaryTerm = { term: string; definition: string; id: string };
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const GLOSSARY: GlossaryTerm[] = (anexos.glossary as string[][])
  .map(([term = "", definition = ""]) => ({ term, definition, id: slugify(term) }))
  .sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
export const VERSIONS = (anexos.versions as string[][]).map(([doc = "", version = "", effective = "", changes = ""]) => ({ doc, version, effective, changes }));

export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Atalhos da capa: pergunta → livro e capítulo. */
export const QUICK_QUESTIONS: { q: string; book: string; chapter: string }[] = [
  { q: "Para onde vai o meu pagamento?", book: "termos-de-uso", chapter: "1.6" },
  { q: "Como funciona a gorjeta?", book: "termos-de-uso", chapter: "1.7" },
  { q: "Paguei errado, e agora?", book: "termos-de-uso", chapter: "1.8" },
  { q: "Quais dados a TIPE guarda sobre mim?", book: "privacidade", chapter: "3.4" },
  { q: "Como apagar meus dados?", book: "seus-direitos", chapter: "6.2" },
  { q: "Como mudar minhas preferências de cookies?", book: "cookies", chapter: "4.4" },
  { q: "A TIPE fica com o dinheiro do restaurante?", book: "parceiros", chapter: "2.7" },
];
export const chapterAnchor = (book: string, number: string) => getBook(book)?.chapters.find((c) => c.number === number)?.id ?? "";

/** Arquivos arquivados (somente leitura). */
export const ARCHIVED = [
  { id: "termos-2-0", doc: "Termos de Uso", version: "2.0", effective: "05/10/2026", book: "termos-de-uso" },
  { id: "privacidade-1-1", doc: "Política de Privacidade", version: "1.1", effective: "07/10/2026", book: "privacidade" },
  { id: "cookies-1-0", doc: "Política de Cookies", version: "1.0", effective: "05/10/2026", book: "cookies" },
  { id: "parceiros-1-0", doc: "Termos para Parceiros", version: "1.0", effective: "05/10/2026", book: "parceiros" },
] as const;

export function blockText(b: Block): string {
  if (b.type === "p") return b.text;
  if (b.type === "ul") return b.items.join(" ");
  return [b.head, ...b.rows].map((r) => r.join(" ")).join(" ");
}
