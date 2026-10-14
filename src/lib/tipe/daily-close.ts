// Fechamento diário do restaurante: o resumo que a contabilidade e sistemas de
// retaguarda (no formato de um "resumo diário de vendas") consomem.
// Só pagamentos da CONTA do restaurante; gorjetas extras ficam fora (regra do AGENTS.md).

export type ClosePayment = {
  id: string;
  created_at: string;
  table_number: string;
  customer_name: string;
  payment_method: string;
  establishment_method: string | null;
  status: string;
  amount: number;
  service_fee_amount: number | null;
};

export type CloseIncident = { kind: string; amount: number | null; resolved: boolean };

/** Dia comercial em Fortaleza (UTC−3, sem horário de verão): [início, fim) em ISO UTC. */
export function businessDayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Data inválida");
  const start = new Date(`${date}T00:00:00-03:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Data inválida");
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  card: "Cartão (online)",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cash: "Dinheiro",
  card_terminal: "Maquininha",
  at_establishment: "No estabelecimento",
};

const methodKey = (p: ClosePayment) => (p.payment_method === "at_establishment" ? p.establishment_method ?? "at_establishment" : p.payment_method);
const c = (v: number) => Math.round(v * 100);

export function buildDailyClose(payments: ClosePayment[], incidents: CloseIncident[] = []) {
  const approved = payments.filter((p) => p.status === "approved");
  const byMethod = new Map<string, { count: number; cents: number }>();
  for (const p of approved) {
    const k = methodKey(p);
    const cur = byMethod.get(k) ?? { count: 0, cents: 0 };
    byMethod.set(k, { count: cur.count + 1, cents: cur.cents + c(p.amount) });
  }
  const sum = (ps: ClosePayment[]) => ps.reduce((s, p) => s + c(p.amount), 0) / 100;
  const grossCents = approved.reduce((s, p) => s + c(p.amount), 0);
  const feeCents = approved.reduce((s, p) => s + c(p.service_fee_amount ?? 0), 0);
  const pending = payments.filter((p) => p.status === "pending");
  const reversed = payments.filter((p) => p.status === "refunded" || p.status === "chargeback");
  const notCompleted = payments.filter((p) => p.status === "failed" || p.status === "cancelled");
  return {
    approvedCount: approved.length,
    gross: grossCents / 100,
    serviceFee: feeCents / 100,
    netOfServiceFee: (grossCents - feeCents) / 100,
    averageTicket: approved.length ? Math.round(grossCents / approved.length) / 100 : 0,
    byMethod: [...byMethod.entries()].sort((a, b) => b[1].cents - a[1].cents).map(([k, v]) => ({ method: k, label: METHOD_LABEL[k] ?? k, count: v.count, amount: v.cents / 100 })),
    pending: { count: pending.length, amount: sum(pending) },
    reversed: { count: reversed.length, amount: sum(reversed) },
    notCompleted: notCompleted.length,
    openIncidents: incidents.filter((i) => !i.resolved).length,
  };
}

const money = (v: number) => v.toFixed(2).replace(".", ",");
const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV (separador ";", vírgula decimal) pronto para planilha brasileira. */
export function dailyCloseCsv(restaurant: string, date: string, payments: ClosePayment[], incidents: CloseIncident[] = []) {
  const r = buildDailyClose(payments, incidents);
  const lines: string[] = [
    `Fechamento do dia;${cell(restaurant)};${date}`,
    "",
    "resumo;valor",
    `Contas pagas;${r.approvedCount}`,
    `Total recebido;${money(r.gross)}`,
    `Taxa de serviço incluída;${money(r.serviceFee)}`,
    `Total sem taxa de serviço;${money(r.netOfServiceFee)}`,
    `Ticket médio;${money(r.averageTicket)}`,
    `Pendentes (${r.pending.count});${money(r.pending.amount)}`,
    `Estornados ou contestados (${r.reversed.count});${money(r.reversed.amount)}`,
    `Não concluídos;${r.notCompleted}`,
    `Pendências financeiras abertas;${r.openIncidents}`,
    "",
    "meio de pagamento;quantidade;valor",
    ...r.byMethod.map((m) => `${cell(m.label)};${m.count};${money(m.amount)}`),
    "",
    "hora;mesa;cliente;meio;situação;valor;taxa de serviço;id",
    ...[...payments].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => [
      new Date(p.created_at).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" }),
      cell(p.table_number), cell(p.customer_name), cell(METHOD_LABEL[methodKey(p)] ?? methodKey(p)), p.status,
      money(p.amount), money(p.service_fee_amount ?? 0), p.id,
    ].join(";")),
  ];
  return "﻿" + lines.join("\n") + "\n";
}
