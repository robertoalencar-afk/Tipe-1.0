import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Check, LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  claimFounder, createRestaurant, getMyAccess, getPanelData, inviteStaff, removeStaff, resolvePayment, type StaffRole,
} from "@/lib/tipe/staff.functions";

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: z.object({ r: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Painel do restaurante — TIPE" },
      { name: "description", content: "Acompanhe as mesas e confirme pagamentos presenciais em tempo real." },
      { property: "og:title", content: "Painel do restaurante — TIPE" },
      { property: "og:description", content: "Espelho das mesas do PDV e confirmação de pagamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const cargoLabel: Record<StaffRole, string> = { founder: "Fundador", owner: "Dono", cashier: "Caixa / gerente", waiter: "Garçom" };
const metodoLabel: Record<string, string> = { pix: "Pix", card: "Cartão", apple_pay: "Apple Pay", google_pay: "Google Pay", at_establishment: "Dinheiro ou maquininha" };
const acaoLabel: Record<string, string> = { confirm: "Pagamento confirmado", cancel: "Pagamento cancelado", table_reopened: "Mesa reaberta" };

type Status = "livre" | "ocupada" | "aguardando" | "encerrada";
const statusInfo: Record<Status, { label: string; cls: string }> = {
  livre: { label: "Livre", cls: "border-border bg-card text-muted-foreground" },
  ocupada: { label: "Ocupada", cls: "border-primary bg-primary/10 text-foreground" },
  aguardando: { label: "Aguardando confirmação", cls: "border-accent bg-accent/20 text-foreground" },
  encerrada: { label: "Encerrada", cls: "border-border bg-muted text-muted-foreground" },
};

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { r } = Route.useSearch();
  const fetchAccess = useServerFn(getMyAccess);
  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  const slug = r ?? access.data?.restaurants[0]?.slug;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
        <TipeLogo className="h-9" />
        <div className="flex items-center gap-2">
          {access.data && access.data.restaurants.length > 1 && (
            <select className="rounded-md bg-card px-2 py-1 text-sm text-card-foreground" value={slug} onChange={(e) => navigate({ to: "/painel", search: { r: e.target.value } })}>
              {access.data.restaurants.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
          )}
          <Button size="sm" variant="ghost" onClick={sair} className="text-secondary-foreground"><LogOut className="mr-1 h-4 w-4" />Sair</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {access.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {access.error && <p className="text-destructive">{(access.error as Error).message}</p>}
        {access.data && !slug && <SemAcesso isFounder={access.data.isFounder} email={access.data.email} />}
        {access.data?.isFounder && <NovoRestaurante />}
        {slug && access.data && <PainelRestaurante slug={slug} roles={access.data.roles} isFounder={access.data.isFounder} restaurants={access.data.restaurants} />}
      </main>
    </div>
  );
}

function SemAcesso({ isFounder, email }: { isFounder: boolean; email: string }) {
  const claim = useServerFn(claimFounder);
  const qc = useQueryClient();
  if (isFounder) return null;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="font-display text-lg font-bold">Você ainda não faz parte de uma equipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">Peça ao dono do restaurante para adicionar o e-mail <strong>{email}</strong> na aba Equipe.</p>
      <Button variant="outline" className="mt-4" onClick={async () => {
        const res = await claim();
        if (res.claimed) { toast.success("Você agora é o fundador da Tipe"); qc.invalidateQueries({ queryKey: ["access"] }); }
        else toast.error("A Tipe já tem um fundador cadastrado");
      }}>Sou o fundador da Tipe</Button>
    </div>
  );
}

function NovoRestaurante() {
  const create = useServerFn(createRestaurant);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ name: "", slug: "", pos: "saipos" as "saipos" | "totvs" | "none", tables: 10 });
  return (
    <div className="mb-4 flex justify-end">
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>Cadastrar restaurante</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo restaurante</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await create({ data: f });
              toast.success("Restaurante cadastrado");
              setAberto(false);
              await qc.invalidateQueries({ queryKey: ["access"] });
              navigate({ to: "/painel", search: { r: res.slug } });
            } catch (err) { toast.error((err as Error).message); }
          }}>
            <Input required placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} />
            <Input required placeholder="Endereço no QR (ex.: mare-alta)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value as typeof f.pos })}>
              <option value="saipos">PDV: Saipos</option>
              <option value="totvs">PDV: TOTVS Food Service</option>
              <option value="none">Sem PDV</option>
            </select>
            <Input type="number" min={1} max={200} value={f.tables} onChange={(e) => setF({ ...f, tables: Number(e.target.value) })} />
            <Button type="submit" className="w-full">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PainelRestaurante({ slug, roles, isFounder, restaurants }: {
  slug: string; isFounder: boolean;
  roles: { role: StaffRole; restaurantId: string | null }[];
  restaurants: { id: string; slug: string }[];
}) {
  const fetchPanel = useServerFn(getPanelData);
  const resolve = useServerFn(resolvePayment);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["panel", slug], queryFn: () => fetchPanel({ data: { slug } }), refetchInterval: 15000 });
  const [mesaAberta, setMesaAberta] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`painel-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_payment_requests", filter: `restaurant_slug=eq.${slug}` }, () => qc.invalidateQueries({ queryKey: ["panel", slug] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bill_items", filter: `restaurant_slug=eq.${slug}` }, () => qc.invalidateQueries({ queryKey: ["panel", slug] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug, qc]);

  const rid = restaurants.find((x) => x.slug === slug)?.id;
  const meus = roles.filter((x) => x.restaurantId === rid).map((x) => x.role);
  const podeConfirmar = isFounder || meus.includes("owner") || meus.includes("cashier");
  const podeEquipe = isFounder || meus.includes("owner");

  const mesas = useMemo(() => {
    if (!q.data) return [];
    return q.data.tables.map((t) => {
      const itens = q.data.items.filter((i) => i.table_number === t.number);
      const pend = q.data.payments.filter((p) => p.table_number === t.number && p.status === "pending");
      const total = itens.reduce((s, i) => s + i.unit_price * i.ordered_quantity, 0);
      const pago = itens.reduce((s, i) => s + i.unit_price * i.paid_quantity, 0);
      const disponivel = itens.reduce((s, i) => s + (i.ordered_quantity - i.reserved_quantity - i.paid_quantity), 0);
      const status: Status = itens.length === 0 ? "livre" : pend.length ? "aguardando" : disponivel <= 0 ? "encerrada" : "ocupada";
      return { number: t.number, itens, total, pago, status, pendentes: pend.length };
    });
  }, [q.data]);

  async function agir(id: string, action: "confirm" | "cancel") {
    setOcupado(id);
    try {
      await resolve({ data: { paymentId: id, action } });
      toast.success(action === "confirm" ? "Recebimento confirmado" : "Pagamento cancelado e itens liberados");
      qc.invalidateQueries({ queryKey: ["panel", slug] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(null); }
  }

  if (q.isLoading) return <p className="text-muted-foreground">Carregando mesas…</p>;
  if (q.error || !q.data) return <p className="text-destructive">{(q.error as Error)?.message ?? "Erro"}</p>;
  const d = q.data;
  const pendentes = d.payments.filter((p) => p.status === "pending");
  const itemNome = (mesa: string, code: string) => d.items.find((i) => i.table_number === mesa && i.item_code === code)?.item_name ?? code;
  const mesaSel = mesas.find((m) => m.number === mesaAberta);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{d.restaurant.name}</h1>
        <span className="text-sm text-muted-foreground">PDV: {d.restaurant.pos_provider === "saipos" ? "Saipos" : d.restaurant.pos_provider === "totvs" ? "TOTVS Food Service" : "nenhum"} · demonstração</span>
      </div>
      <Tabs defaultValue="mesas">
        <TabsList>
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="confirmar">Aguardando confirmação{pendentes.length ? ` (${pendentes.length})` : ""}</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          {podeEquipe && <TabsTrigger value="equipe">Equipe</TabsTrigger>}
        </TabsList>

        <TabsContent value="mesas">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {mesas.map((m) => (
              <button key={m.number} onClick={() => setMesaAberta(m.number)} className={`rounded-2xl border-2 p-4 text-left transition hover:shadow-md ${statusInfo[m.status].cls}`}>
                <div className="font-display text-2xl font-bold">Mesa {m.number}</div>
                <div className="mt-1 text-xs">{statusInfo[m.status].label}</div>
                {m.itens.length > 0 && <div className="mt-2 text-sm font-semibold">{brl(m.pago)} / {brl(m.total)}</div>}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="confirmar">
          {pendentes.length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhum pagamento aguardando confirmação.</p>}
          <ul className="space-y-3">
            {pendentes.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">Mesa {p.table_number} · {p.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}</div>
                  </div>
                  <div className="font-display text-xl font-bold">{brl(p.amount)}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {Object.entries(p.item_quantities).filter(([, q]) => q > 0).map(([c, q]) => `${q}× ${itemNome(p.table_number, c)}`).join(" · ")}
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
        </TabsContent>

        <TabsContent value="historico">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {d.audit.length === 0 && <li className="p-4 text-center text-muted-foreground">Sem registros ainda.</li>}
            {d.audit.map((a) => (
              <li key={a.id} className="flex justify-between p-3 text-sm">
                <span>{acaoLabel[a.action] ?? a.action} · Mesa {a.table_number}</span>
                <span className="text-muted-foreground">{a.amount ? `${brl(a.amount)} · ` : ""}{hora(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        {podeEquipe && <TabsContent value="equipe"><Equipe slug={slug} staff={d.staff} /></TabsContent>}
      </Tabs>

      <Dialog open={!!mesaSel} onOpenChange={(o) => !o && setMesaAberta(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {mesaSel && (
            <>
              <DialogHeader><DialogTitle>Mesa {mesaSel.number} · {statusInfo[mesaSel.status].label}</DialogTitle></DialogHeader>
              {mesaSel.itens.length === 0 ? <p className="text-muted-foreground">Nenhum pedido nesta mesa.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th>Item</th><th>Pedido</th><th>Reserv.</th><th>Pago</th></tr></thead>
                  <tbody>
                    {mesaSel.itens.map((i) => (
                      <tr key={i.item_code} className="border-t border-border"><td className="py-1">{i.item_name}</td><td>{i.ordered_quantity}</td><td>{i.reserved_quantity}</td><td>{i.paid_quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <h3 className="mt-4 font-semibold">Pagamentos</h3>
              <ul className="space-y-2 text-sm">
                {d.payments.filter((p) => p.table_number === mesaSel.number).map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg bg-muted p-2">
                    <span>{p.customer_name} · {metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}</span>
                    <span className="font-semibold">{brl(p.amount)} · {p.status === "pending" ? "Pendente" : p.status === "approved" ? "Confirmado" : "Cancelado"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
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
        <p className="text-xs text-muted-foreground">A pessoa precisa criar a conta antes em "Área do restaurante" com o mesmo e-mail.</p>
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
