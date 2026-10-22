/**
 * Cenários, valores iniciais e fontes da calculadora de giro.
 *
 * Todos os valores iniciais são HIPÓTESES demonstrativas, não médias comprovadas.
 * Os números da Sunday são indicadores divulgados por outra empresa: servem de
 * referência e comparação, nunca de resultado da Tipe nem de promessa.
 */
import { PLANS, SHOW_PLAN_PRICES } from "@/lib/tipe/plans";
import type { Entradas } from "./calculo";

export type CenarioId = "conservador" | "referencia" | "otimista";

/** Fontes públicas (conferidas ao vivo em 22/10/2026). */
export const FONTES = {
  home: {
    nome: "Sunday, página inicial (versão norte-americana)",
    url: "https://sundayapp.com/",
  },
  roi: {
    nome: "Sunday, “QR code payments for restaurants: the real ROI” (maio de 2026)",
    url: "https://sundayapp.com/qr-code-payments-for-restaurants-real-roi/",
  },
} as const;

/** Indicadores divulgados pela Sunday. Só comparação; nunca somados aos cálculos. */
export const INDICADORES_SUNDAY = {
  minutosPorMesa: 12,
  minutosPorGarcomTurno: 72,
  gorjetasPct: 10,
  avaliacoesMultiplo: 5,
  faturamentoPct: 10,
  ticketPct: 15,
  emailsPct: 60,
  /** Casos citados no estudo de ROI: Chug's Diner, Bar La Rue e Jack's Wife Freda. */
  casosRoiMin: [8, 9, 10] as const,
} as const;

export type ParametrosCenario = {
  economiaPagamentoMin: number;
  adocaoPct: number;
  aumentoGorjetaRelPct: number;
};

export const CENARIOS: Record<
  CenarioId,
  { nome: string; parametros: ParametrosCenario; origem: string }
> = {
  conservador: {
    nome: "Conservador",
    parametros: { economiaPagamentoMin: 8, adocaoPct: 30, aumentoGorjetaRelPct: 0 },
    origem:
      "8 min por conta: menor economia entre os casos do estudo de ROI da Sunday. Adoção de 30%: hipótese. Sem aumento de gorjeta.",
  },
  referencia: {
    nome: "Referência",
    parametros: { economiaPagamentoMin: 9, adocaoPct: 50, aumentoGorjetaRelPct: 10 },
    origem:
      "9 min por conta: valor do meio entre os casos do estudo (8, 9 e 10 min). Adoção de 50%: hipótese. Gorjeta +10%: indicador da Sunday, como aumento relativo.",
  },
  otimista: {
    nome: "Otimista",
    parametros: { economiaPagamentoMin: 12, adocaoPct: 70, aumentoGorjetaRelPct: 10 },
    origem:
      "12 min por mesa: indicador da página inicial da Sunday. Adoção de 70%: hipótese. Gorjeta +10%: indicador da Sunday, como aumento relativo.",
  },
};

/** Preço mensal do plano que comporta o número de mesas (fonte: src/lib/tipe/plans.ts). */
export function custoPlanoPorMesas(mesas: number) {
  const plano = PLANS.find((p) => mesas <= p.maxTables) ?? PLANS[2];
  return { id: plano.id, nome: plano.name, preco: plano.price };
}

/**
 * Valor inicial da assinatura. Respeita SHOW_PLAN_PRICES: com preços ocultos no
 * site, o campo começa vazio (null) e nenhum preço de plano aparece na calculadora.
 */
export function custoInicial(mesas: number, mostrarPrecos: boolean = SHOW_PLAN_PRICES): number | null {
  return mostrarPrecos ? custoPlanoPorMesas(mesas).preco : null;
}

/** Restaurante demonstrativo. Hipóteses editáveis, não médias de mercado. */
export const BASE_DEMO: Omit<Entradas, keyof ParametrosCenario> = {
  mesas: 20,
  contas: 52,
  unidadeContas: "servico",
  ticketMedio: 150,
  duracaoServicoMin: 240,
  servicosPorDia: 2,
  diasPorMes: 26,
  permanenciaMin: 70,
  esperaPagamentoMin: 15,
  liberacaoMin: 5,
  demandaNaoAtendida: 10,
  limiteOperacional: 6,
  garcons: 5,
  gorjetaAtualPct: 10,
  margemPct: 30,
  custoTipeMensal: custoInicial(20),
  custosVariaveisMensais: 0,
  aumentoTicketPct: 0,
};

export function entradasDoCenario(id: CenarioId, base: Omit<Entradas, keyof ParametrosCenario> = BASE_DEMO): Entradas {
  return { ...base, ...CENARIOS[id].parametros };
}
