import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { LogOut, Store, Users, Wallet, TrendingUp, Gift, Inbox, ShieldCheck, Table2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AreaShell } from "@/components/tipe/AreaShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaquesGarcons } from "@/components/tipe/SaquesGarcons";
import { getFounderOverview } from "@/lib/tipe/founder.functions";

export const Route = createFileRoute("/_authenticated/fundador")({
  head: () => ({
    meta: [
      { title: "Painel do fundador — TIPE" },
      { name: "description", content: "Visão geral de restaurantes, garçons, assinaturas e indicadores da TIPE." },
      { property: "og:title", content: "Painel do fundador — TIPE" },
      { property: "og:description", content: "Restaurantes, garçons, receita e indicadores em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fundador,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string) => new Date(s).toLocaleDateString("pt-BR");
const dataHora = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const SUB: Record<string, string> = { trialing: "Teste grátis", trial: "Teste grátis", active: "Ativa", past_due: "Em atraso", canceled: "Cancelada" };

function Fundador() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getFounderOverview);
  const q = useQuery({ queryKey: ["founder-overview"], queryFn: () => fetchOverview(), refetchInterval: 60_000 });
  const [busca, setBusca] = useState("");

  async function sair() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  const d = q.data;
  const rest = useMemo(() => (d?.restaurants ?? []).filter((r) => (r.name + r.slug + (r.cnpj ?? "")).toLowerCase().includes(busca.toLowerCase())), [d, busca]);
  const garc = useMemo(() => (d?.waiters ?? []).filter((w) => (w.name + (w.email ?? "") + w.restaurant).toLowerCase().includes(busca.toLowerCase())), [d, busca]);

  return (
    <AreaShell eyebrow="Painel do fundador" title="Visão geral da TIPE" subtitle="Indicadores dos últimos 30 dias, atualizados a cada minuto."
      actions={<>
        <Button asChild size="sm" variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"><Link to="/painel">Restaurantes</Link></Button>
        <Button size="sm" variant="ghost" onClick={sair} className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"><LogOut className="mr-1 h-4 w-4" />Sair</Button>
      </>}>
      <div className="space-y-6">
        {q.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {q.error && <p className="text-destructive">{(q.error as Error).message}</p>}
        {d && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={Store} label="Restaurantes" value={String(d.kpis.restaurants)} sub={`${d.kpis.trial} em teste · ${d.kpis.active} pagantes`} />
              <Kpi icon={Wallet} label="Receita recorrente (mês)" value={brl(d.kpis.mrr)} sub={`${d.kpis.onboardingPending} sem PDV conectado`} />
              <Kpi icon={TrendingUp} label="Volume pago nas mesas" value={brl(d.kpis.gmv30)} sub="Contas pagas pelo app" />
              <Kpi icon={Gift} label="Gorjetas extras" value={brl(d.kpis.tips30)} sub={`Parte TIPE: ${brl(d.kpis.tipeRevenue30)}`} />
              <Kpi icon={Table2} label="Mesas ativas" value={String(d.kpis.tables)} />
              <Kpi icon={Users} label="Garçons ativos" value={String(d.kpis.waiters)} sub={`${d.kpis.pendingWithdrawals} saques aguardando`} />
              <Kpi icon={Inbox} label="Novos interessados" value={String(d.kpis.newLeads)} sub="Contatos pelo site" />
              <Kpi icon={ShieldCheck} label="Pedidos de privacidade" value={String(d.kpis.openPrivacy)} sub="Em aberto" />
            </div>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 font-display text-lg font-bold">Volume diário pago nas mesas</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" fontSize={11} interval={4} />
                    <YAxis fontSize={11} width={50} />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Area type="monotone" dataKey="gmv" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <Tabs defaultValue="restaurantes">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="restaurantes">Restaurantes</TabsTrigger>
                  <TabsTrigger value="garcons">Garçons</TabsTrigger>
                  <TabsTrigger value="saques">Saques</TabsTrigger>
                  <TabsTrigger value="leads">Interessados</TabsTrigger>
                  <TabsTrigger value="lgpd">Privacidade</TabsTrigger>
                  <TabsTrigger value="seguranca">Segurança</TabsTrigger>
                </TabsList>
                <Input placeholder="Buscar nome, CNPJ, e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
              </div>

              <TabsContent value="restaurantes">
                <Tabela head={["Restaurante", "Assinatura", "PDV", "Mesas", "Garçons", "Volume 30d", "Gorjetas 30d", "Recebimentos", ""]}>
                  {rest.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3"><div className="font-semibold">{r.name}</div><div className="text-xs text-muted-foreground">/{r.slug} · {r.cnpj ?? "sem CNPJ"} · desde {data(r.createdAt)}</div></td>
                      <td className="p-3"><Badge variant={r.subStatus === "active" ? "default" : "secondary"}>{SUB[r.subStatus] ?? r.subStatus}</Badge><div className="text-xs text-muted-foreground">{r.plan}{r.trialEndsAt && r.subStatus !== "active" ? ` · até ${data(r.trialEndsAt)}` : ""}</div></td>
                      <td className="p-3">{r.pos}{r.onboarding !== "done" && <div className="text-xs text-destructive">Integração pendente</div>}</td>
                      <td className="p-3">{r.tables}</td>
                      <td className="p-3">{r.waiters}</td>
                      <td className="p-3">{brl(r.gmv30)}<div className="text-xs text-muted-foreground">{r.payments30} pagamentos</div></td>
                      <td className="p-3">{brl(r.tips30)}</td>
                      <td className="p-3 text-xs">{r.payout}</td>
                      <td className="p-3"><Link to="/$restaurante" params={{ restaurante: r.slug }} className="text-sm font-semibold text-primary">Abrir</Link></td>
                    </tr>
                  ))}
                </Tabela>
              </TabsContent>

              <TabsContent value="garcons">
                <Tabela head={["Garçom", "Restaurante", "Acesso", "Gorjetas 30d (garçom)", "Já sacado"]}>
                  {garc.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="p-3"><div className="font-semibold">{w.name}</div><div className="text-xs text-muted-foreground">{w.email ?? "sem e-mail"} · cód. {w.code}</div></td>
                      <td className="p-3">{w.restaurant}</td>
                      <td className="p-3"><Badge variant={w.hasLogin ? "default" : "secondary"}>{!w.active ? "Inativo" : w.hasLogin ? "Com login" : "Sem login"}</Badge></td>
                      <td className="p-3">{brl(w.tips30)}</td>
                      <td className="p-3">{brl(w.withdrawn)}</td>
                    </tr>
                  ))}
                </Tabela>
              </TabsContent>

              <TabsContent value="saques"><SaquesGarcons /></TabsContent>

              <TabsContent value="leads">
                <Tabela head={["Restaurante", "Contato", "Mensagem", "Data"]}>
                  {d.leads.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="p-3 font-semibold">{l.restaurant_name}</td>
                      <td className="p-3">{l.contact_name}<div className="text-xs text-muted-foreground"><a href={`mailto:${l.email}`} className="text-primary">{l.email}</a>{l.phone ? ` · ${l.phone}` : ""}</div></td>
                      <td className="max-w-sm p-3 text-xs">{l.message ?? "—"}</td>
                      <td className="p-3 text-xs">{dataHora(l.created_at)}</td>
                    </tr>
                  ))}
                </Tabela>
              </TabsContent>

              <TabsContent value="lgpd">
                <Tabela head={["Tipo", "Titular", "Situação", "Data"]}>
                  {d.privacy.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3">{p.request_type}</td>
                      <td className="p-3">{p.name}<div className="text-xs text-muted-foreground">{p.email}</div></td>
                      <td className="p-3"><Badge variant="secondary">{p.status}</Badge></td>
                      <td className="p-3 text-xs">{dataHora(p.created_at)}</td>
                    </tr>
                  ))}
                </Tabela>
              </TabsContent>

              <TabsContent value="seguranca">
                <Tabela head={["Quando", "Ação", "Restaurante", "Resultado", "Detalhe"]}>
                  {d.security.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-3 text-xs">{dataHora(s.created_at)}</td>
                      <td className="p-3">{s.action}</td>
                      <td className="p-3">{s.restaurant_slug ?? "—"}</td>
                      <td className="p-3"><Badge variant={s.result === "denied" ? "destructive" : "secondary"}>{s.result}</Badge></td>
                      <td className="max-w-xs truncate p-3 text-xs">{s.detail ?? ""}</td>
                    </tr>
                  ))}
                </Tabela>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AreaShell>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Store; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Tabela({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{head.map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
