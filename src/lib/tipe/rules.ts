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

// ---- Dados da mesa (exemplo; virão da Saipos) ----
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

const MESAS: Record<string, Mesa> = {
  "mare-alta/12": {
    restaurante: "Maré Alta",
    mesa: 12,
    garcom: "Carlos",
    itens: [
      { id: "1", nome: "Moqueca de peixe", qtd: 2, preco: 89, data: "24/09/2026", hora: "19:42" },
      { id: "2", nome: "Camarão na moranga", qtd: 1, preco: 112, data: "24/09/2026", hora: "19:45" },
      { id: "3", nome: "Caipirinha de limão", qtd: 3, preco: 24, data: "24/09/2026", hora: "19:50" },
      { id: "4", nome: "Água com gás", qtd: 2, preco: 8, data: "24/09/2026", hora: "20:05" },
      { id: "5", nome: "Pudim de leite", qtd: 1, preco: 18, data: "24/09/2026", hora: "20:40" },
    ],
  },
};

export function getMesa(restaurante: string, mesa: number): Mesa {
  const encontrada = MESAS[`${restaurante}/${mesa}`] ?? MESAS["mare-alta/12"];
  if (!encontrada) throw new Error("Mesa de demonstração não encontrada");
  return encontrada;
}

// Gorjeta extra: 70% garçom, 30% TIPE (restaurante fica com a taxa de serviço)
export function splitGorjeta(extra: number) {
  const garcom = +(extra * TIP_SPLIT.waiter).toFixed(2);
  const tipe = +(extra * TIP_SPLIT.tipe).toFixed(2);
  return { garcom, tipe, restaurante: 0 };
}
