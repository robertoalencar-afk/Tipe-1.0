import { describe, expect, it } from "vitest";
import { calcular, capacidade, contasPorServicoDe, economiaEfetiva, sanear, type Entradas } from "./calculo";
import { BASE_DEMO, CENARIOS, custoPlanoPorMesas, entradasDoCenario } from "./cenarios";

/*
 * Restaurante demonstrativo (BASE_DEMO), à mão:
 *   20 mesas, 52 contas por serviço, tíquete R$ 150, serviço de 240 min, 2 serviços/dia, 26 dias/mês
 *   permanência 70 + espera 15 + liberação 5 = ciclo atual 90 min
 *   capacidade atual = 20 × 240 ÷ 90 = 53,333 contas/serviço → ociosidade = 53,333 − 52 = 1,333
 *   demanda não atendida 10 → demanda atribuível = 10 − 1,333 = 8,667; limite operacional 6
 *   fator mês = 2 × 26 = 52 serviços
 */
const REF = entradasDoCenario("referencia");
const perto = (a: number, b: number, casas = 2) => expect(a).toBeCloseTo(b, casas);

describe("valores conhecidos (conferidos à mão)", () => {
  it("cenário Referência: 9 min, adoção 50%, gorjeta +10% relativo", () => {
    const r = calcular(REF);
    // economia efetiva = min(9, 15) = 9; redução média = 9 × 0,5 = 4,5 → ciclo 85,5
    expect(r.economiaEfetivaMin).toBe(9);
    expect(r.cicloAtualMin).toBe(90);
    perto(r.cicloProjetadoMin, 85.5);
    // capacidade projetada = 4800 ÷ 85,5 = 56,1404 → adicional 2,8070
    perto(r.capacidadeAtual, 53.3333);
    perto(r.capacidadeProjetada, 56.1404);
    perto(r.capacidadeAdicional, 2.807);
    // contas extras = min(2,807; 8,667; 6) = 2,807 (limitado pela capacidade)
    perto(r.contasExtrasServico, 2.807);
    expect(r.restricao).toBe("capacidade");
    // mês: 2,807 × 52 = 145,965 contas → × R$ 150 = R$ 21.894,74
    perto(r.contasExtrasMes, 145.965);
    perto(r.receitaGiroMes, 21894.74);
    // margem 30% = 6.568,42; custo Tipe R$ 89 → resultado 6.479,42; ROI = 6.479,42 ÷ 89 = 7.280,2%
    perto(r.margemIncrementalMes!, 6568.42);
    perto(r.resultadoLiquidoMes!, 6479.42);
    perto(r.roiPct!, 7280.25, 1);
    // tempo: 52 × 0,5 = 26 contas adotantes × 9 min = 234 min/serviço; 468/dia; 12.168 min/mês (202,8 h)
    expect(r.tempoRecuperadoServicoMin).toBe(234);
    expect(r.tempoRecuperadoDiaMin).toBe(468);
    expect(r.tempoRecuperadoMesMin).toBe(12168);
    perto(r.tempoPorGarcomServicoMin!, 46.8); // 234 ÷ 5 garçons
    // faturamento atual = 52 × 52 × 150 = 405.600; volume no QR = 1.352 × 150 = 202.800
    expect(r.faturamentoAtualMes).toBe(405600);
    expect(r.volumeQrMes).toBe(202800);
    // gorjeta: 10% de 150 = R$ 15/conta; +10% relativo em 1.352 contas = 2.028; 70% = 1.419,60; 30% = 608,40
    expect(r.gorjeta!.atualPorConta).toBe(15);
    perto(r.gorjeta!.aumentoMes, 2028);
    perto(r.gorjeta!.garcomMes, 1419.6);
    perto(r.gorjeta!.tipeMes, 608.4);
  });

  it("cenário Conservador: 8 min, adoção 30%", () => {
    const r = calcular(entradasDoCenario("conservador"));
    // redução 8 × 0,3 = 2,4 → ciclo 87,6 → capacidade 4800 ÷ 87,6 = 54,7945 → adicional 1,4612
    perto(r.cicloProjetadoMin, 87.6);
    perto(r.capacidadeAdicional, 1.4612, 3);
    // mês: 1,4612 × 52 = 75,982 contas → R$ 11.397,26
    perto(r.receitaGiroMes, 11397.26);
    // tempo: 52 × 0,3 × 8 = 124,8 min/serviço → 6.489,6 min/mês
    perto(r.tempoRecuperadoServicoMin, 124.8);
    perto(r.tempoRecuperadoMesMin, 6489.6);
    // sem aumento de gorjeta no conservador
    expect(r.gorjeta!.aumentoMes).toBe(0);
  });

  it("cenário Otimista: 12 min, adoção 70%", () => {
    const r = calcular(entradasDoCenario("otimista"));
    // redução 12 × 0,7 = 8,4 → ciclo 81,6 → capacidade 58,8235 → adicional 5,4902 (abaixo do limite 6)
    perto(r.cicloProjetadoMin, 81.6);
    perto(r.capacidadeAdicional, 5.4902, 3);
    perto(r.contasExtrasServico, 5.4902, 3);
    // mês: 5,4902 × 52 = 285,49 contas → R$ 42.823,53
    perto(r.receitaGiroMes, 42823.53);
    // tempo: 52 × 0,7 × 12 = 436,8 min/serviço → 22.713,6 min/mês
    perto(r.tempoRecuperadoMesMin, 22713.6);
  });

  it("os cenários usam 8, 9 e 12 minutos", () => {
    expect(CENARIOS.conservador.parametros.economiaPagamentoMin).toBe(8);
    expect(CENARIOS.referencia.parametros.economiaPagamentoMin).toBe(9);
    expect(CENARIOS.otimista.parametros.economiaPagamentoMin).toBe(12);
  });
});

