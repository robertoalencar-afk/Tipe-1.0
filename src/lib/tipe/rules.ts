// Regras de negócio TIPE (centralizadas para todos os painéis)
export const SERVICE_FEE = 0.1; // taxa de serviço 10%
export const TIP_SPLIT = { tipe: 0.3, waiter: 0.7 }; // gorjeta extra: 30% TIPE / 70% garçom

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
