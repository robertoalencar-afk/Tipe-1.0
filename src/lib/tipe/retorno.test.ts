import { describe, expect, it } from "vitest";
import { caminhoRetornoSeguro } from "./retorno";

describe("caminhoRetornoSeguro", () => {
  it("aceita painel, cozinha e outras áreas internas", () => {
    expect(caminhoRetornoSeguro("/mare-alta")).toBe("/mare-alta");
    expect(caminhoRetornoSeguro("/mare-alta/cozinha")).toBe("/mare-alta/cozinha");
    expect(caminhoRetornoSeguro("/cadastro")).toBe("/cadastro");
  });
  it("recusa redirecionamento aberto e lixo", () => {
    for (const ruim of [
      "https://evil.com", "//evil.com", "/\\evil.com", "/a/../b", "/a?x=1", "/a#b",
      "/a/%2e%2e", "javascript:alert(1)", "", "mare", "/a/b/c/d", "/ a", undefined, 42,
    ]) expect(caminhoRetornoSeguro(ruim)).toBeUndefined();
  });
});
