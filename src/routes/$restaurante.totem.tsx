import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import { nanoid } from "nanoid";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTotemContext, placeTotemOrder, type TotemContext } from "@/lib/tipe/totem.functions";
import { totalCarrinho, carrinhoParaPedido } from "@/lib/tipe/pdv/comanda";

// Totem de autoatendimento em tela cheia. Sem login: autorizado pelo token do
// dispositivo, gerado pelo dono/caixa em Configurações.
export const Route = createFileRoute("/$restaurante/totem")({
  ssr: false,
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({ meta: [{ title: "Autoatendimento — TIPE" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Totem,
});

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Totem() {
  const { restaurante } = Route.useParams();
  const { t: token } = Route.useSearch();
  const [ctx, setCtx] = useState<TotemContext | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fase, setFase] = useState<"inicio" | "pedido" | "senha">("inicio");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [cat, setCat] = useState<string>("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [senha, setSenha] = useState<{ ticket: number; total: number } | null>(null);
  const requestId = useRef(nanoid(16));

  useEffect(() => {
    if (!token || token.length < 16) { setErro("invalid"); return; }
    let vivo = true;
    void getTotemContext({ data: { slug: restaurante, token } }).then((r) => {
      if (!vivo) return;
      if ("error" in r) setErro("invalid");
      else setCtx(r);
    }).catch(() => vivo && setErro("net"));
    return () => { vivo = false; };
  }, [restaurante, token]);

  const precoDe = useMemo(() => {
    const m = new Map((ctx?.items ?? []).map((i) => [i.code, i.price]));
    return (c: string) => m.get(c) ?? 0;
  }, [ctx]);

  function reiniciar() {
    setCarrinho({}); setObs({}); setNome(""); setCat(""); setSenha(null);
    requestId.current = nanoid(16);
    setFase("inicio");
  }

  // Volta sozinho ao início depois de mostrar a senha, liberando o totem.
  useEffect(() => {
    if (fase !== "senha") return;
    const t = setTimeout(reiniciar, 12000);
    return () => clearTimeout(t);
  }, [fase]);

  if (erro) return <Tela><div className="m-auto max-w-lg px-8 text-center"><h1 className="font-display text-3xl font-bold">Totem</h1><p className="mt-3 text-lg opacity-80">{erro === "invalid" ? "Este totem não está configurado. Peça ao caixa o link do totem em Configurações." : "Sem conexão. Tente de novo em instantes."}</p></div></Tela>;
  if (!ctx) return <Tela><p className="m-auto text-xl opacity-80">Carregando…</p></Tela>;
  if (!ctx.enabled) return <Tela><p className="m-auto max-w-lg px-8 text-center text-xl opacity-80">O autoatendimento está desligado no momento. Faça seu pedido no caixa.</p></Tela>;

  const linhas = carrinhoParaPedido(carrinho, obs);
  const total = totalCarrinho(linhas, precoDe);
  const qtdTotal = linhas.reduce((s, l) => s + l.qty, 0);
  const add = (c: string, d: number) => setCarrinho((x) => ({ ...x, [c]: Math.max(0, Math.min(99, (x[c] ?? 0) + d)) }));

  async function finalizar() {
    if (!linhas.length) return;
    setEnviando(true); setErro(null);
    try {
      const r = await placeTotemOrder({ data: { slug: restaurante, token: token!, requestId: requestId.current, ...(nome.trim() ? { customer: nome.trim() } : {}), items: linhas } });
      if ("error" in r) { setErro(r.error === "disabled" ? "invalid" : "net"); return; }
      setSenha({ ticket: r.ticket, total: r.total });
      setFase("senha");
    } catch { setErro("net"); } finally { setEnviando(false); }
  }

  if (fase === "inicio") {
    return (
      <Tela>
        <button type="button" onClick={() => setFase("pedido")} className="m-auto flex flex-col items-center gap-8 px-8 text-center">
          <TipeLogo className="h-12" />
          <div>
            <h1 className="font-display text-5xl font-extrabold">{ctx.restaurantName}</h1>
            <p className="mt-4 text-2xl opacity-80">Toque para fazer seu pedido</p>
          </div>
          <span className="rounded-full bg-primary px-10 py-5 font-display text-3xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">Começar</span>
        </button>
      </Tela>
    );
  }

  if (fase === "senha" && senha) {
    return (
      <Tela>
        <div className="m-auto flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-2xl opacity-80">Pague no caixa a senha</p>
          <p className="font-display text-[12rem] font-extrabold leading-none text-primary">{senha.ticket}</p>
          <p className="text-3xl font-bold">{money(senha.total)}</p>
          <p className="max-w-xl text-xl opacity-80">Leve sua senha ao caixa para pagar. O pedido vai para a cozinha assim que o pagamento for confirmado.</p>
          <Button className="mt-4 h-16 px-10 text-xl" onClick={reiniciar}>Novo pedido</Button>
        </div>
      </Tela>
    );
  }

  // Fase de pedido
  const itens = ctx.items.filter((i) => !cat || i.categoryId === cat);
  return (
    <div className="customer-theme flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 px-6 py-4" style={{ background: "var(--gradient-brand)", color: "var(--secondary-foreground)" }}>
        <TipeLogo className="h-9" />
        <span className="font-display text-xl font-bold">{ctx.restaurantName}</span>
        <button type="button" onClick={reiniciar} className="rounded-full bg-secondary-foreground/10 px-4 py-2 text-sm font-semibold">Cancelar</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-border p-3">
          <CatBtn on={!cat} onClick={() => setCat("")}>Tudo</CatBtn>
          {ctx.categories.map((c) => <CatBtn key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</CatBtn>)}
        </nav>

        <main className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {itens.map((i) => {
              const q = carrinho[i.code] ?? 0;
              return (
                <div key={i.id} className={`flex flex-col rounded-2xl border-2 bg-card p-4 ${q > 0 ? "border-primary" : "border-border"}`}>
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold leading-tight">{i.name}</p>
                    {i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}
                  </div>
                  <p className="mt-2 font-display text-xl font-extrabold">{money(i.price)}</p>
                  {q > 0 ? (
                    <div className="mt-3 flex items-center justify-between">
                      <Button size="icon" variant="outline" className="h-12 w-12" aria-label={`Menos um ${i.name}`} onClick={() => add(i.code, -1)}><Minus className="h-6 w-6" /></Button>
                      <span className="font-display text-2xl font-bold tabular-nums">{q}</span>
                      <Button size="icon" className="h-12 w-12" aria-label={`Mais um ${i.name}`} onClick={() => add(i.code, 1)}><Plus className="h-6 w-6" /></Button>
                    </div>
                  ) : (
                    <Button className="mt-3 h-12 text-base" onClick={() => add(i.code, 1)}><Plus className="mr-1 h-5 w-5" />Adicionar</Button>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <aside className="flex w-80 shrink-0 flex-col border-l border-border">
          <h2 className="flex items-center gap-2 border-b border-border p-4 font-display text-lg font-bold"><ShoppingBag className="h-5 w-5" />Seu pedido</h2>
          <div className="flex-1 overflow-y-auto p-4">
            {linhas.length === 0 ? <p className="mt-8 text-center text-sm text-muted-foreground">Toque nos itens para montar seu pedido.</p> : (
              <ul className="space-y-3">
                {linhas.map((l) => {
                  const it = ctx.items.find((i) => i.code === l.code);
                  return (
                    <li key={l.code} className="flex items-start justify-between gap-2 text-sm">
                      <span><b>{l.qty}×</b> {it?.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{money(precoDe(l.code) * l.qty)}</span>
                        <button type="button" aria-label={`Remover ${it?.name}`} onClick={() => setCarrinho((x) => ({ ...x, [l.code]: 0 }))}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-3 border-t border-border p-4">
            <Input placeholder="Seu nome (opcional)" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} className="h-12" />
            <div className="flex items-center justify-between font-display text-xl font-extrabold"><span>Total</span><span>{money(total)}</span></div>
            <Button className="h-16 w-full text-lg font-bold" disabled={!linhas.length || enviando} onClick={finalizar}>
              {enviando ? "Enviando…" : <><UtensilsCrossed className="mr-2 h-5 w-5" />Finalizar · {qtdTotal} {qtdTotal === 1 ? "item" : "itens"}</>}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Você recebe uma senha e paga no caixa.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col text-secondary-foreground" style={{ background: "var(--gradient-brand)" }}>{children}</div>;
}

function CatBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl px-3 py-3 text-left font-semibold ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{children}</button>;
}
