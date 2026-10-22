/**
 * Calculadora de giro de mesas: funções puras, sem React e sem efeitos.
 *
 * Regras (prompt V5, seção 13.3):
 * A. Ciclo atual = permanência + espera pelo pagamento + liberação da mesa.
 *    Ciclo projetado = ciclo atual − (economia efetiva × proporção de contas adotantes).
 *    A economia efetiva nunca passa da espera pelo pagamento informada.
 * B. Capacidade por serviço ≈ mesas × duração do serviço ÷ ciclo médio.
 * C. Minutos economizados não viram vendas sozinhos. Contas extras = menor valor entre
 *    capacidade adicional, demanda não atendida (descontada a ociosidade que já existe)
 *    e limite operacional. Sem demanda informada, nenhuma receita nova por giro.
 * D. Receita por giro = contas extras × tíquete médio. Aumento de tíquete fica numa
 *    linha separada e só incide sobre as contas que já existem (sem duplicar).
 * E. Tempo recuperado = contas adotantes × economia efetiva. Não vira economia de folha.
 * F. Gorjeta fica separada e nunca entra no faturamento do restaurante. A parte extra
 *    segue a regra vigente da gorjeta extra (TIP_SPLIT: 70% garçom, 30% Tipe).
 * G. Margem incremental, custo da Tipe, resultado líquido e ROI. Sem margem ou sem o
 *    valor da assinatura, não existe resultado líquido (nada de lucro inventado).
 */
import { TIP_SPLIT } from "@/lib/tipe/rules";

export type UnidadeContas = "servico" | "dia";

export type Entradas = {
  /** Número de mesas do salão. */
  mesas: number;
  /** Contas fechadas hoje (uma conta = uma mesa atendida), na unidade de `unidadeContas`. */
  contas: number;
  unidadeContas: UnidadeContas;
  /** Tíquete médio por conta (R$). */
  ticketMedio: number;
  /** Horário efetivo do serviço, em minutos (tempo em que o salão recebe clientes). */
  duracaoServicoMin: number;
  servicosPorDia: number;
  diasPorMes: number;
  /** Do sentar até pedir a conta. */
  permanenciaMin: number;
  /** Do pedir a conta até o pagamento concluído. */
  esperaPagamentoMin: number;
  /** Tempo para limpar e preparar a mesa para o próximo cliente. */
  liberacaoMin: number;
  /** Percentual das contas pagas pelo QR Code (adoção por quantidade de contas). */
  adocaoPct: number;
  /** Minutos economizados no pagamento em cada conta paga pelo QR (parâmetro do cenário). */
  economiaPagamentoMin: number;
  /** Contas por serviço que deixaram de ser atendidas no movimento (fila, desistência). */
  demandaNaoAtendida: number;
  /** Contas extras por serviço que cozinha e equipe conseguem absorver. null = sem limite informado. */
  limiteOperacional: number | null;
  /** Opcionais. */
  garcons: number | null;
  /** Gorjeta média atual, em % da conta. null = não informado. */
  gorjetaAtualPct: number | null;
  /** Aumento relativo da gorjeta nas contas pagas pelo QR (10 = +10% sobre a gorjeta atual). */
  aumentoGorjetaRelPct: number;
  /** Margem de contribuição sobre vendas adicionais (%). null = não informado. */
  margemPct: number | null;
  /** Assinatura mensal da Tipe (R$). null = não informada (sem resultado líquido). */
  custoTipeMensal: number | null;
  custosVariaveisMensais: number;
  /** Aumento opcional do tíquete nas contas pagas pelo QR (%). Linha separada; padrão 0. */
  aumentoTicketPct: number;
};

export type Restricao = "capacidade" | "demanda" | "operacao" | "nenhuma";

export type Resultado = {
  entradas: Entradas;
  contasPorServico: number;
  economiaEfetivaMin: number;
  economiaLimitada: boolean;
  cicloAtualMin: number;
  cicloProjetadoMin: number;
  reducaoCicloMin: number;
  capacidadeAtual: number;
  capacidadeProjetada: number;
  capacidadeAdicional: number;
  ociosidadeAtual: number;
  demandaAtribuivel: number;
  contasExtrasServico: number;
  contasExtrasDia: number;
  contasExtrasMes: number;
  restricao: Restricao;
  contasAdotantesServico: number;
  contasAdotantesMes: number;
  tempoRecuperadoServicoMin: number;
  tempoRecuperadoDiaMin: number;
  tempoRecuperadoMesMin: number;
  tempoPorGarcomServicoMin: number | null;
  faturamentoAtualMes: number;
  /** Adoção por valor: quanto passaria pelo QR (supõe o mesmo tíquete nas contas adotantes). */
  volumeQrMes: number;
  receitaGiroMes: number;
  receitaTicketMes: number;
  receitaIncrementalMes: number;
  margemIncrementalMes: number | null;
  custoTotalMes: number;
  resultadoLiquidoMes: number | null;
  roiPct: number | null;
  gorjeta: null | {
    atualPorConta: number;
    aumentoMes: number;
    garcomMes: number;
    tipeMes: number;
  };
  avisos: string[];
};

