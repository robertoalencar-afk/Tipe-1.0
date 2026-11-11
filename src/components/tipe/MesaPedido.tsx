import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicMenu, placeCustomerOrder, type PublicMenu } from "@/lib/tipe/customer-order.functions";
import { totalCarrinho, carrinhoParaPedido } from "@/lib/tipe/pdv/comanda";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Cardápio digital do cliente: pede pela própria mesa, cai no KDS e na conta. */
export function MesaPedido({ slug, code, session, nome, device, onPlaced, onBlocked, podeEnviar = true }: {
  slug: string; code: string; session: string; nome: string;
  /** Token deste celular quando a mesa pede código curto. */
  device?: string | undefined;
  onPlaced: () => void | Promise<void>;
  /** A mesa deixou de estar liberada (ou falta o código): a tela volta para a liberação. */
  onBlocked?: ((motivo: "closed" | "code") => void) | undefined;
  /** Falso enquanto a mesa não foi liberada: dá para montar o pedido, mas não enviar. */
  podeEnviar?: boolean | undefined;
}) {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [obsAberta, setObsAberta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ itens: number } | null>(null);
  const requestId = useRef(nanoid(16));

  useEffect(() => {
    let vivo = true;
    void getPublicMenu({ data: { slug } }).then((r) => {
      if (!vivo) return;
      if ("error" in r) setErro("Não foi possível carregar o cardápio.");
      else setMenu(r);
    }).catch(() => vivo && setErro("Não foi possível carregar o cardápio."));
    return () => { vivo = false; };
  }, [slug]);

  const precoDe = useMemo(() => {
    const m = new Map((menu?.items ?? []).map((i) => [i.code, i.price]));
    return (c: string) => m.get(c) ?? 0;
  }, [menu]);

  if (erro) return <p className="rounded-2xl border border-border bg-card p-4 text-sm">{erro}</p>;
  if (!menu) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando o cardápio…</p>;
  if (!menu.selfOrder) return <p className="rounded-2xl border border-border bg-card p-4 text-sm">O pedido pela mesa não está disponível. Chame o garçom.</p>;

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-7 w-7" /></div>
        <h2 className="font-display text-xl font-extrabold">Pedido enviado!</h2>
        <p className="text-sm text-muted-foreground">{enviado.itens} {enviado.itens === 1 ? "item foi" : "itens foram"} para a cozinha. Em instantes aparecem na sua conta.</p>
        <Button className="mt-1 w-full" onClick={() => { setEnviado(null); requestId.current = nanoid(16); }}>Pedir mais</Button>
      </div>
    );
  }

  const linhas = carrinhoParaPedido(carrinho, obs);
  const total = totalCarrinho(linhas, precoDe);
  const qtdTotal = linhas.reduce((s, l) => s + l.qty, 0);
  const add = (c: string, d: number) => setCarrinho((x) => ({ ...x, [c]: Math.max(0, Math.min(99, (x[c] ?? 0) + d)) }));
  const itens = menu.items.filter((i) =>
    (busca || !cat || i.categoryId === cat) &&
    (!busca || i.name.toLowerCase().includes(busca.toLowerCase())));

  async function enviar() {
    if (!linhas.length || !podeEnviar) return;
    setEnviando(true); setErro(null);
    try {
      const r = await placeCustomerOrder({ data: { slug, code, session, requestId: requestId.current, ...(nome.trim() ? { customer: nome.trim() } : {}), ...(device ? { device } : {}), items: linhas } });
      if ("error" in r) {
        if ((r.error === "closed" || r.error === "code") && onBlocked) { onBlocked(r.error); return; }
        setErro(r.error === "disabled" ? "O pedido pela mesa foi desativado pelo restaurante. A sua conta continua em Pagar." : r.error === "unavailable" ? "Esta mesa está indisponível. Chame o garçom." : "Não foi possível enviar o pedido. Tente de novo.");
        return;
      }
      setCarrinho({}); setObs({});
      setEnviado({ itens: r.items });
      await onPlaced();
    } catch {
      setErro("Não foi possível enviar o pedido. Tente de novo.");
    } finally { setEnviando(false); }
  }

  return (
    <div className="pb-28">
      <label className="flex items-center gap-2 rounded-xl border border-input bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Buscar no cardápio</span>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no cardápio" className="h-11 w-full bg-transparent text-sm outline-none" />
      </label>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <Chip on={!cat} onClick={() => setCat("")}>Tudo</Chip>
        {menu.categories.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
      </div>

      <div className="mt-3 space-y-5">
        {menu.categories.map((c) => {
          const lista = itens.filter((i) => i.categoryId === c.id);
          if (!lista.length) return null;
          return (
            <section key={c.id}>
              <h3 className="mb-2 font-display text-sm font-bold text-muted-foreground">{c.name}</h3>
              <ul className="flex flex-col gap-2">
                {lista.map((i) => {
                  const q = carrinho[i.code] ?? 0;
                  return (
                    <li key={i.id} className={`rounded-2xl border bg-card p-3 ${q > 0 ? "border-2 border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{i.name}</p>
                          {i.description && <p className="mt-0.5 text-xs text-muted-foreground">{i.description}</p>}
                          <p className="mt-1 text-sm font-bold">{money(i.price)}</p>
                        </div>
                        {q > 0 ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-9 w-9" aria-label={`Menos um ${i.name}`} onClick={() => add(i.code, -1)}><Minus className="h-4 w-4" /></Button>
                            <span className="w-6 text-center font-bold tabular-nums">{q}</span>
                            <Button size="icon" className="h-9 w-9" aria-label={`Mais um ${i.name}`} onClick={() => add(i.code, 1)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" className="h-10 w-10 shrink-0" aria-label={`Adicionar ${i.name}`} onClick={() => add(i.code, 1)}><Plus className="h-5 w-5" /></Button>
                        )}
                      </div>
                      {q > 0 && (
                        obsAberta === i.code ? (
                          <Input autoFocus className="mt-2 h-10 text-sm" maxLength={140} placeholder="Observação (ex.: sem cebola)" value={obs[i.code] ?? ""} onChange={(e) => setObs({ ...obs, [i.code]: e.target.value })} onBlur={() => setObsAberta(null)} />
                        ) : (
                          <button type="button" onClick={() => setObsAberta(i.code)} className="mt-2 text-xs font-semibold text-primary">{obs[i.code]?.trim() ? `Obs.: ${obs[i.code]}` : "+ Adicionar observação"}</button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {itens.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>}
      </div>

      {erro && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{erro}</p>}

      {linhas.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-card p-3">
          <Button className="h-14 w-full text-base font-bold" disabled={enviando || !podeEnviar} onClick={enviar}>
            {enviando ? "Enviando…" : <><UtensilsCrossed className="mr-2 h-5 w-5" />Enviar {qtdTotal} {qtdTotal === 1 ? "item" : "itens"} · {money(total)}</>}
          </Button>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {podeEnviar ? "O pedido vai direto para a cozinha e entra na sua conta." : "Seu pedido fica guardado aqui. Envie assim que a mesa for liberada."}
          </p>
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{children}</button>;
}
