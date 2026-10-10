import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, KeyRound, MessageCircle, PlugZap } from "lucide-react";
import { getPdvEvents, getPdvIntegration, setPdvAdapter, testPdvConnection } from "@/lib/tipe/pdv-integrations.functions";
import { whatsappLink } from "@/lib/tipe/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cashAction, getOpsData, getReports, saveSettings, setItemStatus } from "@/lib/tipe/admin.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const metodoLabel: Record<string, string> = { pix: "Pix", card: "Cartão", apple_pay: "Apple Pay", google_pay: "Google Pay", at_establishment: "Dinheiro ou maquininha" };
type CashInput =
  | { action: "open"; slug: string; amount: number }
  | { action: "move"; slug: string; kind: "withdrawal" | "deposit"; amount: number; reason: string }
  | { action: "close"; slug: string; counted: number; expected: number; notes: string };
export type OpsData = Awaited<ReturnType<typeof getOpsData>>;

export function useOps(slug: string) {
  const fetchOps = useServerFn(getOpsData);
  return useQuery({ queryKey: ["ops", slug], queryFn: () => fetchOps({ data: { slug } }), refetchInterval: 10000 });
}
function useReports(slug: string, days: number) {
  const fetchR = useServerFn(getReports);
  return useQuery({ queryKey: ["reports", slug, days], queryFn: () => fetchR({ data: { slug, days } }) });
}
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-display text-2xl font-bold">{value}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</Card>
);

