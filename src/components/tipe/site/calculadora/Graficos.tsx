/**
 * Os três gráficos da calculadora, em HTML/CSS próprio (sem biblioteca).
 * Escala honesta: todo eixo começa em zero e a escala é a mesma para as barras
 * comparadas, então diferenças pequenas aparecem pequenas.
 */
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Resultado } from "@/lib/tipe/giro/calculo";
import { brl, duracao, numero } from "@/lib/tipe/giro/formato";

/** Máximo "redondo" do eixo e o passo das marcas (1, 2, 2,5 ou 5 × 10^k; até 5 marcas). */
export function eixo(maximo: number) {
  if (!(maximo > 0)) return { max: 1, passo: 1 };
  const bruto = maximo / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s * 4 >= maximo) ?? 10 * mag;
  return { max: Math.ceil(maximo / passo) * passo, passo };
}

const COR = {
  sem: "#B8C2CB",
  com: "#0A9E95",
  tinta: "#021E34",
  mesa: "#D5DCE2",
  pagar: "#021E34",
  liberar: "#E9EDF0",
  negativo: "#D9534F",
};

function Moldura({
  titulo,
  sub,
  children,
  rodape,
  className,
}: {
  titulo: string;
  sub: string;
  children: ReactNode;
  rodape?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <figure className={cn("flex flex-col rounded-[1.4rem] border border-[#021E34]/10 bg-white p-5 sm:p-6", className)}>
      <figcaption>
        <p className="text-[0.95rem] font-medium tracking-[-0.01em] text-[#021E34]">{titulo}</p>
        <p className="mt-0.5 text-[0.8rem] text-[#021E34]/55">{sub}</p>
      </figcaption>
      <div className="mt-5 flex-1">{children}</div>
      {rodape && <div className="mt-4 border-t border-[#021E34]/8 pt-3 text-[0.8rem] leading-relaxed text-[#021E34]/65">{rodape}</div>}
    </figure>
  );
}

