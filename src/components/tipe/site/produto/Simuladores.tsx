/**
 * Simuladores de cada página de produto (04/11): no lugar da faixa verde com o celular
 * saindo da borda, o aparelho inteiro, que a pessoa toca e vê a Tipe funcionando.
 * Tudo roda só no navegador com o restaurante fictício "Maré Alta"; nada é enviado.
 * Quando o aparelho sai da tela, o movimento automático pausa; com movimento reduzido,
 * nada anda sozinho e os botões continuam valendo.
 *
 * Regras do produto respeitadas: gorjeta extra 70% para o garçom da mesa; pagamentos
 * digitais aprovados na hora; "pagar no estabelecimento" espera a confirmação do caixa.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Check,
  ChefHat,
  Clock,
  Mic,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarraStatusIOS } from "@/components/tipe/BarraStatusIOS";
import avatarLebre from "@/assets/lebre/avatar-feliz.webp";
import { useMovimentoReduzido, useVisivel } from "./useVisivel";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Roda `fn` a cada `ms` enquanto `ativo`. */
function useIntervalo(fn: () => void, ms: number, ativo: boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [ms, ativo]);
}

/** Relógio em segundos que só anda com o aparelho na tela. */
function useRelogio(ativo: boolean) {
  const [s, setS] = useState(0);
  useIntervalo(() => setS((x) => x + 1), 1000, ativo);
  return s;
}

/* ------------------------------------------------------------------ aparelhos */

export function Celular({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[19rem] rounded-[2.6rem] bg-[oklch(0.17_0_0)] p-[9px] shadow-[0_40px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55)]",
        className,
      )}
    >
      <div className="relative flex aspect-[390/800] flex-col overflow-hidden rounded-[2.1rem] bg-[#f4f7f8] text-[#021E34]">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-2 z-20 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-black"
        />
        <BarraStatusIOS className="absolute inset-x-0 top-0 z-10 h-[34px] text-[11px]" />
        {children}
      </div>
    </div>
  );
}

export function TabletSim({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[36rem] rounded-[1.6rem] bg-[oklch(0.17_0_0)] p-[9px] shadow-[0_40px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55)]",
        className,
      )}
    >
      <div className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-[1.1rem] bg-[#f4f7f8] text-[#021E34] sm:aspect-[4/3]">
        {children}
      </div>
    </div>
  );
}

function Recomecar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Recomeçar a demonstração"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#021E34]/60 hover:bg-[#021E34]/5 hover:text-[#021E34]"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  );
}

function Aviso({ texto }: { texto: string | null }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-3 z-30 rounded-xl bg-[#021E34] px-3 py-2 text-[0.7rem] font-medium leading-snug text-white shadow-lg transition-all duration-300",
        texto ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {texto}
    </div>
  );
}

function useAviso() {
  const [texto, setTexto] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mostrar = (s: string) => {
    setTexto(s);
    clearTimeout(t.current);
    t.current = setTimeout(() => setTexto(null), 2600);
  };
  useEffect(() => () => clearTimeout(t.current), []);
  return [texto, mostrar] as const;
}

/* ------------------------------------------------------------------ Tipe Equipe */

type EstadoMesa = "livre" | "aberta" | "chamando" | "conta";
type MesaStaff = { n: number; estado: EstadoMesa; itens: string[]; total: number };
const LANCAVEIS = [
  { nome: "Suco de caju", preco: 9.5 },
  { nome: "Pastel de camarão", preco: 34 },
  { nome: "Baião de dois", preco: 42 },
  { nome: "Água de coco", preco: 8 },
];
const MESAS_STAFF: MesaStaff[] = [
  { n: 1, estado: "aberta", itens: ["Peixe na brasa", "Suco de caju"], total: 77.5 },
  { n: 2, estado: "livre", itens: [], total: 0 },
  { n: 3, estado: "aberta", itens: ["Isca de peixe"], total: 54 },
  { n: 4, estado: "livre", itens: [], total: 0 },
  { n: 5, estado: "aberta", itens: ["Baião de dois", "Água de coco"], total: 50 },
  { n: 6, estado: "livre", itens: [], total: 0 },
  { n: 7, estado: "aberta", itens: ["Pastel de camarão", "Cartola"], total: 53 },
  { n: 8, estado: "livre", itens: [], total: 0 },
  { n: 9, estado: "aberta", itens: ["Peixe na brasa"], total: 68 },
];
const TOM_MESA: Record<EstadoMesa, string> = {
  livre: "bg-white text-[#021E34]/50 ring-1 ring-[#021E34]/10",
  aberta: "bg-[#021E34] text-white",
  chamando: "bg-[#ffd27a] text-[#5a4300] ring-2 ring-[#e0a800]",
  conta: "bg-[#0FC9BD] text-[#021E34]",
};
const ROTULO_MESA: Record<EstadoMesa, string> = {
  livre: "Livre",
  aberta: "Aberta",
  chamando: "Chamou",
  conta: "Pediu a conta",
};

