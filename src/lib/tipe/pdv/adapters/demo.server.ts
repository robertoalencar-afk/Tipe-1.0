import type { AdaptadorPdv, ContextoAdaptador, EventoRecebido } from "../types";

// ADAPTADOR DE DEMONSTRAÇÃO, com um PDV fictício em memória.
// Serve para testar o fluxo completo (webhook assinado → eventos canônicos →
// pagamento → baixa no PDV, inclusive com falha) sem nenhum sistema real.
// NÃO está em registry.server.ts e nunca deve ir para produção: os dados são inventados.

type ItemDemo = { linha: string; produto: string; nome: string; preco: number; qtd: number; garcom: string };
type ContaDemo = { mesa: string; itens: ItemDemo[]; pagamentos: { id: string; valor: number }[]; fechada: boolean };

export type PdvDemo = {
  contas: Map<string, ContaDemo>;
  /** Quantas próximas chamadas de baixa devem falhar (simula PDV fora do ar). */
  falhasPendentes: number;
};

export function criarPdvDemo(): PdvDemo {
  const contas = new Map<string, ContaDemo>();
  contas.set("12", { mesa: "12", fechada: false, pagamentos: [], itens: [
    { linha: "L1", produto: "CHP", nome: "Chope 300 ml", preco: 14.9, qtd: 4, garcom: "Garçom Demo" },
    { linha: "L2", produto: "PIC", nome: "Picanha (demo)", preco: 129.9, qtd: 1, garcom: "Garçom Demo" },
  ] });
  return { contas, falhasPendentes: 0 };
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
export async function assinarDemo(segredo: string, corpo: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(corpo)));
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Payload do PDV fictício: { evento, sequencia, mesa, linha? } */
type PayloadDemo = { eventos: Array<{ seq: number; tipo: "abriu" | "lancou" | "cancelou" | "fechou"; mesa: string; linha?: string; produto?: string; nome?: string; preco?: number; qtd?: number; garcom?: string }> };

function traduzir(p: PayloadDemo): EventoRecebido[] {
  if (!p || !Array.isArray(p.eventos)) throw new Error("payload inválido");
  return p.eventos.map((e): EventoRecebido => {
    const table = { number: String(e.mesa) };
    const eventId = `demo-${e.seq}`;
    switch (e.tipo) {
      case "abriu": return { eventId, evento: { type: "table_opened", table } };
      case "fechou": return { eventId, evento: { type: "table_closed", table } };
      case "lancou": return { eventId, evento: { type: "item_added", table, item: { external_id: e.linha ?? null, code: e.produto ?? null, name: e.nome ?? "Item", unit_price: Number(e.preco ?? 0), quantity: Number(e.qtd ?? 1), waiter_name: e.garcom ?? null } } };
      case "cancelou": return { eventId, evento: { type: "item_cancelled", table, item: { external_id: e.linha ?? null, code: e.produto ?? null, quantity: Number(e.qtd ?? 1) } } };
      default: throw new Error("tipo desconhecido");
    }
  });
}

export function adaptadorDemo(pdv: PdvDemo, segredo: string): AdaptadorPdv & {
  fecharConta(ctx: ContextoAdaptador, mesa: string): Promise<{ ok: true } | { ok: false; erro: string }>;
  listarGarcons(ctx: ContextoAdaptador): Promise<{ externalId: string; nome: string }[]>;
} {
  return {
    id: "demo",
    nome: "PDV de demonstração",
    visivelParaRestaurante: false,
    capacidades: () => ({ webhook: true, consultaPeriodica: true, devolvePagamento: true, exigeCredenciais: false }),
    conectar: async () => ({ ok: true }),
    testarConexao: async () => ({ ok: true }),
    desconectar: async () => {},
    listarMesas: async () => [...pdv.contas.values()].filter((c) => !c.fechada).map((c) => ({ numero: c.mesa, externalId: `mesa-${c.mesa}` })),
    async buscarConta(_ctx, mesa) {
      const c = pdv.contas.get(mesa);
      if (!c) return [];
      return c.itens.map((i): EventoRecebido => ({ eventId: `snap-${mesa}-${i.linha}-${i.qtd}`, evento: { type: "item_added", table: { number: mesa }, item: { external_id: i.linha, code: i.produto, name: i.nome, unit_price: i.preco, quantity: i.qtd, waiter_name: i.garcom } } }));
    },
    async validarWebhook(request, corpo) {
      const assinatura = request.headers.get("x-demo-signature") ?? "";
      return /^[0-9a-f]{64}$/.test(assinatura) && safeEq(assinatura, await assinarDemo(segredo, corpo));
    },
    receberEvento: (payload) => traduzir(payload as PayloadDemo),
    sincronizar(ctx, mesa) { return this.buscarConta(ctx, mesa); },
    async informarPagamento(_ctx, pagamento) {
      if (pdv.falhasPendentes > 0) { pdv.falhasPendentes--; return { ok: false, erro: "PDV de demonstração indisponível" }; }
      const c = pdv.contas.get(pagamento.mesa);
      if (!c) return { ok: false, erro: "Mesa não encontrada no PDV" };
      // Idempotente: o mesmo pagamento informado duas vezes não duplica a baixa.
      if (!c.pagamentos.some((p) => p.id === pagamento.id)) c.pagamentos.push({ id: pagamento.id, valor: pagamento.valor });
      return { ok: true };
    },
    async fecharConta(_ctx, mesa) {
      const c = pdv.contas.get(mesa);
      if (!c) return { ok: false, erro: "Mesa não encontrada no PDV" };
      const total = c.itens.reduce((s, i) => s + Math.round(i.preco * 100) * i.qtd, 0);
      const pago = c.pagamentos.reduce((s, p) => s + Math.round(p.valor * 100), 0);
      if (pago < total) return { ok: false, erro: "Ainda há saldo em aberto" };
      c.fechada = true;
      return { ok: true };
    },
    listarGarcons: async () => [{ externalId: "G1", nome: "Garçom Demo" }],
  };
}
