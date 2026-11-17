/**
 * Caixa de e-mail da Central (roberto@ e contato@tipe.digital): só founder com 2FA.
 * Recebimento: Cloudflare Email Routing -> Worker -> /api/public/email-inbound.
 * Envio: Resend, sempre por ação explícita do fundador. Tabelas: migração 0075.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PASTAS, chaveConversa, comAssinatura, corpoHtml, formatarEndereco, htmlParaTexto, nomeRemetente, lerEnderecos, resumo, textoParaHtml } from "./mail";

type Ctx = { supabase: any; userId: string; claims?: any };
/** Founder vê as duas caixas; equipe interna (comercial/atendimento) só as do perfil (contato@). `permitidas` null = todas. */
async function founder(ctx: Ctx) {
  const { acessoCentral } = await import("./founder-guard");
  const a = await acessoCentral(ctx, "comunicacao");
  let permitidas: string[] | null = null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  if (a.papel === "interno") {
    const { caixasDoPerfil } = await import("./central-perfis");
    const { data: minhas } = await db.from("mail_mailboxes").select("address").eq("owner_user_id", ctx.userId).eq("active", true);
    permitidas = [...caixasDoPerfil(a.perfil), ...((minhas ?? []) as { address: string }[]).map((m) => m.address)];
    if (!permitidas.length) throw new Error("Seu perfil não tem caixa de e-mail");
  }
  return { db, permitidas, ehFundador: a.papel === "founder", userId: ctx.userId };
}
const checar = (permitidas: string[] | null, caixa: string) => { if (permitidas && !permitidas.includes(caixa)) throw new Error("Sem acesso a esta caixa"); };
const Uuid = z.string().uuid();
const Pasta = z.enum(PASTAS);
const Caixa = z.string().trim().toLowerCase().max(120);
const COLS = "id,mailbox,direction,folder,thread_key,from_addr,from_name,to_addrs,subject,snippet,is_read,starred,lead_id,at,attachments";

export const getMailOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    const [{ data: caixas }, { data: nao }, { data: ultima }] = await Promise.all([
      db.from("mail_mailboxes").select("address,label,signature,active").order("address"),
      db.from("mail_messages").select("mailbox,folder").eq("is_read", false).in("folder", ["inbox", "spam"]).limit(5000),
      db.from("mail_messages").select("at").eq("direction", "in").order("at", { ascending: false }).limit(1),
    ]);
    const recebimento: "sem_segredo" | "aguardando" | "ativo" = !process.env["EMAIL_INBOUND_SECRET"] ? "sem_segredo" : ultima?.length ? "ativo" : "aguardando";
    const ok = (a: string) => !permitidas || permitidas.includes(a);
    const naoLidas: Record<string, number> = {};
    for (const m of ((nao ?? []) as { mailbox: string; folder: string }[]).filter((x) => ok(x.mailbox))) { const k = `${m.mailbox}|${m.folder}`; naoLidas[k] = (naoLidas[k] ?? 0) + 1; }
    return { caixas: ((caixas ?? []) as { address: string; label: string; signature: string | null; active: boolean }[]).filter((c) => ok(c.address)), naoLidas, envio: Boolean(process.env["RESEND_API_KEY"]), recebimento };
  });

export const listMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ caixa: Caixa, pasta: Pasta, busca: z.string().trim().max(80).optional(), estrela: z.boolean().optional(), pagina: z.number().int().min(0).max(200).default(0) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    checar(permitidas, data.caixa);
    let q = db.from("mail_messages").select(COLS).eq("mailbox", data.caixa).eq("folder", data.pasta).order("at", { ascending: false }).range(data.pagina * 40, data.pagina * 40 + 39);
    if (data.estrela) q = q.eq("starred", true);
    if (data.busca) { const b = data.busca.replace(/[%,()]/g, " "); q = q.or(`subject.ilike.%${b}%,from_addr.ilike.%${b}%,snippet.ilike.%${b}%`); }
    const { data: rows, error } = await q;
    if (error) throw new Error("Não foi possível carregar a caixa");
    return { itens: (rows ?? []) as any[], temMais: (rows ?? []).length === 40 };
  });

/** Abre a conversa inteira (todas as mensagens da mesma thread, nas pastas da caixa) e marca como lida. */
export const getMailThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    const { data: base } = await db.from("mail_messages").select("id,mailbox,thread_key,lead_id").eq("id", data.id).maybeSingle();
    if (!base) throw new Error("Mensagem não encontrada");
    checar(permitidas, base.mailbox);
    const { data: msgs } = await db.from("mail_messages").select("*").eq("mailbox", base.mailbox).eq("thread_key", base.thread_key).neq("folder", "trash").order("at", { ascending: true }).limit(100);
    await db.from("mail_messages").update({ is_read: true }).eq("mailbox", base.mailbox).eq("thread_key", base.thread_key).eq("is_read", false);
    let lead: { id: string; name: string | null } | null = null;
    if (base.lead_id) { const { data: l } = await db.from("restaurant_leads").select("id,restaurant_name").eq("id", base.lead_id).maybeSingle(); if (l) lead = { id: l.id, name: l.restaurant_name ?? null }; }
    return { mensagens: (msgs ?? []) as any[], lead };
  });

export const updateMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(Uuid).min(1).max(100), pasta: Pasta.optional(), lida: z.boolean().optional(), estrela: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    const patch: Record<string, unknown> = {};
    if (data.pasta) patch["folder"] = data.pasta;
    if (data.lida !== undefined) patch["is_read"] = data.lida;
    if (data.estrela !== undefined) patch["starred"] = data.estrela;
    if (!Object.keys(patch).length) return { ok: true };
    let up = db.from("mail_messages").update(patch).in("id", data.ids);
    if (permitidas) up = up.in("mailbox", permitidas);
    const { error } = await up;
    if (error) throw new Error("Não foi possível atualizar");
    return { ok: true };
  });

