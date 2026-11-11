import { describe, expect, it } from "vitest";
import {
  applyGuaranteeWebhook,
  guaranteeOutcome,
  settleGuarantee,
  type GuaranteeState,
} from "./garantia";

const start = new Date("2026-11-07T23:00:00Z");
const antes = (h: number) => new Date(start.getTime() - h * 3_600_000);
const paga: GuaranteeState = { status: "paga", amountCents: 4000, seenEventIds: ["p1"] };
const fim = (event: Parameters<typeof guaranteeOutcome>[0]["event"], at: Date) =>
  guaranteeOutcome({ event, start, at, refundCutoffMin: 120 });

describe("garantia: desfechos", () => {
  it("cancelamento dentro do prazo devolve tudo", () => {
    const r = settleGuarantee(paga, fim("cancelada_cliente", antes(5)));
    expect(r.state.status).toBe("devolvida");
    expect(r.refundCents).toBe(4000);
  });

  it("cancelamento fora do prazo retém", () => {
    const r = settleGuarantee(paga, fim("cancelada_cliente", antes(0.5)));
    expect(r.state.status).toBe("retida");
    expect(r.refundCents).toBe(0);
  });

  it("não comparecimento retém", () => {
    expect(settleGuarantee(paga, fim("nao_compareceu", antes(-1))).state.status).toBe("retida");
  });

  it("restaurante cancelando devolve mesmo em cima da hora", () => {
    const r = settleGuarantee(paga, fim("cancelada_restaurante", antes(0.1)));
    expect(r.refundCents).toBe(4000);
  });

  it("crédito em conta: conta maior que a garantia", () => {
    const r = settleGuarantee(paga, fim("sentada", start), 25000);
    expect(r).toMatchObject({ creditUsedCents: 4000, billToPayCents: 21000, refundCents: 0 });
    expect(r.state.status).toBe("creditada");
  });

  it("conta menor que a garantia devolve a diferença", () => {
    const r = settleGuarantee(paga, fim("sentada", start), 2500);
    expect(r).toMatchObject({ creditUsedCents: 2500, billToPayCents: 0, refundCents: 1500 });
  });

  it("conta igual à garantia zera tudo", () => {
    expect(settleGuarantee(paga, "credito", 4000)).toMatchObject({
      creditUsedCents: 4000,
      billToPayCents: 0,
      refundCents: 0,
    });
  });

  it("garantia não paga não gera estorno nem crédito", () => {
    const r = settleGuarantee({ ...paga, status: "aguardando" }, "devolvida", 3000);
    expect(r).toMatchObject({ refundCents: 0, creditUsedCents: 0, billToPayCents: 3000 });
  });

  it("fechar duas vezes não devolve duas vezes", () => {
    const a = settleGuarantee(paga, "devolvida");
    expect(settleGuarantee(a.state, "devolvida").refundCents).toBe(0);
  });
});

describe("garantia: webhooks do gateway", () => {
  const nova: GuaranteeState = { status: "aguardando", amountCents: 4000, seenEventIds: [] };

  it("aprovado marca como paga", () => {
    const r = applyGuaranteeWebhook(nova, {
      id: "e1",
      type: "pagamento_aprovado",
      amountCents: 4000,
    });
    expect(r.state.status).toBe("paga");
  });

  it("mesmo webhook duas vezes não muda nada", () => {
    const a = applyGuaranteeWebhook(nova, {
      id: "e1",
      type: "pagamento_aprovado",
      amountCents: 4000,
    });
    const b = applyGuaranteeWebhook(a.state, {
      id: "e1",
      type: "pagamento_aprovado",
      amountCents: 4000,
    });
    expect(b).toMatchObject({ changed: false, reason: "duplicado" });
    expect(b.state).toBe(a.state);
  });

  it("falha e depois nova tentativa aprovada", () => {
    const a = applyGuaranteeWebhook(nova, {
      id: "e1",
      type: "pagamento_recusado",
      amountCents: 4000,
    });
    expect(a.state.status).toBe("falhou");
    const b = applyGuaranteeWebhook(a.state, {
      id: "e2",
      type: "pagamento_aprovado",
      amountCents: 4000,
    });
    expect(b.state.status).toBe("paga");
  });

  it("recusa atrasada depois de aprovado é ignorada", () => {
    const r = applyGuaranteeWebhook(paga, {
      id: "e9",
      type: "pagamento_recusado",
      amountCents: 4000,
    });
    expect(r).toMatchObject({ changed: false, reason: "fora_de_ordem" });
    expect(r.state.status).toBe("paga");
  });

  it("valor diferente do esperado não confirma", () => {
    const r = applyGuaranteeWebhook(nova, {
      id: "e1",
      type: "pagamento_aprovado",
      amountCents: 400,
    });
    expect(r).toMatchObject({ changed: false, reason: "valor_divergente" });
  });

  it("estorno confirmado fecha como devolvida", () => {
    const r = applyGuaranteeWebhook(paga, {
      id: "r1",
      type: "estorno_confirmado",
      amountCents: 4000,
    });
    expect(r.state.status).toBe("devolvida");
  });
});
