import { describe, expect, it } from "vitest";
import { caber, escolherQuadros, nitidez, paraCinza, temposAmostra } from "./quadros";

describe("scanner 3D: quadros", () => {
  it("imagem com bordas é mais nítida que imagem lisa", () => {
    const w = 16;
    const liso = new Uint8ClampedArray(w * w).fill(128);
    const xadrez = new Uint8ClampedArray(w * w).map((_, i) =>
      ((i % w) + Math.floor(i / w)) % 2 ? 255 : 0,
    );
    expect(nitidez(liso, w, w)).toBe(0);
    expect(nitidez(xadrez, w, w)).toBeGreaterThan(1000);
  });

  it("converte RGBA para cinza", () => {
    expect(Array.from(paraCinza([255, 255, 255, 255, 0, 0, 0, 255]))).toEqual([255, 0]);
  });

  it("pega o mais nítido de cada trecho e descarta trecho borrado", () => {
    const c = [
      { t: 0, nitidez: 10 },
      { t: 1, nitidez: 50 },
      { t: 2, nitidez: 40 },
      { t: 3, nitidez: 45 },
      { t: 4, nitidez: 1 },
      { t: 5, nitidez: 2 },
    ];
    expect(escolherQuadros(c, 3)).toEqual([1, 3]);
  });

  it("amostra dentro do vídeo, em ordem", () => {
    const t = temposAmostra(30, 10, 3);
    expect(t).toHaveLength(30);
    expect(t[0]!).toBeGreaterThan(0);
    expect(t.at(-1)!).toBeLessThan(30);
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  it("reduz mantendo a proporção", () => {
    expect(caber(4000, 3000, 1600)).toEqual({ largura: 1600, altura: 1200 });
    expect(caber(800, 600, 1600)).toEqual({ largura: 800, altura: 600 });
  });
});
