import { Carregando } from "@/components/tipe/Carregando";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Copy, Printer, ExternalLink, Maximize2, MonitorPlay, RefreshCw, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOps, type OpsData } from "@/components/tipe/AdminSections";
import { bumpOrder, getDisplayToken } from "@/lib/tipe/orders.functions";
import { beep, unlockSound } from "@/lib/tipe/beep";
import { htmlTicket, imprimirHtml } from "@/lib/tipe/imprimir";

// KDS por pedido, como no Colibri: cada pedido vira um ticket com cronômetro
// que muda de cor (verde até 10 min, laranja até 20, vermelho depois).

type Setor = "all" | "kitchen" | "bar";
type Etapa = "received" | "preparing" | "ready";
type KdsItem = OpsData["kds"][number];
type Ticket = {
  orderId: string;
  etapa: Etapa;
  titulo: string;
  subtitulo: string | null;
  canal: string;
  desde: string;
  itens: KdsItem[];
};

const ordem: Record<Etapa, number> = { received: 0, preparing: 1, ready: 2 };
const colunas: [Etapa, string][] = [["received", "Novos"], ["preparing", "Em preparo"], ["ready", "Prontos"]];
const proximo: Record<Etapa, { to: "preparing" | "ready" | "delivered"; label: string }> = {
  received: { to: "preparing", label: "Começar preparo" },
  preparing: { to: "ready", label: "Pronto" },
  ready: { to: "delivered", label: "Entregue" },
};
const anterior: Partial<Record<Etapa, "received" | "preparing">> = { preparing: "received", ready: "preparing" };

const AMARELO_MIN = 10;
const VERMELHO_MIN = 20;

