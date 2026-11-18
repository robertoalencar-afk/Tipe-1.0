import { expect, it } from "vitest";
import { POLAR_MAX, POLAR_MIN, polarDaInclinacao, suavizar } from "./inclinacao";

it("celular inclinado vira ângulo de câmera, dentro dos limites", () => {
  expect(polarDaInclinacao(45)).toBe(45);
  expect(polarDaInclinacao(5)).toBe(POLAR_MIN);
  expect(polarDaInclinacao(100)).toBe(POLAR_MAX);
  expect(polarDaInclinacao(null)).toBeNull();
  expect(polarDaInclinacao(-60)).toBeNull();
});

it("suaviza sem passar do alvo", () => {
  const v = suavizar(30, 60);
  expect(v).toBeGreaterThan(30);
  expect(v).toBeLessThan(60);
});
