import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Aviso, Esqueleto, Kpi, Painel, Segmentado, StatusBadge, Tabela, brl, brlCurto, horaBR, usePaginacao, type Tone } from "@/components/tipe/painel/ui";
import { SaquesGarcons } from "@/components/tipe/SaquesGarcons";
import { getFinanceiroCentral } from "@/lib/tipe/central.functions";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["visao", "Visão"], ["pagamentos", "Pagamentos"], ["saques", "Saques"], ["incidentes", "Incidentes"]] as const;
const PERIODOS = [[7, "7 d"], [30, "30 d"], [90, "90 d"]] as const;
const METODO: Record<string, string> = { pix: "Pix", apple_pay: "Apple Pay", google_pay: "Google Pay", card: "Cartão", manual: "No balcão" };
const PAY_TONE: Record<string, Tone> = { approved: "success", pending: "warning", failed: "error", refunded: "info", canceled: "neutral" };

export function Financeiro({ aba, ir }: Props) {
  const atual = ABAS.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : "visao";
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const fetchF = useServerFn(getFinanceiroCentral);
  const q = useQuery({ queryKey: ["central-fin", dias], queryFn: () => fetchF({ data: { dias } }), refetchInterval: 60_000 });
  const pag = usePaginacao(q.data?.pagamentos ?? [], 40);
  if (q.isPending || !q.data) return <Esqueleto linhas={6} />;
  const d = q.data;
  const k = d.kpis;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado label="Seção" value={atual} onChange={(a) => ir("financeiro", a)} options={ABAS} />
        <Segmentado label="Período" value={dias} onChange={setDias} options={PERIODOS} />
      </div>
      {atual === "visao" && (
        <div className="space-y-5">
          <Aviso tone="neutral">Volume processado é dinheiro dos restaurantes, não receita da Tipe. Receita da Tipe = 30% das gorjetas extras + assinaturas. 70% das gorjetas vão ao garçom que lançou o último pedido da mesa.</Aviso>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Volume processado" value={brlCurto(k.volume)} delta={k.volumeDelta} hint={`${k.pagamentos} pagamentos`} />
            <Kpi label="Gorjetas extras" value={brl(k.gorjetas)} delta={k.gorjetasDelta} />
            <Kpi label="Receita Tipe (30%)" value={brl(k.receitaGorjetas)} tone="brand" />
            <Kpi label="Repasse garçons (70%)" value={brl(k.repasseGarcons)} />
            <Kpi label="MRR" value={brl(k.mrr)} hint={`${k.assinaturasAtivas} assinaturas ativas`} tone="brand" />
            <Kpi label="Saques pendentes" value={brl(k.saquesPendentes)} tone={k.saquesPendentes ? "warning" : undefined} onClick={() => ir("financeiro", "saques")} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Painel titulo="Por dia" descricao="Volume (marinho), gorjetas e receita da Tipe (turquesa)">
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={d.dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => brlCurto(v)} width={64} />
                <Tooltip formatter={(v: number, n: string) => [brl(v), n === "volume" ? "Volume" : n === "gorjetas" ? "Gorjetas" : "Receita Tipe"]} />
                <Area type="monotone" dataKey="volume" stroke="#021E34" fill="#021E34" fillOpacity={0.12} strokeWidth={2} /><Area type="monotone" dataKey="gorjetas" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={1.5} /><Area type="monotone" dataKey="receita" stroke="#0FC9BD" fill="#0FC9BD" fillOpacity={0.25} strokeWidth={2} />
              </AreaChart></ResponsiveContainer></div>
            </Painel>
            <Painel titulo="Por método" semPadding>
              <Tabela densa linhas={d.porMetodo} chave={(m) => m.metodo} vazio="Sem pagamentos no período." colunas={[{ k: "m", l: "Método", c: (m) => METODO[m.metodo] ?? m.metodo }, { k: "n", l: "Qtd.", num: true, c: (m) => m.n }, { k: "t", l: "Total", num: true, c: (m) => brl(m.total) }]} />
            </Painel>
          </div>
          <Painel titulo="Por restaurante" semPadding>
            <Tabela densa linhas={d.porRestaurante} chave={(r) => r.slug} vazio="Sem pagamentos no período." colunas={[{ k: "n", l: "Restaurante", c: (r) => String(r.nome) }, { k: "p", l: "Pagamentos", num: true, c: (r) => r.pagamentos }, { k: "g", l: "Volume", num: true, c: (r) => brl(r.gmv) }, { k: "t", l: "Gorjetas", num: true, md: true, c: (r) => brl(r.gorjetas) }, { k: "r", l: "Receita Tipe", num: true, c: (r) => <span className="money">{brl(r.receitaTipe)}</span> }]} />
          </Painel>
        </div>
      )}
      {atual === "pagamentos" && (
        <Painel semPadding titulo="Pagamentos" descricao={`${d.pagamentos.length} no período (mesa e gorjeta), do mais recente`}>
          <Tabela linhas={pag.fatia} chave={(p) => p.id} rodape={pag.controles} vazio="Nenhum pagamento no período." colunas={[
            { k: "q", l: "Quando", c: (p) => horaBR(p.em) }, { k: "r", l: "Restaurante", c: (p) => p.restaurante }, { k: "m", l: "Mesa", md: true, c: (p) => String(p.mesa ?? "—") },
            { k: "a", l: "Tipo", c: (p) => p.alvo === "tip" ? "Gorjeta" : "Conta" }, { k: "me", l: "Método", md: true, c: (p) => METODO[p.metodo ?? ""] ?? p.metodo ?? "—" },
            { k: "s", l: "Status", c: (p) => <StatusBadge tone={PAY_TONE[p.status] ?? "neutral"}>{p.status}</StatusBadge> }, { k: "v", l: "Valor", num: true, c: (p) => brl(p.valor) },
          ]} />
        </Painel>
      )}
      {atual === "saques" && <SaquesGarcons />}
      {atual === "incidentes" && (
        <Painel semPadding titulo="Incidentes de pagamento" descricao={`${k.incidentesAbertos} aberto(s)`}>
          <Tabela linhas={d.incidentes} chave={(i: any) => i.id} vazio="Nenhum incidente registrado." colunas={[{ k: "q", l: "Quando", c: (i: any) => horaBR(i.created_at) }, { k: "r", l: "Restaurante", c: (i: any) => i.restaurante }, { k: "t", l: "Tipo", c: (i: any) => i.kind }, { k: "s", l: "Status", c: (i: any) => <StatusBadge tone={i.status === "resolved" || i.status === "closed" ? "success" : "warning"}>{i.status}</StatusBadge> }, { k: "d", l: "Detalhe", md: true, c: (i: any) => i.detail ?? "—" }]} />
        </Painel>
      )}
    </div>
  );
}
