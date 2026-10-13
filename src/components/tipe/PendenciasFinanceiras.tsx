import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaymentIncidents, resolvePaymentIncident, type PaymentIncident } from "@/lib/tipe/incidents.functions";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TITULO: Record<PaymentIncident["kind"], string> = {
  refund: "Pagamento estornado",
  chargeback: "Pagamento contestado",
  amount_mismatch: "Valor pago diferente do cobrado",
  paid_after_release: "Pagamento confirmado depois de liberado",
  stuck_pending: "Pagamento sem confirmação",
  pdv_writeback_failed: "Baixa no sistema do restaurante falhou",
};

const ORIENTACAO: Record<PaymentIncident["kind"], string> = {
  refund: "O valor voltou para o cliente. Se a conta precisava ser paga, cobre de novo no caixa.",
  chargeback: "O titular do cartão contestou a compra. Acompanhe a disputa no painel da Pagar.me.",
  amount_mismatch: "O provedor informou um valor diferente do que a TIPE cobrou. Confira no painel da Pagar.me antes de liberar a mesa.",
  paid_after_release: "O dinheiro entrou depois que os itens voltaram para a conta. Confira se outra pessoa pagou os mesmos itens e devolva o excedente.",
  stuck_pending: "O provedor ainda não confirmou. Confira no painel da Pagar.me se o pagamento existe.",
  pdv_writeback_failed: "O pagamento foi aprovado, mas não foi possível dar baixa no seu sistema. Dê baixa manual.",
};

function useIncidents(slug: string, enabled: boolean) {
  const fetchIncidents = useServerFn(getPaymentIncidents);
  return useQuery({ queryKey: ["incidents", slug], queryFn: () => fetchIncidents({ data: { slug } }), enabled, refetchInterval: 30000 });
}

/** Aviso curto no topo do painel quando há pendências abertas. */
export function AvisoPendencias({ slug, enabled, onOpen }: { slug: string; enabled: boolean; onOpen: () => void }) {
  const q = useIncidents(slug, enabled);
  const n = q.data?.length ?? 0;
  if (!enabled || n === 0) return null;
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
      <strong>{n === 1 ? "1 pendência financeira" : `${n} pendências financeiras`}</strong>
      <span className="text-muted-foreground">precisa{n === 1 ? "" : "m"} da sua atenção.</span>
      <button className="ml-auto font-semibold underline" onClick={onOpen}>Ver no caixa</button>
    </div>
  );
}

/** Lista completa, com registro de como cada pendência foi tratada. */
export function PendenciasFinanceiras({ slug, enabled }: { slug: string; enabled: boolean }) {
  const q = useIncidents(slug, enabled);
  const resolve = useServerFn(resolvePaymentIncident);
  const qc = useQueryClient();
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  if (!enabled || !q.data || q.data.length === 0) return null;

  return (
    <section aria-labelledby="pendencias-title" className="mb-6 rounded-2xl border border-destructive/40 bg-card p-5">
      <h2 id="pendencias-title" className="flex items-center gap-2 font-display text-lg font-bold"><AlertTriangle className="h-5 w-5 text-destructive" aria-hidden /> Pendências financeiras</h2>
      <p className="mt-1 text-sm text-muted-foreground">Registradas automaticamente a partir do que o provedor de pagamento informou. Nada aqui foi alterado na conta do cliente.</p>
      <ul className="mt-4 space-y-3">
        {q.data.map((p) => (
          <li key={p.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{TITULO[p.kind]}{p.table_number ? ` · Mesa ${p.table_number}` : ""}</p>
              <p className="text-sm font-bold">{p.amount === null ? "" : money(p.amount)}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")} · {p.detail}</p>
            <p className="mt-2 text-sm">{ORIENTACAO[p.kind]}</p>
            <form className="mt-3 flex gap-2" onSubmit={async (e) => {
              e.preventDefault();
              const note = (notas[p.id] ?? "").trim();
              if (note.length < 3) { toast.error("Descreva como resolveu"); return; }
              setOcupado(p.id);
              try {
                await resolve({ data: { id: p.id, note } });
                toast.success("Pendência resolvida");
                await qc.invalidateQueries({ queryKey: ["incidents", slug] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível resolver");
              } finally { setOcupado(null); }
            }}>
              <Input value={notas[p.id] ?? ""} onChange={(e) => setNotas((n) => ({ ...n, [p.id]: e.target.value }))} maxLength={300} placeholder="Como foi resolvido?" aria-label="Como a pendência foi resolvida" className="h-9 text-sm" />
              <Button type="submit" size="sm" disabled={ocupado === p.id} className="h-9 shrink-0"><CheckCircle2 /> Resolver</Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
