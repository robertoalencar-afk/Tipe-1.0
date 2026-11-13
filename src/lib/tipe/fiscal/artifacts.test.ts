import { describe, expect, it, vi } from "vitest";
import { baixarArquivoFiscalFocus, urlArquivoFiscalFocus } from "./artifacts.server";
import { isolarHtmlFiscal } from "./print-document";
const key = `23261112345678000195${"1".repeat(24)}`;
const path = `/notas_fiscais_consumidor/NFe${key}.html`;
describe("arquivos privados do emissor fiscal", () => {
  it("restringe o download ao ambiente, à chave e às pastas do emissor", () => {
    expect(urlArquivoFiscalFocus("homologacao", key, path)?.origin).toBe(
      "https://homologacao.focusnfe.com.br",
    );
    for (const bad of [
      "https://example.com/" + key,
      "//example.com/" + key,
      "/v2/empresas/" + key,
      path + "?token=secret",
      path + "#other",
      path.replace(key, "2".repeat(44)),
      "/arquivos/../v2/" + key,
    ])
      expect(urlArquivoFiscalFocus("producao", key, bad)).toBeNull();
  });
  it("usa autenticação somente no servidor e não segue redirecionamentos", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response("<html>Documento de teste</html>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    const file = await baixarArquivoFiscalFocus(
      { environment: "homologacao", key, path, token: "token-ficticio", kind: "danfe" },
      request,
    );
    expect(file.mime).toBe("text/html");
    expect(request).toHaveBeenCalledWith(
      new URL(path, "https://homologacao.focusnfe.com.br"),
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({ Authorization: `Basic ${btoa("token-ficticio:")}` }),
      }),
    );
  });
  it("preserva o XML sem reformatar ou alterar o documento assinado", async () => {
    const xml = '<?xml version="1.0"?><nfeProc>fixture-assinada</nfeProc>';
    const request = vi
      .fn()
      .mockResolvedValue(new Response(xml, { headers: { "content-type": "application/xml" } }));
    const file = await baixarArquivoFiscalFocus(
      {
        environment: "homologacao",
        key,
        path: `/arquivos/${key}-nfe.xml`,
        token: "token-ficticio",
        kind: "xml",
      },
      request,
    );
    expect(new TextDecoder().decode(file.bytes)).toBe(xml);
  });
  it("recusa conteúdo diferente de documento, PDF inválido e arquivo excessivo", async () => {
    for (const response of [
      new Response("{}", { headers: { "content-type": "application/json" } }),
      new Response("<html>Erro</html>", { headers: { "content-type": "application/pdf" } }),
      new Response("fixture", {
        headers: { "content-type": "text/html", "content-length": String(11 * 1024 * 1024) },
      }),
    ])
      await expect(
        baixarArquivoFiscalFocus(
          { environment: "homologacao", key, path, token: "token-ficticio", kind: "danfe" },
          vi.fn().mockResolvedValue(response),
        ),
      ).rejects.toMatchObject({ motivo: "resultado_incerto" });
  });
  it("não devolve detalhes de erros de transporte", async () => {
    await expect(
      baixarArquivoFiscalFocus(
        { environment: "homologacao", key, path, token: "token-ficticio", kind: "danfe" },
        vi.fn().mockRejectedValue(new Error("token secreto")),
      ),
    ).rejects.toMatchObject({ motivo: "resultado_incerto" });
  });
  it("a política do HTML isolado antecede qualquer conteúdo do emissor", () => {
    const result = isolarHtmlFiscal(
      '<html><script>parent.test()</script><img src="https://example.com/secret"></html>',
    );
    expect(result.startsWith("<!doctype html>")).toBe(true);
    expect(result.indexOf("Content-Security-Policy")).toBeLessThan(result.indexOf("<script>"));
    expect(result).toContain("script-src 'none'");
    expect(result).toContain("img-src data:");
    expect(result).toContain("base-uri 'none'");
  });
});
