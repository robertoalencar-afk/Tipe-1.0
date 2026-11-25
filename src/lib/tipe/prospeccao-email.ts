/**
 * E-mail de prospecção (Central > Comercial > Prospecção > E-mail).
 *
 * Feito para cair na caixa de entrada: remetente pessoa (roberto@), texto curto,
 * HTML mínimo com uma única imagem leve (GIF de ~125 KB hospedado no próprio domínio),
 * versão em texto puro, um link principal e descadastro em 1 clique (RFC 8058).
 * Sequência: e-mail 1 (D0, com GIF), lembrete 2 (D3) e 3 (D8), só para quem não respondeu.
 * Sem dependências: usado pelo servidor e pela tela (prévia).
 */

export const SITE = "https://tipe.digital";
export const GIF_URL = `${SITE}/email/tipe-conta-na-mesa.gif`;
export const REMETENTE_PADRAO = "roberto@tipe.digital";
export const LIMITE_DIA_PADRAO = 30;

export const PASSOS_EMAIL = [
  { passo: 1, dia: 0 },
  { passo: 2, dia: 3 },
  { passo: 3, dia: 8 },
] as const;

export type ProspectEmail = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  score: number;
  email_step: number;
  email_next_at: string | null;
};

/** Assunto curto, sem cara de marketing (sem caixa alta, emoji ou "grátis"). Variante A/B pelo id. */
export function assunto(passo: number, nome: string, id: string): string {
  if (passo === 2) return `Re: ${assunto(1, nome, id)}`;
  if (passo === 3) return `Último contato, ${nome}`;
  const b = (id.charCodeAt(id.length - 1) || 0) % 2 === 1;
  return b ? `Uma ideia para as mesas do ${nome}` : `${nome}: a conta trava no fim do jantar?`;
}

function corpo(passo: number, nome: string, remetente: string): string[] {
  if (passo === 2)
    return [
      `Oi, ${nome}!`,
      "Só para não se perder: em 15 minutos eu mostro como o cliente paga sozinho pela mesa, sem esperar a maquininha.",
      "Quinta ou sexta funciona para vocês?",
      remetente,
    ];
  if (passo === 3)
    return [
      `Oi, ${nome}.`,
      "Último contato, prometo. Se agilizar a conta na mesa entrar nos planos, é só responder este e-mail.",
      `Sucesso aí no ${nome}!`,
      remetente,
    ];
  return [
    `Olá, equipe do ${nome},`,
    `Aqui é ${remetente}, da Tipe, de Fortaleza.`,
    "Vocês conhecem bem o fim do jantar: a mesa pede a conta, o garçom vai buscar a maquininha, um quer dividir, outro quer pagar no Pix… e a mesa fica parada esperando.",
    "Com a Tipe, o cliente escaneia o QR Code da mesa, escolhe os itens dele e paga pelo celular, com Pix, Apple Pay ou Google Pay. A gorjeta vai direto para o garçom, e o caixa vê tudo baixado na hora.",
    "[GIF]",
    "• Mesa liberada mais cedo, sem fila na maquininha\n• Conta dividida sem confusão\n• Garçom livre para atender, não para cobrar",
    `Em 1 minuto dá para ver como fica para o cliente: ${SITE.replace("https://", "")}/simulador`,
    `Posso passar no ${nome} esta semana e mostrar em 15 minutos? Se preferir, me responda com o melhor dia e horário.`,
    `${remetente}\nTipe · tipe.digital`,
    "P.S. Estamos escolhendo os primeiros restaurantes parceiros da Tipe em Fortaleza.",
  ];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONTE =
  "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a";

export function rodape(nome: string, linkSair: string) {
  return `Você recebeu este e-mail porque o ${nome} divulga este endereço como contato. Para não receber mais, responda SAIR ou acesse ${linkSair}`;
}

/** Monta assunto, texto puro e HTML mínimo. `linkSair` é a página de descadastro deste destinatário. */
export function montarEmail(i: {
  passo: number;
  prospect: { id: string; name: string };
  remetente: string;
  linkSair: string;
}) {
  const nome = i.prospect.name.trim();
  const partes = corpo(i.passo, nome, i.remetente);
  const texto = [...partes.filter((p) => p !== "[GIF]"), rodape(nome, i.linkSair)].join("\n\n");
  const linkSim = `${SITE}/simulador?utm_source=email&utm_medium=prospeccao&utm_campaign=fortaleza`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:560px;padding:16px;${FONTE}">
${partes
  .map((p) => {
    if (p === "[GIF]")
      return `<p style="margin:0 0 16px"><a href="${linkSim}"><img src="${GIF_URL}" width="560" alt="Como o cliente paga a conta na mesa com a Tipe: escaneia o QR Code, escolhe os itens e paga com Pix" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:10px"></a></p>`;
    const h = esc(p)
      .replace(/\n/g, "<br>")
      .replace(
        "tipe.digital/simulador",
        `<a href="${linkSim}" style="color:#0f7a6c">tipe.digital/simulador</a>`,
      );
    return `<p style="margin:0 0 16px">${h}</p>`;
  })
  .join("\n")}
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#777">Você recebeu este e-mail porque o ${esc(nome)} divulga este endereço como contato. Para não receber mais, responda SAIR ou <a href="${esc(i.linkSair)}" style="color:#777">clique aqui</a>.</p>
</div></body></html>`;
  return { assunto: assunto(i.passo, nome, i.prospect.id), texto, html };
}

/** Quem recebe hoje: tem e-mail, não está encerrado, não terminou a sequência e já venceu. Maior score primeiro. */
export function loteEmail<T extends ProspectEmail>(lista: T[], agora: Date, limite: number): T[] {
  const ativos = new Set(["novo", "em_contato"]);
  return lista
    .filter(
      (p) =>
        p.email &&
        ativos.has(p.status) &&
        p.email_step < 3 &&
        (!p.email_next_at || new Date(p.email_next_at) <= agora),
    )
    .sort((a, b) => b.email_step - a.email_step || b.score - a.score)
    .slice(0, Math.max(0, limite));
}

/** Próximo agendamento depois de enviar o passo `passo`. */
export function aposEmail(passo: number, agora: Date) {
  const atual = PASSOS_EMAIL.find((p) => p.passo === passo);
  const prox = PASSOS_EMAIL.find((p) => p.passo === passo + 1);
  return {
    email_step: passo,
    email_last_at: agora.toISOString(),
    email_next_at:
      prox && atual
        ? new Date(agora.getTime() + (prox.dia - atual.dia) * 864e5).toISOString()
        : null,
  };
}

// ---------------- Token de descadastro (HMAC, Web Crypto: roda no Worker) ----------------

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export async function tokenSair(prospectId: string, segredo: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(
    await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`sair:${prospectId}`)),
  ).slice(0, 32);
}

export async function tokenSairValido(prospectId: string, token: string, segredo: string) {
  const certo = await tokenSair(prospectId, segredo);
  if (certo.length !== token.length) return false;
  let d = 0;
  for (let i = 0; i < certo.length; i++) d |= certo.charCodeAt(i) ^ token.charCodeAt(i);
  return d === 0;
}

export const linkSair = (prospectId: string, token: string) =>
  `${SITE}/api/public/sair?p=${prospectId}&t=${token}`;
