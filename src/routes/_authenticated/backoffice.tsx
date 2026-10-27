import { FounderMfaGate } from "@/components/tipe/FounderMfaGate";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LebreLimits } from "@/components/tipe/LebreLimits";
import { LaunchStatesAdmin } from "@/components/tipe/LaunchStatesAdmin";
import { PlansAdmin } from "@/components/tipe/PlansAdmin";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Headphones,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Store,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaquesGarcons } from "@/components/tipe/SaquesGarcons";
import { getFounderOverview } from "@/lib/tipe/founder.functions";
import { createRestaurant } from "@/lib/tipe/staff.functions";

export const Route = createFileRoute("/_authenticated/backoffice")({
  head: () => ({
    meta: [
      { title: "Backoffice administrativo e financeiro | TIPE" },
      {
        name: "description",
        content: "Operação, clientes, assinaturas, suporte e governança da TIPE.",
      },
      { property: "og:title", content: "Backoffice TIPE" },
      { property: "og:description", content: "Central administrativa e financeira da TIPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <FounderMfaGate>
      <Backoffice />
    </FounderMfaGate>
  ),
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (s: string) => new Date(s).toLocaleDateString("pt-BR");
const dateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const subscriptionLabels: Record<string, string> = {
  trialing: "Teste grátis",
  trial: "Teste grátis",
  active: "Ativa",
  past_due: "Em atraso",
  canceled: "Cancelada",
};

const navigation = [
  { value: "overview", label: "Visão geral", icon: LayoutDashboard },
  { value: "clients", label: "Clientes", icon: Building2 },
  { value: "plans", label: "Planos", icon: Layers },
  { value: "finance", label: "Financeiro", icon: Banknote },
  { value: "support", label: "Suporte", icon: Headphones },
  { value: "governance", label: "Governança", icon: ShieldCheck },
];

type RestaurantSummary = {
  id: string;
  slug: string;
  name: string;
  cnpj: string | null;
  createdAt: string;
  pos: string;
  onboarding: string;
  plan: string;
  subStatus: string;
  trialEndsAt: string | null;
  tables: number;
  waiters: number;
  payout: string;
  gmv30: number;
  tips30: number;
  payments30: number;
};

function Backoffice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getFounderOverview);
  const query = useQuery({
    queryKey: ["founder-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  const overview = query.data;
  const restaurants = useMemo(
    () =>
      (overview?.restaurants ?? []).filter((r) =>
        `${r.name} ${r.slug} ${r.cnpj ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [overview, search],
  );
  const waiters = useMemo(
    () =>
      (overview?.waiters ?? []).filter((w) =>
        `${w.name} ${w.email ?? ""} ${w.restaurant}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [overview, search],
  );
  const alerts = overview
    ? overview.kpis.onboardingPending + overview.kpis.openPrivacy + overview.kpis.pendingWithdrawals
    : 0;

  return (
    <Tabs defaultValue="overview" className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
          <div className="border-b border-sidebar-border px-5 py-5">
            <TipeLogo className="h-10" />
          </div>
          <div className="px-5 pb-3 pt-6">
            <p className="text-sm font-medium text-sidebar-primary">Backoffice</p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">Administrativo e financeiro</p>
          </div>
          <TabsList className="h-auto flex-1 flex-col items-stretch justify-start gap-1 rounded-none bg-transparent px-3">
            {navigation.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="h-10 justify-start gap-3 rounded-full px-4 text-sidebar-foreground/70 ring-offset-sidebar hover:text-sidebar-foreground data-[state=active]:bg-sidebar-foreground data-[state=active]:font-medium data-[state=active]:text-sidebar data-[state=active]:shadow-none"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-border bg-card">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <TipeLogo variant="dark" className="h-8 shrink-0" />
                  <span className="truncate text-sm font-medium text-muted-foreground">
                    Backoffice
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Cliente
                  </Button>
                  <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sair">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 md:mt-0 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-medium tracking-[-0.03em] md:text-2xl">
                    Central de Operações TIPE
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gestão administrativa, financeira e de suporte da TIPE.
                  </p>
                </div>
                <Button
                  className="hidden shrink-0 md:inline-flex"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo cliente
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto px-4 pb-3 md:hidden">
              <TabsList className="h-auto w-max justify-start gap-1.5 bg-transparent p-0">
                {navigation.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="h-10 shrink-0 gap-1.5 rounded-full border border-border px-4 data-[state=active]:border-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
            {query.isLoading && (
              <div className="rounded-[1.25rem] border border-border bg-card p-6 text-sm text-muted-foreground">
                Carregando informações…
              </div>
            )}
            {query.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                {(query.error as Error).message}
              </div>
            )}
            {overview && (
              <>
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <SectionHeader
                    title="Visão geral"
                    subtitle="Indicadores essenciais da operação, atualizados a cada minuto."
                  />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi
                      icon={Store}
                      label="Clientes"
                      value={String(overview.kpis.restaurants)}
                      sub={`${overview.kpis.trial} em teste e ${overview.kpis.active} assinaturas ativas`}
                    />
                    <Kpi
                      icon={Wallet}
                      label="Receita recorrente"
                      value={brl(overview.kpis.mrr)}
                      sub="Mensalidades ativas da TIPE"
                    />
                    <Kpi
                      icon={CircleDollarSign}
                      label="Receita de gorjetas"
                      value={brl(overview.kpis.tipeRevenue30)}
                      sub="Parcela TIPE nos últimos 30 dias"
                    />
                    <Kpi
                      icon={TriangleAlert}
                      label="Pendências operacionais"
                      value={String(alerts)}
                      sub="Integrações, saques e privacidade"
                      warning={alerts > 0}
                    />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
                    <section className="rounded-[1.25rem] border border-border bg-card p-4 sm:p-5">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <h2 className="font-display text-[1.05rem] font-medium tracking-[-0.02em]">
                            Volume processado nas mesas
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Movimentação dos restaurantes. Este valor não é receita da TIPE.
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          30 dias
                        </Badge>
                      </div>
                      <div className="mt-5 h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={overview.days} margin={{ left: -18, right: 4 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="day"
                              fontSize={10}
                              interval={5}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis fontSize={10} width={48} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => brl(value)} />
                            <Area
                              type="monotone"
                              dataKey="gmv"
                              stroke="var(--primary)"
                              fill="var(--primary)"
                              fillOpacity={0.16}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    <DataPanel
                      title="Situação da operação"
                      subtitle="Itens que pedem atenção da equipe TIPE"
                    >
                      <div className="space-y-4">
                        <StatusLine
                          label="PDVs pendentes"
                          value={overview.kpis.onboardingPending}
                          ok={overview.kpis.onboardingPending === 0}
                        />
                        <StatusLine
                          label="Saques aguardando"
                          value={overview.kpis.pendingWithdrawals}
                          ok={overview.kpis.pendingWithdrawals === 0}
                        />
                        <StatusLine
                          label="Solicitações de privacidade"
                          value={overview.kpis.openPrivacy}
                          ok={overview.kpis.openPrivacy === 0}
                        />
                        <StatusLine label="Novos contatos" value={overview.kpis.newLeads} ok />
                      </div>
                    </DataPanel>
                  </div>
                </TabsContent>

                <TabsContent value="clients" className="mt-0 space-y-5">
                  <SectionHeader
                    title="Clientes"
                    subtitle="Cadastro, assinatura, integração e saúde operacional dos restaurantes."
                    action={
                      <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Cadastrar
                      </Button>
                    }
                  />
                  <SearchField
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nome, CNPJ ou endereço"
                  />
                  <div className="grid gap-3 md:hidden">
                    {restaurants.map((restaurant) => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-[1.25rem] border border-border bg-card md:block">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                          {[
                            "Cliente",
                            "Assinatura",
                            "Integração",
                            "Estrutura",
                            "Volume 30d",
                            "Recebimentos",
                          ].map((heading) => (
                            <th key={heading} className="p-3 font-semibold">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {restaurants.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="p-3">
                              <p className="font-semibold">{r.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.cnpj ?? "CNPJ não informado"} · desde {date(r.createdAt)}
                              </p>
                            </td>
                            <td className="p-3">
                              <Subscription
                                status={r.subStatus}
                                plan={r.plan}
                                trialEndsAt={r.trialEndsAt}
                              />
                            </td>
                            <td className="p-3">
                              <p>{r.pos}</p>
                              <p
                                className={`text-xs ${r.onboarding === "done" ? "text-muted-foreground" : "text-destructive"}`}
                              >
                                {r.onboarding === "done" ? "Operando" : "Pendente"}
                              </p>
                            </td>
                            <td className="p-3">
                              {r.tables} mesas
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {r.waiters} garçons
                              </span>
                            </td>
                            <td className="p-3">
                              {brl(r.gmv30)}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {r.payments30} pagamentos
                              </span>
                            </td>
                            <td className="p-3">
                              <ReceivingStatus status={r.payout} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O Backoffice mostra somente dados administrativos e indicadores. A operação
                    privada de cada restaurante permanece restrita à equipe autorizada.
                  </p>
                </TabsContent>

                <TabsContent value="plans" className="mt-0 space-y-5">
                  <SectionHeader
                    title="Planos e mesas"
                    subtitle="Plano, limite de mesas, status, preço fundador e periodicidade de cada restaurante."
                  />
                  <PlansAdmin />
                </TabsContent>

                <TabsContent value="finance" className="mt-0 space-y-5">
                  <SectionHeader
                    title="Financeiro"
                    subtitle="Receitas da TIPE e obrigações operacionais, separadas do dinheiro dos restaurantes."
                  />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi
                      icon={Wallet}
                      label="MRR"
                      value={brl(overview.kpis.mrr)}
                      sub="Assinaturas ativas"
                    />
                    <Kpi
                      icon={Activity}
                      label="Volume processado"
                      value={brl(overview.kpis.gmv30)}
                      sub="Não integra a receita TIPE"
                    />
                    <Kpi
                      icon={CircleDollarSign}
                      label="Gorjetas extras"
                      value={brl(overview.kpis.tips30)}
                      sub={`Receita TIPE: ${brl(overview.kpis.tipeRevenue30)}`}
                    />
                    <Kpi
                      icon={Users}
                      label="Saques pendentes"
                      value={String(overview.kpis.pendingWithdrawals)}
                      sub="Fila quinzenal de garçons"
                    />
                  </div>
                  <SaquesGarcons />
                </TabsContent>

                <TabsContent value="support" className="mt-0 space-y-5">
                  <SectionHeader
                    title="Suporte e relacionamento"
                    subtitle="Diagnóstico comercial e operacional sem assumir a conta do restaurante."
                  />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <DataPanel title="Interessados" subtitle="Contatos recebidos pela landing page">
                      <Link
                        to="/admin/leads"
                        className="mb-4 flex h-10 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background"
                      >
                        Abrir lista de espera completa
                      </Link>
                      {overview.leads.length === 0 ? (
                        <Empty text="Nenhum contato recebido." />
                      ) : (
                        overview.leads.map((lead) => (
                          <div
                            key={lead.id}
                            className="border-t border-border py-3 first:border-0 first:pt-0"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{lead.restaurant_name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {lead.contact_name} · {lead.email}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {dateTime(lead.created_at)}
                              </span>
                            </div>
                            {lead.message && (
                              <p className="mt-2 text-sm text-muted-foreground">{lead.message}</p>
                            )}
                          </div>
                        ))
                      )}
                    </DataPanel>
                    <DataPanel
                      title="Diagnóstico operacional"
                      subtitle="Pontos que exigem contato ou orientação"
                    >
                      {overview.restaurants.filter(
                        (r) =>
                          r.onboarding !== "done" ||
                          r.payout !== "active" ||
                          r.subStatus === "past_due",
                      ).length === 0 ? (
                        <Empty text="Nenhuma pendência operacional." />
                      ) : (
                        overview.restaurants
                          .filter(
                            (r) =>
                              r.onboarding !== "done" ||
                              r.payout !== "active" ||
                              r.subStatus === "past_due",
                          )
                          .map((r) => (
                            <div
                              key={r.id}
                              className="border-t border-border py-3 first:border-0 first:pt-0"
                            >
                              <p className="font-semibold">{r.name}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {r.onboarding !== "done" && (
                                  <Badge variant="secondary">Integração pendente</Badge>
                                )}
                                {r.payout !== "active" && (
                                  <Badge variant="secondary">Recebimento não conectado</Badge>
                                )}
                                {r.subStatus === "past_due" && (
                                  <Badge variant="destructive">Assinatura em atraso</Badge>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </DataPanel>
                  </div>
                </TabsContent>

                <TabsContent value="governance" className="mt-0 space-y-5">
                  <SectionHeader
                    title="Governança"
                    subtitle="Privacidade, segurança e rastreabilidade das ações na plataforma."
                  />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <DataPanel
                      title="Solicitações de privacidade"
                      subtitle={`${overview.kpis.openPrivacy} em aberto`}
                    >
                      {overview.privacy.length === 0 ? (
                        <Empty text="Nenhuma solicitação." />
                      ) : (
                        overview.privacy.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-border py-3 first:border-0 first:pt-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.request_type} · {item.email}
                              </p>
                            </div>
                            <Badge variant="secondary" className="h-fit shrink-0">
                              {item.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </DataPanel>
                    <DataPanel
                      title="Eventos de segurança"
                      subtitle="Registro recente da plataforma"
                    >
                      {overview.security.length === 0 ? (
                        <Empty text="Nenhum evento recente." />
                      ) : (
                        overview.security.map((event) => (
                          <div
                            key={event.id}
                            className="border-t border-border py-3 first:border-0 first:pt-0"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{event.action}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {event.restaurant_slug ?? "Plataforma"}
                                </p>
                              </div>
                              <Badge
                                variant={event.result === "denied" ? "destructive" : "secondary"}
                                className="h-fit shrink-0"
                              >
                                {event.result}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dateTime(event.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </DataPanel>
                  </div>
                  <LebreLimits />
                  <LaunchStatesAdmin />
                  <DataPanel
                    title="Equipe de atendimento"
                    subtitle="Visão consolidada de acessos e gorjetas"
                  >
                    <SearchField
                      value={search}
                      onChange={setSearch}
                      placeholder="Buscar garçom, e-mail ou restaurante"
                    />
                    <div className="mt-3 divide-y divide-border">
                      {waiters.slice(0, 20).map((waiter) => (
                        <div
                          key={waiter.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{waiter.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {waiter.restaurant} · {waiter.email ?? "sem e-mail"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">{brl(waiter.tips30)}</p>
                            <p className="text-xs text-muted-foreground">30 dias</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DataPanel>
                </TabsContent>
              </>
            )}
          </main>
        </div>
      </div>
      <RestaurantDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Tabs>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[clamp(1.6rem,1.3rem+0.9vw,2.2rem)] font-medium leading-[1.05] tracking-[-0.035em]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  warning = false,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  sub?: string;
  warning?: boolean;
}) {
  return (
    <div className="surface-card flex min-h-[124px] flex-col p-5">
      <div className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <Icon
          className={`h-4 w-4 shrink-0 ${warning ? "text-warning-foreground" : "text-muted-foreground"}`}
        />
      </div>
      <div className="money mt-auto pt-4 font-display text-[1.75rem] font-medium leading-none tracking-[-0.035em]">
        {value}
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
function StatusLine({ label, value, ok }: { label: string; value: number; ok: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <TriangleAlert className="h-4 w-4 shrink-0 text-highlight" />
        )}
        <span className="truncate text-sm">{label}</span>
      </div>
      <strong className="shrink-0 text-sm">{value}</strong>
    </div>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
function Subscription({
  status,
  plan,
  trialEndsAt,
}: {
  status: string;
  plan: string;
  trialEndsAt: string | null;
}) {
  return (
    <>
      <Badge
        variant={
          status === "active" ? "default" : status === "past_due" ? "destructive" : "secondary"
        }
      >
        {subscriptionLabels[status] ?? status}
      </Badge>
      <p className="mt-1 text-xs text-muted-foreground">
        {plan}
        {trialEndsAt && status !== "active" ? ` · até ${date(trialEndsAt)}` : ""}
      </p>
    </>
  );
}
function ReceivingStatus({ status }: { status: string }) {
  const active = status === "active";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-primary" : "bg-highlight"}`} />
      <span className="text-xs font-semibold">
        {active ? "Conectado" : status === "disconnected" ? "Desconectado" : "Não conectado"}
      </span>
    </div>
  );
}
function RestaurantCard({ restaurant: r }: { restaurant: RestaurantSummary }) {
  return (
    <article className="rounded-[1.25rem] border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-medium tracking-[-0.02em]">{r.name}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {r.cnpj ?? "CNPJ não informado"}
          </p>
        </div>
        <div className="shrink-0">
          <Subscription status={r.subStatus} plan={r.plan} trialEndsAt={r.trialEndsAt} />
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Integração</dt>
          <dd className="mt-1 font-semibold">{r.onboarding === "done" ? r.pos : "Pendente"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Estrutura</dt>
          <dd className="mt-1 font-semibold">
            {r.tables} mesas · {r.waiters} garçons
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Volume em 30 dias</dt>
          <dd className="mt-1 font-semibold">{brl(r.gmv30)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Recebimentos</dt>
          <dd className="mt-1">
            <ReceivingStatus status={r.payout} />
          </dd>
        </div>
      </dl>
    </article>
  );
}
function DataPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-display font-medium tracking-[-0.02em]">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function RestaurantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useServerFn(createRestaurant);
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", pos: "", tables: 10 });
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await create({ data: form });
      toast.success("Restaurante cadastrado no Backoffice");
      await queryClient.invalidateQueries({ queryKey: ["founder-overview"] });
      onOpenChange(false);
      setForm({ name: "", slug: "", pos: "", tables: 10 });
      setSlugTouched(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar restaurante</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Crie o cadastro administrativo. O acesso operacional será liberado somente à equipe
          autorizada do restaurante.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="restaurant-name"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Nome fantasia
            </label>
            <Input
              id="restaurant-name"
              required
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  slug: slugTouched ? current.slug : slugify(name),
                }));
              }}
              placeholder="Restaurante Maré Alta"
            />
          </div>
          <div>
            <label
              htmlFor="restaurant-slug"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Endereço na TIPE
            </label>
            <Input
              id="restaurant-slug"
              required
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
              }}
              placeholder="mare-alta"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              tipe.digital/{form.slug || "nome-do-restaurante"}
            </p>
          </div>
          <div>
            <label
              htmlFor="restaurant-pos"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              PDV utilizado
            </label>
            <Input
              id="restaurant-pos"
              required
              value={form.pos}
              onChange={(event) => setForm((current) => ({ ...current, pos: event.target.value }))}
              placeholder="Nome do sistema usado hoje"
            />
          </div>
          <div>
            <label
              htmlFor="restaurant-tables"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Quantidade inicial de mesas
            </label>
            <Input
              id="restaurant-tables"
              type="number"
              min={1}
              max={1000}
              required
              value={form.tables}
              onChange={(event) =>
                setForm((current) => ({ ...current, tables: Number(event.target.value) }))
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Cadastrar cliente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
