import { describe, expect, it } from "vitest";
import { isGoogleReviewUrl, lerValor, suggestedTips, validarGorjeta } from "./rules";
import { buildDailyClose, businessDayRange, dailyCloseCsv, type ClosePayment } from "./daily-close";
import { buildReceipt, maskEmail, portionLabel } from "./receipt";
import { proximoEstadoBaixa } from "./pdv/outbox";
import { MAX_TENTATIVAS } from "./pdv/contract";

describe("gorjeta extra sugerida", () => {
  it("3%, 5% e 8% do valor pago, em centavos, com 5% em destaque", () => {
    expect(suggestedTips(126)).toEqual([
      { label: "3%", amount: 3.78, sugerida: false },
      { label: "5%", amount: 6.3, sugerida: true },
      { label: "8%", amount: 10.08, sugerida: false },
    ]);
  });
  it("percentual abaixo de R$ 2,00 não é oferecido (sobra Outro valor)", () => {
    expect(suggestedTips(50).map((s) => s.label)).toEqual(["5%", "8%"]);
    expect(suggestedTips(16.39)).toEqual([]);
  });
  it("sem conta (ou abaixo do mínimo) não sugere nada", () => {
    expect(suggestedTips(0)).toEqual([]);
    expect(suggestedTips(1.99)).toEqual([]);
    expect(suggestedTips(Number.NaN)).toEqual([]);
  });
});

describe("outro valor de gorjeta", () => {
  it("lê valores em reais", () => {
    expect(lerValor("12,50")).toBe(12.5);
    expect(lerValor("R$ 1.234,56")).toBe(1234.56);
    expect(lerValor("7.5")).toBe(7.5);
    expect(lerValor("")).toBeNull();
  });
  it("mínimo de R$ 2,00 e máximo igual ao valor da conta", () => {
    expect(validarGorjeta(1.99, 100)).toMatch(/mínimo/);
    expect(validarGorjeta(2, 100)).toBeNull();
    expect(validarGorjeta(100, 100)).toBeNull();
    expect(validarGorjeta(100.01, 100)).toMatch(/máximo/);
    expect(validarGorjeta(null, 100)).toBe("Digite um valor");
  });
});

describe("link de avaliação no Google", () => {
  it("aceita links do Google", () => {
    for (const u of [
      "https://g.page/r/CabcDEF/review",
      "https://maps.app.goo.gl/AbC123",
      "https://search.google.com/local/writereview?placeid=X",
      "https://www.google.com/maps/place/x",
    ])
      expect(isGoogleReviewUrl(u)).toBe(true);
  });
  it("recusa outros domínios, http e truques de domínio", () => {
    for (const u of [
      "http://g.page/r/x",
      "https://g.page.evil.com/x",
      "https://evil.com/https://g.page/",
      "javascript:alert(1)",
      "https://google.com.evil.io/",
    ])
      expect(isGoogleReviewUrl(u)).toBe(false);
  });
});

const pag = (o: Partial<ClosePayment>): ClosePayment => ({
  id: o.id ?? Math.random().toString(36).slice(2),
  created_at: o.created_at ?? "2026-10-13T23:30:00.000Z",
  table_number: "4",
  customer_name: "Ana Lima",
  payment_method: "pix",
  establishment_method: null,
  status: "approved",
  amount: 100,
  service_fee_amount: 10,
  ...o,
});

