/**
 * O simulador de verdade (/simulador), rodando dentro de um celular na landing.
 * É o mesmo fluxo do cliente, com a Mesa 12 fictícia guardada só no navegador.
 * O iframe só carrega quando o celular está perto de entrar na tela, para não
 * pesar no carregamento inicial; até lá aparece a tela de abertura estática.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const W = 390;
const H = 844;

export function LiveSimulator({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.76);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative mx-auto w-full max-w-[320px]", className)}>
      <div className="rounded-[3.1rem] bg-[oklch(0.16_0_0)] p-[11px] shadow-[0_50px_100px_-40px_oklch(0.2_0.04_250/0.55),inset_0_0_0_1.5px_oklch(0.32_0_0)]">
        <div
          ref={box}
          className="relative overflow-hidden rounded-[2.45rem] bg-ink"
          style={{ aspectRatio: `${W} / ${H}` }}
        >
          {load && (
            <iframe
              src="/simulador"
              title="Simulador da Tipe: a conta da Mesa 12 no celular"
              loading="lazy"
              onLoad={() => setReady(true)}
              className="absolute left-0 top-0 origin-top-left border-0"
              style={{ width: W, height: H, transform: `scale(${scale})` }}
            />
          )}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 grid place-items-center bg-ink text-sm font-medium text-white/60 transition-opacity duration-500",
              ready && "opacity-0",
            )}
          >
            Abrindo a Mesa 12…
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-2.5 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
    </div>
  );
}
