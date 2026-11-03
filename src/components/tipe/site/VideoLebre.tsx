/**
 * O filme curto da lebre e da tartaruga (18 s, sem som, em loop). V6.1: composição
 * HyperFrames com os personagens articulados (cabeça, orelhas, braços e pálpebras
 * recortados da ilustração, cada um girando no seu pivô; relógio em time-lapse e as três
 * lebres comemorando no fim), renderizada a 60 quadros/s e
 * juntada em 30 com desfoque de movimento (fonte em docs/landing-v7/video-lebre/). No computador usa a versão
 * 16:9 e no celular a 4:5. Só toca quando está na tela; com movimento reduzido
 * fica o pôster e a pessoa decide se quer ver.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import mp4Largo from "@/assets/video/lebre-tartaruga-16x9.mp4";
import webmLargo from "@/assets/video/lebre-tartaruga-16x9.webm";
import posterLargo from "@/assets/video/poster-16x9.webp";
import mp4Alto from "@/assets/video/lebre-tartaruga-4x5.mp4";
import webmAlto from "@/assets/video/lebre-tartaruga-4x5.webm";
import posterAlto from "@/assets/video/poster-4x5.webp";
import { reduzMovimento } from "./movimento";

const FORMATOS = {
  largo: { mp4: mp4Largo, webm: webmLargo, poster: posterLargo, w: 1600, h: 900 },
  alto: { mp4: mp4Alto, webm: webmAlto, poster: posterAlto, w: 864, h: 1080 },
} as const;

export function VideoLebre({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [formato, setFormato] = useState<keyof typeof FORMATOS>("largo");
  const [tocando, setTocando] = useState(false);
  const pausadoPelaPessoa = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const aplicar = () => setFormato(mq.matches ? "alto" : "largo");
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.load();
    if (reduzMovimento()) {
      pausadoPelaPessoa.current = true;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !pausadoPelaPessoa.current) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [formato]);

  const alternar = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      pausadoPelaPessoa.current = false;
      v.play().catch(() => undefined);
    } else {
      pausadoPelaPessoa.current = true;
      v.pause();
    }
  };

  const f = FORMATOS[formato];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-[#e9ecef] sm:rounded-[2.25rem]",
        className,
      )}
    >
      <video
        ref={video}
        key={formato}
        muted
        loop
        playsInline
        preload="none"
        poster={f.poster}
        width={f.w}
        height={f.h}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        aria-label="Filme curto: a tartaruga pede a conta e espera a maquininha, que estava em outra mesa; a lebre escaneia a mesa, paga pelo celular com a Tipe e divide com os amigos. Moral da história: quem não espera, ganha."
        className="block h-auto w-full"
      >
        <source src={f.webm} type="video/webm" />
        <source src={f.mp4} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar o filme" : "Tocar o filme"}
        className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/85 text-[#021E34] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)] backdrop-blur transition-transform duration-300 hover:scale-105"
      >
        {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
    </div>
  );
}
