import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  closeTableOrdering,
  getOrderAccess,
  openTableOrdering,
} from "@/lib/tipe/order-access.functions";

/** Módulos e mesas liberadas do restaurante, compartilhado entre painel e garçom. */
export function useOrderAccess(slug: string | undefined) {
  const fetchAccess = useServerFn(getOrderAccess);
  return useQuery({
    queryKey: ["order-access", slug],
    queryFn: () => fetchAccess({ data: { slug: slug! } }),
    enabled: !!slug,
    refetchInterval: 15000,
    retry: false,
  });
}

const hora = (s: string) =>
  new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Liberar ou encerrar pedidos pelo celular numa mesa (Tipe Order). Só aparece
 * com o módulo ativo. No modo código, mostra os 4 dígitos para passar à mesa.
 */
export function LiberarPedidosMesa({ slug, table }: { slug: string; table: string }) {
  const q = useOrderAccess(slug);
  const qc = useQueryClient();
  const abrir = useServerFn(openTableOrdering);
  const fechar = useServerFn(closeTableOrdering);
  const [ocupado, setOcupado] = useState(false);

  if (!q.data?.orderActive) return null;
  const aberta = q.data.open.find((o) => o.table === table);

  async function agir(acao: "abrir" | "fechar") {
    setOcupado(true);
    try {
      if (acao === "abrir") await abrir({ data: { slug, table } });
      else await fechar({ data: { slug, table } });
      await qc.invalidateQueries({ queryKey: ["order-access", slug] });
      toast.success(
        acao === "abrir"
          ? `Pedidos pelo celular liberados na mesa ${table}`
          : `Pedidos pelo celular encerrados na mesa ${table}`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section
      aria-label="Pedidos pelo celular"
      className="rounded-2xl border border-border bg-card p-3"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
          <Smartphone className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pedidos pelo celular</p>
          <p className="text-xs text-muted-foreground">
            {aberta
              ? aberta.locked
                ? "Código bloqueado por tentativas erradas. Libere de novo para gerar outro."
                : `Liberados para esta conta até ${hora(aberta.expiresAt)}.`
              : "A mesa só pede pelo QR depois que alguém da equipe liberar."}
          </p>
        </div>
      </div>
      {aberta?.requiresCode && aberta.code && !aberta.locked && (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-center">
          <span className="block text-xs text-muted-foreground">Código para a mesa digitar</span>
          <span
            className="font-mono text-3xl font-semibold tracking-[0.35em]"
            aria-label={`Código ${aberta.code.split("").join(" ")}`}
          >
            {aberta.code}
          </span>
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {aberta && !aberta.locked ? (
          <Button
            variant="outline"
            className="h-11"
            disabled={ocupado}
            onClick={() => void agir("fechar")}
          >
            {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />} Encerrar
            pedidos desta mesa
          </Button>
        ) : (
          <Button className="h-11" disabled={ocupado} onClick={() => void agir("abrir")}>
            {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />} Liberar
            pedidos pelo celular
          </Button>
        )}
      </div>
    </section>
  );
}
