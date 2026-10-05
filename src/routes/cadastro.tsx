import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Check, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANS, TRIAL_DAYS, priceLabel, type PlanId } from "@/lib/tipe/plans";
import { signupRestaurant } from "@/lib/tipe/subscription.functions";
import { recordLegalAcceptance } from "@/lib/tipe/legal.functions";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  validateSearch: z.object({ plano: z.enum(["essencial", "profissional", "premium"]).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Cadastre seu restaurante — 30 dias grátis | TIPE" },
      { name: "description", content: "Cadastre seu restaurante na TIPE e teste grátis por 30 dias, sem cartão e sem limite de mesas." },
      { property: "og:title", content: "Cadastre seu restaurante na TIPE" },
      { property: "og:description", content: "30 dias grátis, sem cartão. Depois, assinatura mensal sem fidelidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadastro,
});

const PENDING = "tipe:cadastro-pendente";
type Dados = { displayName: string; name: string; slug: string; cnpj: string; address: string; phone: string; tables: number; plan: PlanId };

function cnpjValido(v: string) {
  const c = v.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = base.split("").reduce((s, n, i) => s + Number(n) * pesos[i]!, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}
const mascaraCnpj = (v: string) => v.replace(/\D/g, "").slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");

function Cadastro() {
  const { plano } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signup = useServerFn(signupRestaurant);
  const aceitar = useServerFn(recordLegalAcceptance);
  const [aceite, setAceite] = useState(false);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [f, setF] = useState<Dados>({ displayName: "", name: "", slug: "", cnpj: "", address: "", phone: "", tables: 10, plan: plano ?? "profissional" });
  const [slugEditado, setSlugEditado] = useState(false);
  const slugDe = (nome: string) => nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 40);
  const [conta, setConta] = useState({ email: "", senha: "", senha2: "" });
  const [aguardandoEmail, setAguardandoEmail] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const tentou = useRef(false);

  async function criarRestaurante(d: Dados) {
    await aceitar({ data: { documents: ["partner_terms", "privacy_policy"] } });
    const r = await signup({ data: { ...d, cnpj: d.cnpj.replace(/\D/g, "") } });
    localStorage.removeItem(PENDING);
    toast.success(`Restaurante cadastrado! Seu teste grátis de ${TRIAL_DAYS} dias começou.`);
    await qc.invalidateQueries({ queryKey: ["access"] });
    navigate({ to: "/$restaurante", params: { restaurante: r.slug } });
  }

  // Ao voltar do link de confirmação do e-mail, conclui o cadastro salvo neste aparelho.
  useEffect(() => {
    const salvo = localStorage.getItem(PENDING);
    if (salvo) try { setF(JSON.parse(salvo) as Dados); } catch { /* ignora */ }
    const verificar = async (temSessao: boolean) => {
      setLogado(temSessao);
      const p = localStorage.getItem(PENDING);
      if (temSessao && p && !tentou.current) {
        tentou.current = true;
        setEnviando(true);
        try { await criarRestaurante(JSON.parse(p) as Dados); } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
      }
    };
    supabase.auth.getSession().then(({ data }) => verificar(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_IN") void verificar(!!s); });
    return () => data.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!aceite) return void toast.error("Aceite os Termos para Parceiros e a Política de Privacidade para continuar.");
    if (!cnpjValido(f.cnpj)) return void toast.error("CNPJ inválido. Confira os números.");
    setEnviando(true);
    try {
      if (logado) { await criarRestaurante(f); return; }
      if (conta.senha.length < 8 || !/[A-Za-z]/.test(conta.senha) || !/\d/.test(conta.senha)) throw new Error("A senha precisa ter 8 caracteres, com letras e números.");
      if (conta.senha !== conta.senha2) throw new Error("As senhas não conferem.");
      localStorage.setItem(PENDING, JSON.stringify(f));
      const { data, error } = await supabase.auth.signUp({ email: conta.email, password: conta.senha, options: { emailRedirectTo: `${window.location.origin}/cadastro`, data: { name: f.displayName } } });
      if (error) throw new Error(error.message.toLowerCase().includes("registered") ? "Este e-mail já tem conta. Entre com sua senha para continuar." : error.message.includes("pwned") || error.message.toLowerCase().includes("weak") ? "Essa senha é fraca ou já vazou. Escolha outra." : "Não foi possível criar a conta");
      if (data.session) { tentou.current = true; await criarRestaurante(f); } else setAguardandoEmail(true);
    } catch (err) { toast.error((err as Error).message); } finally { setEnviando(false); }
  }

  const campo = "block text-sm font-semibold";
  if (aguardandoEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Confirme seu e-mail</h1>
          <p className="mt-2 text-muted-foreground">Enviamos um link para <strong>{conta.email}</strong>. Abra-o <strong>neste mesmo aparelho</strong> e o cadastro do restaurante será concluído automaticamente.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-secondary px-4 py-4"><Link to="/"><TipeLogo className="h-9" /></Link></header>
      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <p className="inline-block rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">{TRIAL_DAYS} dias grátis · sem cartão · sem limite de mesas</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Cadastre seu restaurante</h1>
        <p className="mt-2 text-muted-foreground">Depois do teste, assinatura mensal sem fidelidade. {logado === false && <>Já tem conta? <Link to="/entrar" search={{ r: "/cadastro" }} className="underline">Entrar</Link>.</>}</p>

        <form onSubmit={enviar} className="mt-8 space-y-6">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">1. Plano após o teste</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button key={p.id} type="button" onClick={() => setF({ ...f, plan: p.id })} className={`rounded-2xl border p-4 text-left transition ${f.plan === p.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}>
                  <div className="flex items-center justify-between"><span className="font-display font-bold">{p.name}</span>{f.plan === p.id && <Check className="h-4 w-4 text-primary" />}</div>
                  <p className="mt-1 font-display"><span className="text-xs">R$</span> <span className="text-2xl font-extrabold">{priceLabel(p.price)}</span><span className="text-xs text-muted-foreground">/mês</span></p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">2. Dados do restaurante</h2>
            <label className={campo}>Nome do restaurante
              <Input required minLength={2} maxLength={80} className="mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 40) })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={campo}>CNPJ<Input required inputMode="numeric" placeholder="00.000.000/0000-00" className="mt-1" value={mascaraCnpj(f.cnpj)} onChange={(e) => setF({ ...f, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })} /></label>
              <label className={campo}>Telefone<Input type="tel" placeholder="(85) 90000-0000" maxLength={30} className="mt-1" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
            </div>
            <label className={campo}>Endereço completo<Input required minLength={8} maxLength={160} placeholder="Rua, número, bairro, cidade – UF" className="mt-1" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className={campo}>Endereço na TIPE
                <div className="mt-1 flex items-center rounded-md border border-input bg-background pl-3 text-sm"><span className="text-muted-foreground">tipe.digital/</span><input required pattern="[a-z0-9-]{2,64}" className="h-10 flex-1 bg-transparent px-1 outline-none" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></div>
              </label>
              <label className={campo}>Mesas<Input type="number" required min={1} max={500} className="mt-1 w-28" value={f.tables} onChange={(e) => setF({ ...f, tables: Number(e.target.value) })} /></label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">3. Responsável e acesso</h2>
            <label className={campo}>Seu nome completo<Input required minLength={2} maxLength={80} className="mt-1" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></label>
            {logado === false && (
              <>
                <label className={campo}>E-mail<Input type="email" required autoComplete="email" className="mt-1" value={conta.email} onChange={(e) => setConta({ ...conta, email: e.target.value })} /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={campo}>Senha<Input type="password" required minLength={8} autoComplete="new-password" className="mt-1" value={conta.senha} onChange={(e) => setConta({ ...conta, senha: e.target.value })} /></label>
                  <label className={campo}>Confirmar senha<Input type="password" required minLength={8} autoComplete="new-password" className="mt-1" value={conta.senha2} onChange={(e) => setConta({ ...conta, senha2: e.target.value })} /></label>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com letras e números. Senhas vazadas na internet são recusadas. Esqueceu a senha de uma conta existente? <Link to="/entrar" className="underline">Recupere aqui</Link>.</p>
              </>
            )}
            {logado && <p className="text-sm text-muted-foreground">Você está conectado; o restaurante será vinculado à sua conta.</p>}
          </section>

          <div className="flex items-start gap-3">
            <Checkbox id="aceite-parceiro" checked={aceite} onCheckedChange={(v) => setAceite(v === true)} className="mt-0.5" />
            <label htmlFor="aceite-parceiro" className="text-sm text-muted-foreground">Li e aceito os <Link to="/termos-parceiros" target="_blank" className="underline">Termos para Parceiros</Link> e a <Link to="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>. Nenhuma cobrança durante o teste.</label>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={enviando || logado === null}>{enviando ? "Cadastrando…" : `Começar ${TRIAL_DAYS} dias grátis`}</Button>
        </form>
      </div>
    </main>
  );
}
