import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, Building2, CircleDollarSign, MessageSquare, Target, Users } from "lucide-react";
import { Esqueleto, Kpi, ListaAtencao, Painel, brl, brlCurto } from "@/components/tipe/painel/ui";
import type { getCentralDashboard } from "@/lib/tipe/central.functions";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Dash = Awaited<ReturnType<typeof getCentralDashboard>>;
type Ir = (s: SecaoCentral, aba?: string, id?: string) => void;

export function VisaoGeral({ dash, carregando, ir, nome }: { dash: Dash | undefined; carregando: boolean; ir: Ir; nome: string }) {
  if (carregando || !dash) return <Esqueleto linhas={6} />;
  const k = dash.kpis;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white sm:p-6" aria-label="Boas-vindas">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-brand/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white/65">{new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"},</p>
            <h2 className="truncate font-display text-2xl font-medium tracking-heading">{nome.split(" ")[0]}</h2>
            <p className="mt-0.5 text-sm text-white/65">Fundador · Central Tipe</p>
          </div>
          <div className="flex gap-6 text-right">
            <div><p className="font-display text-3xl font-medium leading-none">{k.pendencias}</p><p className="mt-1 text-xs text-white/60">pendências</p></div>
            <div><p className="font-display text-3xl font-medium leading-none">{k.oportunidadesAbertas}</p><p className="mt-1 text-xs text-white/60">oportunidades</p></div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Restaurantes ativos" value={k.restaurantesAtivos} hint={`${k.restaurantes} cadastrados`} icon={Building2} onClick={() => ir("restaurantes")} />
        <Kpi label={`Novos leads (${dash.periodo} d)`} value={k.novosLeads} delta={k.novosLeadsDelta} icon={Target} onClick={() => ir("comercial", "funil")} />
        <Kpi label="MRR" value={brl(k.mrr)} hint="Assinaturas ativas, sem isentos" icon={CircleDollarSign} onClick={() => ir("restaurantes", "assinaturas")} />
        <Kpi label="Receita Tipe (gorjetas)" value={brl(k.receitaTipe)} delta={k.receitaTipeDelta} hint="30% das gorjetas extras" icon={Banknote} tone="brand" onClick={() => ir("financeiro")} />
        <Kpi label="Volume processado" value={brlCurto(k.gmv)} delta={k.gmvDelta} hint={`${k.pagamentos} pagamentos; não é receita`} onClick={() => ir("financeiro", "pagamentos")} />
        <Kpi label="Conversão de leads" value={`${k.conversao}%`} hint={`${k.oportunidadesAbertas} oportunidades abertas`} icon={Users} onClick={() => ir("comercial", "funil")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Painel titulo="Precisa da sua atenção" descricao={`${k.pendencias} item(ns), do mais urgente ao mais antigo`}>
          <ListaAtencao
            itens={dash.atencao.map((a) => ({ ...a, onAbrir: () => ir(a.abrir.secao as SecaoCentral, a.abrir.aba, a.abrir.id) }))}
            vazio="Nada pendente agora. Leads, mensagens, assinaturas e integrações estão em dia."
          />
        </Painel>
        <div className="space-y-6">
          <Painel titulo="Funil comercial" descricao="Oportunidades abertas por etapa" acoes={<button type="button" className="text-sm font-medium text-brand-strong hover:underline" onClick={() => ir("comercial", "funil")}>Abrir funil</button>}>
            <ul className="divide-y divide-border">
              {dash.porEtapa.filter((e: any) => e.kind === "open").map((e: any) => (
                <li key={e.key} className="flex items-center justify-between py-2 text-sm">
                  <span>{e.label}</span>
                  <span className="font-semibold tabular-nums">{e.total}</span>
                </li>
              ))}
            </ul>
          </Painel>
          <Painel titulo="Comunicação" descricao="Aguardando resposta">
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="WhatsApp" value={k.mensagensAguardando} icon={MessageSquare} tone={k.mensagensAguardando ? "warning" : undefined} onClick={() => ir("whatsapp")} />
              <Kpi label="Saques de garçom" value={k.saquesPendentes} tone={k.saquesPendentes ? "warning" : undefined} onClick={() => ir("financeiro", "saques")} />
            </div>
          </Painel>
        </div>
      </div>

      <Painel titulo="Volume e receita por dia" descricao="Pagamentos aprovados nas mesas (volume) e parte da Tipe nas gorjetas (receita)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dash.dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#021E34" stopOpacity={0.25} /><stop offset="100%" stopColor="#021E34" stopOpacity={0} /></linearGradient>
                <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0FC9BD" stopOpacity={0.35} /><stop offset="100%" stopColor="#0FC9BD" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => brlCurto(v)} width={64} />
              <Tooltip formatter={(v: number, n: string) => [brl(v), n === "volume" ? "Volume" : "Receita Tipe"]} />
              <Area type="monotone" dataKey="volume" stroke="#021E34" fill="url(#gVol)" strokeWidth={2} />
              <Area type="monotone" dataKey="receita" stroke="#0FC9BD" fill="url(#gRec)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Painel>
    </div>
  );
}
