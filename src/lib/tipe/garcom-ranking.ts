/**
 * Ranking e incentivo dos garçons (puro, sem banco). Base: mesas pagas pelo QR no período.
 * Pontuação 0 a 100: 40% gorjeta extra, 35% nota dos clientes, 25% mesas pagas pelo QR.
 * A nota usa média suavizada (poucas avaliações não sobem nem derrubam sozinhas).
 * É só ranking e metas de reconhecimento: nada aqui move dinheiro nem muda a divisão da gorjeta.
 */

export type DadosGarcom = { id: string; name: string; active: boolean; tips: number; tipCount: number; ratingAvg: number | null; ratingCount: number; tablesPaid: number };
export type Posicao = DadosGarcom & { pontos: number; posicao: number; notaSuavizada: number | null; destaque: boolean };

export const PESOS = { gorjeta: 0.4, nota: 0.35, mesas: 0.25 } as const;
export const NOTA_BASE = 4; // nota a que a média tende com poucas avaliações
export const PESO_BASE = 5; // quantas avaliações "valem" a nota base
export const MIN_MESAS_DESTAQUE = 3; // abaixo disso ninguém é destaque do período

export const notaSuavizada = (media: number | null, n: number) => (n <= 0 || media === null ? null : (media * n + NOTA_BASE * PESO_BASE) / (n + PESO_BASE));

export function calcularRanking(lista: DadosGarcom[]): Posicao[] {
  const ativos = lista.filter((w) => w.active);
  const maxTips = Math.max(0, ...ativos.map((w) => w.tips));
  const maxMesas = Math.max(0, ...ativos.map((w) => w.tablesPaid));
  const base = ativos.map((w) => {
    const nota = notaSuavizada(w.ratingAvg, w.ratingCount);
    const pGorjeta = maxTips > 0 ? w.tips / maxTips : 0;
    const pNota = nota === null ? 0 : nota / 5;
    const pMesas = maxMesas > 0 ? w.tablesPaid / maxMesas : 0;
    const pontos = Math.round((pGorjeta * PESOS.gorjeta + pNota * PESOS.nota + pMesas * PESOS.mesas) * 1000) / 10;
    return { ...w, pontos, notaSuavizada: nota, posicao: 0, destaque: false };
  });
  base.sort((a, b) => b.pontos - a.pontos || b.tablesPaid - a.tablesPaid || a.name.localeCompare(b.name));
  base.forEach((w, i) => { w.posicao = i > 0 && w.pontos === base[i - 1]!.pontos ? base[i - 1]!.posicao : i + 1; });
  for (const w of base) w.destaque = w.posicao === 1 && w.tablesPaid >= MIN_MESAS_DESTAQUE;
  return base;
}

export type Meta = { chave: "mesas" | "nota" | "gorjetas"; rotulo: string; atual: number; alvo: number; cumprida: boolean; progresso: number };
export const METAS_PADRAO = { mesas: 20, nota: 4.5, notaMinAvaliacoes: 5, gorjetas: 10 } as const;

/** Metas de reconhecimento do período (valores padrão da Tipe; o restaurante decide o prêmio, se houver). */
export function metasDoGarcom(w: Pick<DadosGarcom, "tablesPaid" | "ratingAvg" | "ratingCount" | "tipCount">): Meta[] {
  const m = METAS_PADRAO;
  const notaOk = w.ratingAvg !== null && w.ratingCount >= m.notaMinAvaliacoes && w.ratingAvg >= m.nota;
  const nota = w.ratingAvg === null ? 0 : w.ratingAvg;
  const limita = (x: number) => Math.max(0, Math.min(1, x));
  return [
    { chave: "mesas", rotulo: `${m.mesas} mesas pagas pelo QR`, atual: w.tablesPaid, alvo: m.mesas, cumprida: w.tablesPaid >= m.mesas, progresso: limita(w.tablesPaid / m.mesas) },
    { chave: "nota", rotulo: `Nota ${String(m.nota).replace(".", ",")} ou mais (mín. ${m.notaMinAvaliacoes} avaliações)`, atual: nota, alvo: m.nota, cumprida: notaOk, progresso: notaOk ? 1 : limita(Math.min(w.ratingCount / m.notaMinAvaliacoes, 1) * 0.5 + (nota / m.nota) * 0.5) },
    { chave: "gorjetas", rotulo: `${m.gorjetas} gorjetas extras recebidas`, atual: w.tipCount, alvo: m.gorjetas, cumprida: w.tipCount >= m.gorjetas, progresso: limita(w.tipCount / m.gorjetas) },
  ];
}
