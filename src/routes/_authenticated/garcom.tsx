import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarClock, HandCoins, KeyRound, LogOut, ReceiptText, Utensils, Wallet } from "lucide-react";
import { EmptyState, StatCard, StatusBadge, type Tone } from "@/components/tipe/ds";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AreaShell } from "@/components/tipe/AreaShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelWithdrawal, getWaiterDashboard, requestWithdrawal, saveWaiterPix } from "@/lib/tipe/waiter.functions";
import { GarcomAtender } from "@/components/tipe/GarcomAtender";

export const Route = createFileRoute("/_authenticated/garcom")({
  head: () => ({
    meta: [
      { title: "Área do garçom — TIPE" },
      { name: "description", content: "Acompanhe suas gorjetas extras, vendas do dia e saques quinzenais por Pix." },
      { property: "og:title", content: "Área do garçom — TIPE" },
      { property: "og:description", content: "Gorjetas extras, vendas e saques do garçom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaGarcom,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string) => new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
const STATUS: Record<string, string> = { requested: "Aguardando repasse", paid: "Pago", rejected: "Recusado", cancelled: "Cancelado" };
const STATUS_TONE: Record<string, Tone> = { requested: "warning", paid: "success", rejected: "error", cancelled: "neutral" };
const KEY: Record<string, string> = { cpf: "CPF", email: "E-mail", phone: "Telefone", random: "Aleatória" };

function proximoPagamento() {
  const d = new Date();
  return d.getDate() < 16 ? new Date(d.getFullYear(), d.getMonth(), 16) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function AreaGarcom() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getWaiterDashboard);
  const pedir = useServerFn(requestWithdrawal);
  const cancelar = useServerFn(cancelWithdrawal);
  const q = useQuery({ queryKey: ["waiter"], queryFn: () => fetchDash(), refetchInterval: 30000 });
  const [aba, setAba] = useState<"atender" | "inicio" | "saque">("atender");
  const [busy, setBusy] = useState(false);

  const serie = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d; });
    return dias.map((d) => ({
      dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: +(q.data?.tips ?? []).filter((t) => new Date(t.at).toDateString() === d.toDateString()).reduce((s, t) => s + t.amount, 0).toFixed(2),
    }));
  }, [q.data]);

  async function sair() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/entrar", replace: true });
  }

  const d = q.data;
  return (
    <AreaShell wide={false} eyebrow="Área do garçom" title={d ? `Olá, ${d.waiter.name.split(" ")[0]}!` : "Área do garçom"} subtitle={d ? `${d.waiter.restaurant} · código ${d.waiter.code}` : undefined}
      actions={<Button size="sm" variant="ghost" onClick={sair} className="text-muted-foreground"><LogOut className="h-4 w-4" />Sair</Button>}>
      <div className="space-y-4">
        {q.isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando">
            <div className="h-40 animate-pulse rounded-3xl bg-surface motion-reduce:animate-none" />
            <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" />)}</div>
          </div>
        )}
        {q.error && <EmptyState icon={Wallet} title="Não foi possível carregar sua área" text={(q.error as Error).message} />}
        {d && (
          <>
            <div role="tablist" aria-label="Área do garçom" className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1 shadow-xs">
              {([["atender", "Atender"], ["inicio", "Resumo"], ["saque", "Saques e Pix"]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={cn("h-10 rounded-full text-sm font-semibold transition-colors", aba === k ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground")}>{l}</button>
              ))}
            </div>

            {aba === "atender" && <GarcomAtender />}

            {aba !== "atender" && (
              <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lift">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
                <p className="relative text-sm text-white/65">Disponível para saque</p>
                <p className="money relative mt-1 font-display text-[2.6rem] font-semibold leading-none tracking-heading">{brl(d.balance.available)}</p>
                <div className="relative mt-5 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-xs leading-5 text-white/65">Nesta quinzena: <span className="money font-semibold text-white">{brl(d.balance.currentCycle)}</span><br />Próximo repasse: {proximoPagamento().toLocaleDateString("pt-BR")}</p>
                  {aba === "inicio" && <Button size="sm" onClick={() => setAba("saque")} className="bg-brand text-ink hover:bg-brand/90">Saques e Pix <ArrowRight /></Button>}
                </div>
              </section>
            )}

            {aba === "inicio" && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Kpi icon={HandCoins} label="Gorjetas hoje" value={brl(d.today.tips)} sub={`${d.today.tipsCount} gorjeta(s)`} />
                  <Kpi icon={Utensils} label="Vendas hoje" value={brl(d.today.sales)} sub="pedidos lançados" />
                  <Kpi icon={ReceiptText} label="Mesas hoje" value={String(d.today.tables)} sub="atendidas" />
                  <Kpi icon={Wallet} label="Já recebido" value={brl(d.balance.withdrawn)} sub="em saques pagos" />
                </div>
                <section className="surface-card p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-display font-semibold">Gorjetas extras</h2>
                    <span className="text-xs text-muted-foreground">últimos 14 dias</span>
                  </div>
                  <div className="mt-4 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serie} margin={{ top: 4, right: 0, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
                        <Tooltip cursor={{ fill: "var(--background-muted)" }} formatter={(v: number) => brl(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="valor" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="surface-card p-5">
                  <h2 className="font-display font-semibold">Últimas gorjetas</h2>
                  {d.tips.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma gorjeta extra nos últimos 30 dias. Quando um cliente agradecer pelo TIPE, o valor aparece aqui.</p> : (
                    <ul className="mt-3 divide-y divide-border text-sm">
                      {d.tips.slice(0, 15).map((t, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-strong"><HandCoins className="h-4 w-4" /></span>
                            <span><span className="block font-medium">Mesa {t.table}</span><span className="block text-xs text-muted-foreground">{new Date(t.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></span>
                          </span>
                          <span className="money font-semibold text-brand-strong">+ {brl(t.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Valores já descontada a parte da TIPE.</p>
                </section>
              </>
            )}

            {aba === "saque" && (
              <>
                <section className="surface-card p-5">
                  <h2 className="flex items-center gap-2 font-display font-semibold"><CalendarClock className="h-5 w-5 text-brand-strong" />Como funciona</h2>
                  <ol className="mt-4 space-y-3 text-sm">
                    {[
                      "As gorjetas são somadas por quinzena: do dia 1 ao 15 e do dia 16 ao fim do mês.",
                      "Você pode pedir o saque a qualquer momento. O pedido só fica registrado.",
                      "O Pix é feito pela TIPE no próximo dia de repasse (dia 1 ou 16). Nenhum saque é pago na hora.",
                      "Um pedido de saque por vez.",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background-muted text-xs font-semibold">{i + 1}</span><span className="pt-0.5 text-muted-foreground">{t}</span></li>
                    ))}
                  </ol>
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-background-muted px-4 py-3 text-sm"><span>Saque mínimo</span><span className="money font-semibold">R$ 10,00</span></div>
                  {d.balance.available < 10 && <p className="mt-2 text-xs text-muted-foreground">Seu saldo disponível ainda não chegou ao mínimo para saque.</p>}
                  <Button variant="ink" className="mt-4 h-12 w-full" disabled={busy || d.balance.available < 10 || (!d.pix?.keyMasked && !d.pix?.pendingKeyMasked) || d.withdrawals.some((w) => w.status === "requested")} onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await pedir();
                      toast.success(r.blockedUntil ? `Pedido registrado. Bloqueado até ${new Date(r.blockedUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} pela verificação da chave Pix.` : `Pedido registrado. Aguardando repasse do dia ${r.scheduledFor ? data(r.scheduledFor) : ""}.`);
                      qc.invalidateQueries({ queryKey: ["waiter"] });
                    }
                    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
                  }}>{d.pix ? `Solicitar saque de ${brl(d.balance.available)}` : "Cadastre sua chave Pix para sacar"}</Button>
                </section>
                <ChavePix atual={d.pix} />
                <section className="surface-card p-5">
                  <h2 className="font-display font-semibold">Histórico de saques</h2>
                  {d.withdrawals.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhum saque ainda.</p> : (
                    <ul className="mt-3 divide-y divide-border text-sm">
                      {d.withdrawals.map((w) => (
                        <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                          <span><span className="money font-semibold">{brl(w.amount)}</span><span className="block text-xs text-muted-foreground">{w.status === "paid" && w.resolved_at ? `Pago em ${new Date(w.resolved_at).toLocaleDateString("pt-BR")}` : w.status === "requested" ? (w.blocked_until && new Date(w.blocked_until).getTime() > Date.now() ? `Bloqueado até ${new Date(w.blocked_until).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, depois aguarda o repasse de ${data(w.scheduled_for)}` : `Aguardando repasse do dia ${data(w.scheduled_for)}`) : ""}{w.note ? ` · ${w.note}` : ""}</span></span>
                          <span className="flex items-center gap-3">
                            {w.status === "requested" && <button type="button" className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={async () => { try { await cancelar({ data: { id: w.id } }); toast.success("Pedido cancelado"); qc.invalidateQueries({ queryKey: ["waiter"] }); } catch (e) { toast.error((e as Error).message); } }}>Cancelar</button>}
                            <StatusBadge tone={STATUS_TONE[w.status] ?? "neutral"}>{STATUS[w.status]}</StatusBadge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </AreaShell>
  );
}

function Kpi({ icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub: string }) {
  return <StatCard icon={icon} label={label} value={value} hint={sub} className="min-h-[120px]" />;
}

function ChavePix({ atual }: { atual: { holderName: string; keyType: string; keyMasked: string | null; pendingKeyMasked: string | null; pendingUntil: string | null } | null }) {
  const save = useServerFn(saveWaiterPix);
  const qc = useQueryClient();
  const [edit, setEdit] = useState(!atual);
  const [f, setF] = useState({ holderName: "", holderDocument: "", keyType: "cpf" as "cpf" | "email" | "phone" | "random", key: "" });
  if (!edit && atual) return (
    <section className="surface-card p-5 text-sm">
      <h2 className="flex items-center gap-2 font-display font-semibold"><KeyRound className="h-4 w-4 text-brand-strong" />Sua chave Pix</h2>
      <p className="mt-3 font-medium">{atual.holderName}</p>
      {atual.keyMasked && <p className="text-muted-foreground">{KEY[atual.keyType]}: {atual.keyMasked}</p>}
      {atual.pendingKeyMasked && atual.pendingUntil && <p className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-xs font-medium">Nova chave {atual.pendingKeyMasked} em verificação até {new Date(atual.pendingUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Saques pausados até lá, a menos que o restaurante aprove antes.</p>}
      <Button variant="outline" size="sm" className="mt-4" onClick={() => setEdit(true)}>Alterar chave</Button>
    </section>
  );
  return (
    <form className="surface-card space-y-4 p-5" onSubmit={async (e) => {
      e.preventDefault();
      try { await save({ data: f }); toast.success("Chave Pix salva"); setEdit(false); qc.invalidateQueries({ queryKey: ["waiter"] }); }
      catch (err) { const m = (err as Error).message; toast.error(m.startsWith("[") ? "Confira os dados informados" : m); }
    }}>
      <h2 className="flex items-center gap-2 font-display font-semibold"><KeyRound className="h-4 w-4 text-brand-strong" />Dados para receber o Pix</h2>
      <label className="block text-sm font-medium">Nome completo<Input required className="mt-1" value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} /></label>
      <label className="block text-sm font-medium">CPF<Input required inputMode="numeric" className="mt-1" value={f.holderDocument} onChange={(e) => setF({ ...f, holderDocument: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></label>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <label className="block text-sm font-medium">Tipo
          <select className="mt-1 h-10 rounded-xl border border-input bg-card px-3 text-sm shadow-xs" value={f.keyType} onChange={(e) => setF({ ...f, keyType: e.target.value as never, key: "" })}>
            <option value="cpf">CPF</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Chave Pix<Input required className="mt-1" value={f.key} onChange={(e) => setF({ ...f, key: f.keyType === "cpf" || f.keyType === "phone" ? e.target.value.replace(/[^\d+]/g, "").slice(0, 14) : e.target.value })} /></label>
      </div>
      <p className="text-xs text-muted-foreground">A chave precisa estar no seu nome. Os dados só são usados para o pagamento das suas gorjetas.</p>
      <div className="flex gap-2"><Button type="submit" variant="ink">Salvar chave</Button>{atual && <Button type="button" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>}</div>
    </form>
  );
}
