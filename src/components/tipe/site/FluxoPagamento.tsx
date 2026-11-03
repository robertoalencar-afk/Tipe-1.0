/**
 * "Como funciona": uma experiência guiada em oito passos, cada um com cena do casting ao
 * fundo, o celular com a tela real do app do cliente à frente e um aviso do que acontece
 * do lado do restaurante. No passo do pagamento aprovado entra o painel real do salão
 * (salao-antes → salao), com a Mesa 12 atualizando sozinha.
 *
 * Avança sozinho só enquanto a seção está na tela e a aba está visível; para quando a pessoa
 * navega (clique, setas do teclado, toque ou deslize). Com movimento reduzido nada anda
 * sozinho e tudo troca na hora. Dados do restaurante fictício "Maré Alta"; nada cobra de verdade.
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  HandCoins,
  Landmark,
  LayoutGrid,
  Pause,
  Play,
  ReceiptText,
  ScanLine,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import salao560 from "@/assets/telas-reais/salao-560.webp";
import salao1000 from "@/assets/telas-reais/salao-1000.webp";
import salaoAntes560 from "@/assets/telas-reais/salao-antes-560.webp";
import salaoAntes1000 from "@/assets/telas-reais/salao-antes-1000.webp";
import { Fios } from "./Bigode";
import { CelularComo, type QuadroCelular } from "./como-funciona/CelularComo";
import { fotoSrc, type NomeFoto } from "./Foto";
import { reduzMovimento } from "./movimento";
import { Secao, Titulo } from "./Site";
import "./como-funciona/como-funciona.css";

type Passo = {
  id: string;
  quem: string;
  titulo: string;
  texto: string;
  cena: NomeFoto;
  /** object-position da cena no palco. */
  foco: string;
  quadro: QuadroCelular;
  aviso: { rotulo: string; texto: ReactNode; icone: ReactNode };
  salao?: boolean;
};

