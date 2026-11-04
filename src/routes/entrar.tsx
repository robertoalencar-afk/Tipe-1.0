import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/tipe/staff.functions";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { EditorialPhoto } from "@/components/tipe/landing/EditorialPhoto";
import { Toast } from "@/components/tipe/landing/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { SenhaForteInput } from "@/components/tipe/SenhaForte";
import { avaliarSenha, mensagemErroSenha } from "@/lib/tipe/senha";
import { Check, HandCoins } from "lucide-react";

export const Route = createFileRoute("/entrar")({
  validateSearch: z.object({
    r: z
      .string()
      .regex(/^\/[a-z0-9-]+$/)
      .optional()
      .catch(undefined),
  }),
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
  const [precisaMfa, setPrecisaMfa] = useState(false);
  const destino = async (mfaConfirmado = false) => {
    // Conta com 2FA: pede o código antes de qualquer chamada ao servidor (que recusa aal1).
    if (!mfaConfirmado) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return setPrecisaMfa(true);
    }
    if (r) return navigate({ to: "/$restaurante", params: { restaurante: r.slice(1) } });
    try {
      const a = await fetchAccess();
      if (a.isFounder) return navigate({ to: "/backoffice", replace: true });
      if (a.roles.length > 0 && a.roles.every((x) => x.role === "waiter"))
        return navigate({ to: "/garcom", replace: true });
      if (a.restaurants.length === 1)
        return navigate({
          to: "/$restaurante",
          params: { restaurante: a.restaurants[0]!.slug },
          replace: true,
        });
    } catch {
      /* fallback abaixo */
    }
    return navigate({ to: "/painel", replace: true });
  };
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void destino();
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) void destino();
    });
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
        const forca = avaliarSenha(senha, { email });
        if (!forca.ok) throw new Error(`Senha fraca: ${forca.faltam.join(", ").toLowerCase()}.`);
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}${r ?? "/painel"}` },
        });
        if (error)
          throw new Error(
            mensagemErroSenha(error.message) ?? "Não foi possível criar a conta",
          );
        toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
        setModo("entrar");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/entrar${r ? `?r=${encodeURIComponent(r)}` : ""}` },
    });
    if (error) toast.error("Não foi possível entrar com Google");
  }

  if (precisaMfa)
    return (
      <MfaGate>
        <SeguirAposMfa onPronto={() => void destino(true)} />
      </MfaGate>
    );

  const titulo =
    modo === "entrar"
      ? "Área do restaurante"
      : modo === "criar"
        ? "Criar conta da equipe"
        : "Recuperar senha";
  const subtitulo =
    modo === "entrar"
      ? "Entre com seu e-mail e senha para acessar o painel."
      : modo === "criar"
        ? "Crie sua conta para fazer parte da equipe."
        : "Informe seu e-mail e enviamos o link de recuperação.";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[84rem] gap-10 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-6">
        {/* Foto da operação, no formato das páginas de produto */}
        <section className="relative hidden lg:block">
          <EditorialPhoto
            scene="gestor"
            alt="Dona de restaurante conferindo as mesas no painel da Tipe pelo tablet, no balcão"
            aspect="auto"
            className="h-full"
            sizes="50vw"
            position="40% 45%"
            radius="2rem"
            priority
          />
          <div className="absolute left-6 top-6 w-[min(80%,21rem)] space-y-2.5">
            <Toast
              tone="dark"
              icon={<Check className="h-4 w-4" strokeWidth={3} />}
              title="Mesa 7 pagou R$ 186,40"
              text="Pix aprovado, conta fechada no PDV"
            />
            <Toast
              tone="dark"
              icon={<HandCoins className="h-4 w-4" />}
              title="Dinheiro na Mesa 3"
              text="Confirme no painel quando receber"
            />
          </div>
        </section>

        {/* Formulário */}
        <section className="flex flex-col">
          <Link to="/" aria-label="TIPE, voltar ao site" className="w-fit pt-2">
            <TipeLogo variant="dark" className="h-9" />
          </Link>
          <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-12">
            <h1 className="text-[clamp(2.2rem,1.6rem+2vw,3.2rem)] font-medium leading-[1.02] tracking-[-0.04em]">
              {titulo}
            </h1>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">{subtitulo}</p>
            <form onSubmit={enviar} className="mt-9 space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {modo !== "esqueci" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="senha" className="text-sm font-medium">
                      Senha
                    </label>
                    {modo === "entrar" && (
                      <button
                        type="button"
                        onClick={() => setModo("esqueci")}
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    )}
                  </div>
                  {modo === "criar" ? (
                    <SenhaForteInput id="senha" label="" value={senha} onChange={setSenha} contexto={{ email }} />
                  ) : (
                    <Input
                      id="senha"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="current-password"
                    />
                  )}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={carregando}>
                {carregando
                  ? "Aguarde..."
                  : modo === "entrar"
                    ? "Entrar"
                    : modo === "criar"
                      ? "Criar conta"
                      : "Enviar link"}
              </Button>
              {modo !== "esqueci" && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={google}
                  >
                    Continuar com Google
                  </Button>
                </>
              )}
            </form>
            <p className="mt-8 text-[0.95rem] text-muted-foreground">
              {modo === "entrar" ? (
                <>
                  Seu restaurante ainda não usa a Tipe?{" "}
                  <Link
                    to="/teste-gratis"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Teste grátis
                  </Link>
                  . Faz parte da equipe?{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-4"
                    onClick={() => setModo("criar")}
                  >
                    Crie sua conta
                  </button>
                  .
                </>
              ) : (
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => setModo("entrar")}
                >
                  Voltar para entrar
                </button>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SeguirAposMfa({ onPronto }: { onPronto: () => void }) {
  useEffect(() => { onPronto(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <p className="p-10 text-center text-sm text-muted-foreground">Entrando…</p>;
}