// ---------------- Início ----------------
export function Inicio({ slug, mesasAbertas, emAberto, pendentes, onGo }: { slug: string; mesasAbertas: number; emAberto: number; pendentes: number; onGo: (s: string) => void }) {
  const rep = useReports(slug, 1);
  const vendas = rep.data?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
  const pedidos = new Set(rep.data?.items.map((i) => `${i.table}-${i.at}`)).size;
  const top = useMemo(() => {
    const m = new Map<string, number>();
    rep.data?.items.forEach((i) => m.set(i.name, (m.get(i.name) ?? 0) + i.qty));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rep.data]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Vendas lançadas (24h)" value={brl(vendas)} />
        <Kpi label="Mesas abertas" value={String(mesasAbertas)} hint={`${brl(emAberto)} em aberto`} />
        <Kpi label="Ticket médio (24h)" value={brl(pedidos ? vendas / pedidos : 0)} />
        <Kpi label="Aguardando confirmação" value={String(pendentes)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">Mais vendidos (24h)</h3>
          {top.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma venda nas últimas 24h.</p> : (
            <ol className="space-y-1 text-sm">{top.map(([n, q], i) => <li key={n} className="flex justify-between"><span>{i + 1}. {n}</span><span className="font-semibold">{q}</span></li>)}</ol>
          )}
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">Atalhos</h3>
          <div className="grid grid-cols-2 gap-2">
            {[["pdv", "Lançar pedido"], ["salao", "Ver salão"], ["caixa", "Caixa"], ["cozinha", "Cozinha e bar"], ["relatorios", "Relatórios"], ["qr", "Mesas e QR"]].map(([k, l]) => (
              <Button key={k} variant="outline" onClick={() => onGo(k!)}>{l}</Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Cozinha e bar (KDS) ----------------
const kdsNext: Record<string, { to: "preparing" | "ready" | "delivered"; label: string }> = {
  received: { to: "preparing", label: "Iniciar preparo" }, preparing: { to: "ready", label: "Marcar pronto" }, ready: { to: "delivered", label: "Entregue" },
};
const kdsCols = [["received", "Recebido"], ["preparing", "Preparando"], ["ready", "Pronto"]] as const;
export function Cozinha({ slug }: { slug: string }) {
  const ops = useOps(slug);
  const set = useServerFn(setItemStatus);
  const qc = useQueryClient();
  const [setor, setSetor] = useState<"all" | "kitchen" | "bar">("all");
  const itens = (ops.data?.kds ?? []).filter((k) => setor === "all" || k.sector === setor);
  async function mover(id: string, to: "preparing" | "ready" | "delivered") {
    try { await set({ data: { id, status: to } }); qc.invalidateQueries({ queryKey: ["ops", slug] }); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {([["all", "Todos"], ["kitchen", "Cozinha"], ["bar", "Bar"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={setor === k ? "default" : "outline"} onClick={() => setSetor(k)}>{l}</Button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {kdsCols.map(([st, label]) => (
          <div key={st} className="rounded-2xl bg-muted/50 p-3">
            <h3 className="mb-2 text-sm font-semibold">{label} ({itens.filter((i) => i.status === st).length})</h3>
            <div className="space-y-2">
              {itens.filter((i) => i.status === st).map((i) => (
                <Card key={i.id} className="p-3">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Mesa {i.table} · {i.sector === "bar" ? "Bar" : "Cozinha"}</span><span>{new Date(i.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <div className="mt-1 font-semibold">{i.quantity}× {i.item_name}</div>
                  {i.notes && <div className="mt-1 rounded bg-accent/20 px-2 py-1 text-xs">Obs.: {i.notes}</div>}
                  <Button size="sm" className="mt-2 w-full" onClick={() => mover(i.id, kdsNext[st]!.to)}>{kdsNext[st]!.label}</Button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Caixa ----------------
export function Caixa({ slug, podeCaixa, confirmacoes }: { slug: string; podeCaixa: boolean; confirmacoes: React.ReactNode }) {
  const ops = useOps(slug);
  const act = useServerFn(cashAction);
  const qc = useQueryClient();
  const [abertura, setAbertura] = useState("");
  const [mv, setMv] = useState({ kind: "withdrawal" as "withdrawal" | "deposit", amount: "", reason: "" });
  const [contado, setContado] = useState("");
  const s = ops.data?.session;
  const mov = ops.data?.movements ?? [];
  const reforco = mov.filter((m) => m.kind === "deposit").reduce((a, m) => a + m.amount, 0);
  const sangria = mov.filter((m) => m.kind === "withdrawal").reduce((a, m) => a + m.amount, 0);
  const esperado = (s?.opening_amount ?? 0) + reforco - sangria;
  async function run(data: CashInput, ok: string) {
    try { await act({ data }); toast.success(ok); qc.invalidateQueries({ queryKey: ["ops", slug] }); return true; } catch (e) { toast.error((e as Error).message); return false; }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        {!s ? (
          <Card>
            <h3 className="font-semibold">Caixa fechado</h3>
            <p className="mb-3 text-sm text-muted-foreground">Informe o troco inicial para abrir o caixa.</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run({ action: "open", slug, amount: Number(abertura || 0) }, "Caixa aberto").then((ok) => ok && setAbertura("")); }}>
              <Input type="number" step="0.01" min={0} placeholder="R$ 0,00" value={abertura} onChange={(e) => setAbertura(e.target.value)} disabled={!podeCaixa} />
              <Button type="submit" disabled={!podeCaixa}>Abrir caixa</Button>
            </form>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">Caixa aberto</h3><span className="text-xs text-muted-foreground">desde {hora(s.opened_at)}</span></div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><dt>Troco inicial</dt><dd>{brl(s.opening_amount)}</dd></div>
                <div className="flex justify-between"><dt>Reforços</dt><dd>+ {brl(reforco)}</dd></div>
                <div className="flex justify-between"><dt>Sangrias</dt><dd>− {brl(sangria)}</dd></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Esperado em espécie (sem vendas)</dt><dd>{brl(esperado)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Recebido no estabelecimento</dt><dd>{brl(ops.data?.received ?? 0)}</dd></div>
              </dl>
            </Card>
            {podeCaixa && (
              <Card>
                <h3 className="mb-2 font-semibold">Sangria ou reforço</h3>
                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run({ action: "move", slug, kind: mv.kind, amount: Number(mv.amount), reason: mv.reason }, "Movimento registrado").then((ok) => ok && setMv({ ...mv, amount: "", reason: "" })); }}>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={mv.kind === "withdrawal" ? "default" : "outline"} onClick={() => setMv({ ...mv, kind: "withdrawal" })}>Sangria</Button>
                    <Button type="button" size="sm" variant={mv.kind === "deposit" ? "default" : "outline"} onClick={() => setMv({ ...mv, kind: "deposit" })}>Reforço</Button>
                  </div>
                  <Input required type="number" step="0.01" min={0.01} placeholder="Valor" value={mv.amount} onChange={(e) => setMv({ ...mv, amount: e.target.value })} />
                  <Input placeholder="Motivo (opcional)" value={mv.reason} onChange={(e) => setMv({ ...mv, reason: e.target.value })} />
                  <Button type="submit" variant="outline" className="w-full">Registrar</Button>
                </form>
              </Card>
            )}
            {podeCaixa && (
              <Card>
                <h3 className="mb-2 font-semibold">Fechar caixa</h3>
                <form className="space-y-2" onSubmit={(e) => {
                  e.preventDefault();
                  const total = esperado + (ops.data?.received ?? 0);
                  if (!window.confirm(`Fechar o caixa com ${brl(Number(contado || 0))} contados? Esperado: ${brl(total)}.`)) return;
                  void run({ action: "close", slug, counted: Number(contado || 0), expected: total, notes: "" }, "Caixa fechado").then((ok) => ok && setContado(""));
                }}>
                  <Input required type="number" step="0.01" min={0} placeholder="Valor contado (espécie + comprovantes)" value={contado} onChange={(e) => setContado(e.target.value)} />
                  {contado && <p className="text-xs text-muted-foreground">Diferença: {brl(Number(contado) - esperado - (ops.data?.received ?? 0))}</p>}
                  <Button type="submit" className="w-full">Fechar caixa</Button>
                </form>
              </Card>
            )}
          </>
        )}
        {mov.length > 0 && (
          <Card><h3 className="mb-2 font-semibold">Movimentos</h3><ul className="space-y-1 text-sm">{mov.map((m) => <li key={m.id} className="flex justify-between"><span>{m.kind === "deposit" ? "Reforço" : "Sangria"}{m.reason ? ` · ${m.reason}` : ""}</span><span>{brl(m.amount)}</span></li>)}</ul></Card>
        )}
      </div>
      <div><h3 className="mb-2 font-semibold">Pagamentos para confirmar</h3>{confirmacoes}</div>
    </div>
  );
}

// ---------------- Relatórios ----------------
export function Relatorios({ slug }: { slug: string }) {
  const [days, setDays] = useState(7);
  const rep = useReports(slug, days);
  const d = rep.data;
  const vendas = d?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
  const recebido = d?.payments.filter((p) => p.target === "restaurant").reduce((s, p) => s + p.amount, 0) ?? 0;
  const gorjetas = d?.payments.filter((p) => p.target === "tipe").reduce((s, p) => s + p.amount, 0) ?? 0;
  const agrupa = <T,>(arr: T[], key: (x: T) => string, val: (x: T) => number) => {
    const m = new Map<string, number>(); arr.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + val(x)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const porProduto = d ? agrupa(d.items, (i) => i.name, (i) => i.price * i.qty).slice(0, 15) : [];
  const porGarcom = d ? agrupa(d.items, (i) => d.waiters.find((w) => w.id === i.waiter)?.name ?? "Sem garçom", (i) => i.price * i.qty) : [];
  const contas = d?.payments.filter((p) => p.target === "restaurant") ?? [];
  const taxaTotal = contas.reduce((s, p) => s + p.serviceFee, 0);
  const taxaPorGarcom = d ? agrupa(contas.filter((p) => p.serviceFee > 0), (p) => d.waiters.find((w) => w.id === p.waiter)?.name ?? "Sem garçom", (p) => p.serviceFee) : [];
  const porMetodo = d ? agrupa(d.payments.filter((p) => p.target === "restaurant"), (p) => metodoLabel[p.method] ?? p.method, (p) => p.amount) : [];
  const porDia = d ? agrupa(d.items, (i) => new Date(i.at).toLocaleDateString("pt-BR"), (i) => i.price * i.qty).sort((a, b) => a[0].split("/").reverse().join().localeCompare(b[0].split("/").reverse().join())) : [];
  const maxDia = Math.max(1, ...porDia.map((x) => x[1]));
  function exportar() {
    if (!d) return;
    const linhas = ["data;mesa;codigo;produto;qtd;preco;total", ...d.items.map((i) => [new Date(i.at).toLocaleString("pt-BR"), i.table, i.code, i.name, i.qty, i.price.toFixed(2).replace(".", ","), (i.price * i.qty).toFixed(2).replace(".", ",")].join(";"))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `vendas-${slug}-${days}d.csv`; a.click();
  }
  const Lista = ({ t, rows }: { t: string; rows: [string, number][] }) => (
    <Card><h3 className="mb-2 font-semibold">{t}</h3>{rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : <ul className="space-y-1 text-sm">{rows.map(([k, v]) => <li key={k} className="flex justify-between gap-2"><span className="truncate">{k}</span><span className="font-semibold">{brl(v)}</span></li>)}</ul>}</Card>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[1, 7, 30].map((n) => <Button key={n} size="sm" variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n === 1 ? "Hoje (24h)" : `${n} dias`}</Button>)}
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportar}><Download className="mr-1 h-4 w-4" />Exportar planilha</Button>
      </div>
      {rep.isLoading ? <p className="text-muted-foreground">Carregando…</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Vendas lançadas" value={brl(vendas)} />
            <Kpi label="Recebido pela TIPE (conta)" value={brl(recebido)} />
            <Kpi label="Gorjetas extras" value={brl(gorjetas)} />
            <Kpi label="Estornos" value={String(d?.voids.length ?? 0)} hint={brl(d?.voids.reduce((s, v) => s + v.unit_price * v.quantity, 0) ?? 0)} />
          </div>
          <Card>
            <h3 className="mb-3 font-semibold">Vendas por dia</h3>
            <div className="flex h-40 items-end gap-2">
              {porDia.map(([dia, v]) => (
                <div key={dia} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(v / maxDia) * 100}%` }} title={brl(v)} />
                  <span className="text-[10px] text-muted-foreground">{dia.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <Lista t="Por produto" rows={porProduto} />
            <Lista t="Por garçom" rows={porGarcom} />
            <Lista t="Por forma de pagamento" rows={porMetodo} />
            <Lista t={`Taxa de serviço recebida: ${brl(taxaTotal)}`} rows={taxaPorGarcom} />
          </div>
          <Card>
            <h3 className="mb-2 font-semibold">Estornos</h3>
            {!d?.voids.length ? <p className="text-sm text-muted-foreground">Nenhum estorno no período.</p> : (
              <ul className="space-y-1 text-sm">{d.voids.map((v, i) => <li key={i} className="flex justify-between gap-2"><span>{v.quantity}× {v.item_name} · {v.reason}</span><span className="text-muted-foreground">{hora(v.created_at)}</span></li>)}</ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------- Integrações ----------------
export function Integracoes({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const fetchInteg = useServerFn(getPdvIntegration);
  const testar = useServerFn(testPdvConnection);
  const trocar = useServerFn(setPdvAdapter);
  const fetchEvents = useServerFn(getPdvEvents);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pdv-integ", slug], queryFn: () => fetchInteg({ data: { slug } }), refetchInterval: 20000 });
  const ev = useQuery({ queryKey: ["pdv-events", slug], queryFn: () => fetchEvents({ data: { slug } }), enabled: !!q.data?.isFounder });
  const [segredo, setSegredo] = useState<{ secret: string; url: string } | null>(null);
  const [testando, setTestando] = useState(false);
  if (!podeDono) return <p className="text-muted-foreground">Somente o dono configura integrações.</p>;
  if (!q.data) return <p className="text-muted-foreground">Carregando…</p>;
  const d = q.data;
  const manual = d.adapter === "lancamento_tipe";
  const copiar = (t: string) => { void navigator.clipboard.writeText(t); toast.success("Copiado"); };
  async function testarConexao() {
    setTestando(true);
    try { const r = await testar({ data: { slug } }); r.ok ? toast.success("Conexão funcionando") : toast.error(r.erro); qc.invalidateQueries({ queryKey: ["pdv-integ", slug] }); }
    catch (e) { toast.error((e as Error).message); } finally { setTestando(false); }
  }
  async function definir(adapter: string) {
    try {
      const r = await trocar({ data: { slug, adapter } });
      setSegredo(r.secret && r.webhookUrl ? { secret: r.secret, url: `${window.location.origin}${r.webhookUrl}` } : null);
      toast.success("Integração principal atualizada");
      qc.invalidateQueries({ queryKey: ["pdv-integ", slug] });
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary bg-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-display text-lg font-bold"><PlugZap className="h-5 w-5" />Modo atual: {d.adapterName}</div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.status === "error" ? "bg-destructive/15 text-destructive" : "bg-primary/20"}`}>
            {manual ? "Ativo" : d.status === "connected" ? "Conectado" : d.status === "error" ? "Com erro" : "Não conectado"}
          </span>
        </div>
        {manual ? (
          <p className="mt-2 text-sm text-muted-foreground">O Lançamento TIPE é o jeito rápido de colocar os pedidos na conta da mesa: escolha a mesa, toque nos itens e confirme. Os itens aparecem na hora no celular do cliente.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-muted-foreground">Última sincronização: {d.lastSyncAt ? hora(d.lastSyncAt) : "ainda não houve"}</p>
            {d.status === "error" && d.lastError && <p className="text-destructive">Último erro: {d.lastError}</p>}
            <Button size="sm" variant="outline" disabled={testando} onClick={testarConexao}>Testar conexão</Button>
            <p className="text-xs text-muted-foreground">O Lançamento TIPE continua disponível como reserva se a integração cair.</p>
          </div>
        )}
      </Card>
      <Card>
        <h3 className="font-semibold">Integrações diretas disponíveis</h3>
        {d.disponiveis.length === 0 ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">A integração direta com o seu sistema é feita pela equipe TIPE. Fale com a gente.</p>
            <a href={whatsappLink("Olá! Quero integrar o sistema do meu restaurante com a TIPE.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <MessageCircle className="h-4 w-4" />Falar no WhatsApp
            </a>
          </div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">{d.disponiveis.map((a) => <li key={a.id}>{a.nome}</li>)}</ul>
        )}
      </Card>
      {d.isFounder && (
        <Card className="space-y-3 border-dashed">
          <h3 className="font-semibold">Administração TIPE</h3>
          <p className="text-xs text-muted-foreground">Somente administradores TIPE veem esta área. Um restaurante usa um adaptador principal por vez.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={manual ? "default" : "outline"} onClick={() => definir("lancamento_tipe")}>Lançamento TIPE</Button>
            <Button size="sm" variant={d.adapter === "api_tipe" ? "default" : "outline"} onClick={() => { if (window.confirm("Ativar a API padrão TIPE? Um novo segredo será gerado.")) void definir("api_tipe"); }}><KeyRound className="mr-1 h-4 w-4" />API padrão TIPE</Button>
          </div>
          {segredo && (
            <div className="space-y-2 text-xs">
              <div className="flex gap-2"><code className="flex-1 break-all rounded bg-muted p-2">{segredo.url}</code><Button size="icon" variant="outline" onClick={() => copiar(segredo.url)}><Copy className="h-4 w-4" /></Button></div>
              <div className="flex gap-2"><code className="flex-1 break-all rounded bg-accent/20 p-2">{segredo.secret}</code><Button size="icon" variant="outline" onClick={() => copiar(segredo.secret)}><Copy className="h-4 w-4" /></Button></div>
              <p className="text-destructive">Copie agora: o segredo não será mostrado novamente. Envie nos cabeçalhos x-tipe-restaurant: {slug} e x-tipe-secret.</p>
            </div>
          )}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Eventos recebidos e enviados</h4>
            {!ev.data?.length ? <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p> : (
              <ul className="space-y-1 text-xs">{ev.data.map((e) => (
                <li key={e.id} className="flex justify-between gap-2"><span className={e.status === "ok" ? "" : "text-destructive"}>{e.direction === "in" ? "Recebido" : "Enviado"} · {e.event_type} · {e.detail ?? e.external_event_id}</span><span className="shrink-0 text-muted-foreground">{hora(e.created_at)}</span></li>
              ))}</ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------- Configurações ----------------
export function Configuracoes({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const ops = useOps(slug);
  const save = useServerFn(saveSettings);
  const qc = useQueryClient();
  const r = ops.data?.restaurant;
  const [f, setF] = useState<null | { name: string; rate: string; phone: string; address: string; hours: string; methods: string[] }>(null);
  if (!r) return <p className="text-muted-foreground">Carregando…</p>;
  const v = f ?? { name: r.name, rate: String(Math.round(r.service_rate * 100)), phone: r.phone ?? "", address: r.address ?? "", hours: r.opening_hours ?? "", methods: r.bill_payment_methods ?? ["pix", "apple_pay", "google_pay", "at_establishment"] };
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      try {
        await save({ data: { slug, name: v.name, serviceRate: Number(v.rate) / 100, phone: v.phone, address: v.address, openingHours: v.hours, billMethods: v.methods as ("pix" | "apple_pay" | "google_pay" | "at_establishment")[] } });
        toast.success("Configurações salvas"); setF(null);
        qc.invalidateQueries({ queryKey: ["ops", slug] }); qc.invalidateQueries({ queryKey: ["panel", slug] });
      } catch (err) { toast.error((err as Error).message); }
    }}>
      <Card className="space-y-3">
        <label className="block text-sm">Nome do restaurante<Input disabled={!podeDono} value={v.name} onChange={(e) => setF({ ...v, name: e.target.value })} /></label>
        <label className="block text-sm">Endereço na TIPE<Input disabled value={`tipe.digital/${slug}`} /></label>
        <label className="block text-sm">Taxa de serviço sugerida (%)<Input disabled={!podeDono} type="number" min={0} max={20} value={v.rate} onChange={(e) => setF({ ...v, rate: e.target.value })} /><span className="mt-1 block text-xs text-muted-foreground">De 0% a 20%. Use 0 para desativar. O percentual entra automaticamente na conta de cada cliente.</span></label>
        <label className="block text-sm">Telefone<Input disabled={!podeDono} value={v.phone} onChange={(e) => setF({ ...v, phone: e.target.value })} /></label>
        <label className="block text-sm">Endereço<Input disabled={!podeDono} value={v.address} onChange={(e) => setF({ ...v, address: e.target.value })} /></label>
        <label className="block text-sm">Horário de funcionamento<Input disabled={!podeDono} value={v.hours} onChange={(e) => setF({ ...v, hours: e.target.value })} /></label>
      </Card>
      <Card className="space-y-3">
        <div>
          <h3 className="font-display font-bold">Meios de pagamento da conta</h3>
          <p className="text-sm text-muted-foreground">Escolha o que o cliente pode usar para pagar a conta. A gorjeta extra não muda.</p>
        </div>
        {([["pix", "Pix"], ["apple_pay", "Apple Pay"], ["google_pay", "Google Pay"], ["at_establishment", "Pagamento no estabelecimento (dinheiro ou maquininha)"]] as const).map(([id, label]) => {
          const on = v.methods.includes(id);
          return (
            <label key={id} className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-primary" disabled={!podeDono || (on && v.methods.length === 1)} checked={on}
                onChange={() => setF({ ...v, methods: on ? v.methods.filter((m) => m !== id) : [...v.methods, id] })} />
              {label}
            </label>
          );
        })}
        <p className="text-xs text-muted-foreground">Pelo menos uma opção precisa ficar ativa.</p>
      </Card>
      {podeDono && <Button type="submit">Salvar</Button>}
    </form>
  );
}
