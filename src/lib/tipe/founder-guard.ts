// Founder só passa com 2FA (aal2) confirmado no token da sessão.
export async function isFounderWith2fa(ctx: { supabase: any; userId: string; claims?: any }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "founder" });
  return data === true && ctx.claims?.aal === "aal2";
}

export async function requireFounder2fa(ctx: { supabase: any; userId: string; claims?: any }, msg = "Somente a equipe TIPE, com verificação em duas etapas") {
  if (!(await isFounderWith2fa(ctx))) throw new Error(msg);
}

/**
 * Acesso à Central: founder (tudo) ou equipe interna ativa com perfil que abre a seção.
 * Ambos exigem 2FA confirmado (aal2). Devolve quem é, para o chamador restringir dados (ex.: caixas de e-mail).
 */
export type AcessoCentral = { papel: "founder" } | { papel: "interno"; perfil: import("./central-perfis").PerfilInterno };
export async function acessoCentral(ctx: { supabase: any; userId: string; claims?: any }, secao?: string, msg = "Sem acesso a esta área da Central"): Promise<AcessoCentral> {
  if (await isFounderWith2fa(ctx)) return { papel: "founder" };
  if (secao && ctx.claims?.aal === "aal2") {
    const { ehPerfil, podeSecao } = await import("./central-perfis");
    const { data } = await ctx.supabase.from("central_staff").select("perfil,active").eq("user_id", ctx.userId).maybeSingle();
    if (data?.active === true && ehPerfil(data.perfil) && podeSecao(data.perfil, secao)) return { papel: "interno", perfil: data.perfil };
  }
  throw new Error(msg);
}
