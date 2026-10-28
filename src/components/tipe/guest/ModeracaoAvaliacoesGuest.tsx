import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  listGuestReviewFlags,
  listGuestReviewQueue,
  moderateGuestReview,
  setGuestReviewFlag,
  type GuestReviewQueueItem,
} from "@/lib/tipe/guest/reviews.functions";

const FILTROS = [
  ["pendente", "Pendentes"],
  ["em_revisao", "Contestadas"],
  ["aprovada", "Aprovadas"],
  ["oculta", "Ocultas"],
] as const;

/** Backoffice › Governança: fila de avaliações elegíveis para o futuro Tipe Guest. */
export function ModeracaoAvaliacoesGuest() {
  const [filtro, setFiltro] = useState<GuestReviewQueueItem["status"]>("pendente");
  const fetchQueue = useServerFn(listGuestReviewQueue);
  const fetchFlags = useServerFn(listGuestReviewFlags);
  const moderar = useServerFn(moderateGuestReview);
  const salvarFlag = useServerFn(setGuestReviewFlag);
  const qc = useQueryClient();
  const fila = useQuery({ queryKey: ["guest-review-queue", filtro], queryFn: () => fetchQueue({ data: { status: filtro } }) });
  const flags = useQuery({ queryKey: ["guest-review-flags"], queryFn: () => fetchFlags() });
  const [ocultando, setOcultando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const agir = async (id: string, action: "aprovar" | "ocultar" | "reabrir", reason?: string) => {
    setOcupado(id);
    try {
      await moderar({ data: { reviewId: id, action, reason } });
      toast.success(action === "aprovar" ? "Avaliação aprovada." : action === "ocultar" ? "Avaliação ocultada." : "Avaliação voltou para a fila.");
      setOcultando(null);
      setMotivo("");
      await qc.invalidateQueries({ queryKey: ["guest-review-queue"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível moderar. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <section className="rounded-[1.25rem] border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold">Avaliações para o Tipe Guest</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Só entram aqui avaliações com consentimento do cliente. Nada é exibido ao público enquanto o Guest não for lançado.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1" role="tablist" aria-label="Filtrar avaliações">
          {FILTROS.map(([v, l]) => (
            <Button key={v} size="sm" role="tab" aria-selected={filtro === v} variant={filtro === v ? "default" : "ghost"} onClick={() => setFiltro(v)}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {fila.isLoading && <div className="h-16 animate-pulse rounded-lg bg-muted" aria-label="Carregando avaliações" />}
        {fila.error && <p className="text-sm text-destructive">Não foi possível carregar a fila. Recarregue a página para tentar de novo.</p>}
        {fila.data && fila.data.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhuma avaliação neste filtro.</p>
        )}
        {fila.data?.map((r) => (
          <article key={r.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold">{r.restaurant}</p>
              <span className="flex items-center gap-0.5" aria-label={`${r.stars} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= r.stars ? "fill-highlight text-highlight" : "text-border"}`} aria-hidden />
                ))}
              </span>
            </div>
            {r.comment && <p className="mt-1.5 text-sm leading-6">{r.comment}</p>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{r.identity}</span>
              {r.verified ? (
                <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Visita paga verificada</span>
              ) : (
                <span>Pagamento não verificado: não vai ao público</span>
              )}
              <span>{new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}</span>
            </p>
            {r.openReports.map((x, i) => (
              <p key={i} className="mt-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                <strong>{x.kind === "contestacao" ? "Contestação do restaurante" : "Denúncia"}:</strong> {x.reason}
              </p>
            ))}
            {ocultando === r.id ? (
              <div className="mt-3 space-y-2">
                <label htmlFor={`motivo-${r.id}`} className="text-xs font-semibold">Motivo para ocultar</label>
                <Textarea id={`motivo-${r.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} className="min-h-16" />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={motivo.trim().length < 5 || ocupado === r.id} onClick={() => agir(r.id, "ocultar", motivo)}>
                    Ocultar avaliação
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOcultando(null)}>Voltar</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "aprovada" && r.verified && (
                  <Button size="sm" disabled={ocupado === r.id} onClick={() => agir(r.id, "aprovar")}>Aprovar</Button>
                )}
                {r.status !== "oculta" && (
                  <Button size="sm" variant="outline" disabled={ocupado === r.id} onClick={() => { setOcultando(r.id); setMotivo(""); }}>Ocultar</Button>
                )}
                {r.status !== "pendente" && (
                  <Button size="sm" variant="ghost" disabled={ocupado === r.id} onClick={() => agir(r.id, "reabrir")}>Voltar para a fila</Button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <details className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Coleta com consentimento por restaurante</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Desligada por padrão. Ligada, a tela de avaliação mostra a pergunta opcional de consentimento. A avaliação interna continua igual.
        </p>
        {flags.error && <p className="mt-2 text-sm text-destructive">Não foi possível carregar os restaurantes.</p>}
        <ul className="mt-3 divide-y divide-border">
          {flags.data?.restaurants.map((r) => (
            <li key={r.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
              <label htmlFor={`flag-${r.id}`} className="min-w-0 truncate text-sm">{r.name}</label>
              <Switch
                id={`flag-${r.id}`}
                checked={r.enabled}
                onCheckedChange={async (v) => {
                  try {
                    await salvarFlag({ data: { restaurantId: r.id, enabled: v } });
                    await qc.invalidateQueries({ queryKey: ["guest-review-flags"] });
                  } catch {
                    toast.error("Não foi possível salvar. Tente de novo.");
                  }
                }}
              />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
