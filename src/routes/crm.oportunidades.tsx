import { useMemo, useState, type DragEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlarmClock, CalendarClock, GripVertical, KanbanSquare, ListTodo, MoreHorizontal, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { DealDialog } from "@/components/tipe/crm/forms";
import { LOST_REASONS, TASK_STATUS } from "@/components/tipe/crm/labels";
import { Btn, brl, brlShort, ConfirmAction, dateBR, dateTimeBR, Empty, Field, PageHeader, Pill, PriorityPill, relative, SearchInput, Select, TextArea, UserChip } from "@/components/tipe/crm/ui";
import { cn } from "@/lib/utils";
import type { Deal, Stage } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/oportunidades")({
  validateSearch: (s: Record<string, unknown>) => ({ deal: typeof s.deal === "string" ? s.deal : undefined, funil: typeof s.funil === "string" ? s.funil : undefined }),
  component: Oportunidades,
});

function Oportunidades() {
  const { deal: dealId, funil } = Route.useSearch();
  const navigate = useNavigate();
  const { user, members, can, run, openCreate, me } = useCrm();
  const d = useOrgData();
  const pipeline = d.pipelines.find((p) => p.id === funil) ?? d.pipelines[0];
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [prio, setPrio] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [losing, setLosing] = useState<{ deal: Deal; stage: Stage } | null>(null);
  const now = new Date().toISOString();

  const nextTask = useMemo(() => {
    const m = new Map<string, (typeof d.tasks)[number]>();
    for (const t of [...d.tasks].filter((x) => x.dealId && x.status !== "concluida").sort((a, b) => a.dueAt.localeCompare(b.dueAt))) if (!m.has(t.dealId!)) m.set(t.dealId!, t);
    return m;
  }, [d.tasks]);
  const contact = (id: string) => d.contacts.find((c) => c.id === id);
  const company = (id?: string) => d.companies.find((c) => c.id === id);

  if (!pipeline) return <Empty icon={KanbanSquare} title="Nenhum funil" text="Crie um funil em Funis para começar." action={<Link to="/crm/funis" className="text-xs text-primary">Ir para Funis</Link>} />;

  const deals = d.deals.filter((x) => x.pipelineId === pipeline.id && (!q || `${x.title} ${contact(x.contactId)?.name}`.toLowerCase().includes(q.toLowerCase())) && (!owner || x.ownerId === owner) && (!prio || x.priority === prio));
  const editable = (x: Deal) => can("deals.write_any") || (can("deals.write_own") && x.ownerId === me.id);

  function move(x: Deal, st: Stage) {
    if (x.stageId === st.id) return;
    if (!editable(x)) { run({ type: "moveDeal", id: x.id, stageId: st.id }); return; }
    if (st.kind === "perdido") return setLosing({ deal: x, stage: st });
    run({ type: "moveDeal", id: x.id, stageId: st.id }, st.kind === "ganho" ? `${x.title} ganha. Painel, metas e pontos atualizados.` : `Movida para ${st.name}`);
  }
  const onDrop = (e: DragEvent, st: Stage) => {
    e.preventDefault();
    const x = d.deals.find((y) => y.id === e.dataTransfer.getData("text/plain"));
    setDragging(null); setOver(null);
    if (x) move(x, st);
  };
  const selected = d.deals.find((x) => x.id === dealId);

  return (
    <div className="space-y-4">
      <PageHeader title="Oportunidades" description="Arraste os cartões entre as etapas (ou use o menu do cartão). Cada mudança atualiza o painel, as metas e os pontos do responsável." actions={<>
        {d.pipelines.length > 1 && <Select aria-label="Funil" className="h-8 w-auto text-xs" value={pipeline.id} onChange={(e) => navigate({ to: "/crm/oportunidades", search: { funil: e.target.value } })}>{d.pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        {can("deals.create") && <Btn onClick={() => openCreate("deal")}><Plus className="h-4 w-4" />Nova oportunidade</Btn>}
      </>} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_9rem]">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar oportunidade ou cliente" />
        <Select aria-label="Responsável" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Toda a equipe</option><option value={me.id}>Minhas</option>{members.filter((m) => m.user.id !== me.id && m.membership.role !== "viewer").map(({ user: u }) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
        <Select aria-label="Prioridade" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">Toda prioridade</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Select>
      </div>

      <div className="-mx-3 overflow-x-auto px-3 pb-3 sm:-mx-5 sm:px-5" role="region" aria-label={`Funil ${pipeline.name}`}>
        <div className="flex snap-x gap-3">
          {pipeline.stages.map((st) => {
            const items = deals.filter((x) => x.stageId === st.id).sort((a, b) => (st.kind === "aberta" ? b.value - a.value : (b.closedAt ?? "").localeCompare(a.closedAt ?? "")));
            const shown = st.kind === "aberta" ? items : items.slice(0, 8);
            const total = items.reduce((a, x) => a + x.value, 0);
            return (
              <section key={st.id} aria-label={`Etapa ${st.name}`} onDragOver={(e) => { if (dragging) { e.preventDefault(); setOver(st.id); } }} onDragLeave={() => setOver((o) => (o === st.id ? null : o))} onDrop={(e) => onDrop(e, st)}
                className={cn("flex w-[17rem] shrink-0 snap-start flex-col rounded-xl border border-border bg-card/50 transition-colors", over === st.id && "border-primary/60 bg-primary/5", st.kind === "ganho" && "bg-success/[0.04]", st.kind === "perdido" && "bg-destructive/[0.03]")}>
                <header className="border-b border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-xs font-semibold"><span className={cn("h-2 w-2 rounded-full", st.kind === "ganho" ? "bg-success" : st.kind === "perdido" ? "bg-destructive" : "bg-primary")} />{st.name}<span className="font-normal text-muted-foreground">{items.length}</span></h2>
                    <span className="text-[0.65rem] text-muted-foreground">{st.probability}%</span>
                  </div>
                  <p className="money mt-0.5 text-xs font-semibold text-muted-foreground">{brl(total)}</p>
                </header>
                <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                  {shown.map((x) => {
                    const c = contact(x.contactId);
                    const t = nextTask.get(x.id);
                    const late = t && t.dueAt < now;
                    return (
                      <li key={x.id} draggable={editable(x)} onDragStart={(e) => { e.dataTransfer.setData("text/plain", x.id); e.dataTransfer.effectAllowed = "move"; setDragging(x.id); }} onDragEnd={() => { setDragging(null); setOver(null); }}
                        className={cn("group rounded-lg border border-border bg-card p-2.5 shadow-xs transition-[border-color,opacity] hover:border-primary/40", dragging === x.id && "opacity-40", editable(x) && "cursor-grab active:cursor-grabbing")}>
                        <div className="flex items-start gap-1.5">
                          {editable(x) && <GripVertical aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />}
                          <Link to="/crm/oportunidades" search={{ deal: x.id, funil }} className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-xs font-medium leading-snug hover:text-primary">{x.title}</span>
                            <span className="mt-0.5 block truncate text-[0.68rem] text-muted-foreground">{c?.name}{company(x.companyId) ? ` · ${company(x.companyId)!.neighborhood}` : ""}</span>
                          </Link>
                          {editable(x) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={`Mover ${x.title}`}><MoreHorizontal className="h-3.5 w-3.5" /></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-[0.68rem] text-muted-foreground">Mover para</DropdownMenuLabel>
                                {pipeline.stages.filter((s2) => s2.id !== x.stageId).map((s2) => <DropdownMenuItem key={s2.id} className="text-xs" onSelect={() => move(x, s2)}>{s2.name}</DropdownMenuItem>)}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="money text-xs font-semibold">{brlShort(x.value)}</span>
                          <span className="flex items-center gap-1">{x.status === "aberta" && <PriorityPill p={x.priority} />}<UserChip user={user(x.ownerId)} /></span>
                        </div>
                        {x.status === "aberta" && (
                          <p className={cn("mt-2 flex items-center gap-1 border-t border-border pt-1.5 text-[0.65rem]", !t ? "text-warning" : late ? "text-[oklch(0.78_0.12_25)]" : "text-muted-foreground")}>
                            {late ? <AlarmClock className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                            <span className="truncate">{t ? `${t.title.split(":")[0]} · ${relative(t.dueAt)}` : "Sem próxima atividade"}</span>
                          </p>
                        )}
                        {x.status === "perdida" && x.lostReason && <p className="mt-1.5 text-[0.65rem] text-muted-foreground">Motivo: {x.lostReason}</p>}
                      </li>
                    );
                  })}
                  {items.length === 0 && <li className="grid flex-1 place-items-center rounded-lg border border-dashed border-border py-6 text-center text-[0.68rem] text-muted-foreground">{dragging ? "Solte aqui" : "Nenhuma oportunidade"}</li>}
                  {items.length > shown.length && <li className="text-center text-[0.68rem] text-muted-foreground">e mais {items.length - shown.length} em Relatórios</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <DealSheet deal={selected} onClose={() => navigate({ to: "/crm/oportunidades", search: { deal: undefined, funil } })} onMove={move} />
      <LostDialog value={losing} onClose={() => setLosing(null)} />
    </div>
  );
}

function LostDialog({ value, onClose }: { value: { deal: Deal; stage: Stage } | null; onClose: () => void }) {
  const { run } = useCrm();
  const [reason, setReason] = useState(LOST_REASONS[0]);
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader><DialogTitle className="font-display text-base">Marcar como perdida</DialogTitle><DialogDescription className="text-xs">{value?.deal.title}. O motivo alimenta os relatórios de perda.</DialogDescription></DialogHeader>
        <Field label="Motivo da perda">{(id) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>{LOST_REASONS.map((x) => <option key={x}>{x}</option>)}</Select>}</Field>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn variant="destructive" onClick={() => { if (value && run({ type: "moveDeal", id: value.deal.id, stageId: value.stage.id, lostReason: reason }, "Oportunidade marcada como perdida").ok) onClose(); }}>Marcar como perdida</Btn></div>
      </DialogContent>
    </Dialog>
  );
}

function DealSheet({ deal, onClose, onMove }: { deal?: Deal; onClose: () => void; onMove: (d: Deal, s: Stage) => void }) {
  const { user, can, run, openCreate, me } = useCrm();
  const d = useOrgData();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const p = d.pipelines.find((x) => x.id === deal?.pipelineId);
  const c = d.contacts.find((x) => x.id === deal?.contactId);
  const editable = deal && (can("deals.write_any") || (can("deals.write_own") && deal.ownerId === me.id));
  return (
    <>
      <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-lg">
          {deal && p && <>
            <SheetTitle className="pr-6 font-display text-lg leading-snug">{deal.title}</SheetTitle>
            <SheetDescription className="text-xs">{c && <Link to="/crm/contatos/$id" params={{ id: c.id }} className="hover:text-primary">{c.name}</Link>} · criada em {dateBR(deal.createdAt)}</SheetDescription>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div><p className="text-[0.65rem] text-muted-foreground">Valor anual</p><p className="money text-base font-semibold">{brl(deal.value)}</p></div>
              <div><p className="text-[0.65rem] text-muted-foreground">Probabilidade</p><p className="money text-base font-semibold">{deal.probability}%</p></div>
              <div><p className="text-[0.65rem] text-muted-foreground">Previsão</p><p className="text-sm">{dateBR(deal.expectedClose)}</p></div>
              <div><p className="text-[0.65rem] text-muted-foreground">Responsável</p><UserChip user={user(deal.ownerId)} /></div>
              <div><p className="text-[0.65rem] text-muted-foreground">Prioridade</p><PriorityPill p={deal.priority} /></div>
              <div><p className="text-[0.65rem] text-muted-foreground">Situação</p><Pill tone={deal.status === "ganha" ? "success" : deal.status === "perdida" ? "danger" : "primary"}>{deal.status === "ganha" ? "Ganha" : deal.status === "perdida" ? `Perdida · ${deal.lostReason}` : "Aberta"}</Pill></div>
            </div>
            <div className="mt-4">
              <label htmlFor="deal-stage" className="text-[0.65rem] text-muted-foreground">Etapa</label>
              <Select id="deal-stage" disabled={!editable} value={deal.stageId} onChange={(e) => { const st = p.stages.find((s) => s.id === e.target.value); if (st) onMove(deal, st); }}>{p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {editable && <Btn variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Editar</Btn>}
              {can("tasks.write") && <Btn variant="outline" onClick={() => openCreate("task", { dealId: deal.id, contactId: deal.contactId })}><ListTodo className="h-3.5 w-3.5" />Agendar atividade</Btn>}
              {can("deals.delete") && <ConfirmAction trigger={<Btn variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" />Excluir</Btn>} title="Excluir oportunidade?" description="Ela some do funil, dos relatórios e os pontos de venda dela são estornados. Esta ação não pode ser desfeita." confirmLabel="Excluir oportunidade" onConfirm={() => { if (run({ type: "deleteDeal", id: deal.id }, "Oportunidade excluída").ok) onClose(); }} />}
            </div>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximas atividades</h3>
            <ul className="mt-2 divide-y divide-border text-xs">
              {d.tasks.filter((t) => t.dealId === deal.id).sort((a, b) => b.dueAt.localeCompare(a.dueAt)).map((t) => <li key={t.id} className="flex items-center justify-between gap-2 py-2"><Link to="/crm/tarefas" search={{ tarefa: t.id }} className={cn("min-w-0 truncate hover:text-primary", t.status === "concluida" && "text-muted-foreground line-through")}>{t.title}</Link><span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">{dateTimeBR(t.dueAt)}<Pill tone={TASK_STATUS[t.status].tone}>{TASK_STATUS[t.status].label}</Pill></span></li>)}
              {!d.tasks.some((t) => t.dealId === deal.id) && <li className="py-2 text-warning">Sem próxima atividade agendada.</li>}
            </ul>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anotações</h3>
            {can("deals.create") && <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); if (run({ type: "addNote", dealId: deal.id, contactId: deal.contactId, text: note }, "Anotação registrada").ok) setNote(""); }}><TextArea aria-label="Nova anotação" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Registrar contexto da negociação" className="min-h-16" /><div className="flex justify-end"><Btn type="submit" disabled={!note.trim()}><NotebookPen className="h-3.5 w-3.5" />Registrar</Btn></div></form>}
            <ul className="mt-2 space-y-2">{d.notes.filter((n) => n.dealId === deal.id).map((n) => <li key={n.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">{n.text}<p className="mt-1 text-[0.65rem] text-muted-foreground">{user(n.userId)?.name} · {relative(n.at)}</p></li>)}</ul>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h3>
            <ol className="mt-2 space-y-2 border-l border-border pl-3 text-xs">{d.activities.filter((a) => a.dealId === deal.id).map((a) => <li key={a.id}><p>{a.summary}</p><p className="text-[0.65rem] text-muted-foreground">{user(a.actorId)?.name} · {dateTimeBR(a.at)}</p></li>)}</ol>
          </>}
        </SheetContent>
      </Sheet>
      {deal && <DealDialog open={editing} onOpenChange={setEditing} editing={deal} />}
    </>
  );
}
