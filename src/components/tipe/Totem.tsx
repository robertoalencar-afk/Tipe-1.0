import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Copy, CreditCard, ExternalLink, MonitorSmartphone, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOpsData } from "@/lib/tipe/admin.functions";
import { settleTotemOrder, getTotemToken } from "@/lib/tipe/totem.functions";
import { cancelCounterSale } from "@/lib/tipe/orders.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const curto: Record<string, string> = { cash: "Dinheiro", card: "Cartão", pix: "Pix" };

/** Caixa: pedidos do totem aguardando cobrança. Ao cobrar, vão para a cozinha. */
export function TotemACobrar({ slug, podeCobrar }: { slug: string; podeCobrar: boolean }) {
  const fetchOps = useServerFn(getOpsData);
  const ops = useQuery({ queryKey: ["ops", slug], queryFn: () => fetchOps({ data: { slug } }), refetchInterval: 10000 });
  const settle = useServerFn(settleTotemOrder);
  const cancel = useServerFn(cancelCounterSale);
  const qc = useQueryClient();
  const [aberto, setAberto] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<"cash" | "card" | "pix">("cash");
  const [recebido, setRecebido] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const pend = ops.data?.totemPending ?? [];
  if (pend.length === 0) return null;
  const temCaixa = !!ops.data?.session;

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setOcupado(id);
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["ops", slug] }); setAberto(null); setRecebido(""); setMetodo("cash"); }
    catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
  }

  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-card p-4">
      <h3 className="mb-1 font-display font-bold">Totem — pedidos a cobrar</h3>
      <p className="mb-3 text-xs text-muted-foreground">O cliente montou o pedido no totem. Ao cobrar, o pedido vai para a cozinha.</p>
      {!temCaixa && <p className="mb-2 rounded-xl border border-warning/50 bg-warning/10 p-2 text-xs">Abra o caixa para cobrar.</p>}
      <ul className="space-y-3">
        {pend.map((o) => {
          const valor = Number(o.total) || 0;
          const troco = metodo === "cash" ? Math.round(((Number(recebido.replace(",", ".")) || 0) - valor) * 100) / 100 : 0;
          return (
            <li key={o.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-display text-lg font-bold tabular-nums">Senha {o.ticket}</span>
                  {o.customer && <span className="ml-2 text-sm">{o.customer}</span>}
                  <div className="text-xs text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{brl(valor)}</span>
                  {podeCobrar && <Button size="sm" disabled={!temCaixa} onClick={() => setAberto(aberto === o.id ? null : o.id)}>Cobrar</Button>}
                </div>
              </div>
              {aberto === o.id && podeCobrar && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {([["cash", Banknote], ["card", CreditCard], ["pix", QrCode]] as const).map(([id, Icon]) => (
                      <Button key={id} type="button" size="sm" variant={metodo === id ? "default" : "outline"} className="h-auto flex-col gap-1 py-2" onClick={() => setMetodo(id)}><Icon className="h-4 w-4" /><span className="text-xs">{curto[id]}</span></Button>
                    ))}
                  </div>
                  {metodo === "cash" && (
                    <div>
                      <Input inputMode="decimal" placeholder="Valor recebido" value={recebido} onChange={(e) => setRecebido(e.target.value)} />
                      {Number(recebido.replace(",", ".")) > 0 && <p className={`mt-1 text-sm font-semibold ${troco < 0 ? "text-destructive" : ""}`}>{troco < 0 ? `Faltam ${brl(-troco)}` : `Troco: ${brl(troco)}`}</p>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={ocupado === o.id || (metodo === "cash" && (Number(recebido.replace(",", ".")) || 0) < valor)}
                      onClick={() => run(o.id, () => settle({ data: { orderId: o.id, method: metodo, ...(metodo === "cash" ? { cashReceived: Number(recebido.replace(",", ".")) || 0 } : {}) } }), `Senha ${o.ticket} cobrada · foi para a cozinha`)}>
                      Confirmar {brl(valor)}
                    </Button>
                    <Button variant="ghost" disabled={ocupado === o.id} onClick={() => {
                      const motivo = window.prompt(`Cancelar a senha ${o.ticket}? Informe o motivo:`);
                      if (motivo && motivo.trim().length >= 3) void run(o.id, () => cancel({ data: { orderId: o.id, reason: motivo.trim() } }), `Senha ${o.ticket} cancelada`);
                      else if (motivo !== null) toast.error("Informe o motivo com pelo menos 3 letras");
                    }}><X className="mr-1 h-4 w-4" />Cancelar</Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Configurações: link do totem para abrir no dispositivo. */
export function TotemConfig({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const getToken = useServerFn(getTotemToken);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/${slug}/totem?t=${token}` : "";

  async function carregar(rotate = false) {
    if (rotate && !window.confirm("Gerar um novo link? O totem que usa o link atual para de funcionar até receber o novo.")) return;
    setCarregando(true);
    try { setToken((await getToken({ data: { slug, rotate } })).token); if (rotate) toast.success("Novo link gerado"); }
    catch (e) { toast.error((e as Error).message); } finally { setCarregando(false); }
  }

  if (!podeDono) return null;
  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">Link do totem</h4>
          <p className="text-sm text-muted-foreground">Abra este link no navegador do totem (tablet ou monitor com toque), uma vez. Ele não pede login.</p>
          {!token ? (
            <Button size="sm" className="mt-2" disabled={carregando} onClick={() => carregar(false)}>Mostrar link do totem</Button>
          ) : (
            <div className="mt-2 space-y-2">
              <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link do totem" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(url).then(() => toast.success("Link copiado")); }}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
                <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Abrir</a></Button>
                <Button size="sm" variant="ghost" disabled={carregando} onClick={() => carregar(true)}>Gerar novo link</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
