/**
 * Três propostas para o novo "Como funciona" (V62, interno, para o Roberto comparar).
 * Mesma história nas três: 01 Escaneou, 02 Escolheu, 03 Pagou, 04 Pronto. Um só celular
 * por cena, com as telas reais do app do cliente (src/assets/telas-reais). As telas de
 * cardápio e pedido são do Tipe Order, ainda em demonstração: aparecem só no modo
 * "Pay + Order" e com o selo de demonstração. A tela 01 (câmera lendo o QR) é uma
 * representação: a foto real do totem com a moldura de leitura por cima.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { telaReal, type TelaReal } from "../CelularReal";
import totem from "@/assets/telas-reais/totem-mesa12-420.webp";

type Modo = "pay" | "order";
type Etapa = {
  n: string;
  t: string;
  d: Record<Modo, string>;
  tela: Record<Modo, TelaReal | "camera">;
  restaurante: string;
};

export const ETAPAS: Etapa[] = [
  {
    n: "01",
    t: "Escaneou",
    d: {
      pay: "A câmera lê o QR da mesa. Sem app e sem cadastro.",
      order: "A câmera lê o QR da mesa. Sem app e sem cadastro.",
    },
    tela: { pay: "camera", order: "camera" },
    restaurante: "A mesa 12 aparece aberta no salão.",
  },
  {
    n: "02",
    t: "Escolheu",
    d: {
      pay: "A conta da mesa abre no celular, item por item, ao vivo.",
      order: "O cardápio abre no celular. Pediu, foi para a cozinha.",
    },
    tela: { pay: "conta", order: "cardapio" },
    restaurante: "Com o Order, o pedido chega na cozinha e no garçom.",
  },
  {
    n: "03",
    t: "Pagou",
    d: {
      pay: "Divide como quiser e paga com Pix, Apple Pay ou Google Pay.",
      order: "Divide como quiser e paga com Pix, Apple Pay ou Google Pay.",
    },
    tela: { pay: "dividir", order: "dividir" },
    restaurante: "O pagamento entra aprovado no caixa.",
  },
  {
    n: "04",
    t: "Pronto",
    d: {
      pay: "A mesa libera sozinha. Depois, se quiser, gorjeta extra e avaliação.",
      order: "A mesa libera sozinha. Depois, se quiser, gorjeta extra e avaliação.",
    },
    tela: { pay: "pago", order: "pago" },
    restaurante: "O garçom é avisado e a mesa fica livre.",
  },
];

const TELAS: (TelaReal | "camera")[] = ["camera", "conta", "cardapio", "dividir", "pago"];
const ALT: Partial<Record<TelaReal | "camera", string>> = {
  camera: "Câmera do celular lendo o QR Code do totem da mesa",
  conta: "Tela real da conta da mesa 12 no celular",
  cardapio: "Tela do cardápio do Tipe Order (demonstração)",
  pedido: "Tela de pedido do Tipe Order (demonstração)",
  dividir: "Tela real para escolher os itens",
  metodos: "Tela real de formas de pagamento",
  pix: "Tela real do Pix",
  pago: "Tela real de pagamento confirmado",
  gorjeta: "Tela real da gorjeta extra",
  "gorjeta-metodo": "",
  "gorjeta-pix": "",
  avaliacao: "Tela real de avaliação",
};

/** Respeita prefers-reduced-motion. */
function useMovimentoReduzido() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

function TelaCamera() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_80%_at_50%_30%,#6b4a32,#2a1b12_70%)]">
      <div className="absolute left-1/2 top-[13%] w-[66%] -translate-x-1/2 drop-shadow-[0_24px_30px_rgb(0_0_0/0.5)]">
        <img src={totem} alt="" width={420} height={840} className="block h-auto w-full" />
        <span className="absolute inset-x-[10%] top-[18%] aspect-square">
          {[
            "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-[12px]",
            "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-[12px]",
            "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-[12px]",
            "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-[12px]",
          ].map((c) => (
            <span key={c} className={cn("absolute h-[20%] w-[20%] border-[#0FC9BD]", c)} />
          ))}
        </span>
      </div>
      <span className="absolute inset-x-[8%] bottom-[6%] rounded-2xl bg-white/95 px-3 py-2 text-center text-[0.62rem] font-medium leading-tight text-[#021E34]">
        tipe.digital · Mesa 12
        <span className="block font-normal text-[#021E34]/55">Toque para abrir a conta</span>
      </span>
    </div>
  );
}

