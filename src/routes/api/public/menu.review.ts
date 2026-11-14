import type { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/menu/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runMenuAssistant } = await import("@/lib/tipe/menu-assistant.server");
        const { data, error } = await (supabaseAdmin as SupabaseClient)
          .from("menu_assistant")
          .select("restaurant_id")
          .eq("enabled", true)
          .lte("next_run", new Date().toISOString())
          .order("next_run")
          .limit(2);
        if (error) return Response.json({ ok: false }, { status: 500 });
        await Promise.all(
          (data ?? []).map((r: { restaurant_id: string }) => runMenuAssistant(r.restaurant_id)),
        );
        return Response.json({ ok: true, reviewed: data?.length ?? 0 });
      },
    },
  },
});
