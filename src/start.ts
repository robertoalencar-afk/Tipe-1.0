import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { erroPublico } from "./lib/tipe/erro-publico";

// Funções do servidor: detalhe de banco/infra nunca chega ao navegador (fica no log).
const publicErrorMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw erroPublico(error);
  }
});

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Cabeçalhos de segurança. frame-ancestors: só a própria TIPE.
const FRAME_ANCESTORS = "'self'";
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const result = await next();
  const h = result.response?.headers;
  if (h) {
    // Respostas de funções do servidor são por usuário: nunca podem ficar em cache do navegador ou da borda.
    if (request.url.includes("/_serverFn") && !h.has("Cache-Control")) h.set("Cache-Control", "private, no-store");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    // geolocation=(self): a fila presencial (/:slug/fila) e o painel pedem a localização uma vez.
    h.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), payment=(self)");
    // CSP completa obrigatória (23/11/2026, testada em 19 telas sem violação). Violações seguem
    // para /api/public/csp-report (security_events, action=csp_violation). Chave de emergência:
    // segredo CSP_ENFORCE=false no Worker volta para Report-Only sem novo deploy de código.
    const cspCompleta =
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://pay.google.com https://applepay.cdn-apple.com https://assets.pagar.me; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: data: https://*.supabase.co; worker-src 'self' blob:; connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://api.pagar.me https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com; frame-src 'self' https://pay.google.com https://*.pagar.me; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${FRAME_ANCESTORS}; report-uri /api/public/csp-report`;
    if (process.env["CSP_ENFORCE"] !== "false") {
      h.set("Content-Security-Policy", `${cspCompleta}; upgrade-insecure-requests`);
    } else {
      h.set("Content-Security-Policy", `frame-ancestors ${FRAME_ANCESTORS}; object-src 'none'; base-uri 'self'; form-action 'self'`);
      h.set("Content-Security-Policy-Report-Only", cspCompleta);
    }
  }
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, publicErrorMiddleware],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
