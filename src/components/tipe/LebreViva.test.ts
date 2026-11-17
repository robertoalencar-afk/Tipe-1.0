import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/tipe/site/MascoteVivo", () => ({ MascoteVivo: () => null }));
const { decidirHumor, SONO_MS, PREOCUPA_MS } = await import("./LebreViva");
const { avisoDasPendencias } = await import("@/lib/tipe/pendencias");

const base = {
  agora: 1_000_000,
  ultimaAtividade: 1_000_000,
  felizAte: 0,
  surpresaAte: 0,
  pendenciaDesde: null,
};

describe("humor da Lebre", () => {
  it("fica normal quando está tudo em dia", () => expect(decidirHumor(base)).toBe("normal"));
  it("comemora quando uma tarefa termina", () =>
    expect(decidirHumor({ ...base, felizAte: base.agora + 1, ultimaAtividade: 0 })).toBe("feliz"));
  it("cochila sem ninguém mexer", () =>
    expect(decidirHumor({ ...base, ultimaAtividade: base.agora - SONO_MS })).toBe("sono"));
  it("acorda surpresa", () =>
    expect(decidirHumor({ ...base, surpresaAte: base.agora + 1 })).toBe("surpresa"));
  it("fica preocupada com pendência antiga", () => {
    expect(decidirHumor({ ...base, pendenciaDesde: base.agora - PREOCUPA_MS })).toBe("preocupada");
    expect(decidirHumor({ ...base, pendenciaDesde: base.agora - 1000 })).toBe("normal");
  });
});

describe("pendências", () => {
  it("soma as ativas e ignora as zeradas", () => {
    const a = avisoDasPendencias([
      { aba: "caixa", rotulo: "Caixa", texto: "x", n: 2 },
      { aba: "pdv", rotulo: "PDV", texto: "y", n: 0 },
    ]);
    expect(a.count).toBe(2);
    expect(a.itens).toHaveLength(1);
  });
});
