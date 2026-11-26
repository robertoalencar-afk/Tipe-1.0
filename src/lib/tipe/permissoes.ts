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
  cashier: "Abre e fecha caixa, confirma pagamentos, lança e cancela pedidos.",
  waiter: "Atende as próprias mesas e lança pedidos. Nunca opera o caixa.",
};

/**
 * Catálogo de permissões do restaurante (mesma lista de restaurant_permission_catalog() no banco, migração 0096).
 * Só entra aqui o que o servidor aplica de verdade.
 */
export const PERMISSOES = [
  { k: "dashboard.ver", l: "Ver o painel inicial", g: "Visão" },
  { k: "salao.ver", l: "Ver o salão e as mesas", g: "Salão" },
  { k: "salao.operar", l: "Encerrar mesas e designar garçom", g: "Salão" },
  { k: "pedidos.ver", l: "Ver pedidos", g: "Pedidos" },
  { k: "pedidos.lancar", l: "Lançar pedidos", g: "Pedidos" },
  { k: "pedidos.cancelar", l: "Cancelar itens e vendas", g: "Pedidos" },
  { k: "caixa.ver", l: "Ver o caixa e o fechamento do dia", g: "Caixa" },
  { k: "caixa.operar", l: "Abrir, movimentar e fechar caixa; confirmar pagamentos", g: "Caixa" },
  { k: "cozinha.ver", l: "Ver a cozinha e o bar", g: "Cozinha" },
  { k: "relatorios.ver", l: "Ver relatórios e faturamento", g: "Relatórios" },
] as const;
export type Permissao = (typeof PERMISSOES)[number]["k"];
const TODAS = PERMISSOES.map((p) => p.k) as readonly Permissao[];

/** Padrão de cada papel (igual a role_permissions no banco). */
export const PADRAO: Record<Exclude<PapelRestaurante, "owner">, readonly Permissao[]> = {
  manager: ["dashboard.ver", "salao.ver", "salao.operar", "pedidos.ver", "pedidos.lancar", "pedidos.cancelar", "caixa.ver", "caixa.operar", "cozinha.ver", "relatorios.ver"],
  cashier: ["dashboard.ver", "salao.ver", "salao.operar", "pedidos.ver", "pedidos.lancar", "pedidos.cancelar", "caixa.ver", "caixa.operar"],
  waiter: ["salao.ver", "pedidos.ver", "pedidos.lancar"],
};

/**
 * Até onde o administrador pode ampliar cada papel (igual a permission_within_role_ceiling no banco).
 * Garçom nunca ganha caixa, relatórios ou painel: para isso, muda o papel para Caixa ou Gerente.
 */
export const TETO: Record<Exclude<PapelRestaurante, "owner">, readonly Permissao[]> = {
  manager: TODAS,
  cashier: TODAS,
  waiter: PADRAO.waiter,
};

/** Ajustes de uma pessoa: o que ganhou além do papel e o que perdeu do papel. */
export type Ajustes = { extras: readonly string[]; removidas: readonly string[] };
const SEM_AJUSTES: Ajustes = { extras: [], removidas: [] };

export function pode(papeis: readonly PapelRestaurante[], ajustes: Ajustes, perm: Permissao): boolean {
  if (papeis.includes("owner")) return true;
  if (ajustes.removidas.includes(perm)) return false;
  return papeis.some((p) => p !== "owner" && (PADRAO[p].includes(perm) || (TETO[p].includes(perm) && ajustes.extras.includes(perm))));
}

/** Lista efetiva de permissões de uma pessoa. */
export function efetivas(papeis: readonly PapelRestaurante[], ajustes: Ajustes = SEM_AJUSTES): Permissao[] {
  return TODAS.filter((p) => pode(papeis, ajustes, p));
}

/** Converte a escolha do administrador (lista marcada) em ajustes sobre o padrão do papel, respeitando o teto. */
export function ajustesPara(papel: Exclude<PapelRestaurante, "owner">, marcadas: readonly string[]): { extras: Permissao[]; removidas: Permissao[] } {
  const set = new Set(marcadas);
  return {
    extras: TETO[papel].filter((p) => set.has(p) && !PADRAO[papel].includes(p)),
    removidas: PADRAO[papel].filter((p) => !set.has(p)),
  };
}
