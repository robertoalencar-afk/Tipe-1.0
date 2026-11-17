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
const COR = { tinta: "#071727", cinza: "#5b6470", claro: "#8a93a0", turquesa: "#10d1b4", turquesaEscuro: "#0b8f7c", filete: "#e5e7eb" };
const FONTE = "font-family:Arial,Helvetica,sans-serif";
const LOGO = "https://tipe.digital/email/tipe-logo-email.png";
export const AVISO_CONFIDENCIAL = "Esta mensagem e seus anexos são confidenciais e destinados somente ao destinatário. Se a recebeu por engano, avise o remetente e apague-a.";
const urlSegura = (u: string) => (/^https:\/\/[^\s"'<>]+$/i.test(u) ? u : "");

/**
 * Assinatura em HTML, em tabela (funciona no Outlook, Gmail e Apple Mail).
 * Formato do texto: 1ª linha nome; 2ª cargo; depois contatos (e-mail, site, telefone) e, opcionalmente,
 * "CTA: texto | https://link" para o botão. Sempre fecha com a linha dos produtos e o aviso de confidencialidade.
 */
export function assinaturaHtml(assinatura: string) {
  const linhas = assinatura.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return "";
  const [nome, cargo, ...resto] = linhas;
  const cta = resto.find((l) => /^cta:/i.test(l));
  const contatos = resto.filter((l) => !/^cta:/i.test(l));
  const linhaContato = (l: string) => {
    const t = ESC(l);
    let rotulo = "";
    let valor = t;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l)) { rotulo = "E-mail"; valor = `<a href="mailto:${t}" style="color:${COR.tinta};text-decoration:none">${t}</a>`; }
    else if (/^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(l) && !/\s/.test(l)) { rotulo = "Site"; valor = `<a href="${/^https?:/i.test(l) ? t : `https://${t}`}" style="color:${COR.tinta};text-decoration:none">${t.replace(/^https?:\/\//i, "")}</a>`; }
    else if (/^(telefone|tel|fone|whatsapp)[:\s]/i.test(l) || /^\+?[\d\s().-]{8,}$/.test(l)) { const num = l.replace(/^(telefone|tel|fone|whatsapp)[:\s]*/i, ""); rotulo = /^whatsapp/i.test(l) ? "WhatsApp" : "Telefone"; valor = `<a href="tel:${ESC(num.replace(/[^\d+]/g, ""))}" style="color:${COR.tinta};text-decoration:none">${ESC(num)}</a>`; }
    return `<tr><td style="${FONTE};font-size:12px;color:${COR.claro};padding:2px 10px 2px 0;white-space:nowrap">${rotulo}</td><td style="${FONTE};font-size:13px;color:${COR.tinta};padding:2px 0">${valor}</td></tr>`;
  };
  let botao = "";
  if (cta) {
    const [texto, url] = cta.replace(/^cta:\s*/i, "").split("|").map((x) => x.trim());
    const href = urlSegura(url ?? "");
    if (texto && href) botao = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr><td style="background:${COR.tinta};border-radius:6px"><a href="${href}" style="${FONTE};display:inline-block;padding:9px 16px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none">${ESC(texto)}<span style="color:${COR.turquesa}"> &rarr;</span></a></td></tr></table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:collapse"><tr>
<td valign="top" style="padding:0 18px 0 0;border-right:3px solid ${COR.turquesa}"><a href="https://tipe.digital"><img src="${LOGO}" alt="Tipe" width="92" style="display:block;width:92px;height:auto;border:0"></a></td>
<td valign="top" style="padding:0 0 0 18px">
<div style="${FONTE};font-size:17px;font-weight:700;color:${COR.tinta};line-height:1.2">${ESC(nome ?? "")}</div>
${cargo ? `<div style="${FONTE};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COR.turquesaEscuro};margin-top:3px">${ESC(cargo)}</div>` : ""}
${contatos.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;border-collapse:collapse">${contatos.map(linhaContato).join("")}</table>` : ""}
${botao}
</td></tr>
<tr><td colspan="2" style="padding-top:16px"><div style="border-top:1px solid ${COR.filete};padding-top:10px;${FONTE};font-size:12px;color:${COR.cinza}"><strong style="color:${COR.tinta}">Tipe Pay &middot; Tipe Order &middot; Tipe Gestão</strong><br>Gorjeta, pedido e gestão do restaurante em um só lugar.</div>
<div style="${FONTE};font-size:10.5px;line-height:1.5;color:${COR.claro};margin-top:8px;max-width:460px">${ESC(AVISO_CONFIDENCIAL)}</div></td></tr></table>`;
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
