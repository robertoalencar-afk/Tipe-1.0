import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Resend (eventos de entrega) para o histórico de e-mails da Central Tipe.
 * Assinatura no padrão Svix (svix-id, svix-timestamp, svix-signature) com RESEND_WEBHOOK_SECRET.
 * Sem segredo configurado responde 503 e não processa nada. Idempotente pelo id do evento.
 */
const TIPOS: Record<string, string> = {
  "email.sent": "sent", "email.delivered": "delivered", "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced", "email.complained": "complained", "email.opened": "opened", "email.clicked": "clicked", "email.failed": "failed",
};
// Um evento "menor" nunca rebaixa o status (ex.: delivered depois de opened).
const ORDEM = ["sent", "delivery_delayed", "delivered", "opened", "clicked", "failed", "bounced", "complained", "suppressed"];

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64dec = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function validSvix(raw: string, h: { id: string | null; ts: string | null; sig: string | null }, secret: string) {
  if (!h.id || !h.ts || !h.sig) return false;
  const ts = Number(h.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const key = await crypto.subtle.importKey("raw", b64dec(secret.replace(/^whsec_/, "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperado = b64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h.id}.${h.ts}.${raw}`)));
  return h.sig.split(" ").some((parte) => {
    const [ver, val] = parte.split(",");
    return ver === "v1" && val !== undefined && val.length === esperado.length && timingEq(val, esperado);
  });
}
function timingEq(a: string, b: string) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/resend/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        if (!secret) return new Response(null, { status: 503 });
        const raw = (await request.text()).slice(0, 256_000);
        const h = { id: request.headers.get("svix-id"), ts: request.headers.get("svix-timestamp"), sig: request.headers.get("svix-signature") };
        if (!(await validSvix(raw, h, secret))) return new Response(null, { status: 401 });
        let ev: { type?: string; data?: { email_id?: string; to?: string[]; subject?: string; bounce?: { message?: string } } };
        try { ev = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
        const status = TIPOS[ev.type ?? ""];
        if (!status) return new Response(null, { status: 200 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const { error } = await db.from("email_events").insert({ id: h.id, type: ev.type, resend_id: ev.data?.email_id ?? null, payload: ev.data ?? {} });
        if (error) return new Response(null, { status: 200 }); // já processado (id repetido): idempotente
        if (ev.data?.email_id) {
          const { data: atual } = await db.from("email_log").select("id, status").eq("resend_id", ev.data.email_id).maybeSingle();
          if (atual && ORDEM.indexOf(status) >= ORDEM.indexOf(atual.status))
            await db.from("email_log").update({ status, error: ev.data.bounce?.message ?? null, updated_at: new Date().toISOString() }).eq("id", atual.id);
        }
        return new Response(null, { status: 200 });
      },
    },
  },
});
