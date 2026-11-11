/**
 * Catálogo de permissões do restaurante e matriz padrão por papel.
 * Fonte única para o painel e o servidor. O banco guarda a mesma matriz em role_permissions
 * (migração 0051); o teste de banco confere que as duas batem.
 * Administrador = tudo. Concessões extras só somam, nunca tiram.
 */
export type PapelRestaurante = "owner" | "manager" | "cashier" | "waiter";

export const PAPEL_LABEL: Record<PapelRestaurante, string> = {
  owner: "Administrador",
  manager: "Gerente",
  cashier: "Caixa",
  waiter: "Garçom",
};
export const PAPEL_DESCRICAO: Record<PapelRestaurante, string> = {
  owner: "Controle total: equipe, financeiro, cardápio, assinatura e configurações.",
  manager: "Opera o salão, o caixa e a cozinha e vê relatórios. Não gerencia equipe nem assinatura.",
  cashier: "Abre e fecha caixa, confirma pagamentos e lança pedidos.",
  waiter: "Vê as próprias mesas e lança pedidos.",
};

export const PERMISSOES = [
  { k: "dashboard.ver", l: "Ver o painel inicial", g: "Visão" },
  { k: "salao.ver", l: "Ver o salão", g: "Salão" },
  { k: "salao.operar", l: "Abrir e encerrar mesas", g: "Salão" },
  { k: "pedidos.ver", l: "Ver pedidos", g: "Pedidos" },
  { k: "pedidos.lancar", l: "Lançar pedidos", g: "Pedidos" },
  { k: "pedidos.cancelar", l: "Cancelar itens e pedidos", g: "Pedidos" },
  { k: "caixa.ver", l: "Ver o caixa", g: "Caixa" },
  { k: "caixa.operar", l: "Abrir, confirmar e fechar caixa", g: "Caixa" },
  { k: "cozinha.ver", l: "Ver a cozinha", g: "Cozinha" },
  { k: "relatorios.ver", l: "Ver relatórios", g: "Relatórios" },
  { k: "cardapio.editar", l: "Editar cardápio", g: "Cadastros" },
  { k: "mesas.editar", l: "Editar mesas e QR", g: "Cadastros" },
  { k: "equipe.ver", l: "Ver a equipe", g: "Equipe" },
] as const;
export type Permissao = (typeof PERMISSOES)[number]["k"];

export const PADRAO: Record<Exclude<PapelRestaurante, "owner">, readonly Permissao[]> = {
  manager: ["dashboard.ver", "salao.ver", "salao.operar", "pedidos.ver", "pedidos.lancar", "pedidos.cancelar", "caixa.ver", "caixa.operar", "cozinha.ver", "relatorios.ver", "equipe.ver"],
  cashier: ["dashboard.ver", "salao.ver", "salao.operar", "pedidos.ver", "pedidos.lancar", "caixa.ver", "caixa.operar"],
  waiter: ["salao.ver", "pedidos.ver", "pedidos.lancar"],
};

/** Permissões extras que o administrador pode conceder (nunca equipe, assinatura ou financeiro do dono). */
export const CONCEDIVEIS: readonly Permissao[] = PERMISSOES.map((p) => p.k).filter((k) => k !== "equipe.ver");

export function pode(papeis: readonly PapelRestaurante[], extras: readonly string[], perm: Permissao): boolean {
  if (papeis.includes("owner")) return true;
  if (extras.includes(perm)) return true;
  return papeis.some((p) => p !== "owner" && PADRAO[p].includes(perm));
}
