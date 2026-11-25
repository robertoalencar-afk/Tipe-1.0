/**
 * O simulador de verdade (/simulador), rodando dentro de um celular na landing.
 * É o mesmo fluxo do cliente, com a Mesa 12 fictícia guardada só no navegador.
 * O iframe só carrega quando o celular está perto de entrar na tela, para não
 * pesar no carregamento inicial; até lá aparece a tela de abertura estática.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BarraStatusIOS } from "@/components/tipe/BarraStatusIOS";

const W = 390;
const H = 844;
/** Faixa da barra de status do iPhone (pontos), acima do app. */
const BARRA = 48;

/** Cor clara (texto escuro por cima)? Pinta 1 px num canvas para aceitar qualquer cor CSS (oklch etc.). */
let pincel: CanvasRenderingContext2D | null | undefined;
function claro(cor: string) {
  if (pincel === undefined) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    pincel = c.getContext("2d", { willReadFrequently: true });
  }
  if (!pincel) return true;
  pincel.clearRect(0, 0, 1, 1);
  pincel.fillStyle = "#fff";
  pincel.fillStyle = cor;
  pincel.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = pincel.getImageData(0, 0, 1, 1).data;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function LiveSimulator({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.76);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  // A barra de status pega a cor do topo da tela atual do simulador (mesma origem), como no iPhone.
  const [topo, setTopo] = useState({ cor: "#021E34", clara: false });
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc) return;
      let el: Element | null = doc.elementFromPoint(W / 2, 2);
      while (el) {
        const c = doc.defaultView?.getComputedStyle(el).backgroundColor;
        if (c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c)) {
          setTopo((t) => (t.cor === c ? t : { cor: c, clara: claro(c) }));
          return;
        }
        el = el.parentElement;
      }
      setTopo((t) => (t.cor === "#ffffff" ? t : { cor: "#ffffff", clara: true }));
    }, 400);
    return () => clearInterval(t);
  }, [ready]);

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
              ref={frame}
              src="/simulador"
              title="Simulador da Tipe: a conta da Mesa 12 no celular"
              loading="lazy"
              onLoad={() => setReady(true)}
              className="absolute left-0 origin-top-left border-0"
              style={{
                top: BARRA * scale,
                width: W,
                height: H - BARRA,
                transform: `scale(${scale})`,
              }}
            />
          )}
          <BarraStatusIOS
            fundo={topo.cor}
            tom={topo.clara ? "escuro" : "claro"}
            className="absolute inset-x-0 top-0 z-10"
            style={{ fontSize: 16.5 * scale, height: BARRA * scale }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black"
            style={{ top: 11 * scale, width: 124 * scale, height: 36 * scale }}
          />
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