/* ------------------------------------------------------------ saneamento */

const lim = (v: unknown, min: number, max = Number.POSITIVE_INFINITY) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};
const limOuNulo = (v: unknown, min: number, max = Number.POSITIVE_INFINITY) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

/** Corrige entradas inválidas: NaN, infinito e negativos viram o mínimo; percentuais ficam entre 0 e 100. */
export function sanear(e: Partial<Entradas>): Entradas {
  return {
    mesas: lim(e.mesas, 0, 2000),
    contas: lim(e.contas, 0, 100_000),
    unidadeContas: e.unidadeContas === "dia" ? "dia" : "servico",
    ticketMedio: lim(e.ticketMedio, 0, 100_000),
    duracaoServicoMin: lim(e.duracaoServicoMin, 0, 24 * 60),
    servicosPorDia: lim(e.servicosPorDia, 0, 6),
    diasPorMes: lim(e.diasPorMes, 0, 31),
    permanenciaMin: lim(e.permanenciaMin, 0, 24 * 60),
    esperaPagamentoMin: lim(e.esperaPagamentoMin, 0, 24 * 60),
    liberacaoMin: lim(e.liberacaoMin, 0, 24 * 60),
    adocaoPct: lim(e.adocaoPct, 0, 100),
    economiaPagamentoMin: lim(e.economiaPagamentoMin, 0, 24 * 60),
    demandaNaoAtendida: lim(e.demandaNaoAtendida, 0, 100_000),
    limiteOperacional: limOuNulo(e.limiteOperacional, 0, 100_000),
    garcons: limOuNulo(e.garcons, 0, 1000),
    gorjetaAtualPct: limOuNulo(e.gorjetaAtualPct, 0, 100),
    aumentoGorjetaRelPct: lim(e.aumentoGorjetaRelPct, 0, 100),
    margemPct: limOuNulo(e.margemPct, 0, 100),
    custoTipeMensal: limOuNulo(e.custoTipeMensal, 0, 1_000_000),
    custosVariaveisMensais: lim(e.custosVariaveisMensais, 0, 1_000_000),
    aumentoTicketPct: lim(e.aumentoTicketPct, 0, 100),
  };
}

/** Converte contas por dia em contas por serviço (sem dividir por zero). */
export function contasPorServicoDe(valor: number, unidade: UnidadeContas, servicosPorDia: number) {
  if (unidade === "servico") return valor;
  return servicosPorDia > 0 ? valor / servicosPorDia : 0;
}

/** Economia aplicada a cada conta adotante: nunca maior que a espera real pelo pagamento. */
export function economiaEfetiva(economiaMin: number, esperaMin: number) {
  return Math.max(0, Math.min(economiaMin, esperaMin));
}

/** Capacidade aproximada de contas por serviço. Ciclo zero ou mesas zero = capacidade zero. */
export function capacidade(mesas: number, duracaoMin: number, cicloMin: number) {
  if (cicloMin <= 0 || mesas <= 0 || duracaoMin <= 0) return 0;
  return (mesas * duracaoMin) / cicloMin;
}

/* -------------------------------------------------------------- cálculo */

