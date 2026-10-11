import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listWithdrawals, resolveWithdrawal, revealWithdrawalPix } from "@/lib/tipe/waiter.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Fila de Pix para garçons (somente fundador TIPE). */
export function SaquesGarcons() {
  const list = useServerFn(listWithdrawals);
  const resolve = useServerFn(resolveWithdrawal);
  const reveal = useServerFn(revealWithdrawalPix);
  const [shown, setShown] = useState<Record<string, string>>({});
  async function show(id: string) {
    try { const r = await reveal({ data: { id } }); setShown((s) => ({ ...s, [id]: r.pixKey })); }
    catch (e) { toast.error((e as Error).message); }
  }
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
      <p className="text-sm text-muted-foreground">Lista do repasse quinzenal (dias 1 e 16). Faça o Pix pelo banco da TIPE e marque como pago. Pedidos com chave em verificação só liberam depois da quarentena.</p>
      {pend.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhum saque aguardando.</p> : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {pend.map((w) => {
            const blocked = !!w.blockedUntil && new Date(w.blockedUntil).getTime() > Date.now();
            return (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold">{brl(w.amount)} · {w.waiter} ({w.restaurant})</p>
                <p className="text-xs text-muted-foreground">Pix {w.pixKeyType}: <span className="select-all font-mono">{shown[w.id] ?? w.pixKeyMasked}</span>{!shown[w.id] && <button type="button" className="ml-1 underline" onClick={() => show(w.id)}>revelar</button>} · {w.holderName} · repasse {new Date(w.scheduledFor + "T12:00:00").toLocaleDateString("pt-BR")}{blocked ? ` · bloqueado até ${new Date(w.blockedUntil!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={blocked} onClick={() => act(w.id, "paid")}>Pix feito</Button>
                <Button size="sm" variant="ghost" onClick={() => act(w.id, "rejected")}>Recusar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
