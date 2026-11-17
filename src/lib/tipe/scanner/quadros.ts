/**
 * Escolha dos quadros do scanner 3D. Do vídeo de volta ao prato saem N quadros espalhados no
 * tempo (um por trecho), sempre o mais nítido de cada trecho, porque a fotogrametria falha com
 * foto tremida. Funções puras aqui; a parte que usa <video> e <canvas> fica em captura.ts.
 */

/** Variância do laplaciano numa imagem em tons de cinza: quanto maior, mais nítida. */
export function nitidez(cinza: ArrayLike<number>, largura: number, altura: number): number {
  let soma = 0;
  let soma2 = 0;
  let n = 0;
  for (let y = 1; y < altura - 1; y++) {
    for (let x = 1; x < largura - 1; x++) {
      const i = y * largura + x;
      const l =
        4 * cinza[i]! - cinza[i - 1]! - cinza[i + 1]! - cinza[i - largura]! - cinza[i + largura]!;
      soma += l;
      soma2 += l * l;
      n++;
    }
  }
  if (!n) return 0;
  const media = soma / n;
  return soma2 / n - media * media;
}

/** RGBA → cinza (luma BT.601). */
export function paraCinza(rgba: ArrayLike<number>): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; j < out.length; i += 4, j++)
    out[j] = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
  return out;
}

export type Candidato = { t: number; nitidez: number };

/**
 * Divide os candidatos (ordenados por tempo) em `n` trechos iguais e pega o mais nítido de cada.
 * Trecho cujo melhor quadro está abaixo de 35% da mediana é descartado (borrado demais).
 */
export function escolherQuadros(candidatos: Candidato[], n: number): number[] {
  if (!candidatos.length || n <= 0) return [];
  const ord = [...candidatos].sort((a, b) => a.t - b.t);
  const mediana = [...ord].map((c) => c.nitidez).sort((a, b) => a - b)[Math.floor(ord.length / 2)]!;
  const k = Math.min(n, ord.length);
  const escolhidos: number[] = [];
  for (let b = 0; b < k; b++) {
    const ini = Math.floor((b * ord.length) / k);
    const fim = Math.floor(((b + 1) * ord.length) / k);
    let melhor: Candidato | null = null;
    for (let i = ini; i < fim; i++)
      if (!melhor || ord[i]!.nitidez > melhor.nitidez) melhor = ord[i]!;
    if (melhor && melhor.nitidez >= mediana * 0.35) escolhidos.push(melhor.t);
  }
  return escolhidos;
}

/** Tempos de amostragem: `porQuadro` candidatos para cada quadro final, sem pegar as pontas. */
export function temposAmostra(duracao: number, quadros: number, porQuadro = 3): number[] {
  const total = Math.max(1, Math.round(quadros * porQuadro));
  const ini = Math.min(0.3, duracao * 0.02);
  const fim = Math.max(ini, duracao - Math.min(0.3, duracao * 0.02));
  return Array.from({ length: total }, (_, i) => ini + ((fim - ini) * (i + 0.5)) / total);
}

/** Tamanho final mantendo proporção, lado maior até `max`. */
export function caber(largura: number, altura: number, max: number) {
  const f = Math.min(1, max / Math.max(largura, altura));
  return { largura: Math.round(largura * f), altura: Math.round(altura * f) };
}
