/**
 * Prospecção por e-mail: prévia do lote, e-mail de teste e envio do lote aprovado.
 *
 * Só o fundador (2FA) envia; a equipe comercial vê a prévia. Nada sai sozinho: cada lote
 * é aprovado na tela, respeita o limite diário (PROSPECCAO_EMAIL_LIMITE_DIA, padrão 30)
 * e pula quem está em crm_optout. Envia pelo Resend como roberto@, guarda em Enviados da
 * Central (respostas caem na mesma conversa) e em email_log (status pelo webhook).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LIMITE_DIA_PADRAO,
  REMETENTE_PADRAO,
  aposEmail,
  linkSair,
  loteEmail,
  montarEmail,
  tokenSair,
} from "./prospeccao-email";

type Ctx = { supabase: any; userId: string; claims?: any };
type Db = { from: (t: string) => any };
async function acesso(ctx: Ctx) {
  const { acessoCentral } = await import("./founder-guard");
  const a = await acessoCentral(
    ctx,
    "comercial",
    "Somente a equipe comercial da Tipe, com verificação em duas etapas",
  );
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { a, db: supabaseAdmin as unknown as Db };
}
const limiteDia = () => {
  const n = Number(process.env["PROSPECCAO_EMAIL_LIMITE_DIA"]);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : LIMITE_DIA_PADRAO;
};
const segredo = () => {
  const s = process.env["TIPE_ENCRYPTION_KEY"] ?? process.env["CRON_SECRET"];
  if (!s) throw new Error("Envio não configurado: falta TIPE_ENCRYPTION_KEY.");
  return s;
};
const inicioDoDiaFortaleza = () => {
  const agora = new Date();
  const local = new Date(agora.getTime() - 3 * 3600e3);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + 3 * 3600e3).toISOString();
};

async function remetente(db: Db) {
  const { data: cx } = await db
    .from("mail_mailboxes")
    .select("address,label,signature,active")
    .eq("address", REMETENTE_PADRAO)
    .maybeSingle();
  const { nomeRemetente } = await import("./mail");
  const nome = cx ? nomeRemetente(cx) : "Roberto Alencar | Tipe";
  return {
    endereco: REMETENTE_PADRAO,
    nomeDe: nome,
    nomeCorpo: nome.replace(/\s*\|\s*Tipe$/i, ""),
  };
}

async function enviadosHoje(db: Db) {
  const { count } = await db
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("template", "prospeccao")
    .gte("created_at", inicioDoDiaFortaleza())
    .neq("status", "failed");
  return count ?? 0;
}

async function candidatos(db: Db) {
  const { data, error } = await db
    .from("crm_prospects")
    .select("id,name,email,status,score,email_step,email_next_at,neighborhood,category")
    .not("email", "is", null)
    .in("status", ["novo", "em_contato"])
    .lt("email_step", 3)
    .limit(5000);
  if (error) throw new Error(error.message);
  const { data: bloq } = await db.from("crm_optout").select("value").eq("kind", "email");
  const fora = new Set(((bloq ?? []) as { value: string }[]).map((b) => b.value));
  return ((data ?? []) as any[]).filter((p) => !fora.has(String(p.email).toLowerCase()));
}

export const getLoteEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { a, db } = await acesso(context);
    const lista = await candidatos(db);
    const hoje = await enviadosHoje(db);
    const limite = limiteDia();
    const lote = loteEmail(lista, new Date(), limite - hoje);
    const r = await remetente(db);
    const exemplo = lote[0] ??
      lista[0] ?? { id: "00000000-0000-0000-0000-000000000000", name: "Restaurante Exemplo" };
    const previa = montarEmail({
      passo: Math.min(3, (exemplo.email_step ?? 0) + 1),
      prospect: exemplo,
      remetente: r.nomeCorpo,
      linkSair: linkSair(exemplo.id, "exemplo"),
    });
    const { data: ultimos } = await db
      .from("email_log")
      .select("to_email,subject,status,created_at,prospect_id")
      .eq("template", "prospeccao")
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      podeEnviar: a.papel === "founder",
      remetente: `${r.nomeDe} <${r.endereco}>`,
      limite,
      enviadosHoje: hoje,
      comEmail: lista.length,
      lote: lote.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        score: p.score,
        passo: p.email_step + 1,
        bairro: p.neighborhood,
      })),
      previa,
      ultimos: ultimos ?? [],
    };
  });

async function enviarUm(i: {
  db: Db;
  apiKey: string;
  para: string;
  prospect: { id: string; name: string };
  passo: number;
  actor: string;
  teste?: boolean;
  inReplyTo?: string | null;
}) {
  const r = await remetente(i.db);
  const token = await tokenSair(i.prospect.id, segredo());
  const sair = linkSair(i.prospect.id, token);
  const m = montarEmail({
    passo: i.passo,
    prospect: i.prospect,
    remetente: r.nomeCorpo,
    linkSair: sair,
  });
  const assunto = i.teste ? `[Teste] ${m.assunto}` : m.assunto;
  const messageId = `<${crypto.randomUUID()}@tipe.digital>`;
  const headers: Record<string, string> = {
    "Message-ID": messageId,
    "List-Unsubscribe": `<${sair}>, <mailto:${r.endereco}?subject=SAIR>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  if (i.inReplyTo) {
    headers["In-Reply-To"] = i.inReplyTo;
    headers["References"] = i.inReplyTo;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${i.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `prospeccao-${i.prospect.id}-${i.passo}${i.teste ? `-teste-${Date.now()}` : ""}`,
    },
    body: JSON.stringify({
      from: `${r.nomeDe.replace(/[<>"]/g, "")} <${r.endereco}>`,
      to: [i.para],
      reply_to: r.endereco,
      subject: assunto,
      text: m.texto,
      html: m.html,
      headers,
      tags: [{ name: "template", value: "prospeccao" }],
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  const ok = res.ok;
  if (!i.teste) {
    await i.db
      .from("email_log")
      .insert({
        template: "prospeccao",
        to_email: i.para,
        subject: assunto,
        resend_id: j.id ?? null,
        status: ok ? "sent" : "failed",
        error: ok ? null : String(j.message ?? res.status).slice(0, 200),
        prospect_id: i.prospect.id,
        message_id: messageId,
      });
    if (ok) {
      const { chaveConversa, resumo } = await import("./mail");
      await i.db.from("mail_messages").insert({
        mailbox: r.endereco,
        direction: "out",
        folder: "sent",
        message_id: messageId,
        in_reply_to: i.inReplyTo ?? null,
        thread_key: chaveConversa({
          messageId: i.inReplyTo ?? messageId,
          assunto,
          contato: i.para,
        }),
        from_addr: r.endereco,
        from_name: r.nomeDe,
        to_addrs: [{ email: i.para }],
        cc_addrs: [],
        subject: assunto,
        text_body: m.texto,
        snippet: resumo(m.texto),
        is_read: true,
        resend_id: j.id ?? null,
        at: new Date().toISOString(),
      });
    }
  }
  if (!ok)
    throw new Error(j.message ? `Resend recusou: ${j.message}` : `Resend recusou (${res.status})`);
  return { assunto };
}

/** Manda o e-mail 1 para o próprio fundador, com um restaurante de exemplo, para conferir caixa de entrada e visual. */
export const enviarEmailTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        para: z.string().trim().toLowerCase().email().max(120),
        passo: z.number().int().min(1).max(3).default(1),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { a, db } = await acesso(context);
    if (a.papel !== "founder") throw new Error("Só o fundador envia e-mails de prospecção.");
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("Envio não configurado: falta RESEND_API_KEY.");
    const { data: p } = await db
      .from("crm_prospects")
      .select("id,name")
      .not("email", "is", null)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();
    const exemplo = p ?? {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Restaurante Exemplo",
    };
    return enviarUm({
      db,
      apiKey,
      para: data.para,
      prospect: exemplo,
      passo: data.passo,
      actor: context.userId,
      teste: true,
    });
  });