export function SimuladorStaff() {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduzido = useMovimentoReduzido();
  const [mesas, setMesas] = useState(MESAS_STAFF);
  const [aberta, setAberta] = useState<number | null>(null);
  const [gorjeta, setGorjeta] = useState(12.6);
  const [aviso, avisar] = useAviso();
  const passo = useRef(0);

  // A cada poucos segundos alguma mesa chama, pede a conta ou deixa gorjeta extra.
  useIntervalo(
    () => {
      const i = passo.current++ % 3;
      if (i === 2) {
        const valor = [6, 8, 10][passo.current % 3]!;
        const parte = Math.round(valor * 0.7 * 100) / 100;
        setGorjeta((g) => g + parte);
        avisar(`Mesa 5 deixou ${brl(valor)} de gorjeta extra. ${brl(parte)} para você.`);
        return;
      }
      setMesas((ms) => {
        const candidatas = ms.filter((m) => m.estado === "aberta");
        if (!candidatas.length) return ms;
        const alvo = candidatas[passo.current % candidatas.length]!;
        return ms.map((m) =>
          m.n === alvo.n ? { ...m, estado: i === 0 ? "chamando" : "conta" } : m,
        );
      });
    },
    5200,
    visivel && !reduzido,
  );

  const mesa = mesas.find((m) => m.n === aberta) ?? null;
  const chamados = mesas.filter((m) => m.estado === "chamando" || m.estado === "conta").length;
  const mudar = (n: number, f: (m: MesaStaff) => MesaStaff) =>
    setMesas((ms) => ms.map((m) => (m.n === n ? f(m) : m)));

  return (
    <div ref={ref}>
      <Celular>
        <div className="flex items-center gap-2 bg-white px-4 pb-2.5 pt-9">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#021E34] text-[0.7rem] font-semibold text-[#0FC9BD]">
            JO
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[0.8rem] font-semibold">Joyce · Salão</span>
            <span className="block text-[0.65rem] text-[#03665f]">
              Gorjetas hoje {brl(gorjeta)}
            </span>
          </span>
          <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[#021E34]/5">
            <Bell className="h-4 w-4" aria-hidden />
            {chamados > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#e5484d] px-1 text-[0.55rem] font-bold text-white">
                {chamados}
              </span>
            )}
          </span>
          <Recomecar
            onClick={() => {
              setMesas(MESAS_STAFF);
              setAberta(null);
              setGorjeta(12.6);
            }}
          />
        </div>
        <p className="px-4 pb-2 pt-3 text-[0.7rem] font-medium text-[#021E34]/60">
          Toque numa mesa
        </p>
        <div className="grid grid-cols-3 gap-2 px-4">
          {mesas.map((m) => (
            <button
              key={m.n}
              type="button"
              onClick={() => setAberta(m.n)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-2xl transition-colors",
                TOM_MESA[m.estado],
                m.estado === "chamando" && !reduzido && "animate-pulse",
              )}
            >
              <span className="font-display text-[1.25rem] font-medium leading-none">{m.n}</span>
              <span className="mt-1 text-[0.55rem] font-medium">{ROTULO_MESA[m.estado]}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-4 text-[0.58rem] text-[#021E34]/60">
          {(Object.keys(ROTULO_MESA) as EstadoMesa[]).map((e) => (
            <span key={e} className="inline-flex items-center gap-1">
              <i className={cn("h-2 w-2 rounded-full", TOM_MESA[e])} />
              {ROTULO_MESA[e]}
            </span>
          ))}
        </div>

        {/* Folha da mesa */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 rounded-t-[1.4rem] bg-white px-4 pb-5 pt-3 shadow-[0_-20px_40px_-20px_rgb(0_0_0/0.35)] transition-transform duration-300",
            mesa ? "translate-y-0" : "translate-y-full",
          )}
          aria-hidden={!mesa}
        >
          {mesa && (
            <>
              <div className="flex items-center justify-between">
                <p className="font-display text-[1.1rem] font-medium">Mesa {mesa.n}</p>
                <button
                  type="button"
                  onClick={() => setAberta(null)}
                  aria-label="Fechar"
                  className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#021E34]/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {mesa.estado === "livre" ? (
                <>
                  <p className="mt-1 text-[0.72rem] text-[#021E34]/60">
                    Abra a mesa para o cliente ver a conta e pedir pelo QR Code.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      mudar(mesa.n, (m) => ({ ...m, estado: "aberta" }));
                      avisar(`Mesa ${mesa.n} aberta. O QR Code já mostra a conta.`);
                    }}
                    className="mt-3 h-10 w-full rounded-full bg-[#021E34] text-[0.8rem] font-medium text-white"
                  >
                    Abrir mesa {mesa.n}
                  </button>
                </>
              ) : (
                <>
                  {(mesa.estado === "chamando" || mesa.estado === "conta") && (
                    <button
                      type="button"
                      onClick={() => {
                        mudar(mesa.n, (m) => ({ ...m, estado: "aberta" }));
                        avisar(
                          mesa.estado === "conta"
                            ? `A conta da Mesa ${mesa.n} já está no QR Code. Pix, Apple Pay ou Google Pay.`
                            : `Chamado da Mesa ${mesa.n} atendido.`,
                        );
                      }}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#ffd27a] text-[0.75rem] font-semibold text-[#5a4300]"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {mesa.estado === "conta" ? "Levar a conta" : "Atender o chamado"}
                    </button>
                  )}
                  <ul className="mt-2 max-h-16 space-y-0.5 overflow-y-auto text-[0.7rem]">
                    {mesa.itens.map((it, i) => (
                      <li key={i} className="flex justify-between text-[#021E34]/75">
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 flex justify-between text-[0.75rem] font-semibold">
                    <span>Total</span>
                    <span>{brl(mesa.total)}</span>
                  </p>
                  <p className="mt-2.5 text-[0.65rem] font-medium text-[#021E34]/60">
                    Lançar e mandar para a cozinha
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {LANCAVEIS.map((l) => (
                      <button
                        key={l.nome}
                        type="button"
                        onClick={() => {
                          mudar(mesa.n, (m) => ({
                            ...m,
                            itens: [...m.itens, l.nome],
                            total: m.total + l.preco,
                          }));
                          avisar(`${l.nome} enviado para a cozinha.`);
                        }}
                        className="rounded-xl border border-[#021E34]/15 px-2 py-1.5 text-left text-[0.62rem] leading-tight hover:border-[#021E34]/40"
                      >
                        <span className="block font-medium">{l.nome}</span>
                        <span className="text-[#021E34]/55">{brl(l.preco)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <Aviso texto={aviso} />
      </Celular>
    </div>
  );
}

/* ------------------------------------------------------------------ Tipe Cozinha */

type EtapaTicket = "novo" | "preparo" | "pronto";
type Ticket = { id: number; mesa: number; itens: string[]; etapa: EtapaTicket; desde: number };
const PEDIDOS_COZINHA = [
  { mesa: 7, itens: ["2× Pastel de camarão"] },
  { mesa: 3, itens: ["1× Peixe na brasa", "1× Baião de dois"] },
  { mesa: 12, itens: ["1× Isca de peixe"] },
  { mesa: 5, itens: ["2× Cartola"] },
  { mesa: 9, itens: ["1× Baião de dois"] },
  { mesa: 1, itens: ["1× Peixe na brasa"] },
];
const COLUNAS: { id: EtapaTicket; titulo: string; acao: string; tom: string }[] = [
  { id: "novo", titulo: "Novos", acao: "Começar", tom: "bg-[#e6faf8] text-[#03665f]" },
  { id: "preparo", titulo: "Preparando", acao: "Pronto", tom: "bg-amber-100 text-amber-800" },
  { id: "pronto", titulo: "Prontos", acao: "Entregue", tom: "bg-[#0FC9BD] text-[#021E34]" },
];
const INICIO_COZINHA = (agora: number): Ticket[] => [
  { id: 1, mesa: 4, itens: ["1× Peixe na brasa", "2× Suco de caju"], etapa: "preparo", desde: agora - 312 },
  { id: 2, mesa: 8, itens: ["1× Isca de peixe"], etapa: "novo", desde: agora - 40 },
];

export function SimuladorKitchen() {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduzido = useMovimentoReduzido();
  const agora = useRelogio(visivel);
  const [tickets, setTickets] = useState<Ticket[]>(() => INICIO_COZINHA(0));
  const [entregues, setEntregues] = useState(14);
  const [aviso, avisar] = useAviso();
  const prox = useRef(3);
  const fila = useRef(0);

  useIntervalo(
    () => {
      setTickets((ts) => {
        if (ts.filter((t) => t.etapa === "novo").length >= 3) return ts;
        const p = PEDIDOS_COZINHA[fila.current++ % PEDIDOS_COZINHA.length]!;
        return [...ts, { id: prox.current++, ...p, etapa: "novo", desde: agora }];
      });
    },
    7000,
    visivel && !reduzido,
  );

  function avancar(t: Ticket) {
    if (t.etapa === "pronto") {
      setTickets((ts) => ts.filter((x) => x.id !== t.id));
      setEntregues((n) => n + 1);
      avisar(`Mesa ${t.mesa} servida. O garçom foi avisado no Tipe Equipe.`);
      return;
    }
    const etapa: EtapaTicket = t.etapa === "novo" ? "preparo" : "pronto";
    setTickets((ts) => ts.map((x) => (x.id === t.id ? { ...x, etapa, desde: agora } : x)));
    if (etapa === "pronto") avisar(`Mesa ${t.mesa} pronta. O salão já sabe.`);
  }

  return (
    <div ref={ref}>
      <TabletSim>
        <div className="flex items-center gap-2 border-b border-[#021E34]/10 bg-white px-4 py-2.5">
          <ChefHat className="h-4 w-4 text-[#03665f]" aria-hidden />
          <span className="truncate text-[0.8rem] font-semibold">Cozinha · Maré Alta</span>
          <span className="ml-auto hidden text-[0.65rem] text-[#021E34]/60 sm:inline">
            {entregues} servidos hoje · média 11 min
          </span>
          <Recomecar
            onClick={() => {
              setTickets(INICIO_COZINHA(agora));
              setEntregues(14);
            }}
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 p-2.5 sm:gap-3 sm:p-3">
          {COLUNAS.map((c) => {
            const lista = tickets.filter((t) => t.etapa === c.id);
            return (
              <div key={c.id} className="flex min-h-0 flex-col rounded-xl bg-[#021E34]/[0.04] p-1.5 sm:p-2">
                <p className="flex items-center justify-between px-1 pb-1.5 text-[0.62rem] font-semibold sm:text-[0.7rem]">
                  {c.titulo}
                  <span className={cn("rounded-full px-1.5 text-[0.58rem]", c.tom)}>{lista.length}</span>
                </p>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                  {lista.map((t) => {
                    const seg = Math.max(0, agora - t.desde);
                    const atrasado = t.etapa !== "pronto" && seg > 600;
                    return (
                      <div
                        key={t.id}
                        className="lebre-entra rounded-lg bg-white p-1.5 shadow-[0_6px_14px_-10px_rgb(0_0_0/0.4)] ring-1 ring-[#021E34]/5 sm:p-2"
                      >
                        <p className="flex flex-wrap items-center justify-between gap-x-1 whitespace-nowrap text-[0.66rem] font-semibold sm:text-[0.75rem]">
                          Mesa {t.mesa}
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[0.55rem] font-medium sm:text-[0.6rem]",
                              atrasado ? "text-[#e5484d]" : "text-[#021E34]/55",
                            )}
                          >
                            <Clock className="h-2.5 w-2.5" aria-hidden />
                            {mmss(seg)}
                          </span>
                        </p>
                        <ul className="mt-0.5 text-[0.58rem] leading-snug text-[#021E34]/75 sm:text-[0.65rem]">
                          {t.itens.map((i) => (
                            <li key={i}>{i}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => avancar(t)}
                          className={cn(
                            "mt-1.5 h-6 w-full rounded-md text-[0.58rem] font-semibold sm:h-7 sm:text-[0.65rem]",
                            c.id === "pronto" ? "bg-[#021E34] text-white" : c.tom,
                          )}
                        >
                          {c.acao}
                        </button>
                      </div>
                    );
                  })}
                  {!lista.length && (
                    <p className="px-1 pt-2 text-center text-[0.58rem] text-[#021E34]/40">
                      {c.id === "novo" ? "Esperando pedidos" : "Nada aqui"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Aviso texto={aviso} />
      </TabletSim>
    </div>
  );
}

/* ------------------------------------------------------------------ Tipe Gestão */

type Pagto = {
  id: number;
  mesa: number;
  nome: string;
  valor: number;
  meio: "Pix" | "Apple Pay" | "Google Pay" | "No estabelecimento";
  ok: boolean;
};
const MEIOS: Pagto["meio"][] = ["Pix", "Apple Pay", "Google Pay", "No estabelecimento"];
const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabi", "Heitor"];
type MesaRest = { n: number; total: number; pago: number };
const INICIO_SALAO: MesaRest[] = [
  { n: 1, total: 152, pago: 152 },
  { n: 3, total: 98.4, pago: 40 },
  { n: 5, total: 210, pago: 105 },
  { n: 7, total: 64, pago: 0 },
  { n: 9, total: 118.8, pago: 59.4 },
  { n: 12, total: 236, pago: 118 },
];
const INICIO_PAGTOS: Pagto[] = [
  { id: 2, mesa: 9, nome: "Marina", valor: 59.4, meio: "No estabelecimento", ok: false },
  { id: 1, mesa: 12, nome: "Rafa", valor: 118, meio: "Apple Pay", ok: true },
];

export function SimuladorRestaurant() {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduzido = useMovimentoReduzido();
  const [aba, setAba] = useState<"salao" | "pagamentos">("salao");
  const [mesas, setMesas] = useState(INICIO_SALAO);
  const [pagtos, setPagtos] = useState(INICIO_PAGTOS);
  const [faturado, setFaturado] = useState(3184.6);
  const [aviso, avisar] = useAviso();
  const prox = useRef(3);

  useIntervalo(
    () => {
      // O que falta em cada mesa, descontando o que já espera a confirmação do caixa.
      const falta = (m: MesaRest) =>
        m.total -
        m.pago -
        pagtos.filter((x) => x.mesa === m.n && !x.ok).reduce((t, x) => t + x.valor, 0);
      const abertas = mesas.filter((m) => falta(m) > 0.01);
      if (!abertas.length) return;
      const id = prox.current++;
      const m = abertas[id % abertas.length]!;
      const valor = Math.min(falta(m), Math.round((m.total / 2) * 100) / 100);
      const meio = MEIOS[id % MEIOS.length]!;
      const ok = meio !== "No estabelecimento";
      const p: Pagto = { id, mesa: m.n, nome: NOMES[id % NOMES.length]!, valor, meio, ok };
      setPagtos((ps) => [p, ...ps].slice(0, 8));
      if (ok) receber(p);
      avisar(
        ok
          ? `Mesa ${m.n}: ${p.nome} pagou ${brl(valor)} com ${meio}. Aprovado.`
          : `Mesa ${m.n}: ${p.nome} vai pagar no caixa. Confirme em Pagamentos.`,
      );
    },
    6000,
    visivel && !reduzido,
  );

  function receber(p: Pagto) {
    setMesas((ms) =>
      ms.map((m) => (m.n === p.mesa ? { ...m, pago: Math.min(m.total, m.pago + p.valor) } : m)),
    );
    setFaturado((f) => f + p.valor);
  }

  const pendentes = pagtos.filter((p) => !p.ok).length;
  const abertas = mesas.filter((m) => m.pago < m.total - 0.01).length;

  return (
    <div ref={ref}>
      <TabletSim>
        <div className="flex items-center gap-2 border-b border-[#021E34]/10 bg-white px-4 py-2.5">
          <span className="text-[0.8rem] font-semibold">Maré Alta · Painel</span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#0FC9BD]/15 px-2 py-0.5 text-[0.58rem] font-medium text-[#03665f]">
            <i className="h-1.5 w-1.5 rounded-full bg-[#0FC9BD]" /> ao vivo
          </span>
          <span className="ml-auto" />
          <Recomecar
            onClick={() => {
              setMesas(INICIO_SALAO);
              setPagtos(INICIO_PAGTOS);
              setFaturado(3184.6);
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 px-3 pt-3 sm:px-4">
          {[
            ["Faturado hoje", brl(faturado)],
            ["Mesas abertas", String(abertas)],
            ["No caixa", String(pendentes)],
          ].map(([t, v]) => (
            <div key={t} className="rounded-xl bg-white p-2 ring-1 ring-[#021E34]/5">
              <p className="text-[0.56rem] text-[#021E34]/55 sm:text-[0.62rem]">{t}</p>
              <p className="font-display text-[0.85rem] font-medium tracking-[-0.02em] sm:text-[1.05rem]">
                {v}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 px-3 pt-3 sm:px-4" role="tablist">
          {(
            [
              ["salao", "Salão"],
              ["pagamentos", `Pagamentos${pendentes ? ` (${pendentes})` : ""}`],
            ] as const
          ).map(([id, t]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn(
                "h-7 rounded-full px-3 text-[0.65rem] font-medium",
                aba === id ? "bg-[#021E34] text-white" : "bg-white ring-1 ring-[#021E34]/10",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-12 pt-2.5 sm:px-4">
          {aba === "salao" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mesas.map((m) => {
                const pct = Math.round((m.pago / m.total) * 100);
                const fechada = pct >= 100;
                return (
                  <div key={m.n} className="rounded-xl bg-white p-2 ring-1 ring-[#021E34]/5">
                    <p className="flex items-center justify-between text-[0.7rem] font-semibold">
                      Mesa {m.n}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[0.55rem] font-medium",
                          fechada ? "bg-[#0FC9BD]/20 text-[#03665f]" : "bg-[#021E34]/5",
                        )}
                      >
                        {fechada ? "Paga" : `${pct}%`}
                      </span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#021E34]/10">
                      <div
                        className="h-full rounded-full bg-[#0FC9BD] transition-[width] duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[0.58rem] text-[#021E34]/60">
                      {fechada ? brl(m.total) : `Falta ${brl(m.total - m.pago)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {pagtos.map((p) => (
                <li
                  key={p.id}
                  className="lebre-entra flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-[#021E34]/5"
                >
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[0.68rem] font-semibold">
                      Mesa {p.mesa} · {p.nome}
                    </span>
                    <span className="block text-[0.58rem] text-[#021E34]/60">
                      {p.meio} · {brl(p.valor)}
                    </span>
                  </span>
                  {p.ok ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0FC9BD]/20 px-2 py-0.5 text-[0.58rem] font-medium text-[#03665f]">
                      <Check className="h-3 w-3" /> Aprovado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPagtos((ps) => ps.map((x) => (x.id === p.id ? { ...x, ok: true } : x)));
                        receber(p);
                        avisar(`Baixa feita: Mesa ${p.mesa} recebeu ${brl(p.valor)} no caixa.`);
                      }}
                      className="h-7 rounded-full bg-[#021E34] px-2.5 text-[0.6rem] font-medium text-white"
                    >
                      Confirmar no caixa
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Aviso texto={aviso} />
      </TabletSim>
    </div>
  );
}

/* ------------------------------------------------------------------ Lebre (IA da Tipe) */

type Msg = {
  quem: "voce" | "lebre";
  texto: string;
  voz?: boolean | undefined;
  proposta?: boolean | undefined;
};
const PERGUNTAS: { q: string; r: string; voz?: boolean; proposta?: boolean }[] = [
  {
    q: "Como está o salão agora?",
    r: "6 mesas com conta aberta. A mesa 9 tem um pagamento esperando o caixa.",
  },
  { q: "Quanto falta na mesa 12?", r: "R$ 118,00. Duas pessoas já pagaram a parte delas." },
  {
    q: "Acabou o peixe. Pausa a moqueca.",
    r: "Preparei: pausar “Moqueca de peixe”. Confere e toca em Confirmar?",
    voz: true,
    proposta: true,
  },
  { q: "Quanto vendi hoje?", r: "R$ 3.184,60 em 41 pagamentos. Ticket médio de R$ 77,67." },
  { q: "Quem está atendendo?", r: "Joyce, Caio e Rafael. O Rafael ainda não entrou no Tipe Equipe." },
];

function responder(texto: string) {
  const t = texto.toLowerCase();
  const achou = PERGUNTAS.find((p) =>
    p.q
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4)
      .some((w) => t.includes(w)),
  );
  return (
    achou ?? {
      q: texto,
      r: "Nesta demonstração eu respondo sobre salão, mesas, vendas, equipe e cardápio. No seu painel, pergunto direto para os seus dados.",
    }
  );
}

export function SimuladorLebre({ className }: { className?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { quem: "lebre", texto: "Oi! Sou a Lebre. Pergunte qualquer coisa sobre o seu restaurante." },
  ]);
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const [feita, setFeita] = useState<"ok" | "nao" | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, digitando, feita]);

  function perguntar(q: string) {
    if (digitando || !q.trim()) return;
    const p = PERGUNTAS.find((x) => x.q === q) ?? responder(q);
    setMsgs((m) => [...m, { quem: "voce", texto: q, voz: "voz" in p ? p.voz : undefined }]);
    setTexto("");
    setDigitando(true);
    setFeita(null);
    t.current = setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [
        ...m,
        { quem: "lebre", texto: p.r, proposta: "proposta" in p ? p.proposta : undefined },
      ]);
    }, 1100);
  }

  const ultima = msgs[msgs.length - 1];
  const feitas = new Set(msgs.filter((m) => m.quem === "voce").map((m) => m.texto));
  const sugestoes = PERGUNTAS.filter((p) => !feitas.has(p.q)).slice(0, 3);

  return (
    <Celular className={className}>
      <div className="flex items-center gap-2 border-b border-[#021E34]/10 bg-white px-4 pb-2.5 pt-9">
        <img src={avatarLebre} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
        <span className="leading-tight">
          <span className="block text-[0.82rem] font-semibold">Lebre</span>
          <span className="block text-[0.62rem] text-[#03665f]">online no painel</span>
        </span>
        <span className="ml-auto" />
        <Recomecar
          onClick={() => {
            clearTimeout(t.current);
            setDigitando(false);
            setFeita(null);
            setMsgs((m) => m.slice(0, 1));
          }}
        />
      </div>
      <div
        ref={caixa}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 pb-2 pt-3"
      >
        <div className="mt-auto" />
        {msgs.map((m, i) =>
          m.quem === "voce" ? (
            <p
              key={i}
              className="lebre-entra ml-auto flex w-fit max-w-[85%] items-center gap-1.5 rounded-[1rem] rounded-br-md bg-white px-3 py-2 text-[0.72rem] leading-snug shadow-[0_8px_20px_-14px_rgb(0_0_0/0.45)]"
            >
              {m.voz && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0FC9BD]">
                  <Mic className="h-3 w-3" aria-hidden />
                </span>
              )}
              {m.texto}
            </p>
          ) : (
            <div key={i} className="lebre-entra flex items-end gap-1.5">
              <img src={avatarLebre} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full bg-white" />
              <div className="max-w-[85%]">
                <p className="rounded-[1rem] rounded-bl-md bg-[#0b2f4c] px-3 py-2 text-[0.72rem] leading-snug text-white">
                  {m.texto}
                </p>
                {m.proposta && m === ultima && (
                  <div className="mt-1.5 rounded-[0.9rem] bg-white p-2.5 shadow-[0_12px_24px_-16px_rgb(0_0_0/0.5)]">
                    <p className="text-[0.7rem] font-semibold">Pausar “Moqueca de peixe”</p>
                    {feita ? (
                      <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-[#03665f]">
                        <Check className="h-3 w-3" />
                        {feita === "ok"
                          ? "Feito. A moqueca saiu do cardápio até você reativar."
                          : "Cancelado. Nada mudou no cardápio."}
                      </p>
                    ) : (
                      <div className="mt-2 flex gap-1.5 text-[0.65rem] font-medium">
                        <button
                          type="button"
                          onClick={() => setFeita("ok")}
                          className="inline-flex items-center gap-1 rounded-full bg-[#021E34] px-2.5 py-1 text-white"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} /> Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeita("nao")}
                          className="rounded-full border border-[#021E34]/20 px-2.5 py-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {digitando && (
          <div className="flex items-end gap-1.5">
            <img src={avatarLebre} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full bg-white" />
            <div className="flex gap-1 rounded-[1rem] rounded-bl-md bg-[#0b2f4c] px-3 py-2.5">
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className="lebre-digitando h-1.5 w-1.5 rounded-full bg-white/70"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-2 [scrollbar-width:none]">
        {sugestoes.map((s) => (
          <button
            key={s.q}
            type="button"
            onClick={() => perguntar(s.q)}
            disabled={digitando}
            className="shrink-0 rounded-full border border-[#021E34]/15 bg-white px-2.5 py-1.5 text-[0.62rem] font-medium hover:border-[#021E34]/40 disabled:opacity-50"
          >
            {s.q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(texto);
        }}
        className="mx-3.5 mb-5 flex items-center gap-2 rounded-full bg-white py-1 pl-3 pr-1 ring-1 ring-[#021E34]/10"
      >
        <label className="sr-only" htmlFor="pergunta-lebre">
          Pergunte à Lebre
        </label>
        <input
          id="pergunta-lebre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={120}
          placeholder="Pergunte à Lebre"
          className="min-w-0 flex-1 bg-transparent text-[0.72rem] outline-none placeholder:text-[#021E34]/45"
        />
        <button
          type="submit"
          aria-label="Enviar pergunta"
          className="grid h-7 w-7 place-items-center rounded-full bg-[#0FC9BD]"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </Celular>
  );
}

/* ------------------------------------------------------------------ escolha */

/** O que tocar em cada simulador, ao lado do aparelho. */
export const DICAS_SIMULADOR: Record<string, string[]> = {
  pay: ["Leia o QR Code da Mesa 12", "Escolha o que consumiu ou divida", "Pague e deixe a gorjeta"],
  staff: [
    "Toque numa mesa livre para abrir",
    "Lance um item e mande para a cozinha",
    "Atenda quem chamou ou pediu a conta",
  ],
  kitchen: [
    "Toque em Começar no pedido novo",
    "Marque Pronto e o salão é avisado",
    "Novos pedidos chegam sozinhos",
  ],
  restaurant: [
    "Veja cada mesa sendo paga ao vivo",
    "Abra Pagamentos e confirme o do caixa",
    "O faturado do dia sobe na hora",
  ],
  ai: ["Toque numa pergunta ou escreva a sua", "Peça para pausar um prato", "Confirme e veja feito"],
};

export function SimuladorDoProduto({ slug }: { slug: string }) {
  if (slug === "staff") return <SimuladorStaff />;
  if (slug === "kitchen") return <SimuladorKitchen />;
  if (slug === "restaurant") return <SimuladorRestaurant />;
  if (slug === "ai") return <SimuladorLebre />;
  return null;
}
