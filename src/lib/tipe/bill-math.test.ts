import { describe, expect, it } from "vitest";
import { billSubtotal, itemChargeCents, planShare, remainingSubtotal, roundPortion, selectionSubtotal, type ShareItem } from "./bill-math";

/** Simula o banco: aplica o pagamento às frações disponíveis (como register_table_payment). */
function pay(items: ShareItem[], quantities: Record<string, number>) {
  const charged = selectionSubtotal(items, quantities);
  const next = items.map((i) => {
    const q = roundPortion(quantities[i.code] ?? 0);
    if (q > i.available + 1e-9) throw new Error(`item ${i.code} não está mais disponível`);
    return { ...i, available: roundPortion(i.available - q) };
  });
  return { charged, items: next };
}

const cents = (v: number) => Math.round(v * 100);

describe("arredondamento cumulativo por item", () => {
  it("três terços de R$ 10,00 somam exatamente R$ 10,00", () => {
    const a = itemChargeCents(10, 0, 0.3333);
    const b = itemChargeCents(10, 0.3333, 0.3333);
    const c = itemChargeCents(10, 0.6666, 0.3334);
    expect([a, b, c]).toEqual([333, 334, 333]);
    expect(a + b + c).toBe(1000);
  });

  it("modelo antigo (preço × fração) perdia um centavo", () => {
    const antigo = [0.3333, 0.3333, 0.3334].reduce((s, q) => s + Math.round(10 * q * 100) / 100, 0);
    expect(cents(antigo)).toBe(999);
  });

  it("frações irregulares de um item caro somam o valor do item", () => {
    const parts = [0.1234, 0.3333, 0.25, 0.0001, 0.2932];
    let consumed = 0;
    let total = 0;
    for (const p of parts) { total += itemChargeCents(189.9, consumed, p); consumed = roundPortion(consumed + p); }
    expect(consumed).toBe(1);
    expect(total).toBe(18990);
  });

  it("quantidade zero ou negativa não cobra nada", () => {
    expect(itemChargeCents(50, 0, 0)).toBe(0);
    expect(itemChargeCents(50, 0, -1)).toBe(0);
  });
});

const mesa = (): ShareItem[] => [
  { code: "chopp", unitPrice: 14.9, ordered: 6, available: 6 },
  { code: "picanha", unitPrice: 129.9, ordered: 1, available: 1 },
  { code: "agua", unitPrice: 6.5, ordered: 3, available: 3 },
];

describe("divisão igualitária", () => {
  it("quatro pessoas quitam a conta inteira, sem resíduo e sem centavo a mais", () => {
    let items = mesa();
    const total = cents(billSubtotal(items));
    let pago = 0;
    for (let i = 0; i < 4; i++) {
      const plan = planShare(items, { kind: "equal", parts: 1, people: 4 })!;
      expect(plan).not.toBeNull();
      const r = pay(items, plan.quantities);
      pago += cents(r.charged);
      items = r.items;
    }
    expect(pago).toBe(total);
    expect(remainingSubtotal(items)).toBe(0);
    expect(items.every((i) => i.available === 0)).toBe(true);
  });

  it("cada parte fica dentro de poucos centavos da parte ideal", () => {
    const items = mesa();
    const ideal = cents(billSubtotal(items)) / 3;
    const plan = planShare(items, { kind: "equal", parts: 1, people: 3 })!;
    expect(Math.abs(cents(plan.subtotal) - ideal)).toBeLessThanOrEqual(3);
    expect(cents(plan.subtotal)).toBeLessThanOrEqual(Math.ceil(ideal));
  });

  it("pagar duas partes de cinco", () => {
    const items = mesa();
    const plan = planShare(items, { kind: "equal", parts: 2, people: 5 })!;
    expect(Math.abs(cents(plan.subtotal) - cents(billSubtotal(items)) * 0.4)).toBeLessThanOrEqual(3);
  });

  it("rejeita divisões inválidas", () => {
    expect(planShare(mesa(), { kind: "equal", parts: 0, people: 4 })).toBeNull();
    expect(planShare(mesa(), { kind: "equal", parts: 5, people: 4 })).toBeNull();
    expect(planShare(mesa(), { kind: "equal", parts: 1, people: 1 })).toBeNull();
    expect(planShare(mesa(), { kind: "equal", parts: 1.5, people: 4 })).toBeNull();
  });
});

describe("três clientes pagando partes distintas da comanda", () => {
  it("item, valor livre e restante convivem e quitam a mesa", () => {
    let items = mesa();
    const total = cents(billSubtotal(items));
    // Ana paga a picanha inteira.
    let r = pay(items, { picanha: 1 });
    let pago = cents(r.charged);
    items = r.items;
    // Bruno paga R$ 30,00 (sem taxa).
    const plano = planShare(items, { kind: "amount", value: 30 })!;
    expect(cents(plano.subtotal)).toBeLessThanOrEqual(3000);
    expect(cents(plano.subtotal)).toBeGreaterThanOrEqual(2990);
    r = pay(items, plano.quantities);
    pago += cents(r.charged);
    items = r.items;
    // Carla paga o restante.
    const resto = planShare(items, { kind: "rest" })!;
    expect(resto.clearsBill).toBe(true);
    r = pay(items, resto.quantities);
    pago += cents(r.charged);
    expect(pago).toBe(total);
    expect(remainingSubtotal(r.items)).toBe(0);
  });
});

describe("valor livre e percentual", () => {
  it("valor livre desconta a taxa de serviço embutida", () => {
    const plan = planShare(mesa(), { kind: "amount", value: 110 }, 0.1)!;
    expect(cents(plan.subtotal)).toBeLessThanOrEqual(10000);
    expect(cents(plan.subtotal)).toBeGreaterThan(9990);
  });

  it("valor acima do saldo vira 'pagar o restante'", () => {
    const items = mesa();
    const plan = planShare(items, { kind: "amount", value: 10_000 })!;
    expect(plan.clearsBill).toBe(true);
    expect(plan.subtotal).toBe(remainingSubtotal(items));
  });

  it("percentual de 50% da conta", () => {
    const items = mesa();
    const plan = planShare(items, { kind: "percent", value: 50 })!;
    expect(Math.abs(cents(plan.subtotal) - cents(billSubtotal(items)) / 2)).toBeLessThanOrEqual(3);
  });

  it("rejeita valores inválidos", () => {
    expect(planShare(mesa(), { kind: "amount", value: 0 })).toBeNull();
    expect(planShare(mesa(), { kind: "amount", value: Number.NaN })).toBeNull();
    expect(planShare(mesa(), { kind: "percent", value: 101 })).toBeNull();
  });

  it("mesa sem saldo não gera plano", () => {
    const quitada = mesa().map((i) => ({ ...i, available: 0 }));
    expect(planShare(quitada, { kind: "rest" })).toBeNull();
  });
});

describe("concorrência na divisão", () => {
  it("uma parte calculada antes de outro pagamento não consegue pagar o que já foi liquidado", () => {
    const items = mesa();
    const planoBruno = planShare(items, { kind: "rest" })!;
    // Ana paga tudo antes de Bruno enviar.
    const depoisDaAna = pay(items, planShare(items, { kind: "rest" })!.quantities).items;
    expect(() => pay(depoisDaAna, planoBruno.quantities)).toThrow(/não está mais disponível/);
  });
});
