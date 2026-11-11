import { describe, expect, it } from "vitest";
import {
  DEFINICOES,
  MODALIDADES,
  ORDEM_SELETOR,
  estaContratavel,
  recomendar,
  resumoParaCrm,
} from "./modalidades";
import { REGRAS_MODALIDADE, idDoEvento, podeCancelarItem, podeMudarStatus } from "./eventos";

describe("catálogo de modalidades", () => {
  it("tem as sete modalidades, Mesas primeiro no seletor", () => {
    expect(MODALIDADES).toHaveLength(7);
    expect(ORDEM_SELETOR[0]).toBe("mesas");
    expect(new Set(ORDEM_SELETOR).size).toBe(MODALIDADES.length);
  });
  it("só mesas é operacional; comanda, pulseira e delivery não são contratáveis", () => {
    expect(DEFINICOES.mesas.disponibilidade).toBe("operacional");
    expect(estaContratavel("balcao")).toBe(true);
    expect(estaContratavel("comanda")).toBe(false);
    expect(estaContratavel("pulseira")).toBe(false);
    expect(estaContratavel("delivery")).toBe(false);
    expect(estaContratavel("totem")).toBe(false);
  });
  it("toda modalidade tem motivo, fluxo e regra de pedido", () => {
    for (const m of MODALIDADES) {
      expect(DEFINICOES[m].motivo.length).toBeGreaterThan(20);
      expect(DEFINICOES[m].fluxo.length).toBeGreaterThanOrEqual(5);
      expect(REGRAS_MODALIDADE[m]).toBeDefined();
    }
  });
});

describe("recomendação do configurador", () => {
  it("restaurante com mesas: Pay, Order, Cozinha, Equipe e Gestão disponíveis", () => {
    const r = recomendar({ estabelecimento: "restaurante", modalidades: ["mesas"], comoPedem: "celular", melhorias: ["fechamento"] });
    expect(r.disponiveis).toEqual(["pay", "order", "kitchen", "staff", "restaurant"]);
    expect(r.futuros).toEqual([]);
    expect(r.frase).toBe("Para o seu restaurante, sugerimos Tipe Pay, Tipe Order, Tipe Cozinha, Tipe Equipe e Tipe Gestão.");
  });
  it("beach club com pulseira: Order fica futuro porque depende de modalidade planejada", () => {
    const r = recomendar({ estabelecimento: "beach_club", modalidades: ["pulseira"], comoPedem: "combinacao", melhorias: [] });
    const order = r.modulos.find((m) => m.modulo === "order");
    expect(order?.disponibilidade).toBe("planejada");
    expect(r.futuros).toContain("order");
    expect(r.modalidadesFuturas).toEqual(["pulseira"]);
  });
  it("lanchonete com totem e balcão registra interesse em totem e não promete o totem", () => {
    const r = recomendar({ estabelecimento: "lanchonete", modalidades: ["balcao", "totem"], comoPedem: "balcao", melhorias: ["caixa"] });
    expect(r.interesseTotem).toBe(true);
    expect(r.futuros).toContain("totem");
    expect(r.disponiveis).toContain("kitchen");
    expect(resumoParaCrm({ estabelecimento: "lanchonete", modalidades: ["balcao", "totem"], comoPedem: "balcao", melhorias: ["caixa"] }, r)).toContain("Interesse em totem de autoatendimento: sim");
  });
  it("nunca gera preço", () => {
    const r = recomendar({ estabelecimento: null, modalidades: [], comoPedem: null, melhorias: [] });
    expect(JSON.stringify(r)).not.toMatch(/R\$/);
    expect(r.disponiveis).toEqual(["pay", "restaurant"]);
  });
});

describe("contratos de evento", () => {
  it("id determinístico: repetir o mesmo evento dá o mesmo id", () => {
    const a = idDoEvento({ tipo: "pedido_criado", pedidoId: "x", chaveRequisicao: "abc12345", canal: "mesa", modalidade: "mesas" });
    const b = idDoEvento({ tipo: "pedido_criado", pedidoId: "y", chaveRequisicao: "abc12345", canal: "mesa", modalidade: "mesas" });
    expect(a).toBe(b);
  });
  it("item pago não se cancela; status só anda pelas transições permitidas", () => {
    const item = { code: "a", nome: "A", precoUnitario: 100, quantidade: 1, setor: "kitchen" as const, status: "recebido" as const };
    expect(podeCancelarItem(item)).toBe(true);
    expect(podeCancelarItem(item, 0.5)).toBe(false);
    expect(podeMudarStatus("aguardando_pagamento", "preparando")).toBe(false);
    expect(podeMudarStatus("aguardando_pagamento", "recebido")).toBe(true);
    expect(podeMudarStatus("entregue", "cancelado")).toBe(false);
  });
});
