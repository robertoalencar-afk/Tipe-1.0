import { createFileRoute } from "@tanstack/react-router";

// API TIPE: o sistema do restaurante consulta os pagamentos da conta feitos na Tipe.
// Alternativa ao aviso por POST (URL de aviso) para quem não recebe webhooks.
// GET /api/public/pdv/pagamentos?since=ISO
// Cabeçalhos: x-tipe-restaurant, x-tipe-timestamp, x-tipe-signature (v1, mesma chave
// do webhook de entrada), assinando a linha `GET <caminho com query>`.
const json = (b: unknown, status = 200) =>
  Response.json(b, { status, headers: { "cache-control": "no-store" } });

type Linha = {
  id: string;
  table_number: string;
  payment_method: string;
  establishment_method: string | null;
  status: string;
  amount: number;
  item_quantities: unknown;
  created_at: string;
  cash_received: number | null;
  change_due: number | null;
};
const CAMPOS =
  "id, table_number, payment_method, establishment_method, status, amount, item_quantities, created_at, cash_received, change_due";

export const Route = createFileRoute("/api/public/pdv/pagamentos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = request.headers.get("x-tipe-restaurant") ?? "";
        if (!/^[a-z0-9-]{1,64}$/.test(slug)) return json({ error: "unauthorized" }, 401);
        const { rateLimit, logSecurityEvent } = await import("@/lib/tipe/security.server");
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        if (!(await rateLimit(`pdvpay:${slug}:${ip}`, 120, 60)))
          return json({ error: "rate_limited" }, 429);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { apiTipe } = await import("@/lib/tipe/pdv/adapters/api-tipe.server");
        const { data: r } = await supabaseAdmin
          .from("restaurants")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        const { data: conn } = r
          ? ((await supabaseAdmin
              .from("pdv_connections" as never)
              .select("adapter, webhook_secret_hash")
              .eq("restaurant_id", r.id)
              .maybeSingle()) as unknown as {
              data: { adapter: string; webhook_secret_hash: string | null } | null;
            })
          : { data: null };
        // Só a assinatura v1 (o segredo legado em cabeçalho não vale para leitura).
        const assinado = request.headers.has("x-tipe-signature");
        if (
          !r ||
          !conn ||
          conn.adapter !== apiTipe.id ||
          !assinado ||
          !(await apiTipe.validarWebhook(
            request,
            `GET ${url.pathname}${url.search}`,
            conn.webhook_secret_hash,
          ))
        ) {
          if (r)
            await logSecurityEvent({
              action: "pdv_payments_denied",
              resource: "api/pdv/pagamentos",
              result: "denied",
              restaurantId: r.id,
              restaurantSlug: slug,
              detail: `ip=${ip}`,
            });
          return json({ error: "unauthorized" }, 401);
        }
        const since = url.searchParams.get("since");
        const desde =
          since && !Number.isNaN(Date.parse(since))
            ? new Date(since).toISOString()
            : new Date(Date.now() - 86400000).toISOString();
        const [{ data: abertos }, { data: arquivados }] = await Promise.all([
          supabaseAdmin
            .from("table_payment_requests")
            .select(CAMPOS)
            .eq("restaurant_slug", slug)
            .eq("payment_target", "restaurant")
            .gte("updated_at", desde)
            .order("created_at")
            .limit(500),
          // Mesa reaberta: os pagamentos vão para o arquivo e continuam visíveis aqui.
          supabaseAdmin
            .from("archived_payments")
            .select(CAMPOS)
            .eq("restaurant_slug", slug)
            .eq("payment_target", "restaurant")
            .gte("archived_at", desde)
            .order("created_at")
            .limit(500),
        ]);
        const porId = new Map<string, Linha>();
        for (const p of [...((arquivados ?? []) as Linha[]), ...((abertos ?? []) as Linha[])])
          porId.set(p.id, p);
        const payments = [...porId.values()]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((p) => ({
            id: p.id,
            table: p.table_number,
            status: p.status,
            amount: Number(p.amount),
            method:
              p.payment_method === "at_establishment"
                ? (p.establishment_method ?? "at_establishment")
                : p.payment_method,
            items: Object.entries((p.item_quantities ?? {}) as Record<string, number>).map(
              ([code, quantity]) => ({ code, quantity: Number(quantity) }),
            ),
            cash_received: p.cash_received === null ? null : Number(p.cash_received),
            change_due: p.change_due === null ? null : Number(p.change_due),
            created_at: p.created_at,
          }));
        await supabaseAdmin
          .from("pdv_connections" as never)
          .update({ last_sync_at: new Date().toISOString() } as never)
          .eq("restaurant_id", r.id);
        return json({ payments });
      },
    },
  },
});
