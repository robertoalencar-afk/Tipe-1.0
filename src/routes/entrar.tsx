import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const destino = () => (r ? navigate({ to: "/$restaurante", params: { restaurante: r.slice(1) } }) : navigate({ to: "/painel" }));
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-t-[2rem] bg-secondary p-6 text-center"><TipeLogo className="mx-auto" /></div>
        <form onSubmit={enviar} className="space-y-4 rounded-b-[2rem] border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold text-foreground">{titulo}</h1>
          <Input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {modo !== "esqueci" && (
            <Input type="password" required minLength={8} placeholder="Senha (mín. 8 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modo === "criar" ? "new-password" : "current-password"} />
          )}
          <Button type="submit" className="w-full" disabled={carregando}>
            {modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}
          </Button>
          {modo !== "esqueci" && (
            <Button type="button" variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            {modo === "entrar" ? (
              <>
                <button type="button" className="underline" onClick={() => setModo("criar")}>Criar conta</button>
                <button type="button" className="underline" onClick={() => setModo("esqueci")}>Esqueci a senha</button>
              </>
            ) : (
              <button type="button" className="underline" onClick={() => setModo("entrar")}>Voltar para entrar</button>
            )}
          </div>
        </form>
        <Link to="/" className="mt-4 block text-center text-sm text-muted-foreground underline">Voltar ao totem</Link>
      </div>
    </main>
  );
}
