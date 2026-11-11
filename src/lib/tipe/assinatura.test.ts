import { describe, expect, it } from "vitest";
import { abaLiberada, accessNotice, parseAccess, statusFromProvider } from "./assinatura";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const em = (dias: number) => new Date(NOW + dias * 86_400_000).toISOString();

describe("parseAccess", () => {
  it("lê o jsonb do banco", () => {
    expect(
      parseAccess({ state: "grace", reason: "pagamento_atrasado", until: em(3) }),
    ).toMatchObject({ state: "grace", reason: "pagamento_atrasado" });
  });
  it("falha fechada: resposta estranha vira bloqueio", () => {
    expect(parseAccess(null).state).toBe("blocked");
    expect(parseAccess({ state: "liberado" }).state).toBe("blocked");
  });
});

describe("accessNotice", () => {
  it("ativa e isenta não mostram aviso", () => {
    expect(accessNotice({ state: "full", reason: "ativa" }, NOW)).toBeNull();
    expect(accessNotice({ state: "full", reason: "isento" }, NOW)).toBeNull();
  });
  it("teste longe do fim não avisa; perto do fim avisa", () => {
    expect(accessNotice({ state: "full", reason: "teste", until: em(20) }, NOW)).toBeNull();
    expect(accessNotice({ state: "full", reason: "teste", until: em(5) }, NOW)?.title).toContain(
      "5 dia",
    );
  });
  it("atraso em carência é alerta; depois vira erro", () => {
    expect(
      accessNotice({ state: "grace", reason: "pagamento_atrasado", until: em(2) }, NOW)?.tone,
    ).toBe("warn");
    expect(accessNotice({ state: "blocked", reason: "pagamento_atrasado" }, NOW)?.tone).toBe(
      "error",
    );
  });
  it("bloqueio sempre diz que mesas abertas continuam pagáveis ou que os dados seguem disponíveis", () => {
    for (const reason of ["teste_encerrado", "suspensa", "pagamento_atrasado"] as const) {
      expect(accessNotice({ state: "blocked", reason }, NOW)?.text).toMatch(/pagas normalmente/);
    }
  });
});

describe("abaLiberada", () => {
  it("bloqueada deixa só dinheiro, dados e assinatura", () => {
    const b = { state: "blocked", reason: "cancelada" } as const;
    expect(abaLiberada("assinatura", b)).toBe(true);
    expect(abaLiberada("relatorios", b)).toBe(true);
    expect(abaLiberada("recebimentos", b)).toBe(true);
    expect(abaLiberada("salao", b)).toBe(false);
    expect(abaLiberada("pdv", b)).toBe(false);
  });
  it("carência não fecha nada", () => {
    expect(abaLiberada("salao", { state: "grace", reason: "pagamento_atrasado" })).toBe(true);
  });
});

describe("statusFromProvider", () => {
  it("fatura paga ativa; fatura recusada atrasa", () => {
    expect(statusFromProvider("active", "paid")).toBe("active");
    expect(statusFromProvider("active", "failed")).toBe("past_due");
  });
  it("cancelada no provedor vence a fatura", () => {
    expect(statusFromProvider("canceled", "paid")).toBe("canceled");
  });
  it("assinatura futura (teste) continua em teste", () => {
    expect(statusFromProvider("future")).toBe("trialing");
  });
  it("assinatura criada sem fatura paga não vira ativa", () => {
    expect(statusFromProvider("active")).toBeNull();
    expect(statusFromProvider("active", "pending")).toBeNull();
  });
  it("status desconhecido não libera", () => {
    expect(statusFromProvider("unpaid")).toBe("past_due");
  });
});
