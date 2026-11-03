/**
 * Cardápio em stories: o cliente toca num prato e o cardápio abre em tela cheia, como um
 * story. Cada categoria é uma sequência; cada prato, um quadro.
 *
 * Gestos:
 * - toque na direita avança, toque na esquerda volta;
 * - segurar pausa;
 * - arrastar para os lados troca de categoria;
 * - arrastar para baixo fecha.
 * Teclado: setas, Espaço (pausa) e Esc (fecha).
 *
 * Quando o prato tem modelo 3D, "Ver em 3D" troca a foto pelo <model-viewer>. Ele é
 * Apache-2.0, servido do próprio site e carregado só nesse momento. O model-viewer abre
 * o AR do aparelho ("Ver na minha mesa") quando o celular tem suporte.
 *
 * Sem foto, o quadro mostra o nome do prato em tipografia, porque nem todo restaurante
 * tem foto de tudo. Com movimento reduzido, nada avança sozinho e a foto não faz zoom.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Box, Minus, Pause, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovimentoReduzido } from "../produto/useVisivel";

export type ItemStory = {
  code: string;
  nome: string;
  desc?: string;
  preco: number;
  cat: string;
  foto?: string;
  modelo?: string;
  selo?: string;
  alergenicos?: string[];
};

const DURACAO = 6000;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

let scriptMv: Promise<void> | null = null;
function carregarModelViewer() {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("model-viewer")) return Promise.resolve();
  scriptMv ??= new Promise<void>((ok, erro) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/vendor/model-viewer/model-viewer.min.js";
    s.onload = () => ok();
    s.onerror = () => {
      scriptMv = null;
      erro(new Error("model-viewer"));
    };
    document.head.appendChild(s);
  });
  return scriptMv;
}

export function StoryCardapio({
  itens,
  categorias,
  inicio,
  restaurante,
  carrinho,
  mudar,
  onFechar,
}: {
  itens: ItemStory[];
  categorias: string[];
  inicio: string;
  restaurante: string;
  carrinho: Record<string, number>;
  mudar: (code: string, d: number) => void;
  onFechar: () => void;
}) {
  const reduzido = useMovimentoReduzido();
  const grupos = categorias
    .map((c) => ({ cat: c, itens: itens.filter((i) => i.cat === c) }))
    .filter((g) => g.itens.length);
  const posInicial = (() => {
    for (let g = 0; g < grupos.length; g++) {
      const k = grupos[g]!.itens.findIndex((i) => i.code === inicio);
      if (k >= 0) return { g, k };
    }
    const g = Math.max(
      0,
      grupos.findIndex((x) => x.cat === inicio),
    );
    return { g, k: 0 };
  })();

  const [pos, setPos] = useState(posInicial);
  const [pausado, setPausado] = useState(false);
  const [em3d, setEm3d] = useState(false);
  const [mv, setMv] = useState<"ocioso" | "carregando" | "pronto" | "erro">("ocioso");
  const [progresso, setProgresso] = useState(0);
  const [arraste, setArraste] = useState({ x: 0, y: 0 });
  const [troca, setTroca] = useState<"" | "esq" | "dir">("");
  const raiz = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number; t: number; segurou: boolean } | null>(null);
  const timerSegurar = useRef<number | undefined>(undefined);

  const grupo = grupos[pos.g]!;
  const item = grupo.itens[pos.k]!;
  const q = carrinho[item.code] ?? 0;
  const parado = pausado || em3d || reduzido;

  const irPara = useCallback((g: number, k: number, lado: "" | "esq" | "dir" = "") => {
    setEm3d(false);
    setProgresso(0);
    setTroca(lado);
    setPos({ g, k });
  }, []);

  const proximo = useCallback(() => {
    if (pos.k < grupo.itens.length - 1) irPara(pos.g, pos.k + 1);
    else if (pos.g < grupos.length - 1) irPara(pos.g + 1, 0, "esq");
    else onFechar();
  }, [pos, grupo.itens.length, grupos.length, irPara, onFechar]);

  const anterior = useCallback(() => {
    if (pos.k > 0) irPara(pos.g, pos.k - 1);
    else if (pos.g > 0) irPara(pos.g - 1, grupos[pos.g - 1]!.itens.length - 1, "dir");
    else setProgresso(0);
  }, [pos, grupos, irPara]);

  const categoria = useCallback(
    (d: 1 | -1) => {
      const g = pos.g + d;
      if (g < 0) return setProgresso(0);
      if (g >= grupos.length) return onFechar();
      irPara(g, 0, d > 0 ? "esq" : "dir");
    },
    [pos.g, grupos.length, irPara, onFechar],
  );

  // Relógio do story: avança o quadro quando a barra enche.
  useEffect(() => {
    if (parado) return;
    let inicio = performance.now() - progresso * DURACAO;
    let raf = 0;
    const passo = (t: number) => {
      const p = (t - inicio) / DURACAO;
      if (p >= 1) {
        inicio = t;
        proximo();
        return;
      }
      setProgresso(p);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
    // progresso entra só como ponto de partida ao retomar.
  }, [parado, pos, proximo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!troca) return;
    const t = setTimeout(() => setTroca(""), 380);
    return () => clearTimeout(t);
  }, [troca, pos]);

  useEffect(() => {
    raiz.current?.focus();
  }, []);

  useEffect(() => {
    if (!em3d || !item.modelo) return;
    setMv((s) => (s === "pronto" ? s : "carregando"));
    carregarModelViewer().then(
      () => setMv("pronto"),
      () => setMv("erro"),
    );
  }, [em3d, item.modelo]);

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "Escape") onFechar();
    else if (e.key === "ArrowRight") proximo();
    else if (e.key === "ArrowLeft") anterior();
    else if (e.key === "ArrowDown") categoria(1);
    else if (e.key === "ArrowUp") categoria(-1);
    else if (e.key === " " && e.target === raiz.current) {
      e.preventDefault();
      setPausado((p) => !p);
    } else return;
  }

  function baixo(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-sem-gesto]")) return;
    toque.current = { x: e.clientX, y: e.clientY, t: Date.now(), segurou: false };
    timerSegurar.current = window.setTimeout(() => {
      if (toque.current) {
        toque.current.segurou = true;
        setPausado(true);
      }
    }, 220);
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const t = toque.current;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(timerSegurar.current);
    setArraste({
      x: Math.abs(dx) > Math.abs(dy) ? dx : 0,
      y: dy > 0 && dy > Math.abs(dx) ? dy : 0,
    });
  }
  function cima(e: PointerEvent<HTMLDivElement>) {
    clearTimeout(timerSegurar.current);
    const t = toque.current;
    toque.current = null;
    setArraste({ x: 0, y: 0 });
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (t.segurou) return setPausado(false);
    if (dy > 90 && dy > Math.abs(dx)) return onFechar();
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) return categoria(dx < 0 ? 1 : -1);
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.32) anterior();
      else proximo();
    }
  }

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-modal="true"
      aria-label={`Cardápio em stories, ${grupo.cat}`}
      tabIndex={-1}
      onKeyDown={teclado}
      className="absolute inset-0 z-30 overflow-hidden bg-[#021E34] text-white outline-none"
      style={{
        transform: arraste.y
          ? `translateY(${arraste.y * 0.6}px) scale(${1 - Math.min(arraste.y, 300) / 1500})`
          : undefined,
        borderRadius: arraste.y ? "1.5rem" : undefined,
        transition: arraste.y ? "none" : "transform 220ms ease-out",
      }}
    >
      {/* Mídia: foto, 3D ou tipografia */}
      <div
        key={`${pos.g}-${pos.k}`}
        className={cn(
          "absolute inset-0",
          !reduzido && troca === "esq" && "story-entra-esq",
          !reduzido && troca === "dir" && "story-entra-dir",
        )}
        style={arraste.x ? { transform: `translateX(${arraste.x * 0.35}px)` } : undefined}
      >
        {em3d && item.modelo ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#0b3a5c,#021E34_70%)]">
            {mv === "pronto" ? (
              <model-viewer
                src={item.modelo}
                alt={`${item.nome} em 3D`}
                camera-controls=""
                auto-rotate=""
                ar=""
                ar-modes="webxr scene-viewer quick-look"
                shadow-intensity="1"
                exposure="1.05"
                camera-orbit="30deg 70deg auto"
                interaction-prompt="none"
                data-sem-gesto=""
                style={{
                  position: "absolute",
                  inset: "4.5rem 0 13rem",
                  width: "100%",
                  height: "auto",
                }}
              >
                <button
                  slot="ar-button"
                  type="button"
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021E34]"
                >
                  Ver na minha mesa
                </button>
              </model-viewer>
            ) : (
              <p
                role="status"
                className="absolute inset-x-0 top-1/3 text-center text-sm text-white/80"
              >
                {mv === "erro"
                  ? "Não deu para abrir o 3D agora. A foto continua aqui."
                  : "Abrindo o prato em 3D…"}
              </p>
            )}
          </div>
        ) : item.foto ? (
          <img
            src={item.foto}
            alt={item.nome}
            draggable={false}
            className={cn(
              "absolute inset-0 h-full w-full select-none object-cover",
              !reduzido && !parado && "story-zoom",
            )}
            style={{ animationDuration: `${DURACAO}ms` }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#0FC9BD_0%,#03665f_35%,#021E34_75%)] px-8">
            <p className="text-center font-display text-4xl leading-[1.05] tracking-[-0.03em]">
              {item.nome}
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
      </div>

      {/* Área de gestos: cobre tudo menos os controles */}
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={baixo}
        onPointerMove={mover}
        onPointerUp={cima}
        onPointerCancel={() => {
          toque.current = null;
          setArraste({ x: 0, y: 0 });
          setPausado(false);
        }}
        aria-hidden
      />

      {/* Barras de progresso e topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3">
        <div className="flex gap-1" aria-hidden>
          {grupo.itens.map((it, k) => (
            <span key={it.code} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className="block h-full rounded-full bg-white"
                style={{
                  width: `${k < pos.k ? 100 : k > pos.k ? 0 : (reduzido ? 1 : progresso) * 100}%`,
                }}
              />
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-[#0FC9BD] to-white p-[2px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-[#021E34] text-[0.65rem] font-bold">
              {grupo.cat.slice(0, 2)}
            </span>
          </span>
          <p className="text-sm font-semibold leading-tight">
            {grupo.cat}
            <span className="block text-[0.68rem] font-normal text-white/75">
              {restaurante} · {pos.k + 1} de {grupo.itens.length}
            </span>
          </p>
          {pausado && <Pause className="ml-1 h-4 w-4 text-white/80" aria-label="Pausado" />}
        </div>
      </div>
      <button
        type="button"
        onClick={onFechar}
        aria-label="Fechar stories"
        className="absolute right-2 top-6 z-10 grid h-11 w-11 place-items-center rounded-full text-white"
      >
        <X className="h-6 w-6" aria-hidden />
      </button>

      {/* Ficha do prato */}
      <div data-sem-gesto="" className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.selo && (
            <span className="rounded-full bg-[#0FC9BD] px-2 py-0.5 text-[0.68rem] font-semibold text-[#021E34]">
              {item.selo}
            </span>
          )}
          {item.modelo && (
            <button
              type="button"
              onClick={() => setEm3d((v) => !v)}
              aria-pressed={em3d}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/40 bg-white/10 px-2.5 text-[0.72rem] font-semibold backdrop-blur"
            >
              <Box className="h-3.5 w-3.5" aria-hidden /> {em3d ? "Ver foto" : "Ver em 3D"}
            </button>
          )}
        </div>
        <p className="mt-2 font-display text-[1.65rem] leading-[1.05] tracking-[-0.03em]">
          {item.nome}
        </p>
        {item.desc && <p className="mt-1 text-sm text-white/85">{item.desc}</p>}
        {item.alergenicos?.length ? (
          <p className="mt-1 text-[0.68rem] text-white/70">
            Contém: {item.alergenicos.join(", ")} (informado pelo restaurante)
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3">
          {q > 0 ? (
            <div className="flex h-12 flex-1 items-center justify-between rounded-full bg-white px-1.5 text-[#021E34]">
              <button
                type="button"
                aria-label={`Menos um ${item.nome}`}
                onClick={() => mudar(item.code, -1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#021E34]/20"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-sm font-semibold tabular-nums">
                {q} no pedido · {brl(item.preco * q)}
              </span>
              <button
                type="button"
                aria-label={`Mais um ${item.nome}`}
                onClick={() => mudar(item.code, 1)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#021E34] text-white"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => mudar(item.code, 1)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#021E34]"
            >
              <Plus className="h-4 w-4" aria-hidden /> Adicionar · {brl(item.preco)}
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[0.65rem] text-white/60">
          Toque para avançar · segure para pausar · arraste ↓ para fechar
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {item.nome}, {brl(item.preco)}. Prato {pos.k + 1} de {grupo.itens.length} em {grupo.cat}.
      </p>
    </div>
  );
}

/** Fileira de "destaques" no topo do cardápio, como os círculos de stories. */
export function AneisCategorias({
  itens,
  categorias,
  abrir,
}: {
  itens: ItemStory[];
  categorias: string[];
  abrir: (cat: string) => void;
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {categorias.map((c) => {
        const capa = itens.find((i) => i.cat === c && i.foto);
        return (
          <button
            key={c}
            type="button"
            onClick={() => abrir(c)}
            aria-label={`Ver ${c} em stories`}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[conic-gradient(from_200deg,#0FC9BD,#021E34,#0FC9BD)] p-[2.5px]">
              <span className="block h-full w-full overflow-hidden rounded-full border-2 border-white bg-[#e6faf8]">
                {capa ? (
                  <img
                    src={capa.foto}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xs font-bold text-[#03665f]">
                    {c.slice(0, 2)}
                  </span>
                )}
              </span>
            </span>
            <span className="text-[0.68rem] font-medium">{c}</span>
          </button>
        );
      })}
    </div>
  );
}
