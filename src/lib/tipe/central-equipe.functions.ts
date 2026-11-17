/**
 * Equipe interna da Central (comercial, dev, atendimento): contas criadas só pelo fundador.
 * Nada é enviado por e-mail: o fundador copia o link de definição de senha e entrega à pessoa.
 * Tabela: central_staff (migração 0076). Perfis e seções: central-perfis.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERFIL_INFO, PERFIS, secoesDoPerfil, ehPerfil, type PerfilInterno } from "./central-perfis";
import { emailValido } from "./mail";
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
const Local = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,30}$/, "Use letras minúsculas, números, ponto, hífen ou sublinhado (2 a 31 caracteres)");

/** Cria a caixa nome@tipe.digital do membro, com assinatura padrão. Só perfis que abrem Comunicação usam a caixa. */
async function criarCaixa(db: { from: (t: string) => any }, userId: string, local: string, nome: string, perfil: PerfilInterno) {
  if (!(PERFIL_INFO[perfil].secoes as readonly string[]).includes("comunicacao")) throw new Error("Esse setor não abre a Comunicação, então não usa caixa de e-mail");
  const address = `${local}@tipe.digital`;
  if (!emailValido(address)) throw new Error("Endereço de e-mail inválido");
  const assinatura = `${nome}\n${PERFIL_INFO[perfil].rotulo} · Tipe\n${address}\ntipe.digital`;
  const { error } = await db.from("mail_mailboxes").insert({ address, label: nome, signature: assinatura, owner_user_id: userId });
  if (error) throw new Error(/duplicate|unique|already/i.test(error.message ?? "") ? "Esse endereço já existe" : "Não foi possível criar a caixa de e-mail");
  return address;
}

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
    const { data: caixas } = await db.from("mail_mailboxes").select("address,owner_user_id").not("owner_user_id", "is", null);
    const porDono = new Map(((caixas ?? []) as { address: string; owner_user_id: string }[]).map((c) => [c.owner_user_id, c.address]));
    return { caixas: Object.fromEntries(porDono) as Record<string, string>, membros: (data ?? []) as { user_id: string; perfil: PerfilInterno; nome: string; email: string; active: boolean; created_at: string }[], perfis: PERFIS.map((p) => ({ perfil: p, ...PERFIL_INFO[p], temComunicacao: (PERFIL_INFO[p].secoes as readonly string[]).includes("comunicacao") })) };
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
  .inputValidator((d) => z.object({ nome: z.string().trim().min(2).max(80), email: z.string().trim().email().max(200), perfil: Perfil, caixa: Local.optional() }).parse(d))
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
    let caixa: string | null = null;
    if (data.caixa) {
      try { caixa = await criarCaixa(db, criado.user.id, data.caixa, data.nome, data.perfil); }
      catch (e) { await db.from("central_staff").delete().eq("user_id", criado.user.id); await db.auth.admin.deleteUser(criado.user.id); throw e; }
    }
    await logSecurityEvent({ action: "central_staff_created", resource: "central_staff", actorId: context.userId, detail: `perfil=${data.perfil} email=${email} caixa=${caixa ?? "-"}` });
    return { userId: criado.user.id, caixa, link: await linkDeSenha(db, email) };
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
    if (data.active !== undefined) await db.from("mail_mailboxes").update({ active: data.active }).eq("owner_user_id", data.userId);
    await logSecurityEvent({ action: data.active === false ? "central_staff_disabled" : "central_staff_updated", resource: "central_staff", actorId: context.userId, detail: `membro=${data.userId} perfil=${data.perfil ?? "-"} ativo=${data.active ?? "-"}` });
    return { ok: true };
  });

/** Caixa de e-mail para um membro que já existe. */
export const criarCaixaMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: Uuid, caixa: Local }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await soFounder(context);
    const { logSecurityEvent } = await import("./security.server");
    const { data: m } = await db.from("central_staff").select("nome,perfil,active").eq("user_id", data.userId).maybeSingle();
    if (!m?.active || !ehPerfil(m.perfil)) throw new Error("Membro não encontrado ou desativado");
    const address = await criarCaixa(db, data.userId, data.caixa, String(m.nome), m.perfil);
    await logSecurityEvent({ action: "central_mailbox_created", resource: "mail_mailboxes", actorId: context.userId, detail: `caixa=${address} membro=${data.userId}` });
    return { address };
  });
