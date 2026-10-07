import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Rotina periódica para adaptadores SEM webhook: consulta apenas mesas abertas.
export const Route = createFileRoute("/api/public/pdv/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getAdaptador, aplicarEventos } = await import("@/lib/tipe/pdv/registry.server");
        const { decryptSecret } = await import("@/lib/tipe/pagarme.server");
        const { data: conns } = await supabaseAdmin.from("pdv_connections" as never).select("restaurant_id, adapter, credentials_encrypted").neq("adapter", "lancamento_tipe") as unknown as { data: { restaurant_id: string; adapter: string; credentials_encrypted: string | null }[] | null };
        let mesas = 0;
        for (const c of conns ?? []) {
          const ad = getAdaptador(c.adapter);
          if (!ad || !ad.capacidades().consultaPeriodica) continue;
          const { data: r } = await supabaseAdmin.from("restaurants").select("slug").eq("id", c.restaurant_id).maybeSingle();
          if (!r) continue;
          const ctx = { restaurantId: c.restaurant_id, slug: r.slug, credenciais: c.credentials_encrypted ? JSON.parse(await decryptSecret(c.credentials_encrypted)) : null };
          const { data: abertas } = await supabaseAdmin.from("table_bill_items").select("table_number").eq("restaurant_slug", r.slug);
          for (const mesa of new Set((abertas ?? []).map((x) => x.table_number))) {
            try { await aplicarEventos(supabaseAdmin, c.restaurant_id, ad.id, await ad.sincronizar(ctx, mesa)); mesas++; }
            catch (e) {
              await supabaseAdmin.from("pdv_connections" as never).update({ status: "error", last_error: String((e as Error).message).slice(0, 200), last_error_at: new Date().toISOString() } as never).eq("restaurant_id", c.restaurant_id);
            }
          }
        }
        return Response.json({ ok: true, mesas });
      },
    },
  },
});
