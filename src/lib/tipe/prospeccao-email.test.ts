import { describe, expect, it } from "vitest";
import {
  GIF_URL,
  aposEmail,
  assunto,
  linkSair,
  loteEmail,
  montarEmail,
  tokenSair,
  tokenSairValido,
} from "./prospeccao-email";

const p = { id: "3f1c2b8e-1111-4222-8333-444455556661", name: "Cantinho do Peixe" };

describe("montarEmail", () => {
  it("e-mail 1 tem GIF no HTML, texto puro sem imagem e descadastro nos dois", () => {
    const m = montarEmail({
      passo: 1,
      prospect: p,
      remetente: "Roberto Alencar",
      linkSair: "https://tipe.digital/api/public/sair?p=x&t=y",
    });
    expect(m.html).toContain(GIF_URL);
    expect(m.html).toContain('alt="');
    expect(m.texto).not.toContain("[GIF]");
    expect(m.texto).toContain("responda SAIR");
    expect(m.html).toContain("clique aqui");
    expect(m.texto).toContain("Cantinho do Peixe");
    expect(m.html.match(/<img/g)).toHaveLength(1);
  });
  it("lembretes são curtos e sem imagem", () => {
    for (const passo of [2, 3]) {
      const m = montarEmail({
        passo,
        prospect: p,
        remetente: "Roberto Alencar",
        linkSair: "https://x",
      });
      expect(m.html).not.toContain("<img");
      expect(m.texto.length).toBeLessThan(600);
    }
  });
  it("escapa HTML do nome do restaurante", () => {
    const m = montarEmail({
      passo: 1,
      prospect: { ...p, name: "Bar <b>&</b>" },
      remetente: "R",
      linkSair: "https://x",
    });
    expect(m.html).not.toContain("<b>&</b>");
    expect(m.html).toContain("Bar &lt;b&gt;&amp;&lt;/b&gt;");
  });
  it("assunto sem cara de spam e lembrete 1 responde a conversa", () => {
    const a = assunto(1, "Bar X", p.id);
    expect(a).not.toMatch(/[A-Z]{4,}|!|%/);
    expect(a).not.toMatch(/grátis|promo|oferta/i);
    expect(assunto(2, "Bar X", p.id)).toBe(`Re: ${a}`);
  });
});

describe("loteEmail", () => {
  const agora = new Date("2026-11-26T12:00:00Z");
  const base = {
    email: "a@b.com",
    status: "novo",
    score: 50,
    email_step: 0,
    email_next_at: null as string | null,
  };
  it("filtra quem não pode receber e prioriza lembretes, depois score", () => {
    const l = [
      { ...base, id: "1", name: "a", score: 90 },
      { ...base, id: "2", name: "b", email: null },
      { ...base, id: "3", name: "c", status: "opt_out" },
      { ...base, id: "4", name: "d", email_step: 1, email_next_at: "2026-11-26T10:00:00Z" },
      { ...base, id: "5", name: "e", email_step: 1, email_next_at: "2026-11-30T10:00:00Z" },
      { ...base, id: "6", name: "f", email_step: 3 },
      { ...base, id: "7", name: "g", score: 10 },
    ];
    expect(loteEmail(l, agora, 10).map((x) => x.id)).toEqual(["4", "1", "7"]);
    expect(loteEmail(l, agora, 2).map((x) => x.id)).toEqual(["4", "1"]);
    expect(loteEmail(l, agora, 0)).toEqual([]);
  });
  it("agenda D3 e D8 e encerra no 3º", () => {
    expect(aposEmail(1, agora).email_next_at).toBe("2026-11-29T12:00:00.000Z");
    expect(aposEmail(2, agora).email_next_at).toBe("2026-12-01T12:00:00.000Z");
    expect(aposEmail(3, agora).email_next_at).toBeNull();
  });
});

describe("token de descadastro", () => {
  it("valida o próprio token e recusa outro id ou outro segredo", async () => {
    const t = await tokenSair(p.id, "segredo-1");
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await tokenSairValido(p.id, t, "segredo-1")).toBe(true);
    expect(await tokenSairValido("00000000-0000-0000-0000-000000000000", t, "segredo-1")).toBe(
      false,
    );
    expect(await tokenSairValido(p.id, t, "segredo-2")).toBe(false);
    expect(linkSair(p.id, t)).toBe(`https://tipe.digital/api/public/sair?p=${p.id}&t=${t}`);
  });
});
