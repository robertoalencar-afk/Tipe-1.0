// Server-only: IA da Lebre e da sugestão de divisão, sem custo por padrão.
// Ordem: Cloudflare Workers AI (cota grátis diária, com teto para nunca gerar cobrança),
// depois Groq (cota grátis), depois Claude só se LEBRE_CLAUDE_FALLBACK=true.
// Se nenhuma responder, lança AIUnavailable e a Lebre avisa que volta mais tarde.
// Lê CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_TOKEN, GROQ_API_KEY. Nunca importe no cliente.

export type AIFile = { name: string; mediaType: string; dataUrl: string };

export class AIUnavailable extends Error {}

type ContentPart =
  { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type ChatMessage = { role: "system" | "user"; content: string | ContentPart[] };

const CF_MODEL = () =>
  process.env["CLOUDFLARE_AI_MODEL"] || "@cf/meta/llama-4-scout-17b-16e-instruct";
const GROQ_TEXT_MODEL = () =>
  process.env["GROQ_MODEL"] || "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_VISION_MODEL = () =>
  process.env["GROQ_VISION_MODEL"] || "meta-llama/llama-4-scout-17b-16e-instruct";

/** Teto diário de chamadas ao Workers AI. No plano Workers Paid, passar da cota grátis
 * (10 mil neurons por dia) é cobrado; ~150 perguntas da Lebre ficam dentro dela. */
export function cloudflareDailyLimit(): number {
  const n = Number(process.env["CLOUDFLARE_AI_DAILY_LIMIT"] ?? "150");
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 150;
}

/** Binding do Workers AI ("ai" no wrangler.jsonc). Não precisa de token: o Worker já tem acesso. */
export type AIBinding = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
  toMarkdown?(files: Array<{ name: string; blob: Blob }>): Promise<Array<{ data?: string }>>;
};

/** O Nitro guarda o env do Worker em globalThis.__env__ a cada requisição. */
export function aiBinding(): AIBinding | null {
  const env = (globalThis as { __env__?: { AI?: AIBinding } }).__env__;
  return env?.AI && typeof env.AI.run === "function" ? env.AI : null;
}

function cloudflareCreds() {
  const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
  const token = process.env["CLOUDFLARE_AI_TOKEN"];
  return accountId && token ? { accountId, token } : null;
}

/** Consome 1 chamada do teto diário de um provedor. Sem banco disponível, nega (prefere não cobrar). */
export async function consumeProviderQuota(
  provider: "cloudflare",
  limit: number,
): Promise<boolean> {
  if (limit <= 0) return false;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc(
      "ai_provider_consume" as never,
      { p_provider: provider, p_limit: limit } as never,
    );
    if (error) {
      console.error("ai_quota", error.message);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error("ai_quota", error);
    return false;
  }
}

