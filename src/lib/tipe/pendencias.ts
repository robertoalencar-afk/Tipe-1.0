/**
 * Uma pendência de uma aba do menu: a bolinha vermelha mostra que existe, a Lebre explica o que é
 * e como resolver.
 */
export type Pendencia = {
  aba: string;
  rotulo: string;
  texto: string;
  n: number;
  /** O que fazer para resolver, dito pela Lebre. */
  solucao?: string | undefined;
};

/** Aviso da Lebre a partir das pendências: chave estável para não repetir o balão já fechado. */
export function avisoDasPendencias(pendencias: Pendencia[]) {
  const ativas = pendencias.filter((p) => p.n > 0);
  return {
    key: JSON.stringify(ativas.map((p) => [p.aba, p.n])),
    count: ativas.reduce((t, p) => t + p.n, 0),
    itens: ativas,
  };
}

/** Ideias da Lebre para o cardápio viram um aviso como os outros, com o caminho para aprovar. */
export function pendenciaDasIdeias(ideias: { kind: "featured" | "pair" }[]): Pendencia | null {
  if (!ideias.length) return null;
  const destaques = ideias.filter((i) => i.kind === "featured").length;
  const pares = ideias.length - destaques;
  const partes = [
    destaques && (destaques === 1 ? "1 prato para destacar" : `${destaques} pratos para destacar`),
    pares && (pares === 1 ? "1 combinação para sugerir" : `${pares} combinações para sugerir`),
  ].filter(Boolean);
  return {
    aba: "cardapio",
    rotulo: "Cardápio",
    n: ideias.length,
    texto:
      (ideias.length === 1
        ? "Tenho 1 ideia para o seu cardápio"
        : `Tenho ${ideias.length} ideias para o seu cardápio`) + `: ${partes.join(" e ")}.`,
    solucao:
      "No Cardápio, em “A Lebre cuida do seu cardápio”, toque em Aceitar/Aplicar ou Dispensar em cada ideia. Nada muda sem você.",
  };
}

/** A pessoa está perguntando sobre o número no botão / avisos? */
export function perguntaSobreAvisos(q: string) {
  return /notifica|aviso|alerta|pend[eê]ncia|bolinha|n[uú]mero (no|do|em cima)|badge|o que (é|e|são|sao) (esse|esses|isso)/i.test(
    q,
  );
}

/** Resposta da Lebre listando cada aviso e a solução, sem chamar IA. */
export function respostaDosAvisos(itens: Pendencia[]) {
  const ativos = itens.filter((p) => p.n > 0);
  if (!ativos.length)
    return "Agora está tudo em dia: nenhum pagamento esperando, nenhum alerta e nenhuma ideia nova para o cardápio.";
  const total = ativos.reduce((t, p) => t + p.n, 0);
  const linhas = ativos.map(
    (p) => `- **${p.texto}**${p.solucao ? ` ${p.solucao}` : ""} *(em ${p.rotulo})*`,
  );
  return [
    total === 1
      ? "O número no meu botão é 1 aviso:"
      : `O número no meu botão soma ${total} avisos:`,
    "",
    ...linhas,
    "",
    "Toque no aviso aqui em cima que eu te levo até lá.",
  ].join("\n");
}
