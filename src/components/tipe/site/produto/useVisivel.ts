/**
 * Visibilidade contínua (entra e sai): para loops que devem pausar fora da tela.
 * Diferente de useInView, que marca só a primeira entrada.
 */
import { useEffect, useRef, useState } from "react";

export function useVisivel<T extends Element>(margem = "0px") {
  const ref = useRef<T>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting), {
      rootMargin: margem,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [margem]);
  return [ref, visivel] as const;
}

/** prefers-reduced-motion, acompanhando a troca da preferência. */
export function useMovimentoReduzido() {
  const [reduz, setReduz] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setReduz(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);
  return reduz;
}
