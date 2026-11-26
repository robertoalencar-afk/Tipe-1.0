import { describe, expect, it } from "vitest";
import { ajustesPara, efetivas, PADRAO, PERMISSOES, pode, TETO } from "./permissoes";

const nada = { extras: [], removidas: [] };

describe("permissões do restaurante", () => {
  it("administrador pode tudo", () => {
    for (const p of PERMISSOES) expect(pode(["owner"], nada, p.k)).toBe(true);
  });
  it("garçom não opera caixa nem vê relatórios", () => {
    expect(pode(["waiter"], nada, "caixa.operar")).toBe(false);
    expect(pode(["waiter"], nada, "relatorios.ver")).toBe(false);
    expect(pode(["waiter"], nada, "pedidos.lancar")).toBe(true);
  });
  it("garçom nunca vira caixa, nem por concessão", () => {
    expect(pode(["waiter"], { extras: ["caixa.operar", "caixa.ver", "relatorios.ver"], removidas: [] }, "caixa.operar")).toBe(false);
    expect(TETO.waiter).not.toContain("caixa.operar");
    expect(ajustesPara("waiter", ["salao.ver", "caixa.operar"]).extras).toEqual([]);
  });
  it("gerente vê relatórios, caixa não, mas extra libera", () => {
    expect(pode(["manager"], nada, "relatorios.ver")).toBe(true);
    expect(pode(["cashier"], nada, "relatorios.ver")).toBe(false);
    expect(pode(["cashier"], { extras: ["relatorios.ver"], removidas: [] }, "relatorios.ver")).toBe(true);
  });
  it("administrador tira um poder do padrão", () => {
    expect(pode(["manager"], { extras: [], removidas: ["caixa.operar"] }, "caixa.operar")).toBe(false);
    expect(pode(["waiter"], { extras: [], removidas: ["pedidos.lancar"] }, "pedidos.lancar")).toBe(false);
    expect(pode(["owner"], { extras: [], removidas: ["caixa.operar"] }, "caixa.operar")).toBe(true);
  });
  it("marcar e desmarcar vira ganho/perda sobre o padrão", () => {
    const a = ajustesPara("cashier", [...PADRAO.cashier.filter((p) => p !== "caixa.operar"), "relatorios.ver"]);
    expect(a).toEqual({ extras: ["relatorios.ver"], removidas: ["caixa.operar"] });
    expect(efetivas(["cashier"], a)).toContain("relatorios.ver");
    expect(efetivas(["cashier"], a)).not.toContain("caixa.operar");
    expect(ajustesPara("manager", PADRAO.manager)).toEqual({ extras: [], removidas: [] });
  });
  it("todo padrão existe no catálogo e cabe no teto", () => {
    const todas = new Set(PERMISSOES.map((p) => p.k));
    for (const [papel, lista] of Object.entries(PADRAO)) for (const p of lista) {
      expect(todas.has(p)).toBe(true);
      expect(TETO[papel as keyof typeof TETO]).toContain(p);
    }
  });
});