export const deleteMailForever = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(Uuid).min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    let del = db.from("mail_messages").delete().in("id", data.ids).eq("folder", "trash");
    if (permitidas) del = del.in("mailbox", permitidas);
    await del;
    return { ok: true };
  });

const Envio = z.object({
  caixa: Caixa, para: z.string().trim().min(3).max(1000), cc: z.string().trim().max(1000).default(""),
  assunto: z.string().trim().min(1).max(300), texto: z.string().trim().min(1).max(100000),
  respondeId: Uuid.optional(), rascunhoId: Uuid.optional(),
});

/** Salva rascunho (sem enviar nada). */
export const saveMailDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Envio.partial({ para: true, assunto: true, texto: true }).required({ caixa: true }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    checar(permitidas, data.caixa);
    const row = {
      mailbox: data.caixa, direction: "out", folder: "drafts", thread_key: `rascunho:${data.rascunhoId ?? crypto.randomUUID()}`,
      from_addr: data.caixa, to_addrs: lerEnderecos(data.para ?? ""), cc_addrs: lerEnderecos(data.cc ?? ""), subject: data.assunto ?? "", text_body: data.texto ?? "", snippet: resumo(data.texto ?? ""), is_read: true, at: new Date().toISOString(),
    };
    if (data.rascunhoId) { await db.from("mail_messages").update(row).eq("id", data.rascunhoId).eq("mailbox", data.caixa).eq("folder", "drafts"); return { id: data.rascunhoId }; }
    const { data: r, error } = await db.from("mail_messages").insert(row).select("id").single();
    if (error) throw new Error("Não foi possível salvar o rascunho");
    return { id: r.id as string };
  });

/** Envia pelo Resend, só quando o fundador aperta Enviar. Guarda em Enviados e registra no lead, se houver. */
export const sendMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Envio.parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("Envio não configurado: falta RESEND_API_KEY.");
    checar(permitidas, data.caixa);
    const { data: cx } = await db.from("mail_mailboxes").select("address,label,signature,active").eq("address", data.caixa).maybeSingle();
    if (!cx?.active) throw new Error("Caixa desconhecida ou desativada");
    const para = lerEnderecos(data.para), cc = lerEnderecos(data.cc);
    if (!para.length) throw new Error("Informe ao menos um destinatário válido");
    if (para.length + cc.length > 20) throw new Error("Máximo de 20 destinatários por e-mail");
    let inReplyTo: string | null = null, refs: string | null = null, threadKey: string | null = null, leadId: string | null = null;
    if (data.respondeId) {
      const { data: o } = await db.from("mail_messages").select("message_id,thread_key,lead_id").eq("id", data.respondeId).eq("mailbox", cx.address).maybeSingle();
      if (o) { inReplyTo = o.message_id; refs = o.message_id; threadKey = o.thread_key; leadId = o.lead_id; }
    }
    const corpo = comAssinatura(data.texto, cx.signature);
    const messageId = `<${crypto.randomUUID()}@tipe.digital>`;
    const headers: Record<string, string> = { "Message-ID": messageId };
    if (inReplyTo) { headers["In-Reply-To"] = inReplyTo; if (refs) headers["References"] = refs; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ from: formatarEndereco({ nome: nomeRemetente(cx), email: cx.address }), to: para.map((a) => a.email), ...(cc.length ? { cc: cc.map((a) => a.email) } : {}), reply_to: cx.address, subject: data.assunto, text: corpo, html: corpoHtml(corpo), headers }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok) throw new Error(j.message ? `Resend recusou o envio: ${j.message}` : "Resend recusou o envio");
    if (!leadId) {
      const { data: l } = await db.from("restaurant_leads").select("id").in("email", para.map((a) => a.email)).limit(1).maybeSingle();
      leadId = l?.id ?? null;
    }
    const key = threadKey ?? chaveConversa({ messageId, assunto: data.assunto, contato: para[0]!.email });
    const agora = new Date().toISOString();
    const row = { mailbox: cx.address, direction: "out", folder: "sent", message_id: messageId, in_reply_to: inReplyTo, thread_key: key, from_addr: cx.address, from_name: nomeRemetente(cx), to_addrs: para, cc_addrs: cc, subject: data.assunto, text_body: corpo, snippet: resumo(corpo), is_read: true, resend_id: j.id ?? null, lead_id: leadId, at: agora };
    if (data.rascunhoId) await db.from("mail_messages").delete().eq("id", data.rascunhoId).eq("mailbox", cx.address).eq("folder", "drafts");
    await db.from("mail_messages").insert(row);
    if (leadId) await db.from("crm_activities").insert({ lead_id: leadId, kind: "email", title: `E-mail enviado: ${data.assunto}`.slice(0, 200), body: resumo(data.texto), actor_id: context.userId });
    return { ok: true };
  });

/** Edita a assinatura: o fundador, de qualquer caixa; a equipe, só da própria caixa. */
export const saveMailSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ caixa: Caixa, assinatura: z.string().trim().max(600) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, permitidas, ehFundador, userId } = await founder(context);
    checar(permitidas, data.caixa);
    let q = db.from("mail_mailboxes").update({ signature: data.assinatura || null }).eq("address", data.caixa);
    if (!ehFundador) q = q.eq("owner_user_id", userId); // equipe não muda a assinatura de caixa compartilhada
    const { error } = await q;
    if (error) throw new Error("Não foi possível salvar a assinatura");
    return { ok: true };
  });
