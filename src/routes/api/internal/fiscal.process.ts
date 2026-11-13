import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/internal/fiscal/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processarFilaFiscal } = await import("@/lib/tipe/fiscal/outbox.server");
        try {
          return Response.json({ ok: true, ...(await processarFilaFiscal(supabaseAdmin, 5)) });
        } catch {
          return Response.json({ ok: false, error: "fiscal_queue" }, { status: 503 });
        }
      },
    },
  },
});
