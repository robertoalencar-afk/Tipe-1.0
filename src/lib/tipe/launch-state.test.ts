import { describe, expect, it } from "vitest";
import {
  ESTADOS_LANCAMENTO,
  LANCAMENTO_PADRAO,
  TEXTOS_LANCAMENTO,
  ehEstadoLancamento,
  lerSobrescritaDeTeste,
  statusDoEstado,
} from "./launch-state";

describe("estado de lançamento", () => {
  it("tem exatamente os quatro estados, com o CTA pedido para cada um", () => {
    expect(ESTADOS_LANCAMENTO).toEqual(["em-desenvolvimento", "acesso-antecipado", "piloto", "disponivel"]);
    expect(TEXTOS_LANCAMENTO["em-desenvolvimento"].cta).toBe("Quero conhecer");
    expect(TEXTOS_LANCAMENTO["acesso-antecipado"].cta).toBe("Solicitar acesso antecipado");
    expect(TEXTOS_LANCAMENTO.piloto.cta).toBe("Solicitar demonstração");
    expect(TEXTOS_LANCAMENTO.disponivel.cta).toBe("Contratar");
  });

  it("o Tipe Order começa disponível", () => {
    expect(LANCAMENTO_PADRAO["order"]).toBe("disponivel");
    expect(LANCAMENTO_PADRAO["guest"]).toBeUndefined();
  });

  it("só o estado disponível fica sem selo e vira status disponivel", () => {
    for (const e of ESTADOS_LANCAMENTO) {
      expect(TEXTOS_LANCAMENTO[e].selo === null).toBe(e === "disponivel");
      expect(statusDoEstado(e)).toBe(e === "disponivel" ? "disponivel" : "em-breve");
    }
  });

  it("nenhuma resposta promete data, mês, ano ou número", () => {
    for (const e of ESTADOS_LANCAMENTO) {
      const t = TEXTOS_LANCAMENTO[e];
      const tudo = `${t.quando} ${t.fase} ${t.cta} ${t.tituloFormulario}`;
      expect(tudo).not.toMatch(/\d/);
      expect(tudo).not.toMatch(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|semestre|trimestre/i);
    }
  });

  it("aceita só estados válidos", () => {
    expect(ehEstadoLancamento("piloto")).toBe(true);
    expect(ehEstadoLancamento("beta")).toBe(false);
    expect(ehEstadoLancamento(null)).toBe(false);
  });

  it("lê a variável de teste por produto e ignora valor inválido", () => {
    expect(lerSobrescritaDeTeste("order=piloto", "order")).toBe("piloto");
    expect(lerSobrescritaDeTeste("guest=disponivel, order=acesso-antecipado", "order")).toBe("acesso-antecipado");
    expect(lerSobrescritaDeTeste("order=beta", "order")).toBeNull();
    expect(lerSobrescritaDeTeste(undefined, "order")).toBeNull();
    expect(lerSobrescritaDeTeste("pay=piloto", "order")).toBeNull();
  });
});
