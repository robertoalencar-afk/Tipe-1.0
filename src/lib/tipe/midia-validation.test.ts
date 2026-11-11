import { describe, expect, it } from "vitest";
import { decodificarImagem } from "./midia-validation";
describe("validação de upload", () => {
  it("recusa HTML disfarçado de PNG", () => {
    expect(() => decodificarImagem(`data:image/png;base64,${btoa("<html>bad</html>")}`)).toThrow(
      /conteúdo/,
    );
  });
  it("recusa base64 inválido e SVG", () => {
    expect(() => decodificarImagem("data:image/png;base64,A")).toThrow();
    expect(() => decodificarImagem("data:image/svg+xml;base64,AAAA")).toThrow();
  });
  it("reconhece a assinatura PNG", () => {
    expect(decodificarImagem("data:image/png;base64,iVBORw0KGgo=").tipo).toBe("image/png");
  });
  it("aplica o limite no servidor", () => {
    expect(() =>
      decodificarImagem(`data:image/jpeg;base64,${btoa("x".repeat(1_500_001))}`),
    ).toThrow(/grande/);
  });
});
