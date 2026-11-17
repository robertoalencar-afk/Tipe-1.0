/** Uma pendência de uma aba do menu: a bolinha vermelha mostra que existe, a Lebre explica o que é. */
export type Pendencia = { aba: string; rotulo: string; texto: string; n: number };

/** Aviso da Lebre a partir das pendências: chave estável para não repetir o balão já fechado. */
export function avisoDasPendencias(pendencias: Pendencia[]) {
  const ativas = pendencias.filter((p) => p.n > 0);
  return {
    key: JSON.stringify(ativas.map((p) => [p.aba, p.n])),
    count: ativas.reduce((t, p) => t + p.n, 0),
    itens: ativas,
  };
}
