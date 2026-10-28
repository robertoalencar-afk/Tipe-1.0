/**
 * Tokens de movimento do site, num lugar só. Os valores vêm da medição da sunday
 * (sunday-analise/movimento): curva expo-out, 1,5 s no texto, 1,2 s nas fotos,
 * 0,75 s em menus, 0,4 s em botões e 0,14 s entre palavras. O CSS usa as mesmas
 * variáveis (--mv-*) em src/styles.css.
 */
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_ARRAY = [0.16, 1, 0.3, 1] as const;

export const DURACAO = {
  /** Botões, setas e cor. */
  toque: 400,
  /** Menus, overlays e troca de cartão. */
  painel: 750,
  /** Fotos entrando e trocando. */
  foto: 1200,
  /** Texto palavra por palavra. */
  texto: 1500,
} as const;

export const PASSO = {
  palavra: 140,
  lista: 100,
} as const;

/** Deslocamento padrão de entrada (px). */
export const SUBIDA = 24;

export function reduzMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
