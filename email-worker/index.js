// Email Worker do Cloudflare Email Routing para a Central Tipe.
// Recebe e-mails de roberto@ e contato@tipe.digital, lê a mensagem e entrega à Central
// (POST assinado em /api/public/email-inbound). Anexos viajam só como metadados.
// Segredos (Worker): EMAIL_INBOUND_SECRET (o mesmo do Worker "tipe"); variável APP_URL.
import PostalMime from "postal-mime";
import { embutirImagens } from "./imagens.js";

const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function assinar(corpo, ts, segredo) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(`${ts}.${corpo}`)));
}
const endereco = (a) => (a ? (a.name ? `${a.name} <${a.address}>` : a.address) : "");

export default {
  async email(message, env) {
    // Mensagens enormes não são processadas (limite do Email Routing já é 25 MB).
    if (message.rawSize > 20 * 1024 * 1024) { message.setReject("Mensagem grande demais"); return; }
    const mail = await PostalMime.parse(message.raw);
    const corpo = JSON.stringify({
      rcpt: message.to,
      from: endereco(mail.from) || message.from,
      to: (mail.to ?? []).map(endereco).join(", "),
      cc: (mail.cc ?? []).map(endereco).join(", "),
      subject: mail.subject ?? "",
      messageId: mail.messageId ?? null,
      inReplyTo: mail.inReplyTo ?? null,
      references: Array.isArray(mail.references) ? mail.references.join(" ") : mail.references ?? null,
      text: mail.text ? mail.text.slice(0, 350000) : null,
      html: embutirImagens(mail.html, mail.attachments),
      authResults: message.headers.get("authentication-results"),
      spamHeader: message.headers.get("x-spam-flag") ? `X-Spam-Flag: ${message.headers.get("x-spam-flag")}` : null,
      date: mail.date ?? null,
      attachments: (mail.attachments ?? []).map((a) => ({ filename: a.filename ?? null, mimeType: a.mimeType ?? null, size: a.content?.byteLength ?? 0 })),
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const r = await fetch(`${env.APP_URL}/api/public/email-inbound`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tipe-timestamp": ts, "x-tipe-signature": await assinar(corpo, ts, env.EMAIL_INBOUND_SECRET) },
      body: corpo,
    });
    // Falha temporária: o Email Routing tenta de novo; a Central ignora repetidas pelo Message-ID.
    if (r.status >= 500 || r.status === 429) throw new Error(`Central respondeu ${r.status}`);
  },
};
