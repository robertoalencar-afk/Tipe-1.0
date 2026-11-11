// Cliente mínimo da API REST do AI Gateway (endpoint compatível com OpenAI).
// Docs: https://developers.cloudflare.com/ai-gateway/usage/rest-api/
// A chamada passa pelo gateway indicado em `cf-aig-gateway-id`; não é uma chamada
// direta ao Workers AI sem gateway.

export const CF_API_BASE = "https://api.cloudflare.com/client/v4";

export interface GatewayConfig {
  accountId: string;
  apiToken: string;
  gatewayId: string;
  timeoutMs: number;
}

export interface CacheOptions {
  key: string;
  ttlSeconds: number;
}

export interface GatewayResult {
  answer: string;
  /** Valor literal de `cf-aig-cache-status`, ou null se o gateway não o enviou. */
  cacheStatus: string | null;
  logId: string | null;
  upstreamStatus: number;
}

export class GatewayError extends Error {
  constructor(
    readonly kind: "timeout" | "network" | "auth" | "rate_limited" | "upstream" | "bad_response",
    readonly upstreamStatus: number | null,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export function chatCompletionsUrl(accountId: string): string {
  return `${CF_API_BASE}/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;
}

export async function callGateway(
  config: GatewayConfig,
  body: unknown,
  cache: CacheOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<GatewayResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let res: Response;
  try {
    res = await fetchImpl(chatCompletionsUrl(config.accountId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        "cf-aig-gateway-id": config.gatewayId,
        "cf-aig-cache-key": cache.key,
        "cf-aig-cache-ttl": String(cache.ttlSeconds),
        // Timeout do lado do gateway um pouco abaixo do nosso, para ele responder antes.
        "cf-aig-request-timeout": String(Math.max(1000, config.timeoutMs - 1000)),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new GatewayError("timeout", null, `AI Gateway não respondeu em ${config.timeoutMs} ms`);
    }
    throw new GatewayError("network", null, "Falha de rede ao chamar o AI Gateway");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Corpo de erro é descartado: pode ecoar detalhes da conta.
    await res.body?.cancel();
    const kind =
      res.status === 401 || res.status === 403
        ? "auth"
        : res.status === 429
          ? "rate_limited"
          : "upstream";
    throw new GatewayError(kind, res.status, `AI Gateway respondeu ${res.status}`);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new GatewayError("bad_response", res.status, "Resposta do AI Gateway não é JSON");
  }

  const answer = extractAnswer(payload);
  if (!answer) {
    throw new GatewayError("bad_response", res.status, "Resposta do modelo sem texto");
  }

  return {
    answer,
    cacheStatus: res.headers.get("cf-aig-cache-status"),
    logId: res.headers.get("cf-aig-log-id"),
    upstreamStatus: res.status,
  };
}

function extractAnswer(payload: unknown): string | null {
  const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}
