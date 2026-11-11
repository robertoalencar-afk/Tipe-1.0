import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bell,
  Check,
  CheckCircle2,
  HandCoins,
  PlugZap,
  Star,
  Utensils,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { usePedidosConferencia } from "@/hooks/use-pedidos-conferencia";
import { PedidosConferencia } from "@/components/tipe/PedidosConferencia";
import { Button } from "@/components/ui/button";
import { useIncidents } from "@/components/tipe/PendenciasFinanceiras";
import { getWaiterInsights } from "@/lib/tipe/waiter-insights.functions";
import { getOpenCalls, resolveCall } from "@/lib/tipe/chamados.functions";
import { tarefasAgora, type EntradaAgora, type TarefaAgora } from "@/lib/tipe/agora";
import { cn } from "@/lib/utils";

const ICONE: Record<TarefaAgora["tipo"], React.ComponentType<{ className?: string }>> = {
  pendencia: AlertTriangle,
  sincronizacao: PlugZap,
  cancelamento: AlertTriangle,
  confirmar: HandCoins,
  chamado: BellRing,
  quitada: Utensils,
  nota: Star,
};

/** Fila única do que o restaurante precisa resolver agora, no topo do Início. */
export function PrecisaDeVoce({
  slug,
  modo = "inicio",
  podeConfirmar,
  entrada,
  ocupado,
  onConfirmar,
  onGo,
  onMesa,
}: {
  slug: string;
  modo?: "inicio" | "sininho";
  podeConfirmar: boolean;
  entrada: Omit<EntradaAgora, "incidentes" | "notas" | "agora">;
  ocupado: string | null;
  onConfirmar: (paymentId: string) => void;
  onGo: (aba: string) => void;
  onMesa: (mesa: string) => void;
}) {
  const pedidos = usePedidosConferencia(slug);
  const incidentes = useIncidents(slug, podeConfirmar);
  const fetchInsights = useServerFn(getWaiterInsights);
  const insights = useQuery({
    queryKey: ["waiter-insights", slug, 1],
    queryFn: () => fetchInsights({ data: { slug, days: 1 } }),
    enabled: podeConfirmar,
    refetchInterval: 60000,
  });
  const fetchChamados = useServerFn(getOpenCalls);
  const chamados = useQuery({
    queryKey: ["table-calls", slug],
    queryFn: () => fetchChamados({ data: { slug } }),
    refetchInterval: 15000,
  });
  const atender = useServerFn(resolveCall);
  const qc = useQueryClient();
  const atendido = useMutation({
    mutationFn: (id: string) => atender({ data: { id } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["table-calls", slug] }),
  });
  const tarefas = useMemo(
    () =>
      tarefasAgora({
        ...entrada,
        incidentes: incidentes.data?.length ?? 0,
        notas: (insights.data ?? []).flatMap((w) =>
          w.comments.map((c) => ({ ...c, garcom: w.name.split(" ")[0] ?? w.name })),
        ),
        chamados: chamados.data ?? [],
        agora: new Date(),
      }),
    [entrada, incidentes.data, insights.data, chamados.data],
  );

  const quantidade = tarefas.length + (pedidos.data?.length ?? 0);
  const conteudo = (
    <section aria-label="Avisos e pendências" className={modo === "inicio" ? "surface-card p-4 sm:p-5" : "p-1"}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">
          {modo === "inicio" ? "O que precisa de você agora" : "Avisos"}
        </h2>
        {quantidade > 0 && (
          <span className="text-xs text-muted-foreground">
            {quantidade === 1 ? "1 item" : `${quantidade} itens`}
          </span>
        )}
      </div>
      <PedidosConferencia slug={slug} />
      {quantidade === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          {chamados.isPending || pedidos.isPending ? "Atualizando avisos…" : chamados.isError || incidentes.isError || pedidos.isError ? "Alguns avisos não puderam ser atualizados. Tente novamente em instantes." : "Tudo em dia. Pagamentos no local, mesas quitadas e alertas aparecem aqui."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {tarefas.map((t) => {
            const Icon = ICONE[t.tipo];
            const ir = () => ("aba" in t.destino ? onGo(t.destino.aba) : onMesa(t.destino.mesa));
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-0"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    t.urgencia === 0
                      ? "bg-destructive/10 text-destructive"
                      : t.urgencia === 1
                        ? "bg-warning/20 text-foreground"
                        : "bg-brand-soft text-brand-strong",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-sm font-medium">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground sm:truncate">{t.detalhe}</p>
                </div>
                <div className="ml-auto flex shrink-0 gap-2 max-sm:w-full max-sm:pl-12">
                  {t.chamadoId ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={ir}>
                        Ver mesa
                      </Button>
                      <Button
                        size="sm"
                        variant="ink"
                        disabled={atendido.isPending && atendido.variables === t.chamadoId}
                        onClick={() => atendido.mutate(t.chamadoId!)}
                      >
                        <Check />
                        {t.acao}
                      </Button>
                    </>
                  ) : t.pagamentoId && podeConfirmar ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={ir}>
                        Ver mesa
                      </Button>
                      <Button
                        size="sm"
                        variant="ink"
                        disabled={ocupado === t.pagamentoId}
                        onClick={() => onConfirmar(t.pagamentoId!)}
                      >
                        <Check />
                        Confirmar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={ir}>
                      {t.pagamentoId ? "Ver mesa" : t.acao}
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
  if (modo === "inicio") return conteudo;
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Avisos: ${quantidade} ${quantidade === 1 ? "pendência" : "pendências"}`}><Bell className="size-5" aria-hidden />{quantidade > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground">{quantidade > 99 ? "99+" : quantidade}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="max-h-[75dvh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto p-3">{conteudo}</PopoverContent></Popover>;
}
