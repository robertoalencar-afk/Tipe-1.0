/**
 * Simulação leve do salão: 12 mesas mudam de status conforme os tempos
 * informados, lado a lado sem e com Tipe. É ilustração do ciclo médio, não
 * previsão. Só anda quando está na tela, tem pausa e não anda sozinha com
 * movimento reduzido.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entradas } from "@/lib/tipe/giro/calculo";
import { economiaEfetiva } from "@/lib/tipe/giro/calculo";
import { numero } from "@/lib/tipe/giro/formato";
import { reduzMovimento } from "../movimento";

const MESAS = 12;
/** Minutos simulados por segundo real. */
const VELOCIDADE = 6;

type Status = "mesa" | "pagar" | "liberar";

const STATUS: Record<Status, { nome: string; classe: string }> = {
  mesa: { nome: "Na mesa", classe: "bg-white/[0.08] text-white/75 border-white/10" },
  pagar: { nome: "Esperando para pagar", classe: "bg-[#F5B841] text-[#021E34] border-transparent" },
  liberar: { nome: "Liberando", classe: "bg-transparent text-white/60 border-dashed border-white/35" },
};

type MesaSim = { ciclo: number; mesa: number; pagar: number; inicio: number };

function montar(e: Entradas, comTipe: boolean): MesaSim[] {
  const econ = economiaEfetiva(e.economiaPagamentoMin, e.esperaPagamentoMin);
  const cicloBase = e.permanenciaMin + e.esperaPagamentoMin + e.liberacaoMin;
  return Array.from({ length: MESAS }, (_, i) => {
    // A mesa i paga pelo QR se cair dentro da adoção (distribuição uniforme e fixa).
    const adota = comTipe && (i + 0.5) / MESAS < e.adocaoPct / 100;
    const pagar = Math.max(0, e.esperaPagamentoMin - (adota ? econ : 0));
    const ciclo = Math.max(1, e.permanenciaMin + pagar + e.liberacaoMin);
    // Começos espalhados ao longo de um ciclo, iguais nos dois lados.
    return { ciclo, mesa: e.permanenciaMin, pagar, inicio: ((i * 7) % MESAS) * (Math.max(1, cicloBase) / MESAS) };
  });
}

function estado(m: MesaSim, t: number): { status: Status; voltas: number } {
  const x = t + m.inicio;
  const voltas = Math.floor(x / m.ciclo) - Math.floor(m.inicio / m.ciclo);
  const fase = x % m.ciclo;
  const status: Status = fase < m.mesa ? "mesa" : fase < m.mesa + m.pagar ? "pagar" : "liberar";
  return { status, voltas };
}

function Fileira({ titulo, mesas, t }: { titulo: string; mesas: MesaSim[]; t: number }) {
  const estados = mesas.map((m) => estado(m, t));
  const atendidas = estados.reduce((s, e) => s + e.voltas, 0);
  const esperando = estados.filter((e) => e.status === "pagar").length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.85rem] font-medium text-white">{titulo}</p>
        <p className="text-[0.75rem] tabular-nums text-white/60">
          <span className="text-white">{numero(atendidas)}</span> mesas liberadas · {esperando} esperando conta
        </p>
      </div>
      <ul className="mt-2 grid grid-cols-6 gap-1.5 sm:gap-2">
        {estados.map((e, i) => (
          <li
            key={i}
            title={`Mesa ${i + 1}: ${STATUS[e.status].nome}`}
            className={cn(
              "grid h-9 place-items-center rounded-[0.6rem] border text-[0.72rem] font-medium tabular-nums transition-colors duration-500 sm:h-10",
              STATUS[e.status].classe,
            )}
          >
            {i + 1}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SimulacaoMesas({ e }: { e: Entradas }) {
  const [t, setT] = useState(90);
  const [tocando, setTocando] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const duracao = Math.max(60, e.duracaoServicoMin);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([x]) => setVisivel(!!x?.isIntersecting));
    io.observe(el);
    if (!reduzMovimento()) setTocando(true);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!tocando || !visivel) return;
    let quadro = 0;
    let antes = performance.now();
    const passo = (agora: number) => {
      const dt = Math.min(0.1, (agora - antes) / 1000);
      antes = agora;
      setT((x) => (x + dt * VELOCIDADE > duracao ? 0 : x + dt * VELOCIDADE));
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [tocando, visivel, duracao]);

  const sem = montar(e, false);
  const com = montar(e, true);
  const h = Math.floor(t / 60);
  const m = Math.floor(t % 60);

  return (
    <div ref={ref} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.95rem] font-medium text-white">O salão em movimento</p>
          <p className="text-[0.75rem] text-white/55">12 mesas com os seus tempos e o salão sempre cheio. Ilustração, não previsão.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-[0.8rem] tabular-nums text-white/70" aria-live="off">
            {h}h{String(m).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => setTocando((x) => !x)}
            aria-label={tocando ? "Pausar simulação" : "Iniciar simulação"}
            title={tocando ? "Pausar" : "Iniciar"}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {tocando ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setT(0)}
            aria-label="Recomeçar o serviço"
            title="Recomeçar"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <Fileira titulo="Sem Tipe" mesas={sem} t={t} />
        <Fileira titulo="Com Tipe" mesas={com} t={t} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.72rem] text-white/60">
        {(Object.keys(STATUS) as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-[3px] border", STATUS[s].classe)} />
            {STATUS[s].nome}
          </li>
        ))}
      </ul>
    </div>
  );
}
