import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/tipe/staff.functions";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CartaoConta, TituloCartao, type HumorLebre } from "@/components/tipe/conta/CartaoConta";
import { PainelEsqueci } from "@/components/tipe/conta/PainelEsqueci";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { SenhaForteInput } from "@/components/tipe/SenhaForte";
import { MSG_CAPTCHA_FALHOU, ehErroCaptcha, useTurnstile } from "@/components/tipe/Turnstile";
import { caminhoRetornoSeguro } from "@/lib/tipe/retorno";
import { avaliarSenha, mensagemErroSenha } from "@/lib/tipe/senha";

export const Route = createFileRoute("/entrar")({
  validateSearch: z.object({
    r: z
      .string()
      .transform((v) => caminhoRetornoSeguro(v))
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

type Modo = "entrar" | "criar";

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
    try {
      const a = await fetchAccess();
      const soGarcom = a.roles.length > 0 && a.roles.every((x) => x.role === "waiter");
      // Destino pedido (r): só vale se esta conta pode abrir. Garçom vai para a própria área; endereço de
      // restaurante sem vínculo é ignorado (evita erro ao entrar com outra conta depois de sair).
      if (r) {
        const slugR = /^\/([a-z0-9-]+)\/?$/.exec(r)?.[1];
        const restR = slugR ? a.restaurants.find((x) => x.slug === slugR) : undefined;
        const temPapelNele =
          !!restR &&
          a.roles.some(
            (x) => x.restaurantId === restR.id && x.role !== "founder" && x.role !== "waiter",
          );
        const ehPapelPublico = !slugR || ["central", "painel", "garcom", "demo"].includes(slugR);
        if (!soGarcom && (ehPapelPublico || temPapelNele))
          return navigate({ to: r, replace: true } as never);
      }
      if (a.isFounder || a.isCentralStaff) return navigate({ to: "/central", replace: true });
      if (soGarcom) return navigate({ to: "/garcom", replace: true });
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
  const captcha = useTurnstile();
  const [virado, setVirado] = useState(false);
  const [focoSenha, setFocoSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [esqueciEnviado, setEsqueciEnviado] = useState(false);
  const [errou, setErrou] = useState(false);

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
          options: captcha.opcoes,
        });
        if (error?.status === 429)
          throw new Error("Muitas tentativas de login. Aguarde alguns minutos e tente de novo.");
        if (ehErroCaptcha(error)) throw new Error(MSG_CAPTCHA_FALHOU);
        if (error) {
          setErrou(true);
          window.setTimeout(() => setErrou(false), 2500);
          throw new Error("E-mail ou senha incorretos. Confira e tente de novo.");
        }
        setEntrando(true);
      } else {
        const forca = avaliarSenha(senha, { email });
        if (!forca.ok) throw new Error(`Senha fraca: ${forca.faltam.join(", ").toLowerCase()}.`);
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}${r ?? "/painel"}`,
            ...captcha.opcoes,
          },
        });
        if (ehErroCaptcha(error)) throw new Error(MSG_CAPTCHA_FALHOU);
        if (error)
          throw new Error(mensagemErroSenha(error.message) ?? "Não foi possível criar a conta");
        toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      captcha.reset();
      setCarregando(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/entrar${r ? `?r=${encodeURIComponent(r)}` : ""}`,
      },
    });
    if (error) toast.error("Não foi possível entrar com Google");
  }

  if (precisaMfa)
    return (
      <MfaGate>
        <SeguirAposMfa onPronto={() => void destino(true)} />
      </MfaGate>
    );

  const humor: HumorLebre = virado
    ? esqueciEnviado
      ? "enviado"
      : "pensando"
    : entrando
      ? "feliz"
      : errou
        ? "surpresa"
        : focoSenha
          ? "senha"
          : "ola";

  const frente = (
    <div>
      <TituloCartao titulo={modo === "entrar" ? "Que bom te ver de novo" : "Criar conta da equipe"}>
        <p>
          {modo === "entrar"
            ? "Uma entrada só para toda a equipe. Pelo seu e-mail, levamos você direto para a sua área."
            : "Crie sua conta para fazer parte da equipe do restaurante."}
        </p>
      </TituloCartao>
      <form onSubmit={enviar} className="mt-7 space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            required
            placeholder="voce@restaurante.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div
          className="space-y-2"
          onFocus={() => setFocoSenha(true)}
          onBlur={() => setFocoSenha(false)}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            {modo === "entrar" && (
              <button
                type="button"
                onClick={() => setVirado(true)}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Esqueci a senha
              </button>
            )}
          </div>
          {modo === "criar" ? (
            <SenhaForteInput
              id="senha"
              label=""
              value={senha}
              onChange={setSenha}
              contexto={{ email }}
            />
          ) : (
            <Input
              id="senha"
              type="password"
              required
              placeholder="••••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </div>
        {captcha.elemento}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={carregando || entrando || captcha.pendente}
        >
          {entrando
            ? "Entrando…"
            : carregando
              ? "Aguarde…"
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
        </Button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
          Continuar com Google
        </Button>
      </form>
      <p className="mt-6 text-[0.92rem] text-muted-foreground">
        {modo === "entrar" ? (
          <>
            Faz parte da equipe e ainda não tem acesso?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => setModo("criar")}
            >
              Crie sua conta
            </button>
            . Restaurante novo?{" "}
            <Link
              to="/solicitar-demonstracao"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Solicitar demonstração
            </Link>
            .
          </>
        ) : (
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-4"
            onClick={() => setModo("entrar")}
          >
            Já tenho conta, quero entrar
          </button>
        )}
      </p>
    </div>
  );

  return (
    <CartaoConta
      humor={humor}
      virado={virado}
      frente={frente}
      verso={
        <PainelEsqueci
          emailInicial={email}
          ativo={virado}
          onEnviado={setEsqueciEnviado}
          onVoltar={() => {
            setVirado(false);
            window.setTimeout(
              () => document.getElementById("senha")?.focus({ preventScroll: true }),
              500,
            );
          }}
        />
      }
    />
  );
}

function SeguirAposMfa({ onPronto }: { onPronto: () => void }) {
  useEffect(() => {
    onPronto();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <p className="p-10 text-center text-sm text-muted-foreground">Entrando…</p>;
}
