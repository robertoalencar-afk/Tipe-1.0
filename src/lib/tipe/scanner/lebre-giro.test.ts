import { describe, expect, it } from "vitest";
import { acharPrato, aplicarCor, escolherCapa, planejar } from "./lebre-giro";

/** Miniatura com mesa marrom e prato branco de raio r (fração) centrado em (cx, cy). */
function cena(n: number, cx: number, cy: number, r: number) {
  const px = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const k = (y * n + x) * 4;
      const dentro = (x / n - cx) ** 2 + (y / n - cy) ** 2 < r * r;
      px.set(dentro ? [240, 240, 235, 255] : [120, 90, 60, 255], k);
    }
  return px;
}

describe("Lebre prepara o giro", () => {
  it("acha o centro e o tamanho do prato", () => {
    const a = acharPrato(cena(100, 0.4, 0.55, 0.25), 100);
    expect(a.cx).toBeCloseTo(0.4, 1);
    expect(a.cy).toBeCloseTo(0.55, 1);
    expect(a.raio!).toBeGreaterThan(0.2);
    expect(a.raio!).toBeLessThan(0.3);
  });

  it("sem prato destacado, fica no centro", () => {
    expect(acharPrato(cena(60, 0.5, 0.5, 0), 60)).toEqual({ cx: 0.5, cy: 0.5, raio: null });
  });

  it("recorta com o prato no centro e no mesmo tamanho", () => {
    const achados = [
      { cx: 0.45, cy: 0.5, raio: 0.3 },
      { cx: 0.45, cy: 0.5, raio: 0.3 },
      { cx: 0.45, cy: 0.5, raio: 0.3 },
    ];
    const cor = { r: 100, g: 100, b: 100, nitidez: 1 };
    const p = planejar(achados, [cor, cor, cor]);
    expect(p[1]!.sx + p[1]!.lado / 2).toBeCloseTo(0.45, 5);
    expect(p[1]!.lado).toBeCloseTo(0.6 / 0.72, 5);
    expect(p[1]!.ganho).toEqual([1, 1, 1]);
  });

  it("clareia a foto escura até a luz das outras, com limite", () => {
    const a = { cx: 0.5, cy: 0.5, raio: 0.3 };
    const claro = { r: 150, g: 150, b: 150, nitidez: 1 };
    const p = planejar([a, a, a], [claro, claro, { r: 100, g: 100, b: 100, nitidez: 1 }]);
    expect(p[2]!.ganho[0]).toBeCloseTo(1.25, 5);
  });

  it("capa é a mais nítida com luz normal", () => {
    const c = (l: number, n: number) => ({ r: l, g: l, b: l, nitidez: n });
    expect(escolherCapa([c(120, 5), c(120, 9), c(30, 50), c(118, 7)])).toBe(1);
  });

  it("aplica ganho nos pixels", () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255]);
    aplicarCor(px, [1.2, 1.2, 1.2]);
    expect(Array.from(px)).toEqual([120, 120, 120, 255]);
  });
});
