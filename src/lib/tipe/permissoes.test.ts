import { describe, expect, it } from "vitest";
import { CONCEDIVEIS, PADRAO, PERMISSOES, pode } from "./permissoes";

describe("permissões do restaurante", () => {
  it("administrador pode tudo", () => {
    for (const p of PERMISSOES) expect(pode(["owner"], [], p.k)).toBe(true);
  });
  it("garçom não opera caixa nem vê relatórios", () => {
    expect(pode(["waiter"], [], "caixa.operar")).toBe(false);
    expect(pode(["waiter"], [], "relatorios.ver")).toBe(false);
    expect(pode(["waiter"], [], "pedidos.lancar")).toBe(true);
  });
  it("gerente vê relatórios, caixa não, mas extra libera", () => {
    expect(pode(["manager"], [], "relatorios.ver")).toBe(true);
    expect(pode(["cashier"], [], "relatorios.ver")).toBe(false);
    expect(pode(["cashier"], ["relatorios.ver"], "relatorios.ver")).toBe(true);
  });
  it("nenhum papel não administrador edita equipe e ela não é concedível", () => {
    expect(CONCEDIVEIS).not.toContain("equipe.ver");
    expect(PADRAO.cashier).not.toContain("equipe.ver");
  });
  it("toda permissão padrão existe no catálogo", () => {
    const todas = new Set(PERMISSOES.map((p) => p.k));
    for (const lista of Object.values(PADRAO)) for (const p of lista) expect(todas.has(p)).toBe(true);
  });
});
