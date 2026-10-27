import { useState } from "react";
import { z } from "zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlarmClock,
  CalendarDays,
  Check,
  ListTodo,
  MessageSquare,
  Pencil,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { TaskDialog } from "@/components/tipe/crm/forms";
import { TASK_STATUS, TASK_TYPE } from "@/components/tipe/crm/labels";
import {
  Btn,
  ConfirmAction,
  dateTimeBR,
  Empty,
  PageHeader,
  Panel,
  Pill,
  PriorityPill,
  relative,
  SearchInput,
  Segmented,
  Select,
  TextArea,
  UserChip,
} from "@/components/tipe/crm/ui";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/tarefas")({
  validateSearch: z.object({
    tarefa: z.string().optional().catch(undefined),
    visao: z.literal("meu-dia").optional().catch(undefined),
  }),
  component: Tarefas,
});

const PRIO_WEIGHT = { alta: 0, media: 1, baixa: 2 };

function Tarefas() {
  const { tarefa, visao } = Route.useSearch();
  const navigate = useNavigate();
  const { me, members, user, can, run, openCreate } = useCrm();
  const d = useOrgData();
  const [status, setStatus] = useState<"abertas" | TaskStatus | "todas">("abertas");
  const [who, setWho] = useState(can("tasks.assign_others") ? "" : me.id);
  const [prio, setPrio] = useState("");
  const [q, setQ] = useState("");
  const now = new Date();
  const nowIso = now.toISOString();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const view = visao ?? "lista";
  const setView = (v: string) =>
    navigate({ to: "/crm/tarefas", search: { visao: v === "meu-dia" ? "meu-dia" : undefined } });

  const teamIds = who.startsWith("team:")
    ? new Set(
        d.teams.length
          ? members.filter((m) => m.membership.teamId === who.slice(5)).map((m) => m.user.id)
          : [],
      )
    : null;
  const list = d.tasks
    .filter((t) =>
      status === "todas"
        ? true
        : status === "abertas"
          ? t.status !== "concluida"
          : t.status === status,
    )
    .filter((t) => (!who ? true : teamIds ? teamIds.has(t.assigneeId) : t.assigneeId === who))
    .filter(
      (t) =>
        (!prio || t.priority === prio) && (!q || t.title.toLowerCase().includes(q.toLowerCase())),
    )
    .sort(
      (a, b) =>
        (a.status === "concluida" ? 1 : 0) - (b.status === "concluida" ? 1 : 0) ||
        a.dueAt.localeCompare(b.dueAt),
    );
  const overdueMine = d.tasks.filter(
    (t) => t.assigneeId === me.id && t.status !== "concluida" && t.dueAt < nowIso,
  );
  const todayMine = d.tasks.filter(
    (t) =>
      t.assigneeId === me.id &&
      t.status !== "concluida" &&
      t.dueAt >= nowIso &&
      t.dueAt <= endOfDay.toISOString(),
  );
  const nextMine = d.tasks
    .filter(
      (t) => t.assigneeId === me.id && t.status !== "concluida" && t.dueAt > endOfDay.toISOString(),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5);
  const doneToday = d.tasks.filter(
    (t) =>
      t.assigneeId === me.id &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === now.toDateString(),
  ).length;
  const byPriority = (a: Task, b: Task) =>
    PRIO_WEIGHT[a.priority] - PRIO_WEIGHT[b.priority] || a.dueAt.localeCompare(b.dueAt);
  const selected = d.tasks.find((t) => t.id === tarefa);

  const row = (t: Task) => {
    const late = t.status !== "concluida" && t.dueAt < nowIso;
    const contact = d.contacts.find((c) => c.id === t.contactId);
    const editable =
      can("tasks.write") &&
      (t.assigneeId === me.id || t.createdBy === me.id || can("tasks.assign_others"));
    return (
      <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
        <button
          type="button"
          disabled={!editable}
          onClick={() =>
            run(
              {
                type: "setTaskStatus",
                id: t.id,
                status: t.status === "concluida" ? "pendente" : "concluida",
              },
              t.status === "concluida" ? "Tarefa reaberta" : "Tarefa concluída",
            )
          }
          aria-label={t.status === "concluida" ? `Reabrir ${t.title}` : `Concluir ${t.title}`}
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-40",
            t.status === "concluida"
              ? "border-success bg-success text-success-foreground"
              : "border-input hover:border-primary",
          )}
        >
          {t.status === "concluida" && <Check className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <Link
            to="/crm/tarefas"
            search={{ tarefa: t.id, visao }}
            className={cn(
              "block truncate text-sm hover:text-primary",
              t.status === "concluida" && "text-muted-foreground line-through",
            )}
          >
            {t.title}
          </Link>
          <p className="flex flex-wrap items-center gap-x-2 text-[0.7rem] text-muted-foreground">
            <span className={cn(late && "font-semibold text-[oklch(0.78_0.12_25)]")}>
              {late && <AlarmClock className="mr-0.5 inline h-3 w-3" />}
              {dateTimeBR(t.dueAt)} ({relative(t.dueAt)})
            </span>
            <span>{TASK_TYPE[t.type]}</span>
            {contact && (
              <Link
                to="/crm/contatos/$id"
                params={{ id: contact.id }}
                className="hover:text-primary"
              >
                {contact.name}
              </Link>
            )}
            {t.comments.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {t.comments.length}
              </span>
            )}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <PriorityPill p={t.priority} />
          {t.status === "em_andamento" && <Pill tone="info">Em andamento</Pill>}
        </span>
        <UserChip user={user(t.assigneeId)} className="hidden shrink-0 md:inline-flex" />
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarefas"
        description="Ligações, reuniões e próximos passos da equipe, ligados a contatos e oportunidades."
        actions={
          <>
            <Segmented
              label="Visão"
              value={view}
              onChange={setView}
              options={[
                { value: "lista", label: "Lista" },
                { value: "meu-dia", label: "Meu dia" },
              ]}
            />
            <Btn variant="outline" asChild>
              <Link to="/crm/calendario">
                <CalendarDays className="h-3.5 w-3.5" />
                Calendário
              </Link>
            </Btn>
            {can("tasks.write") && (
              <Btn onClick={() => openCreate("task")}>
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Btn>
            )}
          </>
        }
      />

      {overdueMine.length > 0 && view === "lista" && (
        <button
          type="button"
          onClick={() => setView("meu-dia")}
          className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-xs text-[oklch(0.84_0.08_25)]"
        >
          <AlarmClock className="h-4 w-4 shrink-0" />
          Você tem {overdueMine.length}{" "}
          {overdueMine.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}. Abrir Meu dia.
        </button>
      )}

      {view === "meu-dia" ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-warning" />
                Bom dia, {me.name.split(" ")[0]}
              </span>
            }
            description="Ordem sugerida: atrasadas primeiro, depois prioridade e horário."
            className="lg:col-span-2"
            bodyClassName="p-0"
          >
            {overdueMine.length + todayMine.length === 0 ? (
              <div className="p-4">
                <Empty
                  icon={Check}
                  title="Dia livre"
                  text="Nenhuma tarefa atrasada nem para hoje. Que tal agendar o próximo contato de uma oportunidade sem atividade?"
                  action={
                    <Link to="/crm/oportunidades" className="text-xs text-primary hover:underline">
                      Ver oportunidades
                    </Link>
                  }
                />
              </div>
            ) : (
              <>
                {overdueMine.length > 0 && (
                  <>
                    <p className="border-b border-border bg-destructive/5 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[oklch(0.8_0.1_25)]">
                      Atrasadas · {overdueMine.length}
                    </p>
                    <ul className="divide-y divide-border">
                      {[...overdueMine].sort(byPriority).map(row)}
                    </ul>
                  </>
                )}
                {todayMine.length > 0 && (
                  <>
                    <p className="border-y border-border bg-muted/30 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Hoje · {todayMine.length}
                    </p>
                    <ul className="divide-y divide-border">
                      {[...todayMine].sort(byPriority).map(row)}
                    </ul>
                  </>
                )}
              </>
            )}
          </Panel>
          <div className="space-y-3">
            <Panel title="Seu ritmo hoje">
              <div className="grid grid-cols-3 text-center">
                <div>
                  <p className="money font-display text-xl font-semibold text-success">
                    {doneToday}
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground">concluídas</p>
                </div>
                <div>
                  <p className="money font-display text-xl font-semibold">{todayMine.length}</p>
                  <p className="text-[0.68rem] text-muted-foreground">para hoje</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "money font-display text-xl font-semibold",
                      overdueMine.length && "text-[oklch(0.78_0.12_25)]",
                    )}
                  >
                    {overdueMine.length}
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground">atrasadas</p>
                </div>
              </div>
            </Panel>
            <Panel title="Próximos dias" bodyClassName="p-0">
              {nextMine.length ? (
                <ul className="divide-y divide-border">{nextMine.map(row)}</ul>
              ) : (
                <p className="p-4 text-xs text-muted-foreground">Nada agendado.</p>
              )}
            </Panel>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_12rem_9rem]">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar tarefa" />
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="abertas">Em aberto</option>
              <option value="pendente">Pendentes</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluídas</option>
              <option value="todas">Todas</option>
            </Select>
            <Select
              aria-label="Responsável ou equipe"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              <option value="">Toda a organização</option>
              <option value={me.id}>Minhas tarefas</option>
              {d.teams.map((t) => (
                <option key={t.id} value={`team:${t.id}`}>
                  Equipe {t.name}
                </option>
              ))}
              {members
                .filter((m) => m.user.id !== me.id)
                .map(({ user: u }) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
            <Select aria-label="Prioridade" value={prio} onChange={(e) => setPrio(e.target.value)}>
              <option value="">Toda prioridade</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </Select>
          </div>
          {list.length === 0 ? (
            <Empty
              icon={ListTodo}
              title="Nenhuma tarefa aqui"
              text="Mude os filtros ou crie uma tarefa ligada a um contato ou oportunidade."
              action={
                can("tasks.write") && (
                  <Btn onClick={() => openCreate("task")}>
                    <Plus className="h-4 w-4" />
                    Nova tarefa
                  </Btn>
                )
              }
            />
          ) : (
            <div className="crm-panel overflow-hidden">
              <ul className="divide-y divide-border">{list.slice(0, 120).map(row)}</ul>
            </div>
          )}
        </>
      )}

      <TaskSheet
        task={selected}
        onClose={() => navigate({ to: "/crm/tarefas", search: { tarefa: undefined, visao } })}
      />
    </div>
  );
}

