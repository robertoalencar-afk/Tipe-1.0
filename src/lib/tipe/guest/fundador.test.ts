import { describe, expect, it } from "vitest";
import { contarEtapas, ETAPAS_FUNDADOR, metricasReservas } from "./fundador";

describe("Fundador na Central", () => {
  it("conta todas as etapas, na ordem, com zero nas vazias", () => {
    const c = contarEtapas(["interessado", "interessado", "piloto", "encerrado"]);
    expect(c.map((x) => x.etapa).slice(0, 7)).toEqual([...ETAPAS_FUNDADOR]);
    expect(c.find((x) => x.etapa === "interessado")?.n).toBe(2);
    expect(c.find((x) => x.etapa === "ativo")?.n).toBe(0);
  });

  it("métricas agregadas sem dado do cliente e taxa de falta só sobre reservas fechadas", () => {
    const m = metricasReservas([
      { restaurant_id: "a", status: "concluida", party_size: 2 },
      { restaurant_id: "a", status: "nao_compareceu", party_size: 4 },
      { restaurant_id: "b", status: "cancelada_cliente", party_size: 3 },
      { restaurant_id: "b", status: "confirmada", party_size: 2 },
    ]);
    expect(m.total).toEqual({ reservas: 4, pessoas: 11, canceladas: 1, faltas: 1, honradas: 1 });
    expect(m.taxaFalta).toBe(0.5);
    expect(m.porRestaurante.get("b")?.reservas).toBe(2);
  });
});
