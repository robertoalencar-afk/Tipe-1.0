import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, HandCoins, LogOut, ReceiptText, Utensils, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AreaShell } from "@/components/tipe/AreaShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelWithdrawal, getWaiterDashboard, requestWithdrawal, saveWaiterPix } from "@/lib/tipe/waiter.functions";

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
  const [aba, setAba] = useState<"inicio" | "saque">("inicio");
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
        {q.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {q.error && <p className="rounded-2xl border border-border bg-card p-5 text-sm">{(q.error as Error).message}</p>}
        {d && (
          <>
            <div className="rounded-3xl p-6 text-secondary-foreground shadow-xl" style={{ background: "var(--gradient-brand)" }}>
              <p className="text-sm text-secondary-foreground/70">Disponível para saque</p>
              <p className="font-display text-3xl font-extrabold">{brl(d.balance.available)}</p>
              <p className="mt-1 text-xs text-secondary-foreground/70">Nesta quinzena: {brl(d.balance.currentCycle)} · libera em {proximoPagamento().toLocaleDateString("pt-BR")}</p>
            </div>

            <div className="flex gap-2">
              <Button variant={aba === "inicio" ? "default" : "outline"} onClick={() => setAba("inicio")}>Resumo</Button>
              <Button variant={aba === "saque" ? "default" : "outline"} onClick={() => setAba("saque")}>Saques e Pix</Button>
            </div>

            {aba === "inicio" && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Kpi icon={HandCoins} label="Gorjetas hoje" value={brl(d.today.tips)} sub={`${d.today.tipsCount} gorjeta(s)`} />
                  <Kpi icon={Utensils} label="Vendas hoje" value={brl(d.today.sales)} sub="pedidos lançados" />
                  <Kpi icon={ReceiptText} label="Mesas hoje" value={String(d.today.tables)} sub="atendidas" />
                  <Kpi icon={Wallet} label="Já recebido" value={brl(d.balance.withdrawn)} sub="em saques pagos" />
                </div>
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="font-display font-bold">Gorjetas extras — últimos 14 dias</h2>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serie}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={40} />
                        <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                        <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="font-display font-bold">Últimas gorjetas</h2>
                  {d.tips.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhuma gorjeta extra nos últimos 30 dias.</p> : (
                    <ul className="mt-2 divide-y divide-border text-sm">
                      {d.tips.slice(0, 15).map((t, i) => (
                        <li key={i} className="flex justify-between py-2"><span>Mesa {t.table} · {new Date(t.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span><span className="font-semibold text-primary">{brl(t.amount)}</span></li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Valores já descontada a parte da TIPE.</p>
                </section>
              </>
            )}

            {aba === "saque" && (
              <>
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 font-display font-bold"><CalendarClock className="h-5 w-5 text-primary" />Como funciona</h2>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• As gorjetas são somadas por quinzena: do dia 1 ao 15 e do dia 16 ao fim do mês.</li>
                    <li>• Você pode pedir o saque a qualquer momento. O pedido só fica registrado.</li>
                    <li>• O Pix é feito pela TIPE no próximo dia de repasse (dia 1 ou 16). Nenhum saque é pago na hora.</li>
                    <li>• Um pedido de saque por vez.</li>
                  </ul>
                  <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm font-semibold">Saque mínimo: R$ 10,00</p>
                  {d.balance.available < 10 && <p className="mt-2 text-xs text-muted-foreground">Seu saldo disponível ainda não chegou ao mínimo para saque.</p>}
                  <Button className="mt-3 w-full" disabled={busy || d.balance.available < 10 || (!d.pix?.keyMasked && !d.pix?.pendingKeyMasked) || d.withdrawals.some((w) => w.status === "requested")} onClick={async () => {
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
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="font-display font-bold">Histórico de saques</h2>
                  {d.withdrawals.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum saque ainda.</p> : (
                    <ul className="mt-2 divide-y divide-border text-sm">
                      {d.withdrawals.map((w) => (
                        <li key={w.id} className="flex items-center justify-between gap-2 py-2">
                          <span>{brl(w.amount)}<span className="block text-xs text-muted-foreground">{w.status === "paid" && w.resolved_at ? `Pago em ${new Date(w.resolved_at).toLocaleDateString("pt-BR")}` : w.status === "requested" ? (w.blocked_until && new Date(w.blocked_until).getTime() > Date.now() ? `Bloqueado até ${new Date(w.blocked_until).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, depois aguarda o repasse de ${data(w.scheduled_for)}` : `Aguardando repasse do dia ${data(w.scheduled_for)}`) : ""}{w.note ? ` · ${w.note}` : ""}</span></span>
                          <span className="flex items-center gap-2">
                            {w.status === "requested" && <button type="button" className="text-xs underline text-muted-foreground" onClick={async () => { try { await cancelar({ data: { id: w.id } }); toast.success("Pedido cancelado"); qc.invalidateQueries({ queryKey: ["waiter"] }); } catch (e) { toast.error((e as Error).message); } }}>Cancelar</button>}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${w.status === "paid" ? "bg-primary/15 text-primary" : w.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>{STATUS[w.status]}</span>
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

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function ChavePix({ atual }: { atual: { holderName: string; keyType: string; keyMasked: string | null; pendingKeyMasked: string | null; pendingUntil: string | null } | null }) {
  const save = useServerFn(saveWaiterPix);
  const qc = useQueryClient();
  const [edit, setEdit] = useState(!atual);
  const [f, setF] = useState({ holderName: "", holderDocument: "", keyType: "cpf" as "cpf" | "email" | "phone" | "random", key: "" });
  if (!edit && atual) return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm">
      <h2 className="font-display font-bold">Sua chave Pix</h2>
      <p className="mt-2">{atual.holderName}</p>
      {atual.keyMasked && <p className="text-muted-foreground">{KEY[atual.keyType]}: {atual.keyMasked}</p>}
      {atual.pendingKeyMasked && atual.pendingUntil && <p className="mt-1 text-xs font-semibold text-highlight">Nova chave {atual.pendingKeyMasked} em verificação até {new Date(atual.pendingUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Saques pausados até lá, a menos que o restaurante aprove antes.</p>}
      <Button variant="outline" className="mt-3" onClick={() => setEdit(true)}>Alterar chave</Button>
    </section>
  );
  return (
    <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={async (e) => {
      e.preventDefault();
      try { await save({ data: f }); toast.success("Chave Pix salva"); setEdit(false); qc.invalidateQueries({ queryKey: ["waiter"] }); }
      catch (err) { const m = (err as Error).message; toast.error(m.startsWith("[") ? "Confira os dados informados" : m); }
    }}>
      <h2 className="font-display font-bold">Dados para receber o Pix</h2>
      <label className="block text-sm">Nome completo<Input required className="mt-1" value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} /></label>
      <label className="block text-sm">CPF<Input required inputMode="numeric" className="mt-1" value={f.holderDocument} onChange={(e) => setF({ ...f, holderDocument: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></label>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <label className="block text-sm">Tipo
          <select className="mt-1 h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.keyType} onChange={(e) => setF({ ...f, keyType: e.target.value as never, key: "" })}>
            <option value="cpf">CPF</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option>
          </select>
        </label>
        <label className="block text-sm">Chave Pix<Input required className="mt-1" value={f.key} onChange={(e) => setF({ ...f, key: f.keyType === "cpf" || f.keyType === "phone" ? e.target.value.replace(/[^\d+]/g, "").slice(0, 14) : e.target.value })} /></label>
      </div>
      <p className="text-xs text-muted-foreground">A chave precisa estar no seu nome. Os dados só são usados para o pagamento das suas gorjetas.</p>
      <div className="flex gap-2"><Button type="submit">Salvar chave</Button>{atual && <Button type="button" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>}</div>
    </form>
  );
}
