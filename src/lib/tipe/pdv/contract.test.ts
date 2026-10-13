import { describe, expect, it } from "vitest";
import { adaptadorDemo, assinarDemo, criarPdvDemo } from "./adapters/demo.server";
import { esperaAntesDaTentativa, MAX_TENTATIVAS, verificarAdaptador } from "./contract";
import { planShare, remainingSubtotal, roundPortion, selectionSubtotal, type ShareItem } from "../bill-math";

const ctx = { restaurantId: "r-demo", slug: "demo", credenciais: null };
const SEGREDO = "segredo-de-teste-nao-usar";
const payload = { eventos: [
  { seq: 1, tipo: "abriu" as const, mesa: "7" },
  { seq: 2, tipo: "lancou" as const, mesa: "7", linha: "L1", produto: "SUC", nome: "Suco", preco: 12, qtd: 2, garcom: "Garçom Demo" },
  { seq: 3, tipo: "lancou" as const, mesa: "7", linha: "L2", produto: "MOQ", nome: "Moqueca", preco: 98, qtd: 1 },
] };

describe("contrato universal de PDV (adaptador de demonstração)", () => {
  it("passa na verificação de conformidade", () => {
    expect(verificarAdaptador(adaptadorDemo(criarPdvDemo(), SEGREDO), payload)).toEqual([]);
  });

  it("aceita webhook assinado e recusa assinatura errada ou ausente", async () => {
    const a = adaptadorDemo(criarPdvDemo(), SEGREDO);
    const corpo = JSON.stringify(payload);
    const ok = new Request("https://tipe.test/webhook", { method: "POST", headers: { "x-demo-signature": await assinarDemo(SEGREDO, corpo) } });
    const ruim = new Request("https://tipe.test/webhook", { method: "POST", headers: { "x-demo-signature": await assinarDemo("outro", corpo) } });
    expect(await a.validarWebhook(ok, corpo, null)).toBe(true);
    expect(await a.validarWebhook(ruim, corpo, null)).toBe(false);
    expect(await a.validarWebhook(new Request("https://tipe.test/webhook", { method: "POST" }), corpo, null)).toBe(false);
    // Corpo alterado depois de assinado
    expect(await a.validarWebhook(ok, corpo.replace("98", "1"), null)).toBe(false);
  });

  it("evento reenviado gera o mesmo eventId (o banco descarta o duplicado)", () => {
    const a = adaptadorDemo(criarPdvDemo(), SEGREDO);
    expect(a.receberEvento(payload).map((e) => e.eventId)).toEqual(a.receberEvento(payload).map((e) => e.eventId));
  });

  it("payload inválido é recusado", () => {
    expect(verificarAdaptador(adaptadorDemo(criarPdvDemo(), SEGREDO), { nada: true }).map((p) => p.regra)).toEqual(["tradução"]);
  });

  it("lista mesas abertas e garçons do PDV", async () => {
    const a = adaptadorDemo(criarPdvDemo(), SEGREDO);
    expect((await a.listarMesas(ctx)).map((m) => m.numero)).toEqual(["12"]);
    expect((await a.listarGarcons(ctx))[0]?.nome).toBe("Garçom Demo");
  });
});

describe("fluxo completo com o PDV fictício: conta → divisão → pagamento → baixa", () => {
  it("dois clientes dividem igualmente, a baixa falha, é refeita e a conta fecha no PDV", async () => {
    const pdv = criarPdvDemo();
    const a = adaptadorDemo(pdv, SEGREDO);
    // Conta vinda do PDV (eventos canônicos).
    const eventos = await a.buscarConta(ctx, "12");
    let itens: ShareItem[] = eventos.flatMap(({ evento }) => evento.type === "item_added"
      ? [{ code: evento.item.code ?? "", unitPrice: evento.item.unit_price, ordered: evento.item.quantity, available: evento.item.quantity }] : []);
    const totalCents = Math.round(remainingSubtotal(itens) * 100);

    // Dois pagamentos iguais.
    const pagos: { id: string; valor: number }[] = [];
    for (const nome of ["ana", "bia"]) {
      const plano = planShare(itens, { kind: "equal", parts: 1, people: 2 })!;
      const valor = selectionSubtotal(itens, plano.quantities);
      itens = itens.map((i) => ({ ...i, available: roundPortion(i.available - (plano.quantities[i.code] ?? 0)) }));
      pagos.push({ id: `pag-${nome}`, valor });
    }
    expect(Math.round(pagos.reduce((s, p) => s + p.valor, 0) * 100)).toBe(totalCents);
    expect(remainingSubtotal(itens)).toBe(0);

    // PDV fora do ar nas duas primeiras tentativas de baixa.
    pdv.falhasPendentes = 2;
    for (const p of pagos) {
      let tentativa = 0;
      let r = await a.informarPagamento(ctx, { mesa: "12", itens: {}, valor: p.valor, forma: "pix", id: p.id });
      while (!r.ok && tentativa < MAX_TENTATIVAS) {
        tentativa++;
        expect(esperaAntesDaTentativa(tentativa)).toBeGreaterThan(0);
        r = await a.informarPagamento(ctx, { mesa: "12", itens: {}, valor: p.valor, forma: "pix", id: p.id });
      }
      expect(r.ok).toBe(true);
    }
    // Reenvio da mesma baixa não duplica.
    await a.informarPagamento(ctx, { mesa: "12", itens: {}, valor: pagos[0]!.valor, forma: "pix", id: pagos[0]!.id });
    expect(pdv.contas.get("12")!.pagamentos.length).toBe(2);
    expect(await a.fecharConta(ctx, "12")).toEqual({ ok: true });
    expect((await a.listarMesas(ctx)).length).toBe(0);
  });

  it("PDV não fecha conta com saldo em aberto", async () => {
    const pdv = criarPdvDemo();
    const a = adaptadorDemo(pdv, SEGREDO);
    await a.informarPagamento(ctx, { mesa: "12", itens: {}, valor: 10, forma: "pix", id: "p1" });
    expect((await a.fecharConta(ctx, "12")).ok).toBe(false);
  });

  it("espera entre tentativas cresce e tem teto", () => {
    expect(esperaAntesDaTentativa(1)).toBe(30_000);
    expect(esperaAntesDaTentativa(2)).toBe(60_000);
    expect(esperaAntesDaTentativa(20)).toBe(30 * 60_000);
  });
});
