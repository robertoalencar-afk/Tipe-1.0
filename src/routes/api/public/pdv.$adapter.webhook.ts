import { createFileRoute } from "@tanstack/react-router";

// Endpoint genérico de webhook por adaptador: /api/public/pdv/{adaptador}/webhook
// Cabeçalho obrigatório: x-tipe-restaurant (endereço do restaurante na TIPE).
// A validação de assinatura/segredo é feita pelo próprio adaptador.
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/pdv/$adapter/webhook")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const slug = request.headers.get("x-tipe-restaurant") ?? "";
        if (!/^[a-z0-9_]{2,40}$/.test(params.adapter) || !/^[a-z0-9-]{1,64}$/.test(slug)) return json({ error: "unauthorized" }, 401);
        const { rateLimit, logSecurityEvent } = await import("@/lib/tipe/security.server");
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        if (!(await rateLimit(`pdvwh:${slug}:${ip}`, 300, 60))) return json({ error: "rate_limited" }, 429);
        const { getAdaptador, aplicarEventos } = await import("@/lib/tipe/pdv/registry.server");
        const adaptador = getAdaptador(params.adapter);
        if (!adaptador || !adaptador.capacidades().webhook) return json({ error: "unknown_adapter" }, 404);
        const corpo = await request.text();
        if (corpo.length > 200_000) return json({ error: "payload_too_large" }, 413);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: r } = await supabaseAdmin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
        const { data: conn } = r
          ? await supabaseAdmin.from("pdv_connections" as never).select("adapter, webhook_secret_hash").eq("restaurant_id", r.id).maybeSingle() as unknown as { data: { adapter: string; webhook_secret_hash: string | null } | null }
          : { data: null };
        // Só aceita o adaptador principal configurado para o restaurante.
        if (!r || !conn || conn.adapter !== adaptador.id || !(await adaptador.validarWebhook(request, corpo, conn.webhook_secret_hash))) {
          if (r) await logSecurityEvent({ action: "pdv_webhook_denied", resource: `api/pdv/${params.adapter}`, result: "denied", restaurantId: r.id, restaurantSlug: slug, detail: `ip=${ip}` });
          return json({ error: "unauthorized" }, 401);
        }
        let eventos;
        try { eventos = adaptador.receberEvento(JSON.parse(corpo)); } catch { return json({ error: "invalid_payload" }, 400); }
        const results = await aplicarEventos(supabaseAdmin, r.id, adaptador.id, eventos);
        return json({ results });
      },
    },
  },
});
