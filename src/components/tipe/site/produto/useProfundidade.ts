/**
 * Profundidade em camadas para composições sobre foto: liga --mx e --my (cursor,
 * de -1 a 1) no elemento. Só em aparelhos com mouse; com movimento reduzido nada
 * se mexe. Cada camada usa calc(var(--mx) * profundidade) no transform.
 */
import { useEffect, useRef } from "react";
import { reduzMovimento } from "../movimento";

export function useProfundidade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduzMovimento() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let quadro = 0;
    let mx = 0;
    let my = 0;
    const aplicar = () => {
      quadro = 0;
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      my = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      agendar();
    };
    const sair = () => {
      mx = 0;
      my = 0;
      agendar();
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", sair);
    return () => {
      cancelAnimationFrame(quadro);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
    };
  }, []);
  return ref;
}
