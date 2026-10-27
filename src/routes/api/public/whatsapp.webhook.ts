import { createFileRoute } from "@tanstack/react-router";
import { parseWebhook, validSignature, verifySubscription } from "@/lib/tipe/crm/whatsapp";

// Webhook oficial da WhatsApp Business Platform para o CRM.
// Preparado e testado, mas desligado enquanto não houver credenciais: sem
// WHATSAPP_VERIFY_TOKEN/WHATSAPP_APP_SECRET ele responde 503 e não processa nada.
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = verifySubscription(new URL(request.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
        return r.ok ? new Response(r.challenge, { status: 200, headers: { "Content-Type": "text/plain" } }) : new Response(null, { status: r.status });
      },
      POST: async ({ request }) => {
        const secret = process.env.WHATSAPP_APP_SECRET;
        if (!secret) return new Response(null, { status: 503 });
        const raw = (await request.text()).slice(0, 256_000);
        if (!(await validSignature(raw, request.headers.get("x-hub-signature-256"), secret))) return new Response(null, { status: 401 });
        let events: ReturnType<typeof parseWebhook> = [];
        try { events = parseWebhook(JSON.parse(raw)); } catch { return new Response(null, { status: 400 }); }
        // Próximo passo em produção: gravar em crm_messages / crm_wa_logs (migração do CRM),
        // localizando a organização pelo phone_number_id da instância.
        console.info(`[whatsapp] ${events.length} evento(s) válidos recebidos`);
        // A Meta reenvia o que não recebe 200: confirmamos rápido e processamos depois.
        return new Response(null, { status: 200 });
      },
    },
  },
});
