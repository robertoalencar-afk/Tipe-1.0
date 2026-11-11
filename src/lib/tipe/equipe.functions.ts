/**
 * Equipe e permissões do restaurante. Só o administrador (owner) do restaurante muda papéis,
 * concessões, convites e suspensões. O cliente nunca decide: papel e restaurante vêm do banco
 * (user_roles), jamais de metadados editáveis. Toda mudança entra em staff_audit_log.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONCEDIVEIS } from "./permissoes";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const Uuid = z.string().uuid();
const Papel = z.enum(["manager", "cashier", "waiter"]);
type Db = { from: (t: string) => any; rpc: (f: string, a?: any) => any; auth: any };

/** Resolve o restaurante e exige que quem chama seja administrador DELE. */
async function comoAdmin(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id, slug").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o administrador do restaurante pode fazer isso");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { rid: r.id as string, db: supabaseAdmin as unknown as Db };
}
async function auditar(db: Db, rid: string, actor: string, action: string, target: string | null, detail?: string) {
  await db.from("staff_audit_log").insert({ restaurant_id: rid, actor_id: actor, target_id: target, action, detail: detail?.slice(0, 300) ?? null });
}
async function hash(token: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function outroAdmin(db: Db, rid: string, exceto: string) {
  const { count } = await db.from("user_roles").select("user_id", { count: "exact", head: true }).eq("restaurant_id", rid).eq("role", "owner").neq("user_id", exceto);
  return (count ?? 0) > 0;
}

export const getEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const [staff, roles, grants, invites, audit] = await Promise.all([
      db.from("staff_members").select("user_id, display_name, email, suspended_at, created_at").eq("restaurant_id", rid),
      db.from("user_roles").select("user_id, role").eq("restaurant_id", rid),
      db.from("restaurant_permission_grants").select("user_id, permission").eq("restaurant_id", rid),
      db.from("staff_invites").select("id, email, name, role, expires_at, accepted_at, revoked_at, created_at").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(50),
      db.from("staff_audit_log").select("id, actor_id, target_id, action, detail, created_at").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(100),
    ]);
    const nome = new Map<string, string>((staff.data ?? []).map((s: any) => [s.user_id, s.display_name]));
    return {
      pessoas: (staff.data ?? []).map((s: any) => ({
        userId: s.user_id as string, nome: s.display_name as string, email: s.email as string, suspenso: Boolean(s.suspended_at),
        papeis: (roles.data ?? []).filter((r: any) => r.user_id === s.user_id).map((r: any) => r.role as string),
        extras: (grants.data ?? []).filter((g: any) => g.user_id === s.user_id).map((g: any) => g.permission as string),
      })),
      convites: invites.data ?? [],
      historico: (audit.data ?? []).map((a: any) => ({ ...a, ator: nome.get(a.actor_id) ?? "Sistema", alvo: a.target_id ? (nome.get(a.target_id) ?? "—") : "—" })),
    };
  });

/** Cria o convite e devolve o link UMA vez. Nada é enviado por e-mail: o administrador compartilha o link. */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, email: z.string().trim().toLowerCase().email().max(255), name: z.string().trim().min(2).max(80), role: Papel }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`convite:${context.userId}`, 20, 3600);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await db.from("staff_invites").insert({ restaurant_id: rid, email: data.email, name: data.name, role: data.role, token_hash: await hash(token), created_by: context.userId });
    if (error) throw new Error("Não foi possível criar o convite");
    await auditar(db, rid, context.userId, "convite_criado", null, `${data.email} como ${data.role}`);
    return { token, validoPorDias: 7 };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { error } = await db.from("staff_invites").update({ revoked_at: new Date().toISOString() }).eq("id", data.id).eq("restaurant_id", rid).is("accepted_at", null);
    if (error) throw new Error("Não foi possível revogar");
    await auditar(db, rid, context.userId, "convite_revogado", null, data.id);
    return { ok: true };
  });

