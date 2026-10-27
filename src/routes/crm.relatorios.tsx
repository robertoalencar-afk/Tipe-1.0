import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Download, Percent, Timer, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NoAccess, useCrm, useOrgData } from "@/components/tipe/crm/context";
import { axis, brl, brlShort, Btn, chartTooltip, Kpi, PageHeader, Panel, Segmented, Select } from "@/components/tipe/crm/ui";
import { avgFirstResponseMin, conversionFunnel, dashboard, leadsBySource, lostReasons, periodRange, previousRange, salesByMonth, salesCycleDays, slaReport, teamPerformance, type Scope } from "@/lib/tipe/crm/metrics";
import { ROLE_LABEL } from "@/lib/tipe/crm/permissions";

export const Route = createFileRoute("/crm/relatorios")({ component: Relatorios });

type Period = "mes" | "30d" | "trimestre" | "ano";

function Relatorios() {
  const { s, org, members, can } = useCrm();
  const d = useOrgData();
  const now = useMemo(() => new Date().toISOString(), []);
  const [period, setPeriod] = useState<Period>("trimestre");
  const [who, setWho] = useState("");
  if (!can("reports.view")) return <NoAccess what="relatórios" />;

  const scope: Scope = who.startsWith("tm:") ? { orgId: org.id, teamId: who.slice(3) } : who ? { orgId: org.id, ownerId: who } : { orgId: org.id };
  const range = periodRange(period, now);
  const prev = previousRange(range);
  const k = dashboard(s, scope, range, now);
  const kp = dashboard(s, scope, prev, now);
  const months = period === "ano" ? 12 : 6;
  const sales = salesByMonth(s, scope, now, months);
  const funnel = conversionFunnel(s, scope, range);
  const reasons = lostReasons(s, scope, range);
  const sources = leadsBySource(s, scope, range);
  const cycle = salesCycleDays(s, scope, range);
  const sla = slaReport(s, org.id, range, org.settings.responseSlaMin, now);
  const resp = avgFirstResponseMin(s, org.id, range, scope.ownerId);
  const team = teamPerformance(s, org.id, range);
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null);
  const delta = (a: number, b: number, upGood = true) => { const v = pct(a, b); return v === null ? null : { value: v, good: upGood ? v >= 0 : v <= 0 }; };

  function exportCsv() {
    const head = ["Pessoa", "Papel", "Receita", "Vendas", "Tarefas", "Leads qualificados", "Pontos"];
    const rows = team.map((r) => [r.name, ROLE_LABEL[r.role], r.receita, r.ganhos, r.tarefas, r.leads, r.xp]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `desempenho-${org.slug}-${now.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Relatórios" description="Vendas, funil, origem dos leads, atendimento e produtividade, calculados dos registros da organização." actions={<>
        <Select aria-label="Pessoa ou equipe" className="h-8 w-auto text-xs" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Toda a organização</option>
          {d.teams.length > 0 && <optgroup label="Equipes">{d.teams.map((t) => <option key={t.id} value={`tm:${t.id}`}>{t.name}</option>)}</optgroup>}
          <optgroup label="Pessoas">{members.filter((m) => m.membership.role !== "viewer").map(({ user: u }) => <option key={u.id} value={u.id}>{u.name}</option>)}</optgroup>
        </Select>
        <Segmented label="Período" value={period} onChange={setPeriod} options={[{ value: "mes", label: "Mês" }, { value: "30d", label: "30 dias" }, { value: "trimestre", label: "90 dias" }, { value: "ano", label: "12 meses" }]} />
      </>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Receita ganha" value={brl(k.revenueWon)} delta={delta(k.revenueWon, kp.revenueWon)} hint={`${k.won} vendas`} />
        <Kpi icon={Percent} label="Taxa de ganho" value={k.conversionRate === null ? "Sem dados" : `${k.conversionRate}%`} hint={`${k.won} ganhas, ${k.lost} perdidas`} help="Ganhas divididas por ganhas mais perdidas no período." />
        <Kpi icon={Timer} label="Ciclo de venda" value={cycle === null ? "Sem dados" : `${cycle} dias`} hint="Da criação ao ganho" />
        <Kpi icon={Clock} label="Respostas no prazo" value={sla.pct === null ? "Sem dados" : `${sla.pct}%`} tone={sla.pct !== null && sla.pct < 80 ? "warning" : "default"} hint={`Prazo ${org.settings.responseSlaMin} min · média ${resp ?? "–"} min`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Vendas por mês" description={`Últimos ${months} meses`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={52} tickFormatter={(v: number) => brlShort(v).replace("R$ ", "")} />
                <Tooltip {...chartTooltip} formatter={(v: number) => [brl(v), "Receita"]} />
                <Bar dataKey="receita" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Funil do período" description="Quantos chegaram a cada etapa">
          <ul className="space-y-2.5">
            {funnel.map((f, i) => (
              <li key={f.stage} className="grid grid-cols-[9.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                <span className="truncate text-muted-foreground">{f.stage}</span>
                <span className="h-5 overflow-hidden rounded bg-muted/50"><span className="block h-full rounded bg-primary/70" style={{ width: `${(f.value / maxFunnel) * 100}%` }} /></span>
                <span className="text-right tabular-nums">{f.value}{i > 0 && funnel[i - 1]!.value > 0 && <span className="block text-[0.62rem] text-muted-foreground">{Math.round((f.value / funnel[i - 1]!.value) * 100)}%</span>}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Origem dos leads" bodyClassName="overflow-x-auto p-0">
          {sources.length === 0 ? <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhum lead recebido no período.</p> : (
            <table className="w-full min-w-[30rem] text-xs">
              <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2 font-medium">Origem</th><th className="px-2 py-2 text-right font-medium">Recebidos</th><th className="px-2 py-2 text-right font-medium">Qualificados</th><th className="px-2 py-2 text-right font-medium">Convertidos</th><th className="px-4 py-2 text-right font-medium">Receita</th></tr></thead>
              <tbody className="divide-y divide-border">{sources.map((r) => <tr key={r.origem}><td className="px-4 py-2">{r.origem}</td><td className="px-2 py-2 text-right tabular-nums">{r.recebidos}</td><td className="px-2 py-2 text-right tabular-nums">{r.qualificados}</td><td className="px-2 py-2 text-right tabular-nums">{r.convertidos} <span className="text-muted-foreground">({r.taxa}%)</span></td><td className="px-4 py-2 text-right tabular-nums">{brl(r.receita)}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>
        <Panel title="Motivos de perda">
          {reasons.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma oportunidade perdida no período.</p> : (
            <ul className="space-y-2">{reasons.map((r) => <li key={r.motivo} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="min-w-0 truncate">{r.motivo}</span><span className="shrink-0 tabular-nums text-muted-foreground">{r.quantidade} · {brl(r.valor)}</span></li>)}</ul>
          )}
        </Panel>
      </div>

      <Panel title="Produtividade da equipe" description="Resultado por pessoa no período" actions={<Btn variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Exportar CSV</Btn>} bodyClassName="overflow-x-auto p-0">
        <table className="w-full min-w-[36rem] text-xs">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2 font-medium">Pessoa</th><th className="px-2 py-2 font-medium">Papel</th><th className="px-2 py-2 text-right font-medium">Receita</th><th className="px-2 py-2 text-right font-medium">Vendas</th><th className="px-2 py-2 text-right font-medium">Tarefas</th><th className="px-2 py-2 text-right font-medium">Leads qualif.</th><th className="px-4 py-2 text-right font-medium">Pontos</th></tr></thead>
          <tbody className="divide-y divide-border">{team.map((r) => <tr key={r.userId}><td className="px-4 py-2">{r.name}</td><td className="px-2 py-2 text-muted-foreground">{ROLE_LABEL[r.role]}</td><td className="px-2 py-2 text-right tabular-nums">{brl(r.receita)}</td><td className="px-2 py-2 text-right tabular-nums">{r.ganhos}</td><td className="px-2 py-2 text-right tabular-nums">{r.tarefas}</td><td className="px-2 py-2 text-right tabular-nums">{r.leads}</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{r.xp}</td></tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
