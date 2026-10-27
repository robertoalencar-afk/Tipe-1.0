import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, BellRing, CreditCard, QrCode, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { callTicket, cancelCounterSale, counterSale, type CounterPayMethod } from "@/lib/tipe/orders.functions";
import { useOps } from "@/components/tipe/AdminSections";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const curto: Record<string, string> = { cash: "Dinheiro", card: "Cartão", pix: "Pix" };

/** Notas mais prováveis para agilizar o troco, como num PDV de balcão. */
function sugestoesDinheiro(total: number) {
  const out = new Set<number>([Math.ceil(total)]);
  for (const n of [5, 10, 20, 50, 100, 200]) if (n >= total) out.add(Math.ceil(total / n) * n);
  return [...out].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 4);
}

type Linha = { code: string; qty: number; notes?: string };

/** Fechamento da venda no balcão: forma de pagamento, troco e senha. */
export function BalcaoCheckout({ slug, linhas, total, onSold }: { slug: string; linhas: Linha[]; total: number; onSold: () => void }) {
  const sell = useServerFn(counterSale);
  const ops = useOps(slug);
  const qc = useQueryClient();
  const [cliente, setCliente] = useState("");
  const [metodo, setMetodo] = useState<CounterPayMethod | null>(null);
  const [recebido, setRecebido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [senha, setSenha] = useState<{ ticket: number; total: number; change: number | null; cliente: string } | null>(null);
  // Uma chave por venda: clique duplo ou nova tentativa nunca cobra duas vezes.
  const chave = useRef(nanoid(16));

  const caixaAberto = !!ops.data?.session;
  const valorRecebido = Number(recebido.replace(",", ".")) || 0;
  const troco = metodo === "cash" ? Math.round((valorRecebido - total) * 100) / 100 : 0;
  const podeCobrar = caixaAberto && linhas.length > 0 && !!metodo && (metodo !== "cash" || valorRecebido >= total) && !enviando;

  async function cobrar() {
    if (!podeCobrar || !metodo) return;
    setEnviando(true);
    try {
      const r = await sell({ data: { slug, requestId: chave.current, method: metodo, items: linhas, ...(cliente.trim() ? { customer: cliente.trim() } : {}), ...(metodo === "cash" ? { cashReceived: valorRecebido } : {}) } });
      setSenha({ ticket: r.ticket, total: r.total, change: r.change, cliente: cliente.trim() });
      chave.current = nanoid(16);
      setCliente(""); setMetodo(null); setRecebido("");
      qc.invalidateQueries({ queryKey: ["ops", slug] });
      onSold();
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  }

  return (
    <div className="space-y-3">
      {!ops.isLoading && !caixaAberto && (
        <p role="alert" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs">Abra o caixa na aba Caixa para vender no balcão.</p>
      )}
      <Input placeholder="Nome para chamar (opcional)" maxLength={40} value={cliente} onChange={(e) => setCliente(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        {([["cash", Banknote], ["card", CreditCard], ["pix", QrCode]] as const).map(([id, Icon]) => (
          <Button key={id} type="button" size="sm" variant={metodo === id ? "default" : "outline"} className="h-auto flex-col gap-1 py-2" onClick={() => setMetodo(id)}>
            <Icon className="h-4 w-4" /><span className="text-xs">{curto[id]}</span>
          </Button>
        ))}
      </div>
      {metodo === "cash" && (
        <div className="space-y-2">
          <Input inputMode="decimal" placeholder="Valor recebido" value={recebido} onChange={(e) => setRecebido(e.target.value)} />
          {total > 0 && (
            <div className="flex flex-wrap gap-1">
              {sugestoesDinheiro(total).map((v) => <Button key={v} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setRecebido(String(v))}>{brl(v)}</Button>)}
            </div>
          )}
          {valorRecebido > 0 && (
            <p className={`text-sm font-semibold ${troco < 0 ? "text-destructive" : ""}`}>{troco < 0 ? `Faltam ${brl(-troco)}` : `Troco: ${brl(troco)}`}</p>
          )}
        </div>
      )}
      <Button className="w-full" disabled={!podeCobrar} onClick={cobrar}>{enviando ? "Registrando…" : `Cobrar ${brl(total)} e gerar senha`}</Button>

      <Dialog open={!!senha} onOpenChange={(o) => !o && setSenha(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle>Venda registrada</DialogTitle></DialogHeader>
          {senha && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Senha{senha.cliente ? ` de ${senha.cliente}` : ""}</p>
              <p className="font-display text-7xl font-extrabold tabular-nums text-primary">{senha.ticket}</p>
              <p className="text-sm">Total {brl(senha.total)}{senha.change !== null ? ` · Troco ${brl(senha.change)}` : ""}</p>
              <p className="text-xs text-muted-foreground">O pedido já está na tela da cozinha. A senha aparece no painel quando ficar pronto.</p>
              <Button className="w-full" onClick={() => setSenha(null)}>Nova venda</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Vendas do balcão no caixa atual: status da senha, chamar de novo e cancelar. */
export function VendasBalcao({ slug, podeCancelar }: { slug: string; podeCancelar: boolean }) {
  const ops = useOps(slug);
  const cancel = useServerFn(cancelCounterSale);
  const call = useServerFn(callTicket);
  const qc = useQueryClient();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const vendas = ops.data?.counterOrders ?? [];
  if (!ops.data?.session || vendas.length === 0) return null;

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setOcupado(id);
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["ops", slug] }); } catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-2 font-semibold">Vendas no balcão deste caixa</h3>
      <ul className="divide-y divide-border text-sm">
        {vendas.slice(0, 30).map((v) => {
          const status = v.cancelled ? "Cancelada" : v.pickedUp ? "Retirado" : v.ready ? "Pronto" : "Preparando";
          return (
            <li key={v.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${v.cancelled ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <span className="font-display text-lg font-bold tabular-nums">{v.ticket}</span>
                <span className="ml-2">{v.customer ?? "Sem nome"}</span>
                <div className="text-xs text-muted-foreground">{curto[v.method] ?? v.method} · {brl(v.total)} · {new Date(v.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${v.cancelled ? "bg-muted" : v.ready && !v.pickedUp ? "bg-success text-success-foreground" : "bg-muted"}`}>{status}</span>
                {v.ready && !v.pickedUp && !v.cancelled && (
                  <Button size="sm" variant="outline" disabled={ocupado === v.id} onClick={() => run(v.id, () => call({ data: { orderId: v.id } }), `Senha ${v.ticket} chamada de novo`)}><BellRing className="mr-1 h-3 w-3" />Chamar</Button>
                )}
                {podeCancelar && !v.cancelled && (
                  <Button size="sm" variant="ghost" disabled={ocupado === v.id} onClick={() => {
                    const motivo = window.prompt(`Cancelar a venda da senha ${v.ticket} (${brl(v.total)})? Informe o motivo:`);
                    if (motivo && motivo.trim().length >= 3) void run(v.id, () => cancel({ data: { orderId: v.id, reason: motivo.trim() } }), `Venda da senha ${v.ticket} cancelada`);
                    else if (motivo !== null) toast.error("Informe o motivo com pelo menos 3 letras");
                  }}><X className="mr-1 h-3 w-3" />Cancelar</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
