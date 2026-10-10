import { createFileRoute } from "@tanstack/react-router";

// Recebe relatórios do navegador sobre violações da política de conteúdo (modo de teste).
// Público por natureza: guarda só o essencial, com limite por IP e tamanho máximo.
export const Route = createFileRoute("/api/public/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rateLimit, logSecurityEvent, clientIp } = await import("@/lib/tipe/security.server");
        if (!(await rateLimit(`csp:${clientIp()}`, 30, 60))) return new Response(null, { status: 204 });
        const text = (await request.text()).slice(0, 4000);
        try {
          const body = JSON.parse(text) as Record<string, any>;
          const r = (body["csp-report"] ?? (Array.isArray(body) ? body[0]?.body : body)) as Record<string, any> | undefined;
          const directive = String(r?.["violated-directive"] ?? r?.["effectiveDirective"] ?? r?.["effective-directive"] ?? "?").slice(0, 60);
          const blocked = String(r?.["blocked-uri"] ?? r?.["blockedURL"] ?? "?").slice(0, 150);
          const page = String(r?.["document-uri"] ?? r?.["documentURL"] ?? "?").replace(/[?#].*$/, "").slice(0, 80);
          await logSecurityEvent({ action: "csp_violation", resource: directive, result: "denied", detail: `bloqueado=${blocked} página=${page}` });
        } catch {
          // Corpo inválido: ignora.
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
