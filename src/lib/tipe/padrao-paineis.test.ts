import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(p, "utf8");
const gestao = ler("src/components/tipe/RestaurantPanel.tsx");
const central = ler("src/routes/_authenticated/central.tsx");

describe("padrão visual: Central e Gestão", () => {
  it("usam o mesmo Shell", () => {
    expect(gestao).toContain('from "@/components/tipe/painel/Shell"');
    expect(central).toContain('from "@/components/tipe/painel/Shell"');
  });
  it("passam avatar e cartão de contexto ao Shell", () => {
    for (const f of [gestao, central]) { expect(f).toContain("avatarUrl"); expect(f).toContain("contexto="); }
  });
  it("têm a Lebre", () => {
    expect(gestao).toContain("LazyLebreAssistant");
    expect(central).toContain("LebreCentral");
  });
});
