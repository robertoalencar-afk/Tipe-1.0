import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  itemName: z.string().min(1).max(80),
  description: z.string().trim().min(3).max(300),
});

export type SplitSuggestion =
  | { ok: true; option: "2" | "3" | "4" | "rest"; reason: string }
  | { ok: false; error: string };

// Sugere a divisão de um item a partir de uma descrição em texto (Lovable AI Gateway).
// Não lê nem altera dados da mesa: apenas devolve a sugestão para o cliente confirmar.
export const suggestSplit = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<SplitSuggestion> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`split-ai:${clientIp()}`, 10, 60);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "Sugestão indisponível no momento." };

    const instructions =
      'Você ajuda clientes de restaurante a dividir UM item da conta. Opções: "2" (dividido entre duas pessoas), "3" (três pessoas), "4" (quatro pessoas), "rest" (a pessoa paga o item todo / o restante). Se forem mais de 4 pessoas, escolha "4". Responda SOMENTE JSON: {"option":"2|3|4|rest","reason":"frase curta em português, até 12 palavras"}.';
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions,
        input: `Item: ${data.itemName}\nDescrição do cliente: ${data.description}`,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });
    if (!res.ok || !res.body) {
      console.error("split-ai", res.status, await res.text().catch(() => ""));
      if (res.status === 429) return { ok: false, error: "Muitas sugestões agora. Tente em alguns segundos." };
      if (res.status === 402) return { ok: false, error: "Sugestão indisponível no momento. Escolha a divisão manualmente." };
      return { ok: false, error: "Não foi possível sugerir agora. Escolha a divisão manualmente." };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch { /* ignora */ }
      }
    }
    const match = text.match(/\{[\s\S]*\}/);
    try {
      const parsed = z.object({ option: z.enum(["2", "3", "4", "rest"]), reason: z.string().max(200) }).parse(JSON.parse(match?.[0] ?? ""));
      return { ok: true, ...parsed };
    } catch {
      return { ok: false, error: "Não entendi a descrição. Escolha a divisão manualmente." };
    }
  });
