/** Perfis da equipe interna da Central: o que cada um abre. O fundador abre tudo (não é perfil). */

export const PERFIS = ["comercial", "dev", "atendimento"] as const;
export type PerfilInterno = (typeof PERFIS)[number];
export type SecaoPermitida = "inicio" | "comercial" | "comunicacao" | "restaurantes" | "operacoes" | "perfil";

export const PERFIL_INFO: Record<PerfilInterno, { rotulo: string; descricao: string; secoes: readonly SecaoPermitida[]; caixas: readonly string[] }> = {
  comercial: { rotulo: "Comercial", descricao: "Funil, leads, WhatsApp e e-mail de contato, clientes.", secoes: ["inicio", "comercial", "comunicacao", "restaurantes", "perfil"], caixas: ["contato@tipe.digital"] },
  atendimento: { rotulo: "Atendimento", descricao: "WhatsApp e e-mail de contato, consulta de clientes.", secoes: ["inicio", "comunicacao", "restaurantes", "perfil"], caixas: ["contato@tipe.digital"] },
  dev: { rotulo: "Desenvolvimento", descricao: "Operações e produto (PRs, publicações, infraestrutura).", secoes: ["inicio", "operacoes", "perfil"], caixas: [] },
};

export const ehPerfil = (v: unknown): v is PerfilInterno => typeof v === "string" && (PERFIS as readonly string[]).includes(v);
export const secoesDoPerfil = (p: PerfilInterno): readonly SecaoPermitida[] => PERFIL_INFO[p].secoes;
export const podeSecao = (p: PerfilInterno, s: string) => (PERFIL_INFO[p].secoes as readonly string[]).includes(s);
export const caixasDoPerfil = (p: PerfilInterno) => PERFIL_INFO[p].caixas;