// Ordem real do app do cliente: a conta é paga primeiro; a gorjeta extra, opcional,
// vem depois como um segundo pagamento.
const PASSOS: Passo[] = [
  {
    id: "qr",
    quem: "Cliente",
    titulo: "Aponta a câmera para o QR Code",
    texto:
      "Cada mesa tem o seu totem. A conta abre no navegador, sem baixar aplicativo e sem chamar ninguém.",
    cena: "cena-casal",
    foco: "30% 40%",
    quadro: {
      tipo: "camera",
      alt: "Câmera do celular enquadrando o QR Code do totem da Mesa 12 do Maré Alta",
    },
    aviso: { rotulo: "No salão", texto: "Mesa 12 abriu a conta pelo celular", icone: <ScanLine /> },
  },
  {
    id: "conta",
    quem: "Cliente",
    titulo: "Vê a conta ao vivo",
    texto: "Os itens aparecem conforme o garçom lança, já com a taxa de serviço do restaurante.",
    cena: "cena-familia",
    foco: "40% 45%",
    quadro: {
      tipo: "tela",
      tela: "conta",
      alt: "Conta da Mesa 12 no celular: total de R$ 356,40 com a taxa de serviço",
      toque: { x: 28, y: 59 },
    },
    aviso: {
      rotulo: "Para o garçom",
      texto: "O que a Joyce lança aparece na conta na mesma hora",
      icone: <ReceiptText />,
    },
  },
  {
    id: "dividir",
    quem: "Cliente",
    titulo: "Divide do jeito da mesa",
    texto: "Pagar tudo, partes iguais, por valor, por porcentagem ou só os próprios itens.",
    cena: "cena-amigos",
    foco: "35% 40%",
    quadro: {
      tipo: "tela",
      tela: "dividir",
      alt: "Conta dividida em 3 partes, com a parte de R$ 118,79",
      toque: { x: 50, y: 70 },
    },
    aviso: {
      rotulo: "Na mesa",
      texto: (
        <>
          <span className="money">R$ 237,61</span> seguem em aberto para os outros dois
        </>
      ),
      icone: <Users />,
    },
  },
  {
    id: "forma",
    quem: "Cliente",
    titulo: "Escolhe como pagar",
    texto:
      "Pix, Apple Pay ou Google Pay direto no celular, ou pagar no estabelecimento, se preferir.",
    cena: "cena-executiva",
    foco: "45% 35%",
    quadro: {
      tipo: "tela",
      tela: "metodos",
      alt: "Formas de pagamento: Pix, Apple Pay, Google Pay e pagar no estabelecimento",
      toque: { x: 50, y: 89 },
    },
    aviso: {
      rotulo: "Para a equipe",
      texto: "Ninguém precisa esperar o garçom para fechar a conta",
      icone: <Landmark />,
    },
  },
  {
    id: "pix",
    quem: "Cliente",
    titulo: "Paga em segundos",
    texto:
      "No Pix, o banco confirma e a Tipe aprova sozinha. O dinheiro vai para a conta do restaurante.",
    cena: "cena-executiva",
    foco: "45% 35%",
    quadro: { tipo: "tela", tela: "pix", alt: "Tela do Pix com o valor de R$ 118,79 e o QR Code" },
    aviso: {
      rotulo: "No banco",
      texto: "Pagamento confirmado sem conferir comprovante",
      icone: <BadgeCheck />,
    },
  },
  {
    id: "pago",
    quem: "Cliente e restaurante",
    titulo: "Pago. A mesa atualiza no salão",
    texto:
      "Cada parte paga aparece no painel do restaurante. Quando a última cai, a mesa se encerra sozinha.",
    cena: "cena-gerente",
    foco: "40% 35%",
    quadro: {
      tipo: "tela",
      tela: "pago",
      alt: "Pagamento realizado, com o valor pago, o restaurante e a mesa",
      toque: { x: 49, y: 75 },
    },
    aviso: {
      rotulo: "No salão",
      texto: "Mesa 12 passou para Encerrada no painel",
      icone: <LayoutGrid />,
    },
    salao: true,
  },
  {
    id: "gorjeta",
    quem: "Cliente",
    titulo: "Se quiser, agradece com gorjeta",
    texto:
      "Depois de pagar, a gorjeta extra é opcional e cobrada à parte, como um segundo pagamento.",
    cena: "cena-garconete",
    foco: "35% 40%",
    quadro: {
      tipo: "tela",
      tela: "gorjeta-metodo",
      alt: "Pagamento da gorjeta extra de R$ 6,00, cobrada à parte da conta, por Pix, Apple Pay ou Google Pay",
      toque: { x: 50, y: 91 },
    },
    aviso: {
      rotulo: "Para a Joyce",
      texto: "70% da gorjeta extra vai para quem atendeu a mesa",
      icone: <HandCoins />,
    },
  },
  {
    id: "avaliacao",
    quem: "Cliente",
    titulo: "Avalia o atendimento",
    texto:
      "Uma nota de uma a cinco estrelas e um comentário, se quiser. A mesa fica livre para o próximo cliente.",
    cena: "cena-mesa-liberada",
    foco: "40% 40%",
    quadro: {
      tipo: "tela",
      tela: "avaliacao",
      alt: "Avaliação do atendimento com cinco estrelas e campo de comentário",
    },
    aviso: {
      rotulo: "Para a gerência",
      texto: "A nota chega para o restaurante e para quem atendeu",
      icone: <Star />,
    },
  },
];

const QUADROS = PASSOS.map((p) => p.quadro);

/** Os oito passos em três momentos da mesa (03/11: sem "Ato 1, 2, 3", pedido do Roberto). */
const ATOS = [
  { nome: "Na chegada da conta", ate: "conta" },
  { nome: "Na hora de pagar", ate: "pago" },
  { nome: "Depois de pagar", ate: "avaliacao" },
];
const ATO_DE = PASSOS.map((p) => {
  const fim = PASSOS.findIndex((q) => q.id === p.id);
  return ATOS.findIndex((a) => PASSOS.findIndex((q) => q.id === a.ate) >= fim) + 1;
});
const ATO_INICIO: Record<number, { n: number; nome: string }> = {};
ATO_DE.forEach((n, i) => {
  if (i === 0 || ATO_DE[i - 1] !== n) ATO_INICIO[i] = { n, nome: ATOS[n - 1]!.nome };
});
const CENAS = [...new Set(PASSOS.map((p) => p.cena))];
const TEMPO = 4600;
const TOTAL = PASSOS.length;
const dois = (n: number) => String(n).padStart(2, "0");

