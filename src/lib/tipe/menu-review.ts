/**
 * Revisão da Lebre: confere item por item o cardápio já cadastrado, sem IA e na
 * hora (rápida e previsível). A IA entra só onde precisa de visão ou redação:
 * conferir se a foto mostra o prato e sugerir descrição, sempre com confirmação.
 */
import { tidyName } from "./menu-import";

export type ReviewItem = {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  sector: string;
  description: string | null;
  available: boolean;
  photo: string | null;
  depth: string | null;
  /** Largura e altura reais da foto, quando já medidas no navegador. */
  photoSize?: { w: number; h: number } | undefined;
  translated: boolean;
};
export type ReviewCategory = { id: string; name: string };
export type IssueKind =
  | "sem-foto"
  | "foto-pequena"
  | "sem-volume"
  | "sem-descricao"
  | "descricao-curta"
  | "nome-maiusculo"
  | "preco-zero"
  | "preco-fora"
  | "sem-categoria"
  | "categoria-errada"
  | "setor-errado"
  | "repetido"
  | "sem-traducao"
  | "foto-nao-condiz";
export type Issue = {
  itemId: string;
  kind: IssueKind;
  level: "corrigir" | "melhorar";
  text: string;
  /** Correção que pode ser aplicada com um toque (após confirmação). */
  fix?: { name: string } | { categoryName: string } | { sector: "bar" | "kitchen" } | undefined;
};
/** Foto de story cheia: o lado menor precisa de pelo menos 1080 px. */
export const MIN_PHOTO_SIDE = 1080;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DRINK =
  /\b(suco|agua|refrigerante|refri|cerveja|chope|chopp|vinho|espumante|drink|caipirinha|caipiroska|caipi|gin|vodka|whisky|cachaca|dose|cafe|espresso|capuccino|cappuccino|cha|limonada|soda|tonica|energetico|long neck|lata|taca|garrafa)\b/;
const DRINK_CATEGORY =
  /(bebida|suco|agua|refrigerante|cerveja|chope|vinho|drink|coquetel|cafe|cafes|bar|destilado|whisk|licor|aperitivo|caipirinha)/;
const DESSERT = /\b(pudim|sorvete|mousse|torta|cocada|brigadeiro|petit gateau|cartola|doce|bolo)\b/;
const DESSERT_CATEGORY = /(sobremesa|doce|confeitaria)/;
const GENERIC_CATEGORY = /^(para organizar|outros|diversos|geral|itens|produtos|sem categoria)$/;

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function reviewMenu(items: ReviewItem[], categories: ReviewCategory[]): Issue[] {
  const issues: Issue[] = [];
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const drinkCats = categories.filter((c) => DRINK_CATEGORY.test(norm(c.name)));
  const dessertCats = categories.filter((c) => DESSERT_CATEGORY.test(norm(c.name)));
  const byCat = new Map<string, number[]>();
  for (const i of items)
    if (i.categoryId && i.price > 0)
      byCat.set(i.categoryId, [...(byCat.get(i.categoryId) ?? []), i.price]);
  const names = new Map<string, number>();
  for (const i of items) names.set(norm(i.name).trim(), (names.get(norm(i.name).trim()) ?? 0) + 1);

  for (const i of items) {
    const add = (kind: IssueKind, level: Issue["level"], text: string, fix?: Issue["fix"]) =>
      issues.push({ itemId: i.id, kind, level, text, fix });
    const n = norm(i.name);
    const cat = i.categoryId ? catName.get(i.categoryId) : undefined;
    const isDrink = DRINK.test(n);

    if (!i.photo) add("sem-foto", "corrigir", "Sem foto: pratos com foto aparecem nos stories.");
    else if (i.photoSize && Math.min(i.photoSize.w, i.photoSize.h) < MIN_PHOTO_SIDE)
      add(
        "foto-pequena",
        "corrigir",
        `Foto com ${i.photoSize.w}×${i.photoSize.h} px: fica borrada em tela cheia. Use pelo menos ${MIN_PHOTO_SIDE} px no lado menor.`,
      );
    else if (!i.depth) add("sem-volume", "melhorar", "Foto sem volume 3D: reenvie para gerar.");

    const desc = (i.description ?? "").trim();
    if (!desc) add("sem-descricao", "corrigir", "Sem descrição: diga o que vem no prato.");
    else if (desc.length < 25)
      add("descricao-curta", "melhorar", "Descrição curta: inclua porção ou acompanhamento.");

    const tidy = tidyName(i.name);
    if (tidy !== i.name.trim())
      add("nome-maiusculo", "melhorar", `Nome todo em maiúsculas. Sugestão: "${tidy}".`, {
        name: tidy,
      });

    if (i.price <= 0) add("preco-zero", "corrigir", "Preço zerado: confira antes de vender.");
    else if (i.categoryId) {
      const prices = byCat.get(i.categoryId) ?? [];
      if (prices.length >= 4) {
        const m = median(prices);
        if (i.price > m * 6 || i.price < m / 6)
          add(
            "preco-fora",
            "melhorar",
            `Preço muito diferente dos outros de ${cat} (mediana ${m.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}). Confira se não falta ou sobra um dígito.`,
          );
      }
    }

    if (!cat || GENERIC_CATEGORY.test(norm(cat))) {
      const target = isDrink ? drinkCats[0] : DESSERT.test(n) ? dessertCats[0] : undefined;
      add(
        "sem-categoria",
        "corrigir",
        target ? `Sem categoria definida. Sugestão: ${target.name}.` : "Sem categoria definida.",
        target ? { categoryName: target.name } : undefined,
      );
    } else if (isDrink && !DRINK_CATEGORY.test(norm(cat)) && drinkCats.length)
      add("categoria-errada", "melhorar", `Parece bebida, mas está em ${cat}.`, {
        categoryName: drinkCats[0]!.name,
      });
    else if (DESSERT.test(n) && !DESSERT_CATEGORY.test(norm(cat)) && dessertCats.length)
      add("categoria-errada", "melhorar", `Parece sobremesa, mas está em ${cat}.`, {
        categoryName: dessertCats[0]!.name,
      });

    if (isDrink && i.sector !== "bar")
      add("setor-errado", "melhorar", "Bebida enviada para a cozinha: mude o preparo para Bar.", {
        sector: "bar",
      });

    if ((names.get(n.trim()) ?? 0) > 1)
      add("repetido", "corrigir", "Há outro item com o mesmo nome. Una ou diferencie.");
    if (i.available && !i.translated)
      add("sem-traducao", "melhorar", "Sem tradução para inglês e espanhol.");
  }
  return issues;
}

/** Nota de 0 a 100: itens sem pendência obrigatória pesam mais que melhorias. */
export function menuScore(items: ReviewItem[], issues: Issue[]) {
  if (!items.length) return 0;
  const lost = issues.reduce((s, i) => s + (i.level === "corrigir" ? 1 : 0.25), 0);
  return Math.max(0, Math.round(100 - (lost / (items.length * 3)) * 100));
}
