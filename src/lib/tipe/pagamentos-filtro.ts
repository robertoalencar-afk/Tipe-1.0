import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "./payment-state";

/** Pagamento da conta como aparece na lista de Relatórios. */
export type PagamentoConta = {
  id: string;
  table: string;
  customer: string;
  method: string;
  status: PaymentStatus;
  amount: number;
  at: string;
  waiter: string | null;
};

export type FiltroPagamentos = {
  status: PaymentStatus | "todos";
  metodo: string | "todos";
  /** Id do garçom, "sem" para mesa sem garçom ou "todos". */
  garcom: string | "sem" | "todos";
};

export const METODO_LABEL: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  at_establishment: "Dinheiro ou maquininha",
};

export function filtrarPagamentos(lista: PagamentoConta[], f: FiltroPagamentos): PagamentoConta[] {
  return lista.filter(
    (p) =>
      (f.status === "todos" || p.status === f.status) &&
      (f.metodo === "todos" || p.method === f.metodo) &&
      (f.garcom === "todos" || (f.garcom === "sem" ? !p.waiter : p.waiter === f.garcom)),
  );
}

const celula = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Planilha no formato que o Excel brasileiro abre direto (ponto e vírgula, vírgula decimal). */
export function pagamentosCsv(
  lista: PagamentoConta[],
  garcons: { id: string; name: string }[],
): string {
  const nome = (id: string | null) => garcons.find((w) => w.id === id)?.name ?? "";
  const linhas = lista.map((p) =>
    [
      new Date(p.at).toLocaleString("pt-BR"),
      p.table,
      p.customer,
      METODO_LABEL[p.method] ?? p.method,
      PAYMENT_STATUS_LABEL[p.status] ?? p.status,
      nome(p.waiter),
      p.amount.toFixed(2).replace(".", ","),
    ]
      .map(celula)
      .join(";"),
  );
  return ["data;mesa;cliente;forma;situacao;garcom;valor", ...linhas].join("\n");
}
