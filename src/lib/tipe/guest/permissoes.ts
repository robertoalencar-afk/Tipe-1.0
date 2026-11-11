// Tipe Guest Manager · matriz de permissões (Projeto 4). Regra pura, igual no app, no servidor e
// no banco (ver drizzle/migrations/0056_guest_staff_permissions.sql, só para revisão).
// "Conforme autorização" e "permissão explícita" = desligado até o administrador conceder.

export const GUEST_ROLES = ["admin", "gerente", "caixa", "garcom"] as const;
export type GuestRole = (typeof GUEST_ROLES)[number];

export const GUEST_ACTIONS = [
  "ver_reservas",
  "criar_reserva",
  "confirmar_chegada",
  "atribuir_mesa",
  "gerenciar_espera",
  "alterar_disponibilidade",
  "configurar_politicas",
  "ver_relatorios",
  "gerenciar_experiencias",
  "ver_perfil_cliente",
] as const;
export type GuestAction = (typeof GUEST_ACTIONS)[number];

/** Nome da concessão na tabela da equipe (0051, formato modulo.acao). */
export const GUEST_PERMISSION: Record<GuestAction, string> = {
  ver_reservas: "reservas.ver",
  criar_reserva: "reservas.criar",
  confirmar_chegada: "reservas.chegada",
  atribuir_mesa: "reservas.mesa",
  gerenciar_espera: "reservas.espera",
  alterar_disponibilidade: "reservas.disponibilidade",
  configurar_politicas: "reservas.politicas",
  ver_relatorios: "reservas.relatorios",
  gerenciar_experiencias: "reservas.experiencias",
  ver_perfil_cliente: "reservas.perfil",
};

/** Concessões da equipe (reservas.*) → ações do Guest. */
export function guestGrantsFrom(permissions: readonly string[]): GuestAction[] {
  return GUEST_ACTIONS.filter((a) => permissions.includes(GUEST_PERMISSION[a]));
}

/** sim = sempre; concedivel = só com concessão explícita; nao = nunca (nem concedendo). */
type Rule = "sim" | "concedivel" | "nao";

export const GUEST_MATRIX: Record<GuestAction, Record<GuestRole, Rule>> = {
  ver_reservas: { admin: "sim", gerente: "sim", caixa: "concedivel", garcom: "sim" },
  criar_reserva: { admin: "sim", gerente: "sim", caixa: "concedivel", garcom: "concedivel" },
  confirmar_chegada: { admin: "sim", gerente: "sim", caixa: "concedivel", garcom: "concedivel" },
  atribuir_mesa: { admin: "sim", gerente: "sim", caixa: "concedivel", garcom: "concedivel" },
  gerenciar_espera: { admin: "sim", gerente: "sim", caixa: "concedivel", garcom: "nao" },
  alterar_disponibilidade: { admin: "sim", gerente: "concedivel", caixa: "nao", garcom: "nao" },
  configurar_politicas: { admin: "sim", gerente: "concedivel", caixa: "nao", garcom: "nao" },
  ver_relatorios: { admin: "sim", gerente: "sim", caixa: "sim", garcom: "nao" },
  gerenciar_experiencias: { admin: "sim", gerente: "concedivel", caixa: "nao", garcom: "nao" },
  ver_perfil_cliente: { admin: "sim", gerente: "sim", caixa: "sim", garcom: "sim" },
};

/** Quanto de dado o papel vê (reservas, perfil e relatórios). */
export type DataScope = "completo" | "operacional" | "necessario" | "minimo";
export const GUEST_DATA_SCOPE: Record<GuestRole, DataScope> = {
  admin: "completo",
  gerente: "operacional",
  caixa: "necessario",
  garcom: "minimo",
};

/** Papéis do Tipe Restaurant → papel no Guest. Gerente ainda não existe no app_role. */
export function guestRoleFrom(roles: readonly string[]): GuestRole | null {
  if (roles.includes("owner")) return "admin";
  if (roles.includes("manager") || roles.includes("gerente")) return "gerente";
  if (roles.includes("cashier")) return "caixa";
  if (roles.includes("waiter")) return "garcom";
  return null;
}

export function guestCan(
  role: GuestRole | null,
  action: GuestAction,
  grants: readonly string[] = [],
) {
  if (!role) return false;
  const r = GUEST_MATRIX[action][role];
  return r === "sim" || (r === "concedivel" && grants.includes(action));
}

export type GuestProfile = {
  name: string;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  visits?: number | undefined;
  notes?: string | null | undefined;
  allergies?: string | null | undefined;
  occasions?: string | null | undefined;
  spendCents?: number | null | undefined;
};

/**
 * Perfil do cliente visto pela equipe, sempre só daquele restaurante.
 * Garçom: nome, alergias e ocasião (o que precisa para servir). Contato só para quem liga.
 */
export function profileFor(role: GuestRole | null, p: GuestProfile): Partial<GuestProfile> {
  if (!role) return {};
  const base = { name: p.name, allergies: p.allergies, occasions: p.occasions };
  switch (GUEST_DATA_SCOPE[role]) {
    case "minimo":
      return { ...base, name: firstName(p.name) };
    case "necessario":
      return { ...base, phone: p.phone, visits: p.visits };
    case "operacional":
      return { ...base, phone: p.phone, email: p.email, visits: p.visits, notes: p.notes };
    case "completo":
      return { ...p };
  }
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";
