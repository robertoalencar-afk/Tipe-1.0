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

/**
 * Título com entrada por linha: cada linha sobe de dentro de uma máscara.
 * O texto continua inteiro para leitores de tela.
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
  return (
    <Tag ref={ref} data-in={inView || undefined} className={cn("line-reveal", className)}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <span
            className="line-reveal-inner block"
            style={{ "--d": `${delay + i * 90}ms` } as CSSProperties}
          >
            {l}
          </span>
        </span>
      ))}
    </Tag>
  );
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
