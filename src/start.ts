import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) return next();
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

// Cabeçalhos de segurança. CSP limitada a diretivas que não quebram
// Supabase/Google/Lovable (frame-ancestors permite apenas o editor Lovable).
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) return next();
  const result = await next();
  const h = result.response?.headers;
  if (h) {
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    h.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(self)");
    h.set("Content-Security-Policy", "frame-ancestors 'self' https://*.lovable.app https://*.lovable.dev https://lovable.dev https://*.lovableproject.com; object-src 'none'; base-uri 'self'; form-action 'self'");
    h.set(
      "Content-Security-Policy-Report-Only",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://pay.google.com https://applepay.cdn-apple.com https://assets.pagar.me; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.pagar.me https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://ai.gateway.lovable.dev; frame-src 'self' https://pay.google.com https://*.pagar.me; object-src 'none'; base-uri 'self'; report-uri /api/public/csp-report",
    );
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
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
