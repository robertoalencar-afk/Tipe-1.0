import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CircleCheck,
  Clock3,
  HandCoins,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Star,
  Utensils,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LiberarPedidosMesa, useOrderAccess } from "@/components/tipe/LiberarPedidosMesa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getWaiterPos,
  waiterLaunchOrder,
  type WaiterPos,
  type WaiterTable,
} from "@/lib/tipe/waiter-order.functions";
import {
  totalCarrinho,
  carrinhoParaPedido,
  avisosDeMudanca,
  avisosDeNotas,
  type AvisoMesa,
  type StatusMesaSalao,
} from "@/lib/tipe/pdv/comanda";
import { beep, unlockSound } from "@/lib/tipe/beep";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusInfo: Record<StatusMesaSalao, { label: string; cls: string }> = {
  livre: { label: "Livre", cls: "border-dashed border-border bg-card text-muted-foreground" },
  ocupada: { label: "Ocupada", cls: "border-primary bg-primary/10 text-foreground" },
  pagando: { label: "Pagando", cls: "border-primary bg-accent/30 text-foreground" },
  aguardando: { label: "Confirmar", cls: "border-highlight bg-highlight/15 text-foreground" },
  fechada: { label: "Encerrada", cls: "border-border bg-muted text-muted-foreground" },
};

