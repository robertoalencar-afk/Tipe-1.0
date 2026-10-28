// Cálculos puros da comanda, usados na área do garçom (servidor, UI e testes).
// Sem imports de servidor: só aritmética sobre o modelo canônico de item.

export type ItemConta = {
  item_code: string;
  item_name: string;
  unit_price: number;
  ordered_quantity: number;
  reserved_portion: number;
  paid_portion: number;
};

export type ResumoMesa = {
  /** Valor total lançado na mesa. */
  total: number;
  /** Já pago pelos clientes. */
  pago: number;
  /** Reservado por pagamentos em andamento (ainda não confirmados). */
  reservado: number;
  /** Frações ainda livres para pagar. */
  disponivel: number;
  itens: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Resume a conta da mesa a partir dos itens lançados. */
export function resumoMesa(itens: ItemConta[]): ResumoMesa {
  let total = 0,
    pago = 0,
    reservado = 0,
    disponivel = 0;
  for (const i of itens) {
    total += i.unit_price * i.ordered_quantity;
    pago += i.unit_price * i.paid_portion;
    reservado += i.unit_price * i.reserved_portion;
    disponivel +=
      i.unit_price * Math.max(0, i.ordered_quantity - i.reserved_portion - i.paid_portion);
  }
  return {
    total: r2(total),
    pago: r2(pago),
    reservado: r2(reservado),
    disponivel: r2(disponivel),
    itens: itens.length,
  };
}

export type StatusMesaSalao = "livre" | "ocupada" | "pagando" | "aguardando" | "fechada";

/** Status da mesa para o mapa do salão do garçom. */
export function statusMesaSalao(
  resumo: Pick<ResumoMesa, "itens" | "disponivel" | "reservado">,
  pagamentosPendentes: number,
): StatusMesaSalao {
  if (resumo.itens === 0) return "livre";
  if (pagamentosPendentes > 0) return "aguardando";
  if (resumo.disponivel <= 0.0001) return "fechada";
  if (resumo.reservado > 0.0001) return "pagando";
  return "ocupada";
}

export type LinhaCarrinho = { code: string; qty: number; notes?: string };

/** Total do carrinho antes de lançar, dado um mapa de preços por código. */
export function totalCarrinho(linhas: LinhaCarrinho[], precoDe: (code: string) => number): number {
  return r2(linhas.reduce((s, l) => s + precoDe(l.code) * l.qty, 0));
}

/** Converte o carrinho (code → qtd) no formato aceito por pdv_launch_order, ignorando zeros. */
export function carrinhoParaPedido(
  carrinho: Record<string, number>,
  obs: Record<string, string> = {},
): LinhaCarrinho[] {
  return Object.entries(carrinho)
    .filter(([, n]) => n > 0)
    .map(([code, qty]) => {
      const nota = obs[code]?.trim();
      return nota ? { code, qty, notes: nota } : { code, qty };
    });
}

export type MesaAcompanhada = {
  number: string;
  status: StatusMesaSalao;
  total: number;
  pago: number;
  disponivel: number;
  minhaMesa: boolean;
};

export type AvisoMesa = {
  /** Chave estável para não repetir o mesmo aviso. */
  id: string;
  mesa: string;
  tipo: "quitada" | "pagamento" | "confirmar" | "nota";
  titulo: string;
  texto: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Avisos para o garçom a partir de duas leituras seguidas do salão: mesa quitada,
 * pagamento parcial e pagamento no local esperando confirmação. Só olha as mesas
 * do próprio garçom; se ele ainda não tem mesa atribuída, olha todas.
 */
export function avisosDeMudanca(antes: MesaAcompanhada[], depois: MesaAcompanhada[]): AvisoMesa[] {
  const anterior = new Map(antes.map((m) => [m.number, m]));
  const temMinhas = depois.some((m) => m.minhaMesa);
  const avisos: AvisoMesa[] = [];
  for (const m of depois) {
    if (temMinhas && !m.minhaMesa) continue;
    const a = anterior.get(m.number);
    if (!a || m.total <= 0) continue;
    if (m.status === "fechada" && a.status !== "fechada") {
      avisos.push({
        id: `${m.number}:quitada:${m.total}`,
        mesa: m.number,
        tipo: "quitada",
        titulo: `Mesa ${m.number} · Paga por completo`,
        texto: "A conta está quitada. A mesa pode ser liberada.",
      });
      continue;
    }
    if (m.status === "aguardando" && a.status !== "aguardando") {
      avisos.push({
        id: `${m.number}:confirmar:${m.pago}:${m.disponivel}`,
        mesa: m.number,
        tipo: "confirmar",
        titulo: `Mesa ${m.number} · Pagamento no local`,
        texto: "Um cliente vai pagar em dinheiro ou na maquininha. Confirme no caixa.",
      });
      continue;
    }
    const pagoAgora = r2(m.pago - a.pago);
    if (pagoAgora > 0.009) {
      avisos.push({
        id: `${m.number}:pagamento:${m.pago}`,
        mesa: m.number,
        tipo: "pagamento",
        titulo: `Mesa ${m.number} · Pagou ${brl(pagoAgora)}`,
        texto: `Faltam ${brl(m.disponivel)} para fechar a conta.`,
      });
    }
  }
  return avisos;
}

export type NotaBaixa = {
  id: string;
  stars: number;
  comment: string | null;
  table: string;
  at: string;
};

/**
 * Aviso de nota baixa (2 estrelas ou menos) para o próprio garçom. Na primeira
 * leitura (`conhecidas` nulo) nada é avisado: só as notas que chegam depois.
 */
export function avisosDeNotas(
  conhecidas: ReadonlySet<string> | null,
  notas: NotaBaixa[],
): AvisoMesa[] {
  if (!conhecidas) return [];
  return notas
    .filter((n) => n.stars <= 2 && !conhecidas.has(n.id))
    .map((n) => ({
      id: `nota:${n.id}`,
      mesa: n.table,
      tipo: "nota" as const,
      titulo: `Mesa ${n.table} · Nota ${n.stars} de 5`,
      texto: n.comment?.trim() ? `“${n.comment.trim()}”` : "O cliente não deixou comentário.",
    }));
}

/** Chave do lançamento: a mesma para o mesmo pedido (toque duplo, nova tentativa), nova quando o pedido muda. */
export type ChaveLancamento = { assinatura: string; id: string };

export function chaveLancamento(anterior: ChaveLancamento | null, pedido: unknown, novoId: () => string = () => `lanc_${crypto.randomUUID().replace(/-/g, "")}`): ChaveLancamento {
  const assinatura = JSON.stringify(pedido);
  return anterior && anterior.assinatura === assinatura ? anterior : { assinatura, id: novoId() };
}