/** Um celular de pé, sem inclinação, que troca as telas por opacidade. */
export function FoneEtapa({
  tela,
  className,
  demo,
}: {
  tela: TelaReal | "camera";
  className?: string;
  demo?: boolean;
}) {
  return (
    <figure
      className={cn(
        "relative m-0 aspect-[390/844] w-full rounded-[13%/6%] bg-[oklch(0.17_0_0)] p-[2.6%] shadow-[0_50px_80px_-40px_oklch(0.2_0.05_250/0.5),0_0_0_1px_oklch(0.42_0_0/0.55)]",
        className,
      )}
    >
      <div className="relative h-full overflow-hidden rounded-[11%/5%] bg-white">
        {TELAS.map((t) => {
          const on = t === tela;
          if (t === "camera")
            return (
              <div
                key={t}
                aria-hidden={!on}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
                  on ? "opacity-100" : "opacity-0",
                )}
              >
                <TelaCamera />
              </div>
            );
          const s = telaReal(t);
          return (
            <img
              key={t}
              src={s.src}
              srcSet={s.srcSet}
              sizes="300px"
              alt={on ? ALT[t] : ""}
              aria-hidden={!on}
              width={390}
              height={844}
              decoding="async"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-top pt-[7%] transition-opacity duration-500 motion-reduce:transition-none",
                on ? "opacity-100" : "opacity-0",
              )}
            />
          );
        })}
        <span
          aria-hidden
          className="absolute left-1/2 top-[1.4%] h-[2.2%] w-[30%] -translate-x-1/2 rounded-full bg-black"
        />
      </div>
      {demo && (
        <figcaption className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#021E34] px-2.5 py-1 text-[0.65rem] font-medium text-white ring-1 ring-white/20">
          Tipe Order · demonstração
        </figcaption>
      )}
    </figure>
  );
}

