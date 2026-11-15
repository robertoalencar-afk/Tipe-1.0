import { expect, it } from "vitest";
import { PhotoPinch, NO_ZOOM } from "./pinch-zoom";
const rect = { left: 0, top: 0, width: 400, height: 800 };
function start() {
  const p = new PhotoPinch();
  p.down(1, { x: 100, y: 400 }, rect);
  p.down(2, { x: 200, y: 400 }, rect);
  return p;
}
it("mantém toque e arraste com um dedo disponíveis", () => {
  const p = new PhotoPinch();
  expect(p.down(1, { x: 100, y: 200 }, rect)).toBe(false);
  expect(p.move(1, { x: 200, y: 300 })).toEqual(NO_ZOOM);
  expect(p.up(1)).toBe(false);
});
it("amplia ao redor do centro dos dedos e limita a 4x", () => {
  const p = start();
  expect(p.move(2, { x: 300, y: 400 })).toEqual({ scale: 2, x: 100, y: 0 });
  expect(p.move(2, { x: 1500, y: 400 }).scale).toBe(4);
  expect(p.move(2, { x: 110, y: 400 })).toEqual(NO_ZOOM);
});
it("não transforma o fim do zoom em navegação ou fechamento", () => {
  const p = start();
  p.move(2, { x: 300, y: 400 });
  expect(p.up(1)).toBe(true);
  expect(p.active).toBe(true);
  expect(p.move(2, { x: 300, y: 900 }).scale).toBe(2);
  expect(p.up(2)).toBe(true);
  expect(p.active).toBe(false);
  expect(p.value).toEqual(NO_ZOOM);
});
it("ignora um terceiro dedo sem trocar o par e espera todos soltarem", () => {
  const p = start();
  p.move(2, { x: 300, y: 400 });
  p.down(3, { x: 900, y: 900 }, rect);
  p.up(1);
  expect(p.move(3, { x: 2000, y: 2000 }).scale).toBe(2);
  expect(p.up(2)).toBe(true);
  expect(p.active).toBe(true);
  expect(p.up(3)).toBe(true);
  expect(p.value).toEqual(NO_ZOOM);
});
it("cancelamento limpa pontos e transformação", () => {
  const p = start();
  p.move(2, { x: 400, y: 600 });
  p.reset();
  expect(p.value).toEqual(NO_ZOOM);
  expect(p.points.size).toBe(0);
  expect(p.active).toBe(false);
});
