/**
 * Números que andam: transição curta quando o valor muda (calculadora) e
 * contagem ao entrar na tela (indicadores). Com movimento reduzido, o número
 * aparece direto no valor final.
 */
import { useEffect, useRef, useState } from "react";
import { reduzMovimento } from "../movimento";

const expoOut = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

/** Valor que desliza até o alvo sempre que ele muda. */
export function useNumeroAnimado(alvo: number, ms = 420) {
  const [valor, setValor] = useState(alvo);
  const atual = useRef(alvo);
  useEffect(() => {
    if (!Number.isFinite(alvo) || reduzMovimento()) {
      atual.current = alvo;
      setValor(alvo);
      return;
    }
    const de = atual.current;
    if (de === alvo) return;
    const t0 = performance.now();
    let quadro = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const x = de + (alvo - de) * expoOut(p);
      atual.current = x;
      setValor(x);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, ms]);
  return valor;
}

/** Texto de um número animado, formatado por `formatar`. */
export function NumeroAnimado({
  valor,
  formatar,
  className,
}: {
  valor: number;
  formatar: (n: number) => string;
  className?: string;
}) {
  const v = useNumeroAnimado(valor);
  return <span className={className}>{formatar(v)}</span>;
}

/**
 * Conta de 0 até o alvo quando entra na tela. No servidor e sem JavaScript o
 * valor final já está no HTML; a contagem só começa depois de montar.
 */
export function useContagem(alvo: number, ms = 1600) {
  const ref = useRef<HTMLElement>(null);
  const [valor, setValor] = useState(alvo);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduzMovimento() || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    // Já visível ao montar: não pisca para zero.
    if (r.top < window.innerHeight && r.bottom > 0) return;
    setValor(0);
    let quadro = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const passo = (t: number) => {
          const p = Math.min(1, (t - t0) / ms);
          setValor(alvo * expoOut(p));
          if (p < 1) quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [alvo, ms]);
  return [ref, valor] as const;
}
