/** Ajudas puras da caixa de e-mail da Central (sem banco), testadas em mail.test.ts. */

export const PASTAS = ["inbox", "sent", "drafts", "spam", "trash", "archive"] as const;
export type Pasta = (typeof PASTAS)[number];
export const PASTA_LABEL: Record<Pasta, string> = { inbox: "Caixa de entrada", sent: "Enviados", drafts: "Rascunhos", spam: "Spam", trash: "Lixeira", archive: "Arquivados" };

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
export const emailValido = (s: string) => s.length <= 254 && EMAIL.test(s);

/** "Maria <maria@x.com>, joao@y.com" -> [{nome, email}] (descarta o que não é e-mail válido). */
export function lerEnderecos(entrada: string): { nome: string; email: string }[] {
  const saida: { nome: string; email: string }[] = [];
  for (const parte of entrada.split(/[,;]+/)) {
    const p = parte.trim();
    if (!p) continue;
    const m = /^(.*)<([^<>]+)>$/.exec(p);
    const email = (m ? m[2]! : p).trim().toLowerCase();
    const nome = m ? m[1]!.replace(/^["'\s]+|["'\s]+$/g, "") : "";
    if (emailValido(email)) saida.push({ nome, email });
  }
  return saida;
}

export const formatarEndereco = (a: { nome?: string | null; email: string }) => (a.nome ? `${a.nome.replace(/[<>"]/g, "")} <${a.email}>` : a.email);

export const limparAssunto = (s: string) => s.replace(/^\s*((re|res|enc|fw|fwd)\s*:\s*)+/i, "").trim();
export const assuntoResposta = (s: string) => `Re: ${limparAssunto(s)}`;
export const assuntoEncaminhar = (s: string) => `Enc: ${limparAssunto(s)}`;

/** Identifica a conversa: pelo primeiro Message-ID da cadeia; sem ele, pelo assunto limpo e o contato. */
export function chaveConversa(i: { messageId?: string | null; inReplyTo?: string | null; references?: string | null; assunto: string; contato: string }) {
  const refs = (i.references ?? "").split(/\s+/).filter(Boolean);
  const raiz = refs[0] ?? i.inReplyTo ?? i.messageId;
  return raiz ? `id:${raiz.replace(/[<>]/g, "")}` : `as:${limparAssunto(i.assunto).toLowerCase()}|${i.contato.toLowerCase()}`;
}

export function htmlParaTexto(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const textoParaHtml = (t: string) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">${esc(t).replace(/\n/g, "<br>")}</div>`;
export const resumo = (texto: string) => texto.replace(/\s+/g, " ").trim().slice(0, 160);

/** Cabeçalho Authentication-Results com falha de SPF, DKIM ou DMARC vira spam. */
export function pareceSpam(authResults: string | null | undefined, extra?: string | null) {
  const a = `${authResults ?? ""} ${extra ?? ""}`.toLowerCase();
  return /\b(spf|dkim|dmarc)=(fail|softfail|permerror)\b/.test(a) || /x-spam-flag:\s*yes/.test(a);
}

/** Citação de resposta: "Em 16/11/2026, Maria escreveu:" + linhas com ">". */
export function citar(de: string, quando: Date, texto: string) {
  const data = quando.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  return `\n\nEm ${data}, ${de} escreveu:\n${texto.split("\n").map((l) => `> ${l}`).join("\n")}`;
}

/** Assinatura HMAC do corpo do Worker de entrada: `${timestamp}.${corpo}` com SHA-256, em hexadecimal. */
export async function assinarEntrada(corpo: string, timestamp: string, segredo: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(`${timestamp}.${corpo}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const ESC = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkar = (linha: string) =>
  ESC(linha)
    .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1" style="color:#0b8f7c;text-decoration:none">$1</a>')
    .replace(/(^|[\s·])((?:www\.)?tipe\.digital)(?![\w.@-])/g, '$1<a href="https://$2" style="color:#0b8f7c;text-decoration:none">$2</a>');

/** Assinatura em HTML: 1ª linha é o nome (negrito), 2ª o cargo, demais linhas contatos; filete turquesa na lateral. */
export function assinaturaHtml(assinatura: string) {
  const linhas = assinatura.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return "";
  const [nome, cargo, ...resto] = linhas;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;font-family:Arial,Helvetica,sans-serif"><tr><td style="border-left:3px solid #10d1b4;padding-left:12px"><div style="font-size:15px;font-weight:700;color:#071727">${ESC(nome ?? "")}</div>${cargo ? `<div style="font-size:13px;color:#575b5f;margin-top:2px">${ESC(cargo)}</div>` : ""}${resto.length ? `<div style="font-size:13px;color:#575b5f;margin-top:6px;line-height:1.5">${resto.map(linkar).join("<br>")}</div>` : ""}</td></tr></table>`;
}

const FECHO = /(^|\n)Atenciosamente,?[ \t]*\n/;
/** Bloco de fecho que entra no editor: linha em branco, "Atenciosamente," e a assinatura da caixa. */
export const blocoAssinatura = (assinatura: string | null | undefined) => (assinatura?.trim() ? `\n\nAtenciosamente,\n${assinatura.trim()}` : "");
/** Garante o fecho com assinatura no corpo; se a pessoa já tem "Atenciosamente," no texto, não duplica. */
export const comAssinatura = (texto: string, assinatura: string | null | undefined) => (!assinatura?.trim() || FECHO.test(`${texto}\n`) ? texto : `${texto.trimEnd()}${blocoAssinatura(assinatura)}`);

/** Corpo em HTML: o que vem depois de "Atenciosamente," até a primeira linha em branco vira assinatura formatada. */
export function corpoHtml(texto: string) {
  const m = FECHO.exec(texto);
  if (!m) return textoParaHtml(texto);
  const antes = texto.slice(0, m.index);
  const resto = texto.slice(m.index + m[0].length);
  const fim = resto.search(/\n[ \t]*\n/);
  const bloco = fim === -1 ? resto : resto.slice(0, fim);
  const depois = fim === -1 ? "" : resto.slice(fim).trim();
  return textoParaHtml(antes.trimEnd()) + `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;margin-top:16px">Atenciosamente,</div>` + assinaturaHtml(bloco) + (depois ? textoParaHtml(`\n${depois}`) : "");
}
