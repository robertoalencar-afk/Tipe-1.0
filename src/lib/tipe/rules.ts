// Regras de negócio TIPE (centralizadas para todos os painéis)
export const SERVICE_FEE = 0.1; // taxa de serviço sugerida padrão (o restaurante pode mudar)
export const SERVICE_FEE_MAX = 0.2; // teto: 20% da parte paga
export const SERVICE_FEE_QUICK = [0, 5, 10, 12, 15];

/** Escolha do cliente sobre a taxa da própria parte. */
export type ServiceFeeChoice = { kind: "suggested" } | { kind: "percent"; value: number } | { kind: "amount"; value: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula a taxa de serviço sobre a parte paga. Retorna null se a escolha for
 * inválida (negativa, não numérica ou acima de 20% da parte).
 */
export function resolveServiceFee(subtotal: number, suggestedRate: number, choice: ServiceFeeChoice): { amount: number; changed: boolean } | null {
  const rate = Math.min(Math.max(Number.isFinite(suggestedRate) ? suggestedRate : SERVICE_FEE, 0), SERVICE_FEE_MAX);
  const suggested = r2(subtotal * rate);
  const max = r2(subtotal * SERVICE_FEE_MAX);
  if (choice.kind === "suggested") return { amount: suggested, changed: false };
  const v = Number(choice.value);
  if (!Number.isFinite(v) || v < 0) return null;
  const amount = choice.kind === "percent" ? (v > SERVICE_FEE_MAX * 100 ? NaN : r2(subtotal * v / 100)) : r2(v);
  if (!Number.isFinite(amount) || amount > max) return null;
  return { amount, changed: amount !== suggested };
}
export const TIP_SPLIT = { tipe: 0.3, waiter: 0.7 }; // gorjeta extra recebida pela TIPE: 70% equipe / 30% plataforma

export type BillItem = { id: string; name: string; qty: number; unitPrice: number; orderedBy: string; orderedAt: string };
export type TableBill = {
  restaurant: { id: string; name: string };
  table: { id: string; number: string };
  waiter: { id: string; name: string };
  items: BillItem[];
  paid: number;
  source: "saipos" | "simulado";
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function totals(items: BillItem[], qtys?: Record<string, number>) {
  const subtotal = items.reduce((s, i) => s + (qtys ? (qtys[i.id] ?? 0) : i.qty) * i.unitPrice, 0);
  const service = +(subtotal * SERVICE_FEE).toFixed(2);
  return { subtotal, service, total: +(subtotal + service).toFixed(2) };
}

export function splitTip(tip: number) {
  const waiter = +(tip * TIP_SPLIT.waiter).toFixed(2);
  return { waiter, tipe: +(tip - waiter).toFixed(2) };
}

// ---- Dados da mesa (exemplo; virão do sistema do restaurante) ----
export type ItemConta = {
  id: string;
  nome: string;
  qtd: number;
  preco: number;
  data: string;
  hora: string;
};

export type Mesa = {
  restaurante: string;
  mesa: number;
  garcom: string;
  itens: ItemConta[];
};

// Gorjeta extra: a TIPE recebe e separa 70% para a equipe e 30% para a plataforma.
export function splitGorjeta(extra: number) {
  const garcom = +(extra * TIP_SPLIT.waiter).toFixed(2);
  const tipe = +(extra * TIP_SPLIT.tipe).toFixed(2);
  return { garcom, tipe, restaurante: 0 };
}
