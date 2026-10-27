/**
 * Motion da landing: entradas no scroll e progresso de seções "sticky".
 * Só anima transform e opacity, respeita prefers-reduced-motion e nunca
 * intercepta o scroll nativo (sem smooth scroll artificial).
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Marca o elemento como visível uma única vez, quando entra na tela. */
export function useInView<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || reduced()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}

/** Bloco que sobe e aparece ao entrar na tela. `delay` em ms. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: "up" | "fade" | "scale";
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-in={inView || undefined}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** Separa um texto em palavras animáveis; os espaços ficam fora dos spans. */
function quebrar(node: ReactNode, inicio: number, passo: number, base: number) {
  if (typeof node !== "string") {
    return {
      itens: [
        <span
          key={inicio}
          className="palavra"
          style={{ "--d": `${base + inicio * passo}ms` } as CSSProperties}
        >
          {node}
        </span>,
      ],
      fim: inicio + 1,
    };
  }
  const partes = node.split(/(\s+)/).filter(Boolean);
  let i = inicio;
  const itens = partes.map((parte, k) =>
    /^\s+$/.test(parte) ? (
      parte
    ) : (
      <span
        key={`${inicio}-${k}`}
        className="palavra"
        style={{ "--d": `${base + i++ * passo}ms` } as CSSProperties}
      >
        {parte}
      </span>
    ),
  );
  return { itens, fim: i };
}

/**
 * Texto que aparece palavra por palavra (sobe 15% da altura e ganha opacidade,
 * 1,5 s em expo-out). Medido na sunday: 140 ms entre palavras nos títulos.
 * `imediato` anima ao carregar (hero); senão, quando entra na tela.
 */
export function Palavras({
  children,
  className,
  as: Tag = "span",
  delay = 0,
  passo = 140,
  imediato = false,
  style,
}: {
  children: string;
  className?: string;
  as?: ElementType;
  delay?: number;
  passo?: number;
  imediato?: boolean;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLElement>("0px 0px -8% 0px");
  const { itens } = quebrar(children, 0, passo, delay);
  return (
    <Tag
      ref={ref}
      data-palavras=""
      data-in={imediato || inView || undefined}
      className={className}
      style={style}
    >
      {itens}
    </Tag>
  );
}

/**
 * Título com entrada palavra por palavra, linha a linha. A contagem continua
 * entre as linhas, como um texto só. O texto fica inteiro para leitores de tela.
 */
export function LineReveal({
  lines,
  className,
  as: Tag = "h2",
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  as?: ElementType;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLElement>("0px 0px -8% 0px");
  let n = 0;
  return (
    <Tag
      ref={ref}
      data-palavras=""
      data-in={inView || undefined}
      className={cn("line-reveal", className)}
    >
      {lines.map((l, i) => {
        const { itens, fim } = quebrar(l, n, 140, delay);
        n = fim;
        return (
          <span key={i} className="block">
            {itens}
          </span>
        );
      })}
    </Tag>
  );
}

/**
 * Cabeçalho que some ao rolar para baixo depois de 300 px (como na sunday) e
 * volta ao rolar para cima. Devolve se está escondido.
 */
export function useHeaderEscondido(limite = 300) {
  const [escondido, setEscondido] = useState(false);
  useEffect(() => {
    let ultimo = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (Math.abs(y - ultimo) < 6) return;
      setEscondido(y > limite && y > ultimo);
      ultimo = y;
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(frame);
    };
  }, [limite]);
  return escondido;
}

/** Faixa infinita em velocidade constante (px/s), medida na sunday: 50 px/s. */
export function useVelocidadeFaixa<T extends HTMLElement>(pxPorSegundo = 50) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      const metade = el.scrollWidth / 2;
      if (metade > 0) el.style.animationDuration = `${(metade / pxPorSegundo).toFixed(1)}s`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pxPorSegundo]);
  return ref;
}

/**
 * Progresso (0 a 1) de uma seção alta enquanto ela atravessa a tela.
 * Um único listener passivo + requestAnimationFrame; escreve `--p` no elemento
 * para o CSS e devolve o índice da cena atual para o React.
 */
export function useScrollScenes<T extends HTMLElement>(scenes: number) {
  const ref = useRef<T>(null);
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      setScene(Math.min(scenes - 1, Math.floor(p * scenes * 0.9999)));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, [scenes]);
  return [ref, scene] as const;
}

/** Leve parallax vertical (em px) só enquanto o elemento está na tela; desligado no mobile e com movimento reduzido. */
export function useParallax<T extends HTMLElement>(strength = 40) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || window.matchMedia("(max-width: 767px)").matches) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const center = (r.top + r.height / 2) / window.innerHeight - 0.5;
      el.style.transform = `translate3d(0, ${(-center * strength).toFixed(1)}px, 0)`;
    };
    const on = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) on();
    });
    io.observe(el);
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(frame);
    };
  }, [strength]);
  return ref;
}
