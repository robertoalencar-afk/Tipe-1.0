import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANS, TRIAL_DAYS, priceLabel, type PlanId } from "@/lib/tipe/plans";
import { signupRestaurant } from "@/lib/tipe/subscription.functions";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  validateSearch: z.object({ plano: z.enum(["essencial", "profissional", "premium"]).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Cadastre seu restaurante — 30 dias grátis | TIPE" },
      { name: "description", content: "Cadastre seu restaurante na TIPE e teste grátis por 30 dias, sem cartão. Assinatura mensal a partir de R$ 49,90." },
      { property: "og:title", content: "Cadastre seu restaurante na TIPE" },
      { property: "og:description", content: "30 dias grátis, sem cartão. Depois, assinatura mensal sem fidelidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const { plano } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signup = useServerFn(signupRestaurant);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<PlanId>(plano ?? "profissional");
  const [f, setF] = useState({ displayName: "", name: "", slug: "", tables: 10 });
  const [enviando, setEnviando] = useState(false);
  const max = PLANS.find((p) => p.id === plan)!.maxTables;

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setLogado(!!data.session)); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await signup({ data: { ...f, tables: Math.min(f.tables, max), plan } });
      toast.success(`Restaurante cadastrado! Seu teste grátis de ${TRIAL_DAYS} dias começou.`);
      await qc.invalidateQueries({ queryKey: ["access"] });
      navigate({ to: "/$restaurante", params: { restaurante: r.slug } });
    } catch (err) { toast.error((err as Error).message); } finally { setEnviando(false); }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-secondary px-4 py-4"><Link to="/"><TipeLogo className="h-9" /></Link></header>
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <p className="inline-block rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">{TRIAL_DAYS} dias grátis · sem cartão</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Cadastre seu restaurante</h1>
        <p className="mt-2 text-muted-foreground">Use tudo por {TRIAL_DAYS} dias. Depois, assinatura mensal sem fidelidade — cancele quando quiser.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)} className={`rounded-2xl border p-4 text-left transition ${plan === p.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}>
              <div className="flex items-center justify-between"><span className="font-display font-bold">{p.name}</span>{plan === p.id && <Check className="h-4 w-4 text-primary" />}</div>
              <p className="mt-1 font-display"><span className="text-xs">R$</span> <span className="text-2xl font-extrabold">{priceLabel(p.price)}</span><span className="text-xs text-muted-foreground">/mês</span></p>
              <p className="text-xs text-muted-foreground">Até {p.maxTables} mesas</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Mais de 40 mesas ou várias unidades? <Link to="/" hash="fale-conosco" className="underline">Plano personalizado</Link>.</p>

        {logado === false && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">Primeiro, crie sua conta de acesso (ou entre, se já tiver).</p>
            <Button asChild className="mt-4"><Link to="/entrar" search={{ r: "/cadastro" }}>Criar conta ou entrar</Link></Button>
          </div>
        )}
        {logado && (
          <form onSubmit={enviar} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
            <label className="block text-sm font-semibold">Seu nome<Input required className="mt-1" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Nome do restaurante
              <Input required minLength={2} className="mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 40) })} />
            </label>
            <label className="block text-sm font-semibold">Endereço do restaurante
              <div className="mt-1 flex items-center rounded-md border border-input bg-background pl-3 text-sm"><span className="text-muted-foreground">tipe.digital/</span><input required pattern="[a-z0-9-]{2,64}" className="h-10 flex-1 bg-transparent px-1 outline-none" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></div>
            </label>
            <label className="block text-sm font-semibold">Quantidade de mesas (até {max})
              <Input type="number" required min={1} max={max} className="mt-1 w-32" value={Math.min(f.tables, max)} onChange={(e) => setF({ ...f, tables: Number(e.target.value) })} />
            </label>
            <p className="text-xs text-muted-foreground">Ao continuar, você concorda com os <Link to="/termos" className="underline">termos de uso</Link>. Nenhuma cobrança será feita durante o teste.</p>
            <Button type="submit" className="w-full" size="lg" disabled={enviando}>{enviando ? "Cadastrando…" : `Começar ${TRIAL_DAYS} dias grátis`}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
