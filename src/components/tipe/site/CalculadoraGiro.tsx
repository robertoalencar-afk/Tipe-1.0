/**
 * Calculadora de giro de mesas (V5). Substitui a experiência de
 * src/components/tipe/LandingCalculator.tsx. Toda a conta mora em
 * src/lib/tipe/giro (funções puras e testadas); aqui só há interface.
 *
 * Os valores ficam no navegador. Só são guardados (localStorage, via
 * saveCalculator) quando o gestor clica no CTA, e só saem do navegador se ele
 * enviar o cadastro do teste grátis, que avisa isso.
 */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcular, type Entradas, type UnidadeContas } from "@/lib/tipe/giro/calculo";
import {
  BASE_DEMO,
  CENARIOS,
  INDICADORES_SUNDAY,
  custoInicial,
  custoPlanoPorMesas,
  type CenarioId,
  type ParametrosCenario,
} from "@/lib/tipe/giro/cenarios";
import { brl, brlSinal, duracao, numero, pct } from "@/lib/tipe/giro/formato";
import { SHOW_PLAN_PRICES } from "@/lib/tipe/plans";
import { saveCalculator } from "@/lib/tipe/tracking";
import { Fios } from "./Bigode";
import { BotaoAjuda, Campo, ESTILO_SLIDER } from "./calculadora/Campo";
import { ComoCalculamos } from "./calculadora/ComoCalculamos";
import { GraficoCapacidade, GraficoProjecao, GraficoTempo } from "./calculadora/Graficos";
import { NumeroAnimado } from "./calculadora/animacao";
import { SimulacaoMesas } from "./calculadora/SimulacaoMesas";
import { ImpactoMinuto } from "./ImpactoMinuto";
import { Titulo } from "./Site";

type Base = Omit<Entradas, keyof ParametrosCenario>;
type IdCard = "tempo" | "capacidade" | "receita" | "resultado";

const ORDEM: CenarioId[] = ["conservador", "referencia", "otimista"];

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[#021E34]/45">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

function SeletorCenario({
  valor,
  ajustado,
  onChange,
}: {
  valor: CenarioId;
  ajustado: boolean;
  onChange: (c: CenarioId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Cenário"
      className="grid grid-cols-3 gap-1 rounded-full bg-white/[0.07] p-1"
    >
      {ORDEM.map((id) => {
        const ativo = valor === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(id)}
            className={cn(
              "h-9 rounded-full px-2 text-[0.82rem] font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-[0.875rem]",
              ativo ? "bg-white text-[#021E34]" : "text-white/70 hover:text-white",
            )}
          >
            {CENARIOS[id].nome}
            {ativo && ajustado && <span className="sr-only"> (ajustado)</span>}
          </button>
        );
      })}
    </div>
  );
}

function Destaque({
  id,
  rotulo,
  valor,
  formatar,
  sub,
  ativo,
  onAjuda,
  principal = false,
  vazio,
}: {
  id: IdCard;
  rotulo: string;
  valor: number;
  formatar: (n: number) => string;
  sub: ReactNode;
  ativo: boolean;
  onAjuda: () => void;
  principal?: boolean;
  vazio?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-[1.1rem] border p-3.5 transition-colors duration-500 sm:p-4",
        principal
          ? "border-transparent bg-[#0FC9BD] text-[#021E34]"
          : "border-white/10 bg-white/[0.05] text-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[0.75rem] leading-snug sm:text-[0.8rem]",
            principal ? "text-[#021E34]/75" : "text-white/65",
          )}
        >
          {rotulo}
        </p>
        <BotaoAjuda
          aberto={ativo}
          onClick={onAjuda}
          controla="giro-explicacao"
          rotulo={rotulo}
          tom={principal ? "claro" : "escuro"}
        />
      </div>
      {vazio ? (
        <p
          className="mt-2 text-[0.85rem] leading-snug text-white/85 sm:text-[0.9rem]"
          data-card={id}
        >
          {vazio}
        </p>
      ) : (
        <p
          className="money mt-2 font-display text-[clamp(1.35rem,1.05rem+1.3vw,2.05rem)] leading-none tracking-[-0.045em] tabular-nums"
          data-card={id}
        >
          <NumeroAnimado valor={valor} formatar={formatar} />
        </p>
      )}
      <p
        className={cn(
          "mt-2 text-[0.72rem] leading-snug sm:text-[0.75rem]",
          principal ? "text-[#021E34]/70" : "text-white/55",
        )}
      >
        {sub}
      </p>
    </div>
  );
}

