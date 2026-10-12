import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRightLeft, BarChart3, ChefHat, Check, History, Home, LayoutGrid, Minus, Plug, Plus, Printer, QrCode, RefreshCw,
  CreditCard, Settings, Star, ShoppingCart, UtensilsCrossed, Users, Wallet, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPanelData, inviteStaff, removeStaff, resolvePayment, type StaffRole } from "@/lib/tipe/staff.functions";
import {
  addTable, addTablesBulk, closeTable, waiveServiceFee, getPdvData, launchOrder, saveCategory, saveMenuItem, saveWaiter, updateTable, voidItem,
} from "@/lib/tipe/pdv.functions";
import { transferTable } from "@/lib/tipe/admin.functions";
import { getPdvIntegration, getTopItems, importMenuCsv } from "@/lib/tipe/pdv-integrations.functions";
import { PixGarcons } from "@/components/tipe/PixGarcons";
import { Caixa, Configuracoes, Cozinha, Inicio, Integracoes, Relatorios } from "@/components/tipe/AdminSections";
import { TotemStudio } from "@/components/tipe/TotemStudio";
import { Assinatura } from "@/components/tipe/Assinatura";
import { Recebimentos } from "@/components/tipe/Recebimentos";
import { grantWaiterAccess } from "@/lib/tipe/waiter.functions";
import { Landmark } from "lucide-react";
import { DesempenhoGarcons } from "@/components/tipe/DesempenhoGarcons";
import { OnboardingPdv } from "@/components/tipe/OnboardingPdv";
import { LebreAssistant } from "@/components/tipe/LebreAssistant";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const cargoLabel: Record<StaffRole, string> = { founder: "Fundador", owner: "Dono", cashier: "Caixa / gerente", waiter: "Garçom" };
const metodoLabel: Record<string, string> = { pix: "Pix", card: "Cartão", apple_pay: "Apple Pay", google_pay: "Google Pay", at_establishment: "No estabelecimento" };
const acaoLabel: Record<string, string> = { confirm: "Pagamento confirmado", cancel: "Pagamento cancelado", table_reopened: "Mesa encerrada e liberada" };
const formatPortion = (value: number) => {
  const rounded = Math.round(value * 10000) / 10000;
  const whole = Math.floor(rounded + 0.0001);
  const fraction = rounded - whole;
  const fractionLabel = Math.abs(fraction - 0.5) < 0.0001 ? "metade" : Math.abs(fraction - 1 / 3) < 0.0001 ? "1/3" : Math.abs(fraction - 0.25) < 0.0001 ? "1/4" : fraction > 0.0001 ? `${Math.round(fraction * 100)}%` : "";
  if (!whole) return fractionLabel || "0";
  return fractionLabel ? `${whole} + ${fractionLabel}` : `${whole}×`;
};

type Status = "livre" | "ocupada" | "aguardando" | "encerrada" | "inativa";
const statusInfo: Record<Status, { label: string; cls: string }> = {
  livre: { label: "Livre", cls: "border-border bg-card text-muted-foreground" },
  ocupada: { label: "Ocupada", cls: "border-primary bg-primary/10 text-foreground" },
  aguardando: { label: "Aguardando confirmação", cls: "border-accent bg-accent/20 text-foreground" },
  encerrada: { label: "Encerrada", cls: "border-border bg-muted text-muted-foreground" },
  inativa: { label: "Desativada", cls: "border-dashed border-border bg-background text-muted-foreground opacity-60" },
};

const secoes = [
  { k: "inicio", l: "Início", i: Home },
  { k: "salao", l: "Salão", i: LayoutGrid },
  { k: "pdv", l: "Lançamento TIPE", i: ShoppingCart },
  { k: "cozinha", l: "Cozinha e bar", i: ChefHat },
  { k: "caixa", l: "Caixa", i: Wallet },
  { k: "cardapio", l: "Cardápio", i: UtensilsCrossed, dono: true },
  { k: "qr", l: "Mesas e QR Codes", i: QrCode },
  { k: "equipe", l: "Equipe e garçons", i: Users, dono: true },
  { k: "garcons", l: "Garçons: avaliações", i: Star, dono: true },
  { k: "relatorios", l: "Relatórios", i: BarChart3 },
  { k: "historico", l: "Histórico", i: History },
  { k: "integracoes", l: "Integrações", i: Plug, dono: true },
  { k: "config", l: "Configurações", i: Settings },
  { k: "recebimentos", l: "Recebimentos", i: Landmark, dono: true },
  { k: "assinatura", l: "Assinatura", i: CreditCard, dono: true },
] as const;

