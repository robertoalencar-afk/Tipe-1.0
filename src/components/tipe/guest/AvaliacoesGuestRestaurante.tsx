import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contestGuestReview, listOwnGuestReviews } from "@/lib/tipe/guest/reviews.functions";

const ESTADO: Record<string, string> = {
  pendente: "Aguardando revisão da Tipe",
  aprovada: "Aprovada para o futuro app",
  oculta: "Oculta",
  em_revisao: "Contestada, em revisão",
};

/** Painel › Garçons: avaliações novas (coleta com consentimento) e contestação pelo dono. */
export function AvaliacoesGuestRestaurante({ slug, podeContestar }: { slug: string; podeContestar: boolean }) {
  const fetchOwn = useServerFn(listOwnGuestReviews);
  const contestar = useServerFn(contestGuestReview);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["guest-own-reviews", slug], queryFn: () => fetchOwn({ data: { slug } }) });
  const [aberta, setAberta] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Sem a migração ou sem nenhuma avaliação nova, o painel fica igual ao de sempre.
  if (!q.data?.available || q.data.reviews.length === 0) return null;
  const publicaveis = q.data.reviews.filter((r) => r.consent);

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="font-bold">Avaliações para o futuro app da Tipe</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {publicaveis.length} de {q.data.reviews.length} clientes autorizaram exibir a avaliação no Tipe Guest, que ainda não foi lançado. Nada é público hoje.
        Se uma avaliação não for justa, conteste e a Tipe revisa antes de qualquer exibição.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {publicaveis.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-0.5" aria-label={`${r.stars} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= r.stars ? "fill-highlight text-highlight" : "text-border"}`} aria-hidden />
                ))}
              </span>
              <span className="text-xs text-muted-foreground">{ESTADO[r.status] ?? r.status}</span>
            </div>
            {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            {podeContestar && !r.contested && r.status !== "oculta" && aberta !== r.id && (
              <Button size="sm" variant="ghost" className="mt-1 h-11 px-2" onClick={() => { setAberta(r.id); setMotivo(""); }}>
                Contestar avaliação
              </Button>
            )}
            {aberta === r.id && (
              <div className="mt-2 space-y-2">
                <label htmlFor={`contestar-${r.id}`} className="text-xs font-semibold">Por que esta avaliação não é justa?</label>
                <Textarea id={`contestar-${r.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} className="min-h-16" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={motivo.trim().length < 5 || enviando}
                    onClick={async () => {
                      setEnviando(true);
                      try {
                        await contestar({ data: { reviewId: r.id, reason: motivo } });
                        toast.success("Contestação enviada. A Tipe revisa antes de qualquer exibição.");
                        setAberta(null);
                        await qc.invalidateQueries({ queryKey: ["guest-own-reviews", slug] });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Não foi possível enviar. Tente de novo.");
                      } finally {
                        setEnviando(false);
                      }
                    }}
                  >
                    Enviar contestação
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAberta(null)}>Voltar</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
