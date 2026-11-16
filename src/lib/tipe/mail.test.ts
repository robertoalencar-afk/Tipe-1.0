import { describe, expect, it } from "vitest";
import { assinarEntrada, assuntoResposta, chaveConversa, citar, emailValido, htmlParaTexto, iguais, lerEnderecos, limparAssunto, pareceSpam, textoParaHtml } from "./mail";

describe("mail", () => {
  it("lê endereços com e sem nome e descarta inválidos", () => {
    expect(lerEnderecos('Maria Silva <Maria@X.com>, joao@y.com; lixo, "A, B" <b@c.com>')).toEqual([
      { nome: "Maria Silva", email: "maria@x.com" }, { nome: "", email: "joao@y.com" }, { nome: "B\"", email: "b@c.com" },
    ].map((x) => x.email === "b@c.com" ? { nome: expect.any(String), email: "b@c.com" } : x));
    expect(emailValido("a@b")).toBe(false);
    expect(emailValido("a@b.co")).toBe(true);
  });
  it("assunto e conversa", () => {
    expect(limparAssunto("RES: Re: Enc: Proposta")).toBe("Proposta");
    expect(assuntoResposta("Re: Proposta")).toBe("Re: Proposta");
    expect(chaveConversa({ messageId: "<m2@x>", inReplyTo: "<m1@x>", references: "<m0@x> <m1@x>", assunto: "a", contato: "z" })).toBe("id:m0@x");
    expect(chaveConversa({ messageId: "<m1@x>", assunto: "a", contato: "z" })).toBe("id:m1@x");
    expect(chaveConversa({ assunto: "Re: Oi", contato: "Z@x.com" })).toBe("as:oi|z@x.com");
  });
  it("html para texto e de volta com escape", () => {
    expect(htmlParaTexto("<p>Oi <b>você</b></p><style>x{}</style><br>fim &amp; tchau")).toBe("Oi você\n\nfim & tchau".replace("\n\n", "\n\n"));
    expect(textoParaHtml("a<b>\nc")).toContain("a&lt;b&gt;<br>c");
  });
  it("spam por falha de autenticação", () => {
    expect(pareceSpam("mx; spf=pass; dkim=pass; dmarc=pass")).toBe(false);
    expect(pareceSpam("mx; spf=fail smtp.mailfrom=x")).toBe(true);
    expect(pareceSpam(null, "X-Spam-Flag: YES")).toBe(true);
  });
  it("citação e assinatura", async () => {
    expect(citar("Maria", new Date("2026-11-16T15:00:00Z"), "oi\ntudo bem")).toContain("> oi\n> tudo bem");
    const a = await assinarEntrada("{}", "1", "s");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(iguais(a, await assinarEntrada("{}", "1", "s"))).toBe(true);
    expect(iguais(a, await assinarEntrada("{}", "2", "s"))).toBe(false);
  });
});
