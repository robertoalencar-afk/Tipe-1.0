// Matemática da conta compartilhada. Usada igualmente no navegador (para
// mostrar o valor) e no servidor (que é quem decide quanto cobrar), para que
// os dois sempre cheguem ao mesmo centavo.
//
// Frações de item têm 4 casas decimais (mesma escala de numeric(12,4) no banco).
// Dinheiro é calculado em centavos inteiros.

export const PORTION_SCALE = 10_000;
const EPS_UNITS = 1; // 0,0001 de item

const toUnits = (portion: number) => Math.round(portion * PORTION_SCALE);
const fromUnits = (units: number) => units / PORTION_SCALE;
const toCents = (money: number) => Math.round(money * 100);

export const roundPortion = (portion: number) => fromUnits(toUnits(portion));

/** Valor em centavos de `portion` de um item, arredondado ao centavo. */
function valueCents(unitPrice: number, portion: number) {
  return Math.round((toCents(unitPrice) * toUnits(portion)) / PORTION_SCALE);
}

/**
 * Quanto custa pagar `qty` de um item quando `consumed` (pago + reservado) já
 * saiu da conta. O arredondamento é cumulativo: a soma de todas as partes de
 * um item é sempre exatamente o valor do item, sem centavo perdido ou cobrado
 * a mais (ex.: R$ 10,00 em três partes = 3,33 + 3,34 + 3,33).
 */
export function itemChargeCents(unitPrice: number, consumed: number, qty: number) {
  if (qty <= 0) return 0;
  return valueCents(unitPrice, consumed + qty) - valueCents(unitPrice, consumed);
}

export type ShareItem = {
  code: string;
  unitPrice: number;
  /** Quantidade lançada no PDV. */
  ordered: number;
  /** Ainda disponível para pagamento (lançado − pago − reservado). */
  available: number;
};

/** Subtotal (R$) de uma seleção de frações, usando o arredondamento cumulativo. */
export function selectionSubtotal(items: ShareItem[], quantities: Record<string, number>) {
  let cents = 0;
  for (const item of items) {
    const qty = Math.min(roundPortion(quantities[item.code] ?? 0), roundPortion(Math.max(0, item.available)));
    if (qty <= 0) continue;
    const consumed = Math.max(0, roundPortion(item.ordered - item.available));
    cents += itemChargeCents(item.unitPrice, consumed, qty);
  }
  return cents / 100;
}

/** Valor ainda em aberto na mesa (sem taxa de serviço). */
export function remainingSubtotal(items: ShareItem[]) {
  return selectionSubtotal(items, Object.fromEntries(items.map((i) => [i.code, i.available])));
}

/** Valor total lançado na mesa (sem taxa de serviço). */
export function billSubtotal(items: ShareItem[]) {
  return items.reduce((s, i) => s + valueCents(i.unitPrice, Math.max(0, i.ordered)), 0) / 100;
}

export type ShareMode =
  /** `parts` partes iguais de uma conta dividida entre `people` pessoas. */
  | { kind: "equal"; parts: number; people: number }
  /** Percentual do valor total da conta. */
  | { kind: "percent"; value: number }
  /** Valor livre, já incluindo a taxa de serviço. */
  | { kind: "amount"; value: number }
  /** Tudo o que ainda está em aberto. */
  | { kind: "rest" };

export type SharePlan = {
  /** Frações por item, prontas para enviar ao servidor. */
  quantities: Record<string, number>;
  /** Subtotal resultante (sem taxa), em reais. */
  subtotal: number;
  /** Se esta parte quita tudo o que estava em aberto. */
  clearsBill: boolean;
};

/**
 * Converte uma forma de divisão (partes iguais, percentual, valor livre) em
 * frações dos itens disponíveis, proporcionalmente ao que está em aberto.
 * Como tudo vira frações de itens, a reserva e a proteção contra pagamento
 * duplicado continuam sendo feitas pelo banco, item a item.
 *
 * O valor resultante nunca passa do pedido; a diferença é de no máximo
 * alguns centavos para baixo. Quando a parte pedida cobre o que falta
 * (com folga de 1 centavo), a pessoa quita todo o restante, sem sobrar resíduo.
 */
export function planShare(items: ShareItem[], mode: ShareMode, serviceRate = 0): SharePlan | null {
  const open = items.filter((i) => toUnits(i.available) >= EPS_UNITS && i.unitPrice > 0);
  const remainingCents = toCents(remainingSubtotal(open));
  if (remainingCents <= 0) return null;

  let targetCents: number;
  switch (mode.kind) {
    case "rest":
      targetCents = remainingCents;
      break;
    case "equal": {
      const { parts, people } = mode;
      if (!Number.isInteger(parts) || !Number.isInteger(people) || people < 2 || people > 99 || parts < 1 || parts > people) return null;
      targetCents = Math.floor((toCents(billSubtotal(items)) * parts) / people);
      break;
    }
    case "percent": {
      if (!Number.isFinite(mode.value) || mode.value <= 0 || mode.value > 100) return null;
      targetCents = Math.floor((toCents(billSubtotal(items)) * mode.value) / 100);
      break;
    }
    case "amount": {
      if (!Number.isFinite(mode.value) || mode.value <= 0) return null;
      const rate = Number.isFinite(serviceRate) && serviceRate > 0 ? serviceRate : 0;
      // O valor digitado já inclui a taxa: o subtotal é a parte sem ela.
      targetCents = Math.floor(toCents(mode.value) / (1 + rate));
      break;
    }
  }
  if (targetCents <= 0) return null;

  if (targetCents >= remainingCents - 1) {
    const quantities = Object.fromEntries(open.map((i) => [i.code, roundPortion(i.available)]));
    return { quantities, subtotal: remainingCents / 100, clearsBill: true };
  }

  // Fração proporcional de cada item em aberto, sempre arredondada para baixo
  // para nunca cobrar acima do pedido.
  const ratio = targetCents / remainingCents;
  const quantities: Record<string, number> = {};
  for (const item of open) {
    const units = Math.floor(toUnits(item.available) * ratio);
    if (units >= EPS_UNITS) quantities[item.code] = fromUnits(units);
  }
  const subtotal = selectionSubtotal(open, quantities);
  if (subtotal <= 0) return null;
  return { quantities, subtotal, clearsBill: false };
}
