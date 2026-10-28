import { describe, expect, it } from "vitest";
import { brl, brlSinal, duracao, lerNumero, numero, pct } from "./formato";

/** Intl usa espaço não separável depois de "R$"; normaliza para comparar. */
const n = (s: string) => s.replace(/ | /g, " ");

describe("formatação brasileira", () => {
  it("moeda em reais", () => {
    expect(n(brl(1234.5, true))).toBe("R$ 1.234,50");
    expect(n(brl(21894.7368))).toBe("R$ 21.895");
    expect(n(brl(0))).toBe("R$ 0");
    expect(n(brl(Number.NaN))).toBe("R$ 0");
    expect(n(brl(1_000_000))).toBe("R$ 1.000.000");
  });
  it("resultado com sinal", () => {
    expect(n(brlSinal(6479.42))).toBe("+ R$ 6.479");
    expect(n(brlSinal(-389))).toBe("− R$ 389");
    expect(n(brlSinal(0.2))).toBe("R$ 0");
  });
  it("números e percentuais", () => {
    expect(numero(145.965, 1)).toBe("146,0");
    expect(numero(12168)).toBe("12.168");
    expect(pct(7280.25)).toBe("7.280%");
    expect(pct(2.5, 1)).toBe("2,5%");
  });
  it("duração em minutos e horas", () => {
    expect(duracao(45)).toBe("45 min");
    expect(duracao(60)).toBe("1 h");
    expect(duracao(200)).toBe("3 h 20 min");
    expect(duracao(12168)).toBe("203 h");
    expect(duracao(-5)).toBe("0 min");
  });
  it("lê o que o gestor digita", () => {
    expect(lerNumero("150")).toBe(150);
    expect(lerNumero("1.500")).toBe(1500);
    expect(lerNumero("R$ 1.234,56")).toBe(1234.56);
    expect(lerNumero("12,5")).toBe(12.5);
    expect(lerNumero("2.5")).toBe(2.5);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
  });
});