function minutos(desde: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));
}
function corTempo(min: number) {
  if (min >= VERMELHO_MIN) return "bg-destructive text-destructive-foreground";
  if (min >= AMARELO_MIN) return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

/** Agrupa itens em tickets por pedido; a etapa do ticket é a do item mais atrasado. */
export function montarTickets(itens: KdsItem[], setor: Setor): Ticket[] {
  const porPedido = new Map<string, KdsItem[]>();
  for (const i of itens) {
    if (setor !== "all" && i.sector !== setor) continue;
    const lista = porPedido.get(i.order_id) ?? [];
    lista.push(i);
    porPedido.set(i.order_id, lista);
  }
  const out: Ticket[] = [];
  for (const [orderId, lista] of porPedido) {
    const etapa = lista.reduce<Etapa>((m, i) => (ordem[i.status] < ordem[m] ? i.status : m), "ready");
    const p = lista[0]!;
    const semMesa = p.channel !== "mesa";
    out.push({
      orderId, etapa, itens: lista, canal: p.channel, desde: p.order_at,
      titulo: semMesa ? `Senha ${p.ticket ?? "?"}` : `Mesa ${p.table ?? "?"}`,
      subtitulo: semMesa ? p.customer ?? "Balcão" : null,
    });
  }
  return out.sort((a, b) => a.desde.localeCompare(b.desde));
}

function useAgora(intervaloMs = 15000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}

export function Cozinha({ slug, podePainel = false, telaCheia = false }: { slug: string; podePainel?: boolean; telaCheia?: boolean }) {
  const ops = useOps(slug);
  const qc = useQueryClient();
  const bump = useServerFn(bumpOrder);
  const rid = ops.data?.restaurant.id;

  // Tempo real: qualquer item novo ou mudança de status atualiza a tela na hora.
  useEffect(() => {
    if (!rid) return;
    const inv = () => qc.invalidateQueries({ queryKey: ["ops", slug] });
    const ch = supabase.channel(`kds-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pdv_order_items", filter: `restaurant_id=eq.${rid}` }, inv)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rid, slug, qc]);

  return (
    <QuadroKds
      itens={ops.data?.kds ?? []}
      carregando={ops.isLoading}
      onMover={(v) => bump({ data: v })}
      onAtualizar={() => qc.invalidateQueries({ queryKey: ["ops", slug] })}
      telaCheia={telaCheia}
      restaurante={ops.data?.restaurant.name ?? ""}
      tela={telaCheia ? undefined : { slug, podePainel }}
    />
  );
}

/**
 * Quadro de tickets, sem saber de onde vêm os dados. O painel usa a sessão da equipe;
 * a estação da cozinha e do bar usa o link com token (setorFixo trava o setor da tela).
 */
export function QuadroKds({
  itens, carregando, onMover, onAtualizar, telaCheia = false, setorFixo, tela, restaurante = "",
}: {
  restaurante?: string;
  itens: KdsItem[];
  carregando: boolean;
  onMover: (v: { orderId: string; status: "received" | "preparing" | "ready" | "delivered"; sector?: "kitchen" | "bar" }) => Promise<unknown>;
  onAtualizar: () => void;
  telaCheia?: boolean;
  setorFixo?: Setor | undefined;
  tela?: { slug: string; podePainel: boolean } | undefined;
}) {
  const slug = tela?.slug ?? "";
  const imprimir = (t: Ticket) =>
    imprimirHtml(
      htmlTicket({
        restaurante, titulo: t.titulo, subtitulo: t.subtitulo,
        setor: setor === "bar" ? "Bar" : setor === "kitchen" ? "Cozinha" : "Cozinha e bar",
        hora: new Date(t.desde),
        itens: t.itens.map((i) => ({ qty: i.quantity, nome: i.item_name, obs: i.notes })),
      }),
      `Ticket ${t.titulo}`,
    );
  const podePainel = tela?.podePainel ?? false;
  const [setorEscolhido, setSetor] = useState<Setor>("all");
  const setor: Setor = setorFixo ?? setorEscolhido;
  const [som, setSom] = useState(false);
  // Impressão automática de cada pedido novo. O navegador abre a janela de impressão a cada ticket;
  // para imprimir direto, abra o Chrome da estação com --kiosk-printing.
  const [autoImprimir, setAutoImprimir] = useState(false);
  const agora = useAgora();

  const tickets = useMemo(() => montarTickets(itens, setor), [itens, setor]);

  // Bipa quando chega pedido novo (ignora a primeira carga da tela).
  const conhecidos = useRef<Set<string> | null>(null);
  useEffect(() => {
    const novos = tickets.filter((t) => t.etapa === "received").map((t) => t.orderId);
    const chegou = conhecidos.current ? novos.filter((id) => !conhecidos.current!.has(id)) : [];
    if (chegou.length > 0 && som) beep(2, "pedido");
    if (chegou.length > 0 && autoImprimir) for (const id of chegou) { const t = tickets.find((x) => x.orderId === id); if (t) imprimir(t); }
    conhecidos.current = new Set([...(conhecidos.current ?? []), ...novos]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, som, autoImprimir]);

  const mover = useMutation({
    mutationFn: (v: { orderId: string; status: "received" | "preparing" | "ready" | "delivered" }) =>
      onMover({ ...v, ...(setor !== "all" ? { sector: setor } : {}) }),
    onSuccess: () => onAtualizar(),
    onError: (e) => toast.error((e as Error).message),
  });

  const atrasados = tickets.filter((t) => t.etapa !== "ready" && minutos(t.desde, agora) >= VERMELHO_MIN).length;

  return (
    <div className={telaCheia ? "flex flex-col gap-3 p-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center gap-2">
        {!setorFixo && ([["all", "Todos"], ["kitchen", "Cozinha"], ["bar", "Bar"]] as const).map(([k, l]) => (
          <Button key={k} size={telaCheia ? "lg" : "sm"} variant={setor === k ? "default" : "outline"} onClick={() => setSetor(k)}>{l}</Button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {atrasados > 0 && <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">{atrasados} atrasado(s)</span>}
          <Button size="sm" variant="outline" onClick={() => { if (!som && !unlockSound()) { toast.error("Este navegador não permite som"); return; } setSom(!som); if (!som) beep(1); }}>
            {som ? <Bell className="mr-1 h-4 w-4" /> : <BellOff className="mr-1 h-4 w-4" />}{som ? "Som ligado" : "Ativar som"}
          </Button>
          <Button size="sm" variant={autoImprimir ? "default" : "outline"} aria-pressed={autoImprimir} title="Imprime cada pedido novo assim que chega" onClick={() => setAutoImprimir((v) => !v)}>
            <Printer className="mr-1 h-4 w-4" />{autoImprimir ? "Imprimindo pedidos" : "Imprimir pedidos novos"}
          </Button>
          <Button size="sm" variant={autoImprimir ? "default" : "outline"} aria-pressed={autoImprimir} title="Imprime cada pedido novo assim que chega" onClick={() => setAutoImprimir((v) => !v)}>
            <Printer className="mr-1 h-4 w-4" />{autoImprimir ? "Imprimindo pedidos" : "Imprimir pedidos novos"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onAtualizar} aria-label="Atualizar"><RefreshCw className="h-4 w-4" /></Button>
          {!telaCheia && tela && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/$restaurante/cozinha" params={{ restaurante: slug }} target="_blank"><Maximize2 className="mr-1 h-4 w-4" />Tela da cozinha</Link>
            </Button>
          )}
        </div>
      </div>

      {carregando && <Carregando tamanho="sm" texto="Carregando" />}
      <div className={`grid flex-1 gap-3 md:grid-cols-3 ${telaCheia ? "items-stretch" : ""}`}>
        {colunas.map(([etapa, label]) => {
          const lista = tickets.filter((t) => t.etapa === etapa);
          return (
            <section key={etapa} className="flex flex-col rounded-2xl bg-muted/50 p-3" aria-label={label}>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>{label}</span><span className="rounded-full bg-card px-2 tabular-nums">{lista.length}</span>
              </h3>
              <div className="space-y-2">
                {lista.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nada aqui.</p>}
                {lista.map((t) => {
                  const min = minutos(t.desde, agora);
                  const ocupado = mover.isPending && mover.variables?.orderId === t.orderId;
                  return (
                    <article key={t.orderId} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                        <div className="min-w-0">
                          <div className={`font-display font-bold leading-tight ${telaCheia ? "text-xl" : "text-base"}`}>{t.titulo}</div>
                          {t.subtitulo && <div className="truncate text-xs text-muted-foreground">{t.subtitulo}</div>}
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums ${etapa === "ready" ? "bg-muted text-muted-foreground" : corTempo(min)}`} title="Tempo desde o pedido">{min} min</span>
                      </header>
                      <ul className={`space-y-1 px-3 py-2 ${telaCheia ? "text-base" : "text-sm"}`}>
                        {t.itens.map((i) => (
                          <li key={i.id}>
                            <span className="font-semibold tabular-nums">{i.quantity}×</span> {i.item_name}
                            {setor === "all" && <span className="ml-1 text-[10px] uppercase text-muted-foreground">{i.sector === "bar" ? "bar" : "cozinha"}</span>}
                            {ordem[i.status] > ordem[t.etapa] && <span className="ml-1 text-[10px] text-success">✓</span>}
                            {i.notes && <div className="mt-0.5 rounded bg-warning/20 px-2 py-0.5 text-xs font-medium">Obs.: {i.notes}</div>}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2 px-3 pb-3">
                        <Button size="sm" variant="ghost" aria-label={`Imprimir ticket ${t.titulo}`} title="Imprimir ticket" onClick={() => imprimir(t)}><Printer className="h-4 w-4" /></Button>
                        {anterior[etapa] && (
                          <Button size="sm" variant="ghost" disabled={ocupado} aria-label="Voltar etapa" onClick={() => mover.mutate({ orderId: t.orderId, status: anterior[etapa]! })}><Undo2 className="h-4 w-4" /></Button>
                        )}
                        <Button size={telaCheia ? "lg" : "sm"} className="flex-1" disabled={ocupado} onClick={() => mover.mutate({ orderId: t.orderId, status: proximo[etapa].to })}>
                          {etapa === "ready" && t.canal !== "mesa" ? "Retirado" : proximo[etapa].label}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {!telaCheia && podePainel && tela && <PainelSenhasConfig slug={slug} />}
    </div>
  );
}

/** Link da TV do painel de senhas: abrir, copiar e trocar o código do dispositivo. */
function PainelSenhasConfig({ slug }: { slug: string }) {
  const getToken = useServerFn(getDisplayToken);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/${slug}/senhas?t=${token}` : "";

  async function carregar(rotate = false) {
    if (rotate && !window.confirm("Gerar um novo link? As TVs que usam o link atual param de mostrar as senhas até receberem o novo.")) return;
    setCarregando(true);
    try { setToken((await getToken({ data: { slug, rotate } })).token); if (rotate) toast.success("Novo link gerado"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setCarregando(false); }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Painel de senhas na TV</h3>
          <p className="text-sm text-muted-foreground">Mostra as senhas do balcão em preparo e prontas para retirada. Abra o link no navegador da TV, uma única vez; ele não pede login.</p>
          {!token ? (
            <Button size="sm" className="mt-3" disabled={carregando} onClick={() => carregar(false)}>Mostrar link da TV</Button>
          ) : (
            <div className="mt-3 space-y-2">
              <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link do painel de senhas" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(url).then(() => toast.success("Link copiado")); }}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
                <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Abrir</a></Button>
                <Button size="sm" variant="ghost" disabled={carregando} onClick={() => carregar(true)}>Gerar novo link</Button>
              </div>
              <p className="text-xs text-muted-foreground">Quem tiver este link vê só os números das senhas e o primeiro nome. Se o link vazar, gere um novo.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
