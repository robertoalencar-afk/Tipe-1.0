import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarClock, KanbanSquare, ListTodo, Mail, MessageCircle, NotebookPen, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { ContactDialog } from "@/components/tipe/crm/forms";
import { CONTACT_STATUS, CONV_STATUS, TASK_STATUS, TASK_TYPE } from "@/components/tipe/crm/labels";
import { Avatar, Btn, brl, ConfirmAction, dateBR, dateTimeBR, Empty, Panel, Pill, PriorityPill, relative, Segmented, TextArea, UserChip } from "@/components/tipe/crm/ui";

export const Route = createFileRoute("/crm/contatos/$id")({ component: ContatoDetalhe });

type Tab = "timeline" | "conversas" | "oportunidades" | "tarefas" | "notas" | "historico";

function ContatoDetalhe() {
  const { id } = Route.useParams();
  const { user, can, run, openCreate } = useCrm();
  const d = useOrgData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("timeline");
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const c = d.contacts.find((x) => x.id === id);

  if (!c) return <Empty icon={UserRound} title="Contato não encontrado" text="Ele pode ter sido excluído ou pertence a outra organização." action={<Link to="/crm/contatos" className="text-xs font-semibold text-primary hover:underline">Voltar para contatos</Link>} />;

  const company = d.companies.find((x) => x.id === c.companyId);
  const deals = d.deals.filter((x) => x.contactId === c.id);
  const tasks = d.tasks.filter((x) => x.contactId === c.id).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const notes = d.notes.filter((x) => x.contactId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const convs = d.conversations.filter((x) => x.contactId === c.id);
  const msgs = d.messages.filter((m) => convs.some((cv) => cv.id === m.conversationId)).sort((a, b) => a.at.localeCompare(b.at));
  const timeline = d.activities.filter((a) => a.contactId === c.id || (a.entity.type === "contact" && a.entity.id === c.id)).sort((a, b) => b.at.localeCompare(a.at));
  const history = timeline.filter((a) => a.changes && Object.keys(a.changes).length);
  const pipeline = (pid: string) => d.pipelines.find((p) => p.id === pid);
  const openConv = convs.find((x) => x.status !== "encerrada");

  const tabs: { value: Tab; label: string }[] = [
    { value: "timeline", label: "Timeline" }, { value: "conversas", label: `Conversas${msgs.length ? ` (${msgs.filter((m) => m.direction !== "nota").length})` : ""}` }, { value: "oportunidades", label: `Oportunidades (${deals.length})` },
    { value: "tarefas", label: `Tarefas (${tasks.length})` }, { value: "notas", label: `Anotações (${notes.length})` }, { value: "historico", label: "Alterações" },
  ];

  return (
    <div className="space-y-4">
      <Link to="/crm/contatos" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Contatos</Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={c.name} className="h-11 w-11 text-sm" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold">{c.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{c.jobTitle || "Sem cargo"}{company && <> · <Link to="/crm/empresas" search={{ empresa: company.id }} className="hover:text-primary">{company.name}</Link></>}</p>
          </div>
          <Pill tone={CONTACT_STATUS[c.status].tone}>{CONTACT_STATUS[c.status].label}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("contacts.write") && <Btn variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Editar</Btn>}
          {can("tasks.write") && <Btn variant="outline" onClick={() => openCreate("task", { contactId: c.id })}><ListTodo className="h-3.5 w-3.5" />Tarefa</Btn>}
          {can("deals.create") && <Btn variant="outline" onClick={() => openCreate("deal", { contactId: c.id })}><KanbanSquare className="h-3.5 w-3.5" />Oportunidade</Btn>}
          {openConv ? <Btn asChild><Link to="/crm/atendimento" search={{ conversa: openConv.id }}><MessageCircle className="h-3.5 w-3.5" />Abrir conversa</Link></Btn> : null}
          {can("contacts.delete") && <ConfirmAction trigger={<Btn variant="ghost" aria-label="Excluir contato" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Btn>} title={`Excluir ${c.name}?`} description="O contato sai da lista e das tarefas vinculadas. Oportunidades abertas impedem a exclusão. Esta ação não pode ser desfeita." confirmLabel="Excluir contato" onConfirm={() => { const r = run({ type: "deleteContact", id: c.id }, "Contato excluído"); if (r.ok) navigate({ to: "/crm/contatos" }); }} />}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Panel title="Dados" className="h-fit">
          <dl className="space-y-3 text-sm">
            {[[Mail, "E-mail", c.email || "—"], [Phone, "Telefone", c.phone || "—"], [MessageCircle, "WhatsApp", c.whatsapp || "—"], [Building2, "Empresa", company?.name ?? "—"], [CalendarClock, "Cliente desde", dateBR(c.createdAt)]].map(([Icon, label, value]) => (
              <div key={label as string} className="flex gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /><div className="min-w-0"><dt className="text-[0.68rem] text-muted-foreground">{label as string}</dt><dd className="break-words text-xs">{value as string}</dd></div></div>
            ))}
            <div><dt className="text-[0.68rem] text-muted-foreground">Origem</dt><dd className="text-xs">{c.source}</dd></div>
            <div><dt className="text-[0.68rem] text-muted-foreground">Responsável</dt><dd className="mt-1"><UserChip user={user(c.ownerId)} /></dd></div>
            <div><dt className="text-[0.68rem] text-muted-foreground">Etiquetas</dt><dd className="mt-1 flex flex-wrap gap-1">{c.tags.length ? c.tags.map((t) => <Pill key={t}>{t}</Pill>) : <span className="text-xs text-muted-foreground">Nenhuma</span>}</dd></div>
            {c.notes && <div><dt className="text-[0.68rem] text-muted-foreground">Observações</dt><dd className="whitespace-pre-line text-xs">{c.notes}</dd></div>}
          </dl>
        </Panel>

        <div className="min-w-0 space-y-3">
          <div className="overflow-x-auto pb-1"><Segmented label="Seções do contato" value={tab} onChange={setTab} options={tabs} /></div>
          <Panel>
            {tab === "timeline" && (timeline.length === 0 ? <Empty icon={CalendarClock} title="Sem histórico" text="Ações com este contato aparecem aqui." /> : (
              <ol className="relative space-y-4 border-l border-border pl-4">
                {timeline.map((a) => (
                  <li key={a.id} className="relative text-xs">
                    <span aria-hidden className="absolute -left-[1.3rem] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
                    <p>{a.summary}</p>
                    <p className="text-[0.68rem] text-muted-foreground">{user(a.actorId)?.name ?? "Sistema"} · {dateTimeBR(a.at)}</p>
                  </li>
                ))}
              </ol>
            ))}
            {tab === "conversas" && (msgs.length === 0 ? <Empty icon={MessageCircle} title="Nenhuma conversa" text="Mensagens de WhatsApp com este contato aparecem aqui." /> : (
              <div className="space-y-2">
                {convs.map((cv) => <div key={cv.id} className="flex items-center justify-between text-xs"><span>Conversa via WhatsApp · <Pill tone={CONV_STATUS[cv.status].tone}>{CONV_STATUS[cv.status].label}</Pill></span><Link to="/crm/atendimento" search={{ conversa: cv.id }} className="text-primary hover:underline">Abrir no atendimento</Link></div>)}
                <ul className="mt-3 space-y-2">
                  {msgs.map((m) => (
                    <li key={m.id} className={m.direction === "entrada" ? "mr-10" : "ml-10"}>
                      <div className={`rounded-lg px-3 py-2 text-xs ${m.direction === "entrada" ? "bg-muted" : m.direction === "nota" ? "border border-warning/30 bg-warning/10" : "bg-primary/15"}`}>{m.direction === "nota" && <span className="font-semibold text-warning">Nota interna · </span>}{m.text}</div>
                      <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{m.direction === "entrada" ? c.name.split(" ")[0] : user(m.authorId)?.name.split(" ")[0]} · {dateTimeBR(m.at)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {tab === "oportunidades" && (deals.length === 0 ? <Empty icon={KanbanSquare} title="Nenhuma oportunidade" text="Crie uma oportunidade para acompanhar a venda." action={can("deals.create") && <Btn onClick={() => openCreate("deal", { contactId: c.id })}><Plus className="h-4 w-4" />Nova oportunidade</Btn>} /> : (
              <ul className="divide-y divide-border">
                {deals.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0">
                    <span className="min-w-0"><Link to="/crm/oportunidades" search={{ deal: x.id }} className="block truncate font-medium hover:text-primary">{x.title}</Link><span className="text-muted-foreground">{pipeline(x.pipelineId)?.stages.find((s) => s.id === x.stageId)?.name} · {user(x.ownerId)?.name.split(" ")[0]}</span></span>
                    <span className="flex shrink-0 items-center gap-2"><span className="money font-semibold">{brl(x.value)}</span><Pill tone={x.status === "ganha" ? "success" : x.status === "perdida" ? "danger" : "primary"}>{x.status === "ganha" ? "Ganha" : x.status === "perdida" ? "Perdida" : `${x.probability}%`}</Pill></span>
                  </li>
                ))}
              </ul>
            ))}
            {tab === "tarefas" && (tasks.length === 0 ? <Empty icon={ListTodo} title="Nenhuma tarefa" text="Agende a próxima ação com este contato." action={can("tasks.write") && <Btn onClick={() => openCreate("task", { contactId: c.id })}><Plus className="h-4 w-4" />Nova tarefa</Btn>} /> : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0">
                    <span className="min-w-0"><Link to="/crm/tarefas" search={{ tarefa: t.id }} className={`block truncate font-medium hover:text-primary ${t.status === "concluida" ? "text-muted-foreground line-through" : ""}`}>{t.title}</Link><span className="text-muted-foreground">{TASK_TYPE[t.type]} · {dateTimeBR(t.dueAt)} · {user(t.assigneeId)?.name.split(" ")[0]}</span></span>
                    <span className="flex shrink-0 gap-1.5"><PriorityPill p={t.priority} /><Pill tone={TASK_STATUS[t.status].tone}>{TASK_STATUS[t.status].label}</Pill></span>
                  </li>
                ))}
              </ul>
            ))}
            {tab === "notas" && (
              <div className="space-y-4">
                {can("contacts.write") && (
                  <form onSubmit={(e) => { e.preventDefault(); const r = run({ type: "addNote", contactId: c.id, text: note }, "Anotação registrada"); if (r.ok) setNote(""); }} className="space-y-2">
                    <label htmlFor="nova-nota" className="text-xs font-semibold text-muted-foreground">Nova anotação</label>
                    <TextArea id="nova-nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que foi conversado, objeções, próximos passos…" />
                    <div className="flex justify-end"><Btn type="submit" disabled={!note.trim()}><NotebookPen className="h-3.5 w-3.5" />Registrar anotação</Btn></div>
                  </form>
                )}
                {notes.length === 0 ? <Empty icon={NotebookPen} title="Sem anotações" text="Registre o contexto das conversas para a equipe." /> : (
                  <ul className="space-y-2">{notes.map((n) => <li key={n.id} className="rounded-lg bg-muted/50 p-3 text-xs"><p className="whitespace-pre-line">{n.text}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{user(n.userId)?.name} · {relative(n.at)}</p></li>)}</ul>
                )}
              </div>
            )}
            {tab === "historico" && (history.length === 0 ? <Empty icon={Pencil} title="Sem alterações registradas" text="Cada edição deste contato e das oportunidades dele fica registrada com o antes e o depois." /> : (
              <ul className="space-y-3">
                {history.map((a) => (
                  <li key={a.id} className="text-xs">
                    <p className="font-medium">{a.summary}</p>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">{Object.entries(a.changes!).map(([k, [from, to]]) => <li key={k}><span className="text-foreground">{k}</span>: {fmt(user(String(from))?.name ?? from)} → {fmt(user(String(to))?.name ?? to)}</li>)}</ul>
                    <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{user(a.actorId)?.name} · {dateTimeBR(a.at)}</p>
                  </li>
                ))}
              </ul>
            ))}
          </Panel>
        </div>
      </div>
      <ContactDialog open={editing} onOpenChange={setEditing} editing={c} />
    </div>
  );
}

function fmt(v: unknown) {
  if (v === undefined || v === null || v === "") return "vazio";
  if (Array.isArray(v)) return v.join(", ") || "vazio";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
