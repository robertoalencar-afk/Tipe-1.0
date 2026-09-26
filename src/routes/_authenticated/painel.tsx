import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { claimFounder, createRestaurant, getMyAccess } from "@/lib/tipe/staff.functions";

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
  useEffect(() => {
    if (access.data && !access.data.isFounder && access.data.restaurants.length === 1) navigate({ to: "/$restaurante", params: { restaurante: access.data.restaurants[0]!.slug }, replace: true });
  }, [access.data, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
        <TipeLogo className="h-9" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={sair} className="text-secondary-foreground"><LogOut className="mr-1 h-4 w-4" />Sair</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {access.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {access.error && <p className="text-destructive">{(access.error as Error).message}</p>}
        {access.data && !slug && <SemAcesso isFounder={access.data.isFounder} email={access.data.email} />}
        {access.data?.isFounder && <NovoRestaurante />}
        {access.data && access.data.restaurants.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {access.data.restaurants.map((x) => (
              <Link key={x.slug} to="/$restaurante" params={{ restaurante: x.slug }} className="rounded-2xl border border-border bg-card p-5 hover:border-primary">
                <div className="font-display text-lg font-bold">{x.name}</div>
                <div className="text-sm text-muted-foreground">tipe.digital/{x.slug}</div>
              </Link>
            ))}
          </div>
        )}
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
              navigate({ to: "/$restaurante", params: { restaurante: res.slug } });
            } catch (err) { toast.error((err as Error).message); }
          }}>
            <Input required placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "") })} />
            <Input required placeholder="Endereço (ex.: marealta)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
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

