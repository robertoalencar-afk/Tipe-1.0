import { describe, expect, it } from "vitest";
import { passosAtivacaoFiscal } from "./ativacao";

const base = {
  homologacao: null,
  producao: null,
  perfis: 0,
  notaHomologacaoAutorizada: false,
  impressaoTestada: false,
};

describe("passo a passo de ativação da NFC-e", () => {
  it("começa sem nada concluído", () => {
    expect(passosAtivacaoFiscal(base).every((p) => !p.feito)).toBe(true);
  });
  it("só marca produção quando o ambiente de produção está habilitado", () => {
    const passos = passosAtivacaoFiscal({
      ...base,
      homologacao: { enabled: true },
      perfis: 3,
      notaHomologacaoAutorizada: true,
      impressaoTestada: true,
    });
    expect(passos.find((p) => p.id === "producao")?.feito).toBe(false);
    expect(passos.filter((p) => p.feito)).toHaveLength(7);
    const tudo = passosAtivacaoFiscal({
      ...base,
      homologacao: { enabled: true },
      producao: { enabled: true },
      perfis: 1,
      notaHomologacaoAutorizada: true,
      impressaoTestada: true,
    });
    expect(tudo.every((p) => p.feito)).toBe(true);
  });
  it("leva a nota de teste para homologação e a produção para o ambiente de produção", () => {
    const passos = passosAtivacaoFiscal(base);
    expect(passos.find((p) => p.id === "nota-teste")?.ambiente).toBe("homologacao");
    expect(passos.find((p) => p.id === "producao")?.ambiente).toBe("producao");
  });
});
