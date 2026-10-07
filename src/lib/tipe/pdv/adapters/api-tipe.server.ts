import { z } from "zod";
import type { AdaptadorPdv, EventoRecebido } from "../types";

// Adaptador "API padrão TIPE": para sistemas que enviam eventos já no
// formato canônico da TIPE. Não representa nenhum PDV de terceiro.
// Autenticação: cabeçalho x-tipe-secret com o segredo gerado pelo admin TIPE.

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

export const apiTipe: AdaptadorPdv = {
  id: "api_tipe",
  nome: "API padrão TIPE",
  visivelParaRestaurante: false,
  capacidades: () => ({ webhook: true, consultaPeriodica: false, devolvePagamento: false, exigeCredenciais: false }),
  conectar: async () => ({ ok: true }),
  testarConexao: async () => ({ ok: true }),
  desconectar: async () => {},
  listarMesas: async () => [],
  buscarConta: async () => [],
  async validarWebhook(request, _corpo, segredoHash) {
    const segredo = request.headers.get("x-tipe-secret") ?? "";
    if (!segredoHash || !/^whsec_[0-9a-f]{48}$/.test(segredo)) return false;
    const h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo)));
    return safeEq(h, segredoHash);
  },
  receberEvento(payload) {
    const p = Payload.parse(payload);
    return p.events.map(({ event_id, ...evento }): EventoRecebido => ({ eventId: event_id, evento: evento as EventoRecebido["evento"] }));
  },
  sincronizar: async () => [],
  informarPagamento: async () => ({ ok: true }),
};
