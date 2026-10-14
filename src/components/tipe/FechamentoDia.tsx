import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDailyClose } from "@/lib/tipe/admin.functions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** Data de hoje em Fortaleza, no formato AAAA-MM-DD. */
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());

/** Fechamento do dia: resumo para conferência e planilha para a contabilidade. */
export function FechamentoDia({ slug }: { slug: string }) {
  const [data, setData] = useState(hoje);
  const fetchClose = useServerFn(getDailyClose);
  const q = useQuery({ queryKey: ["daily-close", slug, data], queryFn: () => fetchClose({ data: { slug, date: data } }), retry: false });
  const s = q.data?.summary;

  function baixar() {
    if (!q.data) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([q.data.csv], { type: "text/csv;charset=utf-8" }));
    a.download = `fechamento-${slug}-${data}.csv`;
    a.click();
  }

  return (
    <section aria-labelledby="fechamento-title" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 id="fechamento-title" className="font-display text-lg font-bold">Fechamento do dia</h2>
          <p className="text-sm text-muted-foreground">Pagamentos da conta recebidos pela TIPE (sem gorjetas extras), por meio de pagamento.</p>
        </div>
        <label className="text-sm">Dia<Input type="date" value={data} max={hoje()} onChange={(e) => e.target.value && setData(e.target.value)} className="mt-1 h-9 w-40" /></label>
        <Button size="sm" variant="outline" disabled={!q.data} onClick={baixar}><Download className="mr-1 h-4 w-4" />Baixar planilha</Button>
      </div>
      {q.isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>}
      {q.error && <p className="mt-4 text-sm text-destructive">{(q.error as Error).message}</p>}
      {s && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Contas pagas</dt><dd className="text-right font-semibold">{s.approvedCount}</dd>
            <dt className="text-muted-foreground">Total recebido</dt><dd className="text-right font-semibold">{brl(s.gross)}</dd>
            <dt className="text-muted-foreground">Taxa de serviço incluída</dt><dd className="text-right">{brl(s.serviceFee)}</dd>
            <dt className="text-muted-foreground">Ticket médio</dt><dd className="text-right">{brl(s.averageTicket)}</dd>
            <dt className="text-muted-foreground">Pendentes</dt><dd className="text-right">{s.pending.count} · {brl(s.pending.amount)}</dd>
            <dt className="text-muted-foreground">Estornados ou contestados</dt><dd className="text-right">{s.reversed.count} · {brl(s.reversed.amount)}</dd>
            <dt className="text-muted-foreground">Pendências abertas</dt><dd className="text-right">{s.openIncidents}</dd>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Por meio de pagamento</h3>
            {s.byMethod.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pagamento confirmado neste dia.</p> : (
              <ul className="space-y-1 text-sm">{s.byMethod.map((m) => <li key={m.method} className="flex justify-between gap-2"><span>{m.label} ({m.count})</span><span className="font-semibold">{brl(m.amount)}</span></li>)}</ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
