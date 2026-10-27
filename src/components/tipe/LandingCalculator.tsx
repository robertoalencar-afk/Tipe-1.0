import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { saveCalculator } from "@/lib/tipe/tracking";

const DEFAULTS = {
  mesas: 20,
  ticket: 150,
  permanencia: 75,
  pico: 120,
  ocupacao: 80,
  dias: 26,
  economia: 12,
};
type Valores = typeof DEFAULTS;

/** Fórmula oficial da calculadora de giro de mesa. */
export function calcularGiro(v: Valores) {
  const girosSem = v.pico / v.permanencia;
  const girosCom = v.pico / Math.max(1, v.permanencia - v.economia);
  const mesasExtrasDia = Math.max(0, v.mesas * (v.ocupacao / 100) * (girosCom - girosSem));
  return {
    mesasExtrasMes: mesasExtrasDia * v.dias,
    faturamentoExtraMes: mesasExtrasDia * v.ticket * v.dias,
  };
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function LandingCalculator() {
  const [v, setV] = useState<Valores>(DEFAULTS);
  const [tocou, setTocou] = useState(false);
  const r = useMemo(() => calcularGiro(v), [v]);
  // Guarda os valores usados para enviar junto com a lista de espera.
  useEffect(() => {
    if (tocou)
      saveCalculator({
        ...v,
        faturamento_extra_mes: Math.round(r.faturamentoExtraMes),
        mesas_extras_mes: Math.round(r.mesasExtrasMes),
      });
  }, [v, r, tocou]);
  const set = (k: keyof Valores) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTocou(true);
    setV((p) => ({ ...p, [k]: Number(e.target.value) || 0 }));
  };
  const campos: [keyof Valores, string, number, number][] = [
    ["mesas", "Número de mesas", 1, 500],
    ["ticket", "Ticket médio por mesa (R$)", 1, 5000],
    ["permanencia", "Tempo médio de ocupação da mesa (min)", 20, 300],
    ["pico", "Duração do pico por dia (min)", 30, 600],
    ["ocupacao", "Ocupação no pico (%)", 1, 100],
    ["dias", "Dias de funcionamento por mês", 1, 31],
  ];
  const input =
    "w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
  return (
    <section id="calculadora" className="container-page scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-brand-strong">Calculadora de giro</p>
        <h2 className="mt-4 font-display text-headline font-normal tracking-display text-balance">
          Quanto seu salão pode faturar a mais?
        </h2>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-4 rounded-[2rem] border bg-card p-6 sm:grid-cols-2 sm:p-8">
          {campos.map(([k, l, min, max]) => (
            <label key={k} className="space-y-1.5 text-sm font-medium">
              <span>{l}</span>
              <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                className={input}
                value={v[k]}
                onChange={set(k)}
              />
            </label>
          ))}
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            <span className="flex justify-between">
              <span>Minutos economizados por mesa com a TIPE</span>
              <strong className="text-brand-strong">{v.economia} min</strong>
            </span>
            <input
              type="range"
              min={5}
              max={20}
              step={1}
              className="w-full accent-primary"
              value={v.economia}
              onChange={set("economia")}
            />
          </label>
        </div>
        <div className="flex flex-col justify-center rounded-[2rem] bg-ink p-8 text-white sm:p-10">
          <p className="text-sm opacity-80">Até</p>
          <p
            className="money font-display text-5xl font-medium tracking-display text-brand sm:text-6xl"
            aria-live="polite"
          >
            {brl(r.faturamentoExtraMes)}
          </p>
          <p className="mt-1 font-display text-xl font-medium">a mais por mês</p>
          <p className="mt-4 text-sm opacity-85">
            <strong>{Math.round(r.mesasExtrasMes).toLocaleString("pt-BR")}</strong> mesas extras
            atendidas por mês
          </p>
          <p className="mt-4 text-xs opacity-70">
            Estimativa ilustrativa. O ganho real depende de haver demanda (clientes esperando mesa)
            no horário de pico.
          </p>
          <a
            href="/teste-gratis"
            onClick={() =>
              saveCalculator({
                ...v,
                faturamento_extra_mes: Math.round(r.faturamentoExtraMes),
                mesas_extras_mes: Math.round(r.mesasExtrasMes),
              })
            }
            className="btn-press mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-center font-medium text-ink"
          >
            Quero esse resultado no meu restaurante <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
