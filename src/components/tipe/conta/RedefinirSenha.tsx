import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { SenhaForteInput } from "@/components/tipe/SenhaForte";
import { CabecalhoConta, TelaConta } from "@/components/tipe/conta/TelaConta";
import { avaliarSenha, mensagemErroSenha } from "@/lib/tipe/senha";
import { problemaNoLink, type ProblemaLink } from "@/lib/tipe/recuperar-senha";
import lebreFeliz from "@/assets/lebre/rosto-feliz.webp";
import lebreSurpresa from "@/assets/lebre/rosto-surpresa.webp";
import lebreObrigado from "@/assets/mascot-thanks-hd.webp";
import lebreEsperando from "@/assets/lebre/rosto-piscando.webp";

type Etapa = "carregando" | "form" | "mfa" | "pronto" | ProblemaLink;

/**
 * Tela aberta pelo link do e-mail. Aceita os dois formatos de link do Supabase:
 * - `?token_hash=...&type=recovery` (template da Tipe): o token só é trocado por sessão
 *   quando a pessoa salva a senha, então robôs que pré-abrem links no e-mail não queimam o link;
 * - `#access_token=...` (template padrão / convite de garçom): o cliente do Supabase cria a sessão sozinho.
 */
export function RedefinirSenha({ destino }: { destino: "painel" | "garcom" }) {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [senha, setSenha] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const token = useRef<string | null>(null);

  useEffect(() => {
    // Já lido (efeito rodando de novo, ex.: StrictMode): o token saiu do endereço mas está guardado.
    if (token.current) return void setEtapa("form");
    const { search, hash, pathname } = window.location;
    const problema = problemaNoLink(search, hash);
    if (problema) return void setEtapa(problema);

    const q = new URLSearchParams(search);
    const th = q.get("token_hash");
    if (th && (q.get("type") ?? "recovery") === "recovery") {
      token.current = th;
      // Tira o token do endereço (histórico, Referer, prints de tela).
      window.history.replaceState(null, "", pathname);
      return void setEtapa("form");
    }

    let ativo = true;
    const comSessao = (e?: string | null) => {
      if (!ativo) return;
      setEmail(e ?? "");
      setEtapa("form");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (s && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) comSessao(s.user.email);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) return comSessao(data.session.user.email);
      // Sem sessão e sem token: dá um instante para o cliente ler o #access_token.
      window.setTimeout(
        () => {
          void supabase.auth.getSession().then(({ data: d }) => {
            if (d.session) comSessao(d.session.user.email);
            else if (ativo) setEtapa("invalido");
          });
        },
        hash.includes("access_token") ? 2500 : 600,
      );
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const forca = avaliarSenha(senha, { email });
    if (!forca.ok) return setErro(`Quase lá: ${forca.faltam.join(", ").toLowerCase()}.`);
    setSalvando(true);
    if (token.current) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token.current,
        type: "recovery",
      });
      if (error) {
        setSalvando(false);
        return setEtapa(/expired/i.test(error.message) ? "expirado" : "invalido");
      }
      token.current = null;
      setEmail(data.user?.email ?? "");
    }
    // Conta com 2FA: o Supabase só troca a senha depois do código do autenticador.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      setSalvando(false);
      return setEtapa("mfa");
    }
    await gravar();
  }

  async function gravar() {
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      if (/session|jwt|not authenticated/i.test(error.message)) return setEtapa("expirado");
      setEtapa("form");
      return setErro(
        mensagemErroSenha(error.message) ??
          "Não deu para salvar agora. Tente de novo em instantes.",
      );
    }
    // Quem tinha a senha antiga (outro aparelho, alguém mal-intencionado) sai na hora.
    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
    setSalvando(false);
    setEtapa("pronto");
  }

  const pedirNovo = destino === "garcom" ? { garcom: true } : {};

  if (etapa === "carregando")
    return (
      <TelaConta lebre={lebreEsperando} lebreAlt="Lebre da Tipe piscando" balao="Só um segundinho…">
        <CabecalhoConta titulo="Abrindo seu link…">
          <p>Estamos conferindo se ele ainda vale.</p>
        </CabecalhoConta>
      </TelaConta>
    );

  if (etapa === "expirado" || etapa === "invalido")
    return (
      <TelaConta
        lebre={lebreSurpresa}
        lebreAlt="Lebre da Tipe surpresa"
        balao="Opa! Esse link já era."
        fundo="laranja"
      >
        <CabecalhoConta
          titulo={etapa === "expirado" ? "Esse link expirou" : "Esse link não vale mais"}
        >
          <p>
            {etapa === "expirado"
              ? "Por segurança, cada link de redefinição vale por 1 hora."
              : "Ele já foi usado ou um link mais novo foi pedido depois dele. Por segurança, cada link funciona uma vez só."}{" "}
            Peça outro e use o e-mail mais recente.
          </p>
        </CabecalhoConta>
        <div className="mt-8 space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/esqueci-a-senha" search={pedirNovo}>
              Pedir um link novo
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/entrar">Voltar para entrar</Link>
          </Button>
        </div>
      </TelaConta>
    );

  if (etapa === "mfa")
    return (
      <MfaGate>
        <Continuar onPronto={() => void gravar()} />
      </MfaGate>
    );

  if (etapa === "pronto")
    return (
      <TelaConta
        lebre={lebreObrigado}
        lebreAlt="Lebre da Tipe comemorando"
        balao="Senha nova, vida nova!"
        fundo="marinho"
      >
        <CabecalhoConta titulo="Prontinho, senha trocada!">
          <p>
            Você já está conectado neste aparelho. Por segurança, encerramos as sessões que estavam
            abertas em outros aparelhos.
          </p>
        </CabecalhoConta>
        <Button
          size="lg"
          className="mt-8 w-full"
          onClick={() =>
            navigate({ to: destino === "garcom" ? "/garcom" : "/painel", replace: true })
          }
        >
          {destino === "garcom" ? "Ir para o app do garçom" : "Ir para o painel"}
        </Button>
      </TelaConta>
    );

  return (
    <TelaConta
      lebre={lebreFeliz}
      lebreAlt="Lebre da Tipe sorrindo"
      balao="Bora de senha nova? Escolha uma que só você saiba."
    >
      <CabecalhoConta titulo="Crie sua nova senha">
        <p>
          Use pelo menos 10 caracteres, com letras e números. Uma frase curta é fácil de lembrar e
          difícil de adivinhar.
        </p>
      </CabecalhoConta>
      <form onSubmit={salvar} className="mt-9 space-y-5">
        {/* Ajuda o gerenciador de senhas a salvar a senha no login certo. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <SenhaForteInput
          id="nova-senha"
          label="Nova senha"
          value={senha}
          onChange={(v) => {
            setSenha(v);
            setErro(null);
          }}
          contexto={{ email }}
        />
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </TelaConta>
  );
}

function Continuar({ onPronto }: { onPronto: () => void }) {
  useEffect(() => {
    onPronto();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <p className="p-10 text-center text-sm text-muted-foreground">Salvando sua senha…</p>;
}
