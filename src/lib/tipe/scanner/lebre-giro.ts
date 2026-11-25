/**
 * A Lebre prepara o giro 360° antes de enviar, toda no celular e sem gastar crédito de IA:
 * acha o prato em cada foto, deixa ele parado no centro e do mesmo tamanho (o giro não "pula"),
 * iguala luz e cor entre as fotos (sem pisca-pisca) e escolhe a foto mais bonita para a capa.
 * Aqui ficam só as contas; o desenho no canvas fica em captura.ts.
 */

export type Achado = { cx: number; cy: number; raio: number | null };
export type Cor = { r: number; g: number; b: number; nitidez: number };
export type Plano = { sx: number; sy: number; lado: number; ganho: [number, number, number] };

const dist = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

function mediana(v: number[]) {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)]!;
}

/**
 * Acha o prato numa miniatura RGBA quadrada (lado `n`). O fundo é a cor típica da borda; o que
 * foge dela perto do centro é o prato. Devolve centro e raio em fração do lado (0 a 1).
 */
export function acharPrato(rgba: ArrayLike<number>, n: number): Achado {
  const borda: number[][] = [];
  for (let i = 0; i < n; i++)
    for (const [x, y] of [
      [i, 0],
      [i, n - 1],
      [0, i],
      [n - 1, i],
    ] as const) {
      const k = (y * n + x) * 4;
      borda.push([rgba[k]!, rgba[k + 1]!, rgba[k + 2]!]);
    }
  const fundo = [0, 1, 2].map((c) => mediana(borda.map((p) => p[c]!)));
  const limiar = Math.max(30, mediana(borda.map((p) => dist(p, fundo))) * 2.5);
  let soma = 0;
  let sx = 0;
  let sy = 0;
  const pts: [number, number][] = [];
  const r2 = (n * 0.47) ** 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if ((x - n / 2) ** 2 + (y - n / 2) ** 2 > r2) continue;
      const k = (y * n + x) * 4;
      if (dist([rgba[k]!, rgba[k + 1]!, rgba[k + 2]!], fundo) <= limiar) continue;
      soma++;
      sx += x;
      sy += y;
      pts.push([x, y]);
    }
  const area = Math.PI * r2;
  if (soma < area * 0.04 || soma > area * 0.97) return { cx: 0.5, cy: 0.5, raio: null };
  const cx = sx / soma;
  const cy = sy / soma;
  // Raio = distância que cobre 95% do prato (vale também para o prato visto de lado, oval).
  const d = pts.map(([x, y]) => Math.hypot(x - cx, y - cy)).sort((p, q) => p - q);
  const raio = d[Math.floor(d.length * 0.95)]! + 1;
  return { cx: cx / n, cy: cy / n, raio: raio / n };
}

/** Média móvel centrada, para o prato não tremer de uma foto para a outra. */
export function suavizarSerie(v: number[], janela = 2) {
  return v.map((_, i) => {
    const t = v.slice(Math.max(0, i - janela), i + janela + 1);
    return t.reduce((a, b) => a + b, 0) / t.length;
  });
}

/**
 * Plano de recorte e de cor de cada foto (coordenadas em fração do lado da foto quadrada).
 * O prato ocupa ~72% do quadro final, no mesmo tamanho em todas; a luz vai para a mediana.
 */
export function planejar(achados: Achado[], cores: Cor[], ocupar = 0.72): Plano[] {
  const raios = achados.map((a) => a.raio).filter((r): r is number => r != null);
  const raioTipico = raios.length ? mediana(raios) : null;
  const cx = suavizarSerie(achados.map((a) => a.cx));
  const cy = suavizarSerie(achados.map((a) => a.cy));
  const r = suavizarSerie(achados.map((a) => a.raio ?? raioTipico ?? 0.4));
  const alvo = [cores.map((c) => c.r), cores.map((c) => c.g), cores.map((c) => c.b)].map(mediana);
  const cinzaAlvo = (alvo[0]! + alvo[1]! + alvo[2]!) / 3;
  return achados.map((_, i) => {
    const lado = Math.min(1, Math.max(0.55, (2 * r[i]!) / ocupar));
    const meio = lado / 2;
    const x = Math.min(1 - meio, Math.max(meio, cx[i]!));
    const y = Math.min(1 - meio, Math.max(meio, cy[i]!));
    const c = cores[i]!;
    const cinza = (c.r + c.g + c.b) / 3 || 1;
    // Luz igual à mediana e balanço de branco só pela metade (preserva a cor real da comida).
    const ganho = ([c.r, c.g, c.b] as const).map((v, k) => {
      const luz = cinzaAlvo / cinza;
      const branco = alvo[k]! / cinzaAlvo / (v / cinza || 1);
      return Math.min(1.25, Math.max(0.8, luz * (1 + (branco - 1) * 0.5)));
    }) as [number, number, number];
    return { sx: x - meio, sy: y - meio, lado, ganho };
  });
}

/** Capa: a foto mais nítida entre as de luz perto da mediana, de preferência da 1ª volta. */
export function escolherCapa(cores: Cor[], fimVolta1 = cores.length) {
  const luz = cores.map((c) => (c.r + c.g + c.b) / 3);
  const m = mediana(luz);
  let melhor = 0;
  let nota = -Infinity;
  cores.forEach((c, i) => {
    if (i >= fimVolta1) return;
    const n = c.nitidez * (1 - Math.min(1, Math.abs(luz[i]! - m) / 60));
    if (n > nota) {
      nota = n;
      melhor = i;
    }
  });
  return melhor;
}

/** Aplica ganho por canal e um leve realce de cor (saturação +8%) direto nos pixels. */
export function aplicarCor(px: Uint8ClampedArray, ganho: [number, number, number], sat = 1.08) {
  const [gr, gg, gb] = ganho;
  for (let k = 0; k < px.length; k += 4) {
    const r = px[k]! * gr;
    const g = px[k + 1]! * gg;
    const b = px[k + 2]! * gb;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    px[k] = l + (r - l) * sat;
    px[k + 1] = l + (g - l) * sat;
    px[k + 2] = l + (b - l) * sat;
  }
}
