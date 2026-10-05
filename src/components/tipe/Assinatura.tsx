import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CardFields } from "@/components/tipe/CardFields";
import { cardValid, tokenizeCard, type CardInput } from "@/lib/tipe/pagarme-client";
import { getPaymentConfig } from "@/lib/tipe/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSubscription, startSubscription } from "@/lib/tipe/subscription.functions";
import { planById, priceLabel } from "@/lib/tipe/plans";

const STATUS: Record<string, string> = { trialing: "Teste grátis", active: "Ativa", past_due: "Pagamento atrasado", canceled: "Cancelada", expired: "Teste encerrado" };

export function Assinatura({ slug }: { slug: string }) {
  const fetchSub = useServerFn(getSubscription);
  const start = useServerFn(startSubscription);
  const [card, setCard] = useState<CardInput>({ number: "", holder: "", exp: "", cvv: "" });
  const [pk, setPk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getPaymentConfig().then((c) => setPk(c.publicKey)).catch(() => undefined); }, []);
  const q = useQuery({ queryKey: ["subscription", slug], queryFn: () => fetchSub({ data: { slug } }) });
  if (q.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  const s = q.data;
  if (!s) return <div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-display text-xl font-bold">Assinatura</h2><p className="mt-2 text-sm text-muted-foreground">Este restaurante ainda não tem uma assinatura cadastrada. Fale com a equipe TIPE.</p></div>;
  const plan = planById(s.plan);
  const dias = Math.max(0, Math.ceil((Date.parse(s.trial_ends_at) - Date.now()) / 86400000));
  return (
    <div className="max-w-xl rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Assinatura</h2>
      <div className="mt-4 flex items-baseline justify-between">
        <div><p className="font-display text-2xl font-extrabold">{plan?.name ?? "Personalizado"}</p><p className="text-sm text-muted-foreground">{plan ? `R$ ${priceLabel(plan.price)}/mês · até ${plan.maxTables} mesas` : "Condições negociadas"}</p></div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">{STATUS[s.status] ?? s.status}</span>
      </div>
      {s.status === "trialing" && (
        <div className="mt-5 rounded-xl bg-muted p-4">
          <p className="font-semibold">{dias > 0 ? `Faltam ${dias} dia(s) de teste grátis` : "Seu teste grátis terminou"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Termina em {new Date(s.trial_ends_at).toLocaleDateString("pt-BR")}. Nenhuma cobrança foi feita até agora.</p>
        </div>
      )}
      {pk && <div className="mt-5"><p className="mb-2 text-sm font-semibold">Cartão para cobrança mensal</p><CardFields value={card} onChange={setCard} /></div>}
      <Button className="mt-5 w-full" disabled={busy || (!!pk && !cardValid(card))} onClick={async () => {
        setBusy(true);
        try {
          const cardToken = pk ? await tokenizeCard(pk, card) : undefined;
          const r = await start({ data: { slug, cardToken } });
          if (r.ok) { toast.success(r.message); void q.refetch(); } else toast.info(r.message);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Processando…" : "Ativar assinatura mensal"}</Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Sem fidelidade. Cancele quando quiser.</p>
    </div>
  );
}