export function RestaurantPanel({ slug, myRoles, isFounder }: { slug: string; myRoles: StaffRole[]; isFounder: boolean }) {
  const fetchPanel = useServerFn(getPanelData);
  const fetchPdv = useServerFn(getPdvData);
  const resolve = useServerFn(resolvePayment);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["panel", slug], queryFn: () => fetchPanel({ data: { slug } }), refetchInterval: 15000 });
  const pdv = useQuery({ queryKey: ["pdv", slug], queryFn: () => fetchPdv({ data: { slug } }) });
  const fetchInteg = useServerFn(getPdvIntegration);
  const integ = useQuery({ queryKey: ["pdv-integ", slug], queryFn: () => fetchInteg({ data: { slug } }), refetchInterval: 30000 });
  const [mesaAberta, setMesaAberta] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aba, setAba] = useState("inicio");
  const [mesaPedido, setMesaPedido] = useState<string>("");

  useEffect(() => {
    const inv = () => qc.invalidateQueries({ queryKey: ["panel", slug] });
    const ch = supabase.channel(`painel-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_payment_requests", filter: `restaurant_slug=eq.${slug}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bill_items", filter: `restaurant_slug=eq.${slug}` }, inv)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug, qc]);

  const podeConfirmar = isFounder || myRoles.includes("owner") || myRoles.includes("cashier");
  const podeDono = isFounder || myRoles.includes("owner");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["panel", slug] }); qc.invalidateQueries({ queryKey: ["pdv", slug] }); qc.invalidateQueries({ queryKey: ["ops", slug] }); };

  const mesas = useMemo(() => {
    if (!q.data || !pdv.data) return [];
    return pdv.data.tables.map((t) => {
      const itens = q.data.items.filter((i) => i.table_number === t.number);
      const pend = q.data.payments.filter((p) => p.table_number === t.number && p.status === "pending");
      const total = itens.reduce((s, i) => s + i.unit_price * i.ordered_quantity, 0);
      const pago = itens.reduce((s, i) => s + i.unit_price * i.paid_portion, 0);
      const disponivel = itens.reduce((s, i) => s + (i.ordered_quantity - i.reserved_portion - i.paid_portion), 0);
      const status: Status = !t.active ? "inativa" : itens.length === 0 ? "livre" : pend.length ? "aguardando" : disponivel <= 0 ? "encerrada" : "ocupada";
      const garcom = pdv.data.waiters.find((w) => w.id === t.waiter_id)?.name;
      return { ...t, itens, total, pago, status, garcom };
    });
  }, [q.data, pdv.data]);

  async function agir(id: string, action: "confirm" | "cancel") {
    setOcupado(id);
    try {
      await resolve({ data: { paymentId: id, action } });
      toast.success(action === "confirm" ? "Recebimento confirmado" : "Pagamento cancelado e itens liberados");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(null); }
  }

  if (q.isLoading || pdv.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (q.error || !q.data || pdv.error || !pdv.data) return <p className="text-destructive">{((q.error ?? pdv.error) as Error)?.message ?? "Erro"}</p>;
  const d = q.data;
  if (d.restaurant.onboarding_step === "pos" && podeDono) {
    const nome = d.staff.find((x) => x.roles.includes("owner"))?.display_name?.split(" ")[0] ?? "";
    return <OnboardingPdv slug={slug} nome={nome} onDone={refresh} />;
  }
  const pendentes = d.payments.filter((p) => p.status === "pending");
  const itemNome = (mesa: string, code: string) => d.items.find((i) => i.table_number === mesa && i.item_code === code)?.item_name ?? code;
  const mesaSel = mesas.find((m) => m.number === mesaAberta);
  const abertas = mesas.filter((m) => m.status === "ocupada" || m.status === "aguardando");
  // O Lançamento TIPE fica sempre disponível, inclusive como reserva de uma integração.
  const visiveis = secoes.filter((x) => !("dono" in x) || podeDono);
  const pdvLabel = !integ.data || integ.data.adapter === "lancamento_tipe" ? "Lançamento TIPE" : `Integração: ${integ.data.adapterName}`;
  const syncErro = integ.data && integ.data.adapter !== "lancamento_tipe" && integ.data.status === "error";

  const confirmacoes = (
    <>
      {pendentes.length === 0 && <p className="rounded-2xl border border-border bg-card py-8 text-center text-muted-foreground">Nenhum pagamento aguardando confirmação.</p>}
      <ul className="space-y-3">
        {pendentes.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">Mesa {p.table_number} · {p.customer_name}</div>
                <div className="text-xs text-muted-foreground">{metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}</div>
                {p.establishment_method && <div className="mt-1 text-xs font-semibold text-foreground">{p.establishment_method === "cash" ? `Dinheiro: cliente entregará ${brl(p.cash_received ?? p.amount)}${p.change_due ? ` · Troco ${brl(p.change_due)}` : " · Sem troco"}` : "Maquininha"}</div>}
              </div>
              <div className="font-display text-xl font-bold">{brl(p.amount)}</div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {Object.entries(p.item_quantities).filter(([, n]) => n > 0).map(([c, n]) => `${formatPortion(n)} de ${itemNome(p.table_number, c)}`).join(" · ")}
            </div>
            {podeConfirmar ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={ocupado === p.id} onClick={() => agir(p.id, "confirm")}><Check className="mr-1 h-4 w-4" />Confirmar recebimento</Button>
                <Button size="sm" variant="outline" disabled={ocupado === p.id} onClick={() => agir(p.id, "cancel")}><X className="mr-1 h-4 w-4" />Cancelar</Button>
              </div>
            ) : <p className="mt-2 text-xs text-muted-foreground">Somente caixa, gerente ou dono confirmam.</p>}
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="pb-20 lg:grid lg:grid-cols-[220px_1fr] lg:gap-6 lg:pb-0">
      <nav className="hidden h-fit space-y-1 rounded-3xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-4 lg:block print:hidden">
        {visiveis.map(({ k, l, i: Icon }) => (
          <button key={k} onClick={() => setAba(k)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${aba === k ? "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-glow)]" : "hover:bg-muted"}`}>
            <Icon className="h-4 w-4" />{l}
            {k === "caixa" && pendentes.length > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{pendentes.length}</span>}
          </button>
        ))}
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card p-2 lg:hidden print:hidden">
        {visiveis.map(({ k, l, i: Icon }) => (
          <button key={k} onClick={() => setAba(k)} className={`flex min-w-[72px] flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] ${aba === k ? "bg-primary text-primary-foreground" : ""}`}>
            <Icon className="h-4 w-4" />{l}
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        <div className="relative mb-6 overflow-hidden rounded-3xl p-6 text-secondary-foreground shadow-xl print:hidden" style={{ background: "var(--gradient-brand)" }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
          <p className="relative font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">{visiveis.find((x) => x.k === aba)?.l}</p>
          <div className="relative mt-1 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{d.restaurant.name}</h1>
            <span className="rounded-full bg-secondary-foreground/10 px-3 py-1 text-xs font-semibold">{pdvLabel}</span>
          </div>
        </div>

        {syncErro && (
          <div role="alert" className="mb-4 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm">
            Sincronização com o seu sistema com problema. Os pedidos podem ser lançados pelo Lançamento TIPE enquanto isso.
            <button className="ml-2 font-semibold underline" onClick={() => setAba("pdv")}>Abrir Lançamento TIPE</button>
          </div>
        )}
        {d.pdvAlerts[0] && (
          <div role="alert" className="mb-4 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4 text-sm">
            <strong>Atenção no cancelamento:</strong> {d.pdvAlerts[0].detail}
          </div>
        )}
        {aba === "inicio" && <Inicio slug={slug} mesasAbertas={abertas.length} emAberto={abertas.reduce((s, m) => s + m.total - m.pago, 0)} pendentes={pendentes.length} onGo={setAba} />}

        {aba === "salao" && (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {(["livre", "ocupada", "aguardando", "encerrada"] as Status[]).map((s) => <span key={s} className={`rounded-full border-2 px-2 py-0.5 ${statusInfo[s].cls}`}>{statusInfo[s].label}: {mesas.filter((m) => m.status === s).length}</span>)}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {mesas.map((m) => {
                const temItens = m.itens.length > 0;
                const pct = temItens && m.total > 0 ? Math.min(100, Math.round((m.pago / m.total) * 100)) : 0;
                return (
                  <button key={m.id} onClick={() => setMesaAberta(m.number)} className={`flex min-h-[148px] flex-col rounded-2xl border-2 p-4 text-left transition hover:shadow-md ${statusInfo[m.status].cls}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-xl font-bold leading-tight">Mesa {m.number}</div>
                      <span className="mt-0.5 shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium">{statusInfo[m.status].label}</span>
                    </div>
                    {temItens ? (
                      <div className="mt-auto pt-3">
                        <div className="whitespace-nowrap text-base font-semibold tabular-nums">{brl(m.total)}</div>
                        <div className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">Pago {brl(m.pago)}</div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        {m.garcom && <div className="mt-2 truncate text-xs text-muted-foreground">{m.garcom}</div>}
                      </div>
                    ) : (
                      <div className="mt-auto pt-3 text-xs text-muted-foreground">Sem itens</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {aba === "pdv" && <LancarPedido slug={slug} pdv={pdv.data} mesa={mesaPedido} setMesa={setMesaPedido} onDone={refresh} />}
        {aba === "cozinha" && <Cozinha slug={slug} />}
        {aba === "caixa" && <Caixa slug={slug} podeCaixa={podeConfirmar} confirmacoes={confirmacoes} />}

        {aba === "historico" && (
          <div className="space-y-4">
          {d.pdvAlerts.length > 0 && <ul className="divide-y divide-border rounded-2xl border border-warning/40 bg-warning/10">{d.pdvAlerts.map((a) => <li key={a.id} className="flex justify-between gap-3 p-3 text-sm"><span>{a.detail}</span><span className="shrink-0 text-muted-foreground">{hora(a.created_at)}</span></li>)}</ul>}
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {d.audit.length === 0 && <li className="p-4 text-center text-muted-foreground">Sem registros ainda.</li>}
            {d.audit.map((a) => (
              <li key={a.id} className="flex justify-between p-3 text-sm">
                <span>{acaoLabel[a.action] ?? a.action} · Mesa {a.table_number}</span>
                <span className="text-muted-foreground">{a.amount ? `${brl(a.amount)} · ` : ""}{hora(a.created_at)}</span>
              </li>
            ))}
          </ul>
          </div>
        )}

        {aba === "garcons" && <DesempenhoGarcons slug={slug} />}
        {aba === "qr" && <MesasQr slug={slug} restaurante={d.restaurant.name} tables={pdv.data.tables} podeDono={podeDono} onDone={refresh} />}
        {aba === "cardapio" && podeDono && <Cardapio slug={slug} pdv={pdv.data} onDone={refresh} />}
        {aba === "equipe" && podeDono && (
          <div className="space-y-6"><Garcons slug={slug} pdv={pdv.data} onDone={refresh} /><PixGarcons slug={slug} /><Equipe slug={slug} staff={d.staff} /></div>
        )}
        {aba === "relatorios" && <Relatorios slug={slug} />}
        {aba === "integracoes" && <Integracoes slug={slug} podeDono={podeDono} />}
        {aba === "config" && <Configuracoes slug={slug} podeDono={podeDono} />}
        {aba === "recebimentos" && podeDono && <Recebimentos slug={slug} podeDono={podeDono} />}
        {aba === "assinatura" && podeDono && <Assinatura slug={slug} />}
      </div>

      <Dialog open={!!mesaSel} onOpenChange={(o) => !o && setMesaAberta(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {mesaSel && (
            <MesaDetalhe slug={slug} mesa={mesaSel} outras={mesas.filter((m) => m.active && m.number !== mesaSel.number).map((m) => m.number)}
              payments={d.payments.filter((p) => p.table_number === mesaSel.number)} podeConfirmar={podeConfirmar}
              onLancar={() => { setMesaPedido(mesaSel.number); setMesaAberta(null); setAba("pdv"); }}
              onDone={() => { refresh(); }} onClose={() => setMesaAberta(null)} />
          )}
        </DialogContent>
      </Dialog>
      <LebreAssistant slug={slug} />
    </div>
  );
}

type PdvData = Awaited<ReturnType<typeof getPdvData>>;
type PanelData = Awaited<ReturnType<typeof getPanelData>>;

function MesaDetalhe({ slug, mesa, outras, payments, podeConfirmar, onLancar, onDone, onClose }: {
  slug: string; outras: string[]; podeConfirmar: boolean; onLancar: () => void; onDone: () => void; onClose: () => void;
  mesa: { number: string; status: Status; garcom?: string | undefined; total: number; itens: PanelData["items"] };
  payments: PanelData["payments"];
}) {
  const estornar = useServerFn(voidItem);
  const fechar = useServerFn(closeTable);
  const transferir = useServerFn(transferTable);
  const removerTaxa = useServerFn(waiveServiceFee);
  const [ocupado, setOcupado] = useState(false);
  const [destino, setDestino] = useState("");
  async function run(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true);
    try { await fn(); toast.success(ok); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setOcupado(false); }
  }
  return (
    <>
      <DialogHeader><DialogTitle>Mesa {mesa.number} · {statusInfo[mesa.status].label}</DialogTitle></DialogHeader>
      {mesa.garcom && <p className="text-sm text-muted-foreground">Garçom: {mesa.garcom}</p>}
      {mesa.itens.length === 0 ? <p className="text-muted-foreground">Nenhum pedido nesta mesa.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Item</th><th>Qtd</th><th>Reserv.</th><th>Pago</th><th /></tr></thead>
          <tbody>
            {mesa.itens.map((i) => {
              const livre = i.ordered_quantity - i.reserved_portion - i.paid_portion;
              return (
                <tr key={i.item_code} className="border-t border-border">
                  <td className="py-1">{i.item_name}<div className="text-xs text-muted-foreground">{brl(i.unit_price)}</div></td>
                  <td>{i.ordered_quantity}</td><td>{formatPortion(i.reserved_portion)}</td><td>{formatPortion(i.paid_portion)}</td>
                  <td className="text-right">
                    {podeConfirmar && livre > 0 && (
                      <Button size="sm" variant="ghost" disabled={ocupado} title="Estornar 1 unidade"
                        onClick={() => {
                          const reason = window.prompt(`Motivo do estorno de 1× ${i.item_name}:`);
                          if (!reason || reason.trim().length < 3) { if (reason !== null) toast.error("Informe o motivo (mín. 3 letras)"); return; }
                          void run(() => estornar({ data: { slug, table: mesa.number, code: i.item_code, qty: 1, reason } }), "Item estornado");
                        }}>
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {mesa.itens.length > 0 && <p className="text-right text-sm font-semibold">Total: {brl(mesa.total)} + 10% serviço</p>}
      <h3 className="mt-2 font-semibold">Pagamentos</h3>
      <ul className="space-y-2 text-sm">
        {payments.length === 0 && <li className="text-muted-foreground">Nenhum pagamento ainda.</li>}
        {payments.map((p) => (
          <li key={p.id} className="flex justify-between gap-2 rounded-lg bg-muted p-2">
            <span>{p.customer_name} · {metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}</span>
            <span className="font-semibold">{brl(p.amount)} · {p.status === "pending" ? "Pendente" : p.status === "approved" ? "Confirmado" : "Cancelado"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {mesa.status !== "inativa" && <Button size="sm" onClick={onLancar}><Plus className="mr-1 h-4 w-4" />Lançar pedido</Button>}
        {podeConfirmar && mesa.itens.length > 0 && (
          <Button size="sm" variant="outline" disabled={ocupado} onClick={() => {
            if (!window.confirm(`Fechar a mesa ${mesa.number}? Os pagamentos serão arquivados e a mesa ficará livre para uma nova conta.`)) return;
            void run(() => fechar({ data: { slug, table: mesa.number } }), "Mesa fechada e liberada");
          }}>Fechar e liberar mesa</Button>
        )}
        {podeConfirmar && mesa.itens.length > 0 && (
          <Button size="sm" variant="outline" disabled={ocupado} onClick={() => {
            const reason = window.prompt(`Motivo para remover a taxa de serviço da mesa ${mesa.number}:`);
            if (!reason || reason.trim().length < 3) { if (reason !== null) toast.error("Informe o motivo (mín. 3 letras)"); return; }
            void run(() => removerTaxa({ data: { slug, table: mesa.number, reason } }), "Taxa de serviço removida desta mesa");
          }}>Remover taxa desta mesa</Button>
        )}
        {mesa.itens.length > 0 && payments.length === 0 && mesa.status !== "inativa" && (
          <div className="flex w-full items-center gap-2 border-t border-border pt-3">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <select className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Transferir / juntar com a mesa…</option>
              {outras.map((n) => <option key={n} value={n}>Mesa {n}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={!destino || ocupado} onClick={() => {
              if (!window.confirm(`Mover todos os itens da mesa ${mesa.number} para a mesa ${destino}? Se a mesa ${destino} já tiver itens, as contas serão juntadas.`)) return;
              void run(() => transferir({ data: { slug, from: mesa.number, to: destino } }), `Itens movidos para a mesa ${destino}`).then(onClose);
            }}>Mover</Button>
          </div>
        )}
      </div>
    </>
  );
}

function LancarPedido({ slug, pdv, mesa, setMesa, onDone }: { slug: string; pdv: PdvData; mesa: string; setMesa: (m: string) => void; onDone: () => void }) {
  const launch = useServerFn(launchOrder);
  const fetchTop = useServerFn(getTopItems);
  const top = useQuery({ queryKey: ["top-items", slug], queryFn: () => fetchTop({ data: { slug } }), staleTime: 300000 });
  const [garcom, setGarcom] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [obs, setObs] = useState<Record<string, string>>({});
  const [cat, setCat] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const ativos = pdv.waiters.filter((w) => w.active);
  const mesasAtivas = pdv.tables.filter((t) => t.active);

  useEffect(() => {
    const t = pdv.tables.find((x) => x.number === mesa);
    if (t?.waiter_id) setGarcom(t.waiter_id);
  }, [mesa, pdv.tables]);

  const itens = pdv.items.filter((i) => i.available && (busca || !cat || i.category_id === cat) && (!busca || i.name.toLowerCase().includes(busca.toLowerCase()) || i.code.toLowerCase() === busca.toLowerCase()));
  const linhas = Object.entries(carrinho).filter(([, n]) => n > 0);
  const total = linhas.reduce((s, [c, n]) => s + (pdv.items.find((i) => i.code === c)?.price ?? 0) * n, 0);
  const add = (code: string, delta: number) => setCarrinho((c) => ({ ...c, [code]: Math.max(0, Math.min(99, (c[code] ?? 0) + delta)) }));

  async function enviar() {
    if (!mesa || !garcom || linhas.length === 0) return;
    setEnviando(true);
    try {
      await launch({ data: { slug, table: mesa, waiterId: garcom, items: linhas.map(([code, qty]) => ({ code, qty, ...(obs[code]?.trim() ? { notes: obs[code]!.trim() } : {}) })) } });
      toast.success(`Pedido lançado na mesa ${mesa}`);
      setCarrinho({}); setObs({});
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <Input placeholder="Buscar item ou código (ex.: P01)" value={busca} onChange={(e) => setBusca(e.target.value)} className="mb-3" />
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant={!cat ? "default" : "outline"} onClick={() => setCat("")}>Todos</Button>
          {pdv.categories.map((c) => <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"} onClick={() => setCat(c.id)}>{c.name}</Button>)}
        </div>
        {!busca && !cat && (top.data?.length ?? 0) > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-primary">Mais vendidos</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {top.data!.map((code) => pdv.items.find((i) => i.code === code && i.available)).filter(Boolean).map((i) => (
                <button key={`top-${i!.id}`} onClick={() => add(i!.code, 1)} className="flex items-center justify-between rounded-xl border-2 border-primary/40 bg-card p-3 text-left text-sm hover:border-primary">
                  <span>{i!.name}{carrinho[i!.code] ? <span className="ml-2 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{carrinho[i!.code]}</span> : null}</span>
                  <span className="font-semibold">{brl(i!.price)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {pdv.categories.map((cat) => {
          const lista = itens.filter((i) => i.category_id === cat.id);
          if (!lista.length) return null;
          return (
            <section key={cat.id} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{cat.name}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lista.map((i) => (
                  <button key={i.id} onClick={() => add(i.code, 1)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left text-sm hover:border-primary">
                    <span><span className="mr-2 text-xs text-muted-foreground">{i.code}</span>{i.name}</span>
                    <span className="font-semibold">{brl(i.price)}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4">
        <h3 className="font-semibold">Comanda</h3>
        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={mesa} onChange={(e) => setMesa(e.target.value)}>
          <option value="">Escolha a mesa</option>
          {mesasAtivas.map((t) => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
        </select>
        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={garcom} onChange={(e) => setGarcom(e.target.value)}>
          <option value="">Escolha o garçom</option>
          {ativos.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
        </select>
        {linhas.length === 0 ? <p className="text-sm text-muted-foreground">Toque nos itens do cardápio para adicionar.</p> : (
          <ul className="space-y-2 text-sm">
            {linhas.map(([code, n]) => {
              const it = pdv.items.find((i) => i.code === code);
              return (
                <li key={code} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                  <span className="flex-1">{it?.name}</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => add(code, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center">{n}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => add(code, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  </div>
                  <Input className="h-7 text-xs" placeholder="Observação (ex.: sem cebola)" maxLength={140} value={obs[code] ?? ""} onChange={(e) => setObs({ ...obs, [code]: e.target.value })} />
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{brl(total)}</span></div>
        <Button className="w-full" disabled={!mesa || !garcom || !linhas.length || enviando} onClick={enviar}>Enviar pedido</Button>
      </aside>
    </div>
  );
}

function MesasQr({ slug, restaurante, tables, podeDono, onDone }: { slug: string; restaurante: string; tables: PdvData["tables"]; podeDono: boolean; onDone: () => void }) {
  const add = useServerFn(addTable);
  const upd = useServerFn(updateTable);
  const bulk = useServerFn(addTablesBulk);
  const [nova, setNova] = useState("");
  const [lote, setLote] = useState({ from: "", to: "" });
  const base = typeof window !== "undefined" && !window.location.hostname.includes("lovable") && !window.location.hostname.includes("localhost") ? window.location.origin : "https://tipe.digital";
  const link = (t: PdvData["tables"][number]) => `${base}/${slug}/${t.code}?t=${t.access_token}`;
  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); onDone(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        {podeDono && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nova.trim()) void run(() => add({ data: { slug, number: nova.trim() } }), "Mesa cadastrada").then(() => setNova("")); }}>
            <Input className="w-32" placeholder="Nº da mesa" value={nova} onChange={(e) => setNova(e.target.value)} />
            <Button type="submit" variant="outline">Cadastrar mesa</Button>
          </form>
        )}
        {podeDono && (
          <form className="flex items-center gap-2" onSubmit={(e) => {
            e.preventDefault();
            void run(async () => { const r = await bulk({ data: { slug, from: Number(lote.from), to: Number(lote.to) } }); toast.info(`${r.created} mesa(s) nova(s)`); }, "Mesas cadastradas").then(() => setLote({ from: "", to: "" }));
          }}>
            <span className="text-sm text-muted-foreground">Em lote:</span>
            <Input required type="number" min={1} className="w-20" placeholder="de" value={lote.from} onChange={(e) => setLote({ ...lote, from: e.target.value })} />
            <Input required type="number" min={1} className="w-20" placeholder="até" value={lote.to} onChange={(e) => setLote({ ...lote, to: e.target.value })} />
            <Button type="submit" variant="outline">Criar</Button>
          </form>
        )}
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir QR Codes</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => (
          <div key={t.id} className={`rounded-2xl border border-border bg-card p-4 text-center ${t.active ? "" : "opacity-50 print:hidden"}`}>
            <div className="font-display text-lg font-bold">Mesa {t.number}</div>
            <div className="mx-auto my-3 w-fit rounded-lg bg-background p-2"><QRCodeSVG value={link(t)} size={132} /></div>
            <div className="break-all text-xs text-muted-foreground">{base.replace(/^https?:\/\//, "")}/{slug}/{t.code}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-1 print:hidden">
              <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(link(t)); toast.success("Link copiado"); }}>Copiar link</Button>
              {podeDono && (
                <>
                  <Button size="sm" variant="ghost" title="Gerar novo código (o QR antigo deixa de funcionar)" onClick={() => {
                    if (window.confirm(`Gerar novo QR para a mesa ${t.number}? O QR impresso atual deixará de funcionar.`)) void run(() => upd({ data: { id: t.id, regenerate: true } }), "Novo QR gerado");
                  }}><RefreshCw className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => upd({ data: { id: t.id, active: !t.active } }), t.active ? "Mesa desativada" : "Mesa ativada")}>{t.active ? "Desativar" : "Ativar"}</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <TotemStudio tables={tables} link={link} restaurante={restaurante} />
    </div>
  );
}

function Cardapio({ slug, pdv, onDone }: { slug: string; pdv: PdvData; onDone: () => void }) {
  const saveItem = useServerFn(saveMenuItem);
  const saveCat = useServerFn(saveCategory);
  const importCsv = useServerFn(importMenuCsv);
  async function importar(file: File) {
    const texto = await file.text();
    const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sep = (linhas[0] ?? "").includes(";") ? ";" : ",";
    const rows = linhas.filter((l, i) => !(i === 0 && /categoria/i.test(l))).map((l) => {
      const [category = "", code = "", name = "", price = "0", ativo = "sim"] = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
      return { category, code, name, price: Number(price.replace(/\./g, "").replace(",", ".")) || Number(price) || 0, available: !/^(n|nao|não|0|false|inativo)$/i.test(ativo) };
    });
    await run(async () => { const r = await importCsv({ data: { slug, rows } }); toast.message(`${r.imported} itens importados`); }, "Cardápio importado");
  }
  const vazio = { id: undefined as string | undefined, categoryId: pdv.categories[0]?.id ?? null, code: "", name: "", price: 0, available: true, sector: "kitchen" as "kitchen" | "bar", description: "" };
  const [f, setF] = useState(vazio);
  const [novaCat, setNovaCat] = useState("");
  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); onDone(); return true; } catch (e) { toast.error((e as Error).message); return false; }
  }
  const base = (i: PdvData["items"][number]) => ({ slug, id: i.id, categoryId: i.category_id, code: i.code, name: i.name, price: i.price, available: i.available });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {pdv.categories.map((cat) => (
          <section key={cat.id} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{cat.name}</h3>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {pdv.items.filter((i) => i.category_id === cat.id).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <button className="flex-1 text-left" onClick={() => setF({ id: i.id, categoryId: i.category_id, code: i.code, name: i.name, price: i.price, available: i.available, sector: (i.sector as "kitchen" | "bar") ?? "kitchen", description: i.description ?? "" })}>
                    <span className="mr-2 text-xs text-muted-foreground">{i.code}</span>
                    <span className={i.available ? "" : "line-through opacity-60"}>{i.name}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{i.sector === "bar" ? "Bar" : "Cozinha"}</span>
                    {!i.available && <span className="ml-2 text-[10px] text-destructive">Esgotado</span>}
                  </button>
                  <span className="font-semibold">{brl(i.price)}</span>
                  <Button size="sm" variant="ghost" onClick={() => run(() => saveItem({ data: { ...base(i), available: !i.available } }), i.available ? "Marcado como esgotado" : "Item disponível")}>
                    {i.available ? "Esgotar" : "Ativar"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="space-y-4">
        <form className="space-y-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4" onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => saveItem({ data: { slug, ...f } }), f.id ? "Produto atualizado" : "Produto cadastrado")) setF(vazio);
        }}>
          <h3 className="font-semibold">{f.id ? "Editar produto" : "Novo produto"}</h3>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.categoryId ?? ""} onChange={(e) => setF({ ...f, categoryId: e.target.value || null })}>
            {pdv.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input required placeholder="Código (ex.: P10)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
          <Input required placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Descrição (opcional)" maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input required type="number" step="0.01" min={0} placeholder="Preço" value={f.price || ""} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" variant={f.sector === "kitchen" ? "default" : "outline"} onClick={() => setF({ ...f, sector: "kitchen" })}>Cozinha</Button>
            <Button type="button" size="sm" className="flex-1" variant={f.sector === "bar" ? "default" : "outline"} onClick={() => setF({ ...f, sector: "bar" })}>Bar</Button>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Salvar</Button>
            {f.id && <Button type="button" variant="outline" onClick={() => setF(vazio)}>Novo</Button>}
          </div>
        </form>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <h3 className="font-semibold">Importar planilha CSV</h3>
          <p className="text-xs text-muted-foreground">Colunas: categoria; código; item; preço; ativo (sim/não). Itens com o mesmo código são atualizados.</p>
          <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.currentTarget.value = ""; }} />
        </div>
        <form className="flex gap-2 rounded-2xl border border-border bg-card p-4" onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => saveCat({ data: { slug, name: novaCat } }), "Categoria criada")) setNovaCat("");
        }}>
          <Input required placeholder="Nova categoria" value={novaCat} onChange={(e) => setNovaCat(e.target.value)} />
          <Button type="submit" size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}

function Garcons({ slug, pdv, onDone }: { slug: string; pdv: PdvData; onDone: () => void }) {
  const saveW = useServerFn(saveWaiter);
  const grant = useServerFn(grantWaiterAccess);
  const [acesso, setAcesso] = useState<{ id: string; email: string } | null>(null);
  const [w, setW] = useState({ code: "", name: "" });
  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); onDone(); return true; } catch (e) { toast.error((e as Error).message); return false; }
  }
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-semibold">Garçons</h3>
      <p className="text-xs text-muted-foreground">Garçons aparecem no lançamento de pedidos e na conta do cliente. Libere o acesso para o garçom acompanhar gorjetas e sacar pela área do garçom.</p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {pdv.waiters.map((x) => (
          <li key={x.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-2">
            <span className={x.active ? "" : "line-through opacity-60"}>{x.code} · {x.name}</span>
            <span className="flex items-center">
              {x.active && (x.user_id ? <span className="px-2 text-xs text-primary" title={x.email ?? ""}>Com acesso</span> : <Button size="sm" variant="ghost" onClick={() => setAcesso({ id: x.id, email: "" })}>Dar acesso</Button>)}
              <Button size="sm" variant="ghost" onClick={() => run(() => saveW({ data: { slug, id: x.id, code: x.code, name: x.name, active: !x.active } }), "Garçom atualizado")}>{x.active ? "Desativar" : "Ativar"}</Button>
            </span>
          </li>
        ))}
      </ul>
      {acesso && (
        <form className="flex max-w-md flex-wrap gap-2 rounded-lg bg-muted/50 p-2" onSubmit={async (e) => {
          e.preventDefault();
          if (await run(async () => { const r = await grant({ data: { slug, waiterId: acesso.id, email: acesso.email } }); if (!r.invited) toast.info("Esse e-mail já tinha conta: enviamos um link para o garçom definir a senha."); }, "E-mail enviado: o garçom define a senha pelo link")) setAcesso(null);
        }}>
          <Input required type="email" className="flex-1" placeholder="E-mail do garçom" value={acesso.email} onChange={(e) => setAcesso({ ...acesso, email: e.target.value })} />
          <Button type="submit" size="sm">Enviar convite</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAcesso(null)}>Cancelar</Button>
        </form>
      )}
      <form className="flex max-w-md gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => saveW({ data: { slug, ...w, active: true } }), "Garçom cadastrado")) setW({ code: "", name: "" });
      }}>
        <Input required className="w-20" placeholder="G06" value={w.code} onChange={(e) => setW({ ...w, code: e.target.value })} />
        <Input required placeholder="Nome do garçom" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} />
        <Button type="submit" size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function Equipe({ slug, staff }: { slug: string; staff: { user_id: string; display_name: string; email: string; roles: StaffRole[] }[] }) {
  const invite = useServerFn(inviteStaff);
  const remove = useServerFn(removeStaff);
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", email: "", role: "cashier" as "owner" | "cashier" | "waiter" });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={async (e) => {
        e.preventDefault();
        try { await invite({ data: { slug, ...f } }); toast.success("Pessoa adicionada à equipe"); setF({ ...f, name: "", email: "" }); qc.invalidateQueries({ queryKey: ["panel", slug] }); }
        catch (err) { toast.error((err as Error).message); }
      }}>
        <h2 className="font-semibold">Adicionar pessoa</h2>
        <p className="text-xs text-muted-foreground">A pessoa precisa criar a conta antes neste mesmo endereço, com o mesmo e-mail.</p>
        <Input required placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input required type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })}>
          <option value="cashier">Caixa / gerente</option>
          <option value="waiter">Garçom</option>
          <option value="owner">Dono</option>
        </select>
        <Button type="submit" className="w-full">Adicionar</Button>
      </form>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {staff.length === 0 && <li className="p-4 text-center text-muted-foreground">Nenhuma pessoa na equipe ainda.</li>}
        {staff.map((s) => (
          <li key={s.user_id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div><div className="font-semibold">{s.display_name}</div><div className="text-xs text-muted-foreground">{s.email} · {s.roles.map((r) => cargoLabel[r]).join(", ")}</div></div>
            <Button size="sm" variant="ghost" onClick={async () => {
              try { await remove({ data: { slug, userId: s.user_id } }); toast.success("Removido"); qc.invalidateQueries({ queryKey: ["panel", slug] }); }
              catch (err) { toast.error((err as Error).message); }
            }}>Remover</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
