import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listWithdrawals, resolveWithdrawal } from "@/lib/tipe/waiter.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Fila de Pix para garçons (somente fundador TIPE). */
export function SaquesGarcons() {
  const list = useServerFn(listWithdrawals);
  const resolve = useServerFn(resolveWithdrawal);
  const q = useQuery({ queryKey: ["withdrawals"], queryFn: () => list() });
  const pend = (q.data ?? []).filter((w) => w.status === "requested");
  async function act(id: string, action: "paid" | "rejected") {
    const note = action === "rejected" ? window.prompt("Motivo da recusa (o garçom verá):") ?? undefined : undefined;
    try { await resolve({ data: { id, action, ...(note ? { note } : {}) } }); toast.success(action === "paid" ? "Marcado como pago" : "Saque recusado"); void q.refetch(); }
    catch (e) { toast.error((e as Error).message); }
  }
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Saques de garçons</h2>
      <p className="text-sm text-muted-foreground">Faça o Pix pelo banco da TIPE e marque como pago. Pagamentos nos dias 1 e 16.</p>
      {pend.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhum saque aguardando.</p> : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {pend.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold">{brl(w.amount)} · {w.waiter} ({w.restaurant})</p>
                <p className="text-xs text-muted-foreground">Pix {w.pixKeyType}: <span className="select-all font-mono">{w.pixKey}</span> · {w.holderName} · previsto {new Date(w.scheduledFor + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act(w.id, "paid")}>Pix feito</Button>
                <Button size="sm" variant="ghost" onClick={() => act(w.id, "rejected")}>Recusar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
