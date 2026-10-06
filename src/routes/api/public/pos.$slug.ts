import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Integração genérica com qualquer PDV do mercado.
// Autenticação: header "x-tipe-key" com a chave gerada em Integrações.
// POST: o PDV envia pedidos/fechamentos → alimenta a conta da mesa.
// GET ?since=ISO: o PDV busca os pagamentos feitos pelos clientes na TIPE.

const Item = z.object({ code: z.string().trim().min(1).max(32), name: z.string().trim().min(1).max(80), price: z.number().min(0).max(100000), qty: z.number().int().min(1).max(999) });
const Body = z.discriminatedUnion("event", [
  z.object({ event: z.literal("order"), table: z.string().trim().min(1).max(16).regex(/^[0-9A-Za-z]+$/), waiter: z.string().trim().max(80).optional(), items: z.array(Item).min(1).max(100) }),
  z.object({ event: z.literal("close_table"), table: z.string().trim().min(1).max(16) }),
]);

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function auth(request: Request, slug: string) {
  const key = request.headers.get("x-tipe-key") ?? "";
  const { rateLimit, logSecurityEvent } = await import("@/lib/tipe/security.server");
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await rateLimit(`pos:${slug}:${ip}`, 300, 60))) return "limited" as const;
  if (!/^tipe_[0-9a-f]{48}$/.test(key) || !/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r } = await supabaseAdmin.from("restaurants").select("id, slug").eq("slug", slug).maybeSingle();
  if (!r) return null;
  const { data: integ } = await supabaseAdmin.from("pos_integrations").select("key_hash").eq("restaurant_id", r.id).maybeSingle();
  if (!integ?.key_hash) return null;
  const h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)));
  if (!safeEq(h, integ.key_hash)) {
    await logSecurityEvent({ action: "pos_key_denied", resource: "api/pos", result: "denied", restaurantId: r.id, restaurantSlug: r.slug, detail: `ip=${ip}` });
    return null;
  }
  return { admin: supabaseAdmin, rid: r.id as string, slug: r.slug as string };
}

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "cache-control": "no-store" } });
const deny = (a: unknown) => a === "limited" ? json({ error: "rate_limited" }, 429) : json({ error: "unauthorized" }, 401);

export const Route = createFileRoute("/api/public/pos/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const a = await auth(request, params.slug);
        if (!a || a === "limited") return deny(a);
        const since = new URL(request.url).searchParams.get("since");
        const d = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : new Date(Date.now() - 86400000).toISOString();
        const { data } = await a.admin.from("table_payment_requests").select("id, table_number, payment_method, status, amount, item_quantities, created_at, establishment_method, cash_received, change_due")
          .eq("restaurant_slug", a.slug).eq("payment_target", "restaurant").gte("updated_at", d).order("created_at").limit(500);
        await a.admin.from("pos_integrations").update({ last_sync_at: new Date().toISOString(), status: "connected" }).eq("restaurant_id", a.rid);
        return json({ payments: (data ?? []).map((p) => ({ id: p.id, table: p.table_number, method: p.payment_method, establishment_method: p.establishment_method, cash_received: p.cash_received === null ? null : Number(p.cash_received), change_due: p.change_due === null ? null : Number(p.change_due), status: p.status, amount: Number(p.amount), items: p.item_quantities, created_at: p.created_at })) });
      },
      POST: async ({ request, params }) => {
        const a = await auth(request, params.slug);
        if (!a || a === "limited") return deny(a);
        let body: z.infer<typeof Body>;
        try { body = Body.parse(await request.json()); } catch { return json({ error: "invalid_payload" }, 400); }
        const log = (status: string, detail: string) => a.admin.from("pos_sync_log").insert({ restaurant_id: a.rid, event: body.event, status, detail: detail.slice(0, 200) });
        try {
          if (body.event === "order") {
            const { data: t } = await a.admin.from("restaurant_tables").select("id, active").eq("restaurant_id", a.rid).eq("number", body.table).maybeSingle();
            if (!t) await a.admin.from("restaurant_tables").insert({ restaurant_id: a.rid, number: body.table, code: `mesa${body.table.toLowerCase()}` });
            else if (!t.active) { await log("error", `Mesa ${body.table} desativada`); return json({ error: "table_inactive" }, 409); }
            for (const it of body.items) {
              const { data: ex } = await a.admin.from("table_bill_items").select("id, ordered_quantity").eq("restaurant_slug", a.slug).eq("table_number", body.table).eq("item_code", it.code).maybeSingle();
              if (ex) await a.admin.from("table_bill_items").update({ ordered_quantity: ex.ordered_quantity + it.qty, ordered_at: new Date().toISOString() }).eq("id", ex.id);
              else await a.admin.from("table_bill_items").insert({ restaurant_slug: a.slug, table_number: body.table, item_code: it.code, item_name: it.name, unit_price: it.price, ordered_quantity: it.qty, ordered_by: body.waiter ?? "PDV", ordered_at: new Date().toISOString() });
            }
            await log("ok", `Mesa ${body.table}: ${body.items.length} item(ns)`);
          } else {
            const { count } = await a.admin.from("table_payment_requests").select("id", { count: "exact", head: true }).eq("restaurant_slug", a.slug).eq("table_number", body.table).eq("status", "pending");
            if (count) { await log("error", `Mesa ${body.table} com pagamento pendente`); return json({ error: "pending_payments" }, 409); }
            const { error: closeErr } = await a.admin.rpc("archive_and_reopen_table", { p_slug: a.slug, p_table: body.table });
            if (closeErr) { await log("error", `Mesa ${body.table} não encontrada`); return json({ error: "table_not_found" }, 404); }
            await log("ok", `Mesa ${body.table} fechada`);
          }
          await a.admin.from("pos_integrations").update({ last_sync_at: new Date().toISOString(), status: "connected" }).eq("restaurant_id", a.rid);
          return json({ ok: true });
        } catch (e) {
          console.error("pos webhook", e);
          await log("error", "Falha interna");
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
