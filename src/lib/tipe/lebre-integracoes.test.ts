import { describe, expect, it } from "vitest";
import { acharSistema, pareceSegredo, respostaIntegracao } from "./lebre-integracoes";
import { limparMemoria } from "./lebre-memoria";

describe("Lebre e integrações", () => {
  it("acha o sistema pelo nome ou apelido", () => {
    expect(acharSistema("como integro o iFood?")?.id).toBe("ifood");
    expect(acharSistema("uso TOTVS Chef")?.id).toBe("totvs-chef");
    expect(acharSistema("integrar com o pagbank")?.id).toBe("pagseguro");
    expect(acharSistema("conectar a conta azul")?.id).toBe("conta-azul");
  });

  it("dá o passo a passo com onde conseguir a chave", () => {
    const ifood = respostaIntegracao("como integro o iFood?")!;
    expect(ifood).toContain("portal do parceiro iFood");
    expect(ifood).toContain("Configurar › Integrações");
    expect(ifood).toContain("Não cole a chave aqui");
    expect(respostaIntegracao("onde pego a chave do Pagar.me?")).toContain("sk_");
    expect(respostaIntegracao("como conectar o Saipos por arquivo")).toContain("Exporte do Saipos");
    expect(respostaIntegracao("integrar Focus NFe")).toContain("CSC");
  });

  it("lista as integrações quando a pergunta é geral", () => {
    expect(respostaIntegracao("quais integrações vocês têm?")).toContain("iFood");
    expect(respostaIntegracao("qual o prato mais vendido")).toBeNull();
  });

  it("reconhece chave colada e nunca guarda", () => {
    expect(pareceSegredo("minha chave é sk_live_abc123def456ghi789")).toBe(true);
    expect(pareceSegredo("token: 9f8e7d6c5b4a39281706f5e4d3c2b1a0")).toBe(true);
    expect(pareceSegredo("como integro o iFood?")).toBe(false);
    expect(pareceSegredo("lança 2 chopp na mesa 4")).toBe(false);
    expect(limparMemoria("a chave do saipos é a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5")).toBeNull();
  });
});
