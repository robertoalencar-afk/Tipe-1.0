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
  const cents = Math.round(tip * 100);
  const waiter = Math.round(cents * TIP_SPLIT.waiter);
  return { waiter: waiter / 100, tipe: (cents - waiter) / 100 };
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
// A parte da TIPE é o resto, para que garçom + TIPE somem sempre a gorjeta exata.
export function splitGorjeta(extra: number) {
  const { waiter, tipe } = splitTip(extra);
  return { garcom: waiter, tipe, restaurante: 0 };
}

/**
 * Gorjeta extra, escolhida antes de pagar a conta. No Brasil a conta já traz a
 * taxa de serviço, então os percentuais são menores que os dos EUA. Nada vem
 * marcado: a gorjeta é opcional e o cliente escolhe.
 */
export const GORJETA_MINIMA = 2;
export const GORJETA_PERCENTUAIS = [3, 5, 8] as const;
/** Percentual em destaque ("Sugerida"), sem vir pré-selecionado. */
export const GORJETA_SUGERIDA = 5;

export type OpcaoGorjeta = { label: string; amount: number; sugerida: boolean };

/** Teto da gorjeta extra: o valor pago pela conta (nunca menos que o mínimo). */
export function gorjetaMaxima(conta: number) {
  return Math.floor((Number.isFinite(conta) ? conta : 0) * 100) / 100;
}

export function suggestedTips(conta: number): OpcaoGorjeta[] {
  const cents = Math.round((Number.isFinite(conta) ? conta : 0) * 100);
  const teto = gorjetaMaxima(conta);
  if (teto < GORJETA_MINIMA) return [];
  // Conta pequena: o menor percentual daria menos que o mínimo; usa valores fixos.
  if ((cents * GORJETA_PERCENTUAIS[0]) / 100 < GORJETA_MINIMA * 100) {
    return [2, 3, 5]
      .filter((v) => v <= teto)
      .map((v) => ({ label: brl(v), amount: v, sugerida: v === 3 }));
  }
  const vistos = new Set<number>();
  return GORJETA_PERCENTUAIS.flatMap((pct) => {
    // arredonda para o múltiplo de R$ 0,50 mais próximo, dentro do mínimo e do teto
    const raw = Math.round((cents * pct) / 100 / 50) * 50;
    const amount = Math.min(teto, Math.max(GORJETA_MINIMA, raw / 100));
    if (vistos.has(amount)) return [];
    vistos.add(amount);
    return [{ label: `${pct}%`, amount, sugerida: pct === GORJETA_SUGERIDA }];
  });
}

/** Valor digitado em "Outro valor": aceita "12,50", "12.50" e "1.234,56". */
export function lerValor(texto: string): number | null {
  const t = texto.replace(/[^\d,.]/g, "");
  if (!t) return null;
  const v = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

/** Confere a gorjeta extra contra o mínimo (R$ 2,00) e o teto (o valor da conta). */
export function validarGorjeta(valor: number | null, conta: number): string | null {
  if (valor === null || valor <= 0) return "Digite um valor";
  if (valor < GORJETA_MINIMA) return `O mínimo é ${brl(GORJETA_MINIMA)}`;
  const teto = gorjetaMaxima(conta);
  if (valor > teto + 0.005) return `O máximo é ${brl(teto)}, o valor da sua conta`;
  return null;
}

/** Link de avaliação aceito: só endereços do Google, sempre https. */
export const GOOGLE_REVIEW_URL = /^https:\/\/(g\.page|www\.google\.com|google\.com|maps\.google\.com|maps\.app\.goo\.gl|search\.google\.com|g\.co)\//;
export function isGoogleReviewUrl(url: string) {
  return url.length <= 300 && GOOGLE_REVIEW_URL.test(url);
}

