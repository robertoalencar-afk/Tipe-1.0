import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, BadgeCheck, Ban, Filter, Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { LeadDialog, SOURCES } from "@/components/tipe/crm/forms";
import { LEAD_STATUS } from "@/components/tipe/crm/labels";
import { Btn, dateTimeBR, Empty, Field, Hint, PageHeader, Pill, relative, SearchInput, Segmented, Select, TextInput, UserChip } from "@/components/tipe/crm/ui";
import { CLOSE_TIMES, PAGARME, QUEUES, ROLE_LABEL as LEAD_ROLE, TABLES, leadScore } from "@/lib/tipe/leads-score";
import type { Lead, LeadStatus } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/leads")({
  validateSearch: (s: Record<string, unknown>) => ({ lead: typeof s.lead === "string" ? s.lead : undefined }),
  component: Leads,
});

type View = "abertos" | LeadStatus | "todos";
const DISQUALIFY = ["Fora da região atendida", "Sem interesse no momento", "Ainda sem CNPJ", "Contato inválido", "Já é cliente"];

function Leads() {
  const { lead: selectedId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, members, can, run, openCreate, me } = useCrm();
  const { leads, activities } = useOrgData();
  const [view, setView] = useState<View>("abertos");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [converting, setConverting] = useState<Lead | null>(null);
  const [disq, setDisq] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);

  const counts = useMemo(() => ({
    abertos: leads.filter((l) => ["novo", "contatado", "qualificado"].includes(l.status)).length,
    novo: leads.filter((l) => l.status === "novo").length,
    qualificado: leads.filter((l) => l.status === "qualificado").length,
    convertido: leads.filter((l) => l.status === "convertido").length,
    desqualificado: leads.filter((l) => l.status === "desqualificado").length,
  }), [leads]);
  const rows = leads
    .filter((l) => view === "todos" || (view === "abertos" ? ["novo", "contatado", "qualificado"].includes(l.status) : l.status === view))
    .filter((l) => (!q || `${l.name} ${l.companyName} ${l.email} ${l.phone}`.toLowerCase().includes(q.toLowerCase())) && (!owner || l.ownerId === owner) && (!source || l.source === source))
    .map((l) => ({ ...l, score: leadScore(l.profile) }))
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
  const selected = leads.find((l) => l.id === selectedId);
  const canEdit = (l: Lead) => can("leads.write") && l.status !== "convertido";

  const actions = (l: Lead) => canEdit(l) && (
    <div className="flex flex-wrap justify-end gap-1">
      {l.status !== "qualificado" && l.status !== "desqualificado" && <Btn variant="outline" className="h-7 px-2" onClick={() => run({ type: "qualifyLead", id: l.id }, `${l.name} qualificado`)}><BadgeCheck className="h-3.5 w-3.5" />Qualificar</Btn>}
      {l.status !== "desqualificado" && can("deals.create") && <Btn className="h-7 px-2" onClick={() => setConverting(l)}><ArrowRightLeft className="h-3.5 w-3.5" />Converter</Btn>}
      {l.status !== "desqualificado" && <Btn variant="ghost" className="h-7 px-2" aria-label={`Desqualificar ${l.name}`} onClick={() => setDisq(l)}><Ban className="h-3.5 w-3.5" /></Btn>}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Leads" description="Restaurantes interessados, com a mesma pontuação da lista de espera da landing. Qualifique e converta em oportunidade." actions={can("leads.write") && <Btn onClick={() => openCreate("lead")}><Plus className="h-4 w-4" />Novo lead</Btn>} />
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="overflow-x-auto"><Segmented label="Situação dos leads" value={view} onChange={setView} options={[{ value: "abertos", label: `Em aberto (${counts.abertos})` }, { value: "novo", label: `Novos (${counts.novo})` }, { value: "qualificado", label: `Qualificados (${counts.qualificado})` }, { value: "convertido", label: `Convertidos (${counts.convertido})` }, { value: "desqualificado", label: `Descartados (${counts.desqualificado})` }, { value: "todos", label: "Todos" }]} /></div>
        <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar lead" />
          <Select aria-label="Responsável" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Todos</option><option value={me.id}>Meus leads</option>{members.filter((m) => m.user.id !== me.id).map(({ user: u }) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Select aria-label="Origem" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Todas as origens</option>{SOURCES.map((x) => <option key={x}>{x}</option>)}</Select>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Filter} title="Nenhum lead aqui" text={q || owner || source ? "Nenhum lead com esses filtros." : "Quando chegar um interessado pela landing, WhatsApp ou indicação, ele aparece nesta lista."} action={can("leads.write") && <Btn onClick={() => openCreate("lead")}><Plus className="h-4 w-4" />Novo lead</Btn>} /> : (
        <div className="crm-panel overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((l) => (
              <li key={l.id} className="grid gap-2 px-4 py-3 md:grid-cols-[3rem_minmax(0,1.6fr)_minmax(0,1fr)_7rem_auto] md:items-center">
                <span className={`money grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${l.score >= 60 ? "bg-success/15 text-success" : l.score >= 35 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`} title="Pontuação do perfil (0 a 100)">{l.score}</span>
                <Link to="/crm/leads" search={{ lead: l.id }} className="min-w-0">
                  <span className="block truncate font-medium hover:text-primary">{l.name} <span className="text-muted-foreground">· {l.companyName || "Sem empresa"}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{l.source} · {relative(l.createdAt)} · {l.email || l.phone}</span>
                </Link>
                <span className="flex flex-wrap items-center gap-1.5 text-xs"><Pill tone={LEAD_STATUS[l.status].tone}>{LEAD_STATUS[l.status].label}</Pill>{l.profile.tables_range && <Pill>{TABLES[l.profile.tables_range]} mesas</Pill>}{l.profile.peak_queue === "sempre" && <Pill tone="warning">Fila no pico</Pill>}</span>
                <UserChip user={user(l.ownerId)} />
                {actions(l) || (l.dealId ? <Link to="/crm/oportunidades" search={{ deal: l.dealId }} className="text-right text-xs text-primary hover:underline">Ver oportunidade</Link> : <span />)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && navigate({ to: "/crm/leads", search: { lead: undefined } })}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {selected && <>
            <SheetTitle className="font-display text-lg">{selected.name}</SheetTitle>
            <SheetDescription className="text-xs">{selected.companyName || "Sem empresa"} · {selected.source}</SheetDescription>
            <div className="mt-3 flex items-center gap-2"><Pill tone={LEAD_STATUS[selected.status].tone}>{LEAD_STATUS[selected.status].label}</Pill><span className="text-xs text-muted-foreground">Pontuação {leadScore(selected.profile)}</span><Hint text="Mesma regra da lista de espera: fila no pico, tempo de fechamento, mesas, cargo, região, indicação e Pagar.me." /></div>
            <div className="mt-3 flex flex-wrap gap-2">{actions(selected)}{canEdit(selected) && <Btn variant="outline" onClick={() => setEditing(selected)}><Pencil className="h-3.5 w-3.5" />Editar</Btn>}</div>
            {selected.disqualifyReason && <p className="mt-3 text-xs text-muted-foreground">Motivo do descarte: {selected.disqualifyReason}</p>}
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              {[["E-mail", selected.email], ["Telefone", selected.phone], ["Mesas", TABLES[selected.profile.tables_range ?? ""]], ["PDV", selected.profile.pdv_system], ["Fila no pico", QUEUES[selected.profile.peak_queue ?? ""]], ["Fechar a conta", CLOSE_TIMES[selected.profile.close_time ?? ""]], ["Contato é", LEAD_ROLE[selected.profile.contact_role ?? ""]], ["Pagar.me", PAGARME[selected.profile.has_pagarme ?? ""]], ["Responsável", user(selected.ownerId)?.name]].map(([k, v]) => <div key={k}><dt className="text-[0.65rem] text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>)}
            </dl>
            {can("leads.write") && selected.status !== "convertido" && (
              <div className="mt-4"><label htmlFor="lead-owner" className="text-[0.65rem] text-muted-foreground">Atribuir a</label><Select id="lead-owner" value={selected.ownerId} onChange={(e) => run({ type: "updateLead", id: selected.id, data: { ownerId: e.target.value } }, "Responsável atualizado")}>{members.filter((m) => m.membership.role !== "viewer").map(({ user: u }) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></div>
            )}
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h3>
            <ol className="mt-2 space-y-2 border-l border-border pl-3 text-xs">
              {activities.filter((a) => a.entity.id === selected.id || (selected.dealId && a.dealId === selected.dealId)).map((a) => <li key={a.id}><p>{a.summary}</p><p className="text-[0.65rem] text-muted-foreground">{user(a.actorId)?.name} · {dateTimeBR(a.at)}</p></li>)}
              <li><p>Lead criado</p><p className="text-[0.65rem] text-muted-foreground">{dateTimeBR(selected.createdAt)}</p></li>
            </ol>
          </>}
        </SheetContent>
      </Sheet>

      <ConvertDialog lead={converting} onClose={() => setConverting(null)} onDone={(dealId) => navigate({ to: "/crm/oportunidades", search: { deal: dealId } })} />
      <DisqualifyDialog lead={disq} onClose={() => setDisq(null)} />
      <LeadDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} editing={editing ?? undefined} />
    </div>
  );
}

function ConvertDialog({ lead, onClose, onDone }: { lead: Lead | null; onClose: () => void; onDone: (dealId: string) => void }) {
  const { run } = useCrm();
  const { pipelines } = useOrgData();
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [touched, setTouched] = useState(false);
  const err = touched && !(Number(value) > 0) ? "Informe o valor anual estimado." : undefined;
  function submit(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!lead || !(Number(value) > 0)) return;
    const r = run({ type: "convertLead", id: lead.id, title: title || `${lead.companyName || lead.name}: assinatura Tipe`, value: Number(value), pipelineId: pipelineId || undefined }, "Lead convertido: contato, empresa e oportunidade criados");
    if (r.ok) { onClose(); setValue(""); setTitle(""); setTouched(false); onDone(r.id!); }
  }
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader><DialogTitle className="font-display text-base">Converter {lead?.name}</DialogTitle><DialogDescription className="text-xs">Cria (ou reaproveita) o contato e a empresa e abre a oportunidade na etapa Qualificação.</DialogDescription></DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Título da oportunidade">{(id) => <TextInput id={id} placeholder={`${lead?.companyName || lead?.name}: assinatura Tipe`} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="Valor anual estimado (R$)" error={err}>{(id, d) => <TextInput id={id} type="number" min={0} step={100} autoFocus aria-describedby={d} aria-invalid={!!err || undefined} value={value} onBlur={() => setTouched(true)} onChange={(e) => setValue(e.target.value)} />}</Field>
          {pipelines.length > 1 && <Field label="Funil">{(id) => <Select id={id} value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>{pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>}
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit"><ArrowRightLeft className="h-3.5 w-3.5" />Converter em oportunidade</Btn></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DisqualifyDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const { run } = useCrm();
  const [reason, setReason] = useState(DISQUALIFY[0]);
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader><DialogTitle className="font-display text-base">Descartar {lead?.name}?</DialogTitle><DialogDescription className="text-xs">O lead sai da lista em aberto. Dá para consultar depois em Descartados.</DialogDescription></DialogHeader>
        <Field label="Motivo">{(id) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>{DISQUALIFY.map((x) => <option key={x}>{x}</option>)}</Select>}</Field>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Manter</Btn><Btn variant="destructive" onClick={() => { if (lead && run({ type: "disqualifyLead", id: lead.id, reason }, "Lead descartado").ok) onClose(); }}>Descartar lead</Btn></div>
      </DialogContent>
    </Dialog>
  );
}