/** Rótulos do eixo horizontal, de 0 ao máximo. */
function Escala({ max, passo, unidade = "" }: { max: number; passo: number; unidade?: string }) {
  const n = Math.round(max / passo);
  return (
    <div aria-hidden className="relative mt-2 h-4 text-[0.7rem] tabular-nums text-[#021E34]/45">
      {Array.from({ length: n + 1 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 whitespace-nowrap"
          style={{
            left: `${((i * passo) / max) * 100}%`,
            transform: i === 0 ? "none" : i === n ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {numero(i * passo)}
          {i === n ? unidade : ""}
        </span>
      ))}
    </div>
  );
}

const transicao: CSSProperties = { transition: "width 600ms cubic-bezier(0.16,1,0.3,1), height 600ms cubic-bezier(0.16,1,0.3,1), left 600ms cubic-bezier(0.16,1,0.3,1)" };

/* ------------------------------------------------ 1. Capacidade */

export function GraficoCapacidade({ r }: { r: Resultado }) {
  const procura = r.contasPorServico + r.entradas.demandaNaoAtendida;
  const { max, passo } = eixo(Math.max(r.capacidadeProjetada, procura, 1) * 1.05);
  const barras = [
    { nome: "Sem Tipe", v: r.capacidadeAtual, cor: COR.sem },
    { nome: "Com Tipe", v: r.capacidadeProjetada, cor: COR.com },
  ];
  const linhas = [
    { nome: "Contas hoje", v: r.contasPorServico },
    { nome: "Procura no movimento", v: procura },
  ];
  return (
    <Moldura
      titulo="Capacidade por serviço"
      sub="Contas que as mesas comportam, antes e depois"
      rodape={
        <>
          Capacidade adicional de <strong className="font-medium text-[#021E34]">{numero(r.capacidadeAdicional, 1)}</strong>{" "}
          {r.capacidadeAdicional >= 0.95 && r.capacidadeAdicional < 1.05 ? "conta" : "contas"} por serviço. Ela só vira venda se houver
          procura acima da capacidade atual.
        </>
      }
    >
      <div className="relative">
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: Math.round(max / passo) + 1 }, (_, i) => (
              <span key={i} className="absolute inset-y-0 w-px bg-[#021E34]/[0.06]" style={{ left: `${((i * passo) / max) * 100}%` }} />
            ))}
            {linhas.map((l, i) => (
              <span
                key={l.nome}
                className={cn("absolute -bottom-1 top-5 border-l", i === 0 ? "border-dotted border-[#021E34]/50" : "border-dashed border-[#021E34]")}
                style={{ left: `${Math.min(100, (l.v / max) * 100)}%`, ...transicao }}
              />
            ))}
          </div>
          <ul className="relative space-y-3">
            {barras.map((b) => (
              <li key={b.nome}>
                <div className="flex items-baseline justify-between text-[0.8rem]">
                  <span className="text-[#021E34]/70">{b.nome}</span>
                  <span className="font-medium tabular-nums text-[#021E34]">{numero(b.v, 1)}</span>
                </div>
                <div className="mt-1 h-5">
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{ width: `${Math.min(100, (b.v / max) * 100)}%`, background: b.cor, ...transicao }}
                    title={`${b.nome}: ${numero(b.v, 1)} contas por serviço`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Escala max={max} passo={passo} />
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-[#021E34]/65">
          {linhas.map((l, i) => (
            <li key={l.nome} className="flex items-center gap-1.5">
              <span className={cn("h-3 border-l-2", i === 0 ? "border-dotted border-[#021E34]/50" : "border-dashed border-[#021E34]")} />
              {l.nome}: <span className="tabular-nums text-[#021E34]">{numero(l.v)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Moldura>
  );
}

/* ------------------------------------------------ 2. Tempo */

export function GraficoTempo({ r }: { r: Resultado }) {
  const e = r.entradas;
  const { max, passo } = eixo(Math.max(r.cicloAtualMin, 1));
  const esperaCom = Math.max(0, e.esperaPagamentoMin - r.reducaoCicloMin);
  const linhas = [
    { nome: "Sem Tipe", mesa: e.permanenciaMin, pagar: e.esperaPagamentoMin, ganho: 0, liberar: e.liberacaoMin, total: r.cicloAtualMin },
    { nome: "Com Tipe", mesa: e.permanenciaMin, pagar: esperaCom, ganho: r.reducaoCicloMin, liberar: e.liberacaoMin, total: r.cicloProjetadoMin },
  ];
  const pc = (v: number) => `${(v / max) * 100}%`;
  return (
    <Moldura
      titulo="Ciclo médio da mesa"
      sub="Minutos do sentar até a mesa pronta de novo"
      rodape={
        <>
          A equipe deixa de gastar <strong className="font-medium text-[#021E34]">{duracao(r.tempoRecuperadoMesMin)}</strong> por mês
          esperando pagamentos. É tempo de atendimento, não economia de folha.
        </>
      }
    >
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[4.5rem]">
          {Array.from({ length: Math.round(max / passo) + 1 }, (_, i) => (
            <span key={i} className="absolute inset-y-0 w-px bg-[#021E34]/[0.06]" style={{ left: `${((i * passo) / max) * 100}%` }} />
          ))}
        </div>
        <ul className="relative space-y-3">
          {linhas.map((l) => (
            <li key={l.nome}>
              <div className="flex items-baseline justify-between text-[0.8rem]">
                <span className="text-[#021E34]/70">{l.nome}</span>
                <span className="font-medium tabular-nums text-[#021E34]">{numero(l.total, 1)} min</span>
              </div>
              <div className="relative mt-1 flex h-5 gap-[2px]">
                <span className="h-full rounded-l-[4px]" style={{ width: pc(l.mesa), background: COR.mesa, ...transicao }} title={`Na mesa: ${numero(l.mesa)} min`} />
                <span className="h-full" style={{ width: pc(l.pagar), background: COR.pagar, ...transicao }} title={`Pagamento: ${numero(l.pagar, 1)} min`} />
                {l.ganho > 0 && (
                  <span
                    className="h-full rounded-[2px] border border-[#0A9E95]"
                    style={{
                      width: pc(l.ganho),
                      background: "repeating-linear-gradient(135deg, rgb(15 201 189 / 0.35) 0 3px, transparent 3px 6px)",
                      ...transicao,
                    }}
                    title={`Tempo recuperado (média por conta): ${numero(l.ganho, 1)} min`}
                  />
                )}
                <span className="h-full rounded-r-[4px]" style={{ width: pc(l.liberar), background: COR.liberar, ...transicao }} title={`Liberação: ${numero(l.liberar)} min`} />
              </div>
            </li>
          ))}
        </ul>
        <Escala max={max} passo={passo} unidade=" min" />
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-[#021E34]/65">
          {[
            ["Na mesa", COR.mesa],
            ["Pagamento", COR.pagar],
            ["Liberação", COR.liberar],
          ].map(([n, c]) => (
            <li key={n} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-[#021E34]/10" style={{ background: c }} />
              {n}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[3px] border border-[#0A9E95]"
              style={{ background: "repeating-linear-gradient(135deg, rgb(15 201 189 / 0.5) 0 2px, transparent 2px 4px)" }}
            />
            Tempo recuperado
          </li>
        </ul>
      </div>
    </Moldura>
  );
}

/* ------------------------------------------------ 3. Projeção mensal */

export function GraficoProjecao({ r, className }: { r: Resultado; className?: string }) {
  const custo = r.custoTotalMes;
  const barras: { nome: string; v: number; cor: string; nulo?: boolean }[] = [
    { nome: "Receita incremental", v: r.receitaIncrementalMes, cor: COR.sem },
    { nome: "Margem incremental", v: r.margemIncrementalMes ?? 0, cor: COR.com, nulo: r.margemIncrementalMes === null },
    { nome: "Custos", v: -custo, cor: COR.negativo },
    { nome: "Resultado líquido", v: r.resultadoLiquidoMes ?? 0, cor: COR.tinta, nulo: r.resultadoLiquidoMes === null },
  ];
  const topo = Math.max(0, ...barras.map((b) => b.v));
  const fundo = Math.min(0, ...barras.map((b) => b.v));
  const escalaTopo = eixo(topo).max;
  const escalaFundo = fundo < 0 ? eixo(-fundo).max : 0;
  const total = escalaTopo + escalaFundo || 1;
  const zero = (escalaTopo / total) * 100; // % da altura acima do zero
  const ALT = 168;
  return (
    <Moldura
      className={className}
      titulo="Projeção mensal"
      sub="Em reais, com a mesma escala para tudo"
      rodape={
        r.resultadoLiquidoMes === null ? (
          <>Informe a margem e o valor da assinatura em “Mais premissas” para ver o resultado líquido.</>
        ) : (
          <>
            Faturamento não é lucro: o resultado considera só a margem sobre a receita nova, menos o custo da Tipe e os custos extras.
            Gorjetas ficam fora.
          </>
        )
      }
    >
      <div className="relative mt-6" style={{ height: ALT }}>
        <span aria-hidden className="absolute inset-x-0 h-px bg-[#021E34]/30" style={{ top: `${zero}%` }} />
        <ul className="absolute inset-0 grid grid-cols-4 gap-2 sm:gap-3">
          {barras.map((b) => {
            const h = (Math.abs(b.v) / total) * 100;
            const positivo = b.v >= 0;
            const rotuloV = b.nulo ? "—" : b.nome === "Custos" ? `− ${brl(custo)}` : brl(b.v);
            return (
              <li key={b.nome} className="relative" title={`${b.nome}: ${rotuloV}`}>
                <span
                  className="absolute inset-x-[14%]"
                  style={{
                    ...(positivo ? { bottom: `${100 - zero}%` } : { top: `${zero}%` }),
                    height: b.nulo ? 0 : `max(${b.v === 0 ? 0 : 2}px, ${h}%)`,
                    background: b.cor,
                    borderRadius: positivo ? "4px 4px 0 0" : "0 0 4px 4px",
                    ...transicao,
                  }}
                />
                <span
                  className="absolute inset-x-0 text-center text-[0.72rem] font-medium tabular-nums text-[#021E34] sm:text-[0.78rem]"
                  style={
                    positivo
                      ? { bottom: `calc(${100 - zero}% + ${Math.max(h, 0)}% + 4px)` }
                      : { top: `calc(${zero}% + ${h}% + 4px)` }
                  }
                >
                  {rotuloV}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="mt-6 grid grid-cols-4 gap-2 text-center text-[0.68rem] leading-tight text-[#021E34]/60 sm:gap-3 sm:text-[0.72rem]">
        {barras.map((b) => (
          <li key={b.nome}>{b.nome}</li>
        ))}
      </ul>
    </Moldura>
  );
}
