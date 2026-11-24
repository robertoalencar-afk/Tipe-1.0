import { useCallback, useEffect, useRef, useState } from "react";

// CAPTCHA do Cloudflare Turnstile para login, cadastro e criação de conta (Supabase Auth).
// Desligado enquanto VITE_TURNSTILE_SITE_KEY não existir no build: o formulário segue igual.
// Ordem para ligar: 1) publicar com a site key; 2) só então ativar o CAPTCHA no Supabase
// (Authentication › Attack Protection) com a secret key. Ao contrário, ninguém entra.
export const TURNSTILE_SITE_KEY =
  (import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined) ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let carregando: Promise<TurnstileApi> | null = null;
function carregarTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  carregando ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"));
    s.onerror = () => {
      carregando = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

/**
 * Devolve o token atual (undefined sem chave configurada), o elemento do desafio e `reset`,
 * que precisa ser chamado depois de cada tentativa (o token só vale uma vez).
 */
export function useTurnstile() {
  const ativo = TURNSTILE_SITE_KEY.length > 0;
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!ativo || !ref.current) return;
    let vivo = true;
    carregarTurnstile()
      .then((t) => {
        if (!vivo || !ref.current) return;
        widget.current = t.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "pt-br",
          size: "flexible",
          callback: (tk: string) => {
            setToken(tk);
            setFalhou(false);
          },
          "expired-callback": () => setToken(undefined),
          "error-callback": () => {
            setToken(undefined);
            setFalhou(true);
          },
        });
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [ativo]);

  const reset = useCallback(() => {
    if (!ativo) return;
    setToken(undefined);
    window.turnstile?.reset(widget.current);
  }, [ativo]);

  const elemento = ativo ? (
    <div className="space-y-1">
      <div ref={ref} />
      {falhou && (
        <p className="text-xs text-destructive">
          Não foi possível carregar a verificação de segurança. Recarregue a página.
        </p>
      )}
    </div>
  ) : null;

  /** Para passar em `options` do Supabase Auth: vazio quando o CAPTCHA está desligado. */
  const opcoes = ativo && token ? { captchaToken: token } : {};
  /** true quando o CAPTCHA está ligado e ainda não há token: o botão deve esperar. */
  const pendente = ativo && !token;

  return { elemento, opcoes, pendente, reset };
}

export const MSG_CAPTCHA_FALHOU =
  "Falha na verificação de segurança. Recarregue a página e tente de novo.";

/** true quando o Supabase recusou o login/cadastro pelo CAPTCHA (e não pela senha). */
export function ehErroCaptcha(
  error: { code?: string | undefined; message?: string | undefined } | null | undefined,
): boolean {
  if (!error) return false;
  return error.code === "captcha_failed" || /captcha/i.test(error.message ?? "");
}
