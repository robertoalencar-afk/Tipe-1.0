/**
 * Três propostas para o diagrama de integrações da home (V62, interno). O hub atual
 * (integracoes/HubIntegracoes.tsx) continua na home até o Roberto escolher.
 *
 * Regra de verdade: produtos Tipe (módulos internos) e integrações externas ficam
 * separados, e cada um mostra o status real. Order e 3D Studio não aparecem como
 * disponíveis. "Tipe Connect" é nome provisório para a camada de API e conectores de
 * PDV (API TIPE disponível; conectores em demonstração, ver integracoes/dados.ts).
 * Valores e nomes são do restaurante fictício Maré Alta.
 */
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SimboloTipe } from "../marca/SimboloTipe";
import { LogoTipe } from "../marca/LogoTipe";
import { telaReal } from "../CelularReal";
import kds from "@/assets/telas-v4/cozinha-kds-560.webp";
import salao from "@/assets/telas-reais/salao-560.webp";
import garcom from "@/assets/telas-v4/garcom-gorjetas-390.webp";

type Status = "disponivel" | "desenvolvimento" | "planejado";
const ROTULO: Record<Status, string> = {
  disponivel: "Disponível",
  desenvolvimento: "Demonstração",
  planejado: "Planejado",
};

function Selo({ s, escuro }: { s: Status; escuro?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.68rem] font-medium",
        s === "disponivel" &&
          (escuro ? "bg-[#0FC9BD]/15 text-[#5fe3d8]" : "bg-[#0FC9BD]/15 text-[#087a72]"),
        s === "desenvolvimento" &&
          (escuro ? "bg-white/10 text-white/75" : "bg-[#021E34]/7 text-[#021E34]/70"),
        s === "planejado" &&
          (escuro
            ? "text-white/45 ring-1 ring-white/15"
            : "text-[#021E34]/45 ring-1 ring-[#021E34]/12"),
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          s === "disponivel"
            ? "bg-[#0FC9BD]"
            : s === "desenvolvimento"
              ? "bg-current opacity-70"
              : "border border-current",
        )}
      />
      {ROTULO[s]}
    </span>
  );
}

type Modulo = {
  id: string;
  nome: string;
  frase: string;
  status: Status;
  faz: string[];
  tela?: { src: string; tipo: "celular" | "tablet" };
};

const pago = telaReal("pago").src;
const cardapio = telaReal("cardapio").src;

const MODULOS: Modulo[] = [
  {
    id: "pay",
    nome: "Tipe Pay",
    frase: "Pague. Sem esperar.",
    status: "disponivel",
    faz: [
      "Conta ao vivo no QR da mesa",
      "Divisão e Pix, Apple Pay, Google Pay",
      "Gorjeta extra depois do pagamento",
    ],
    tela: { src: pago, tipo: "celular" },
  },
  {
    id: "order",
    nome: "Tipe Order",
    frase: "Peça. Sem esperar.",
    status: "desenvolvimento",
    faz: [
      "Cardápio no mesmo QR do Pay",
      "Pedido vai para a cozinha e o garçom",
      "Contratado à parte, sem outro app",
    ],
    tela: { src: cardapio, tipo: "celular" },
  },
  {
    id: "kitchen",
    nome: "Tipe Kitchen",
    frase: "A cozinha vê na hora.",
    status: "disponivel",
    faz: ["Tela da cozinha e do bar", "Pedidos por mesa e por tempo", "Pronto avisa o salão"],
    tela: { src: kds, tipo: "tablet" },
  },
  {
    id: "staff",
    nome: "Tipe Staff",
    frase: "A equipe sabe de tudo.",
    status: "disponivel",
    faz: [
      "Mesa paga avisa o garçom",
      "Gorjeta extra no saldo (70%)",
      "Saque por Pix no fim do ciclo",
    ],
    tela: { src: garcom, tipo: "celular" },
  },
  {
    id: "restaurant",
    nome: "Tipe Restaurant",
    frase: "O salão inteiro numa tela.",
    status: "disponivel",
    faz: [
      "Mapa do salão em tempo real",
      "Caixa e fechamento do dia",
      "Relatórios por forma de pagamento",
    ],
    tela: { src: salao, tipo: "tablet" },
  },
  {
    id: "ai",
    nome: "Tipe AI",
    frase: "Pergunte ao seu restaurante.",
    status: "disponivel",
    faz: ["A Lebre responde sobre o dia", "Alertas de mesa parada", "Resumo do turno"],
  },
  {
    id: "studio",
    nome: "Tipe 3D Studio",
    frase: "Veja antes de pedir.",
    status: "planejado",
    faz: [
      "Fotografe ou filme o prato",
      "Modelo 3D no cardápio do Order",
      "Prato sobre a mesa em aparelhos compatíveis",
    ],
  },
  {
    id: "connect",
    nome: "Tipe Connect",
    frase: "Conversa com o seu PDV.",
    status: "desenvolvimento",
    faz: [
      "API TIPE disponível hoje",
      "Compatibilidade com PDVs sob análise",
      "Baixa automática quando a conta é paga",
    ],
  },
];

