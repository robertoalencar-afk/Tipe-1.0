// TESTES COM UPSTREAM SIMULADO. Nenhuma chamada real à Cloudflare acontece aqui.
// O "gateway falso" imita o contrato documentado do cache do AI Gateway
// (chave customizada + TTL + header cf-aig-cache-status) para validar o Worker.
// A prova real de MISS -> HIT é feita por scripts/verify-cache.mjs contra a Cloudflare.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type WorkerEnv } from "../src/index";
import { REFUND_CACHE_KEY, REFUND_CACHE_TTL_SECONDS } from "../src/faq";

const TOKEN = "test-token-NAO-REAL";
const ACCOUNT = "acc123";

const baseEnv: WorkerEnv = {
  CLOUDFLARE_API_TOKEN: TOKEN,
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
  AI_GATEWAY_ID: "default",
  AI_MODEL: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  UPSTREAM_TIMEOUT_MS: "5000",
  ALLOWED_ORIGINS: "https://tipe.digital",
};

interface Captured {
  url: string;
  headers: Headers;
  body: string;
}

/** Gateway simulado: guarda a resposta por cf-aig-cache-key até expirar o TTL. */
function fakeGateway(opts: { sendCacheHeader?: boolean } = {}) {
  const store = new Map<string, { body: string; expiresAt: number }>();
  const calls: Captured[] = [];
  let inferences = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const body = String(init?.body);
    calls.push({ url: String(input), headers, body });

    const key = headers.get("cf-aig-cache-key")!;
    const ttl = Number(headers.get("cf-aig-cache-ttl"));
    const hit = store.get(key);
    const extra: Record<string, string> = { "cf-aig-log-id": `log-${calls.length}` };

    if (hit && hit.expiresAt > Date.now()) {
      if (opts.sendCacheHeader !== false) extra["cf-aig-cache-status"] = "HIT";
      return new Response(hit.body, { status: 200, headers: extra });
    }
    inferences++;
    const fresh = JSON.stringify({
      choices: [{ message: { content: `Resposta gerada #${inferences}` } }],
      usage: { prompt_tokens: 100, completion_tokens: 40 },
    });
    store.set(key, { body: fresh, expiresAt: Date.now() + ttl * 1000 });
    if (opts.sendCacheHeader !== false) extra["cf-aig-cache-status"] = "MISS";
    return new Response(fresh, { status: 200, headers: extra });
  });

  return { fetchMock, calls, inferences: () => inferences };
}

const get = (path = "/faq/refund", init?: RequestInit) =>
  new Request(`https://faq.example.com${path}`, init);

async function call(env: WorkerEnv, req = get()) {
  const res = await worker.fetch(req, env);
  return { res, body: (await res.json()) as Record<string, any> };
}

let logSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  logSpy.mockRestore();
});

