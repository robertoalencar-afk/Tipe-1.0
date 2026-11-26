import { z } from "zod";
import type { AdaptadorPdv, EventoRecebido } from "../types";

// Adaptador "API padrão TIPE": para sistemas que enviam eventos já no
// formato canônico da TIPE. Não representa nenhum PDV de terceiro.
// Autenticação (preferida): HMAC-SHA256 do corpo com carimbo de tempo, sem o segredo trafegar:
//   chave  = sha256_hex(segredo)            (o servidor só guarda esse hash)
//   x-tipe-timestamp: segundos Unix (tolerância de 5 min, contra reenvio)
//   x-tipe-signature: v1=hex(hmac_sha256(chave, `${timestamp}.${corpo}`))
// Legado (aceito durante a transição, registrado como evento de segurança): x-tipe-secret.
//
// Aviso de pagamento (saída): quando o restaurante cadastra uma URL de aviso, cada
// pagamento aprovado da conta é enviado por POST para essa URL, assinado do mesmo
// jeito (x-tipe-timestamp + x-tipe-signature com a mesma chave). Novas tentativas
// e pendência no painel ficam com a fila pdv_payment_outbox (outbox.server.ts).
// Sem URL de aviso, o sistema consulta GET /api/public/pdv/pagamentos.

const Mesa = z.object({ number: z.string().trim().min(1).max(16).regex(/^[0-9A-Za-z]+$/), external_id: z.string().max(80).nullish() });
const Evento = z.discriminatedUnion("type", [
  z.object({ type: z.literal("table_opened"), table: Mesa }),
  z.object({ type: z.literal("table_closed"), table: Mesa }),
  z.object({
    type: z.literal("item_added"), table: Mesa,
    item: z.object({
      external_id: z.string().max(80).nullish(), code: z.string().trim().max(32).nullish(),
      name: z.string().trim().min(1).max(80), unit_price: z.number().min(0).max(100000), quantity: z.number().int().min(1).max(999),
      notes: z.string().max(140).nullish(), waiter_name: z.string().max(80).nullish(),
    }).refine((i) => i.code || i.external_id, "Item sem identificação"),
  }),
  z.object({
    type: z.literal("item_cancelled"), table: Mesa, reason: z.string().max(120).optional(),
    item: z.object({ external_id: z.string().max(80).nullish(), code: z.string().trim().max(32).nullish(), quantity: z.number().int().min(1).max(999) }),
  }),
]);
const Payload = z.object({ events: z.array(z.object({ event_id: z.string().trim().min(1).max(120) }).and(Evento)).min(1).max(100) });

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Assinatura v1 do webhook "API padrão TIPE" (exportada para testes e para o guia de integração). */
export async function assinarApiTipe(chaveHex: string, timestamp: string, corpo: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(chaveHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${timestamp}.${corpo}`)));
}

/** URL de aviso aceita: https, host público com nome (sem IP literal, localhost ou porta). */
export function validarUrlAviso(url: string): string | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return "Endereço inválido"; }
  if (u.protocol !== "https:") return "Use um endereço https://";
  if (u.username || u.password) return "Não inclua usuário ou senha no endereço";
  if (u.port) return "Use a porta padrão do https";
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[0-9.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return "Use um domínio público, não um IP";
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h === "tipe.digital" || h.endsWith(".tipe.digital")) return "Use o domínio público do seu sistema";
  if (u.toString().length > 300) return "Endereço longo demais";
  return null;
}

export type AvisoPagamento = {
  event_id: string;
  type: "payment.approved";
  restaurant: string;
  table: string;
  payment_id: string;
  amount: number;
  method: string;
  items: { code: string; quantity: number }[];
  sent_at: string;
};

export function montarAvisoPagamento(slug: string, p: { mesa: string; itens: Record<string, number>; valor: number; forma: string; id: string }, agora = new Date()): AvisoPagamento {
  return {
    event_id: `pay-${p.id}`,
    type: "payment.approved",
    restaurant: slug,
    table: p.mesa,
    payment_id: p.id,
    amount: Math.round(p.valor * 100) / 100,
    method: p.forma,
    items: Object.entries(p.itens).map(([code, quantity]) => ({ code, quantity: Number(quantity) })),
    sent_at: agora.toISOString(),
  };
}

/** Envia um corpo assinado para a URL de aviso. 2xx = recebido. */
export async function enviarAssinado(url: string, chaveHex: string, corpo: string, f: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; erro: string }> {
  const invalida = validarUrlAviso(url);
  if (invalida) return { ok: false, erro: invalida };
  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const res = await f(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "content-type": "application/json", "user-agent": "Tipe-Webhook/1", "x-tipe-timestamp": ts, "x-tipe-signature": `v1=${await assinarApiTipe(chaveHex, ts, corpo)}` },
      body: corpo,
    });
    if (res.status >= 200 && res.status < 300) return { ok: true };
    return { ok: false, erro: `O sistema respondeu ${res.status}` };
  } catch (e) {
    const nome = (e as Error)?.name;
    return { ok: false, erro: nome === "TimeoutError" || nome === "AbortError" ? "O sistema não respondeu em 8 segundos" : "Não foi possível conectar ao sistema" };
  }
}

export const apiTipe: AdaptadorPdv = {
  id: "api_tipe",
  nome: "API padrão TIPE",
  visivelParaRestaurante: false,
  capacidades: () => ({ webhook: true, consultaPeriodica: false, devolvePagamento: true, exigeCredenciais: false }),
  async conectar(_ctx, credenciais) {
    const url = credenciais["callback_url"];
    if (!url) return { ok: true };
    const erro = validarUrlAviso(url);
    return erro ? { ok: false, erro } : { ok: true };
  },
  // Com URL de aviso: envia um "ping" assinado. Sem URL: nada a testar do nosso lado.
  async testarConexao(ctx) {
    const url = ctx.credenciais?.["callback_url"];
    if (!url) return { ok: true };
    if (!ctx.segredoHash) return { ok: false, erro: "Gere o segredo da API TIPE" };
    const corpo = JSON.stringify({ event_id: `ping-${crypto.randomUUID()}`, type: "ping", restaurant: ctx.slug, sent_at: new Date().toISOString() });
    return enviarAssinado(url, ctx.segredoHash, corpo);
  },
  avisoAtivo: (ctx) => !!ctx.credenciais?.["callback_url"],
  desconectar: async () => {},
  listarMesas: async () => [],
  buscarConta: async () => [],
  async validarWebhook(request, corpo, segredoHash) {
    if (!segredoHash) return false;
    const assinatura = request.headers.get("x-tipe-signature");
    if (assinatura !== null) {
      const ts = request.headers.get("x-tipe-timestamp") ?? "";
      const t = Number(ts);
      if (!/^\d{9,11}$/.test(ts) || Math.abs(Date.now() / 1000 - t) > 300) return false;
      const m = /^v1=([0-9a-f]{64})$/.exec(assinatura);
      if (!m) return false;
      return safeEq(m[1]!, await assinarApiTipe(segredoHash, ts, corpo));
    }
    const segredo = request.headers.get("x-tipe-secret") ?? "";
    if (!/^whsec_[0-9a-f]{48}$/.test(segredo)) return false;
    const h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo)));
    if (!safeEq(h, segredoHash)) return false;
    try {
      const { logSecurityEvent } = await import("@/lib/tipe/security.server");
      await logSecurityEvent({ action: "pdv_webhook_legacy_secret", resource: "api/pdv/api_tipe", result: "ok" });
    } catch { /* log é acessório */ }
    return true;
  },
  receberEvento(payload) {
    const p = Payload.parse(payload);
    return p.events.map(({ event_id, ...evento }): EventoRecebido => ({ eventId: event_id, evento: evento as EventoRecebido["evento"] }));
  },
  sincronizar: async () => [],
  async informarPagamento(ctx, pagamento) {
    const url = ctx.credenciais?.["callback_url"];
    if (!url) return { ok: false, erro: "Sem URL de aviso cadastrada" };
    if (!ctx.segredoHash) return { ok: false, erro: "Segredo da API TIPE ausente" };
    return enviarAssinado(url, ctx.segredoHash, JSON.stringify(montarAvisoPagamento(ctx.slug, pagamento)));
  },
};