describe("regras obrigatórias (seção 14)", () => {
  it("adoção 0% → nenhum ganho atribuído ao QR", () => {
    const r = calcular({ ...REF, adocaoPct: 0 });
    expect(r.reducaoCicloMin).toBe(0);
    expect(r.cicloProjetadoMin).toBe(r.cicloAtualMin);
    expect(r.capacidadeAdicional).toBe(0);
    expect(r.contasExtrasMes).toBe(0);
    expect(r.receitaIncrementalMes).toBe(0);
    expect(r.tempoRecuperadoMesMin).toBe(0);
    expect(r.gorjeta!.aumentoMes).toBe(0);
    expect(r.volumeQrMes).toBe(0);
  });

  it("tempo de pagamento 0 → nenhuma economia", () => {
    const r = calcular({ ...REF, esperaPagamentoMin: 0 });
    expect(r.economiaEfetivaMin).toBe(0);
    expect(r.tempoRecuperadoMesMin).toBe(0);
    expect(r.capacidadeAdicional).toBe(0);
    expect(r.receitaGiroMes).toBe(0);
  });

  it("economia maior que a espera → limitada ao tempo real", () => {
    const r = calcular({ ...REF, economiaPagamentoMin: 20, esperaPagamentoMin: 6 });
    expect(r.economiaEfetivaMin).toBe(6);
    expect(r.economiaLimitada).toBe(true);
    expect(r.avisos.join(" ")).toMatch(/limitada/);
    // 52 × 0,5 × 6 = 156 min por serviço, não 52 × 0,5 × 20 = 520
    expect(r.tempoRecuperadoServicoMin).toBe(156);
    expect(economiaEfetiva(12, 10)).toBe(10);
    expect(economiaEfetiva(8, 15)).toBe(8);
  });

  it("sem demanda adicional → nenhuma receita nova por giro", () => {
    const r = calcular({ ...REF, demandaNaoAtendida: 0 });
    expect(r.capacidadeAdicional).toBeGreaterThan(0);
    expect(r.contasExtrasMes).toBe(0);
    expect(r.receitaGiroMes).toBe(0);
    expect(r.restricao).toBe("demanda");
    // o tempo recuperado continua existindo
    expect(r.tempoRecuperadoMesMin).toBe(12168);
  });

  it("capacidade já ociosa → não atribui mais vendas", () => {
    // 30 contas para capacidade de 53,33 → 23,33 de folga; demanda de 10 cabe na folga atual
    const r = calcular({ ...REF, contas: 30 });
    perto(r.ociosidadeAtual, 23.333);
    expect(r.demandaAtribuivel).toBe(0);
    expect(r.contasExtrasMes).toBe(0);
    expect(r.receitaGiroMes).toBe(0);
  });

  it("limite operacional restringe as contas extras", () => {
    const r = calcular({ ...REF, limiteOperacional: 1 });
    expect(r.contasExtrasServico).toBe(1);
    expect(r.restricao).toBe("operacao");
    expect(r.receitaGiroMes).toBe(1 * 52 * 150);
  });

  it("receita incremental nunca é negativa e nada vira NaN (1.000 entradas aleatórias)", () => {
    let semente = 7;
    const rnd = () => {
      semente = (semente * 16807) % 2147483647;
      return semente / 2147483647;
    };
    const louco = () => {
      const x = rnd();
      if (x < 0.05) return Number.NaN;
      if (x < 0.1) return -100 * rnd();
      if (x < 0.13) return Number.POSITIVE_INFINITY;
      if (x < 0.2) return 0;
      return rnd() * 500;
    };
    for (let i = 0; i < 1000; i++) {
      const e = Object.fromEntries(
        Object.keys(REF).map((k) => [k, k === "unidadeContas" ? (rnd() < 0.5 ? "dia" : "servico") : louco()]),
      ) as unknown as Entradas;
      const r = calcular(e);
      expect(r.receitaGiroMes).toBeGreaterThanOrEqual(0);
      expect(r.receitaIncrementalMes).toBeGreaterThanOrEqual(0);
      expect(r.contasExtrasMes).toBeGreaterThanOrEqual(0);
      expect(r.cicloProjetadoMin).toBeLessThanOrEqual(r.cicloAtualMin);
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === "number") expect(Number.isFinite(v), `${k} = ${v}`).toBe(true);
      }
    }
  });

  it("nenhuma divisão por zero", () => {
    const zero = calcular({});
    expect(zero.capacidadeAtual).toBe(0);
    expect(zero.receitaIncrementalMes).toBe(0);
    expect(zero.roiPct).toBeNull();
    expect(capacidade(20, 240, 0)).toBe(0);
    expect(capacidade(0, 240, 90)).toBe(0);
    expect(contasPorServicoDe(100, "dia", 0)).toBe(0);
    const r = calcular({ ...REF, garcons: 0, custoTipeMensal: 0, custosVariaveisMensais: 0 });
    expect(r.tempoPorGarcomServicoMin).toBeNull();
    expect(r.roiPct).toBeNull();
    // ciclo projetado zerado: sem permanência e sem liberação, adoção total
    const z = calcular({ ...REF, permanenciaMin: 0, liberacaoMin: 0, adocaoPct: 100, economiaPagamentoMin: 15 });
    expect(z.cicloProjetadoMin).toBe(0);
    expect(Number.isFinite(z.capacidadeProjetada)).toBe(true);
    expect(z.capacidadeAdicional).toBe(0);
  });

  it("entradas inválidas são saneadas", () => {
    const s = sanear({
      mesas: Number.NaN,
      contas: -10,
      adocaoPct: 150,
      ticketMedio: Number.POSITIVE_INFINITY,
      margemPct: Number.NaN,
      garcons: undefined,
      diasPorMes: 45,
      unidadeContas: "semana" as never,
      gorjetaAtualPct: "abc" as never,
    });
    expect(s.mesas).toBe(0);
    expect(s.contas).toBe(0);
    expect(s.adocaoPct).toBe(100);
    expect(s.ticketMedio).toBe(0);
    expect(s.margemPct).toBeNull();
    expect(s.garcons).toBeNull();
    expect(s.diasPorMes).toBe(31);
    expect(s.unidadeContas).toBe("servico");
    expect(s.gorjetaAtualPct).toBeNull();
  });

  it("coerência entre serviço, dia e mês", () => {
    const r = calcular(REF);
    const { servicosPorDia, diasPorMes } = r.entradas;
    perto(r.contasExtrasDia, r.contasExtrasServico * servicosPorDia, 6);
    perto(r.contasExtrasMes, r.contasExtrasDia * diasPorMes, 6);
    perto(r.tempoRecuperadoMesMin, r.tempoRecuperadoDiaMin * diasPorMes, 6);
    perto(r.receitaGiroMes, r.contasExtrasMes * r.entradas.ticketMedio, 6);
    // 104 contas por dia em 2 serviços = 52 por serviço: mesmo resultado
    const porDia = calcular({ ...REF, contas: 104, unidadeContas: "dia" });
    expect(porDia.contasPorServico).toBe(52);
    expect(porDia.receitaGiroMes).toBeCloseTo(r.receitaGiroMes, 6);
    // 3 serviços por dia: dia e mês crescem 50%, serviço não muda
    const tres = calcular({ ...REF, servicosPorDia: 3 });
    expect(tres.contasExtrasServico).toBeCloseTo(r.contasExtrasServico, 9);
    expect(tres.contasExtrasMes).toBeCloseTo(r.contasExtrasMes * 1.5, 6);
  });

  it("cada campo muda o resultado", () => {
    const base = calcular(REF);
    const mudancas: Partial<Record<keyof Entradas, number | string | null>> = {
      mesas: 24,
      contas: 50,
      unidadeContas: "dia",
      ticketMedio: 180,
      duracaoServicoMin: 300,
      servicosPorDia: 1,
      diasPorMes: 22,
      permanenciaMin: 60,
      esperaPagamentoMin: 6,
      liberacaoMin: 10,
      adocaoPct: 60,
      economiaPagamentoMin: 10,
      demandaNaoAtendida: 2,
      limiteOperacional: 1,
      garcons: 4,
      gorjetaAtualPct: 12,
      aumentoGorjetaRelPct: 5,
      margemPct: 40,
      custoTipeMensal: 129,
      custosVariaveisMensais: 200,
      aumentoTicketPct: 5,
    };
    expect(Object.keys(mudancas).sort()).toEqual(Object.keys(REF).sort());
    const assinatura = (r: ReturnType<typeof calcular>) =>
      JSON.stringify({ ...r, entradas: undefined, avisos: undefined });
    for (const [k, v] of Object.entries(mudancas)) {
      const outro = calcular({ ...REF, [k]: v });
      expect(assinatura(outro), `campo ${k}`).not.toBe(assinatura(base));
    }
  });

  it("gorjeta, faturamento, margem e custo ficam separados", () => {
    const base = calcular(REF);
    // gorjeta não mexe em receita, margem nem resultado
    const semGorjeta = calcular({ ...REF, gorjetaAtualPct: 30, aumentoGorjetaRelPct: 50 });
    expect(semGorjeta.receitaIncrementalMes).toBe(base.receitaIncrementalMes);
    expect(semGorjeta.resultadoLiquidoMes).toBe(base.resultadoLiquidoMes);
    expect(semGorjeta.gorjeta!.aumentoMes).toBeGreaterThan(base.gorjeta!.aumentoMes);
    // a gorjeta extra se divide 70/30 e nada fica com o restaurante
    const g = base.gorjeta!;
    perto(g.garcomMes + g.tipeMes, g.aumentoMes, 9);
    perto(g.garcomMes / g.aumentoMes, 0.7, 9);
    // custo só mexe no resultado, não na receita nem na margem
    const caro = calcular({ ...REF, custoTipeMensal: 500 });
    expect(caro.receitaIncrementalMes).toBe(base.receitaIncrementalMes);
    expect(caro.margemIncrementalMes).toBe(base.margemIncrementalMes);
    perto(caro.resultadoLiquidoMes!, base.resultadoLiquidoMes! - 411, 6);
    // sem margem informada não existe resultado líquido nem ROI (não inventa lucro)
    const semMargem = calcular({ ...REF, margemPct: null });
    expect(semMargem.receitaIncrementalMes).toBe(base.receitaIncrementalMes);
    expect(semMargem.margemIncrementalMes).toBeNull();
    expect(semMargem.resultadoLiquidoMes).toBeNull();
    expect(semMargem.roiPct).toBeNull();
    // aumento de tíquete fica em linha própria e não altera a receita por giro
    const ticket = calcular({ ...REF, aumentoTicketPct: 5 });
    expect(ticket.receitaGiroMes).toBe(base.receitaGiroMes);
    perto(ticket.receitaTicketMes, 1352 * 150 * 0.05); // 10.140
    perto(ticket.receitaIncrementalMes, base.receitaGiroMes + 10140);
    // sem gorjeta informada, nenhum valor de gorjeta
    expect(calcular({ ...REF, gorjetaAtualPct: null }).gorjeta).toBeNull();
  });

  it("resultado líquido pode ser negativo, receita não", () => {
    const r = calcular({ ...REF, demandaNaoAtendida: 0, custosVariaveisMensais: 300 });
    expect(r.receitaIncrementalMes).toBe(0);
    expect(r.resultadoLiquidoMes).toBe(-389);
    perto(r.roiPct!, -100);
  });
});

describe("custo do plano a partir de src/lib/tipe/plans.ts", () => {
  it("escolhe o plano pelo número de mesas", () => {
    expect(custoPlanoPorMesas(8).preco).toBe(59);
    expect(custoPlanoPorMesas(20).preco).toBe(89);
    expect(custoPlanoPorMesas(35).preco).toBe(129);
    expect(custoPlanoPorMesas(90).preco).toBe(129);
    expect(BASE_DEMO.custoTipeMensal).toBe(89);
  });
});