/** Transforma PDFs em texto com o conversor da Cloudflare (sem custo para PDF). */
async function pdfToText(file: AIFile): Promise<string | null> {
  const base64 = file.dataUrl.slice(`data:${file.mediaType};base64,`.length);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const binding = aiBinding();
  if (binding?.toMarkdown) {
    try {
      const [doc] = await binding.toMarkdown([
        { name: file.name, blob: new Blob([bytes], { type: "application/pdf" }) },
      ]);
      const text = doc?.data?.trim();
      return text ? text.slice(0, 12_000) : null;
    } catch (error) {
      console.error("ai pdf", error);
      return null;
    }
  }
  const creds = cloudflareCreds();
  if (!creds) return null;
  const form = new FormData();
  form.append(
    "files",
    new Blob([bytes], { type: "application/pdf" }),
    file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`,
  );
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/tomarkdown`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${creds.token}` },
        body: form,
      },
    );
    if (!response.ok) {
      console.error("ai pdf", response.status, (await response.text()).slice(0, 200));
      return null;
    }
    const body = (await response.json()) as { result?: Array<{ data?: string }> };
    const text = body.result?.[0]?.data?.trim();
    return text ? text.slice(0, 12_000) : null;
  } catch (error) {
    console.error("ai pdf", error);
    return null;
  }
}

async function buildMessages(
  system: string,
  question: string,
  files: AIFile[],
): Promise<{ messages: ChatMessage[]; hasImage: boolean }> {
  const parts: ContentPart[] = [];
  const extra: string[] = [];
  for (const file of files) {
    if (!file.dataUrl.startsWith(`data:${file.mediaType};base64,`))
      throw new Error("Anexo inválido.");
    if (file.mediaType === "application/pdf") {
      const text = await pdfToText(file);
      extra.push(
        text
          ? `Conteúdo do PDF "${file.name}":\n${text}`
          : `O PDF "${file.name}" não pôde ser lido. Diga isso ao usuário.`,
      );
    } else {
      parts.push({ type: "image_url", image_url: { url: file.dataUrl } });
    }
  }
  const text = [...extra, question].join("\n\n");
  const hasImage = parts.length > 0;
  const content: ChatMessage["content"] = hasImage ? [...parts, { type: "text", text }] : text;
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    hasImage,
  };
}

class ProviderFailed extends Error {}

async function chatCompletion(
  url: string,
  token: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new ProviderFailed(`rede: ${String(error)}`);
  }
  if (!response.ok)
    throw new ProviderFailed(`${response.status} ${(await response.text()).slice(0, 200)}`);
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new ProviderFailed("resposta vazia");
  return text;
}

/** Texto da resposta do binding: { response } nos modelos @cf, ou choices no formato OpenAI. */
function bindingText(out: unknown): string | undefined {
  const o = out as {
    response?: unknown;
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  if (typeof o?.response === "string") return o.response.trim();
  if (o?.response && typeof o.response === "object") return JSON.stringify(o.response);
  return o?.choices?.[0]?.message?.content?.trim() ?? undefined;
}

async function askCloudflare(messages: ChatMessage[], maxTokens: number): Promise<string> {
  const binding = aiBinding();
  const creds = cloudflareCreds();
  if (!binding && !creds) throw new ProviderFailed("sem credenciais");
  if (!(await consumeProviderQuota("cloudflare", cloudflareDailyLimit())))
    throw new ProviderFailed("teto diário atingido");
  if (binding) {
    let out: unknown;
    try {
      out = await binding.run(CF_MODEL(), { messages, max_tokens: maxTokens, temperature: 0.3 });
    } catch (error) {
      throw new ProviderFailed(`binding: ${String(error)}`);
    }
    const text = bindingText(out);
    if (!text) throw new ProviderFailed("resposta vazia");
    return text;
  }
  return chatCompletion(
    `https://api.cloudflare.com/client/v4/accounts/${creds!.accountId}/ai/v1/chat/completions`,
    creds!.token,
    CF_MODEL(),
    messages,
    maxTokens,
  );
}

async function askGroq(
  messages: ChatMessage[],
  maxTokens: number,
  hasImage: boolean,
): Promise<string> {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new ProviderFailed("sem credenciais");
  return chatCompletion(
    "https://api.groq.com/openai/v1/chat/completions",
    key,
    hasImage ? GROQ_VISION_MODEL() : GROQ_TEXT_MODEL(),
    messages,
    maxTokens,
  );
}

async function askClaudeFallback(opts: {
  system: string;
  question: string;
  files: AIFile[];
  maxTokens: number;
}): Promise<string> {
  if (process.env["LEBRE_CLAUDE_FALLBACK"] !== "true") throw new ProviderFailed("desligado");
  const { askClaude, ClaudeUnavailable } = await import("./claude.server");
  try {
    return await askClaude({
      system: opts.system,
      question: opts.question,
      files: opts.files,
      maxTokens: opts.maxTokens,
    });
  } catch (error) {
    if (error instanceof ClaudeUnavailable) throw new ProviderFailed("sem credenciais");
    throw error;
  }
}

/** Faz uma pergunta à IA e devolve o texto. Tenta os provedores grátis em ordem. */
export async function askAI(opts: {
  system: string;
  question: string;
  files?: AIFile[] | undefined;
  maxTokens?: number;
}): Promise<string> {
  const files = opts.files ?? [];
  const maxTokens = opts.maxTokens ?? 800;
  const { messages, hasImage } = await buildMessages(opts.system, opts.question, files);
  const attempts: Array<[string, () => Promise<string>]> = [
    ["cloudflare", () => askCloudflare(messages, maxTokens)],
    ["groq", () => askGroq(messages, maxTokens, hasImage)],
    [
      "claude",
      () => askClaudeFallback({ system: opts.system, question: opts.question, files, maxTokens }),
    ],
  ];
  let dailyLimitReached = false;
  for (const [name, attempt] of attempts) {
    try {
      return await attempt();
    } catch (error) {
      if (!(error instanceof ProviderFailed)) throw error;
      if (error.message === "teto diário atingido") dailyLimitReached = true;
      if (error.message !== "sem credenciais" && error.message !== "desligado")
        console.warn("ai", name, error.message);
    }
  }
  throw new AIUnavailable(
    dailyLimitReached
      ? "A cota gratuita diária da Lebre foi atingida e não há outro provedor disponível. Tente após a renovação diária ou preencha os dados manualmente."
      : "A Lebre está temporariamente indisponível. Tente novamente em instantes ou preencha os dados manualmente.",
  );
}
