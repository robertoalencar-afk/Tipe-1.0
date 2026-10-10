import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listWaiterPix, resolveWaiterPix, revealWaiterPix } from "@/lib/tipe/waiter.functions";

/** Chaves Pix dos garçons (somente dono): mascaradas, com quarentena de 48h. */
export function PixGarcons({ slug }: { slug: string }) {
  const list = useServerFn(listWaiterPix);
  const resolve = useServerFn(resolveWaiterPix);
  const reveal = useServerFn(revealWaiterPix);
  const q = useQuery({ queryKey: ["waiter-pix", slug], queryFn: () => list({ data: { slug } }) });
  const [shown, setShown] = useState<Record<string, { document: string; key: string }>>({});

  async function act(waiterId: string, action: "approve" | "refuse") {
    try { await resolve({ data: { slug, waiterId, action } }); toast.success(action === "approve" ? "Chave aprovada" : "Chave recusada"); void q.refetch(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function show(waiterId: string, which: "active" | "pending") {
    try { const r = await reveal({ data: { slug, waiterId, which } }); setShown((s) => ({ ...s, [`${waiterId}:${which}`]: r })); }
    catch (e) { toast.error((e as Error).message); }
  }

  const rows = q.data ?? [];
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Chaves Pix dos garçons</h2>
      <p className="text-sm text-muted-foreground">Toda chave nova fica 48 horas em verificação antes de valer para os repasses. Você pode aprovar antes ou recusar. Ver o dado completo fica registrado.</p>
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma chave cadastrada.</p> : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {rows.map((r) => {
            const a = shown[`${r.waiterId}:active`];
            const p = shown[`${r.waiterId}:pending`];
            return (
              <li key={r.waiterId} className="py-3">
                <p className="font-semibold">{r.waiter}</p>
                {r.active && (
                  <p className="text-xs text-muted-foreground">
                    Em uso: {a ? `${a.key} · CPF ${a.document}` : `${r.active.key} · CPF ${r.active.document}`}
                    {!a && <button type="button" className="ml-1 underline" onClick={() => show(r.waiterId, "active")}>ver completo</button>}
                  </p>
                )}
                {r.pending && (
                  <div className="mt-2 rounded-xl border border-highlight/40 bg-highlight/10 p-3">
                    <p className="text-xs font-semibold">
                      Nova chave em verificação: {p ? `${p.key} · CPF ${p.document}` : r.pending.key}
                      {!p && <button type="button" className="ml-1 underline" onClick={() => show(r.waiterId, "pending")}>ver completo</button>}
                    </p>
                    <p className="text-xs text-muted-foreground">Passa a valer em {new Date(r.pending.until).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Saques pausados até lá.</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => act(r.waiterId, "approve")}>Aprovar agora</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(r.waiterId, "refuse")}>Recusar</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
