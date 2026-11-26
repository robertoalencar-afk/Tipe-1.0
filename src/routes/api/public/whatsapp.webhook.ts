import { createFileRoute } from "@tanstack/react-router";
import { parseWebhook, validSignature, verifySubscription, type WaEvent } from "@/lib/tipe/crm/whatsapp";

type Novo = { conv: any; texto: string };

async function persistir(events: WaEvent[]): Promise<{ db: any; novos: Novo[] }> {
  const novos: Novo[] = [];
  if (!events.length) return { db: null, novos };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  for (const ev of events) {
    if (ev.kind === "status") {
      const { error } = await db.from("wa_messages").update({ status: ev.status, error: ev.error ?? null }).eq("wa_message_id", ev.waMessageId);
      if (error) throw error;
      continue;
    }
    const phone = ev.from.replace(/\D/g, "");
    if (!phone) continue;
    let { data: conv } = await db.from("wa_conversations").select("*").eq("phone", phone).maybeSingle();
    if (!conv) {
      // Liga ao lead pelo telefone (com ou sem o 55) para a ficha única do CRM.
      const local = phone.startsWith("55") ? phone.slice(2) : phone;
      const { data: lead } = await db.from("restaurant_leads").select("id, contact_name").or(`phone.ilike.%${local.slice(-8)}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const ins = await db.from("wa_conversations").insert({ phone, name: ev.name ?? lead?.contact_name ?? null, lead_id: lead?.id ?? null }).select("*").single();
      conv = ins.data;
      if (ins.error) throw ins.error;
      if (!conv) throw new Error("Não foi possível criar a conversa do WhatsApp");
    }
    const { error } = await db.from("wa_messages").insert({ conversation_id: conv.id, wa_message_id: ev.waMessageId, direction: "in", body: ev.text, status: "received", at: ev.at, raw: { phoneNumberId: ev.phoneNumberId } });
    if (error) {
      if (error.code === "23505") continue; // wa_message_id repetido: reenvio idempotente da Meta
      throw error;
    }
    const { error: updateError } = await db.from("wa_conversations").update({ unread: (conv.unread ?? 0) + 1, last_message_at: ev.at, last_inbound_at: ev.at, status: "open", ...(ev.name && !conv.name ? { name: ev.name } : {}) }).eq("id", conv.id);
    if (updateError) throw updateError;
    if (conv.lead_id) await db.from("crm_activities").insert({ lead_id: conv.lead_id, kind: "whatsapp", title: "WhatsApp recebido", body: ev.text.slice(0, 2000) });
    conv.unread = (conv.unread ?? 0) + 1;
    novos.push({ conv, texto: ev.text });
  }
  return { db, novos };
}

/** A Lebre responde cada mensagem nova. Falha dela nunca derruba o webhook: a conversa fica para a equipe. */
async function atender(db: any, novos: Novo[]) {
  if (!db || !novos.length) return;
  const { atenderComLebre } = await import("@/lib/tipe/crm/lebre-whatsapp.server");
  for (const n of novos) {
    try {
      await atenderComLebre(db, n.conv, n.texto);
    } catch (e) {
      console.error("[whatsapp] lebre:", (e as Error).message);
      await db.from("wa_conversations").update({ precisa_humano: true, motivo_humano: "A Lebre não conseguiu responder" }).eq("id", n.conv.id);
    }
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
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > 3_000_000)
          return new Response(null, { status: 413 });
        if (!(await validSignature(raw, request.headers.get("x-hub-signature-256"), secret)))
          return new Response(null, { status: 401 });
        let events: ReturnType<typeof parseWebhook> = [];
        try {
          events = parseWebhook(JSON.parse(raw));
        } catch {
          return new Response(null, { status: 400 });
        }
        // Persistência na Central Tipe (wa_conversations / wa_messages), idempotente por wa_message_id.
        let gravado: Awaited<ReturnType<typeof persistir>>;
        try {
          gravado = await persistir(events);
        } catch (e) {
          console.error("[whatsapp] falha ao gravar:", (e as Error).message);
          // Não confirmar um evento que não foi persistido: a Meta poderá reenviá-lo.
          return new Response(null, { status: 500 });
        }
        // Só depois de gravar: uma mensagem repetida pela Meta não chega aqui de novo (wa_message_id único).
        await atender(gravado.db, gravado.novos);
        return new Response(null, { status: 200 });
      },
    },
  },
});