export function CalculadoraGiro() {
  const [cenario, setCenario] = useState<CenarioId>("referencia");
  const [params, setParams] = useState<ParametrosCenario>(CENARIOS.referencia.parametros);
  const [base, setBase] = useState<Base>(BASE_DEMO);
  const [custoEditado, setCustoEditado] = useState(false);
  const [card, setCard] = useState<IdCard | null>(null);
  const premissas = useRef<HTMLDetailsElement>(null);
  const personalizar = useRef<HTMLDetailsElement>(null);
  const abrirPremissas = () => {
    const d = premissas.current;
    if (!d) return;
    if (personalizar.current) personalizar.current.open = true;
    d.open = true;
    d.scrollIntoView({ behavior: "smooth", block: "start" });
    d.querySelector<HTMLInputElement>("[data-campo-retorno] input[type=text]")?.focus({
      preventScroll: true,
    });
  };

  const r = useMemo(() => calcular({ ...base, ...params }), [base, params]);
  const e = r.entradas;
  const ref = CENARIOS[cenario].parametros;
  const ajustado =
    params.adocaoPct !== ref.adocaoPct ||
    params.economiaPagamentoMin !== ref.economiaPagamentoMin ||
    params.aumentoGorjetaRelPct !== ref.aumentoGorjetaRelPct;

  const setB =
    <K extends keyof Base>(k: K) =>
    (v: number | null) =>
      setBase((b) => {
        const novo = { ...b, [k]: v } as Base;
        if (k === "mesas" && !custoEditado && SHOW_PLAN_PRICES)
          novo.custoTipeMensal = custoInicial(Number(v) || 0);
        return novo;
      });
  const setP = (k: keyof ParametrosCenario) => (v: number | null) =>
    setParams((p) => ({ ...p, [k]: v ?? 0 }));
  const trocarCenario = (c: CenarioId) => {
    setCenario(c);
    setParams(CENARIOS[c].parametros);
  };
  const trocarUnidade = (u: UnidadeContas) =>
    setBase((b) => {
      if (b.unidadeContas === u) return b;
      const s = Math.max(1, b.servicosPorDia);
      return {
        ...b,
        unidadeContas: u,
        contas: Math.round(u === "dia" ? b.contas * s : b.contas / s),
      };
    });

  const restricaoTexto = {
    capacidade: "Limitada pela capacidade que o tempo libera.",
    demanda:
      r.contasExtrasServico > 0
        ? "Limitada pela procura não atendida."
        : "Sem procura acima da capacidade atual, não há receita nova por giro.",
    operacao: "Limitada pelo que cozinha e equipe absorvem.",
    nenhuma: "",
  }[r.restricao];

  const faltaResultado = [
    e.margemPct === null ? "a margem" : null,
    e.custoTipeMensal === null ? "o valor da assinatura" : null,
  ].filter(Boolean);
  const mensagemVazia = `Informe ${faltaResultado.join(" e ")} para ver o resultado`;

  const explicacoes: Record<IdCard, { titulo: string; texto: ReactNode }> = {
    tempo: {
      titulo: "Tempo potencialmente recuperado",
      texto: (
        <>
          {numero(r.contasAdotantesServico, 1)} contas pagas pelo QR por serviço ×{" "}
          {numero(r.economiaEfetivaMin, 1)} min economizados em cada uma ×{" "}
          {numero(e.servicosPorDia * e.diasPorMes)} serviços no mês. É o tempo que a equipe deixa de
          gastar levando conta e maquininha. Não vira economia de folha. Para comparar, a Sunday
          divulga {INDICADORES_SUNDAY.minutosPorGarcomTurno} min por garçom por turno na rede dele.
        </>
      ),
    },
    capacidade: {
      titulo: "Capacidade adicional estimada",
      texto: (
        <>
          {numero(e.mesas)} mesas × {numero(e.duracaoServicoMin)} min de serviço ÷ ciclo da mesa. O
          ciclo cai de {numero(r.cicloAtualMin, 1)} para {numero(r.cicloProjetadoMin, 1)} min porque{" "}
          {pct(e.adocaoPct)} das contas economizam {numero(r.economiaEfetivaMin, 1)} min no
          pagamento. É capacidade, não venda: só conta se houver cliente esperando mesa.
        </>
      ),
    },
    receita: {
      titulo: "Receita incremental condicionada à demanda",
      texto: (
        <>
          Contas extras por serviço = menor valor entre capacidade adicional (
          {numero(r.capacidadeAdicional, 1)}), procura não atendida menos a folga que já existe (
          {numero(r.demandaAtribuivel, 1)}) e limite da operação (
          {e.limiteOperacional === null ? "não informado" : numero(e.limiteOperacional)}).
          Resultado: {numero(r.contasExtrasServico, 1)} por serviço, {numero(r.contasExtrasMes)} no
          mês, × {brl(e.ticketMedio)} de tíquete.
          {r.receitaTicketMes > 0 && (
            <>
              {" "}
              Inclui {brl(r.receitaTicketMes)} do aumento de tíquete que você informou, em linha
              separada.
            </>
          )}
        </>
      ),
    },
    resultado: {
      titulo: "Resultado financeiro líquido estimado",
      texto:
        r.resultadoLiquidoMes === null ? (
          <>
            {mensagemVazia} em “Mais premissas”. Sem esses dados, não estimamos resultado:
            faturamento não é lucro. A receita e o tempo continuam calculados.
          </>
        ) : (
          <>
            Margem de {pct(e.margemPct ?? 0)} sobre {brl(r.receitaIncrementalMes)} ={" "}
            {brl(r.margemIncrementalMes ?? 0)}, menos {brl(e.custoTipeMensal ?? 0)} da assinatura da
            Tipe
            {e.custosVariaveisMensais > 0 && (
              <> e {brl(e.custosVariaveisMensais)} de custos extras</>
            )}
            .{r.roiPct !== null && <> Retorno sobre o custo: {pct(r.roiPct)}.</>} Gorjetas não
            entram.
          </>
        ),
    },
  };

  const salvarECta = () =>
    saveCalculator({
      mesas: e.mesas,
      contas_por_servico: Math.round(r.contasPorServico),
      ticket: e.ticketMedio,
      adocao_pct: e.adocaoPct,
      economia_min: r.economiaEfetivaMin,
      tempo_recuperado_mes_min: Math.round(r.tempoRecuperadoMesMin),
      capacidade_adicional_servico: Math.round(r.capacidadeAdicional * 10) / 10,
      receita_incremental_mes: Math.round(r.receitaIncrementalMes),
      faturamento_extra_mes: Math.round(r.receitaIncrementalMes),
      mesas_extras_mes: Math.round(r.contasExtrasMes),
    });

  const fatMesCom = r.faturamentoAtualMes + r.receitaIncrementalMes;
  const contasMes = r.contasPorServico * e.servicosPorDia * e.diasPorMes;

  return (
    <section
      id="calculadora"
      data-tema="claro"
      aria-label="Calculadora de giro de mesas"
      className="scroll-mt-16 py-12 sm:py-16 lg:py-20"
    >
      <style>{ESTILO_SLIDER}</style>
      <div className="container-page">
        <Titulo
          rotulo="Calculadora de giro"
          titulo="Quanto vale cada minuto no seu salão?"
          texto="Veja quanto tempo seu restaurante poderia recuperar com pagamentos mais rápidos. É uma estimativa com os seus números, não uma garantia."
        />

        <div className="mt-10 grid items-start gap-4 sm:mt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-5">
          {/* ------------------------------------------------ Dados do restaurante */}
          <div className="rounded-[1.6rem] border border-[#021E34]/10 bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[1.15rem] font-medium tracking-[-0.02em] text-[#021E34]">
                Seu restaurante
              </h3>
              <p className="text-[0.75rem] text-[#021E34]/50">
                Comece com três números. Os valores iniciais são exemplos
              </p>
            </div>
            <div className="mt-6 space-y-7">
              <Grupo titulo="Para começar">
                <Campo rotulo="Mesas" valor={e.mesas} onChange={setB("mesas")} min={1} max={80} />
                <Campo
                  rotulo={
                    e.unidadeContas === "dia"
                      ? "Contas fechadas por dia"
                      : "Contas fechadas por serviço"
                  }
                  valor={base.contas}
                  onChange={setB("contas")}
                  min={0}
                  max={e.unidadeContas === "dia" ? 800 : 400}
                  ajuda="Uma conta é uma mesa atendida, do sentar ao pagamento. Use a média de um serviço normal."
                  extra={
                    <div
                      role="radiogroup"
                      aria-label="Unidade das contas"
                      className="mt-1 inline-flex rounded-full bg-[#021E34]/[0.05] p-0.5 text-[0.72rem]"
                    >
                      {(["servico", "dia"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          role="radio"
                          aria-checked={base.unidadeContas === u}
                          onClick={() => trocarUnidade(u)}
                          className={cn(
                            "h-7 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-[#0FC9BD]",
                            base.unidadeContas === u
                              ? "bg-white text-[#021E34] shadow-[0_1px_2px_rgb(2_30_52/0.12)]"
                              : "text-[#021E34]/55",
                          )}
                        >
                          por {u === "dia" ? "dia" : "serviço"}
                        </button>
                      ))}
                    </div>
                  }
                />
                <Campo
                  rotulo="Tempo para fechar uma conta"
                  sufixo="min"
                  valor={e.esperaPagamentoMin}
                  onChange={setB("esperaPagamentoMin")}
                  min={0}
                  max={40}
                  ajuda="Do pedido da conta ao pagamento: chamar o garçom, esperar a conta, dividir, esperar a maquininha e pagar. Se não souber, deixe o valor de exemplo."
                />
              </Grupo>

              <details
                ref={personalizar}
                className="group scroll-mt-24 rounded-2xl border border-[#021E34]/10 px-4 py-3"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-[0.95rem] font-medium text-[#021E34] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FC9BD] [&::-webkit-details-marker]:hidden">
                  Personalizar os cálculos
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-5 space-y-7">
              <Grupo titulo="Salão e serviço">
                <Campo
                  rotulo="Tíquete médio por conta"
                  prefixo="R$"
                  valor={e.ticketMedio}
                  onChange={setB("ticketMedio")}
                  min={10}
                  max={600}
                  passo={5}
                />
                <Campo
                  rotulo="Horário efetivo do serviço"
                  sufixo="min"
                  valor={e.duracaoServicoMin}
                  onChange={setB("duracaoServicoMin")}
                  min={30}
                  max={720}
                  passo={10}
                  ajuda="O tempo em que o salão realmente recebe clientes num serviço (almoço ou jantar), sem contar preparo e fechamento."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    rotulo="Serviços por dia"
                    valor={e.servicosPorDia}
                    onChange={setB("servicosPorDia")}
                    min={1}
                    max={4}
                  />
                  <Campo
                    rotulo="Dias abertos por mês"
                    valor={e.diasPorMes}
                    onChange={setB("diasPorMes")}
                    min={1}
                    max={31}
                  />
                </div>
              </Grupo>

              <Grupo titulo="Tempos da mesa">
                <Campo
                  rotulo="Tempo na mesa até pedir a conta"
                  sufixo="min"
                  valor={e.permanenciaMin}
                  onChange={setB("permanenciaMin")}
                  min={10}
                  max={240}
                />
                <Campo
                  rotulo="Liberar e preparar a mesa"
                  sufixo="min"
                  valor={e.liberacaoMin}
                  onChange={setB("liberacaoMin")}
                  min={0}
                  max={30}
                />
              </Grupo>

              <Grupo titulo="Movimento">
                <Campo
                  rotulo="Procura não atendida por serviço"
                  sufixo="contas"
                  valor={e.demandaNaoAtendida}
                  onChange={setB("demandaNaoAtendida")}
                  min={0}
                  max={60}
                  ajuda="Grupos que desistem pela fila ou não conseguem mesa nos horários cheios. Sem procura extra, tempo economizado não vira venda nova."
                />
              </Grupo>

              <details
                ref={premissas}
                className="group scroll-mt-24 border-t border-[#021E34]/8 pt-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-[0.9rem] font-medium text-[#021E34] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FC9BD] [&::-webkit-details-marker]:hidden">
                  Mais premissas (opcional)
                  <ChevronDown
                    className="h-4 w-4 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="mt-5 space-y-7">
                  <Grupo titulo="Operação">
                    <Campo
                      rotulo="Contas extras que a cozinha aguenta"
                      sufixo="/serv."
                      opcional
                      valor={e.limiteOperacional}
                      onChange={setB("limiteOperacional")}
                      min={0}
                      max={40}
                      ajuda="Quantas mesas a mais por serviço cozinha e equipe conseguem atender bem. Vazio: sem limite informado."
                    />
                    <Campo
                      rotulo="Garçons por serviço"
                      opcional
                      valor={e.garcons}
                      onChange={setB("garcons")}
                      min={0}
                      max={40}
                    />
                  </Grupo>
                  <Grupo titulo="Gorjetas (fora do faturamento)">
                    <Campo
                      rotulo="Gorjeta média atual"
                      sufixo="% da conta"
                      opcional
                      valor={e.gorjetaAtualPct}
                      onChange={setB("gorjetaAtualPct")}
                      min={0}
                      max={25}
                      casas={0}
                    />
                    <Campo
                      rotulo="Aumento relativo da gorjeta no QR"
                      sufixo="%"
                      valor={params.aumentoGorjetaRelPct}
                      onChange={setP("aumentoGorjetaRelPct")}
                      min={0}
                      max={30}
                      ajuda="Aumento sobre a gorjeta atual, não em pontos percentuais: 10% sobre uma gorjeta de 10% da conta dá 11%. A Sunday divulga gorjetas 10% maiores."
                    />
                  </Grupo>
                  <Grupo titulo="Retorno">
                    <Campo
                      rotulo="Margem de contribuição nas vendas extras"
                      sufixo="%"
                      opcional
                      valor={e.margemPct}
                      onChange={setB("margemPct")}
                      min={0}
                      max={90}
                      ajuda="O que sobra de cada real vendido a mais depois de insumos e custos variáveis. Sem margem, não mostramos resultado líquido."
                    />
                    <div data-campo-retorno>
                      <Campo
                        rotulo="Assinatura mensal da Tipe"
                        prefixo="R$"
                        opcional
                        placeholder="Seu valor"
                        valor={e.custoTipeMensal}
                        onChange={(v) => {
                          setCustoEditado(true);
                          setB("custoTipeMensal")(v);
                        }}
                        min={0}
                        max={1000}
                        passo={1}
                        ajuda={
                          SHOW_PLAN_PRICES && e.mesas <= 40
                            ? `Valor inicial: plano ${custoPlanoPorMesas(e.mesas).nome}, que comporta ${numero(e.mesas)} mesas, pela tabela de planos da Tipe. A implantação é única (R$ 200 no Essencial e Profissional; grátis a partir do Premium) e não entra neste cálculo mensal. Edite se quiser.`
                            : "Acima de 40 mesas, o plano Personalizado é sob consulta. Informe o valor mensal da proposta para calcular o resultado líquido."
                        }
                      />
                    </div>
                    <Campo
                      rotulo="Outros custos extras por mês"
                      prefixo="R$"
                      valor={e.custosVariaveisMensais}
                      onChange={setB("custosVariaveisMensais")}
                      min={0}
                      max={5000}
                      passo={10}
                    />
                    <Campo
                      rotulo="Aumento de tíquete nas contas do QR"
                      sufixo="%"
                      valor={e.aumentoTicketPct}
                      onChange={setB("aumentoTicketPct")}
                      min={0}
                      max={20}
                      ajuda="Começa em 0%. Fica numa linha separada da receita por giro e só vale para as contas que já existem, para não contar duas vezes."
                    />
                  </Grupo>
                </div>
              </details>
                </div>
              </details>
            </div>
          </div>

          {/* ------------------------------------------------ Painel de resultados */}
          <div className="relative overflow-hidden rounded-[1.6rem] bg-[#021E34] p-5 text-white sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_100%_0%,rgb(15_201_189/0.22),transparent_70%),radial-gradient(50%_40%_at_0%_100%,rgb(15_201_189/0.08),transparent_70%)]"
            />
            <div className="relative">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[1.15rem] font-medium tracking-[-0.02em]">Com a Tipe</h3>
                <p className="text-[0.75rem] text-white/50">
                  Cenários são hipóteses{ajustado ? " · ajustado por você" : ""}
                </p>
              </div>
              <div className="mt-4">
                <SeletorCenario valor={cenario} ajustado={ajustado} onChange={trocarCenario} />
                <p className="mt-2.5 text-[0.75rem] leading-relaxed text-white/55">
                  {CENARIOS[cenario].origem}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Campo
                  tom="escuro"
                  destaque
                  rotulo="Contas pagas pelo QR"
                  sufixo="%"
                  valor={params.adocaoPct}
                  onChange={setP("adocaoPct")}
                  min={0}
                  max={100}
                  passo={5}
                  ajuda="Adoção por quantidade de contas. O valor que passaria pelo QR aparece separado, mais abaixo."
                />
                <Campo
                  tom="escuro"
                  destaque
                  rotulo="Minutos economizados por conta"
                  sufixo="min"
                  valor={params.economiaPagamentoMin}
                  onChange={setP("economiaPagamentoMin")}
                  min={0}
                  max={20}
                  ajuda="Referência externa: 8, 9 e 10 min nos casos do estudo de ROI da Sunday e 12 min por mesa na página inicial dela."
                  extra={
                    r.economiaLimitada ? (
                      <p className="mt-1 text-[0.72rem] text-[#F5B841]">
                        Limitado a {numero(r.economiaEfetivaMin)} min, a espera que você informou.
                      </p>
                    ) : undefined
                  }
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
                <Destaque
                  id="tempo"
                  rotulo="Tempo potencialmente recuperado por mês"
                  valor={r.tempoRecuperadoMesMin}
                  formatar={duracao}
                  sub={
                    <>
                      {duracao(r.tempoRecuperadoServicoMin)} por serviço
                      {r.tempoPorGarcomServicoMin !== null && (
                        <> · {numero(r.tempoPorGarcomServicoMin)} min por garçom</>
                      )}
                    </>
                  }
                  ativo={card === "tempo"}
                  onAjuda={() => setCard((c) => (c === "tempo" ? null : "tempo"))}
                />
                <Destaque
                  id="capacidade"
                  rotulo="Capacidade adicional estimada por serviço"
                  valor={r.capacidadeAdicional}
                  formatar={(n) => `+${numero(n, 1)}`}
                  sub={
                    <>
                      contas · de {numero(r.capacidadeAtual, 1)} para{" "}
                      {numero(r.capacidadeProjetada, 1)}
                    </>
                  }
                  ativo={card === "capacidade"}
                  onAjuda={() => setCard((c) => (c === "capacidade" ? null : "capacidade"))}
                />
                <Destaque
                  id="receita"
                  rotulo="Receita incremental condicionada à demanda"
                  valor={r.receitaIncrementalMes}
                  formatar={(n) => brl(n)}
                  sub={
                    <>
                      por mês · {numero(r.contasExtrasMes)} contas extras. {restricaoTexto}
                    </>
                  }
                  ativo={card === "receita"}
                  onAjuda={() => setCard((c) => (c === "receita" ? null : "receita"))}
                />
                <Destaque
                  id="resultado"
                  principal={(r.resultadoLiquidoMes ?? 0) > 0}
                  rotulo="Resultado financeiro líquido estimado"
                  valor={r.resultadoLiquidoMes ?? 0}
                  formatar={brlSinal}
                  vazio={r.resultadoLiquidoMes === null ? `${mensagemVazia}.` : undefined}
                  sub={
                    r.resultadoLiquidoMes === null ? (
                      <button
                        type="button"
                        onClick={abrirPremissas}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/20 px-3 text-[0.75rem] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Preencher <ArrowRight className="h-3 w-3" aria-hidden />
                      </button>
                    ) : (
                      <>
                        por mês, após a assinatura
                        {r.roiPct !== null && <> · retorno de {pct(r.roiPct)}</>}
                      </>
                    )
                  }
                  ativo={card === "resultado"}
                  onAjuda={() => setCard((c) => (c === "resultado" ? null : "resultado"))}
                />
              </div>

              <div id="giro-explicacao" aria-live="polite">
                {card && (
                  <div className="mt-3 rounded-[1.1rem] border border-white/10 bg-white/[0.06] p-4 text-[0.82rem] leading-relaxed text-white/80">
                    <p className="font-medium text-white">{explicacoes[card].titulo}</p>
                    <p className="mt-1">{explicacoes[card].texto}</p>
                  </div>
                )}
              </div>

              {r.avisos
                .filter((a) => !a.includes("limitada"))
                .map((a) => (
                  <p key={a} className="mt-3 text-[0.75rem] text-[#F5B841]">
                    {a}
                  </p>
                ))}

              <table className="mt-6 w-full text-left text-[0.8rem] tabular-nums">
                <caption className="sr-only">Comparação sem Tipe e com Tipe</caption>
                <thead>
                  <tr className="text-[0.72rem] text-white/50">
                    <th scope="col" className="pb-2 font-normal">
                      Por mês, em média
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Sem Tipe
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal text-[#0FC9BD]">
                      Com Tipe
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-t [&_td]:border-white/10 [&_td]:py-2 [&_th]:border-t [&_th]:border-white/10 [&_th]:py-2">
                  {[
                    [
                      "Espera pelo pagamento",
                      `${numero(e.esperaPagamentoMin, 1)} min`,
                      `${numero(Math.max(0, e.esperaPagamentoMin - r.reducaoCicloMin), 1)} min`,
                    ],
                    [
                      "Ciclo da mesa",
                      `${numero(r.cicloAtualMin, 1)} min`,
                      `${numero(r.cicloProjetadoMin, 1)} min`,
                    ],
                    ["Contas atendidas", numero(contasMes), numero(contasMes + r.contasExtrasMes)],
                    ["Faturamento", brl(r.faturamentoAtualMes), brl(fatMesCom)],
                  ].map(([n, a, b]) => (
                    <tr key={n}>
                      <th scope="row" className="pr-2 font-normal text-white/70">
                        {n}
                      </th>
                      <td className="text-right text-white/80">{a}</td>
                      <td className="text-right font-medium text-white">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ Gráficos */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-5 lg:grid-cols-3 lg:gap-5">
          <GraficoCapacidade r={r} />
          <GraficoTempo r={r} />
          <GraficoProjecao r={r} className="md:col-span-2 lg:col-span-1" />
        </div>

        <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-5">
          <div className="rounded-[1.6rem] bg-[#021E34] p-3 sm:p-4">
            <SimulacaoMesas e={e} />
          </div>
          <div className="grid gap-4 lg:gap-5">
            <div className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-5 sm:p-6">
              <p className="text-[0.95rem] font-medium text-[#021E34]">Gorjetas da equipe</p>
              <p className="mt-0.5 text-[0.8rem] text-[#021E34]/55">
                Fora do faturamento do restaurante
              </p>
              {r.gorjeta === null ? (
                <p className="mt-4 text-[0.85rem] text-[#021E34]/70">
                  Informe a gorjeta média atual em “Mais premissas” para estimar.
                </p>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.82rem]">
                  <div>
                    <dt className="text-[#021E34]/55">A mais por mês</dt>
                    <dd className="money mt-0.5 text-[1.25rem] font-medium tracking-[-0.03em] text-[#021E34] tabular-nums">
                      <NumeroAnimado valor={r.gorjeta.aumentoMes} formatar={(n) => brl(n)} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#021E34]/55">Gorjeta atual por conta</dt>
                    <dd className="mt-0.5 text-[1.25rem] font-medium tracking-[-0.03em] text-[#021E34] tabular-nums">
                      {brl(r.gorjeta.atualPorConta, true)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#021E34]/55">Garçom da mesa (70%)</dt>
                    <dd className="mt-0.5 tabular-nums text-[#021E34]">
                      {brl(r.gorjeta.garcomMes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#021E34]/55">Tipe (30%)</dt>
                    <dd className="mt-0.5 tabular-nums text-[#021E34]">{brl(r.gorjeta.tipeMes)}</dd>
                  </div>
                </dl>
              )}
            </div>
            <div className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-5 sm:p-6">
              <p className="text-[0.95rem] font-medium text-[#021E34]">Para comparar, sem somar</p>
              <p className="mt-0.5 text-[0.8rem] text-[#021E34]/55">
                Sua projeção ao lado dos indicadores da Sunday
              </p>
              <ul className="mt-4 space-y-2.5 text-[0.82rem] leading-snug text-[#021E34]/75">
                <li className="flex justify-between gap-3">
                  <span>Receita nova sobre o faturamento atual</span>
                  <span className="shrink-0 tabular-nums text-[#021E34]">
                    {pct(
                      r.faturamentoAtualMes > 0
                        ? (r.receitaIncrementalMes / r.faturamentoAtualMes) * 100
                        : 0,
                      1,
                    )}{" "}
                    <span className="text-[#021E34]/45">
                      · Sunday: até {INDICADORES_SUNDAY.faturamentoPct}%
                    </span>
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Tempo por garçom</span>
                  <span className="shrink-0 tabular-nums text-[#021E34]">
                    {r.tempoPorGarcomServicoMin === null
                      ? "—"
                      : `${numero(r.tempoPorGarcomServicoMin)} min/serviço`}{" "}
                    <span className="text-[#021E34]/45">
                      · Sunday: {INDICADORES_SUNDAY.minutosPorGarcomTurno} min/turno
                    </span>
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Valor pago pelo QR no mês</span>
                  <span className="shrink-0 tabular-nums text-[#021E34]">{brl(r.volumeQrMes)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 lg:mt-5">
          <ComoCalculamos />
        </div>

        <div className="mt-8 flex flex-col items-start gap-3 sm:mt-10 sm:items-center sm:text-center">
          <a
            href="/solicitar-demonstracao"
            onClick={salvarECta}
            className="com-fios inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-[#021E34] px-6 py-3 text-left text-[1rem] font-medium leading-snug text-white transition-colors hover:bg-[#062b47] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD] sm:px-8 sm:text-[1.05rem]"
          >
            Descubra como a Tipe pode funcionar no seu restaurante.
            <ArrowRight className="seta h-4 w-4 shrink-0" aria-hidden />
            <Fios />
          </a>
          <p className="max-w-xl text-[0.75rem] leading-relaxed text-[#021E34]/55">
            Os números desta página ficam no seu navegador. Eles só seguem para a Tipe se você
            enviar o cadastro, junto com os seus dados de contato.
          </p>
        </div>
      </div>
    </section>
  );
}

/** A ponte e a calculadora juntas, na ordem da home. */
export function ImpactoECalculadora() {
  return (
    <>
      <ImpactoMinuto />
      <CalculadoraGiro />
    </>
  );
}