export function calcular(bruto: Partial<Entradas>): Resultado {
  const e = sanear(bruto);
  const avisos: string[] = [];

  const contasPorServico = contasPorServicoDe(e.contas, e.unidadeContas, e.servicosPorDia);
  const adocao = e.adocaoPct / 100;
  const fatorDia = e.servicosPorDia;
  const fatorMes = e.servicosPorDia * e.diasPorMes;

  // A. Ciclo da mesa
  const econ = economiaEfetiva(e.economiaPagamentoMin, e.esperaPagamentoMin);
  const economiaLimitada = e.economiaPagamentoMin > e.esperaPagamentoMin;
  if (economiaLimitada)
    avisos.push("A economia foi limitada ao tempo de espera pelo pagamento que você informou.");
  const cicloAtualMin = e.permanenciaMin + e.esperaPagamentoMin + e.liberacaoMin;
  const reducaoCicloMin = econ * adocao;
  const cicloProjetadoMin = Math.max(0, cicloAtualMin - reducaoCicloMin);

  // B. Capacidade
  const capacidadeAtual = capacidade(e.mesas, e.duracaoServicoMin, cicloAtualMin);
  const capacidadeProjetada =
    cicloProjetadoMin > 0 ? capacidade(e.mesas, e.duracaoServicoMin, cicloProjetadoMin) : capacidadeAtual;
  if (cicloAtualMin > 0 && cicloProjetadoMin <= 0)
    avisos.push("O ciclo da mesa ficaria zerado. Revise permanência e liberação.");
  const capacidadeAdicional = Math.max(0, capacidadeProjetada - capacidadeAtual);

  // C. Contas extras: o menor entre capacidade, demanda e operação
  const ociosidadeAtual = Math.max(0, capacidadeAtual - contasPorServico);
  if (contasPorServico > capacidadeAtual && capacidadeAtual > 0)
    avisos.push(
      "As contas informadas passam da capacidade estimada. Confira o horário efetivo e os tempos da mesa.",
    );
  const demandaAtribuivel = Math.max(0, e.demandaNaoAtendida - ociosidadeAtual);
  const limite = e.limiteOperacional ?? Number.POSITIVE_INFINITY;
  const contasExtrasServico = Math.max(0, Math.min(capacidadeAdicional, demandaAtribuivel, limite));
  let restricao: Restricao = "nenhuma";
  if (contasExtrasServico > 0) {
    if (contasExtrasServico === capacidadeAdicional) restricao = "capacidade";
    else if (contasExtrasServico === demandaAtribuivel) restricao = "demanda";
    else restricao = "operacao";
  } else if (capacidadeAdicional > 0) {
    restricao = demandaAtribuivel === 0 ? "demanda" : "operacao";
  } else restricao = "capacidade";
  const contasExtrasDia = contasExtrasServico * fatorDia;
  const contasExtrasMes = contasExtrasServico * fatorMes;

  // E. Tempo recuperado (sobre as contas que já existem)
  const contasAdotantesServico = contasPorServico * adocao;
  const contasAdotantesMes = contasAdotantesServico * fatorMes;
  const tempoRecuperadoServicoMin = contasAdotantesServico * econ;
  const tempoRecuperadoDiaMin = tempoRecuperadoServicoMin * fatorDia;
  const tempoRecuperadoMesMin = tempoRecuperadoServicoMin * fatorMes;
  const tempoPorGarcomServicoMin =
    e.garcons && e.garcons > 0 ? tempoRecuperadoServicoMin / e.garcons : null;

  // D. Receita
  const faturamentoAtualMes = contasPorServico * fatorMes * e.ticketMedio;
  const volumeQrMes = contasAdotantesMes * e.ticketMedio;
  const receitaGiroMes = Math.max(0, contasExtrasMes * e.ticketMedio);
  const receitaTicketMes = Math.max(0, contasAdotantesMes * e.ticketMedio * (e.aumentoTicketPct / 100));
  const receitaIncrementalMes = receitaGiroMes + receitaTicketMes;

  // G. Retorno
  const custoTotalMes = (e.custoTipeMensal ?? 0) + e.custosVariaveisMensais;
  const margemIncrementalMes = e.margemPct === null ? null : receitaIncrementalMes * (e.margemPct / 100);
  const resultadoLiquidoMes =
    margemIncrementalMes === null || e.custoTipeMensal === null ? null : margemIncrementalMes - custoTotalMes;
  const roiPct =
    resultadoLiquidoMes === null || custoTotalMes <= 0 ? null : (resultadoLiquidoMes / custoTotalMes) * 100;

  // F. Gorjeta (fora do faturamento)
  let gorjeta: Resultado["gorjeta"] = null;
  if (e.gorjetaAtualPct !== null) {
    const atualPorConta = e.ticketMedio * (e.gorjetaAtualPct / 100);
    const aumentoMes = contasAdotantesMes * atualPorConta * (e.aumentoGorjetaRelPct / 100);
    gorjeta = {
      atualPorConta,
      aumentoMes,
      garcomMes: aumentoMes * TIP_SPLIT.waiter,
      tipeMes: aumentoMes * TIP_SPLIT.tipe,
    };
  }

  return {
    entradas: e,
    contasPorServico,
    economiaEfetivaMin: econ,
    economiaLimitada,
    cicloAtualMin,
    cicloProjetadoMin,
    reducaoCicloMin,
    capacidadeAtual,
    capacidadeProjetada,
    capacidadeAdicional,
    ociosidadeAtual,
    demandaAtribuivel,
    contasExtrasServico,
    contasExtrasDia,
    contasExtrasMes,
    restricao,
    contasAdotantesServico,
    contasAdotantesMes,
    tempoRecuperadoServicoMin,
    tempoRecuperadoDiaMin,
    tempoRecuperadoMesMin,
    tempoPorGarcomServicoMin,
    faturamentoAtualMes,
    volumeQrMes,
    receitaGiroMes,
    receitaTicketMes,
    receitaIncrementalMes,
    margemIncrementalMes,
    custoTotalMes,
    resultadoLiquidoMes,
    roiPct,
    gorjeta,
    avisos,
  };
}
