// Integração preparada com a WhatsApp Business Platform (Cloud API oficial da Meta).
// Só usa os canais oficiais: verificação do webhook (hub.challenge), assinatura
// X-Hub-Signature-256 com o App Secret e envio pela Graph API. Nada de automação de
// WhatsApp Web ou bibliotecas não oficiais.
//
// Estado atual: o webhook valida e interpreta os eventos, mas ainda não grava no banco,
// porque o CRM roda em modo demonstração (dados no navegador). Ver README do CRM.

export const GRAPH_VERSION = "v21.0";

export type WaConfig = {
  token?: string | undefined;
  appSecret?: string | undefined;
  verifyToken?: string | undefined;
  phoneNumberId?: string | undefined;
};

export type WaInbound = {
  kind: "message";
  from: string;
  name?: string | undefined;
  text: string;
  waMessageId: string;
  at: string;
  phoneNumberId: string;
};
export type WaStatus = {
  kind: "status";
  waMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  at: string;
  recipient: string;
  error?: string | undefined;
};
export type WaEvent = WaInbound | WaStatus;

/** GET do webhook: a Meta envia hub.mode=subscribe, hub.verify_token e hub.challenge. */
export function verifySubscription(
  params: URLSearchParams,
  verifyToken: string | undefined,
): { ok: true; challenge: string } | { ok: false; status: number } {
  if (!verifyToken) return { ok: false, status: 503 };
  if (params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== verifyToken)
    return { ok: false, status: 403 };
  return { ok: true, challenge: params.get("hub.challenge") ?? "" };
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Confere X-Hub-Signature-256 (HMAC-SHA256 do corpo cru com o App Secret), em tempo constante. */
export async function validSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Formato publicado pela Meta para o campo "messages" do webhook (só o que usamos).
type MetaValue = {
  metadata?: { phone_number_id?: string } | undefined;
  contacts?: { wa_id: string; profile?: { name?: string } }[] | undefined;
  messages?:
    | {
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body?: string };
        button?: { text?: string };
      }[]
    | undefined;
  statuses?:
    | {
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
        errors?: { title?: string }[];
      }[]
    | undefined;
};
type Payload = {
  object?: string | undefined;
  entry?: { changes?: { field?: string | undefined; value?: MetaValue | undefined }[] }[];
};

const STATUSES = ["sent", "delivered", "read", "failed"] as const;

/** Converte o corpo do webhook em eventos simples (mensagens de texto e status de entrega). */
export function parseWebhook(body: Payload): WaEvent[] {
  if (body.object !== "whatsapp_business_account") return [];
  const out: WaEvent[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const v = change.value;
      const phoneNumberId = String(v.metadata?.phone_number_id ?? "");
      const names = new Map<string, string>(
        (v.contacts ?? []).map((c) => [String(c.wa_id), String(c.profile?.name ?? "")]),
      );
      for (const m of v.messages ?? []) {
        const text =
          m.type === "text"
            ? String(m.text?.body ?? "")
            : m.type === "button"
              ? String(m.button?.text ?? "")
              : `[${m.type}]`;
        out.push({
          kind: "message",
          from: String(m.from),
          name: names.get(String(m.from)) || undefined,
          text,
          waMessageId: String(m.id),
          at: new Date(Number(m.timestamp) * 1000).toISOString(),
          phoneNumberId,
        });
      }
      for (const s of v.statuses ?? []) {
        const status = STATUSES.find((x) => x === s.status);
        if (!status) continue;
        out.push({
          kind: "status",
          waMessageId: String(s.id),
          status,
          at: new Date(Number(s.timestamp) * 1000).toISOString(),
          recipient: String(s.recipient_id),
          error: s.errors?.[0]?.title,
        });
      }
    }
  }
  return out;
}

/** Envio oficial de texto. Fora da janela de 24h a Meta exige modelo aprovado (sendTemplate). */
export async function sendText(
  cfg: { token: string; phoneNumberId: string },
  to: string,
  body: string,
  fetcher: typeof fetch = fetch,
) {
  return graph(
    cfg,
    { messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } },
    fetcher,
  );
}

export async function sendTemplate(
  cfg: { token: string; phoneNumberId: string },
  to: string,
  name: string,
  params: string[],
  fetcher: typeof fetch = fetch,
) {
  return graph(
    cfg,
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: "pt_BR" },
        components: params.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
          : [],
      },
    },
    fetcher,
  );
}

async function graph(
  cfg: { token: string; phoneNumberId: string },
  payload: unknown,
  fetcher: typeof fetch,
) {
  const res = await fetcher(
    `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string | undefined; code?: number | undefined };
  };
  if (!res.ok)
    return {
      ok: false as const,
      error: json.error?.message ?? `Falha ${res.status}`,
      code: json.error?.code,
      retry: res.status === 429 || res.status >= 500,
    };
  return { ok: true as const, id: json.messages?.[0]?.id ?? "" };
}

export const STATUS_LABEL: Record<WaStatus["status"], string> = {
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};
