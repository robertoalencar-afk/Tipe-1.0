// Server-only: chamadas ao Claude (Anthropic) usadas pela Lebre e pela sugestão de divisão.
// Lê ANTHROPIC_API_KEY. Nunca importe em componentes do cliente.
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = process.env["ANTHROPIC_MODEL"] || "claude-opus-5-5";

export type ClaudeFile = { name: string; mediaType: string; dataUrl: string };

export class ClaudeUnavailable extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
  return client;
}

function buildContent(question: string, files: ClaudeFile[] = []): Anthropic.Beta.BetaContentBlockParam[] {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const file of files) {
    const prefix = `data:${file.mediaType};base64,`;
    if (!file.dataUrl.startsWith(prefix)) throw new Error("Anexo inválido.");
    const data = file.dataUrl.slice(prefix.length);
    if (file.mediaType === "application/pdf") {
      content.push({ type: "document", title: file.name, source: { type: "base64", media_type: "application/pdf", data } });
    } else {
      const mediaType = file.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif";
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
  }
  content.push({ type: "text", text: question });
  return content;
}

/** Faz uma pergunta ao Claude e devolve o texto da resposta. */
export async function askClaude(opts: {
  system: string;
  question: string;
  files?: ClaudeFile[] | undefined;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new ClaudeUnavailable("ANTHROPIC_API_KEY não configurada");
  try {
    const response = await anthropic.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildContent(opts.question, opts.files) }],
      output_config: { effort: opts.effort ?? "low" },
      // Se o modelo recusar por política, a própria API tenta outro modelo na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") throw new Error("A Lebre não pode responder a esse pedido.");
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    if (!text) throw new Error("A Lebre não conseguiu responder agora.");
    return text;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new Error("A Lebre recebeu muitas perguntas agora. Tente novamente em instantes.");
    if (error instanceof Anthropic.APIError) {
      console.error("claude", error.status, error.message);
      throw new Error("A Lebre não conseguiu responder agora.");
    }
    throw error;
  }
}