describe("fechamento do dia", () => {
  it("dia comercial de Fortaleza vai de 03:00 UTC a 03:00 UTC", () => {
    expect(businessDayRange("2026-10-13")).toEqual({
      start: "2026-10-13T03:00:00.000Z",
      end: "2026-10-14T03:00:00.000Z",
    });
    expect(() => businessDayRange("13/10/2026")).toThrow(/Data inválida/);
  });
  it("soma por meio, separa pendentes, estornos e não concluídos", () => {
    const r = buildDailyClose(
      [
        pag({ amount: 100.1, service_fee_amount: 9.1 }),
        pag({
          payment_method: "at_establishment",
          establishment_method: "cash",
          amount: 50.2,
          service_fee_amount: 4.56,
        }),
        pag({
          payment_method: "at_establishment",
          establishment_method: "card_terminal",
          amount: 33.3,
          service_fee_amount: 3.03,
        }),
        pag({ status: "pending", amount: 20 }),
        pag({ status: "refunded", amount: 40 }),
        pag({ status: "failed", amount: 10 }),
      ],
      [
        { kind: "refund", amount: 40, resolved: false },
        { kind: "stuck_pending", amount: 5, resolved: true },
      ],
    );
    expect(r.approvedCount).toBe(3);
    expect(r.gross).toBe(183.6);
    expect(r.serviceFee).toBe(16.69);
    expect(r.netOfServiceFee).toBe(166.91);
    expect(r.averageTicket).toBe(61.2);
    expect(r.byMethod.map((m) => m.label)).toEqual(["Pix", "Dinheiro", "Maquininha"]);
    expect(r.pending).toEqual({ count: 1, amount: 20 });
    expect(r.reversed).toEqual({ count: 1, amount: 40 });
    expect(r.notCompleted).toBe(1);
    expect(r.openIncidents).toBe(1);
  });
  it("planilha usa ';', vírgula decimal, horário de Fortaleza e escapa texto", () => {
    const csv = dailyCloseCsv('Bar; do "Zé"', "2026-10-13", [
      pag({ customer_name: "Ana; Lima", created_at: "2026-10-13T23:30:00.000Z" }),
    ]);
    expect(csv.startsWith('﻿Fechamento do dia;"Bar; do ""Zé""";2026-10-13')).toBe(true);
    expect(csv).toContain("Total recebido;100,00");
    expect(csv).toContain('20:30;4;"Ana; Lima";Pix;approved;100,00;10,00;');
  });
});

describe("comprovante", () => {
  it("frações legíveis", () => {
    expect([1, 2, 0.5, 0.3333, 0.25, 1.5, 0.37].map(portionLabel)).toEqual([
      "1",
      "2",
      "½",
      "⅓",
      "¼",
      "1 + ½",
      "37%",
    ]);
  });
  it("monta itens com nomes, total e referência curta", () => {
    const r = buildReceipt({
      restaurant: "Maré Alta",
      table: "12",
      customer: "Ana Lima",
      createdAt: "2026-10-13T23:41:00.000Z",
      paymentMethod: "pix",
      itemQuantities: { moq: 0.5, suc: 1, sumiu: 1, zero: 0 },
      itemNames: { moq: "Moqueca", suc: "Suco" },
      amount: 67.1,
      serviceFee: 6.1,
      paymentId: "8f2a91c0-0000-4000-8000-000000000000",
    });
    expect(r.lines.map((l) => `${l.portion} ${l.name}`)).toEqual([
      "½ Moqueca",
      "1 Suco",
      "1 Item da conta",
    ]);
    expect(r.total).toBe(67.1);
    expect(r.reference).toBe("8F2A91C0");
    expect(r.paidAt).toBe("13/10/2026, 20:41");
  });
  it("e-mail mascarado na confirmação", () => {
    expect(maskEmail("ana.lima@gmail.com")).toBe("an******@gmail.com");
    expect(maskEmail("x")).toBe("");
  });
});

describe("fila de baixa no PDV", () => {
  it("baixa aceita encerra o item", () =>
    expect(proximoEstadoBaixa({ attempts: 0, suporta: true, resultado: { ok: true } })).toEqual({
      status: "done",
    }));
  it("PDV sem baixa automática é ignorado sem erro", () =>
    expect(proximoEstadoBaixa({ attempts: 0, suporta: false, resultado: null }).status).toBe(
      "skipped",
    ));
  it("falha agenda nova tentativa com espera crescente", () => {
    const r = proximoEstadoBaixa({
      attempts: 1,
      suporta: true,
      resultado: { ok: false, erro: "timeout" },
      agora: Date.UTC(2026, 9, 13, 12),
    });
    expect(r).toEqual({
      status: "pending",
      attempts: 2,
      nextAttemptAt: "2026-10-13T12:01:00.000Z",
      lastError: "timeout",
    });
  });
  it("depois do limite de tentativas vira falha (gera pendência no caixa)", () => {
    expect(
      proximoEstadoBaixa({
        attempts: MAX_TENTATIVAS - 1,
        suporta: true,
        resultado: { ok: false, erro: "fora do ar" },
      }),
    ).toEqual({ status: "failed", attempts: MAX_TENTATIVAS, lastError: "fora do ar" });
  });
});
