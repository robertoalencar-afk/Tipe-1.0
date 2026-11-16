import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderErrorPage, renderOfflinePage } from "./error-page";

describe("páginas de erro estáticas", () => {
  it("500 em português, na marca, sem detalhes internos", () => {
    const html = renderErrorPage();
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("A cozinha derrubou a bandeja");
    expect(html).toContain("/marca/tipe-logo.svg");
    expect(html).not.toMatch(/stack|Error:|undefined/);
  });

  it("public/offline.html é a mesma página gerada pelo código", () => {
    const arquivo = readFileSync(new URL("../../public/offline.html", import.meta.url), "utf8");
    expect(arquivo.trim()).toBe(renderOfflinePage().trim());
  });
});
