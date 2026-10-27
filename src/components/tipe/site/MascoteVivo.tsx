/**
 * A lebre com vida: o rosto oficial do mascote separado em camadas (orelhas,
 * cabeça e nariz) para piscar, mexer as orelhas, farejar e olhar para o cursor.
 * Tudo roda pela Web Animations API, fora do ciclo do React, em intervalos
 * irregulares para não parecer um loop. Com movimento reduzido, fica parada.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { EASE, reduzMovimento } from "./movimento";
import cabeca from "@/assets/lebre/vivo/cabeca.webp";
import piscando from "@/assets/lebre/vivo/cabeca-piscando.webp";
import orelhaEsq from "@/assets/lebre/vivo/orelha-esq.webp";
import orelhaDir from "@/assets/lebre/vivo/orelha-dir.webp";
import nariz from "@/assets/lebre/vivo/nariz.webp";

const CAMADA = "pointer-events-none absolute inset-0 h-full w-full select-none";

function sorteio(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function MascoteVivo({
  className,
  alt = "",
  olhaCursor = true,
}: {
  className?: string;
  alt?: string;
  olhaCursor?: boolean;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const rosto = useRef<HTMLDivElement>(null);
  const olhosFechados = useRef<HTMLImageElement>(null);
  const esq = useRef<HTMLImageElement>(null);
  const dir = useRef<HTMLImageElement>(null);
  const focinho = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (reduzMovimento()) return;
    const timers: number[] = [];
    let vivo = true;
    let visivel = false;
    const depois = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => vivo && fn(), ms));
    };

    const piscar = () => {
      olhosFechados.current?.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }],
        { duration: 260, easing: "ease-in-out" },
      );
    };
    const orelhas = (forte = false) => {
      const a = forte ? 9 : 5;
      esq.current?.animate(
        [{ rotate: "0deg" }, { rotate: `${-a}deg` }, { rotate: `${a * 0.4}deg` }, { rotate: "0deg" }],
        { duration: 900, easing: EASE },
      );
      dir.current?.animate(
        [{ rotate: "0deg" }, { rotate: `${a * 0.7}deg` }, { rotate: `${-a * 0.3}deg` }, { rotate: "0deg" }],
        { duration: 1000, delay: 70, easing: EASE },
      );
    };
    const farejar = () => {
      focinho.current?.animate(
        [
          { transform: "none" },
          { transform: "translateY(0.4%) scale(0.92, 0.85)" },
          { transform: "scale(1.06)" },
          { transform: "translateY(0.3%) scale(0.94, 0.88)" },
          { transform: "none" },
        ],
        { duration: 620, easing: "ease-in-out" },
      );
    };

    const ciclo = () => {
      if (!visivel) return depois(1200, ciclo);
      const r = Math.random();
      piscar();
      if (r < 0.25) depois(300, piscar);
      if (r > 0.55) depois(sorteio(400, 900), () => orelhas(r > 0.85));
      if (r > 0.3) depois(sorteio(150, 600), farejar);
      depois(sorteio(2600, 5200), ciclo);
    };
    depois(1400, ciclo);

    const io = new IntersectionObserver(([e]) => {
      visivel = !!e?.isIntersecting;
    });
    if (raiz.current) io.observe(raiz.current);

    // Olha para o cursor (só em telas com mouse).
    let quadro = 0;
    let px = 0;
    let py = 0;
    const aplicar = () => {
      quadro = 0;
      const el = rosto.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / 700));
      const dy = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / 700));
      el.style.transform = `translate3d(${dx * 2.5}%, ${dy * 1.5}%, 0) rotate(${dx * 4}deg)`;
    };
    const mover = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    const comMouse = olhaCursor && window.matchMedia("(hover: hover)").matches;
    if (comMouse) window.addEventListener("pointermove", mover, { passive: true });

    const curiosa = () => {
      orelhas(true);
      farejar();
    };
    const el = raiz.current;
    el?.addEventListener("pointerenter", curiosa);

    return () => {
      vivo = false;
      timers.forEach(clearTimeout);
      io.disconnect();
      cancelAnimationFrame(quadro);
      if (comMouse) window.removeEventListener("pointermove", mover);
      el?.removeEventListener("pointerenter", curiosa);
    };
  }, [olhaCursor]);

  return (
    <div
      ref={raiz}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn("relative aspect-square", className)}
    >
      <div ref={rosto} className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
        <img ref={esq} src={orelhaEsq} alt="" className={CAMADA} style={{ transformOrigin: "42% 64%" }} width={512} height={512} />
        <img ref={dir} src={orelhaDir} alt="" className={CAMADA} style={{ transformOrigin: "58.5% 64%" }} width={512} height={512} />
        <img src={cabeca} alt="" className={CAMADA} width={512} height={512} />
        <img ref={olhosFechados} src={piscando} alt="" className={cn(CAMADA, "opacity-0")} width={512} height={512} />
        <img ref={focinho} src={nariz} alt="" className={CAMADA} style={{ transformOrigin: "49.5% 78.5%" }} width={512} height={512} />
      </div>
    </div>
  );
}
