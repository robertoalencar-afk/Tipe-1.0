import { createFileRoute } from "@tanstack/react-router";
import { parseWebhook, validSignature, verifySubscription, type WaEvent } from "@/lib/tipe/crm/whatsapp";

async function persistir(events: WaEvent[]) {
  if (!events.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  for (const ev of events) {
    if (ev.kind === "status") {
      await db.from("wa_messages").update({ status: ev.status, error: ev.error ?? null }).eq("wa_message_id", ev.waMessageId);
      continue;
    }
    const phone = ev.from.replace(/\D/g, "");
    if (!phone) continue;
    let { data: conv } = await db.from("wa_conversations").select("id, unread, lead_id, name").eq("phone", phone).maybeSingle();
    if (!conv) {
      // Liga ao lead pelo telefone (com ou sem o 55) para a ficha única do CRM.
      const local = phone.startsWith("55") ? phone.slice(2) : phone;
      const { data: lead } = await db.from("restaurant_leads").select("id, contact_name").or(`phone.ilike.%${local.slice(-8)}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const ins = await db.from("wa_conversations").insert({ phone, name: ev.name ?? lead?.contact_name ?? null, lead_id: lead?.id ?? null }).select("id, unread, lead_id, name").single();
      conv = ins.data;
      if (!conv) continue;
    }
    const { error } = await db.from("wa_messages").insert({ conversation_id: conv.id, wa_message_id: ev.waMessageId, direction: "in", body: ev.text, status: "received", at: ev.at, raw: { phoneNumberId: ev.phoneNumberId } });
    if (error) continue; // wa_message_id repetido: a Meta reenviou, nada a fazer
    await db.from("wa_conversations").update({ unread: (conv.unread ?? 0) + 1, last_message_at: ev.at, last_inbound_at: ev.at, status: "open", ...(ev.name && !conv.name ? { name: ev.name } : {}) }).eq("id", conv.id);
    if (conv.lead_id) await db.from("crm_activities").insert({ lead_id: conv.lead_id, kind: "whatsapp", title: "WhatsApp recebido", body: ev.text.slice(0, 2000) });
  }
}

// Webhook oficial da WhatsApp Business Platform para o CRM.
// Preparado e testado, mas desligado enquanto não houver credenciais: sem
// WHATSAPP_VERIFY_TOKEN/WHATSAPP_APP_SECRET ele responde 503 e não processa nada.
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = verifySubscription(
          new URL(request.url).searchParams,
          process.env["WHATSAPP_VERIFY_TOKEN"],
        );
        return r.ok
          ? new Response(r.challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
          : new Response(null, { status: r.status });
      },
      POST: async ({ request }) => {
        const secret = process.env["WHATSAPP_APP_SECRET"];
        if (!secret) return new Response(null, { status: 503 });
        const raw = (await request.text()).slice(0, 256_000);
        if (!(await validSignature(raw, request.headers.get("x-hub-signature-256"), secret)))
          return new Response(null, { status: 401 });
        let events: ReturnType<typeof parseWebhook> = [];
        try {
          events = parseWebhook(JSON.parse(raw));
        } catch {
          return new Response(null, { status: 400 });
        }
        // Persistência na Central Tipe (wa_conversations / wa_messages), idempotente por wa_message_id.
        try {
          await persistir(events);
        } catch (e) {
          console.error("[whatsapp] falha ao gravar:", (e as Error).message);
        }
        // A Meta reenvia o que não recebe 200: confirmamos sempre.
        return new Response(null, { status: 200 });
      },
    },
  },
});
