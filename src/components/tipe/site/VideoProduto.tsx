/**
 * O filme do fluxo do cliente (13 s, sem som, em loop, 4:5): QR no totem da mesa 12,
 * conta, divisão em 3 (R$ 118,79 cada), Pix, Apple Pay ou Google Pay, pagamento
 * realizado e, depois, a gorjeta extra opcional para a Joyce (Joyce recebeu R$ 4,20).
 * Feito em casa: HTML animado renderizado quadro a quadro com Playwright e codificado
 * com ffmpeg (fonte e script em docs/landing-v5/video-produto/).
 *
 * O pôster ocupa o espaço desde o início (sem layout shift). O vídeo só é baixado quando
 * o card chega perto da tela e só toca enquanto está visível. Com movimento reduzido
 * fica o pôster parado; a pessoa pode tocar pelo botão se quiser.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import mp4 from "@/assets/video/produto-fluxo.mp4";
import webm from "@/assets/video/produto-fluxo.webm";
import poster from "@/assets/video/produto-fluxo-poster.webp";
import { reduzMovimento } from "./movimento";
import { tocarMudo } from "./videoAuto";

const W = 1080;
const H = 1350;

export function VideoProduto({ className }: { className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [carregar, setCarregar] = useState(false);
  const [tocando, setTocando] = useState(false);
  const pausadoPelaPessoa = useRef(false);
  const visivel = useRef(false);

  // 1) só monta as fontes do vídeo quando o card se aproxima da tela
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    if (reduzMovimento()) {
      // movimento reduzido: nada é baixado até a pessoa tocar no botão
      pausadoPelaPessoa.current = true;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setCarregar(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 2) toca só enquanto está visível (e se a pessoa não pausou)
  useEffect(() => {
    const v = video.current;
    if (!carregar || !v) return;
    v.load();
    const io = new IntersectionObserver(
      ([e]) => {
        visivel.current = !!e?.isIntersecting;
        if (visivel.current && !pausadoPelaPessoa.current)
          tocarMudo(v, () => visivel.current && !pausadoPelaPessoa.current);
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [carregar]);

  const alternar = () => {
    const v = video.current;
    if (!carregar) {
      pausadoPelaPessoa.current = false;
      setCarregar(true);
      return;
    }
    if (!v) return;
    if (v.paused) {
      pausadoPelaPessoa.current = false;
      v.play().catch(() => undefined);
    } else {
      pausadoPelaPessoa.current = true;
      v.pause();
    }
  };

  return (
    <div
      ref={caixa}
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-[#0FC9BD] sm:rounded-[2.25rem]",
        className,
      )}
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        width={W}
        height={H}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        aria-label="Filme curto do pagamento na mesa com a Tipe: o cliente lê o QR do totem da mesa 12, vê a conta, divide entre 3 pessoas (R$ 118,79 cada), paga com Pix, Apple Pay ou Google Pay e recebe a confirmação. Depois, pode dar uma gorjeta extra opcional para a garçonete Joyce, que recebe R$ 4,20."
        className="absolute inset-0 block h-full w-full object-cover"
      >
        {carregar && (
          <>
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </>
        )}
      </video>
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar o filme" : "Tocar o filme"}
        className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/85 text-[#021E34] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)] backdrop-blur transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#021E34]"
      >
        {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
    </div>
  );
}
