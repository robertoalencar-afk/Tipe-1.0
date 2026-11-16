import { describe, expect, it } from "vitest";
import { calcularRanking, metasDoGarcom, notaSuavizada, type DadosGarcom } from "./garcom-ranking";

const g = (id: string, o: Partial<DadosGarcom> = {}): DadosGarcom => ({ id, name: id, active: true, tips: 0, tipCount: 0, ratingAvg: null, ratingCount: 0, tablesPaid: 0, ...o });

describe("ranking de garçons", () => {
  it("ordena por pontos e dá destaque ao 1º com atividade mínima", () => {
    const r = calcularRanking([g("ana", { tips: 100, tipCount: 10, ratingAvg: 5, ratingCount: 10, tablesPaid: 30 }), g("bia", { tips: 50, ratingAvg: 4, ratingCount: 4, tablesPaid: 10 })]);
    expect(r.map((x) => x.id)).toEqual(["ana", "bia"]);
    expect(r[0]!.posicao).toBe(1);
    expect(r[0]!.destaque).toBe(true);
    expect(r[1]!.destaque).toBe(false);
  });
  it("sem atividade mínima ninguém é destaque", () => {
    expect(calcularRanking([g("ana", { tablesPaid: 2, tips: 10 })])[0]!.destaque).toBe(false);
  });
  it("garçom inativo fica fora do ranking", () => {
    expect(calcularRanking([g("ana"), g("zé", { active: false, tips: 999 })]).map((x) => x.id)).toEqual(["ana"]);
  });
  it("empate divide a posição", () => {
    const r = calcularRanking([g("a"), g("b")]);
    expect(r.map((x) => x.posicao)).toEqual([1, 1]);
  });
  it("uma avaliação 5 não passa de quem tem muitas 4,8", () => {
    expect(notaSuavizada(5, 1)!).toBeLessThan(notaSuavizada(4.8, 40)!);
    expect(notaSuavizada(null, 0)).toBeNull();
  });
  it("metas: nota só conta com avaliações mínimas", () => {
    const m = metasDoGarcom({ tablesPaid: 25, ratingAvg: 5, ratingCount: 2, tipCount: 3 });
    expect(m.find((x) => x.chave === "mesas")!.cumprida).toBe(true);
    expect(m.find((x) => x.chave === "nota")!.cumprida).toBe(false);
    expect(m.find((x) => x.chave === "gorjetas")!.progresso).toBeCloseTo(0.3);
  });
});
