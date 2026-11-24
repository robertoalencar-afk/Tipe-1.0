/**
 * Giro 360° instantâneo: as próprias fotos da captura, na ordem em que foram tiradas, viram um
 * prato que o cliente gira com o dedo. Não há reconstrução nem espera: fica pronto quando a
 * última foto termina de subir. A lista de quadros mora num JSON público ("giro.json").
 */
export type Giro = { versao: 1; voltas: string[][] };

export const LADO_GIRO = 640;

export const ehGiro = (url: string | null | undefined): url is string =>
  !!url && /\/giro\.json(\?|$)/.test(url);

/** Separa os quadros em voltas: a 1ª na altura do rosto, a 2ª de cima (se houver quadros dela). */
export function montarGiro(urls: string[], inicioVolta2: number | null): Giro {
  const corte =
    inicioVolta2 != null && inicioVolta2 >= 8 && urls.length - inicioVolta2 >= 8
      ? inicioVolta2
      : null;
  return {
    versao: 1,
    voltas: corte == null ? [urls] : [urls.slice(0, corte), urls.slice(corte)],
  };
}

export function lerGiro(dado: unknown): Giro | null {
  const g = dado as Partial<Giro> | null;
  if (!g || g.versao !== 1 || !Array.isArray(g.voltas)) return null;
  const voltas = g.voltas
    .filter((v): v is string[] => Array.isArray(v))
    .map((v) => v.filter((u) => typeof u === "string" && /^https:\/\//.test(u)))
    .filter((v) => v.length > 0);
  return voltas.length ? { versao: 1, voltas } : null;
}

/** Quadro mostrado depois de arrastar `dx` px: a largura toda do visor equivale a uma volta. */
export function quadroDoArrasto(inicio: number, dx: number, largura: number, total: number) {
  if (total <= 0) return 0;
  const passo = Math.round((-dx / Math.max(1, largura)) * total);
  return (((inicio + passo) % total) + total) % total;
}

/** Leva o quadro de uma volta para a posição equivalente na outra (mesmo lado do prato). */
export function quadroEquivalente(i: number, de: number, para: number) {
  if (de <= 0 || para <= 0) return 0;
  return Math.min(para - 1, Math.round((i / de) * para));
}

/** Recorte quadrado central (o prato fica no círculo do visor) já no tamanho do giro. */
export function recorteGiro(largura: number, altura: number) {
  const lado = Math.min(largura, altura);
  return {
    sx: (largura - lado) / 2,
    sy: (altura - lado) / 2,
    lado,
    saida: Math.min(LADO_GIRO, lado),
  };
}
