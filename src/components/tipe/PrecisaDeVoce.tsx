import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  HandCoins,
  PlugZap,
  Star,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIncidents } from "@/components/tipe/PendenciasFinanceiras";
import { getWaiterInsights } from "@/lib/tipe/waiter-insights.functions";
import { tarefasAgora, type EntradaAgora, type TarefaAgora } from "@/lib/tipe/agora";
import { cn } from "@/lib/utils";

const ICONE: Record<TarefaAgora["tipo"], React.ComponentType<{ className?: string }>> = {
  pendencia: AlertTriangle,
  sincronizacao: PlugZap,
  cancelamento: AlertTriangle,
  confirmar: HandCoins,
  quitada: Utensils,
  nota: Star,
};

/** Fila única do que o restaurante precisa resolver agora, no topo do Início. */
export function PrecisaDeVoce({
  slug,
  podeConfirmar,
  entrada,
  ocupado,
  onConfirmar,
  onGo,
  onMesa,
}: {
  slug: string;
  podeConfirmar: boolean;
  entrada: Omit<EntradaAgora, "incidentes" | "notas" | "agora">;
  ocupado: string | null;
  onConfirmar: (paymentId: string) => void;
  onGo: (aba: string) => void;
  onMesa: (mesa: string) => void;
}) {
  const incidentes = useIncidents(slug, podeConfirmar);
  const fetchInsights = useServerFn(getWaiterInsights);
  const insights = useQuery({
    queryKey: ["waiter-insights", slug, 1],
    queryFn: () => fetchInsights({ data: { slug, days: 1 } }),
    enabled: podeConfirmar,
    refetchInterval: 60000,
  });
  const tarefas = useMemo(
    () =>
      tarefasAgora({
        ...entrada,
        incidentes: incidentes.data?.length ?? 0,
        notas: (insights.data ?? []).flatMap((w) =>
          w.comments.map((c) => ({ ...c, garcom: w.name.split(" ")[0] ?? w.name })),
        ),
        agora: new Date(),
      }),
    [entrada, incidentes.data, insights.data],
  );

  return (
    <section aria-labelledby="agora-title" className="surface-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="agora-title" className="font-display text-base font-semibold">
          O que precisa de você agora
        </h2>
        {tarefas.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {tarefas.length === 1 ? "1 item" : `${tarefas.length} itens`}
          </span>
        )}
      </div>
      {tarefas.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          Tudo em dia. Pagamentos no local, mesas quitadas e alertas aparecem aqui.
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
                  {t.pagamentoId && podeConfirmar ? (
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
}
