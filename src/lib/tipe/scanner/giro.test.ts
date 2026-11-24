import { describe, expect, it } from "vitest";
import {
  ehGiro,
  lerGiro,
  montarGiro,
  quadroDoArrasto,
  quadroEquivalente,
  recorteGiro,
} from "./giro";

const u = (n: number) => Array.from({ length: n }, (_, i) => `https://x.co/${i}.jpg`);

describe("giro 360°", () => {
  it("reconhece a URL do giro", () => {
    expect(ehGiro("https://x.supabase.co/storage/v1/object/public/modelos-3d/r/s/giro.json")).toBe(
      true,
    );
    expect(ehGiro("https://x.co/a/modelo.glb")).toBe(false);
    expect(ehGiro(null)).toBe(false);
  });

  it("separa as duas voltas só quando as duas têm quadros suficientes", () => {
    expect(montarGiro(u(60), 30).voltas.map((v) => v.length)).toEqual([30, 30]);
    expect(montarGiro(u(34), 30).voltas.map((v) => v.length)).toEqual([34]);
    expect(montarGiro(u(25), null).voltas.length).toBe(1);
  });

  it("lê só URLs https", () => {
    expect(lerGiro({ versao: 1, voltas: [["javascript:alert(1)", "https://x.co/1.jpg"]] })).toEqual(
      {
        versao: 1,
        voltas: [["https://x.co/1.jpg"]],
      },
    );
    expect(lerGiro({ versao: 2 })).toBeNull();
    expect(lerGiro(null)).toBeNull();
  });

  it("arrastar a largura toda dá uma volta e o índice dá a volta no fim", () => {
    expect(quadroDoArrasto(0, -300, 300, 30)).toBe(0);
    expect(quadroDoArrasto(0, -150, 300, 30)).toBe(15);
    expect(quadroDoArrasto(0, 10, 300, 30)).toBe(29);
  });

  it("mantém o mesmo lado do prato ao trocar de volta", () => {
    expect(quadroEquivalente(15, 30, 20)).toBe(10);
    expect(quadroEquivalente(29, 30, 20)).toBe(19);
  });

  it("recorta o quadrado central", () => {
    expect(recorteGiro(1920, 1080)).toEqual({ sx: 420, sy: 0, lado: 1080, saida: 640 });
  });
});
