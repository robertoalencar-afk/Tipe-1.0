import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/tipe/staff.functions";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { TipeLogo } from "@/components/tipe/Logo";
import lebre from "@/assets/lebre-ai-official.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/entrar")({
  validateSearch: z.object({ r: z.string().regex(/^\/[a-z0-9-]+$/).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Entrar — Área do restaurante TIPE" },
      { name: "description", content: "Acesso da equipe do restaurante ao painel TIPE." },
      { property: "og:title", content: "Área do restaurante TIPE" },
      { property: "og:description", content: "Acompanhe mesas e confirme pagamentos presenciais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

type Modo = "entrar" | "criar" | "esqueci";

function Entrar() {
  const navigate = useNavigate();
  const { r } = Route.useSearch();
  const fetchAccess = useServerFn(getMyAccess);
  const destino = async () => {
    if (r) return navigate({ to: "/$restaurante", params: { restaurante: r.slice(1) } });
    try {
      const a = await fetchAccess();
      if (a.isFounder) return navigate({ to: "/backoffice", replace: true });
      if (a.roles.length > 0 && a.roles.every((x) => x.role === "waiter")) return navigate({ to: "/garcom", replace: true });
      if (a.restaurants.length === 1) return navigate({ to: "/$restaurante", params: { restaurante: a.restaurants[0]!.slug }, replace: true });
    } catch { /* fallback abaixo */ }
    return navigate({ to: "/painel", replace: true });
  };
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) destino(); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) destino(); });
    return () => data.subscription.unsubscribe();
  }, [navigate, r]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error("E-mail ou senha incorretos");
      } else if (modo === "criar") {
        const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${window.location.origin}${r ?? "/painel"}` } });
        if (error) throw new Error(error.message.includes("pwned") || error.message.toLowerCase().includes("weak") ? "Essa senha é fraca ou já vazou. Escolha outra." : "Não foi possível criar a conta");
        toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
        setModo("entrar");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw new Error("Não foi possível enviar o e-mail");
        toast.success("Enviamos um link para redefinir sua senha.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/entrar${r ? `?r=${encodeURIComponent(r)}` : ""}` });
    if (res.error) toast.error("Não foi possível entrar com Google");
  }

  const titulo = modo === "entrar" ? "Área do restaurante" : modo === "criar" ? "Criar conta da equipe" : "Recuperar senha";
  const subtitulo = modo === "entrar" ? "Entre com seu e-mail e senha para acessar o painel." : modo === "criar" ? "Crie sua conta para fazer parte da equipe." : "Informe seu e-mail e enviamos o link de recuperação.";

  const perks = [
    { icon: Zap, text: "Acompanhe mesas e pedidos em tempo real" },
    { icon: CheckCircle2, text: "Confirme pagamentos no estabelecimento com um toque" },
    { icon: ShieldCheck, text: "Conectado ao PDV que você já usa" },
  ];

  return (
    <main className="min-h-screen text-foreground" style={{ background: "var(--gradient-brand)" }}>
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:py-0">
        {/* Painel de marca */}
        <section className="flex flex-col items-center text-center text-secondary-foreground lg:items-start lg:text-left">
          <TipeLogo className="h-14 sm:h-16" />
          <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            O restaurante inteiro na sua mão
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary-foreground/85 sm:text-base">
            A conta atualiza na hora, o cliente paga na mesa e você acompanha cada pagamento de onde estiver.
          </p>
          <ul className="mt-8 w-full max-w-md space-y-3">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 rounded-2xl bg-secondary-foreground/10 px-4 py-3 text-left text-sm font-medium backdrop-blur-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <p.icon className="h-4 w-4" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
          <img src={lebre} alt="Lebre TIPE" className="mt-8 hidden h-56 object-contain drop-shadow-2xl sm:h-64 lg:block" />
        </section>

        {/* Formulário */}
        <section className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <form onSubmit={enviar} className="space-y-5 p-7 sm:p-9">
              <div className="text-center">
                <h2 className="font-display text-2xl font-extrabold">{titulo}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitulo}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="ms-1 block text-xs font-bold text-muted-foreground">E-mail</label>
                <Input id="email" type="email" required placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 rounded-xl" />
              </div>
              {modo !== "esqueci" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="senha" className="ms-1 text-xs font-bold text-muted-foreground">Senha</label>
                    {modo === "entrar" && (
                      <button type="button" onClick={() => setModo("esqueci")} className="text-xs font-semibold text-primary hover:underline">Esqueci a senha</button>
                    )}
                  </div>
                  <Input id="senha" type="password" required minLength={8} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modo === "criar" ? "new-password" : "current-password"} className="h-11 rounded-xl" />
                  {modo === "criar" && <p className="ms-1 text-[11px] text-muted-foreground">Mínimo de 8 caracteres</p>}
                </div>
              )}
              <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base font-bold" disabled={carregando}>
                {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}
              </Button>
              {modo !== "esqueci" && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground">ou</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button type="button" variant="outline" size="lg" className="h-11 w-full rounded-xl font-semibold" onClick={google}>Continuar com Google</Button>
                </>
              )}
              <div className="pt-1 text-center text-sm">
                {modo === "entrar" ? (
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setModo("criar")}>Não tem conta? Criar agora</button>
                ) : (
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setModo("entrar")}>Voltar para entrar</button>
                )}
              </div>
            </form>
          </div>
          <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-secondary-foreground/80 hover:text-secondary-foreground">
            Voltar ao site
          </Link>
        </section>
      </div>
    </main>
  );
}
