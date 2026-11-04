import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useMatches,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/tipe/PrivacyPreferences";
import { ErroPagina, botaoPrimario, botaoSecundario } from "@/components/tipe/ErroPagina";
import { AvisoSemInternet } from "@/components/tipe/AvisoSemInternet";
import { WhatsAppFloat } from "@/components/tipe/WhatsAppFloat";
import { BarraNavegacao } from "@/components/tipe/BarraNavegacao";
import { captureAttribution, loadMeasurement } from "@/lib/tipe/tracking";
import {
  carregarSupabase,
  EVENTO_SUPABASE_PRONTO,
  temSessaoSalva,
} from "@/integrations/supabase/lazy";

function NotFoundComponent() {
  return (
    <ErroPagina
      codigo="Erro 404"
      titulo="Essa página saiu da mesa"
      texto="O endereço pode ter mudado ou foi digitado com algum detalhe diferente. Se você leu o QR Code da mesa, peça ao garçom um código novo."
      acoes={
        <>
          <Link to="/" className={botaoPrimario}>
            Ir para a página inicial
          </Link>
          <a href="/ajuda" className={botaoSecundario}>
            Abrir a Central de ajuda
          </a>
        </>
      }
    />
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const [ref] = useState(() => Date.now().toString(36).toUpperCase());
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <ErroPagina
      codigo={offline ? "Sem internet" : "Erro 500"}
      titulo={offline ? "Você está sem internet" : "Esta página não carregou"}
      texto={
        offline
          ? "Confira o Wi-Fi ou os dados móveis. Nenhum pagamento é feito sem confirmação, então dá para tentar de novo com segurança."
          : "Algo deu errado do nosso lado, não do seu. Tente de novo em instantes. Se você estava pagando, nada é cobrado duas vezes."
      }
      detalhe={offline ? undefined : ref}
      acoes={
        <>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={botaoPrimario}
          >
            Tentar de novo
          </button>
          <a href="/" className={botaoSecundario}>
            Ir para a página inicial
          </a>
        </>
      }
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TIPE | Pague. Sem esperar. | Pagamento na mesa por QR Code" },
      {
        name: "description",
        content:
          "Plataforma TIPE: o cliente paga a conta pelo QR Code da mesa e o restaurante acompanha tudo em tempo real. Funciona com o PDV que você já usa. Entre na lista de espera para o lançamento.",
      },
      {
        property: "og:title",
        content: "TIPE | Pague. Sem esperar. | Pagamento na mesa por QR Code",
      },
      {
        property: "og:description",
        content:
          "Plataforma TIPE: o cliente paga a conta pelo QR Code da mesa e o restaurante acompanha tudo em tempo real. Funciona com o PDV que você já usa. Entre na lista de espera para o lançamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Fontes auto-hospedadas (ver @font-face em styles.css): sem domínio de terceiros no caminho do primeiro texto.
      {
        rel: "preload",
        href: "/fonts/inter-tight-latin-var.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.png?v=3", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png?v=3" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Ouvinte de login. O supabase-js só é baixado se já houver sessão salva ou quando
  // alguma tela criar o cliente (entrar, painel, CRM...); landing e mesa não pagam esse peso.
  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;
    const assinar = () => {
      window.removeEventListener(EVENTO_SUPABASE_PRONTO, assinar);
      void carregarSupabase().then((supabase) => {
        if (!ativo || cancelar) return;
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
          router.invalidate();
          if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
        });
        cancelar = () => data.subscription.unsubscribe();
      });
    };
    if (temSessaoSalva()) assinar();
    else window.addEventListener(EVENTO_SUPABASE_PRONTO, assinar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_SUPABASE_PRONTO, assinar);
      cancelar?.();
    };
  }, [router, queryClient]);

  // Atribuição (UTM/indicação) e medição só após consentimento.
  useEffect(() => {
    captureAttribution();
    // Página da mesa do cliente fica sem scripts de medição para carregar rápido no 4G fraco.
    if (
      /^\/(mesa\/)?[^/]+\/[^/]+$/.test(window.location.pathname) &&
      !/^\/(legal|privacidade|produtos|_authenticated)\//.test(window.location.pathname)
    )
      return;
    loadMeasurement();
    const on = () => loadMeasurement();
    window.addEventListener("tipe:consent", on);
    return () => window.removeEventListener("tipe:consent", on);
  }, []);

  // Dentro de um iframe (simulador embutido na landing) o aviso de cookies e o
  // botão do WhatsApp já aparecem na página que contém o iframe.
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => setEmbedded(window.self !== window.top), []);
  // Na conta da mesa o aviso cobria o botão de pagar. Lá nada opcional carrega
  // sem consentimento (loadMeasurement só roda com escolha salva), então o aviso
  // fica para as demais páginas.
  const naContaDaMesa = useMatches({
    select: (matches) => matches.some((match) => match.routeId === "/$restaurante/$mesa"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BarraNavegacao />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
      <AvisoSemInternet />
      {!embedded && !naContaDaMesa && <CookieBanner />}
      {!embedded && <WhatsAppFloat />}
    </QueryClientProvider>
  );
}
