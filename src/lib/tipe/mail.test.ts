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

import { assinaturaHtml } from "./mail";
describe("assinatura em HTML", () => {
  it("nome em negrito, e-mail e site viram links, HTML é escapado", () => {
    const h = assinaturaHtml("Roberto <b>Alencar</b>\nFundador · Tipe\nroberto@tipe.digital\ntipe.digital");
    expect(h).toContain("&lt;b&gt;");
    expect(h).toContain('href="mailto:roberto@tipe.digital"');
    expect(h).toContain('href="https://tipe.digital"');
    expect(h).toContain("font-weight:700");
  });
  it("assinatura vazia não gera nada", () => {
    expect(assinaturaHtml("  \n ")).toBe("");
  });
});

import { blocoAssinatura, comAssinatura, corpoHtml } from "./mail";
describe("fecho com assinatura", () => {
  const sig = "Roberto Alencar\nFundador · Tipe\nroberto@tipe.digital";
  it("monta o bloco abaixo de Atenciosamente,", () => {
    expect(blocoAssinatura(sig)).toBe("\n\nAtenciosamente,\nRoberto Alencar\nFundador · Tipe\nroberto@tipe.digital");
    expect(blocoAssinatura(null)).toBe("");
  });
  it("acrescenta uma vez só", () => {
    const t = comAssinatura("Olá!", sig);
    expect(t).toContain("Atenciosamente,\nRoberto Alencar");
    expect(comAssinatura(t, sig)).toBe(t);
  });
  it("HTML: assinatura formatada abaixo de Atenciosamente, e citação depois", () => {
    const h = corpoHtml("Olá!\n\nAtenciosamente,\nRoberto Alencar\nFundador · Tipe\nroberto@tipe.digital\n\nEm 16/11, Ana escreveu:\n> oi");
    expect(h).toContain("Atenciosamente,");
    expect(h).toContain("font-weight:700");
    expect(h).toContain('href="mailto:roberto@tipe.digital"');
    expect(h.indexOf("Atenciosamente,")).toBeLessThan(h.indexOf("Ana escreveu"));
  });
  it("sem fecho, vira texto simples", () => {
    expect(corpoHtml("só texto")).not.toContain("font-weight:700");
  });
});

describe("assinatura profissional", () => {
  const h = assinaturaHtml("Equipe Tipe\nAtendimento a restaurantes\ncontato@tipe.digital\ntipe.digital\nTelefone: +55 85 99999-0000\nCTA: Agende uma demonstração | https://tipe.digital/solicitar-demonstracao");
  it("tem logo, rótulos de contato, botão e aviso de confidencialidade", () => {
    expect(h).toContain("tipe-logo-email.png");
    expect(h).toContain(">E-mail<");
    expect(h).toContain(">Site<");
    expect(h).toContain(">Telefone<");
    expect(h).toContain('href="tel:+5585999990000"');
    expect(h).toContain('href="https://tipe.digital/solicitar-demonstracao"');
    expect(h).toContain("Agende uma demonstração");
    expect(h).toContain("confidenciais");
  });
  it("botão só com https e sem aspas no link", () => {
    expect(assinaturaHtml("A\nB\nCTA: Clique | javascript:alert(1)")).not.toContain("javascript:");
    expect(assinaturaHtml('A\nB\nCTA: X | https://a.com/"onmouseover="x')).not.toContain("onmouseover");
  });
});

import { nomeRemetente } from "./mail";
describe("nomeRemetente", () => {
  it("caixa compartilhada vira Equipe Tipe", () => {
    expect(nomeRemetente({ address: "contato@tipe.digital", label: "Contato", signature: "Equipe Tipe\nAtendimento" })).toBe("Equipe Tipe");
  });
  it("caixa pessoal usa o nome completo da assinatura + Tipe", () => {
    expect(nomeRemetente({ address: "roberto@tipe.digital", label: "Roberto", signature: "Roberto Alencar\nFundador · Tipe" })).toBe("Roberto Alencar | Tipe");
  });
  it("sem assinatura usa o rótulo", () => {
    expect(nomeRemetente({ address: "ana@tipe.digital", label: "Ana Lima", signature: null })).toBe("Ana Lima | Tipe");
  });
});
