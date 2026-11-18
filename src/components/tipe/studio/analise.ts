/**
 * Medidas de uma foto ou vídeo de teste do Studio, calculadas no navegador do dono.
 * Nada aqui envia arquivo para servidor. As notas são estimativas honestas para treinar a
 * captura: luz (média de luminância), contraste (desvio), partes estouradas, nitidez
 * (variância do laplaciano, a mesma ideia que o Scanner 3D usa para escolher quadros) e tamanho.
 */
import { MIN_PHOTO_SIDE } from "@/lib/tipe/menu-review";

export type Nivel = "ok" | "atencao" | "ruim";
export type Veredito = { id: string; titulo: string; nivel: Nivel; valor: string; dica: string };

/** Lado da amostra usada nas contas; a resolução real vem do arquivo. */
export const LADO_AMOSTRA = 512;

export function luminancia(rgba: Uint8ClampedArray) {
  const g = new Float32Array(rgba.length / 4);
  for (let i = 0, p = 0; i < g.length; i++, p += 4)
    g[i] = 0.2126 * rgba[p]! + 0.7152 * rgba[p + 1]! + 0.0722 * rgba[p + 2]!;
  return g;
}

export function nitidez(g: Float32Array, w: number, h: number) {
  let soma = 0;
  let soma2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = g[i - w]! + g[i + w]! + g[i - 1]! + g[i + 1]! - 4 * g[i]!;
      soma += l;
      soma2 += l * l;
      n++;
    }
  if (!n) return 0;
  const m = soma / n;
  return soma2 / n - m * m;
}

export type Medidas = {
  largura: number;
  altura: number;
  brilho: number;
  contraste: number;
  estouro: number;
  escuro: number;
  nitidez: number;
};

