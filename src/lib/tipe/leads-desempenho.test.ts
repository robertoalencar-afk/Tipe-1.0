import { describe, expect, it } from "vitest";
import { calcularDesempenho, duracaoCurta, mediana } from "./leads-desempenho";

const agora = Date.parse("2026-11-16T12:00:00Z");
const lead = (id: string, min: number, origem: string | null = null) => ({ id, created_at: new Date(agora - min * 60_000).toISOString(), nome: `Lead ${id}`, contato: "x", origem });
const etapas = [
  { key: "novo", label: "Novo", position: 10, kind: "open" as const },
  { key: "demo", label: "Demo", position: 40, kind: "open" as const },
  { key: "ativo", label: "Ativo", position: 90, kind: "won" as const },
  { key: "perdido", label: "Perdido", position: 100, kind: "lost" as const },
];

describe("calcularDesempenho", () => {
  it("mede tempo da primeira resposta e lista quem aguarda", () => {
    const r = calcularDesempenho({
      agora, dias: 7, leadsAnteriores: 2, etapas, oportunidades: [],
      leads: [lead("a", 120), lead("b", 100), lead("c", 30)],
      respostas: [
        { lead_id: "a", at: new Date(agora - 105 * 60_000).toISOString() }, // 15 min depois
        { lead_id: "a", at: new Date(agora - 20 * 60_000).toISOString() }, // a primeira vale
        { lead_id: "b", at: new Date(agora - 10 * 60_000).toISOString() }, // 90 min
      ],
    });
    expect(r.respondidos).toBe(2);
    expect(r.tempoMedioMin).toBe(53);
    expect(r.ate15Pct).toBe(50);
    expect(r.ate60Pct).toBe(50);
    expect(r.aguardando).toEqual([{ id: "c", nome: "Lead c", contato: "x", minutos: 30 }]);
    expect(r.totalAnterior).toBe(2);
  });
  it("funil é acumulativo e a conversão conta só leads do período", () => {
    const r = calcularDesempenho({
      agora, dias: 7, leadsAnteriores: 0, etapas, respostas: [],
      leads: [lead("a", 60, "instagram"), lead("b", 60), lead("c", 60, "instagram")],
      oportunidades: [
        { lead_id: "a", stage_key: "ativo", status: "won", created_at: "" },
        { lead_id: "b", stage_key: "demo", status: "open", created_at: "" },
        { lead_id: "c", stage_key: "novo", status: "open", created_at: "" },
        { lead_id: "z", stage_key: "perdido", status: "lost", created_at: "" },
      ],
    });
    expect(r.funil.map((f) => f.atingiram)).toEqual([3, 2, 1]);
    expect(r.funil[1]!.passoPct).toBe(67);
    expect(r.ganhos).toBe(1);
    expect(r.conversaoPct).toBe(33.3);
    expect(r.porOrigem[0]).toEqual({ origem: "instagram", total: 2, respondidos: 0, ganhos: 1 });
    expect(r.porOrigem.find((o) => o.origem === "Direto")?.total).toBe(1);
  });
  it("sem leads não quebra", () => {
    const r = calcularDesempenho({ agora, dias: 7, leadsAnteriores: 0, etapas, respostas: [], leads: [], oportunidades: [] });
    expect(r.tempoMedioMin).toBeNull();
    expect(r.porDia).toHaveLength(7);
    expect(r.conversaoPct).toBe(0);
  });
});
describe("helpers", () => {
  it("duração curta e mediana", () => {
    expect(duracaoCurta(null)).toBe("—");
    expect(duracaoCurta(12)).toBe("12 min");
    expect(duracaoCurta(185)).toBe("3 h 05");
    expect(duracaoCurta(3000)).toBe("2 d");
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
});
