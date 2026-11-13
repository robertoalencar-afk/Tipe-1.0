import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fingerprintFiscal, prepararVendaFiscalServidor } from "./source.server";
const rid = "20000000-0000-0000-0000-000000000001";
const saleId = "30000000-0000-0000-0000-000000000001";
const paymentId = "40000000-0000-0000-0000-000000000001";
const menuId = "50000000-0000-0000-0000-000000000001";
const scope = {
  restaurantId: rid,
  slug: "fiscal-fixture",
  registeredCnpj: "12345678000195",
  environment: "homologacao" as const,
  saleId,
};
function fixture() {
  const source = {
    id: saleId,
    source_kind: "table_bill",
    source_reference: "sessao-fixture",
    table_number: "3",
    created_at: "2026-11-11T12:00:00Z",
    items_snapshot: [
      { code: "P1", name: "Produto de teste", price: 10, quantity: 2, paid: 2, reserved: 0 },
    ],
    payments_snapshot: [
      {
        id: paymentId,
        method: "at_establishment",
        status: "approved",
        amount: 20,
        service_fee: 0,
        establishment_method: "cash",
        provider: null as string | null,
        provider_order_id: null as string | null,
      },
    ],
  };
  const cfg = {
    cnpj: "12345678000195",
    uf: "CE",
    tax_regime: "1",
    time_zone: "America/Fortaleza",
    updated_at: "2026-11-11T12:00:00Z",
    enabled: false,
    configuration_revision: "80000000-0000-0000-0000-000000000001",
    acquirer_cnpj: "12345678000195",
    service_fee_policy: "blocked",
    service_fee_review: null,
  };
  const payment = {
    id: paymentId,
    payment_method: "at_establishment",
    status: "approved",
    amount: 20,
    service_fee_amount: 0,
    establishment_method: "cash",
    provider: null as string | null,
    provider_order_id: null as string | null,
  };
  const profile = {
    id: "60000000-0000-0000-0000-000000000001",
    menu_item_id: menuId,
    valid_from: "2026-01-01",
    valid_until: null,
    ncm: "21069090",
    cfop: "5102",
    unit: "UN",
    layout_version: "fixture",
    tables_version: "fixture",
    review_reference: "Revisao ficticia",
    attributes: {
      icms_origem: "0",
      icms_situacao_tributaria: "102",
      pis_situacao_tributaria: "07",
      cofins_situacao_tributaria: "07",
    },
    calculation_rules: [],
  };
  const scopes: unknown[][] = [];
  const rows: Record<string, unknown> = {
    fiscal_sales: source,
    restaurant_fiscal_settings: cfg,
    archived_payments: [payment],
    pdv_menu_items: [{ id: menuId, code: "P1" }],
    fiscal_product_profiles: [profile],
  };
  const from = vi.fn((table: string) => {
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn((key, value) => {
        scopes.push([table, key, value]);
        return q;
      }),
      lte: vi.fn(() => q),
      or: vi.fn(() => q),
      in: vi.fn(() => q),
      single: async () => ({ data: rows[table], error: null }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve({ data: rows[table], error: null })),
    };
    return q;
  });
  const deps = {
    now: () => new Date("2026-11-11T15:00:00Z"),
    providerKey: vi.fn().mockResolvedValue("chave-ficticia"),
    proof: vi.fn().mockResolvedValue({
      paymentId,
      orderId: "or_fixture",
      amountCents: 2000,
      captured: true,
      type: "credit",
      acquirerCnpj: cfg.acquirer_cnpj,
      authorization: "AUTH-fixture",
      brand: "01",
    }),
  };
  return {
    source,
    cfg,
    payment,
    profile,
    scopes,
    rows,
    deps,
    db: { from } as unknown as SupabaseClient<Database>,
  };
}
describe("preparação fiscal a partir da venda canônica", () => {
  it("confere a venda e mantém todas as leituras no escopo do restaurante e ambiente", async () => {
    const f = fixture();
    const result = await prepararVendaFiscalServidor(f.db, scope, f.deps);
    expect(result.prepared.amountCents).toBe(2000);
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    for (const table of [
      "fiscal_sales",
      "restaurant_fiscal_settings",
      "pdv_menu_items",
      "fiscal_product_profiles",
    ])
      expect(f.scopes).toContainEqual([table, "restaurant_id", rid]);
    expect(f.scopes).toContainEqual(["restaurant_fiscal_settings", "environment", "homologacao"]);
    expect(f.scopes).toContainEqual(["fiscal_product_profiles", "uf", "CE"]);
    expect(f.scopes).toContainEqual(["fiscal_product_profiles", "tax_regime", "1"]);
    expect(f.scopes).toContainEqual(["archived_payments", "restaurant_slug", "fiscal-fixture"]);
    expect(f.scopes).toContainEqual(["archived_payments", "payment_target", "restaurant"]);
    expect(f.deps.proof).not.toHaveBeenCalled();
  });
  it("bloqueia estorno e divergência posteriores ao snapshot antes de consultar o adquirente", async () => {
    const f = fixture();
    f.payment.status = "refunded";
    await expect(prepararVendaFiscalServidor(f.db, scope, f.deps)).rejects.toThrow("conciliação");
    expect(f.deps.proof).not.toHaveBeenCalled();
    f.payment.status = "approved";
    f.payment.amount = 19;
    await expect(prepararVendaFiscalServidor(f.db, scope, f.deps)).rejects.toThrow("mudou");
  });
  it("não emite por outra empresa nem com pagamento arquivado desaparecido", async () => {
    const f = fixture();
    await expect(
      prepararVendaFiscalServidor(f.db, { ...scope, registeredCnpj: "11222333000181" }, f.deps),
    ).rejects.toThrow("CNPJ");
    f.rows["archived_payments"] = [];
    await expect(prepararVendaFiscalServidor(f.db, scope, f.deps)).rejects.toThrow("mudou");
  });
  it("confere carteira na conta do restaurante, sem usar uma chave da Tipe como alternativa", async () => {
    const f = fixture();
    Object.assign(f.source.payments_snapshot[0]!, {
      method: "apple_pay",
      establishment_method: null,
      provider: "pagarme",
      provider_order_id: "or_fixture",
    });
    Object.assign(f.payment, {
      payment_method: "apple_pay",
      establishment_method: null,
      provider: "pagarme",
      provider_order_id: "or_fixture",
    });
    const result = await prepararVendaFiscalServidor(f.db, scope, f.deps);
    expect(f.deps.providerKey).toHaveBeenCalledWith(rid);
    expect(f.deps.proof).toHaveBeenCalledWith(
      { paymentId, orderId: "or_fixture", amountCents: 2000, acquirerCnpj: "12345678000195" },
      "chave-ficticia",
    );
    expect(result.prepared.payload["formas_pagamento"]).toMatchObject([
      { forma_pagamento: "03", numero_autorizacao: "AUTH-fixture" },
    ]);
    f.deps.providerKey.mockResolvedValue(null);
    await expect(prepararVendaFiscalServidor(f.db, scope, f.deps)).rejects.toThrow(
      "deste restaurante",
    );
  });
  it("não altera o snapshot persistido e muda a conferência quando os dados mudam", async () => {
    const f = fixture();
    const before = JSON.stringify(f.source);
    const first = await prepararVendaFiscalServidor(f.db, scope, f.deps);
    f.cfg.updated_at = "2026-11-11T13:00:00Z";
    const second = await prepararVendaFiscalServidor(f.db, scope, f.deps);
    expect(JSON.stringify(f.source)).toBe(before);
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });
  it("usa a classificação explícita da maquininha e não consulta uma API de cartão", async () => {
    const f = fixture();
    f.source.payments_snapshot[0]!.establishment_method = "card_terminal";
    f.payment.establishment_method = "card_terminal";
    const result = await prepararVendaFiscalServidor(
      f.db,
      { ...scope, manualPayments: [{ paymentId, cardType: "credit", brand: "06" }] },
      f.deps,
    );
    expect(result.prepared.payload["formas_pagamento"]).toMatchObject([
      { forma_pagamento: "03", tipo_integracao: "2", bandeira_operadora: "06" },
    ]);
    expect(f.deps.proof).not.toHaveBeenCalled();
    expect(result.manualProofs).toHaveLength(1);
  });
  it("não trata taxa de serviço desconhecida como zero", async () => {
    const f = fixture();
    Object.assign(f.source.payments_snapshot[0]!, { service_fee: null });
    await expect(prepararVendaFiscalServidor(f.db, scope, f.deps)).rejects.toThrow(
      "não tem todos os dados",
    );
  });
  it("o hash é estável para ordens diferentes de propriedades", async () => {
    expect(await fingerprintFiscal({ a: 1, b: { c: 2, d: 3 } })).toBe(
      await fingerprintFiscal({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });
});
