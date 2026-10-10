// Founder só passa com 2FA (aal2) confirmado no token da sessão.
export async function isFounderWith2fa(ctx: { supabase: any; userId: string; claims?: any }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "founder" });
  return data === true && ctx.claims?.aal === "aal2";
}

export async function requireFounder2fa(ctx: { supabase: any; userId: string; claims?: any }, msg = "Somente a equipe TIPE, com verificação em duas etapas") {
  if (!(await isFounderWith2fa(ctx))) throw new Error(msg);
}
