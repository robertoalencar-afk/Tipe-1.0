import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Tone } from "@/components/tipe/ds";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/tipe/payment-state";
import {
  filtrarPagamentos,
  METODO_LABEL,
  pagamentosCsv,
  type FiltroPagamentos,
  type PagamentoConta,
} from "@/lib/tipe/pagamentos-filtro";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const TOM: Partial<Record<PaymentStatus, Tone>> = {
  approved: "success",
  pending: "warning",
  cancelled: "neutral",
  failed: "neutral",
  refunded: "error",
  chargeback: "error",
};
const POR_PAGINA = 30;

/** Pagamentos da conta no período, com filtros por situação, forma e garçom, e planilha. */
export function PagamentosRelatorio({
  slug,
  days,
  pagamentos,
  garcons,
}: {
  slug: string;
  days: number;
  pagamentos: PagamentoConta[];
  garcons: { id: string; name: string }[];
}) {
  const [f, setF] = useState<FiltroPagamentos>({
    status: "todos",
    metodo: "todos",
    garcom: "todos",
  });
  const [limite, setLimite] = useState(POR_PAGINA);
  const lista = useMemo(() => filtrarPagamentos(pagamentos, f), [pagamentos, f]);
  const total = lista.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const situacoes = [...new Set(pagamentos.map((p) => p.status))];
  const metodos = [...new Set(pagamentos.map((p) => p.method))];
  const nomeGarcom = (id: string | null) =>
    garcons.find((w) => w.id === id)?.name.split(" ")[0] ?? "Sem garçom";
  const muda = (k: keyof FiltroPagamentos) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setLimite(POR_PAGINA);
  };

  function exportar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["﻿" + pagamentosCsv(lista, garcons)], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `pagamentos-${slug}-${days}d.csv`;
    a.click();
  }

  const select =
    "h-9 min-w-0 rounded-full border border-border bg-surface px-3 text-sm font-medium shadow-xs";
  return (
    <section aria-labelledby="pagamentos-title" className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="pagamentos-title" className="font-display font-semibold">
          Pagamentos da conta
        </h3>
        <span className="text-xs text-muted-foreground">
          {lista.length} {lista.length === 1 ? "pagamento" : "pagamentos"} · {brl(total)}{" "}
          confirmados
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select aria-label="Situação" className={select} value={f.status} onChange={muda("status")}>
          <option value="todos">Situações</option>
          {situacoes.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <select
          aria-label="Forma de pagamento"
          className={select}
          value={f.metodo}
          onChange={muda("metodo")}
        >
          <option value="todos">Formas</option>
          {metodos.map((m) => (
            <option key={m} value={m}>
              {METODO_LABEL[m] ?? m}
            </option>
          ))}
        </select>
        <select aria-label="Garçom" className={select} value={f.garcom} onChange={muda("garcom")}>
          <option value="todos">Garçons</option>
          {garcons.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value="sem">Sem garçom</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          className="sm:ml-auto"
          onClick={exportar}
          disabled={!lista.length}
        >
          <Download />
          Exportar
        </Button>
      </div>
      {lista.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum pagamento com esses filtros no período.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {lista.slice(0, limite).map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  Mesa {p.table} · {p.customer}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {METODO_LABEL[p.method] ?? p.method} · {nomeGarcom(p.waiter)} · {hora(p.at)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                <StatusBadge tone={TOM[p.status] ?? "neutral"}>
                  {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                </StatusBadge>
                <span className="money font-semibold sm:w-24 sm:text-right">{brl(p.amount)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {lista.length > limite && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => setLimite((n) => n + POR_PAGINA)}
        >
          Mostrar mais {Math.min(POR_PAGINA, lista.length - limite)}
        </Button>
      )}
    </section>
  );
}
