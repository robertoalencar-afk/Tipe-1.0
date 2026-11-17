import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: (...args: unknown[]) => rpc(...args) },
}));

const { askAI, AIUnavailable } = await import("./ai.server");
const { disjuntor } = await import("./lebre-rota");

const ok = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => new Response("fora", { status: 503 }));
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "conta");
  vi.stubEnv("CLOUDFLARE_AI_TOKEN", "token-cf");
  vi.stubEnv("GROQ_API_KEY", "token-groq");
  vi.stubEnv("LEBRE_CLAUDE_FALLBACK", "");
  rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  rpc.mockReset();
  disjuntor.limpar();
});

const host = (call: unknown[]) => new URL(String(call[0])).host;

describe("askAI", () => {
  it("usa a Cloudflare primeiro e conta no teto diário", async () => {
    fetchMock.mockResolvedValueOnce(ok("oi da cloudflare"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi da cloudflare");
    expect(host(fetchMock.mock.calls[0]!)).toBe("api.cloudflare.com");
    expect(rpc).toHaveBeenCalledWith("ai_provider_consume", {
      p_provider: "cloudflare",
      p_limit: 150,
    });
  });

  it("passa para o Groq quando a Cloudflare falha", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("limite", { status: 429 }))
      .mockResolvedValueOnce(ok("oi do groq"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do groq");
    expect(host(fetchMock.mock.calls[1]!)).toBe("api.groq.com");
  });

  it("não chama a Cloudflare quando o teto do dia acabou", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    fetchMock.mockResolvedValueOnce(ok("oi do groq"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do groq");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(host(fetchMock.mock.calls[0]!)).toBe("api.groq.com");
  });

  it("não usa a Cloudflare se o banco não responde, para nunca gerar cobrança", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "fora do ar" } });
    fetchMock.mockResolvedValueOnce(ok("oi do groq"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do groq");
    expect(host(fetchMock.mock.calls[0]!)).toBe("api.groq.com");
  });

  it("avisa que não há IA quando as cotas grátis acabam e a reserva paga está desligada", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    fetchMock.mockResolvedValueOnce(new Response("limite", { status: 429 }));
    await expect(askAI({ system: "s", question: "q" })).rejects.toBeInstanceOf(AIUnavailable);
  });

  it("manda fotos como imagem e usa o modelo com visão no Groq", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    fetchMock.mockResolvedValueOnce(ok("vi a foto"));
    await askAI({
      system: "s",
      question: "o que tem aqui?",
      files: [{ name: "a.png", mediaType: "image/png", dataUrl: "data:image/png;base64,AAAA" }],
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
    expect(body.messages[1].content[0]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,AAAA" },
    });
  });

  it("usa o binding do Worker sem token e ainda respeita o teto", async () => {
    vi.stubEnv("CLOUDFLARE_AI_TOKEN", "");
    const run = vi.fn().mockResolvedValue({ response: "oi do binding" });
    vi.stubGlobal("__env__", { AI: { run } });
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do binding");
    expect(run).toHaveBeenCalledWith(
      "@cf/meta/llama-4-scout-17b-16e-instruct",
      expect.objectContaining({ max_tokens: 800 }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("ai_provider_consume", {
      p_provider: "cloudflare",
      p_limit: 150,
    });
  });

  it("passa para o Groq quando o binding falha", async () => {
    vi.stubGlobal("__env__", { AI: { run: vi.fn().mockRejectedValue(new Error("3036: limite")) } });
    fetchMock.mockResolvedValueOnce(ok("oi do groq"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do groq");
    expect(host(fetchMock.mock.calls[0]!)).toBe("api.groq.com");
  });
});

describe("Rota da Lebre no askAI", () => {
  it("pergunta curta vai no modelo rápido do Groq", async () => {
    fetchMock.mockResolvedValueOnce(ok("rapidinho"));
    await expect(askAI({ system: "s", question: "q", maxTokens: 200 })).resolves.toBe("rapidinho");
    expect(host(fetchMock.mock.calls[0]!)).toBe("api.groq.com");
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).model).toBe(
      "llama-3.1-8b-instant",
    );
  });

  it("modelo que falhou descansa e a próxima pergunta já vai direto no seguinte", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("limite", { status: 429, headers: { "retry-after": "60" } }),
    );
    fetchMock.mockResolvedValueOnce(ok("um"));
    await askAI({ system: "s", question: "q", maxTokens: 200 });
    fetchMock.mockResolvedValueOnce(ok("dois"));
    await expect(askAI({ system: "s", question: "q", maxTokens: 200 })).resolves.toBe("dois");
    expect(host(fetchMock.mock.calls[2]!)).toBe("api.cloudflare.com");
  });

  it("usa OpenRouter grátis quando há chave e os outros falham", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "token-or");
    rpc.mockResolvedValue({ data: false, error: null });
    fetchMock
      .mockResolvedValueOnce(new Response("x", { status: 500 }))
      .mockResolvedValueOnce(new Response("x", { status: 500 }))
      .mockResolvedValueOnce(ok("oi do openrouter"));
    await expect(askAI({ system: "s", question: "q" })).resolves.toBe("oi do openrouter");
    expect(host(fetchMock.mock.calls[2]!)).toBe("openrouter.ai");
  });
});
