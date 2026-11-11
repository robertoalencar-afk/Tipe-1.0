export type PapelSalao = "owner" | "manager" | "cashier" | "waiter";
export const PAPEIS_SALAO: PapelSalao[] = [
  "owner",
  "manager",
  "cashier",
  "waiter",
];
export const OPERACIONAIS = new Set([
  "open_table",
  "launch_order",
  "close_table",
]);
export function papeisDaAcao(action: string): PapelSalao[] {
  return action === "close_table"
    ? ["owner", "manager", "cashier"]
    : OPERACIONAIS.has(action)
      ? PAPEIS_SALAO
      : ["owner"];
}
export function podePropor(action: string, roles: string[]) {
  return papeisDaAcao(action).some((role) => roles.includes(role));
}
export type ItemCardapio = {
  code: string;
  name: string;
  price: number;
  available: boolean;
};
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function acharItem(
  nome: string,
  cardapio: ItemCardapio[],
): ItemCardapio | string {
  const original = normalizar(nome);
  const singular = original.replace(/s$/, "");
  const por = (f: (x: string) => boolean) =>
    cardapio.filter((i) => f(normalizar(i.name)));
  for (const lista of [
    por((x) => x === original),
    por((x) => x === singular || x === `${singular}s`),
    por((x) => x.startsWith(singular)),
    por((x) => x.includes(singular)),
  ]) {
    if (lista.length === 1) return lista[0]!;
    if (lista.length > 1)
      return `Tem mais de um "${nome}" no cardápio (${lista
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ")}). Qual deles?`;
  }
  return `Não achei "${nome}" no cardápio.`;
}
export function acharMesa<T extends { number: string }>(
  number: string,
  tables: T[],
): T | undefined {
  const matches = tables.filter(
    (t) => t.number.toLowerCase() === number.toLowerCase(),
  );
  if (matches.length > 1)
    throw new Error(
      "Há mesas com números ambíguos. Use o painel para corrigir o cadastro.",
    );
  return matches[0];
}
type Garcom = {
  id: string;
  user_id: string | null;
  name: string;
  active: boolean;
};
export function escolherGarcom(
  userId: string,
  roles: string[],
  tableWaiter: string | null,
  equipe: Garcom[],
): Garcom {
  const proprios = equipe.filter((w) => w.active && w.user_id === userId);
  if (proprios.length > 1)
    throw new Error(
      "Seu acesso está ligado a mais de um garçom. Peça ao administrador para corrigir.",
    );
  if (proprios[0]) return proprios[0];
  if (
    roles.includes("waiter") &&
    !roles.some((r) => ["owner", "manager", "cashier"].includes(r))
  )
    throw new Error(
      "Seu acesso não está ligado a um garçom ativo. Peça ao administrador para corrigir.",
    );
  const daMesa = equipe.find((w) => w.active && w.id === tableWaiter);
  if (!daMesa)
    throw new Error(
      "Vincule um garçom ativo à mesa no painel antes de lançar o pedido.",
    );
  return daMesa;
}