function TaskSheet({ task, onClose }: { task?: Task | undefined; onClose: () => void }) {
  const { user, run, can, me } = useCrm();
  const d = useOrgData();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const editable =
    task &&
    can("tasks.write") &&
    (task.assigneeId === me.id || task.createdBy === me.id || can("tasks.assign_others"));
  const contact = d.contacts.find((c) => c.id === task?.contactId);
  const deal = d.deals.find((x) => x.id === task?.dealId);
  return (
    <>
      <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {task && (
            <>
              <SheetTitle className="pr-6 font-display text-lg leading-snug">
                {task.title}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {TASK_TYPE[task.type]} · criada por {user(task.createdBy)?.name}{" "}
                {relative(task.createdAt)}
              </SheetDescription>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[0.65rem] text-muted-foreground">Prazo</dt>
                  <dd>{dateTimeBR(task.dueAt)}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] text-muted-foreground">Responsável</dt>
                  <dd>
                    <UserChip user={user(task.assigneeId)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] text-muted-foreground">Prioridade</dt>
                  <dd>
                    <PriorityPill p={task.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] text-muted-foreground">Status</dt>
                  <dd>
                    <Pill tone={TASK_STATUS[task.status].tone}>
                      {TASK_STATUS[task.status].label}
                    </Pill>
                  </dd>
                </div>
                {contact && (
                  <div>
                    <dt className="text-[0.65rem] text-muted-foreground">Contato</dt>
                    <dd>
                      <Link
                        to="/crm/contatos/$id"
                        params={{ id: contact.id }}
                        className="text-primary hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {deal && (
                  <div>
                    <dt className="text-[0.65rem] text-muted-foreground">Oportunidade</dt>
                    <dd>
                      <Link
                        to="/crm/oportunidades"
                        search={{ deal: deal.id }}
                        className="text-primary hover:underline"
                      >
                        {deal.title}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
              {task.description && (
                <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
              {editable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Select
                    aria-label="Mudar status"
                    className="h-8 w-auto text-xs"
                    value={task.status}
                    onChange={(e) =>
                      run(
                        {
                          type: "setTaskStatus",
                          id: task.id,
                          status: e.target.value as TaskStatus,
                        },
                        "Status atualizado",
                      )
                    }
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </Select>
                  <Btn variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Btn>
                  <ConfirmAction
                    trigger={
                      <Btn variant="ghost" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Btn>
                    }
                    title="Excluir tarefa?"
                    description="Se ela já tinha rendido pontos, eles são estornados. Esta ação não pode ser desfeita."
                    confirmLabel="Excluir tarefa"
                    onConfirm={() => {
                      if (run({ type: "deleteTask", id: task.id }, "Tarefa excluída").ok) onClose();
                    }}
                  />
                </div>
              )}
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comentários
              </h3>
              <ul className="mt-2 space-y-2">
                {task.comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                    {c.text}
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {user(c.userId)?.name} · {relative(c.at)}
                    </p>
                  </li>
                ))}
                {!task.comments.length && (
                  <li className="text-xs text-muted-foreground">Nenhum comentário.</li>
                )}
              </ul>
              {can("tasks.write") && (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      run({ type: "commentTask", id: task.id, text: comment }, "Comentário enviado")
                        .ok
                    )
                      setComment("");
                  }}
                >
                  <TextArea
                    aria-label="Novo comentário"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário para a equipe"
                    className="min-h-16"
                  />
                  <div className="flex justify-end">
                    <Btn type="submit" disabled={!comment.trim()}>
                      Comentar
                    </Btn>
                  </div>
                </form>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      {task && <TaskDialog open={editing} onOpenChange={setEditing} editing={task} />}
    </>
  );
}
