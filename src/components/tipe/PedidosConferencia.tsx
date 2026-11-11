import { usePedidosConferencia } from "@/hooks/use-pedidos-conferencia";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveOrderReview, type OrderReview } from "@/lib/tipe/order-review.functions";

const brl = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Mesma fila no Início, no sino e na área do garçom. Aprovação só após conferir na mesa. */
export function PedidosConferencia({ slug }: { slug: string }) {
  const q = usePedidosConferencia(slug);
  const qc = useQueryClient();
  const [pedido, setPedido] = useState<OrderReview | null>(null);
  const [conferido, setConferido] = useState(false);
  const resolve = useServerFn(resolveOrderReview);
  const mutation = useMutation({
    mutationFn: (approve: boolean) => resolve({ data: { id: pedido!.id, approve } }),
    onSuccess: async (r) => {
      toast.success(
        r.state === "approved"
          ? "Pedido confirmado e enviado à cozinha"
          : r.state === "expired"
            ? "Este pedido expirou. Peça ao cliente para enviar novamente."
            : "Pedido recusado",
      );
      setPedido(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["order-reviews", slug] }),
        qc.invalidateQueries({ queryKey: ["panel", slug] }),
        qc.invalidateQueries({ queryKey: ["waiter-pos"] }),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });
  if (q.isError)
    return (
      <p role="alert" className="mt-3 text-sm text-destructive">
        Não foi possível atualizar os pedidos para conferência.{" "}
        <button type="button" className="underline" onClick={() => void q.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  return (
    <>
      {!!q.data?.length && (
        <ul className="mt-3 divide-y divide-border" aria-label="Pedidos aguardando conferência">
          {q.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold">Mesa {p.table_number} · conferir pedido</p>
                <p className="text-xs text-muted-foreground">
                  {p.quantity} itens · {brl(p.total)} · {p.customer_name || "Cliente"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Aguardando confirmação na mesa. Ainda não foi à cozinha.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setConferido(false);
                  setPedido(p);
                }}
              >
                Conferir pedido
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!pedido}
        onOpenChange={(v) => {
          if (!v && !mutation.isPending) setPedido(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mesa {pedido?.table_number} · confirmar com o cliente</DialogTitle>
          </DialogHeader>
          {pedido && (
            <>
              <p className="text-sm text-muted-foreground">
                {pedido.customer_name || "Cliente"} enviou {pedido.quantity} itens. Confira o pedido
                pessoalmente antes de liberar o preparo.
              </p>
              <ul className="divide-y divide-border">
                {pedido.preview.map((i, n) => (
                  <li key={`${i.code}-${n}`} className="py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>
                        {i.qty} × {i.name}
                      </span>
                      <span className="shrink-0 tabular-nums">{brl(i.price * i.qty)}</span>
                    </div>
                    {i.notes && <p className="text-xs text-muted-foreground">{i.notes}</p>}
                  </li>
                ))}
              </ul>
              <p className="flex justify-between font-semibold">
                <span>Total dos itens</span>
                <span>{brl(pedido.total)}</span>
              </p>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={conferido}
                  disabled={mutation.isPending}
                  onChange={(e) => setConferido(e.target.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                Conferi este pedido com o cliente na mesa.
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(false)}
                >
                  Recusar pedido
                </Button>
                <Button
                  disabled={!conferido || mutation.isPending}
                  onClick={() => mutation.mutate(true)}
                >
                  {mutation.isPending ? "Salvando…" : "Confirmar e enviar à cozinha"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
