import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TituloCartao } from "@/components/tipe/conta/CartaoConta";
import { pedirLinkNovaSenha } from "@/lib/tipe/recuperar-senha.functions";
import { caixaDeEntrada, mascararEmail, REENVIO_ESPERA_S } from "@/lib/tipe/recuperar-senha";

/**
 * "Esqueci a senha" dentro do cartão: pede o link (resposta neutra, limite no servidor) e
 * mostra o "Confira seu e-mail". Usado no verso do cartão do /entrar e sozinho no /esqueci-a-senha.
 */
export function PainelEsqueci({
  emailInicial = "",
  garcom = false,
  ativo = true,
  onVoltar,
  onEnviado,
}: {
  emailInicial?: string;
  garcom?: boolean;
  /** Só foca o campo quando o painel está à vista (no verso do cartão, depois de virar). */
  ativo?: boolean;
  /** Sem `onVoltar`, o link de voltar leva para /entrar. */
  onVoltar?: () => void;
  onEnviado?: (enviado: boolean) => void;
}) {
  const pedir = useServerFn(pedirLinkNovaSenha);
  const [email, setEmail] = useState(emailInicial);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);

  useEffect(() => setEmail((e) => e || emailInicial), [emailInicial]);
  useEffect(() => onEnviado?.(enviado), [enviado]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);
  useEffect(() => {
    if (!ativo || enviado) return;
    const t = window.setTimeout(
      () => document.getElementById("esqueci-email")?.focus({ preventScroll: true }),
      450,
    );
    return () => window.clearTimeout(t);
  }, [ativo, enviado]);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErro("Confira o e-mail: parece que falta alguma parte.");
    setCarregando(true);
    try {
      await pedir({ data: { email, destino: garcom ? "garcom" : "painel" } });
      setEnviado(true);
      setEspera(REENVIO_ESPERA_S);
    } catch (err) {
      const msg = (err as Error).message ?? "";
      setErro(
        msg.includes("Muitas tentativas")
          ? msg
          : "Não conseguimos pedir o link agora. Verifique sua internet e tente de novo.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const voltar = onVoltar ? (
    <button
      type="button"
      onClick={onVoltar}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      <ArrowLeft className="mr-1.5 inline h-4 w-4" />
      Lembrei! Voltar para entrar
    </button>
  ) : (
    <Link to="/entrar" className="font-medium text-foreground underline-offset-4 hover:underline">
      <ArrowLeft className="mr-1.5 inline h-4 w-4" />
      Lembrei! Voltar para entrar
    </Link>
  );

  if (enviado) {
    const caixa = caixaDeEntrada(email);
    return (
      <div className="animate-in fade-in duration-300">
        <TituloCartao titulo="Confira seu e-mail">
          <p>
            Se existir uma conta Tipe com{" "}
            <strong className="font-medium text-foreground">{mascararEmail(email)}</strong>, o link
            para criar uma senha nova chega em instantes.
          </p>
        </TituloCartao>
        <ol className="mt-6 space-y-2.5 rounded-2xl bg-[var(--background-muted)] p-4 text-[0.93rem] leading-relaxed">
          <Passo n={1}>
            Abra o e-mail <strong className="font-medium">“Sua nova senha da Tipe”</strong>.
          </Passo>
          <Passo n={2}>
            Toque em <strong className="font-medium">Criar nova senha</strong>. Vale por 1 hora, uma
            vez só.
          </Passo>
          <Passo n={3}>Não chegou? Olhe o spam e a aba Promoções.</Passo>
        </ol>
        <div className="mt-6 space-y-3">
          {caixa && (
            <Button asChild size="lg" className="w-full">
              <a href={caixa.url} target="_blank" rel="noopener noreferrer">
                <MailCheck className="h-4 w-4" /> Abrir o {caixa.nome}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant={caixa ? "outline" : "default"}
            size="lg"
            className="w-full"
            disabled={espera > 0 || carregando}
            onClick={() => void enviar()}
          >
            {carregando
              ? "Enviando…"
              : espera > 0
                ? `Reenviar link em ${espera}s`
                : "Reenviar link"}
          </Button>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>
        <p className="mt-6 text-[0.92rem] text-muted-foreground">
          Digitou errado?{" "}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-4"
            onClick={() => {
              setEnviado(false);
              setEspera(0);
            }}
          >
            Usar outro e-mail
          </button>
          {" · "}
          {onVoltar ? (
            <button
              type="button"
              onClick={onVoltar}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Voltar para entrar
            </button>
          ) : (
            <Link to="/entrar" className="font-medium text-foreground underline underline-offset-4">
              Voltar para entrar
            </Link>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <TituloCartao titulo="Esqueceu a senha? Acontece.">
        <p>Digite o e-mail da sua conta e mandamos um link seguro para criar uma senha nova.</p>
      </TituloCartao>
      <form onSubmit={enviar} noValidate className="mt-7 space-y-5">
        <div className="space-y-2">
          <label htmlFor="esqueci-email" className="block text-sm font-medium">
            E-mail
          </label>
          <Input
            id="esqueci-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="voce@restaurante.com.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            aria-invalid={!!erro}
            aria-describedby={erro ? "esqueci-erro" : undefined}
          />
          {erro && (
            <p id="esqueci-erro" role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={carregando}>
          {carregando ? "Enviando…" : "Enviar link"}
        </Button>
      </form>
      <p className="mt-6 text-[0.92rem]">{voltar}</p>
    </div>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-[var(--brand-secondary)]"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
