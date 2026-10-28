import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  itemName: z.string().min(1).max(80),
  description: z.string().trim().min(3).max(300),
});

export type SplitSuggestion =
  | { ok: true; option: "2" | "3" | "4" | "rest"; reason: string }
  | { ok: false; error: string };

// Sugere a divisão de um item a partir de uma descrição em texto (IA grátis, ver ai.server.ts).
// Não lê nem altera dados da mesa: apenas devolve a sugestão para o cliente confirmar.
export const suggestSplit = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<SplitSuggestion> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`split-ai:${clientIp()}`, 10, 60);
    const instructions =
      'Você ajuda clientes de restaurante a dividir UM item da conta. Opções: "2" (dividido entre duas pessoas), "3" (três pessoas), "4" (quatro pessoas), "rest" (a pessoa paga o item todo / o restante). Se forem mais de 4 pessoas, escolha "4". Responda SOMENTE JSON: {"option":"2|3|4|rest","reason":"frase curta em português, até 12 palavras"}.';
    const { askAI, AIUnavailable } = await import("./ai.server");
    let text: string;
    try {
      text = await askAI({ system: instructions, question: `Item: ${data.itemName}\nDescrição do cliente: ${data.description}`, maxTokens: 200 });
    } catch (error) {
      if (!(error instanceof AIUnavailable)) console.error("split-ai", error);
      return { ok: false, error: "Não foi possível sugerir agora. Escolha a divisão manualmente." };
    }
    const match = text.match(/\{[\s\S]*\}/);
    try {
      const parsed = z.object({ option: z.enum(["2", "3", "4", "rest"]), reason: z.string().max(200) }).parse(JSON.parse(match?.[0] ?? ""));
      return { ok: true, ...parsed };
    } catch {
      return { ok: false, error: "Não entendi a descrição. Escolha a divisão manualmente." };
    }
  });
