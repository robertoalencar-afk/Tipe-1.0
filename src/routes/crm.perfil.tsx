import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCrm } from "@/components/tipe/crm/context";
import { Avatar, brl, Btn, dateBR, Field, PageHeader, Panel, Pill, Progress, relative, TextInput } from "@/components/tipe/crm/ui";
import { levelFor, metricValue, periodRange, xpTotal } from "@/lib/tipe/crm/metrics";
import { ROLE_HINT, ROLE_LABEL } from "@/lib/tipe/crm/permissions";

export const Route = createFileRoute("/crm/perfil")({ component: Perfil });

function Perfil() {
  const { s, me, org, role, orgs, run } = useCrm();
  const now = useMemo(() => new Date().toISOString(), []);
  const [f, setF] = useState({ name: me.name, title: me.title });
  useEffect(() => setF({ name: me.name, title: me.title }), [me.name, me.title]);
  const err = f.name.trim().length < 3 ? "Informe seu nome completo." : undefined;
  const month = periodRange("mes", now);
  const ids = new Set([me.id]);
  const xp = xpTotal(s, org.id, me.id);
  const level = levelFor(xp);
  const recent = s.activities.filter((a) => a.orgId === org.id && a.actorId === me.id).slice(0, 8);

  function save(e: FormEvent) {
    e.preventDefault();
    if (err) return;
    run({ type: "updateProfile", name: f.name, title: f.title }, "Perfil atualizado");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Perfil" description="Seus dados, organizações e resultado no mês." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Seus dados">
          <form noValidate onSubmit={save} className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={me.name} className="h-12 w-12 text-sm" /><div><p className="text-sm font-medium">{me.email}</p><p className="text-xs text-muted-foreground">Na Tipe desde {dateBR(me.createdAt)}</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" error={err}>{(id, dd) => <TextInput id={id} aria-describedby={dd} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
              <Field label="Cargo">{(id) => <TextInput id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Executiva de contas" />}</Field>
            </div>
            <p className="text-xs text-muted-foreground">No modo demonstração o e-mail e a senha não mudam. Em produção, a troca de senha passa pelo login do Supabase.</p>
            <div className="flex justify-end"><Btn type="submit" disabled={!!err || (f.name === me.name && f.title === me.title)}>Salvar perfil</Btn></div>
          </form>
        </Panel>
        <Panel title="Nível">
          <p className="font-display text-lg font-semibold text-primary">{level.name}</p>
          <p className="text-xs text-muted-foreground">Nível {level.level} · {xp.toLocaleString("pt-BR")} pontos em {org.name}</p>
          <Progress value={level.pct} className="mt-3" label="Progresso até o próximo nível" />
          <Btn asChild variant="outline" className="mt-4 w-full"><Link to="/crm/gamificacao">Ver gamificação</Link></Btn>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Seu mês" description={org.name}>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Receita ganha", brl(metricValue(s, org.id, ids, "receita", month))],
              ["Vendas", String(metricValue(s, org.id, ids, "negocios_ganhos", month))],
              ["Tarefas concluídas", String(metricValue(s, org.id, ids, "tarefas_concluidas", month))],
              ["Leads qualificados", String(metricValue(s, org.id, ids, "leads_qualificados", month))],
            ].map(([k, v]) => <div key={k} className="rounded-lg bg-muted/40 p-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-display text-base font-semibold tabular-nums">{v}</dd></div>)}
          </dl>
        </Panel>
        <Panel title="Suas organizações">
          <ul className="space-y-2">
            {orgs.map(({ org: o, role: r }) => <li key={o.id} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{o.name}</span><span title={ROLE_HINT[r]}><Pill tone={o.id === org.id ? "primary" : "neutral"}>{ROLE_LABEL[r]}</Pill></span></li>)}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Nesta organização: {ROLE_HINT[role]}</p>
        </Panel>
        <Panel title="Sua atividade recente" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {recent.map((a) => <li key={a.id} className="px-4 py-2 text-xs"><span className="line-clamp-1">{a.summary}</span><span className="text-muted-foreground">{relative(a.at)}</span></li>)}
            {!recent.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma atividade ainda.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
