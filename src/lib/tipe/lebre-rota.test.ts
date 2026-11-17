import { describe, expect, it } from "vitest";
import { Disjuntor, classificarTarefa, lerRetryAfter, rotaPara } from "./lebre-rota";

describe("Rota da Lebre", () => {
  it("classifica a tarefa", () => {
    expect(classificarTarefa({ hasImage: true, question: "oi", maxTokens: 100 })).toBe("visao");
    expect(classificarTarefa({ hasImage: false, question: "oi", maxTokens: 200 })).toBe("rapida");
    expect(classificarTarefa({ hasImage: false, question: "oi", maxTokens: 800 })).toBe("esperta");
    expect(
      classificarTarefa({ hasImage: false, question: "oi", maxTokens: 200, tarefa: "esperta" }),
    ).toBe("esperta");
  });

  it("pergunta rápida começa no modelo mais rápido; esperta no maior", () => {
    expect(rotaPara("rapida")[0]).toMatchObject({
      provedor: "groq",
      modelo: "llama-3.1-8b-instant",
    });
    expect(rotaPara("esperta").map((c) => c.provedor)).toEqual([
      "cloudflare",
      "groq",
      "groq",
      "openrouter",
      "claude",
    ]);
    expect(rotaPara("visao").every((c) => c.provedor !== "openrouter")).toBe(true);
  });

  it("disjuntor tira do ar quem falhou e respeita o Retry-After", () => {
    let t = 0;
    const d = new Disjuntor(() => t);
    const c = rotaPara("rapida")[0]!;
    d.falhou(c, 429, 30);
    expect(d.disponivel(c)).toBe(false);
    t = 31_000;
    expect(d.disponivel(c)).toBe(true);
    d.falhou(c, 500);
    d.falhou(c, 500);
    t += 39_000;
    expect(d.disponivel(c)).toBe(false);
    d.funcionou(c);
    expect(d.disponivel(c)).toBe(true);
  });

  it("lê Retry-After em segundos ou data", () => {
    expect(lerRetryAfter("12")).toBe(12);
    expect(lerRetryAfter(new Date(10_000).toUTCString(), 0)).toBe(10);
    expect(lerRetryAfter(null)).toBeUndefined();
  });
});
