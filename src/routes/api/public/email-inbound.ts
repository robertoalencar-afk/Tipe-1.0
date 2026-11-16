import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assinarEntrada, chaveConversa, htmlParaTexto, iguais, lerEnderecos, pareceSpam, resumo } from "@/lib/tipe/mail";

/**
 * Entrada de e-mail da Central: o Email Worker da Cloudflare (email-worker/) lê a mensagem recebida em
 * roberto@ ou contato@tipe.digital e a envia para cá, assinada com HMAC (EMAIL_INBOUND_SECRET).
 * Sem segredo configurado responde 503. Idempotente por (caixa, Message-ID). Anexos chegam só como
 * metadados (nome, tipo, tamanho). Nada aqui envia e-mail.
 */
const Corpo = z.object({
  rcpt: z.string().max(254),
  from: z.string().max(400),
  to: z.string().max(2000).default(""),
  cc: z.string().max(2000).default(""),
  subject: z.string().max(500).default(""),
  messageId: z.string().max(500).nullable().default(null),
  inReplyTo: z.string().max(500).nullable().default(null),
  references: z.string().max(4000).nullable().default(null),
  text: z.string().max(400_000).nullable().default(null),
  html: z.string().max(800_000).nullable().default(null),
  authResults: z.string().max(1000).nullable().default(null),
  spamHeader: z.string().max(200).nullable().default(null),
  date: z.string().max(60).nullable().default(null),
  attachments: z.array(z.object({ filename: z.string().max(200).nullable(), mimeType: z.string().max(100).nullable(), size: z.number().int().nonnegative() })).max(50).default([]),
});

export const Route = createFileRoute("/api/public/email-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["EMAIL_INBOUND_SECRET"];
        if (!segredo) return new Response(null, { status: 503 });
        const raw = await request.text();
        if (raw.length > 1_500_000) return new Response(null, { status: 413 });
        const ts = request.headers.get("x-tipe-timestamp") ?? "";
        const sig = request.headers.get("x-tipe-signature") ?? "";
        const t = Number(ts);
        if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return new Response(null, { status: 401 });
        if (!iguais(sig, await assinarEntrada(raw, ts, segredo))) return new Response(null, { status: 401 });
        let corpo: z.infer<typeof Corpo>;
        try { corpo = Corpo.parse(JSON.parse(raw)); } catch { return new Response(null, { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const caixa = corpo.rcpt.trim().toLowerCase();
        const { data: mb } = await db.from("mail_mailboxes").select("address").eq("address", caixa).eq("active", true).maybeSingle();
        if (!mb) return new Response(null, { status: 200 }); // endereço que a Central não gerencia: ignora

        const de = lerEnderecos(corpo.from)[0];
        if (!de) return new Response(null, { status: 200 });
        const texto = corpo.text ?? (corpo.html ? htmlParaTexto(corpo.html) : "");
        const spam = pareceSpam(corpo.authResults, corpo.spamHeader);
        const msgId = corpo.messageId?.replace(/[<>]/g, "") ?? null;
        const quando = corpo.date && !Number.isNaN(Date.parse(corpo.date)) ? new Date(corpo.date).toISOString() : new Date().toISOString();
        const { data: lead } = await db.from("restaurant_leads").select("id").ilike("email", de.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { error } = await db.from("mail_messages").insert({
          mailbox: caixa, direction: "in", folder: spam ? "spam" : "inbox", message_id: msgId, in_reply_to: corpo.inReplyTo?.replace(/[<>]/g, "") ?? null,
          thread_key: chaveConversa({ messageId: corpo.messageId, inReplyTo: corpo.inReplyTo, references: corpo.references, assunto: corpo.subject, contato: de.email }),
          from_addr: de.email, from_name: de.nome || null, to_addrs: lerEnderecos(corpo.to), cc_addrs: lerEnderecos(corpo.cc),
          subject: corpo.subject, text_body: texto || null, html_body: corpo.html, snippet: resumo(texto), attachments: corpo.attachments,
          is_read: false, lead_id: lead?.id ?? null, at: quando,
        });
        // 23505 = mensagem repetida (o Cloudflare pode reentregar): já está guardada.
        if (error && error.code !== "23505") return new Response(null, { status: 500 });
        return new Response(null, { status: 200 });
      },
    },
  },
});