export function medir(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  largura: number,
  altura: number,
): Medidas {
  const g = luminancia(rgba);
  let s = 0;
  let s2 = 0;
  let alto = 0;
  let baixo = 0;
  for (const v of g) {
    s += v;
    s2 += v * v;
    if (v >= 250) alto++;
    if (v <= 12) baixo++;
  }
  const n = g.length || 1;
  const brilho = s / n;
  return {
    largura,
    altura,
    brilho,
    contraste: Math.sqrt(Math.max(0, s2 / n - brilho * brilho)),
    estouro: alto / n,
    escuro: baixo / n,
    nitidez: nitidez(g, w, h),
  };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function avaliarFoto(m: Medidas): Veredito[] {
  const menor = Math.min(m.largura, m.altura);
  const out: Veredito[] = [
    {
      id: "tamanho",
      titulo: "Resolução",
      nivel: menor >= MIN_PHOTO_SIDE ? "ok" : menor >= 720 ? "atencao" : "ruim",
      valor: `${m.largura}×${m.altura} px`,
      dica:
        menor >= MIN_PHOTO_SIDE
          ? "Nítida em tela cheia no celular do cliente."
          : `Use a câmera principal (1x), sem zoom e sem recorte. Mínimo de ${MIN_PHOTO_SIDE} px no lado menor.`,
    },
    {
      id: "vertical",
      titulo: "Na vertical",
      nivel: m.altura >= m.largura * 1.15 ? "ok" : m.altura >= m.largura ? "atencao" : "ruim",
      valor: m.altura > m.largura ? "Em pé" : m.altura === m.largura ? "Quadrada" : "Deitada",
      dica:
        m.altura >= m.largura * 1.15
          ? "Vira story sem cortar o prato."
          : "Segure o celular em pé. Foto deitada perde as laterais no story.",
    },
    {
      id: "luz",
      titulo: "Luz",
      nivel:
        m.brilho < 60 || m.brilho > 215
          ? "ruim"
          : m.brilho < 85 || m.brilho > 190 || m.estouro > 0.06
            ? "atencao"
            : "ok",
      valor: m.brilho < 85 ? "Escura" : m.brilho > 190 ? "Clara demais" : "Equilibrada",
      dica:
        m.brilho < 85
          ? "Aproxime o prato da janela ou acenda uma luz branca de lado. Flash, nunca."
          : m.estouro > 0.06
            ? `${pct(m.estouro)} da foto ficou branca de tanta luz. Tire do sol direto.`
            : m.brilho > 190
              ? "Afaste do sol direto ou toque no prato e baixe a exposição."
              : "Luz boa para comida: clara sem estourar.",
    },
    {
      id: "contraste",
      titulo: "Contraste",
      nivel: m.contraste < 28 ? "ruim" : m.contraste < 40 ? "atencao" : "ok",
      valor: m.contraste < 40 ? "Lavado" : "Bom",
      dica:
        m.contraste < 40
          ? "Luz de lado cria sombra suave e dá textura. Luz de frente achata o prato."
          : "O prato tem relevo e textura.",
    },
    {
      id: "foco",
      titulo: "Foco",
      nivel: m.nitidez < 25 ? "ruim" : m.nitidez < 60 ? "atencao" : "ok",
      valor: m.nitidez < 25 ? "Tremida" : m.nitidez < 60 ? "Suave" : "Nítida",
      dica:
        m.nitidez < 60
          ? "Limpe a lente, toque no prato para focar e apoie os cotovelos na mesa."
          : "Detalhes visíveis de perto.",
    },
  ];
  return out;
}

/** Nota de 0 a 100: ok vale 1, atenção vale meio. */
export function nota(v: Veredito[]) {
  if (!v.length) return 0;
  return Math.round(
    (v.reduce((s, x) => s + (x.nivel === "ok" ? 1 : x.nivel === "atencao" ? 0.5 : 0), 0) /
      v.length) *
      100,
  );
}

export const VIDEO_MIN = 40;
export const VIDEO_MAX = 60;
export const FOTOS_MIN = 20;

export type Amostra = { t: number; nitidez: number };

/** Quadros tremidos: bem abaixo da mediana do próprio vídeo ou abaixo do mínimo absoluto. */
export function tremidos(amostras: Amostra[]) {
  if (!amostras.length) return [];
  const ord = amostras.map((a) => a.nitidez).sort((a, b) => a - b);
  const mediana = ord[Math.floor(ord.length / 2)]!;
  return amostras.map((a) => a.nitidez < Math.max(12, mediana * 0.45));
}

export function avaliarVideo(v: {
  duracao: number;
  largura: number;
  altura: number;
  amostras: Amostra[];
}): Veredito[] {
  const d = v.duracao;
  const marca = tremidos(v.amostras);
  const ruins = marca.filter(Boolean).length;
  const fracao = v.amostras.length ? ruins / v.amostras.length : 1;
  const aproveitaveis = Math.round(Math.min(60, d * 1.2) * (1 - fracao));
  const menor = Math.min(v.largura, v.altura);
  const seg = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return [
    {
      id: "duracao",
      titulo: "Duração",
      nivel: d >= VIDEO_MIN && d <= VIDEO_MAX ? "ok" : d >= 25 && d <= 90 ? "atencao" : "ruim",
      valor: seg(d),
      dica:
        d < VIDEO_MIN
          ? `Rápido demais. Duas voltas devagar levam de ${VIDEO_MIN} a ${VIDEO_MAX} s.`
          : d > VIDEO_MAX
            ? "Longo demais. Não precisa de mais de duas voltas."
            : "No ritmo certo para duas voltas.",
    },
    {
      id: "resolucao",
      titulo: "Resolução",
      nivel: menor >= 1080 ? "ok" : menor >= 720 ? "atencao" : "ruim",
      valor: `${v.largura}×${v.altura}`,
      dica:
        menor >= 1080
          ? "Boa para a textura do modelo."
          : "Grave em 1080p ou 4K, com a câmera principal (1x).",
    },
    {
      id: "firmeza",
      titulo: "Firmeza",
      nivel: fracao <= 0.15 ? "ok" : fracao <= 0.35 ? "atencao" : "ruim",
      valor: `${Math.round((1 - fracao) * 100)}% nítido`,
      dica:
        fracao <= 0.15
          ? "Movimento firme, quase sem tremor."
          : "Ande mais devagar, com o celular perto do corpo e as duas mãos.",
    },
    {
      id: "quadros",
      titulo: "Quadros úteis",
      nivel: aproveitaveis >= 40 ? "ok" : aproveitaveis >= FOTOS_MIN ? "atencao" : "ruim",
      valor: `≈ ${aproveitaveis}`,
      dica:
        aproveitaveis >= 40
          ? "Dá para o Scanner escolher até 60 quadros bons."
          : `O Scanner precisa de pelo menos ${FOTOS_MIN} quadros nítidos de ângulos diferentes.`,
    },
  ];
}
