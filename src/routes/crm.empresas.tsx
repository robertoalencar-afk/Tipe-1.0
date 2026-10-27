import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Pencil, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { CompanyDialog } from "@/components/tipe/crm/forms";
import { CONTACT_STATUS } from "@/components/tipe/crm/labels";
import { Btn, brl, brlShort, Empty, PageHeader, Pill, SearchInput, Select, UserChip } from "@/components/tipe/crm/ui";
import type { Company } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/empresas")({
  validateSearch: (s: Record<string, unknown>) => ({ empresa: typeof s.empresa === "string" ? s.empresa : undefined }),
  component: Empresas,
});

function Empresas() {
  const { empresa } = Route.useSearch();
  const navigate = useNavigate();
  const { user, can, openCreate } = useCrm();
  const d = useOrgData();
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("");
  const [editing, setEditing] = useState<Company | null>(null);
  const segments = [...new Set(d.companies.map((c) => c.segment))].sort();
  const stats = useMemo(() => new Map(d.companies.map((c) => {
    const deals = d.deals.filter((x) => x.companyId === c.id);
    return [c.id, { contacts: d.contacts.filter((x) => x.companyId === c.id).length, won: deals.filter((x) => x.status === "ganha").reduce((a, x) => a + x.value, 0), open: deals.filter((x) => x.status === "aberta").reduce((a, x) => a + x.value, 0) }];
  })), [d]);
  const rows = d.companies.filter((c) => (!q || `${c.name} ${c.neighborhood} ${c.pdv}`.toLowerCase().includes(q.toLowerCase())) && (!segment || c.segment === segment)).sort((a, b) => a.name.localeCompare(b.name));
  const selected = d.companies.find((c) => c.id === empresa);
  const close = () => navigate({ to: "/crm/empresas", search: { empresa: undefined } });

  return (
    <div className="space-y-4">
      <PageHeader title="Empresas" description="Restaurantes, bares e grupos atendidos. Valores somam as oportunidades de cada empresa." actions={can("contacts.write") && <Btn onClick={() => openCreate("company")}><Plus className="h-4 w-4" />Nova empresa</Btn>} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nome, bairro ou PDV" />
        <Select aria-label="Segmento" value={segment} onChange={(e) => setSegment(e.target.value)}><option value="">Todos os segmentos</option>{segments.map((x) => <option key={x}>{x}</option>)}</Select>
      </div>
      {rows.length === 0 ? <Empty icon={Building2} title={q || segment ? "Nenhuma empresa com esses filtros" : "Nenhuma empresa ainda"} text="Empresas também são criadas ao converter um lead." /> : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const st = stats.get(c.id)!;
            return (
              <Link key={c.id} to="/crm/empresas" search={{ empresa: c.id }} className="crm-panel block p-3.5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{c.segment} · {c.neighborhood || c.city} · {c.size}</span></span>
                  <UserChip user={user(c.ownerId)} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                  <div><dt className="text-[0.65rem] text-muted-foreground">Contatos</dt><dd className="money font-semibold">{st.contacts}</dd></div>
                  <div><dt className="text-[0.65rem] text-muted-foreground">Ganho</dt><dd className="money font-semibold text-success">{brlShort(st.won)}</dd></div>
                  <div><dt className="text-[0.65rem] text-muted-foreground">Em aberto</dt><dd className="money font-semibold">{brlShort(st.open)}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
      <Sheet open={!!selected} onOpenChange={(o) => !o && close()}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {selected && <>
            <SheetTitle className="font-display text-lg">{selected.name}</SheetTitle>
            <SheetDescription className="text-xs">{selected.segment} em {selected.neighborhood ? `${selected.neighborhood}, ` : ""}{selected.city} · PDV {selected.pdv || "não informado"}</SheetDescription>
            {can("contacts.write") && <Btn variant="outline" className="mt-3" onClick={() => setEditing(selected)}><Pencil className="h-3.5 w-3.5" />Editar empresa</Btn>}
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contatos</h3>
            <ul className="mt-2 divide-y divide-border">
              {d.contacts.filter((x) => x.companyId === selected.id).map((x) => <li key={x.id} className="flex items-center justify-between py-2 text-xs"><Link to="/crm/contatos/$id" params={{ id: x.id }} className="font-medium hover:text-primary">{x.name}</Link><Pill tone={CONTACT_STATUS[x.status].tone}>{CONTACT_STATUS[x.status].label}</Pill></li>)}
            </ul>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oportunidades</h3>
            <ul className="mt-2 divide-y divide-border">
              {d.deals.filter((x) => x.companyId === selected.id).map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-xs"><Link to="/crm/oportunidades" search={{ deal: x.id }} className="min-w-0 truncate hover:text-primary">{x.title}</Link><span className="money shrink-0">{brl(x.value)}</span></li>)}
              {!d.deals.some((x) => x.companyId === selected.id) && <li className="py-2 text-xs text-muted-foreground">Nenhuma oportunidade.</li>}
            </ul>
          </>}
        </SheetContent>
      </Sheet>
      <CompanyDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} editing={editing ?? undefined} />
    </div>
  );
}
