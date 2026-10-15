/**
 * Mesa Viva: a história da Tipe contada na rolagem, com o nome do restaurante
 * de quem está visitando. A seção fica presa na tela; cada trecho da rolagem
 * troca o capítulo (texto à esquerda, celular à direita) e a lebre comenta.
 * O celular é clicável: dá para escolher itens, pagar, avaliar e dar gorjeta.
 * Nada aqui toca dados reais: é tudo estado local desta seção.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Star } from "lucide-react";
import { Lebre, SimboloTipe, type Humor } from "@/components/tipe/landing/Lebre";
import { trackMesaViva } from "@/lib/tipe/tracking";
import { cn } from "@/lib/utils";

const NOME_KEY = "tipe:mesa-viva:restaurante";
const PADRAO = "Maré Alta";

const ITENS = [
  { id: "moqueca", nome: "Moqueca de peixe", valor: 89 },
  { id: "siri", nome: "Casquinha de siri", valor: 32 },
  { id: "caipi1", nome: "Caipirinha de limão", valor: 24 },
  { id: "caipi2", nome: "Caipirinha de limão", valor: 24 },
  { id: "agua", nome: "Água com gás", valor: 8 },
  { id: "pudim", nome: "Pudim de leite", valor: 18 },
] as const;

const METODOS = [
  ["pix", "Pix", "Aprovado na hora"],
  ["apple", "Apple Pay", "Pagamento em um toque"],
  ["google", "Google Pay", "Pagamento em um toque"],
] as const;
type Metodo = (typeof METODOS)[number][0];

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Capitulo = {
  chip: string;
  titulo: [string, string];
  texto: (nome: string) => string;
  humor: Humor;
  fala: string;
};

const CAPS: Capitulo[] = [
  {
    chip: "Abrir",
    titulo: ["Sentou.", "Apontou. Abriu."],
    texto: (n) =>
      `O cliente aponta a câmera para o totem da ${n} e a conta da mesa abre no navegador. Sem baixar nada.`,
    humor: "surpresa",
    fala: "Psiu! Aponta a câmera aqui.",
  },
  {
    chip: "Conta",
    titulo: ["A conta", "já está lá."],
    texto: () =>
      "Cada pedido lançado no PDV aparece na hora, com o nome de quem atendeu. Ninguém precisa pedir a conta.",
    humor: "atenta",
    fala: "Chegou mais um pedido!",
  },
  {
    chip: "Dividir",
    titulo: ["Cada um", "paga o seu."],
    texto: () =>
      "Toque nos itens que são seus. Dá para dividir um prato, pagar em partes iguais ou a conta inteira.",
    humor: "piscando",
    fala: "Toque nos itens que são seus.",
  },
  {
    chip: "Pagar",
    titulo: ["Pix, Apple Pay", "ou Google Pay."],
    texto: (n) =>
      `Aprovado em segundos e já baixado na conta da mesa. O caixa da ${n} vê tudo no painel.`,
    humor: "atenta",
    fala: "Escolha como pagar e toque em pagar.",
  },
  {
    chip: "Agradecer",
    titulo: ["E quem atendeu", "sente na hora."],
    texto: () =>
      "A avaliação e a gorjeta extra chegam no celular do garçom, que acompanha o próprio saldo.",
    humor: "feliz",
    fala: "Que tal uma estrela a mais?",
  },
  {
    chip: "Pronto",
    titulo: ["Mesa fechada.", "Próxima!"],
    texto: (n) =>
      `Menos espera para o cliente, mais giro de mesa para a ${n}. E ninguém correu atrás de maquininha.`,
    humor: "feliz",
    fala: "Até a próxima!",
  },
];

export function MesaViva() {
  const wrap = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const passed = useRef(false);
  const [cap, setCap] = useState(0);
  const [nomeBruto, setNomeBruto] = useState(PADRAO);
  const nome = nomeBruto.trim() || "seu restaurante";

  // Interações dentro do celular
  const [meus, setMeus] = useState<string[]>(["siri", "caipi1"]);
  const [metodo, setMetodo] = useState<Metodo>("apple");
  const [pago, setPago] = useState(false);
  const [estrelas, setEstrelas] = useState(4);
  const [gorjeta, setGorjeta] = useState(10);
  const [enviada, setEnviada] = useState(false);
  const parte = ITENS.filter((i) => meus.includes(i.id)).reduce((s, i) => s + i.valor, 0);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(NOME_KEY);
      if (salvo) setNomeBruto(salvo);
    } catch {
      /* sem armazenamento: fica o nome padrão */
    }
  }, []);

  const trocarNome = (v: string) => {
    setNomeBruto(v);
    try {
      window.localStorage.setItem(NOME_KEY, v);
    } catch {
      /* ignora */
    }
  };

  useEffect(() => {
    const el = tela.current;
    if (!el) return;
    const fit = () => setEscala(el.clientWidth / 300);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rolagem -> capítulo. Só re-renderiza quando o capítulo muda.
  useEffect(() => {
    let frame = 0;
    const medir = () => {
      frame = 0;
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      const c = Math.min(CAPS.length - 1, Math.floor(p * CAPS.length));
      setCap(c);
      if (!passed.current && c >= 1) {
        passed.current = true;
        trackMesaViva("passed");
      }
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Quem só rola também vê o pagamento aprovado e a gorjeta chegando.
  useEffect(() => {
    if (cap === 3 && !pago) {
      const t = window.setTimeout(() => setPago(true), 2600);
      return () => window.clearTimeout(t);
    }
    if (cap === 4 && !enviada) {
      const t = window.setTimeout(() => setEnviada(true), 2800);
      return () => window.clearTimeout(t);
    }
    if (cap < 3) setPago(false);
    if (cap < 4) setEnviada(false);
    return undefined;
  }, [cap, pago, enviada]);

  const irPara = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + ((i + 0.5) / CAPS.length) * total, behavior: "smooth" });
  };

  const pular = () => {
    trackMesaViva("skip");
    const el = wrap.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + el.offsetHeight });
  };

  const c = CAPS[cap] ?? CAPS[0]!;

  return (
    <section
      ref={wrap}
      id="como-funciona"
      aria-label="Mesa Viva: como a Tipe funciona na mesa"
      className="relative scroll-mt-16 bg-[#0b1f3a] text-white"
      style={{ height: `${CAPS.length * 85 + 40}svh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-48 top-1/4 h-[640px] w-[640px] rounded-full bg-brand/15 blur-3xl"
        />

        {/* topo: nome do restaurante, capítulos e progresso */}
        <div className="container-page relative z-10 pt-20 sm:pt-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="group flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-4 pr-1.5 text-sm backdrop-blur focus-within:border-brand">
              <span className="text-white/60 max-sm:hidden">Seu restaurante:</span>
              <input
                value={nomeBruto}
                onChange={(e) => trocarNome(e.target.value.slice(0, 26))}
                aria-label="Nome do seu restaurante"
                placeholder="Nome do restaurante"
                className="w-36 bg-transparent font-medium text-white outline-none placeholder:text-white/40 sm:w-44"
              />
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-[#0b1f3a]">
                Mesa 12
              </span>
            </label>
            <nav aria-label="Capítulos da Mesa Viva" className="flex gap-1.5 max-md:hidden">
              {CAPS.map((k, i) => (
                <button
                  key={k.chip}
                  type="button"
                  onClick={() => irPara(i)}
                  aria-current={i === cap ? "step" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                    i === cap ? "bg-white text-[#0b1f3a]" : "text-white/60 hover:text-white",
                  )}
                >
                  <span className="mr-1.5 opacity-50">{i + 1}</span>
                  {k.chip}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={pular}
              className="text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              Pular
            </button>
          </div>
          <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/10">
            <div
              ref={bar}
              className="h-full origin-left rounded-full bg-brand"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>

        {/* palco */}
        <div className="container-page relative z-10 grid flex-1 items-center gap-4 py-4 lg:grid-cols-[1fr_auto] lg:gap-16">
          {/* textos empilhados */}
          <div className="relative min-h-[11.5rem] sm:min-h-[15rem] lg:min-h-[24rem]">
            {CAPS.map((k, i) => (
              <div
                key={k.chip}
                aria-hidden={i !== cap}
                className={cn(
                  "absolute inset-x-0 top-1/2 transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
                  i === cap
                    ? "-translate-y-1/2 opacity-100"
                    : i < cap
                      ? "pointer-events-none -translate-y-[75%] opacity-0"
                      : "pointer-events-none -translate-y-[25%] opacity-0",
                )}
              >
                <p className="font-display text-sm text-brand sm:text-base">
                  {String(i + 1).padStart(2, "0")} · {k.chip}
                </p>
                <h2 className="mt-2 font-display text-[clamp(2.4rem,1.2rem+5vw,6.2rem)] font-medium leading-[0.95] tracking-[-0.04em]">
                  <span className="block">{k.titulo[0]}</span>
                  <span className="block" style={{ color: "var(--color-brand)" }}>
                    {k.titulo[1]}
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/70 max-sm:line-clamp-3 sm:mt-6 sm:text-lg">
                  {k.texto(nome)}
                </p>
                {i === CAPS.length - 1 && (
                  <div className="mt-6 flex flex-wrap gap-3 max-sm:hidden">
                    <a
                      href="/teste-gratis"
                      className="btn-press inline-flex h-12 items-center rounded-full bg-white px-6 font-medium text-[#0b1f3a]"
                    >
                      Quero a Tipe na {nome}
                    </a>
                    <a
                      href="/simulador"
                      className="btn-press inline-flex h-12 items-center rounded-full border border-white/25 px-6 font-medium"
                    >
                      Testar o simulador
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* celular + lebre */}
          <div className="relative mx-auto">
            <div className="relative w-[min(60vw,calc((100svh-25rem)*0.462))] sm:w-[min(17rem,calc((100svh-24rem)*0.462))] lg:w-[min(19.5rem,calc((100svh-11rem)*0.462))]">
              <div className="rounded-[2.8rem] bg-[oklch(0.14_0_0)] p-[9px] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_oklch(0.38_0_0/0.7)]">
                <div
                  ref={tela}
                  className="relative aspect-[390/844] overflow-hidden rounded-[2.25rem] bg-[#f7f9fa] text-[#0d1b2a]"
                >
                  {/* as telas são desenhadas em 300px e escaladas para o tamanho do celular */}
                  <div
                    className="absolute left-0 top-0 h-[649px] w-[300px] origin-top-left"
                    style={{ transform: `scale(${escala})` }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-[7px] z-30 h-[18px] w-[30%] -translate-x-1/2 rounded-full bg-black"
                    />
                    <Tela ativa={cap === 0} escura>
                      <TelaCamera nome={nome} />
                    </Tela>
                    <Tela ativa={cap === 1}>
                      <Cabecalho nome={nome} />
                      <TelaConta ativa={cap === 1} />
                    </Tela>
                    <Tela ativa={cap === 2}>
                      <Cabecalho nome={nome} />
                      <TelaDividir
                        meus={meus}
                        parte={parte}
                        alternar={(id) =>
                          setMeus((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
                        }
                      />
                    </Tela>
                    <Tela ativa={cap === 3}>
                      <Cabecalho nome={nome} />
                      <TelaPagar
                        parte={parte}
                        metodo={metodo}
                        escolher={setMetodo}
                        pago={pago}
                        pagar={() => setPago(true)}
                        nome={nome}
                      />
                    </Tela>
                    <Tela ativa={cap === 4}>
                      <Cabecalho nome={nome} />
                      <TelaAgradecer
                        estrelas={estrelas}
                        setEstrelas={setEstrelas}
                        gorjeta={gorjeta}
                        setGorjeta={setGorjeta}
                        enviada={enviada}
                        enviar={() => setEnviada(true)}
                      />
                    </Tela>
                    <Tela ativa={cap === 5}>
                      <Cabecalho nome={nome} />
                      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                        <Lebre humor="feliz" className="w-24 text-[#0d1b2a]" />
                        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-strong">
                          Mesa 12
                        </p>
                        <p className="mt-1 font-display text-xl font-semibold leading-tight">
                          Conta fechada.
                          <br />
                          Bom resto de noite!
                        </p>
                        <p className="mt-2 text-[12px] text-[#0d1b2a]/60">
                          Obrigado por escolher a {nome}.
                        </p>
                      </div>
                    </Tela>
                  </div>
                </div>
              </div>

              {/* relógio do garçom */}
              <div
                aria-hidden={!(cap === 4 && enviada)}
                className={cn(
                  "absolute -left-24 top-[18%] w-[9.5rem] rounded-[1.9rem] border-[5px] border-[oklch(0.25_0_0)] bg-black p-3.5 text-white shadow-2xl transition-all duration-500 motion-reduce:transition-none max-lg:hidden",
                  cap === 4 && enviada ? "scale-100 opacity-100" : "scale-75 opacity-0",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                  Gorjeta extra
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">{money(gorjeta)}</p>
                <p className="mt-1 text-[11px] leading-tight text-white/60">
                  Mesa 12 · {nome}
                  <br />
                  {estrelas} {estrelas === 1 ? "estrela" : "estrelas"}
                </p>
              </div>

              {/* lebre comentando */}
              <div className="pointer-events-none absolute -bottom-2 -left-16 z-20 flex w-[11rem] flex-col items-start gap-2 sm:-left-44 lg:-left-52">
                <p
                  key={`f${cap}`}
                  className="lebre-fala rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-[13px] font-medium leading-snug text-[#0b1f3a] shadow-xl max-sm:hidden"
                >
                  {c.fala}
                </p>
                <Lebre key={cap} humor={c.humor} className="lebre-pulo w-14 text-white sm:w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tela({
  ativa,
  escura = false,
  children,
}: {
  ativa: boolean;
  escura?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!ativa}
      inert={!ativa}
      className={cn(
        "absolute inset-0 flex flex-col pt-[30px] transition-all duration-500 ease-out motion-reduce:transition-none",
        escura && "bg-[#0b1f3a] text-white",
        ativa ? "z-10 translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function Cabecalho({ nome }: { nome: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#0d1b2a]/[0.07] px-4 pb-2.5 pt-2">
      <SimboloTipe className="h-5 w-5 shrink-0" />
      <span className="truncate text-[13px] font-semibold">{nome}</span>
      <span className="ml-auto shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-strong">
        Mesa 12
      </span>
    </div>
  );
}

const CANTOS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "bottom-0 left-0 border-b-2 border-l-2",
  "bottom-0 right-0 border-b-2 border-r-2",
];

function TelaCamera({ nome }: { nome: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#3b2a1c,#120c08_75%)] px-5">
      <div className="relative w-[78%] p-3">
        {CANTOS.map((k) => (
          <span key={k} className={cn("absolute h-6 w-6 rounded-sm border-[#ffd60a]", k)} />
        ))}
        {/* o totem impresso, como no painel do restaurante */}
        <div className="rotate-[-3deg] rounded-xl bg-white p-3 text-[#0b1f3a] shadow-[0_20px_30px_-10px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-1.5">
            <SimboloTipe className="h-4 w-4" />
            <span className="text-[10px] font-bold tracking-[0.2em]">TIPE</span>
          </div>
          <div className="relative mt-2 overflow-hidden">
            <QRCodeSVG
              value="https://tipe.digital/simulador"
              size={160}
              className="h-auto w-full"
              fgColor="#0b1f3a"
            />
            <span className="mv-scan absolute inset-x-0 h-0.5 bg-brand shadow-[0_0_10px_var(--color-brand)]" />
          </div>
          <p className="mt-2 text-[10px] font-semibold leading-tight">
            Aponte a câmera e veja sua conta
          </p>
          <p className="truncate text-[11px] font-bold text-brand-strong">{nome} · Mesa 12</p>
        </div>
        <div className="mx-auto h-3 w-[70%] rounded-b-md bg-gradient-to-b from-[#c8935a] to-[#8a5a2e]" />
      </div>
      {/* aviso da câmera */}
      <div className="mv-pop absolute inset-x-[8%] bottom-[12%] flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[#0d1b2a] shadow-xl backdrop-blur">
        <SimboloTipe className="h-6 w-6 shrink-0" />
        <span className="min-w-0 text-[11px] leading-tight">
          <span className="block font-semibold">tipe.digital</span>
          <span className="block truncate text-[#0d1b2a]/60">Abrir a conta da Mesa 12</span>
        </span>
      </div>
    </div>
  );
}

function TelaConta({ ativa }: { ativa: boolean }) {
  const total = ITENS.reduce((s, i) => s + i.valor, 0);
  return (
    <div className="flex flex-1 flex-col px-4 pt-3">
      <p className="font-display text-lg font-semibold">Olá, Ana.</p>
      <p className="text-[11px] text-[#0d1b2a]/55">Atendimento de Rafael</p>
      <ul className="mt-3 space-y-1.5">
        {ITENS.map((i, n) => (
          <li
            key={i.id}
            className={cn(
              "flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[12px] shadow-[0_1px_0_rgba(13,27,42,0.06)]",
              ativa && "mv-item",
            )}
            style={{ "--i": n } as CSSProperties}
          >
            <span className="truncate">{i.nome}</span>
            <span className="flex items-center gap-1.5">
              {n === ITENS.length - 1 && (
                <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-strong">
                  agora
                </span>
              )}
              <span className="font-semibold tabular-nums">{money(i.valor)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mb-5 mt-auto rounded-2xl bg-[#0b1f3a] px-4 py-3 text-white">
        <p className="text-[10px] text-white/60">Total da mesa</p>
        <p className="font-display text-2xl font-semibold tabular-nums">{money(total)}</p>
      </div>
    </div>
  );
}

function TelaDividir({
  meus,
  parte,
  alternar,
}: {
  meus: string[];
  parte: number;
  alternar: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-3">
      <p className="font-display text-base font-semibold">O que você vai pagar?</p>
      <ul className="mt-2.5 space-y-1.5">
        {ITENS.map((i) => {
          const on = meus.includes(i.id);
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => alternar(i.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left text-[12px] transition-colors",
                  on ? "border-brand ring-1 ring-brand" : "border-transparent",
                )}
              >
                <span
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border",
                    on ? "border-brand bg-brand text-[#0b1f3a]" : "border-[#0d1b2a]/25",
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="truncate">{i.nome}</span>
                <span className="ml-auto font-semibold tabular-nums">{money(i.valor)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mb-5 mt-auto flex items-center justify-between rounded-2xl bg-brand px-4 py-3 text-[#0b1f3a]">
        <span className="text-[12px] font-semibold">Sua parte</span>
        <span className="font-display text-xl font-semibold tabular-nums">{money(parte)}</span>
      </div>
    </div>
  );
}

function TelaPagar({
  parte,
  metodo,
  escolher,
  pago,
  pagar,
  nome,
}: {
  parte: number;
  metodo: Metodo;
  escolher: (m: Metodo) => void;
  pago: boolean;
  pagar: () => void;
  nome: string;
}) {
  return (
    <div className="relative flex flex-1 flex-col px-4 pt-3">
      <div className="rounded-2xl bg-[#0b1f3a] px-4 py-4 text-center text-white">
        <p className="text-[10px] text-white/60">Total</p>
        <p className="font-display text-3xl font-semibold tabular-nums">{money(parte)}</p>
      </div>
      <p className="mt-3 text-[12px] font-semibold">Como deseja pagar?</p>
      <div className="mt-2 space-y-1.5">
        {METODOS.map(([id, label, nota]) => (
          <button
            key={id}
            type="button"
            onClick={() => escolher(id)}
            aria-pressed={metodo === id}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors",
              metodo === id ? "border-brand ring-1 ring-brand" : "border-transparent",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold">{label}</span>
              <span className="block text-[10px] text-[#0d1b2a]/55">{nota}</span>
            </span>
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-full",
                metodo === id ? "border-[5px] border-brand" : "border-2 border-[#0d1b2a]/20",
              )}
            />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={pagar}
        disabled={parte <= 0}
        className="mv-pulse mb-5 mt-auto h-11 rounded-full bg-brand text-[13px] font-semibold text-[#0b1f3a] disabled:opacity-40"
      >
        Pagar {money(parte)}
      </button>

      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center bg-[#f7f9fa] px-6 text-center transition-opacity duration-500 motion-reduce:transition-none",
          pago ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <span
          className={cn(
            "grid h-16 w-16 place-items-center rounded-full bg-brand text-[#0b1f3a] transition-transform duration-500 ease-[cubic-bezier(.3,1.6,.5,1)] motion-reduce:transition-none",
            pago ? "scale-100" : "scale-0",
          )}
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </span>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-strong">
          Conta paga
        </p>
        <p className="mt-1 font-display text-xl font-semibold">Pagamento aprovado!</p>
        <p className="mt-1 text-[12px] text-[#0d1b2a]/60">
          {money(parte)} enviados à {nome}.
        </p>
      </div>
    </div>
  );
}

function TelaAgradecer({
  estrelas,
  setEstrelas,
  gorjeta,
  setGorjeta,
  enviada,
  enviar,
}: {
  estrelas: number;
  setEstrelas: (n: number) => void;
  gorjeta: number;
  setGorjeta: (n: number) => void;
  enviada: boolean;
  enviar: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-4 text-center">
      <p className="font-display text-base font-semibold">Como foi o atendimento do Rafael?</p>
      <div className="mt-3 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEstrelas(n)}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            className="p-0.5 transition-transform active:scale-90"
          >
            <Star
              className={cn(
                "h-7 w-7",
                n <= estrelas ? "fill-[#ffb020] text-[#ffb020]" : "text-[#0d1b2a]/20",
              )}
            />
          </button>
        ))}
      </div>
      <p className="mt-6 text-[12px] font-semibold">Quer deixar uma gorjeta extra?</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[5, 10, 15].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setGorjeta(v)}
            aria-pressed={gorjeta === v}
            className={cn(
              "h-10 rounded-full border text-[12px] font-semibold transition-colors",
              gorjeta === v
                ? "border-brand bg-brand text-[#0b1f3a]"
                : "border-[#0d1b2a]/15 bg-white",
            )}
          >
            {money(v)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#0d1b2a]/55">
        {money(gorjeta * 0.7)} vão para o saldo do Rafael.
      </p>
      <button
        type="button"
        onClick={enviar}
        className={cn(
          "mb-5 mt-auto h-11 rounded-full text-[13px] font-semibold transition-colors",
          enviada ? "bg-[#0b1f3a] text-white" : "mv-pulse bg-brand text-[#0b1f3a]",
        )}
      >
        {enviada ? "Gorjeta enviada. Obrigado!" : `Enviar ${money(gorjeta)}`}
      </button>
    </div>
  );
}