describe("[simulado] GET /faq/refund com cache do gateway", () => {
  it("primeira chamada MISS, segunda HIT, mesma resposta e sem nova inferência", async () => {
    const gw = fakeGateway();
    vi.stubGlobal("fetch", gw.fetchMock);

    const first = await call(baseEnv);
    expect(first.res.status).toBe(200);
    expect(first.res.headers.get("cf-aig-cache-status")).toBe("MISS");
    expect(first.body.cache).toEqual({ key: "faq:refund:v1", status: "MISS", ttl: 3600 });

    const second = await call(baseEnv);
    expect(second.res.status).toBe(200);
    expect(second.res.headers.get("cf-aig-cache-status")).toBe("HIT");
    expect(second.body.cache.status).toBe("HIT");
    expect(second.body.answer).toBe(first.body.answer);
    expect(gw.inferences()).toBe(1);

    expect(first.body).toMatchObject({
      success: true,
      faq: "refund",
      question: "Como funciona o reembolso?",
      provider: "cloudflare-workers-ai",
    });
  });

  it("após expirar o TTL volta a ser MISS e gera nova inferência", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const gw = fakeGateway();
    vi.stubGlobal("fetch", gw.fetchMock);

    await call(baseEnv);
    vi.setSystemTime(Date.now() + (REFUND_CACHE_TTL_SECONDS - 1) * 1000);
    expect((await call(baseEnv)).body.cache.status).toBe("HIT");
    vi.setSystemTime(Date.now() + 2000);
    const after = await call(baseEnv);
    expect(after.body.cache.status).toBe("MISS");
    expect(gw.inferences()).toBe(2);
  });

  it("envia ao endpoint REST do AI Gateway os headers e o corpo determinístico", async () => {
    const gw = fakeGateway();
    vi.stubGlobal("fetch", gw.fetchMock);
    await call(baseEnv);
    await call(baseEnv);

    const [a, b] = gw.calls;
    expect(a!.url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/v1/chat/completions`,
    );
    expect(a!.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(a!.headers.get("cf-aig-gateway-id")).toBe("default");
    expect(a!.headers.get("cf-aig-cache-key")).toBe(REFUND_CACHE_KEY);
    expect(a!.headers.get("cf-aig-cache-ttl")).toBe("3600");
    expect(a!.body).toBe(b!.body);
    const parsed = JSON.parse(a!.body);
    expect(parsed).toMatchObject({ temperature: 0, stream: false, model: baseEnv.AI_MODEL });
    expect(parsed.messages[1].content).toContain("7 dias");
  });

  it("não inventa status quando o gateway não envia cf-aig-cache-status", async () => {
    vi.stubGlobal("fetch", fakeGateway({ sendCacheHeader: false }).fetchMock);
    const { res, body } = await call(baseEnv);
    expect(res.status).toBe(200);
    expect(res.headers.has("cf-aig-cache-status")).toBe(false);
    expect(body.cache.status).toBeNull();
  });

  it("nunca expõe o token na resposta nem nos logs", async () => {
    vi.stubGlobal("fetch", fakeGateway().fetchMock);
    const { res, body } = await call(baseEnv);
    const raw = JSON.stringify(body) + JSON.stringify([...res.headers]);
    expect(raw).not.toContain(TOKEN);
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(ACCOUNT);
  });
});

describe("[simulado] validação e falhas", () => {
  it("405 para métodos diferentes de GET", async () => {
    const { res, body } = await call(baseEnv, get("/faq/refund", { method: "POST" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, OPTIONS");
    expect(body.success).toBe(false);
  });

  it("404 para rotas desconhecidas", async () => {
    expect((await call(baseEnv, get("/faq/outra"))).res.status).toBe(404);
  });

  it("400 para parâmetros na query", async () => {
    const { res, body } = await call(baseEnv, get("/faq/refund?lang=en"));
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_parameters");
  });

  it("500 quando faltam segredos, sem chamar o upstream", async () => {
    const gw = fakeGateway();
    vi.stubGlobal("fetch", gw.fetchMock);
    const { res, body } = await call({ ...baseEnv, CLOUDFLARE_API_TOKEN: "" });
    expect(res.status).toBe(500);
    expect(body.error.code).toBe("config_missing");
    expect(gw.fetchMock).not.toHaveBeenCalled();
  });

  it("502 quando o provedor falha, sem vazar o corpo do erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"errors":[{"message":"conta acc123 detalhe"}]}', { status: 500 }),
      ),
    );
    const { res, body } = await call(baseEnv);
    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("acc123");
  });

  it("502 quando a autenticação no gateway falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    );
    expect((await call(baseEnv)).res.status).toBe(502);
  });

  it("502 quando a resposta do modelo vem sem texto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ choices: [] })),
    );
    expect((await call(baseEnv)).res.status).toBe(502);
  });

  it("504 quando o upstream estoura o timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("x", "AbortError")),
            );
          }),
      ),
    );
    const { res, body } = await call({ ...baseEnv, UPSTREAM_TIMEOUT_MS: "1000" });
    expect(res.status).toBe(504);
    expect(body.error.code).toBe("upstream_timeout");
  });

  it("429 quando o rate limiter recusa", async () => {
    const gw = fakeGateway();
    vi.stubGlobal("fetch", gw.fetchMock);
    const limiter = { limit: vi.fn(async () => ({ success: false })) } as unknown as RateLimit;
    const { res } = await call({ ...baseEnv, FAQ_RATE_LIMITER: limiter });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(gw.fetchMock).not.toHaveBeenCalled();
  });
});

describe("[simulado] CORS", () => {
  it("libera só origens permitidas e responde preflight", async () => {
    vi.stubGlobal("fetch", fakeGateway().fetchMock);
    const ok = await call(
      baseEnv,
      get("/faq/refund", { headers: { Origin: "https://tipe.digital" } }),
    );
    expect(ok.res.headers.get("access-control-allow-origin")).toBe("https://tipe.digital");
    expect(ok.res.headers.get("access-control-expose-headers")).toContain("cf-aig-cache-status");

    const bad = await call(
      baseEnv,
      get("/faq/refund", { headers: { Origin: "https://evil.example" } }),
    );
    expect(bad.res.headers.has("access-control-allow-origin")).toBe(false);

    const pre = await worker.fetch(get("/faq/refund", { method: "OPTIONS" }), baseEnv);
    expect(pre.status).toBe(204);
  });
});
