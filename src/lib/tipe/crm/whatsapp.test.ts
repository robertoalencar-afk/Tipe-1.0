import { describe, expect, it } from "vitest";
import { parseWebhook, sendText, validSignature, verifySubscription } from "./whatsapp";

describe("webhook do WhatsApp", () => {
  it("verifica a assinatura do Meta (hub.challenge)", () => {
    const p = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "segredo", "hub.challenge": "123" });
    expect(verifySubscription(p, "segredo")).toEqual({ ok: true, challenge: "123" });
    expect(verifySubscription(p, "outro")).toEqual({ ok: false, status: 403 });
    expect(verifySubscription(p, undefined)).toEqual({ ok: false, status: 503 });
  });

  it("aceita só corpo assinado com o App Secret", async () => {
    const body = '{"object":"whatsapp_business_account"}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("app"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await validSignature(body, `sha256=${sig}`, "app")).toBe(true);
    expect(await validSignature(body + " ", `sha256=${sig}`, "app")).toBe(false);
    expect(await validSignature(body, null, "app")).toBe(false);
  });

  it("interpreta mensagens e status de entrega", () => {
    const events = parseWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {
      metadata: { phone_number_id: "PN1" }, contacts: [{ wa_id: "5585900000001", profile: { name: "Carla" } }],
      messages: [{ from: "5585900000001", id: "wamid.1", timestamp: "1761000000", type: "text", text: { body: "Oi" } }],
      statuses: [{ id: "wamid.2", status: "failed", timestamp: "1761000100", recipient_id: "5585900000002", errors: [{ title: "Fora da janela de 24h" }] }],
    } }] }] });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ kind: "message", from: "5585900000001", name: "Carla", text: "Oi", phoneNumberId: "PN1" });
    expect(events[1]).toMatchObject({ kind: "status", status: "failed", error: "Fora da janela de 24h" });
  });

  it("trata erro da Graph API e sinaliza quando vale tentar de novo", async () => {
    const fake = (async () => new Response(JSON.stringify({ error: { message: "Rate limit", code: 130429 } }), { status: 429 })) as unknown as typeof fetch;
    const r = await sendText({ token: "t", phoneNumberId: "PN1" }, "5585900000001", "Olá", fake);
    expect(r).toMatchObject({ ok: false, retry: true, error: "Rate limit" });
  });
});
