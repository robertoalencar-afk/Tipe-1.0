import {
  buildRefundChatRequest,
  REFUND_CACHE_KEY,
  REFUND_CACHE_TTL_SECONDS,
  REFUND_FAQ,
} from "./faq";
import { callGateway, GatewayError } from "./gateway";

export interface WorkerEnv {
  // Segredos: `wrangler secret put` em produção, `.dev.vars` localmente.
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  // Variáveis públicas (wrangler.jsonc).
  ENVIRONMENT?: string;
  AI_GATEWAY_ID?: string;
  AI_MODEL?: string;
  UPSTREAM_TIMEOUT_MS?: string;
  ALLOWED_ORIGINS?: string;
  FAQ_RATE_LIMITER?: RateLimit;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const DEFAULT_TIMEOUT_MS = 15000;
const PROVIDER = "cloudflare-workers-ai";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const started = Date.now();
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (url.pathname !== "/faq/refund") {
      return errorResponse(404, "not_found", "Rota não encontrada.", cors);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return errorResponse(405, "method_not_allowed", "Use GET nesta rota.", {
        ...cors,
        Allow: "GET, OPTIONS",
      });
    }
    // A resposta é fixa: qualquer parâmetro é recusado para não sugerir personalização
    // e para manter a requisição idêntica (requisito do cache).
    if (url.search !== "") {
      return errorResponse(400, "invalid_parameters", "Esta rota não aceita parâmetros.", cors);
    }

    if (env.FAQ_RATE_LIMITER) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const { success } = await env.FAQ_RATE_LIMITER.limit({ key: `faq-refund:${ip}` });
      if (!success) {
        log("rate_limited", { durationMs: Date.now() - started });
        return errorResponse(429, "rate_limited", "Muitas requisições. Tente em 1 minuto.", {
          ...cors,
          "Retry-After": "60",
        });
      }
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
    if (!accountId || !apiToken) {
      log("config_missing", { hasAccountId: !!accountId, hasToken: !!apiToken });
      return errorResponse(500, "config_missing", "Serviço não configurado.", cors);
    }

    const model = env.AI_MODEL?.trim() || DEFAULT_MODEL;
    try {
      const result = await callGateway(
        {
          accountId,
          apiToken,
          gatewayId: env.AI_GATEWAY_ID?.trim() || "default",
          timeoutMs: parseTimeout(env.UPSTREAM_TIMEOUT_MS),
        },
        buildRefundChatRequest(model),
        { key: REFUND_CACHE_KEY, ttlSeconds: REFUND_CACHE_TTL_SECONDS },
      );

      log("faq_served", {
        cacheStatus: result.cacheStatus ?? "absent",
        upstreamStatus: result.upstreamStatus,
        durationMs: Date.now() - started,
      });

      const headers: Record<string, string> = { ...cors };
      // Propaga apenas o valor real; se o gateway não enviou, o header não é inventado.
      if (result.cacheStatus !== null) headers["cf-aig-cache-status"] = result.cacheStatus;

      return json(
        200,
        {
          success: true,
          faq: REFUND_FAQ.id,
          question: REFUND_FAQ.question,
          answer: result.answer,
          cache: {
            key: REFUND_CACHE_KEY,
            status: result.cacheStatus,
            ttl: REFUND_CACHE_TTL_SECONDS,
          },
          provider: PROVIDER,
          model,
          gateway: { logId: result.logId },
          disclaimer: "Política fictícia de exemplo. Não é orientação jurídica.",
        },
        headers,
      );
    } catch (err) {
      const e =
        err instanceof GatewayError ? err : new GatewayError("upstream", null, "Erro inesperado");
      log("faq_failed", {
        kind: e.kind,
        upstreamStatus: e.upstreamStatus,
        durationMs: Date.now() - started,
      });
      if (e.kind === "timeout") {
        return errorResponse(504, "upstream_timeout", "O provedor de IA demorou demais.", cors);
      }
      return errorResponse(502, "upstream_unavailable", "Provedor de IA indisponível.", cors);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;

function parseTimeout(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1000 && n <= 60000 ? n : DEFAULT_TIMEOUT_MS;
}

function corsHeaders(request: Request, env: WorkerEnv): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "cf-aig-cache-status",
  };
  if (allowed.includes("*")) headers["Access-Control-Allow-Origin"] = "*";
  else if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      // Sem cache paralelo: o cache é o do AI Gateway.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string>,
): Response {
  return json(status, { success: false, error: { code, message } }, headers);
}

// Logs técnicos: nunca token, account ID, IP ou corpo da resposta.
function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, route: "/faq/refund", ...fields }));
}
