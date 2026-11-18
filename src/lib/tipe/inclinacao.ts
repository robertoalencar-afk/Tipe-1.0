/**
 * Inclinação do celular → ângulo de câmera do <model-viewer>. Com o celular deitado (beta 0) a
 * câmera olha o prato de cima; em pé (beta 90), de lado. Assim o prato 3D é visto do mesmo
 * ângulo que a mesa real atrás dele, na câmera.
 */
export const POLAR_MIN = 20;
export const POLAR_MAX = 82;

export function polarDaInclinacao(beta: number | null | undefined): number | null {
  if (beta == null || !Number.isFinite(beta)) return null;
  // Celular de cabeça para baixo ou apontado para cima: ignora.
  if (beta < -10 || beta > 120) return null;
  return Math.min(POLAR_MAX, Math.max(POLAR_MIN, beta));
}

/** Suaviza o movimento (filtro exponencial) para o prato não tremer com o giroscópio. */
export function suavizar(atual: number, alvo: number, fator = 0.18): number {
  return atual + (alvo - atual) * fator;
}
