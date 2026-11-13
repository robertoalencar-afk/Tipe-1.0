import { describe, expect, it } from "vitest";
import { prepararNfcePresencial, ratearDespesasFiscais, type VendaFiscal } from "./sale";
import { prepararPagamentosFiscais, type ProvaPagamentoFiscal } from "./payments";
import type { DadosPerfilProdutoFiscal } from "./schemas";
const paymentId = "10000000-0000-0000-0000-000000000001";
const profile: DadosPerfilProdutoFiscal = {
  itemId: "20000000-0000-0000-0000-000000000001",
  validFrom: "2026-11-01",
  validUntil: null,
  ncm: "21069090",
  cfop: "5102",
  unit: "UN",
  layoutVersion: "fixture",
  tablesVersion: "fixture",
  reviewReference: "Contabilidade fictícia",
  attributes: {
    icms_origem: "0",
    icms_situacao_tributaria: "102",
    pis_situacao_tributaria: "07",
    cofins_situacao_tributaria: "07",
  },
  calculationRules: [],
};
function sale(): VendaFiscal {
  return {
    items: [{ code: "P1", name: "Produto de teste", price: 10, quantity: 2, paid: 2, reserved: 0 }],
    payments: [
      {
        id: paymentId,
        method: "at_establishment",
        status: "approved",
        amount: 20,
        service_fee: 0,
        establishment_method: "cash",
        provider: null,
        provider_order_id: null,
      },
    ],
  };
}
function prepare(s = sale(), products = [{ code: "P1", profile }]) {
  return prepararNfcePresencial({
    cnpj: "12345678000195",
    taxDate: "2026-11-11",
    sale: s,
    products,
    payments: prepararPagamentosFiscais(s, []),
  });
}
describe("preparação canônica da venda fiscal", () => {
  it("usa produtos e pagamentos reais da venda, sem criar horário antecipado", () => {
    const r = prepare();
    expect(r.amountCents).toBe(2000);
    expect(r.payload["items"]).toMatchObject([
      { quantidade_comercial: 2, valor_bruto: 20, codigo_ncm: "21069090" },
    ]);
    expect(r.payload["formas_pagamento"]).toEqual([{ forma_pagamento: "01", valor_pagamento: 20 }]);
    expect(r.payload).not.toHaveProperty("data_emissao");
  });
  it("bloqueia perfil ausente, sobreposto, vencido e operação incompatível", () => {
    expect(() => prepare(sale(), [])).toThrow("vigência");
    expect(() =>
      prepare(sale(), [
        { code: "P1", profile },
        { code: "P1", profile },
      ]),
    ).toThrow("vigência");
    expect(() =>
      prepare(sale(), [{ code: "P1", profile: { ...profile, validUntil: "2026-11-10" } }]),
    ).toThrow("vigência");
    expect(() => prepare(sale(), [{ code: "P1", profile: { ...profile, cfop: "6102" } }])).toThrow(
      "CFOP",
    );
  });
  it("não emite com diferença de valores, pagamento pendente ou itens não pagos", () => {
    const s = sale();
    s.payments[0]!.amount = 19;
    expect(() => prepare(s)).toThrow("total");
    s.payments[0]!.amount = 20;
    s.items[0]!.paid = 1;
    expect(() => prepare(s)).toThrow("integralmente");
    s.payments[0]!.status = "pending";
    expect(() => prepare(s)).toThrow("conciliação");
  });
  it("preserva tentativas falhas no histórico sem somá-las ao valor fiscal", () => {
    const s = sale();
    s.payments.push({
      ...s.payments[0]!,
      id: "10000000-0000-0000-0000-000000000002",
      status: "failed",
    });
    expect(prepare(s).amountCents).toBe(2000);
    s.payments[1]!.status = "refunded";
    expect(() => prepare(s)).toThrow("conciliação");
  });
  it("rateia somente quando há tratamento contábil explícito e conserva os centavos", () => {
    expect(ratearDespesasFiscais([100, 100, 100], 2)).toEqual([1, 1, 0]);
    expect(ratearDespesasFiscais([0, 100], 3)).toEqual([0, 3]);
    const s = sale();
    s.payments[0]!.service_fee = 2;
    s.payments[0]!.amount = 22;
    const result = prepararNfcePresencial({
      cnpj: "12345678000195",
      taxDate: "2026-11-11",
      sale: s,
      products: [{ code: "P1", profile }],
      payments: prepararPagamentosFiscais(s, []),
      serviceFee: { policy: "allocate_expenses", review: "Revisão contábil fictícia" },
    });
    expect(result.amountCents).toBe(2200);
    expect(result.payload["items"]).toMatchObject([{ valor_bruto: 20, valor_outras_despesas: 2 }]);
    expect(result.payload["formas_pagamento"]).toMatchObject([{ valor_pagamento: 22 }]);
  });
  it("não mistura automaticamente taxa de serviço e tributação dos produtos", () => {
    const s = sale();
    s.payments[0]!.service_fee = 2;
    s.payments[0]!.amount = 22;
    expect(() => prepare(s)).toThrow("taxa de serviço");
  });
  it("não reutiliza valor monetário fixo de outra venda", () => {
    expect(() =>
      prepare(sale(), [
        {
          code: "P1",
          profile: { ...profile, attributes: { ...profile.attributes, icms_valor: 10 } },
        },
      ]),
    ).toThrow("regra de cálculo");
  });
  it("calcula tributos com os valores da linha", () => {
    const p = {
      ...profile,
      attributes: { ...profile.attributes, icms_aliquota: 18 },
      calculationRules: [
        { target: "icms_base_calculo", basis: "item_gross" as const, operation: "base" as const },
        {
          target: "icms_valor",
          basis: "field" as const,
          basisField: "icms_base_calculo",
          operation: "percent" as const,
          rateField: "icms_aliquota",
        },
      ],
    };
    expect(prepare(sale(), [{ code: "P1", profile: p }]).payload["items"]).toMatchObject([
      { icms_base_calculo: 20, icms_valor: 3.6 },
    ]);
  });
});
describe("pagamento por carteira digital", () => {
  function wallet() {
    const s = sale();
    Object.assign(s.payments[0]!, {
      method: "apple_pay",
      establishment_method: null,
      provider: "pagarme",
      provider_order_id: "or_fixture",
    });
    return s;
  }
  const proof: ProvaPagamentoFiscal = {
    paymentId,
    orderId: "or_fixture",
    amountCents: 2000,
    captured: true,
    type: "credit",
    acquirerCnpj: "12345678000195",
    authorization: "AUTH-fixture",
    brand: "01",
  };
  it("usa crédito e a autorização do adquirente para Apple Pay e Google Pay", () => {
    for (const method of ["apple_pay", "google_pay"]) {
      const s = wallet();
      s.payments[0]!.method = method;
      expect(prepararPagamentosFiscais(s, [proof])[0]!.fields).toEqual({
        forma_pagamento: "03",
        tipo_integracao: "1",
        cnpj_credenciadora: proof.acquirerCnpj,
        numero_autorizacao: "AUTH-fixture",
        bandeira_operadora: "01",
      });
    }
  });
  it("não inventa autorização, adquirente, bandeira ou equivalência entre pedido e pagamento", () => {
    expect(() => prepararPagamentosFiscais(wallet(), [])).toThrow();
    expect(() => prepararPagamentosFiscais(wallet(), [{ ...proof, orderId: "outro" }])).toThrow(
      "difere",
    );
    expect(() => prepararPagamentosFiscais(wallet(), [{ ...proof, amountCents: 1999 }])).toThrow(
      "difere",
    );
    expect(() => prepararPagamentosFiscais(wallet(), [{ ...proof, brand: undefined }])).toThrow(
      "Bandeira",
    );
    expect(() => prepararPagamentosFiscais(wallet(), [{ ...proof, type: "pix" }])).toThrow(
      "difere",
    );
  });
  it("registra os dados do comprovante de POS como não integrados", () => {
    const s = sale();
    s.payments[0]!.establishment_method = "card_terminal";
    const payment = prepararPagamentosFiscais(
      s,
      [],
      [
        {
          paymentId,
          cardType: "debit",
          brand: "02",
          authorization: "AUTH-POS-fixture",
          acquirerCnpj: "12345678000195",
        },
      ],
    )[0]!;
    expect(payment.fields).toEqual({
      forma_pagamento: "04",
      tipo_integracao: "2",
      bandeira_operadora: "02",
      numero_autorizacao: "AUTH-POS-fixture",
      cnpj_credenciadora: "12345678000195",
    });
    expect(payment.amountCents).toBe(2000);
  });
  it("não inventa autorização opcional do POS nem aceita classificação de outro pagamento", () => {
    const s = sale();
    s.payments[0]!.establishment_method = "card_terminal";
    expect(
      prepararPagamentosFiscais(s, [], [{ paymentId, cardType: "credit", brand: "01" }])[0]!.fields,
    ).toEqual({ forma_pagamento: "03", tipo_integracao: "2", bandeira_operadora: "01" });
    expect(() =>
      prepararPagamentosFiscais(
        s,
        [],
        [{ paymentId: "10000000-0000-0000-0000-000000000099", cardType: "credit", brand: "01" }],
      ),
    ).toThrow("não correspondem");
    s.payments[0]!.establishment_method = "cash";
    expect(() =>
      prepararPagamentosFiscais(s, [], [{ paymentId, cardType: "credit", brand: "01" }]),
    ).toThrow("não correspondem");
  });
  it("não presume crédito ou débito para a maquininha externa", () => {
    const s = sale();
    s.payments[0]!.establishment_method = "card_terminal";
    expect(() => prepararPagamentosFiscais(s, [])).toThrow("comprovante");
  });
});
