import { describe, expect, it } from "vitest";
import { haQuanto, tarefasAgora, type EntradaAgora } from "./agora";

const agora = new Date("2026-10-19T21:00:00Z");
const base: EntradaAgora = {
  incidentes: 0,
  pendentes: [],
  syncErro: false,
  alertasCancelamento: [],
  quitadas: [],
  notas: [],
  agora,
};
const pend = (id: string, mesa: string, created_at: string) => ({
  id,
  table_number: mesa,
  customer_name: "Ana Souza",
  amount: 42.5,
  created_at,
  establishment_method: "cash",
  cash_received: 50,
  change_due: 7.5,
});

describe("tarefasAgora", () => {
  it("fica vazio quando está tudo em dia", () => {
    expect(tarefasAgora(base)).toEqual([]);
  });

  it("põe dinheiro em risco antes de cliente esperando e mesa quitada", () => {
    const t = tarefasAgora({
      ...base,
      quitadas: [{ number: "4", total: 120 }],
      pendentes: [pend("p1", "12", "2026-10-19T20:50:00Z")],
      incidentes: 2,
      syncErro: true,
    });
    expect(t.map((x) => x.tipo)).toEqual(["pendencia", "sincronizacao", "confirmar", "quitada"]);
    expect(t[0]!.titulo).toBe("2 pendências financeiras");
  });

  it("lista o pagamento no local mais antigo primeiro, com troco e tempo de espera", () => {
    const t = tarefasAgora({
      ...base,
      pendentes: [
        pend("novo", "7", "2026-10-19T20:58:00Z"),
        pend("velho", "12", "2026-10-19T20:40:00Z"),
      ],
    });
    expect(t.map((x) => x.pagamentoId)).toEqual(["velho", "novo"]);
    expect(t[0]!.detalhe).toContain("troco de R$");
    expect(t[0]!.detalhe).toContain("há 20 min");
    expect(t[0]!.destino).toEqual({ mesa: "12" });
  });

  it("ignora cancelamento bloqueado e nota baixa com mais de um dia", () => {
    const t = tarefasAgora({
      ...base,
      alertasCancelamento: [{ id: "a", detail: "x", created_at: "2026-10-17T20:00:00Z" }],
      notas: [
        { stars: 1, comment: "demorou", table: "3", at: "2026-10-17T20:00:00Z", garcom: "Carlos" },
        { stars: 2, comment: "frio", table: "5", at: "2026-10-19T20:00:00Z", garcom: "Bia" },
        { stars: 4, comment: "ok", table: "6", at: "2026-10-19T20:00:00Z", garcom: "Bia" },
      ],
    });
    expect(t.map((x) => x.titulo)).toEqual(["Nota 2 na mesa 5"]);
  });
});

describe("haQuanto", () => {
  it("escreve minutos, horas e dias", () => {
    expect(haQuanto("2026-10-19T20:59:40Z", agora)).toBe("agora");
    expect(haQuanto("2026-10-19T20:15:00Z", agora)).toBe("há 45 min");
    expect(haQuanto("2026-10-19T18:00:00Z", agora)).toBe("há 3 h");
    expect(haQuanto("2026-10-17T18:00:00Z", agora)).toBe("há 2 d");
  });
});