/** Atendimento do garçom pelo celular: salão, comanda da mesa e lançamento pelo cardápio. */
export function GarcomAtender() {
  const fetchPos = useServerFn(getWaiterPos);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["waiter-pos"],
    queryFn: () => fetchPos(),
    refetchInterval: 15000,
  });
  const [mesaSel, setMesaSel] = useState<string | null>(null);
  const orderAccess = useOrderAccess(q.data?.restaurantSlug);
  const [lancarMesa, setLancarMesa] = useState<string | null>(null);

  // Tempo real: um pagamento ou item novo atualiza o salão na hora.
  useEffect(() => {
    const inv = () => qc.invalidateQueries({ queryKey: ["waiter-pos"] });
    const ch = supabase
      .channel("garcom-pos")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bill_items" }, inv)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_payment_requests" },
        inv,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  // Avisos que chegam sozinhos (mesa quitada, pagamento parcial, pagamento no local),
  // comparando cada leitura do salão com a anterior.
  const anterior = useRef<WaiterTable[] | null>(null);
  const notasConhecidas = useRef<Set<string> | null>(null);
  const vistos = useRef(new Set<string>());
  const [avisos, setAvisos] = useState<(AvisoMesa & { em: Date })[]>([]);
  const [som, setSom] = useState(false);
  useEffect(() => {
    const atual = q.data?.tables;
    if (!atual) return;
    const notas = q.data?.notasBaixas ?? [];
    const novos = [
      ...(anterior.current ? avisosDeMudanca(anterior.current, atual) : []),
      ...avisosDeNotas(notasConhecidas.current, notas),
    ].filter((a) => !vistos.current.has(a.id));
    anterior.current = atual;
    notasConhecidas.current = new Set([
      ...(notasConhecidas.current ?? []),
      ...notas.map((n) => n.id),
    ]);
    if (!novos.length) return;
    for (const a of novos) {
      vistos.current.add(a.id);
      (a.tipo === "confirmar" || a.tipo === "nota" ? toast.warning : toast.success)(a.titulo, {
        description: a.texto,
      });
    }
    setAvisos((lista) =>
      [...novos.map((a) => ({ ...a, em: new Date() })).reverse(), ...lista].slice(0, 6),
    );
    if (som) beep(novos.some((a) => a.tipo === "quitada") ? 2 : 1);
    try {
      navigator.vibrate?.(novos.some((a) => a.tipo === "quitada") ? [80, 60, 80] : 60);
    } catch {
      /* opcional */
    }
  }, [q.data, som]);

  if (q.isLoading) return <p className="text-muted-foreground">Carregando o salão…</p>;
  if (q.error || !q.data)
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm">
        {(q.error as Error)?.message ?? "Não foi possível carregar o salão"}
      </p>
    );
  const pos = q.data;
  const mesa = pos.tables.find((m) => m.number === mesaSel);
  const orderAtivo = !!orderAccess.data?.orderActive;
  const orderAberta = new Set((orderAccess.data?.open ?? []).map((o) => o.table));
  const ativas = pos.tables.filter((m) => m.active);
  const minhas = ativas.filter((m) => m.minhaMesa && m.status !== "livre").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          {(["ocupada", "pagando", "aguardando"] as StatusMesaSalao[]).map((s) => (
            <span key={s} className={`rounded-full border px-2 py-0.5 ${statusInfo[s].cls}`}>
              {statusInfo[s].label}: {ativas.filter((m) => m.status === s).length}
            </span>
          ))}
          {minhas > 0 && (
            <span className="rounded-full border border-primary bg-primary/10 px-2 py-0.5">
              Minhas: {minhas}
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Atualizar"
          onClick={() => qc.invalidateQueries({ queryKey: ["waiter-pos"] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <section
        aria-labelledby="avisos-title"
        className="rounded-[1.25rem] border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="avisos-title" className="text-[0.95rem] font-medium">
            Avisos das suas mesas
          </h2>
          <Button
            size="sm"
            variant={som ? "default" : "outline"}
            aria-pressed={som}
            onClick={() => {
              if (!som && !unlockSound()) {
                toast.error("Este navegador não permite som");
                return;
              }
              setSom(!som);
              if (!som) beep(1);
            }}
          >
            {som ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {som ? "Som ligado" : "Ligar som"}
          </Button>
        </div>
        {avisos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Quando uma mesa pagar ou der nota baixa, o aviso aparece aqui e no topo da tela, sem
            precisar abrir nada.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border" aria-live="polite">
            {avisos.map((a) => {
              const Icone =
                a.tipo === "quitada"
                  ? CircleCheck
                  : a.tipo === "confirmar"
                    ? Clock3
                    : a.tipo === "nota"
                      ? Star
                      : HandCoins;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setMesaSel(a.mesa)}
                    className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${a.tipo === "quitada" ? "bg-brand-soft text-brand-strong" : a.tipo === "confirmar" || a.tipo === "nota" ? "bg-highlight/15 text-foreground" : "bg-muted text-foreground"}`}
                    >
                      <Icone className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{a.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{a.texto}</span>
                    </span>
                    <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {a.em.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ativas.map((m) => {
          const pct = m.total > 0 ? Math.min(100, Math.round((m.pago / m.total) * 100)) : 0;
          const temItens = m.status !== "livre";
          return (
            <button
              key={m.number}
              type="button"
              onClick={() => (temItens || orderAtivo ? setMesaSel(m.number) : setLancarMesa(m.number))}
              className={`flex min-h-[120px] flex-col rounded-2xl border-2 p-3 text-left transition active:scale-[.98] ${statusInfo[m.status].cls}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-display text-xl font-bold leading-none">Mesa {m.number}</span>
                {m.minhaMesa && temItens && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    minha
                  </span>
                )}
              </div>
              {temItens ? (
                <div className="mt-auto space-y-1 pt-2">
                  <div className="text-base font-bold tabular-nums">{brl(m.total)}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {statusInfo[m.status].label}
                    {m.pago > 0 ? ` · pago ${brl(m.pago)}` : ""}
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-2 text-xs">
                  {orderAberta.has(m.number) ? "Pedidos pelo celular liberados" : orderAtivo ? "Toque para atender" : "Toque para lançar"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Comanda da mesa */}
      <Dialog open={!!mesa} onOpenChange={(o) => !o && setMesaSel(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {mesa && (
            <ComandaMesa
              mesa={mesa}
              slug={pos.restaurantSlug}
              onLancar={() => {
                setLancarMesa(mesa.number);
                setMesaSel(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lançar pedido */}
      {lancarMesa && (
        <LancarPedido
          pos={pos}
          mesa={lancarMesa}
          onClose={() => setLancarMesa(null)}
          onDone={() => {
            setLancarMesa(null);
            qc.invalidateQueries({ queryKey: ["waiter-pos"] });
            qc.invalidateQueries({ queryKey: ["waiter"] });
          }}
        />
      )}
    </div>
  );
}

function ComandaMesa({ mesa, slug, onLancar }: { mesa: WaiterTable; slug: string; onLancar: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Mesa {mesa.number}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <LiberarPedidosMesa slug={slug} table={mesa.number} />
        <div className="rounded-2xl bg-muted/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total da conta</span>
            <span className="font-display text-2xl font-bold">{brl(mesa.total)}</span>
          </div>
          {mesa.pago > 0 && (
            <div className="text-xs text-muted-foreground">
              Pago pelos clientes: {brl(mesa.pago)} · falta {brl(mesa.disponivel)}
            </div>
          )}
          {mesa.status === "aguardando" && (
            <div className="mt-1 text-xs font-semibold text-highlight">
              Há pagamento no local aguardando o caixa confirmar.
            </div>
          )}
        </div>
        {mesa.itens.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {mesa.itens.map((i) => (
              <li key={i.code} className="flex justify-between gap-2 p-3 text-sm">
                <span>
                  <b>{i.qty}×</b> {i.name}
                </span>
                <span className="font-semibold tabular-nums">{brl(i.unitPrice * i.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        <Button className="w-full" size="lg" onClick={onLancar}>
          <Plus className="mr-1 h-5 w-5" />
          Lançar mais itens
        </Button>
      </div>
    </>
  );
}

function LancarPedido({
  pos,
  mesa,
  onClose,
  onDone,
}: {
  pos: WaiterPos;
  mesa: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const launch = useServerFn(waiterLaunchOrder);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string>("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [obsAberta, setObsAberta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const precoDe = useMemo(() => {
    const map = new Map(pos.items.map((i) => [i.code, i.price]));
    return (c: string) => map.get(c) ?? 0;
  }, [pos.items]);

  const itens = pos.items.filter(
    (i) =>
      (busca || !cat || i.categoryId === cat) &&
      (!busca ||
        i.name.toLowerCase().includes(busca.toLowerCase()) ||
        i.code.toLowerCase() === busca.toLowerCase()),
  );
  const linhas = carrinhoParaPedido(carrinho, obs);
  const total = totalCarrinho(linhas, precoDe);
  const qtdTotal = linhas.reduce((s, l) => s + l.qty, 0);
  const add = (code: string, d: number) =>
    setCarrinho((c) => ({ ...c, [code]: Math.max(0, Math.min(99, (c[code] ?? 0) + d)) }));

  async function enviar() {
    if (!linhas.length) return;
    setEnviando(true);
    try {
      await launch({ data: { table: mesa, items: linhas } });
      toast.success(`Pedido enviado para a cozinha · Mesa ${mesa}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const topItems =
    !busca && !cat
      ? pos.topItems.map((c) => pos.items.find((i) => i.code === c)).filter(Boolean)
      : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button size="icon" variant="ghost" aria-label="Voltar" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="font-display text-lg font-bold leading-none">Mesa {mesa}</div>
          <div className="text-xs text-muted-foreground">
            {pos.waiter.name.split(" ")[0]} · novo pedido
          </div>
        </div>
      </header>

      <div className="border-b border-border p-3">
        <label className="flex items-center gap-2 rounded-xl border border-input bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar item</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item ou código (ex.: P04)"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <Chip on={!cat} onClick={() => setCat("")}>
            Todos
          </Chip>
          {pos.categories.map((c) => (
            <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-40">
        {topItems.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-primary">Mais vendidos</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topItems.map((i) => (
                <ItemCard
                  key={`top-${i!.code}`}
                  nome={i!.name}
                  code={i!.code}
                  preco={i!.price}
                  qtd={carrinho[i!.code] ?? 0}
                  onAdd={() => add(i!.code, 1)}
                  onSub={() => add(i!.code, -1)}
                />
              ))}
            </div>
          </section>
        )}
        {pos.categories.map((c) => {
          const lista = itens.filter((i) => i.categoryId === c.id);
          if (!lista.length) return null;
          return (
            <section key={c.id} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{c.name}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lista.map((i) => (
                  <div key={i.id}>
                    <ItemCard
                      nome={i.name}
                      code={i.code}
                      preco={i.price}
                      qtd={carrinho[i.code] ?? 0}
                      onAdd={() => add(i.code, 1)}
                      onSub={() => add(i.code, -1)}
                      onObs={() => setObsAberta(obsAberta === i.code ? null : i.code)}
                      obsAtiva={!!obs[i.code]?.trim()}
                    />
                    {obsAberta === i.code && (
                      <Input
                        autoFocus
                        className="mt-1 h-10 text-sm"
                        maxLength={140}
                        placeholder="Observação (ex.: sem cebola)"
                        value={obs[i.code] ?? ""}
                        onChange={(e) => setObs({ ...obs, [i.code]: e.target.value })}
                        onBlur={() => setObsAberta(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {itens.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card p-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,.4)]">
        <Button
          className="h-14 w-full text-base"
          size="lg"
          disabled={!linhas.length || enviando}
          onClick={enviar}
        >
          {enviando ? (
            "Enviando…"
          ) : linhas.length ? (
            <>
              <Check className="mr-2 h-5 w-5" />
              Enviar {qtdTotal} {qtdTotal === 1 ? "item" : "itens"} · {brl(total)}
            </>
          ) : (
            <>
              <Utensils className="mr-2 h-5 w-5" />
              Toque nos itens do cardápio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"}`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  nome,
  code,
  preco,
  qtd,
  onAdd,
  onSub,
  onObs,
  obsAtiva,
}: {
  nome: string;
  code: string;
  preco: number;
  qtd: number;
  onAdd: () => void;
  onSub: () => void;
  onObs?: () => void;
  obsAtiva?: boolean;
}) {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border bg-card p-3 ${qtd > 0 ? "border-primary" : "border-border"}`}
    >
      <button type="button" onClick={onAdd} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1 text-sm font-semibold">
          <span className="text-[11px] text-muted-foreground">{code}</span>
          {nome}
        </div>
        <div className="text-sm font-bold">{brl(preco)}</div>
      </button>
      {onObs && (
        <button
          type="button"
          onClick={onObs}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${obsAtiva ? "bg-highlight/20 text-foreground" : "text-muted-foreground"}`}
        >
          obs
        </button>
      )}
      {qtd > 0 ? (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label="Menos um"
            onClick={onSub}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-6 text-center font-bold tabular-nums">{qtd}</span>
          <Button size="icon" className="h-9 w-9" aria-label="Mais um" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label={`Adicionar ${nome}`}
          onClick={onAdd}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