/** Envia o lote aprovado na tela. Recalcula elegibilidade e limite no servidor; nunca confia na lista do navegador. */
export const enviarLoteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(v))
  .handler(async ({ data, context }) => {
    const { a, db } = await acesso(context);
    if (a.papel !== "founder") throw new Error("Só o fundador envia e-mails de prospecção.");
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("Envio não configurado: falta RESEND_API_KEY.");
    const pedidos = new Set(data.ids);
    const vaga = limiteDia() - (await enviadosHoje(db));
    if (vaga <= 0) throw new Error("Limite diário de e-mails atingido. Continue amanhã.");
    const lote = loteEmail(
      (await candidatos(db)).filter((p) => pedidos.has(p.id)),
      new Date(),
      vaga,
    );
    const resultado = {
      enviados: 0,
      falhas: [] as string[],
      pulados: data.ids.length - lote.length,
    };
    for (const p of lote) {
      const passo = p.email_step + 1;
      let inReplyTo: string | null = null;
      if (passo > 1) {
        const { data: ant } = await db
          .from("email_log")
          .select("message_id")
          .eq("prospect_id", p.id)
          .eq("template", "prospeccao")
          .eq("status", "sent")
          .order("created_at")
          .limit(1)
          .maybeSingle();
        inReplyTo = ant?.message_id ?? null;
      }
      try {
        await enviarUm({
          db,
          apiKey,
          para: String(p.email).toLowerCase(),
          prospect: p,
          passo,
          actor: context.userId,
          inReplyTo,
        });
        await db
          .from("crm_prospects")
          .update({
            ...aposEmail(passo, new Date()),
            assigned_to: context.userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        resultado.enviados++;
      } catch (e) {
        resultado.falhas.push(`${p.name}: ${(e as Error).message}`);
      }
      await new Promise((ok) => setTimeout(ok, 600)); // ritmo humano, abaixo do limite do Resend
    }
    return resultado;
  });
