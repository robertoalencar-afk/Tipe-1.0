/**
 * Equipe interna da Central (comercial, dev, atendimento): contas criadas só pelo fundador.
 * Nada é enviado por e-mail: o fundador copia o link de definição de senha e entrega à pessoa.
 * Tabela: central_staff (migração 0076). Perfis e seções: central-perfis.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERFIL_INFO, PERFIS, secoesDoPerfil, ehPerfil, type PerfilInterno } from "./central-perfis";
import { normalizarEmail, origemConfiavel } from "./recuperar-senha";

type Ctx = { supabase: any; userId: string; claims?: any };
async function soFounder(ctx: Ctx) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (t: string) => any; auth: any };
}
const Uuid = z.string().uuid();
const Perfil = z.enum(PERFIS);

/** Quem sou eu na Central e o que posso abrir. Não exige 2FA aqui: a tela pede o código antes e o servidor recusa o resto. */
export const getAcessoCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: fundador } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "founder" });
    if (fundador === true) return { papel: "founder" as const, perfil: null, secoes: null as string[] | null, nome: null as string | null };
    const { data } = await (context.supabase as any).from("central_staff").select("perfil,nome,active").eq("user_id", context.userId).maybeSingle();
    if (data?.active === true && ehPerfil(data.perfil)) return { papel: "interno" as const, perfil: data.perfil as PerfilInterno, secoes: [...secoesDoPerfil(data.perfil)] as string[] | null, nome: String(data.nome) };
    return { papel: "nenhum" as const, perfil: null, secoes: [] as string[] | null, nome: null as string | null };
  });

export const listEquipeInterna = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await soFounder(context);
    const { data } = await db.from("central_staff").select("user_id,perfil,nome,email,active,created_at").order("created_at", { ascending: false }).limit(200);
    return { membros: (data ?? []) as { user_id: string; perfil: PerfilInterno; nome: string; email: string; active: boolean; created_at: string }[], perfis: PERFIS.map((p) => ({ perfil: p, ...PERFIL_INFO[p] })) };
  });

async function linkDeSenha(db: { auth: any }, email: string) {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const origem = origemConfiavel(getRequestHeader("origin"));
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${origem}/redefinir-senha` } });
  const link = data?.properties?.action_link as string | undefined;
  if (error || !link) throw new Error("Não foi possível gerar o link de acesso");
  return link;
}

/** Cria a conta e devolve o link UMA vez. Recusa e-mail que já existe (não toma conta de dono de restaurante). */
export const criarMembroInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ nome: z.string().trim().min(2).max(80), email: z.string().trim().email().max(200), perfil: Perfil }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await soFounder(context);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`central-equipe:${context.userId}`, 20, 3600);
    const email = normalizarEmail(data.email);
    const senha = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
    const { data: criado, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { full_name: data.nome } });
    if (error || !criado?.user) throw new Error(/registered|exists/i.test(error?.message ?? "") ? "Esse e-mail já tem conta na Tipe. Use outro e-mail para a equipe interna." : "Não foi possível criar a conta");
    const { error: e2 } = await db.from("central_staff").insert({ user_id: criado.user.id, perfil: data.perfil, nome: data.nome, email, created_by: context.userId });
    if (e2) { await db.auth.admin.deleteUser(criado.user.id); throw new Error("Não foi possível cadastrar o membro"); }
    await logSecurityEvent({ action: "central_staff_created", resource: "central_staff", actorId: context.userId, detail: `perfil=${data.perfil} email=${email}` });
    return { userId: criado.user.id, link: await linkDeSenha(db, email) };
  });

export const novoLinkMembroInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await soFounder(context);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`central-equipe:${context.userId}`, 20, 3600);
    const { data: m } = await db.from("central_staff").select("email,active").eq("user_id", data.userId).maybeSingle();
    if (!m?.active) throw new Error("Membro não encontrado ou desativado");
    return { link: await linkDeSenha(db, m.email) };
  });

export const atualizarMembroInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: Uuid, perfil: Perfil.optional(), active: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await soFounder(context);
    const { logSecurityEvent } = await import("./security.server");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.perfil) patch["perfil"] = data.perfil;
    if (data.active !== undefined) patch["active"] = data.active;
    const { error } = await db.from("central_staff").update(patch).eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível atualizar");
    await logSecurityEvent({ action: data.active === false ? "central_staff_disabled" : "central_staff_updated", resource: "central_staff", actorId: context.userId, detail: `membro=${data.userId} perfil=${data.perfil ?? "-"} ativo=${data.active ?? "-"}` });
    return { ok: true };
  });