const EXTERNAS: { nome: string; status: Status }[] = [
  { nome: "Pagar.me", status: "disponivel" },
  { nome: "Pix", status: "disponivel" },
  { nome: "Apple Pay", status: "disponivel" },
  { nome: "Google Pay", status: "disponivel" },
  { nome: "PDVs de mercado", status: "desenvolvimento" },
  { nome: "Fiscal e NFC-e", status: "disponivel" },
  { nome: "Delivery", status: "planejado" },
];

function Miniatura({ m }: { m: Modulo }) {
  if (!m.tela)
    return (
      <div className="grid h-full place-items-center rounded-2xl bg-white/5 p-6 text-center text-sm text-white/60 ring-1 ring-white/10">
        {m.id === "ai" ? (
          <p>
            <span className="mb-2 block rounded-2xl bg-white/10 px-3 py-2 text-left text-white/85">
              Quanto entrou de Pix hoje?
            </span>
            <span className="block rounded-2xl bg-[#0FC9BD]/20 px-3 py-2 text-left text-[#bff5f0]">
              R$ 4.318,20 em 37 contas. A mesa 7 está parada há 25 min.
            </span>
          </p>
        ) : m.id === "studio" ? (
          <p>Ainda sem tela. Entra no cardápio do Order quando o 3D Studio sair.</p>
        ) : (
          <p className="font-mono text-[0.72rem] leading-relaxed text-white/70">
            POST /api/pdv/mesa-12
            <br />
            {'{ status: "paga", total: 118.79 }'}
          </p>
        )}
      </div>
    );
  return (
    <div className="grid h-full place-items-center">
      <img
        src={m.tela.src}
        alt=""
        className={cn(
          "max-h-full object-contain object-top shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)] ring-[5px] ring-[#111]",
          m.tela.tipo === "celular"
            ? "aspect-[390/700] w-[48%] rounded-[1.4rem] object-cover"
            : "w-full rounded-xl",
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 1: Tipe Ecosystem. O símbolo no centro, os módulos em volta */
/* e um painel que mostra o que o módulo selecionado faz.               */
/* ------------------------------------------------------------------ */
export function Proposta1Ecossistema() {
  const [sel, setSel] = useState("pay");
  const m = MODULOS.find((x) => x.id === sel)!;
  return (
    <section className="relative overflow-hidden bg-[#021E34] px-4 py-16 text-white sm:px-8 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_30%_50%,rgb(15_201_189/0.16),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] leading-[1] tracking-[-0.04em]">
          Tudo conectado.
          <br />
          Uma única plataforma.
        </h2>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="0.3"
              />
              <circle
                cx="50"
                cy="50"
                r="22"
                fill="none"
                stroke="rgb(255 255 255 / 0.06)"
                strokeWidth="0.3"
              />
              {MODULOS.map((x, k) => {
                const a = (k / MODULOS.length) * Math.PI * 2 - Math.PI / 2;
                const px = 50 + Math.cos(a) * 38;
                const py = 50 + Math.sin(a) * 38;
                const on = x.id === sel;
                return (
                  <line
                    key={x.id}
                    x1="50"
                    y1="50"
                    x2={px}
                    y2={py}
                    stroke={on ? "#0FC9BD" : "rgb(255 255 255 / 0.12)"}
                    strokeWidth={on ? 0.45 : 0.25}
                    strokeDasharray={x.status === "disponivel" ? undefined : "1 1.2"}
                    className={on ? "eco-fluxo" : undefined}
                  />
                );
              })}
            </svg>
            <div className="absolute left-1/2 top-1/2 grid h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#06304f] ring-1 ring-[#0FC9BD]/40">
              <SimboloTipe className="h-[46%] w-[46%]" titulo="Tipe" />
            </div>
            {MODULOS.map((x, k) => {
              const a = (k / MODULOS.length) * Math.PI * 2 - Math.PI / 2;
              const on = x.id === sel;
              return (
                <button
                  key={x.id}
                  onClick={() => setSel(x.id)}
                  aria-pressed={on}
                  style={{ left: `${50 + Math.cos(a) * 38}%`, top: `${50 + Math.sin(a) * 38}%` }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.78rem] font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD] sm:px-4 sm:text-sm",
                    on
                      ? "bg-white text-[#021E34] shadow-[0_10px_30px_-10px_rgb(15_201_189/0.6)]"
                      : "bg-[#0a2c47] text-white/80 ring-1 ring-white/10 hover:text-white",
                    x.status === "planejado" && !on && "text-white/45",
                  )}
                >
                  {x.nome.replace("Tipe ", "")}
                </button>
              );
            })}
          </div>
          <div
            className="rounded-[1.75rem] bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-8"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xl font-semibold">{m.nome}</p>
              <Selo s={m.status} escuro />
            </div>
            <p className="mt-1 font-display text-2xl tracking-[-0.02em] text-[#0FC9BD]">
              {m.frase}
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_11rem]">
              <ul className="space-y-3 text-[0.95rem] text-white/75">
                {m.faz.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-[#0FC9BD]/70" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="h-48">
                <Miniatura m={m} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/45">
            Integrações externas
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {EXTERNAS.map((x) => (
              <li
                key={x.nome}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] py-1.5 pl-4 pr-2 text-sm text-white/80 ring-1 ring-white/10"
              >
                {x.nome}
                <Selo s={x.status} escuro />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 2: a jornada da mesa. Sete etapas em sequência; cada uma   */
/* mostra o produto responsável e o que se atualiza sozinho.           */
/* ------------------------------------------------------------------ */
const JORNADA: { t: string; produto: string; status: Status; acao: string; atualiza: string[] }[] =
  [
    {
      t: "QR Code",
      produto: "Tipe Pay",
      status: "disponivel",
      acao: "Cliente lê o QR da mesa 12.",
      atualiza: ["Mesa 12 aberta no salão", "Conta ao vivo no celular"],
    },
    {
      t: "Pedido",
      produto: "Tipe Order",
      status: "desenvolvimento",
      acao: "Pede 2 pastéis e 1 moqueca.",
      atualiza: ["Itens na conta da mesa", "Pedido enviado à cozinha"],
    },
    {
      t: "Cozinha",
      produto: "Tipe Kitchen",
      status: "disponivel",
      acao: "A cozinha vê o pedido e prepara.",
      atualiza: ["Tempo de preparo contando", "Pronto avisa o salão"],
    },
    {
      t: "Atendimento",
      produto: "Tipe Staff",
      status: "disponivel",
      acao: "Joyce recebe o aviso e leva o prato.",
      atualiza: ["Aviso no celular da Joyce", "Mesa marcada como servida"],
    },
    {
      t: "Conta",
      produto: "Tipe Pay",
      status: "disponivel",
      acao: "A mesa confere e divide em 3.",
      atualiza: ["R$ 118,79 por pessoa", "Sem chamar o garçom"],
    },
    {
      t: "Pagamento",
      produto: "Tipe Pay",
      status: "disponivel",
      acao: "Pix, Apple Pay ou Google Pay.",
      atualiza: ["Mesa 12 paga e liberada", "Baixa no caixa"],
    },
    {
      t: "Gestão",
      produto: "Tipe Restaurant",
      status: "disponivel",
      acao: "O gestor vê o turno fechar.",
      atualiza: ["Faturamento do dia", "Fechamento por forma de pagamento"],
    },
  ];

function useAvanco(total: number, ms: number) {
  const [i, setI] = useState(0);
  const [parado, setParado] = useState(false);
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (r || parado) return;
    const id = window.setTimeout(() => setI((v) => (v + 1) % total), ms);
    return () => window.clearTimeout(id);
  }, [i, parado, total, ms]);
  return { i, setI, setParado };
}

export function Proposta2Jornada() {
  const { i, setI, setParado } = useAvanco(JORNADA.length, 2800);
  const e = JORNADA[i]!;
  return (
    <section
      className="bg-white px-4 py-16 sm:px-8 lg:py-24"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] leading-[1] tracking-[-0.04em] text-[#021E34]">
          Tudo acontece
          <br />
          na mesma mesa.
        </h2>
        <ol className="relative mt-14 grid gap-3 md:grid-cols-7 md:gap-0">
          <span
            aria-hidden
            className="absolute left-0 right-0 top-[11px] hidden h-px bg-[#021E34]/10 md:block"
          />
          <span
            aria-hidden
            className="absolute left-0 top-[11px] hidden h-px bg-[#0FC9BD] transition-[width] duration-700 md:block"
            style={{ width: `${(i / (JORNADA.length - 1)) * 100}%` }}
          />
          {JORNADA.map((x, k) => (
            <li key={x.t} className="relative">
              <button
                onClick={() => setI(k)}
                aria-current={k === i ? "step" : undefined}
                className="flex w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FC9BD] md:flex-col md:items-start"
              >
                <span
                  className={cn(
                    "relative grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border transition-colors duration-500",
                    k <= i ? "border-[#0FC9BD] bg-[#0FC9BD]" : "border-[#021E34]/15 bg-white",
                  )}
                >
                  {k === i && (
                    <span className="absolute inset-[-6px] animate-ping rounded-full bg-[#0FC9BD]/30 motion-reduce:hidden" />
                  )}
                </span>
                <span>
                  <span
                    className={cn(
                      "block text-[0.95rem] font-medium md:mt-3",
                      k === i ? "text-[#021E34]" : "text-[#021E34]/45",
                    )}
                  >
                    {x.t}
                  </span>
                  <span className="block text-[0.72rem] text-[#021E34]/45">{x.produto}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div
          className="mt-12 grid gap-6 rounded-[1.75rem] bg-[#f4f3ef] p-6 sm:p-8 md:grid-cols-[1fr_1.2fr] md:items-center"
          aria-live="polite"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-[#087a72]">{e.produto}</p>
              <Selo s={e.status} />
            </div>
            <p className="mt-2 font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] leading-[1.05] tracking-[-0.03em] text-[#021E34]">
              {e.acao}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {e.atualiza.map((a, k) => (
              <li
                key={`${i}-${a}`}
                className="eco-entra flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[0.95rem] text-[#021E34] shadow-[0_14px_30px_-22px_rgb(2_30_52/0.5)]"
                style={{ animationDelay: `${k * 140}ms` }}
              >
                <SimboloTipe className="h-4 w-4" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proposta 3: o restaurante em tempo real. Quatro telas pequenas      */
/* (mesa, cozinha, garçom, gestor) reagem ao mesmo evento.             */
/* ------------------------------------------------------------------ */
const EVENTOS = [
  {
    quem: 0,
    texto: "Mesa 12 pediu uma moqueca",
    estados: ["Pedido enviado", "Nova comanda · mesa 12", "—", "Mesa 12 · R$ 138,00"],
  },
  {
    quem: 1,
    texto: "A cozinha marcou pronto",
    estados: [
      "Seu prato está a caminho",
      "Moqueca · pronta",
      "Levar à mesa 12",
      "Mesa 12 · servida",
    ],
  },
  {
    quem: 0,
    texto: "A mesa dividiu e pagou com Pix",
    estados: ["Pagamento realizado", "—", "Mesa 12 paga", "+ R$ 356,37 no caixa"],
  },
  {
    quem: 2,
    texto: "Gorjeta extra de R$ 37,80",
    estados: ["Obrigado pela gorjeta", "—", "R$ 26,46 no seu saldo", "Mesa 12 livre"],
  },
];
const PAINEIS = ["Mesa 12", "Cozinha", "Joyce · garçonete", "Gestor"];

function Painel({
  titulo,
  valor,
  ativo,
  children,
}: {
  titulo: string;
  valor: string;
  ativo: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] p-5 transition-all duration-500",
        ativo
          ? "bg-white text-[#021E34] shadow-[0_30px_60px_-30px_rgb(15_201_189/0.55)]"
          : "bg-white/[0.05] text-white ring-1 ring-white/10",
      )}
    >
      <p
        className={cn(
          "text-[0.7rem] font-medium uppercase tracking-[0.14em]",
          ativo ? "text-[#087a72]" : "text-white/45",
        )}
      >
        {titulo}
      </p>
      <p key={valor} className="eco-entra mt-3 text-lg font-medium leading-snug">
        {valor === "—" ? <span className="opacity-40">Sem mudança</span> : valor}
      </p>
      {children}
    </div>
  );
}

export function Proposta3TempoReal() {
  const { i, setI, setParado } = useAvanco(EVENTOS.length, 3200);
  const ev = EVENTOS[i]!;
  return (
    <section
      className="bg-[#03192b] px-4 py-16 text-white sm:px-8 lg:py-24"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-xl font-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] leading-[1] tracking-[-0.04em]">
            Uma operação inteira,
            <br />
            na mesma tela.
          </h2>
          <LogoTipe tom="escuro" className="h-auto w-24 opacity-90" titulo="" />
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3" aria-live="polite">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0FC9BD] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0FC9BD]" />
          </span>
          <p key={i} className="eco-entra text-xl font-medium">
            {ev.texto}
          </p>
          <span className="text-sm text-white/40">· agora</span>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAINEIS.map((p, k) => (
            <Painel key={p} titulo={p} valor={ev.estados[k]!} ativo={ev.estados[k] !== "—"} />
          ))}
        </div>
        <div className="mt-8 flex gap-2">
          {EVENTOS.map((x, k) => (
            <button
              key={x.texto}
              onClick={() => setI(k)}
              aria-label={x.texto}
              aria-current={k === i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                k === i ? "w-8 bg-[#0FC9BD]" : "w-3 bg-white/20",
              )}
            />
          ))}
        </div>
        <p className="mt-6 text-sm text-white/45">
          Pedido pelo celular depende do Tipe Order, em demonstração. Valores demonstrativos: dos R$
          37,80 de gorjeta extra, 70% vão para a Joyce e 30% ficam com a Tipe.
        </p>
      </div>
    </section>
  );
}
