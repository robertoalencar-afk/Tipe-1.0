import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listRestaurantModules,
  setRestaurantModule,
  type ModuleState,
} from "@/lib/tipe/order-access.functions";

const ROTULO: Record<ModuleState | "none", string> = {
  none: "Não contratado",
  active: "Ativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};
const TOM: Record<ModuleState | "none", string> = {
  none: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  suspended: "bg-warning/15 text-warning",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function useModulos() {
  const fetchModules = useServerFn(listRestaurantModules);
  return useQuery({ queryKey: ["founder-modules"], queryFn: () => fetchModules(), retry: false });
}

/** Estado do Tipe Order de um restaurante, com troca de estado pelo fundador (2FA no servidor). */
export function ModuloOrder({ restaurantId, nome }: { restaurantId: string; nome: string }) {
  const q = useModulos();
  const qc = useQueryClient();
  const salvar = useServerFn(setRestaurantModule);
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState<ModuleState>("active");
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (q.isLoading) return <span className="text-xs text-muted-foreground">…</span>;
  if (q.error) return <span className="text-xs text-muted-foreground">Indisponível</span>;
  const atual = (q.data ?? []).find((m) => m.restaurantId === restaurantId && m.module === "order");
  const estado: ModuleState | "none" = atual?.status ?? "none";

  async function confirmar() {
    if (destino !== "active" && !motivo.trim()) {
      toast.error("Informe o motivo da suspensão ou do cancelamento.");
      return;
    }
    setOcupado(true);
    try {
      await salvar({
        data: {
          restaurantId,
          module: "order",
          status: destino,
          ...(motivo.trim() ? { reason: motivo.trim() } : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ["founder-modules"] });
      toast.success(`Tipe Order de ${nome}: ${ROTULO[destino].toLowerCase()}`);
      setAberto(false);
      setMotivo("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDestino(estado === "active" ? "suspended" : "active");
          setAberto(true);
        }}
        className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${TOM[estado]}`}
        aria-label={`Tipe Order de ${nome}: ${ROTULO[estado]}. Alterar`}
      >
        {ROTULO[estado]}
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tipe Order · {nome}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hoje: <strong className="text-foreground">{ROTULO[estado]}</strong>
            {atual?.reason ? ` (${atual.reason})` : ""}. Suspender ou cancelar bloqueia pedidos
            novos; a conta, os pagamentos e os pedidos já feitos continuam.
          </p>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Novo estado</legend>
            {(["active", "suspended", "cancelled"] as const).map((k) => (
              <label
                key={k}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-foreground/40"
              >
                <input
                  type="radio"
                  name="estado-order"
                  className="h-4 w-4 accent-primary"
                  checked={destino === k}
                  onChange={() => setDestino(k)}
                />
                {ROTULO[k]}
              </label>
            ))}
          </fieldset>
          {destino !== "active" && (
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Motivo</span>
              <input
                value={motivo}
                maxLength={300}
                onChange={(e) => setMotivo(e.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/40"
              />
            </label>
          )}
          <Button
            className="h-11"
            disabled={ocupado || destino === estado}
            onClick={() => void confirmar()}
          >
            {destino === "active"
              ? "Ativar o Tipe Order"
              : destino === "suspended"
                ? "Suspender o Tipe Order"
                : "Cancelar o Tipe Order"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
