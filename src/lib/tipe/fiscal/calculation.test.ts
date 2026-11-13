import { describe, expect, it } from "vitest";
import { calcularTributos, type RegraCalculoFiscal } from "./calculation";
const source = { grossCents: 10000, expensesCents: 1000, quantity: 2 };
const icms: RegraCalculoFiscal[] = [
  { target: "icms_base_calculo", basis: "item_gross", operation: "base" },
  {
    target: "icms_valor",
    basis: "field",
    basisField: "icms_base_calculo",
    operation: "percent",
    rateField: "icms_aliquota",
  },
];
describe("aritmética fiscal declarativa", () => {
  it("calcula com a alíquota revisada, sem selecionar alíquotas por conta própria", () => {
    expect(calcularTributos({ icms_aliquota: 18 }, icms, source)).toMatchObject({
      icms_base_calculo: 100,
      icms_valor: 18,
    });
    expect(calcularTributos({ icms_aliquota: 12 }, icms, source)["icms_valor"]).toBe(12);
  });
  it("não trata valor ausente como zero", () => {
    expect(() => calcularTributos({}, icms, source)).toThrow("não informado");
  });
  it("mantém os atributos de entrada intactos", () => {
    const a = { icms_aliquota: 18 };
    calcularTributos(a, icms, source);
    expect(a).toEqual({ icms_aliquota: 18 });
  });
  it("arredonda uma vez no valor da linha em centavos", () => {
    expect(
      calcularTributos({ icms_aliquota: 17 }, icms, { ...source, grossCents: 199 })["icms_valor"],
    ).toBe(0.34);
  });
  it("usa despesas na base apenas quando a regra revisada manda", () => {
    const rules: RegraCalculoFiscal[] = [{ ...icms[0]!, basis: "item_with_expenses" }, icms[1]!];
    expect(calcularTributos({ icms_aliquota: 18 }, rules, source)["icms_valor"]).toBe(19.8);
  });
  it("aplica redução e tributos já calculados nas bases de acordo com o perfil", () => {
    const r: RegraCalculoFiscal[] = [
      ...icms,
      {
        target: "ibs_cbs_base_calculo",
        basis: "item_gross",
        operation: "base",
        subtractFields: ["icms_valor"],
      },
      {
        target: "cbs_valor",
        basis: "field",
        basisField: "ibs_cbs_base_calculo",
        operation: "percent",
        rateField: "cbs_aliquota",
      },
    ];
    expect(calcularTributos({ icms_aliquota: 18, cbs_aliquota: 0.9 }, r, source)).toMatchObject({
      ibs_cbs_base_calculo: 82,
      cbs_valor: 0.74,
    });
  });
  it("suporta soma de componentes monetários sem código executável", () => {
    const r: RegraCalculoFiscal[] = [
      {
        target: "ibs_valor_total",
        basis: "field",
        basisField: "ibs_uf_valor",
        operation: "base",
        addFields: ["ibs_mun_valor"],
      },
    ];
    expect(
      calcularTributos({ ibs_uf_valor: 5.6, ibs_mun_valor: 0.4 }, r, source)["ibs_valor_total"],
    ).toBe(6);
  });
  it("aceita multiplicação por quantidade com precisão decimal", () => {
    const r: RegraCalculoFiscal[] = [
      {
        target: "imposto_importacao_valor",
        basis: "quantity",
        operation: "multiply",
        rateField: "imposto_importacao_aliquota",
      },
    ];
    expect(
      calcularTributos({ imposto_importacao_aliquota: 3.005 }, r, { ...source, quantity: 2.5 })[
        "imposto_importacao_valor"
      ],
    ).toBe(7.51);
  });
  it("bloqueia base negativa, redução e percentual inválidos", () => {
    expect(() => calcularTributos({ icms_aliquota: 101 }, icms, source)).toThrow("cem por cento");
    expect(() =>
      calcularTributos(
        { icms_valor: 101 },
        [
          {
            target: "ibs_cbs_base_calculo",
            basis: "item_gross",
            operation: "base",
            subtractFields: ["icms_valor"],
          },
        ],
        source,
      ),
    ).toThrow("negativa");
  });
  it("bloqueia escrita sobre preços e dados da empresa", () => {
    expect(() =>
      calcularTributos(
        {},
        [
          { target: "valor_unitario_comercial", basis: "item_gross", operation: "base" },
        ] as unknown as RegraCalculoFiscal[],
        source,
      ),
    ).toThrow();
  });
  it("bloqueia referências futuras e ciclos", () => {
    expect(() => calcularTributos({ icms_aliquota: 18 }, [icms[1]!, icms[0]!], source)).toThrow(
      "fora de ordem",
    );
    expect(() =>
      calcularTributos(
        { icms_valor: 0 },
        [{ target: "icms_valor", basis: "field", basisField: "icms_valor", operation: "base" }],
        source,
      ),
    ).toThrow("circular");
  });
});