/** Visível na tela agora (entra e sai), para pausar fora dela. */
function useNaTela<T extends Element>() {
  const ref = useRef<T>(null);
  const [na, setNa] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setNa(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, na] as const;
}

function useAbaVisivel() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const f = () => setV(document.visibilityState !== "hidden");
    f();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  return v;
}

export function FluxoPagamento() {
  const [ativo, setAtivo] = useState(0);
  const [auto, setAuto] = useState(true);
  const [reduzido, setReduzido] = useState(false);
  const [ref, naTela] = useNaTela<HTMLDivElement>();
  const abaVisivel = useAbaVisivel();
  const [carregar, setCarregar] = useState(false);
  const [salaoDepois, setSalaoDepois] = useState(false);
  const [tocar, setTocar] = useState(false);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const gesto = useRef<{ x: number; y: number; tipo: string } | null>(null);

  useEffect(() => {
    if (reduzMovimento()) {
      setReduzido(true);
      setAuto(false);
    }
  }, []);
  useEffect(() => {
    if (naTela) setCarregar(true);
  }, [naTela]);

  const correndo = auto && naTela && abaVisivel && !reduzido;
  const passo = PASSOS[ativo]!;

  // Avança sozinho.
  useEffect(() => {
    if (!correndo) return;
    const t = window.setTimeout(() => setAtivo((a) => (a + 1) % TOTAL), TEMPO);
    return () => window.clearTimeout(t);
  }, [ativo, correndo]);

  // Toque turquesa no botão perto do fim do passo, só quando anda sozinho.
  useEffect(() => {
    setTocar(false);
    if (!correndo) return;
    const t = window.setTimeout(() => setTocar(true), TEMPO - 900);
    return () => window.clearTimeout(t);
  }, [ativo, correndo]);

  // Salão: mostra o antes e, em seguida, a Mesa 12 encerrada.
  useEffect(() => {
    setSalaoDepois(false);
    if (!passo.salao) return;
    if (reduzido) {
      setSalaoDepois(true);
      return;
    }
    const t = window.setTimeout(() => setSalaoDepois(true), 1100);
    return () => window.clearTimeout(t);
  }, [ativo, passo.salao, reduzido]);

  const ir = useCallback((i: number, focar = false) => {
    const n = (i + TOTAL) % TOTAL;
    setAuto(false);
    setAtivo(n);
    if (focar) abas.current[n]?.focus();
  }, []);

  const teclas = (e: KeyboardEvent, focar: boolean) => {
    const mapa: Record<string, number> = {
      ArrowRight: ativo + 1,
      ArrowDown: ativo + 1,
      ArrowLeft: ativo - 1,
      ArrowUp: ativo - 1,
      Home: 0,
      End: TOTAL - 1,
    };
    const alvo = mapa[e.key];
    if (alvo === undefined) return;
    e.preventDefault();
    ir(alvo, focar);
  };

  const inicioGesto = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gesto.current = { x: e.clientX, y: e.clientY, tipo: e.pointerType };
  };
  const fimGesto = (e: PointerEvent) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      ir(ativo + (dx < 0 ? 1 : -1));
      return;
    }
    // Toque rápido no palco (só no toque): metade esquerda volta, direita avança.
    if (g.tipo === "touch" && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      ir(ativo + (e.clientX - r.left < r.width * 0.35 ? -1 : 1));
    }
  };

  const tempoVar = { "--tempo": `${TEMPO}ms` } as CSSProperties;

  return (
    <Secao tema="claro" id="como-funciona" ariaLabel="Como a Tipe funciona na mesa" className="cf">
      <div className="container-page">
        <Titulo
          rotulo="Como funciona"
          titulo="Três momentos na mesa. Nenhuma espera."
          texto="As telas reais do app do cliente, com o que acontece do lado do restaurante a cada toque."
        />
      </div>

      <div
        ref={ref}
        className="container-page mt-10 grid items-center gap-6 sm:gap-8 lg:mt-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-14"
      >
        {/* Lista de passos (tela grande) */}
        <div className="order-2 hidden min-w-0 lg:order-1 lg:block">
          <div
            role="tablist"
            aria-label="Passos do pagamento"
            aria-orientation="vertical"
            onKeyDown={(e) => teclas(e, true)}
          >
            {PASSOS.map((p, i) => (
              <Fragment key={p.id}>
                {ATO_INICIO[i] && (
                  <div
                    role="presentation"
                    aria-hidden
                    className={cn(
                      "flex items-center gap-2.5 pb-2 text-sm",
                      i > 0 && "mt-7",
                      ATO_DE[ativo] === ATO_INICIO[i]!.n
                        ? "text-[#0A9A90]"
                        : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 translate-y-[-0.1em] rounded-full",
                        ATO_DE[ativo] === ATO_INICIO[i]!.n
                          ? "bg-[#0FC9BD]"
                          : "bg-current opacity-50",
                      )}
                    />
                    <span className="font-semibold uppercase tracking-[0.1em] text-[0.72rem]">
                      {ATO_INICIO[i]!.nome}
                    </span>
                  </div>
                )}
                <button
                  ref={(el) => {
                    abas.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`cf-aba-${p.id}`}
                  aria-selected={ativo === i}
                  aria-controls="cf-palco"
                  tabIndex={ativo === i ? 0 : -1}
                  onClick={() => ir(i)}
                  className={cn(
                    "cf-aba relative grid w-full grid-cols-[2.25rem_1fr] gap-x-3 border-t border-border py-[0.9rem] text-left transition-colors duration-300 last:border-b",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]",
                    ativo === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="money pt-1 text-sm">{dois(i + 1)}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-[1.2rem] leading-tight tracking-[-0.03em]">
                      {p.titulo}
                    </span>
                    <span className="cf-aba-texto">
                      <span className="min-h-0 overflow-hidden">
                        <span className="block max-w-[46ch] pt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">
                          {p.texto}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="cf-aba-barra text-foreground"
                    data-correndo={correndo || undefined}
                    style={tempoVar}
                  >
                    <i key={`${ativo}-${correndo}`} />
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
        </div>

        {/* Palco */}
        <div className="order-1 min-w-0 lg:order-2">
          <div
            id="cf-palco"
            role="tabpanel"
            aria-labelledby={`cf-aba-${passo.id}`}
            aria-roledescription="demonstração"
            tabIndex={0}
            onKeyDown={(e) => teclas(e, false)}
            onPointerDown={inicioGesto}
            onPointerUp={fimGesto}
            onPointerCancel={() => (gesto.current = null)}
            data-salao={passo.salao || undefined}
            className="cf-palco mx-auto w-full max-w-[34rem] lg:max-w-none"
            style={tempoVar}
          >
            {CENAS.map((c) => {
              const on = c === passo.cena;
              const { src, srcSet } = fotoSrc(c);
              const foco = PASSOS.find((p) => p.cena === c)!.foco;
              return (
                <img
                  key={c}
                  src={carregar || on ? src : undefined}
                  srcSet={carregar || on ? srcSet : undefined}
                  sizes="(min-width: 1024px) 760px, (min-width: 640px) 544px, 100vw"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  data-on={on || undefined}
                  className="cf-cena"
                  style={{ objectPosition: foco }}
                />
              );
            })}
            <div className="cf-veu" aria-hidden />

            <div className="cf-topo" aria-hidden>
              <div className="cf-segs" style={{ "--n": TOTAL } as CSSProperties}>
                {PASSOS.map((p, i) => (
                  <span
                    key={p.id}
                    className="cf-seg"
                    data-feito={i < ativo || undefined}
                    data-ativo={i === ativo || undefined}
                    data-correndo={correndo || undefined}
                  >
                    <i key={i === ativo ? `${ativo}-${correndo}` : undefined} />
                  </span>
                ))}
              </div>
              <div className="cf-meta">
                <span className="cf-meta-quem">
                  <span className="money">
                    {dois(ativo + 1)}/{dois(TOTAL)}
                  </span>
                  {passo.quem}
                </span>
                <span className="cf-meta-selo">
                  Telas reais<span className="hidden sm:inline"> · Maré Alta (fictício)</span>
                </span>
              </div>
            </div>

            {/* Lado do restaurante: o painel real do salão */}
            <div
              className="cf-salao"
              data-on={passo.salao || undefined}
              aria-hidden={!passo.salao || undefined}
            >
              <div className="cf-salao-tela">
                {carregar && (
                  <>
                    <img
                      src={salaoAntes560}
                      srcSet={`${salaoAntes560} 560w, ${salaoAntes1000} 1000w`}
                      sizes="(min-width: 1024px) 360px, 50vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src={salao560}
                      srcSet={`${salao560} 560w, ${salao1000} 1000w`}
                      sizes="(min-width: 1024px) 360px, 50vw"
                      alt={
                        passo.salao
                          ? "Painel do salão do Maré Alta com a Mesa 12 encerrada e paga"
                          : ""
                      }
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      data-off={!salaoDepois || undefined}
                    />
                  </>
                )}
                <span className="cf-mesa12" data-on={(passo.salao && salaoDepois) || undefined} />
              </div>
            </div>

            <div className="cf-cel">
              <CelularComo
                quadros={QUADROS}
                indice={ativo}
                tocar={tocar}
                sizes="(min-width: 1024px) 250px, (min-width: 640px) 200px, 45vw"
              />
            </div>

            <div
              key={passo.id}
              className="cf-aviso"
              role="note"
              aria-label={`${passo.aviso.rotulo}`}
            >
              <span className="cf-aviso-icone" aria-hidden>
                {passo.aviso.icone}
              </span>
              <span>
                <span className="cf-aviso-rotulo">{passo.aviso.rotulo}</span>
                <span className="cf-aviso-texto">{passo.aviso.texto}</span>
              </span>
            </div>
          </div>

          {/* Texto do passo e controles (celular e tablet) */}
          <div className="mx-auto mt-5 w-full max-w-[34rem] lg:hidden">
            <div
              key={passo.id}
              className="cf-troca min-h-[7.5rem]"
              aria-live={auto ? "off" : "polite"}
            >
              <p className="font-display text-[1.5rem] leading-[1.1] tracking-[-0.03em] text-balance">
                {passo.titulo}
              </p>
              <p className="mt-2 leading-relaxed text-muted-foreground">{passo.texto}</p>
            </div>
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-[34rem] items-center gap-2 lg:mt-6 lg:max-w-none">
            <button
              type="button"
              onClick={() => ir(ativo - 1)}
              aria-label="Passo anterior"
              className="grid h-12 w-12 place-items-center rounded-full border border-border transition-colors duration-200 hover:bg-foreground/5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(ativo + 1)}
              aria-label="Próximo passo"
              className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border transition-colors duration-200 hover:bg-foreground/5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]"
            >
              <ArrowRight className="seta h-5 w-5" />
              <Fios intensidade="leve" />
            </button>
            {!reduzido && (
              <button
                type="button"
                onClick={() => setAuto((a) => !a)}
                aria-label={auto ? "Pausar a demonstração" : "Continuar a demonstração"}
                aria-pressed={!auto}
                className="grid h-12 w-12 place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]"
              >
                {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            )}
            <div className="ml-auto flex lg:hidden">
              {PASSOS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Passo ${i + 1}: ${p.titulo}`}
                  aria-current={i === ativo ? "step" : undefined}
                  className="cf-ponto text-foreground focus-visible:outline-2 focus-visible:outline-[#0FC9BD]"
                >
                  <i />
                </button>
              ))}
            </div>
            <p className="ml-auto hidden text-sm text-muted-foreground lg:block">
              Use as setas do teclado ou toque num passo.
            </p>
          </div>
        </div>
      </div>
    </Secao>
  );
}