/** Quem recebeu o link entra logado e aceita. O e-mail da conta precisa ser o do convite. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { enforceRate } = await import("./security.server");
    await enforceRate(`aceitar-convite:${context.userId}`, 10, 3600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as Db;
    const { data: inv } = await db.from("staff_invites").select("*").eq("token_hash", await hash(data.token)).maybeSingle();
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    if (!inv || inv.revoked_at || inv.accepted_at || new Date(inv.expires_at) < new Date()) throw new Error("Convite inválido, expirado ou já usado");
    if (!email || inv.email !== email) throw new Error("Este convite é para outro e-mail. Entre com a conta do e-mail convidado.");
    const { error: e1 } = await db.from("staff_members").upsert({ user_id: context.userId, restaurant_id: inv.restaurant_id, display_name: inv.name, email, suspended_at: null }, { onConflict: "user_id,restaurant_id" });
    const { error: e2 } = await db.from("user_roles").upsert({ user_id: context.userId, restaurant_id: inv.restaurant_id, role: inv.role }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true });
    if (e1 || e2) throw new Error("Não foi possível concluir o convite");
    await db.from("staff_invites").update({ accepted_at: new Date().toISOString(), accepted_by: context.userId }).eq("id", inv.id).is("accepted_at", null);
    await auditar(db, inv.restaurant_id, context.userId, "convite_aceito", context.userId, inv.role);
    const { data: r } = await db.from("restaurants").select("slug, name").eq("id", inv.restaurant_id).maybeSingle();
    return { slug: r?.slug as string, nome: r?.name as string };
  });

export const setPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, userId: Uuid, role: Papel }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { data: atuais } = await db.from("user_roles").select("role").eq("restaurant_id", rid).eq("user_id", data.userId);
    if (!atuais?.length) throw new Error("Essa pessoa não está na equipe");
    if (atuais.some((r: any) => r.role === "owner") && !(await outroAdmin(db, rid, data.userId))) throw new Error("O restaurante precisa de ao menos um administrador");
    await db.from("user_roles").delete().eq("restaurant_id", rid).eq("user_id", data.userId);
    const { error } = await db.from("user_roles").insert({ restaurant_id: rid, user_id: data.userId, role: data.role });
    if (error) throw new Error("Não foi possível mudar o papel");
    await auditar(db, rid, context.userId, "papel_alterado", data.userId, `${atuais.map((r: any) => r.role).join(",")} -> ${data.role}`);
    return { ok: true };
  });

export const setPermissoesExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, userId: Uuid, permissoes: z.array(z.string().max(40)).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const validas = [...new Set(data.permissoes)].filter((p) => (CONCEDIVEIS as readonly string[]).includes(p));
    const { data: alvo } = await db.from("user_roles").select("role").eq("restaurant_id", rid).eq("user_id", data.userId);
    if (!alvo?.length) throw new Error("Essa pessoa não está na equipe");
    if (alvo.some((r: any) => r.role === "owner")) throw new Error("Administrador já tem todas as permissões");
    await db.from("restaurant_permission_grants").delete().eq("restaurant_id", rid).eq("user_id", data.userId);
    if (validas.length) await db.from("restaurant_permission_grants").insert(validas.map((permission) => ({ restaurant_id: rid, user_id: data.userId, permission, granted_by: context.userId })));
    await auditar(db, rid, context.userId, "permissoes_alteradas", data.userId, validas.join(", ") || "nenhuma extra");
    return { ok: true };
  });

export const setSuspensao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, userId: Uuid, suspenso: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    if (data.userId === context.userId) throw new Error("Você não pode suspender a si mesmo");
    const { data: alvo } = await db.from("user_roles").select("role").eq("restaurant_id", rid).eq("user_id", data.userId);
    if (data.suspenso && alvo?.some((r: any) => r.role === "owner") && !(await outroAdmin(db, rid, data.userId))) throw new Error("O restaurante precisa de ao menos um administrador ativo");
    const { error } = await db.from("staff_members").update({ suspended_at: data.suspenso ? new Date().toISOString() : null, suspended_by: data.suspenso ? context.userId : null }).eq("restaurant_id", rid).eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível atualizar");
    await auditar(db, rid, context.userId, data.suspenso ? "acesso_suspenso" : "acesso_reativado", data.userId);
    return { ok: true };
  });

export const removerPessoa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, userId: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { data: alvo } = await db.from("user_roles").select("role").eq("restaurant_id", rid).eq("user_id", data.userId);
    if (alvo?.some((r: any) => r.role === "owner") && !(await outroAdmin(db, rid, data.userId))) throw new Error("O restaurante precisa de ao menos um administrador");
    await db.from("restaurant_permission_grants").delete().eq("restaurant_id", rid).eq("user_id", data.userId);
    await db.from("user_roles").delete().eq("restaurant_id", rid).eq("user_id", data.userId);
    await db.from("staff_members").delete().eq("restaurant_id", rid).eq("user_id", data.userId);
    await auditar(db, rid, context.userId, "pessoa_removida", data.userId);
    return { ok: true };
  });
