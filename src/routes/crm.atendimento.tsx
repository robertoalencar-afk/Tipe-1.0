import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCheck, Filter, Inbox, KanbanSquare, MessageCircle, MessageSquarePlus, NotebookPen, Send, Tag, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { CONV_STATUS } from "@/components/tipe/crm/labels";
import { Avatar, Btn, brl, DemoNote, Empty, Field, Pill, relative, SearchInput, Segmented, Select, TextArea, TextInput, timeBR } from "@/components/tipe/crm/ui";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/atendimento")({
  validateSearch: z.object({ conversa: z.string().optional().catch(undefined) }),
  component: Atendimento,
});

type Box = "todas" | "minhas" | "sem" | "naolidas";

function Atendimento() {
  const { conversa } = Route.useSearch();
  const navigate = useNavigate();
  const { me, user, can } = useCrm();
  const d = useOrgData();
  const [box, setBox] = useState<Box>("todas");
  const [status, setStatus] = useState<"ativas" | "encerrada">("ativas");
  const [q, setQ] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const contact = (id: string) => d.contacts.find((c) => c.id === id);
  const lastMsg = useMemo(() => {
    const m = new Map<string, (typeof d.messages)[number]>();
    for (const x of d.messages) if (x.direction !== "nota" && (!m.get(x.conversationId) || m.get(x.conversationId)!.at < x.at)) m.set(x.conversationId, x);
    return m;
  }, [d.messages]);
  const list = d.conversations
    .filter((c) => (status === "ativas" ? c.status !== "encerrada" : c.status === "encerrada"))
    .filter((c) => box === "todas" || (box === "minhas" ? c.assigneeId === me.id : box === "sem" ? !c.assigneeId : c.unread > 0))
    .filter((c) => !q || `${contact(c.contactId)?.name} ${c.tags.join(" ")} ${lastMsg.get(c.id)?.text}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const selected = d.conversations.find((c) => c.id === conversa);
  const open = (id?: string) => navigate({ to: "/crm/atendimento", search: { conversa: id } });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-display text-xl font-bold sm:text-2xl">Atendimento</h1><p className="text-sm text-muted-foreground">Caixa de entrada compartilhada do WhatsApp comercial.</p></div>
        {can("inbox.simulate") && <Btn variant="outline" onClick={() => setSimOpen(true)}><MessageSquarePlus className="h-3.5 w-3.5" />Simular mensagem recebida</Btn>}
      </div>
      <DemoNote>Modo demonstração: mensagens recebidas e enviadas são simuladas. Nada sai para o WhatsApp até a integração oficial ser conectada em WhatsApp.</DemoNote>

      <div className="crm-panel grid h-[calc(100dvh-15rem)] min-h-[32rem] overflow-hidden lg:grid-cols-[19rem_minmax(0,1fr)_17rem] md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className={cn("flex min-h-0 flex-col border-r border-border", selected && "hidden md:flex")} aria-label="Conversas">
          <div className="space-y-2 border-b border-border p-2.5">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar conversa" />
            <div className="flex gap-1.5">
              <Select aria-label="Caixa" className="h-8 text-xs" value={box} onChange={(e) => setBox(e.target.value as Box)}><option value="todas">Todas</option><option value="minhas">Minhas</option><option value="sem">Sem atendente</option><option value="naolidas">Não lidas</option></Select>
              <Select aria-label="Status" className="h-8 text-xs" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="ativas">Abertas e pendentes</option><option value="encerrada">Encerradas</option></Select>
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {list.length === 0 && <li className="p-6 text-center text-xs text-muted-foreground"><Filter className="mx-auto mb-2 h-5 w-5" />Nenhuma conversa nesta caixa.</li>}
            {list.map((c) => {
              const ct = contact(c.contactId);
              const lm = lastMsg.get(c.id);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c.id)} aria-current={c.id === conversa} className={cn("flex w-full gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50", c.id === conversa && "bg-muted")}>
                    <Avatar name={ct?.name ?? "?"} className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className={cn("truncate text-xs", c.unread ? "font-semibold" : "font-medium")}>{ct?.name}</span><span className="shrink-0 text-[0.62rem] text-muted-foreground">{relative(c.lastMessageAt)}</span></span>
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-[0.7rem] text-muted-foreground">{lm?.direction === "saida" && "Você: "}{lm?.text}</span>{c.unread > 0 && <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground" aria-label={`${c.unread} não lidas`}>{c.unread}</span>}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">{c.status === "pendente" && <Pill tone="warning">Pendente</Pill>}{!c.assigneeId ? <Pill tone="info">Sem atendente</Pill> : <span className="text-[0.62rem] text-muted-foreground">{user(c.assigneeId)?.name.split(" ")[0]}</span>}{c.tags.slice(0, 2).map((t) => <Pill key={t}>{t}</Pill>)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        {selected ? <Thread conv={selected} onBack={() => open(undefined)} /> : <div className="hidden place-items-center md:grid"><Empty icon={Inbox} title="Escolha uma conversa" text="Responda, transfira, marque etiquetas e crie oportunidades sem sair do atendimento." /></div>}
        {selected && <ContactPanel conv={selected} />}
      </div>
      <SimulateDialog open={simOpen} onOpenChange={setSimOpen} onDone={(id) => open(id)} />
    </div>
  );
}

function Thread({ conv, onBack }: { conv: Conversation; onBack: () => void }) {
  const { user, me, members, can, run } = useCrm();
  const d = useOrgData();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"resposta" | "nota">("resposta");
  const [tagInput, setTagInput] = useState("");
  const [dealOpen, setDealOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const contact = d.contacts.find((c) => c.id === conv.contactId)!;
  const msgs = d.messages.filter((m) => m.conversationId === conv.id).sort((a, b) => a.at.localeCompare(b.at));
  const closed = conv.status === "encerrada";
  const slash = text.startsWith("/") ? d.quickReplies.filter((r) => r.shortcut.startsWith(text.split(" ")[0])) : [];

  useEffect(() => { if (conv.unread) run({ type: "markConversationRead", conversationId: conv.id }); }, [conv.id, conv.unread]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, conv.id]);

  function send(e?: FormEvent) {
    e?.preventDefault();
    const r = run(mode === "nota" ? { type: "addInternalNote", conversationId: conv.id, text } : { type: "sendMessage", conversationId: conv.id, text }, mode === "nota" ? "Nota interna salva" : undefined);
    if (r.ok) setText("");
  }

  return (
    <section className="flex min-h-0 flex-col" aria-label={`Conversa com ${contact.name}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <button type="button" onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted md:hidden" aria-label="Voltar para a lista"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{contact.name}</p><p className="truncate text-[0.68rem] text-muted-foreground">{contact.whatsapp || contact.phone} · WhatsApp · <Pill tone={CONV_STATUS[conv.status].tone}>{CONV_STATUS[conv.status].label}</Pill></p></div>
        {can("inbox.assign") ? (
          <Select aria-label={conv.assigneeId ? "Transferir conversa" : "Atribuir atendente"} className="h-8 w-40 text-xs" value={conv.assigneeId ?? ""} onChange={(e) => e.target.value && run({ type: "assignConversation", conversationId: conv.id, userId: e.target.value }, conv.assigneeId ? "Conversa transferida" : "Atendente atribuído")}>
            {!conv.assigneeId && <option value="">Atribuir a…</option>}
            {members.filter((m) => m.membership.role !== "viewer").map(({ user: u }) => <option key={u.id} value={u.id}>{u.id === me.id ? "Eu" : u.name}</option>)}
          </Select>
        ) : <span className="text-xs text-muted-foreground">{conv.assigneeId ? `Com ${user(conv.assigneeId)?.name.split(" ")[0]}` : "Sem atendente"}</span>}
        {can("inbox.reply") && (closed
          ? <Btn variant="outline" onClick={() => run({ type: "setConversationStatus", conversationId: conv.id, status: "aberta" }, "Conversa reaberta")}>Reabrir</Btn>
          : <>
            <Btn variant="ghost" onClick={() => run({ type: "setConversationStatus", conversationId: conv.id, status: conv.status === "pendente" ? "aberta" : "pendente" })}>{conv.status === "pendente" ? "Retomar" : "Pendente"}</Btn>
            <Btn variant="outline" onClick={() => run({ type: "setConversationStatus", conversationId: conv.id, status: "encerrada" }, "Atendimento encerrado")}><CheckCheck className="h-3.5 w-3.5" />Encerrar</Btn>
          </>)}
      </header>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        {conv.tags.map((t) => <button key={t} type="button" disabled={!can("inbox.reply")} onClick={() => run({ type: "setConversationTags", conversationId: conv.id, tags: conv.tags.filter((x) => x !== t) })} className="rounded-md bg-muted px-1.5 text-[0.68rem] hover:bg-destructive/20" aria-label={`Remover etiqueta ${t}`}>{t} ×</button>)}
        {can("inbox.reply") && <form onSubmit={(e) => { e.preventDefault(); if (tagInput.trim()) { run({ type: "setConversationTags", conversationId: conv.id, tags: [...conv.tags, tagInput] }); setTagInput(""); } }}><input aria-label="Nova etiqueta" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="+ etiqueta" className="h-6 w-24 rounded-md border border-transparent bg-transparent px-1.5 text-[0.68rem] focus:border-input focus:outline-none" /></form>}
        <span className="ml-auto flex gap-1">
          {can("leads.write") && <Btn variant="ghost" className="h-7 px-2" onClick={() => run({ type: "createLeadFromConversation", conversationId: conv.id }, "Lead criado a partir da conversa")}>Criar lead</Btn>}
          {can("deals.create") && <Btn variant="ghost" className="h-7 px-2" onClick={() => setDealOpen(true)}><KanbanSquare className="h-3.5 w-3.5" />Criar oportunidade</Btn>}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background/30 px-3 py-3" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.direction === "entrada" ? "justify-start" : m.direction === "nota" ? "justify-center" : "justify-end")}>
            <div className={cn("max-w-[78%] rounded-xl px-3 py-2 text-xs", m.direction === "entrada" && "rounded-bl-sm bg-muted", m.direction === "saida" && "rounded-br-sm bg-primary/20", m.direction === "nota" && "max-w-[90%] border border-warning/25 bg-warning/10 text-[0.7rem]")}>
              {m.direction === "nota" && <span className="mr-1 font-semibold text-warning"><NotebookPen className="mr-0.5 inline h-3 w-3" />Nota interna</span>}
              <span className="whitespace-pre-line">{m.text}</span>
              <span className="mt-0.5 block text-right text-[0.6rem] text-muted-foreground">{m.direction === "saida" && `${user(m.authorId)?.name.split(" ")[0]} · `}{timeBR(m.at)}{m.direction === "saida" && ` · ${m.status === "simulada" ? "envio simulado" : m.status}`}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {can("inbox.reply") && (
        <form onSubmit={send} className="border-t border-border p-2.5">
          {closed ? <p className="py-2 text-center text-xs text-muted-foreground">Atendimento encerrado. Reabra para responder.</p> : <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Segmented label="Tipo de mensagem" value={mode} onChange={setMode} options={[{ value: "resposta", label: "Responder" }, { value: "nota", label: "Nota interna" }]} />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted"><Zap className="h-3.5 w-3.5" />Respostas rápidas</DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="text-[0.68rem] text-muted-foreground">Digite / no campo ou escolha</DropdownMenuLabel>
                  {d.quickReplies.map((r) => <DropdownMenuItem key={r.id} className="flex-col items-start text-xs" onSelect={() => setText(r.text)}><span className="font-semibold text-primary">{r.shortcut}</span><span className="line-clamp-2 text-muted-foreground">{r.text}</span></DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {slash.length > 0 && <ul className="mb-2 rounded-lg border border-border bg-popover p-1">{slash.map((r) => <li key={r.id}><button type="button" onClick={() => setText(r.text)} className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"><span className="font-semibold text-primary">{r.shortcut}</span> {r.text}</button></li>)}</ul>}
            <div className="flex items-end gap-2">
              <TextArea aria-label={mode === "nota" ? "Nota interna" : "Mensagem"} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send(); } }} placeholder={mode === "nota" ? "Visível só para a equipe" : "Escreva uma resposta (Enter envia, Shift+Enter quebra linha)"} className={cn("min-h-10 resize-none", mode === "nota" && "border-warning/40")} rows={2} />
              <Btn type="submit" disabled={!text.trim()} className="h-10 w-10 shrink-0 p-0" aria-label={mode === "nota" ? "Salvar nota" : "Enviar mensagem simulada"}>{mode === "nota" ? <NotebookPen className="h-4 w-4" /> : <Send className="h-4 w-4" />}</Btn>
            </div>
          </>}
        </form>
      )}
      <DealFromConv conv={conv} open={dealOpen} onOpenChange={setDealOpen} />
    </section>
  );
}

function ContactPanel({ conv }: { conv: Conversation }) {
  const { user, can, run } = useCrm();
  const d = useOrgData();
  const c = d.contacts.find((x) => x.id === conv.contactId);
  const [reply, setReply] = useState("");
  if (!c) return null;
  const company = d.companies.find((x) => x.id === c.companyId);
  const deals = d.deals.filter((x) => x.contactId === c.id);
  return (
    <aside className="hidden min-h-0 overflow-y-auto border-l border-border p-3 text-xs lg:block" aria-label="Dados do contato">
      <div className="text-center"><Avatar name={c.name} className="mx-auto h-12 w-12 text-sm" /><p className="mt-2 font-semibold">{c.name}</p><p className="text-muted-foreground">{c.jobTitle}{company && ` · ${company.name}`}</p><Link to="/crm/contatos/$id" params={{ id: c.id }} className="mt-1 inline-block text-primary hover:underline">Abrir ficha</Link></div>
      <dl className="mt-4 space-y-2"><div><dt className="text-[0.65rem] text-muted-foreground">E-mail</dt><dd className="break-all">{c.email || "—"}</dd></div><div><dt className="text-[0.65rem] text-muted-foreground">Responsável comercial</dt><dd>{user(c.ownerId)?.name}</dd></div></dl>
      <h3 className="mt-4 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Oportunidades</h3>
      <ul className="mt-1.5 space-y-1.5">{deals.map((x) => <li key={x.id}><Link to="/crm/oportunidades" search={{ deal: x.id }} className="block rounded-lg border border-border p-2 hover:border-primary/40"><span className="line-clamp-1">{x.title}</span><span className="money text-muted-foreground">{brl(x.value)} · {x.status === "aberta" ? `${x.probability}%` : x.status}</span></Link></li>)}{!deals.length && <li className="text-muted-foreground">Nenhuma.</li>}</ul>
      {can("inbox.simulate") && conv.status !== "encerrada" && (
        <form className="mt-5 space-y-1.5 rounded-lg border border-dashed border-info/40 p-2" onSubmit={(e) => { e.preventDefault(); if (run({ type: "simulateInbound", contactId: c.id, text: reply }).ok) setReply(""); }}>
          <p className="font-semibold text-info">Simular resposta do cliente</p>
          <TextInput aria-label="Mensagem simulada do cliente" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ex.: Pode ser amanhã às 15h" className="h-8 text-xs" />
          <Btn type="submit" variant="outline" className="w-full" disabled={!reply.trim()}><MessageCircle className="h-3.5 w-3.5" />Receber mensagem</Btn>
        </form>
      )}
    </aside>
  );
}

function DealFromConv({ conv, open, onOpenChange }: { conv: Conversation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run } = useCrm();
  const d = useOrgData();
  const contact = d.contacts.find((c) => c.id === conv.contactId);
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const err = touched && !(Number(value) > 0) ? "Informe o valor anual estimado." : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader><DialogTitle className="font-display text-base">Nova oportunidade</DialogTitle><DialogDescription className="text-xs">Para {contact?.name}, na primeira etapa do funil, ligada a esta conversa.</DialogDescription></DialogHeader>
        <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!(Number(value) > 0)) return; if (run({ type: "createDealFromConversation", conversationId: conv.id, title, value: Number(value) }, "Oportunidade criada no funil").ok) { onOpenChange(false); setValue(""); setTitle(""); setTouched(false); } }}>
          <Field label="Título">{(id) => <TextInput id={id} placeholder={`${contact?.name}: assinatura Tipe`} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="Valor anual estimado (R$)" error={err}>{(id, dd) => <TextInput id={id} type="number" min={0} autoFocus aria-describedby={dd} aria-invalid={!!err || undefined} value={value} onBlur={() => setTouched(true)} onChange={(e) => setValue(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Btn><Btn type="submit">Criar oportunidade</Btn></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SimulateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (id: string) => void }) {
  const { run } = useCrm();
  const d = useOrgData();
  const [mode, setMode] = useState<"existente" | "novo">("novo");
  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("Olá! Vi a Tipe no Instagram e queria entender como funciona o pagamento na mesa.");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader><DialogTitle className="font-display text-base">Simular mensagem recebida</DialogTitle><DialogDescription className="text-xs">Funciona como o webhook do WhatsApp: abre ou reabre a conversa, avisa o atendente e cria o contato se o número for novo. Nenhuma mensagem real é recebida.</DialogDescription></DialogHeader>
        <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); const r = run(mode === "existente" ? { type: "simulateInbound", contactId, text } : { type: "simulateInbound", name, phone, text }, "Mensagem simulada recebida"); if (r.ok) { onOpenChange(false); onDone(r.id!); } }}>
          <Segmented label="Remetente" value={mode} onChange={setMode} options={[{ value: "novo", label: "Número novo" }, { value: "existente", label: "Contato existente" }]} />
          {mode === "existente" ? <Field label="Contato">{(id) => <Select id={id} value={contactId} onChange={(e) => setContactId(e.target.value)}><option value="">Escolha</option>{d.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field> : <div className="grid gap-3 sm:grid-cols-2"><Field label="Nome no WhatsApp">{(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Carla do Bar Ondas" />}</Field><Field label="Número" hint="Use o prefixo 90000 (fictício)">{(id, dd) => <TextInput id={id} type="tel" aria-describedby={dd} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(85) 90000-1234" />}</Field></div>}
          <Field label="Mensagem">{(id) => <TextArea id={id} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Btn><Btn type="submit"><MessageSquarePlus className="h-3.5 w-3.5" />Receber mensagem</Btn></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
