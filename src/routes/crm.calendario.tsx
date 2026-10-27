import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { TASK_TYPE } from "@/components/tipe/crm/labels";
import { Btn, IconBtn, PageHeader, Select, timeBR } from "@/components/tipe/crm/ui";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/calendario")({ component: Calendario });

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function Calendario() {
  const { me, members, can, openCreate } = useCrm();
  const d = useOrgData();
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [who, setWho] = useState(can("tasks.assign_others") ? "" : me.id);
  const today = new Date();
  const nowIso = today.toISOString();

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of d.tasks) {
      if (who && t.assigneeId !== who) continue;
      const k = dayKey(new Date(t.dueAt));
      m.set(k, [...(m.get(k) ?? []), t]);
    }
    for (const list of m.values()) list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return m;
  }, [d.tasks, who]);

  const start = new Date(cursor); start.setDate(1 - start.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const create = (day: Date) => { const at = new Date(day); at.setHours(10, 0, 0, 0); openCreate("task", { dueAt: at.toISOString() }); };
  const agenda = days.filter((x) => x.getMonth() === cursor.getMonth() && byDay.get(dayKey(x))?.length);

  const chip = (t: Task) => (
    <Link key={t.id} to="/crm/tarefas" search={{ tarefa: t.id }} title={t.title}
      className={cn("block truncate rounded px-1.5 py-0.5 text-[0.65rem] leading-tight", t.status === "concluida" ? "bg-muted text-muted-foreground line-through" : t.dueAt < nowIso ? "bg-destructive/15 text-[oklch(0.82_0.1_25)]" : t.type === "reuniao" ? "bg-info/15 text-info" : "bg-primary/12 text-primary")}>
      {timeBR(t.dueAt)} {t.title}
    </Link>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Calendário" description="Prazos de tarefas, ligações e reuniões. Clique num dia para agendar." actions={<>
        <Select aria-label="Pessoa" className="h-8 w-auto text-xs" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Toda a equipe</option>{members.map(({ user: u }) => <option key={u.id} value={u.id}>{u.id === me.id ? "Minha agenda" : u.name}</option>)}</Select>
        {can("tasks.write") && <Btn onClick={() => create(new Date())}><Plus className="h-4 w-4" />Agendar</Btn>}
      </>} />
      <div className="crm-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1"><IconBtn label="Mês anterior" icon={ChevronLeft} onClick={() => shift(-1)} /><IconBtn label="Próximo mês" icon={ChevronRight} onClick={() => shift(1)} /><h2 className="ml-1 font-display text-sm font-semibold capitalize">{monthLabel}</h2></div>
          <Btn variant="ghost" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Hoje</Btn>
        </div>
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-border text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{WEEK.map((w) => <div key={w} className="py-1.5">{w}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const items = byDay.get(dayKey(day)) ?? [];
              const isToday = dayKey(day) === dayKey(today);
              const out = day.getMonth() !== cursor.getMonth();
              return (
                <div key={day.toISOString()} className={cn("group min-h-28 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0", out && "bg-background/40 opacity-50")}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[0.7rem]", isToday && "bg-primary font-semibold text-primary-foreground")}>{day.getDate()}</span>
                    {can("tasks.write") && <button type="button" onClick={() => create(day)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100" aria-label={`Agendar em ${day.toLocaleDateString("pt-BR")}`}><Plus className="h-3.5 w-3.5" /></button>}
                  </div>
                  <div className="space-y-0.5">{items.slice(0, 3).map(chip)}{items.length > 3 && <p className="px-1 text-[0.62rem] text-muted-foreground">+{items.length - 3} mais</p>}</div>
                </div>
              );
            })}
          </div>
        </div>
        <ul className="divide-y divide-border md:hidden">
          {agenda.length === 0 && <li className="p-6 text-center text-xs text-muted-foreground">Nada agendado neste mês.</li>}
          {agenda.map((day) => (
            <li key={day.toISOString()} className="flex gap-3 px-3 py-2.5">
              <div className={cn("w-10 shrink-0 text-center", dayKey(day) === dayKey(today) && "text-primary")}><p className="text-[0.62rem] uppercase text-muted-foreground">{WEEK[day.getDay()]}</p><p className="font-display text-lg font-semibold leading-none">{day.getDate()}</p></div>
              <div className="min-w-0 flex-1 space-y-1">{(byDay.get(dayKey(day)) ?? []).map((t) => <div key={t.id} className="text-xs">{chip(t)}<span className="pl-1.5 text-[0.62rem] text-muted-foreground">{TASK_TYPE[t.type]}</span></div>)}</div>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex flex-wrap gap-3 text-[0.68rem] text-muted-foreground"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/60" />Tarefa ou ligação</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-info/60" />Reunião</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/60" />Atrasada</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted" />Concluída</span></p>
    </div>
  );
}
