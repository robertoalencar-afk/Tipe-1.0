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
  let total = 0, pago = 0, reservado = 0, disponivel = 0;
  for (const i of itens) {
    total += i.unit_price * i.ordered_quantity;
    pago += i.unit_price * i.paid_portion;
    reservado += i.unit_price * i.reserved_portion;
    disponivel += i.unit_price * Math.max(0, i.ordered_quantity - i.reserved_portion - i.paid_portion);
  }
  return { total: r2(total), pago: r2(pago), reservado: r2(reservado), disponivel: r2(disponivel), itens: itens.length };
}

export type StatusMesaSalao = "livre" | "ocupada" | "pagando" | "aguardando" | "fechada";

/** Status da mesa para o mapa do salão do garçom. */
export function statusMesaSalao(resumo: Pick<ResumoMesa, "itens" | "disponivel" | "reservado">, pagamentosPendentes: number): StatusMesaSalao {
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
export function carrinhoParaPedido(carrinho: Record<string, number>, obs: Record<string, string> = {}): LinhaCarrinho[] {
  return Object.entries(carrinho)
    .filter(([, n]) => n > 0)
    .map(([code, qty]) => {
      const nota = obs[code]?.trim();
      return nota ? { code, qty, notes: nota } : { code, qty };
    });
}