function SeletorModo({
  modo,
  setModo,
  claro = true,
}: {
  modo: Modo;
  setModo: (m: Modo) => void;
  claro?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Módulos do restaurante"
      className={cn(
        "inline-flex rounded-full p-1 text-[0.85rem]",
        claro ? "bg-[#021E34]/6" : "bg-white/10",
      )}
    >
      {(
        [
          ["pay", "Só Tipe Pay"],
          ["order", "Pay + Order"],
        ] as const
      ).map(([m, r]) => (
        <button
          key={m}
          role="radio"
          aria-checked={modo === m}
          onClick={() => setModo(m)}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]",
            modo === m
              ? claro
                ? "bg-white text-[#021E34] shadow-sm"
                : "bg-white text-[#021E34]"
              : claro
                ? "text-[#021E34]/60"
                : "text-white/70",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 1: palco fixo. As quatro palavras grandes à esquerda; o    */
/* celular fica parado à direita e troca de tela conforme a rolagem.   */
/* ------------------------------------------------------------------ */
export function Proposta1PalcoFixo() {
  const [ativa, setAtiva] = useState(0);
  const [modo, setModo] = useState<Modo>("pay");
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) setAtiva(Number((e.target as HTMLElement).dataset["i"]));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const e = ETAPAS[ativa]!;
  return (
    <section className="bg-white px-4 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] leading-[1] tracking-[-0.04em] text-[#021E34]">
            Da mesa ao pago,
            <br />
            em quatro toques.
          </h2>
          <SeletorModo modo={modo} setModo={setModo} />
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-20">
          <div>
            {ETAPAS.map((x, i) => (
              <div
                key={x.n}
                data-i={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className="flex min-h-[38vh] flex-col justify-center border-t border-[#021E34]/10 py-8 lg:min-h-[52vh]"
              >
                <p className="text-sm tabular-nums text-[#0b8f86]">{x.n}</p>
                <p
                  className={cn(
                    "mt-1 font-display text-[clamp(3rem,2rem+4.4vw,6rem)] leading-[0.95] tracking-[-0.05em] transition-colors duration-500",
                    i === ativa ? "text-[#021E34]" : "text-[#021E34]/15",
                  )}
                >
                  {x.t}
                </p>
                <p
                  className={cn(
                    "mt-4 max-w-md text-lg leading-relaxed transition-opacity duration-500",
                    i === ativa ? "text-[#021E34]/70" : "opacity-0 lg:opacity-0",
                  )}
                >
                  {x.d[modo]}
                </p>
                {/* No celular, o aparelho vem junto de cada etapa, sem palco fixo. */}
                <div className="mx-auto mt-8 w-[62%] max-w-[15rem] lg:hidden">
                  <FoneEtapa
                    tela={x.tela[modo]}
                    demo={modo === "order" && x.tela.order === "cardapio"}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-[12vh]">
              <FoneEtapa
                tela={e.tela[modo]}
                demo={modo === "order" && e.tela.order === "cardapio"}
              />
              <p className="mt-6 flex items-start gap-2 text-sm text-[#021E34]/60">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0FC9BD]" />
                No restaurante: {e.restaurante}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 2: fio contínuo. Quatro barras de progresso no topo, como  */
/* stories; o celular no centro avança sozinho e responde a toque.     */
/* ------------------------------------------------------------------ */
const DURACAO = 3800;
export function Proposta2FioContinuo() {
  const reduz = useMovimentoReduzido();
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [modo, setModo] = useState<Modo>("order");
  useEffect(() => {
    if (reduz || pausa) return;
    const id = window.setTimeout(() => setI((v) => (v + 1) % ETAPAS.length), DURACAO);
    return () => window.clearTimeout(id);
  }, [i, reduz, pausa]);
  const e = ETAPAS[i]!;
  return (
    <section
      className="bg-[#021E34] px-4 py-16 text-white sm:px-8 lg:py-24"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] leading-[1] tracking-[-0.04em]">
          Escaneou. Escolheu.
          <br />
          Pagou. Pronto.
        </h2>
        <div className="mt-6 flex justify-center">
          <SeletorModo modo={modo} setModo={setModo} claro={false} />
        </div>
        <div
          role="tablist"
          aria-label="Etapas"
          className="mx-auto mt-12 grid max-w-3xl grid-cols-4 gap-2 sm:gap-4"
        >
          {ETAPAS.map((x, k) => (
            <button
              key={x.n}
              role="tab"
              aria-selected={k === i}
              onClick={() => setI(k)}
              className="group text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FC9BD]"
            >
              <span className="block h-[3px] overflow-hidden rounded-full bg-white/15">
                <span
                  key={k === i ? `${i}-${pausa}` : k}
                  className={cn(
                    "block h-full origin-left rounded-full bg-[#0FC9BD]",
                    k < i && "scale-x-100",
                    k > i && "scale-x-0",
                    k === i && (reduz || pausa ? "scale-x-100" : "fio-progresso"),
                  )}
                  style={
                    k === i && !reduz && !pausa ? { animationDuration: `${DURACAO}ms` } : undefined
                  }
                />
              </span>
              <span
                className={cn(
                  "mt-3 block text-[0.8rem] sm:text-sm",
                  k === i ? "text-white" : "text-white/45",
                )}
              >
                <span className="tabular-nums text-[#0FC9BD]">{x.n}</span> {x.t}
              </span>
            </button>
          ))}
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl items-center gap-8 sm:grid-cols-[1fr_15rem_1fr]">
          <p
            className="order-2 text-balance text-lg leading-relaxed text-white/80 sm:order-1 sm:text-right"
            aria-live="polite"
          >
            {e.d[modo]}
          </p>
          <div className="order-1 mx-auto w-[58%] max-w-[15rem] sm:order-2 sm:w-full">
            <FoneEtapa tela={e.tela[modo]} demo={modo === "order" && e.tela.order === "cardapio"} />
          </div>
          <p className="order-3 text-sm leading-relaxed text-white/50 sm:text-left">
            <span className="mb-1 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#0FC9BD]">
              No restaurante
            </span>
            {e.restaurante}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 3: duas perspectivas. Uma frase grande; cada palavra é um  */
/* botão. O cliente à esquerda, o restaurante à direita, numa linha.   */
/* ------------------------------------------------------------------ */
function LinhaRestaurante({ ativa, texto }: { ativa: number; texto: ReactNode }) {
  const itens = [
    "Mesa 12 aberta",
    "Pedido na cozinha",
    "Pagamento aprovado",
    "Mesa 12 livre · garçom avisado",
  ];
  return (
    <ol className="space-y-3">
      {itens.map((t, k) => (
        <li
          key={t}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] transition-all duration-500",
            k === ativa
              ? "bg-white text-[#021E34] shadow-[0_18px_40px_-24px_rgb(2_30_52/0.45)]"
              : k < ativa
                ? "text-[#021E34]/55"
                : "text-[#021E34]/25",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              k <= ativa ? "bg-[#0FC9BD]" : "bg-[#021E34]/15",
            )}
          />
          {t}
          {k === 1 && <span className="ml-auto text-[0.7rem] text-[#021E34]/45">com Order</span>}
        </li>
      ))}
      <li className="pt-2 text-sm text-[#021E34]/55">{texto}</li>
    </ol>
  );
}

export function Proposta3DuasPerspectivas() {
  const [i, setI] = useState(0);
  const [modo, setModo] = useState<Modo>("pay");
  const e = ETAPAS[i]!;
  return (
    <section className="bg-[#f4f3ef] px-4 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div role="tablist" aria-label="Etapas" className="flex flex-wrap gap-x-5 gap-y-1">
          {ETAPAS.map((x, k) => (
            <button
              key={x.n}
              role="tab"
              aria-selected={k === i}
              onClick={() => setI(k)}
              className={cn(
                "font-display text-[clamp(2.4rem,1.4rem+4vw,5.4rem)] leading-[1.02] tracking-[-0.05em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FC9BD]",
                k === i
                  ? "text-[#021E34] underline decoration-[#0FC9BD] decoration-[0.06em] underline-offset-[0.14em]"
                  : "text-[#021E34]/20 hover:text-[#021E34]/45",
              )}
            >
              {x.t}.
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-lg text-[#021E34]/70" aria-live="polite">
            {e.d[modo]}
          </p>
          <SeletorModo modo={modo} setModo={setModo} />
        </div>
        <div className="mt-12 grid items-center gap-10 md:grid-cols-[16rem_1fr] lg:gap-20">
          <div className="mx-auto w-[60%] max-w-[16rem] md:w-full">
            <p className="mb-4 text-center text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#0b8f86]">
              O cliente
            </p>
            <FoneEtapa tela={e.tela[modo]} demo={modo === "order" && e.tela.order === "cardapio"} />
          </div>
          <div>
            <p className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#0b8f86]">
              O restaurante
            </p>
            <LinhaRestaurante ativa={i} texto={e.restaurante} />
          </div>
        </div>
      </div>
    </section>
  );
}
