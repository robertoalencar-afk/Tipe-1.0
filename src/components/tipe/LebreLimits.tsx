import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLebreLimits, setLebreLimits } from "@/lib/tipe/founder.functions";

/** Backoffice: teto diário de mensagens da Lebre. */
export function LebreLimits() {
  const load = useServerFn(getLebreLimits);
  const save = useServerFn(setLebreLimits);
  const [d, setD] = useState<{ panelDaily: number; publicDaily: number; today: { scope: string; hits: number }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { load().then(setD).catch(() => toast.error("Não foi possível ler os limites da Lebre.")); }, [load]);
  if (!d) return null;
  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="font-display font-bold">Limite diário da Lebre</h3>
      <p className="mt-1 text-xs text-muted-foreground">Ao chegar em 80% você recebe um alerta por e-mail. Em 100% a Lebre avisa que o limite do dia acabou.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Painel, por restaurante (mensagens/dia)
          <Input type="number" min={1} value={d.panelDaily} onChange={(e) => setD({ ...d, panelDaily: Number(e.target.value) })} className="mt-1" /></label>
        <label className="text-sm">Site público, total (mensagens/dia)
          <Input type="number" min={1} value={d.publicDaily} onChange={(e) => setD({ ...d, publicDaily: Number(e.target.value) })} className="mt-1" /></label>
      </div>
      <Button className="mt-3" disabled={busy} onClick={async () => { setBusy(true); try { await save({ data: { panelDaily: d.panelDaily, publicDaily: d.publicDaily } }); toast.success("Limites salvos."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); } finally { setBusy(false); } }}>Salvar limites</Button>
      {d.today.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          {d.today.map((u) => <li key={u.scope} className="flex justify-between gap-3"><span className="truncate">{u.scope === "public" ? "Site público" : u.scope.replace("panel:", "Painel ")}</span><strong>{u.hits} hoje</strong></li>)}
        </ul>
      )}
    </section>
  );
}
