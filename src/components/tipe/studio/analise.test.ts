import { describe, expect, it } from "vitest";
import { avaliarFoto, avaliarVideo, medir, nitidez, nota, tremidos } from "./analise";

const img = (w: number, h: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = f(x, y);
      const p = (y * w + x) * 4;
      d[p] = d[p + 1] = d[p + 2] = v;
      d[p + 3] = 255;
    }
  return d;
};

describe("analise do Studio", () => {
  it("foto nítida, vertical e equilibrada passa em tudo", () => {
    const m = medir(
      img(64, 96, (x, y) => (((x >> 2) + (y >> 2)) % 2 ? 190 : 60)),
      64,
      96,
      1440,
      2160,
    );
    const v = avaliarFoto(m);
    expect(v.every((x) => x.nivel === "ok")).toBe(true);
    expect(nota(v)).toBe(100);
  });
  it("foto lisa, escura e deitada pede refazer", () => {
    const m = medir(
      img(64, 48, () => 30),
      64,
      48,
      800,
      600,
    );
    const v = Object.fromEntries(avaliarFoto(m).map((x) => [x.id, x.nivel]));
    expect(v).toMatchObject({ tamanho: "ruim", vertical: "ruim", luz: "ruim", foco: "ruim" });
  });
  it("nitidez cresce com bordas", () => {
    const g = (f: (i: number) => number) => Float32Array.from({ length: 32 * 32 }, (_, i) => f(i));
    expect(
      nitidez(
        g((i) => (i % 2 ? 255 : 0)),
        32,
        32,
      ),
    ).toBeGreaterThan(
      nitidez(
        g(() => 128),
        32,
        32,
      ),
    );
  });
  it("vídeo de 50 s firme vai ao Scanner; trecho tremido é marcado", () => {
    const amostras = Array.from({ length: 60 }, (_, i) => ({ t: i, nitidez: i === 10 ? 5 : 120 }));
    expect(tremidos(amostras)[10]).toBe(true);
    const v = avaliarVideo({ duracao: 50, largura: 1080, altura: 1920, amostras });
    expect(v.every((x) => x.nivel === "ok")).toBe(true);
    const curto = avaliarVideo({ duracao: 12, largura: 1080, altura: 1920, amostras });
    expect(curto.find((x) => x.id === "duracao")?.nivel).toBe("ruim");
  });
});
