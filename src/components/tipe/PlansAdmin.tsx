import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlansAdmin, savePlanCatalog, saveRestaurantPlan } from "@/lib/tipe/founder.functions";

const statusLabel: Record<string, string> = { trialing: "Teste", active: "Ativo", suspended: "Suspenso", past_due: "Suspenso", expired: "Suspenso", canceled: "Cancelado" };
const brl = (v: number | null) => (v === null ? "Sob proposta" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const day = (d: string | null) => (d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "-");
type Row = Awaited<ReturnType<typeof getPlansAdmin>>["restaurants"][number];

/** Backoffice: planos, limites de mesas e preço fundador. */
export function PlansAdmin() {
  const load = useServerFn(getPlansAdmin);
  const q = useQuery({ queryKey: ["plans-admin"], queryFn: () => load() });
  const [filtro, setFiltro] = useState<"todos" | "perto" | "limite">("todos");
  if (!q.data) return <p className="text-sm text-muted-foreground">{q.isError ? "Não foi possível carregar os planos." : "Carregando planos…"}</p>;
  const rows = q.data.restaurants.filter((r) => filtro === "todos" ? true : filtro === "limite" ? r.active >= r.limit : r.active / r.limit >= 0.8);
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h3 className="font-display font-bold">Tabela de planos</h3>
        <p className="mt-1 text-xs text-muted-foreground">Mudanças valem na hora para todos os restaurantes do plano.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{q.data.catalog.map((c) => <CatalogCard key={c.id} c={c} onSaved={() => q.refetch()} />)}</div>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Restaurantes</h3>
          <div className="flex gap-1">
            {([["todos", "Todos"], ["perto", "Perto do limite (80%+)"], ["limite", "No limite"]] as const).map(([v, l]) => <Button key={v} size="sm" variant={filtro === v ? "default" : "outline"} onClick={() => setFiltro(v)}>{l}</Button>)}
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum restaurante neste filtro.</p> : rows.map((r) => <RestaurantPlanRow key={r.id} r={r} catalog={q.data.catalog} />)}
        </div>
      </section>
    </div>
  );
}

function CatalogCard({ c, onSaved }: { c: { id: string; name: string; max_tables: number | null; founder_price: number | null; full_price: number | null }; onSaved: () => void }) {
  const save = useServerFn(savePlanCatalog);
  const [v, setV] = useState({ max: c.max_tables?.toString() ?? "", fp: c.founder_price?.toString() ?? "", full: c.full_price?.toString() ?? "" });
  const custom = c.id === "personalizado";
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-semibold">{c.name}</p>
      {custom ? <p className="mt-2 text-xs text-muted-foreground">Limite definido por restaurante. Preço sob proposta.</p> : (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label>Mesas<Input value={v.max} onChange={(e) => setV({ ...v, max: e.target.value })} className="mt-1 h-8" inputMode="numeric" /></label>
          <label>Fundador<Input value={v.fp} onChange={(e) => setV({ ...v, fp: e.target.value })} className="mt-1 h-8" inputMode="decimal" /></label>
          <label>Cheio<Input value={v.full} onChange={(e) => setV({ ...v, full: e.target.value })} className="mt-1 h-8" inputMode="decimal" /></label>
        </div>
      )}
      {!custom && <Button size="sm" variant="outline" className="mt-2" onClick={async () => { try { await save({ data: { id: c.id, maxTables: num(v.max), founderPrice: num(v.fp), fullPrice: num(v.full) } }); toast.success(`Plano ${c.name} salvo.`); onSaved(); } catch (e) { toast.error((e as Error).message); } }}>Salvar</Button>}
    </div>
  );
}

function RestaurantPlanRow({ r, catalog }: { r: Row; catalog: { id: string; name: string }[] }) {
  const save = useServerFn(saveRestaurantPlan);
  const qc = useQueryClient();
  const [v, setV] = useState({ plan: r.plan, custom: r.customLimit?.toString() ?? "", founder: r.founderPrice, billing: r.billing, status: ["past_due", "expired"].includes(r.status) ? "suspended" : r.status });
  const pct = r.active / Math.max(1, r.limit);
  return (
    <article className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.slug}</p></div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={pct >= 1 ? "destructive" : pct >= 0.8 ? "secondary" : "outline"}>{r.active} / {r.limit} mesas</Badge>
          <Badge variant="secondary">{statusLabel[r.status] ?? r.status}</Badge>
          <span>{r.founderPrice ? `Preço fundador até ${day(r.founderUntil)}` : "Preço cheio"}</span>
          <span>· {r.billing === "annual" ? "Anual (paga 10, leva 12, totens inclusos)" : "Mensal"}</span>
          {r.status === "trialing" && <span>· Teste até {day(r.trialEndsAt)}</span>}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-6">
        <label>Plano<select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2" value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value })}>{catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Limite próprio<Input className="mt-1 h-8" placeholder="do plano" value={v.custom} onChange={(e) => setV({ ...v, custom: e.target.value })} inputMode="numeric" /></label>
        <label>Status<select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="trialing">Teste</option><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="canceled">Cancelado</option></select></label>
        <label>Periodicidade<select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2" value={v.billing} onChange={(e) => setV({ ...v, billing: e.target.value })}><option value="monthly">Mensal</option><option value="annual">Anual</option></select></label>
        <label className="flex items-end gap-2 pb-1"><input type="checkbox" checked={v.founder} onChange={(e) => setV({ ...v, founder: e.target.checked })} />Preço fundador (12 meses)</label>
        <div className="flex items-end"><Button size="sm" className="w-full" onClick={async () => {
          try {
            const res = await save({ data: { restaurantId: r.id, plan: v.plan, customLimit: v.custom.trim() ? Number(v.custom) : null, founderPrice: v.founder, billing: v.billing, status: v.status } });
            toast.success(`Plano salvo. Novo limite: ${res.limit} mesas.`); void qc.invalidateQueries({ queryKey: ["plans-admin"] });
          } catch (e) { toast.error((e as Error).message); }
        }}>Salvar</Button></div>
      </div>
    </article>
  );
}
