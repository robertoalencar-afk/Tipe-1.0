import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/tipe/menu-intelligence.functions", () => ({ getMenuAssistant: vi.fn() }));
const { FALAS, saudacao } = await import("./LebreMascote");

describe("falas da Lebre", () => {
  it("cumprimenta conforme a hora", () => {
    expect(saudacao(3)).toMatch(/madrugada/);
    expect(saudacao(9)).toMatch(/Bom dia/);
    expect(saudacao(15)).toMatch(/Boa tarde/);
    expect(saudacao(20)).toMatch(/Boa noite/);
  });
  it("cada fala é curta e as frases prontas são comandos que a Lebre entende", () => {
    for (const f of FALAS) expect(f.t.length).toBeLessThanOrEqual(30);
    expect(FALAS.filter((f) => f.pergunta).length).toBeGreaterThanOrEqual(6);
  });
});
