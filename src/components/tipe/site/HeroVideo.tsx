/**
 * Abertura da home com vídeo de fundo em tela cheia (no estilo da OpenTable): o vídeo ocupa a
 * largura toda, com o título e os botões por cima, sobre um degradê escuro para o texto ler bem.
 *
 * COMO TROCAR PELO VÍDEO FINAL: coloque os arquivos em src/assets/video/ com estes nomes e
 * publique. A home passa a usar este topo sozinha; sem eles, continua a abertura atual.
 *   hero.mp4            obrigatório · 16:9, H.264, mudo, em loop (hoje ~37 s, ~13 MB)
 *   hero.webm           opcional · a mesma cena em VP9, mais leve no Chrome/Android
 *   hero-vertical.mp4   opcional · 9:16 ou 4:5 para o celular (sem ele, o 16:9 é recortado)
 *   hero-poster.webp    recomendado · o primeiro quadro, mostrado enquanto o vídeo carrega
 *
 * Para ver o layout antes do vídeo final: abra a home com ?hero=video (usa um vídeo provisório).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { Palavras } from "@/components/tipe/landing/motion";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { BotaoPrincipal, BotaoSecundario } from "./Site";
import { tocarMudo } from "./videoAuto";

const ARQ = import.meta.glob("/src/assets/video/hero*.{mp4,webm,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const PROVISORIO = import.meta.glob(
  [
    "/src/assets/video/lebre-tartaruga-16x9.mp4",
    "/src/assets/video/lebre-tartaruga-4x5.mp4",
    "/src/assets/video/poster-16x9.webp",
  ],
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

type Fontes = {
  mp4: string;
  webm?: string | undefined;
  vertical?: string | undefined;
  poster?: string | undefined;
};

const FINAL: Fontes | null = ARQ["/src/assets/video/hero.mp4"]
  ? {
      mp4: ARQ["/src/assets/video/hero.mp4"]!,
      webm: ARQ["/src/assets/video/hero.webm"],
      vertical: ARQ["/src/assets/video/hero-vertical.mp4"],
      poster: ARQ["/src/assets/video/hero-poster.webp"],
    }
  : null;

/** Há vídeo final na pasta? (decidido no build, igual no servidor e no navegador) */
export const TEM_VIDEO_HERO = FINAL !== null;

/** Pré-visualização com ?hero=video, só no navegador. */
export function usePreviaHeroVideo() {
  const [previa, setPrevia] = useState(false);
  useEffect(() => {
    setPrevia(new URLSearchParams(window.location.search).get("hero") === "video");
  }, []);
  return previa;
}

export function HeroVideo() {
  const fontes: Fontes = FINAL ?? {
    mp4: PROVISORIO["/src/assets/video/lebre-tartaruga-16x9.mp4"]!,
    vertical: PROVISORIO["/src/assets/video/lebre-tartaruga-4x5.mp4"],
    poster: PROVISORIO["/src/assets/video/poster-16x9.webp"],
  };
  const ref = useRef<HTMLVideoElement>(null);
  const [pausado, setPausado] = useState(false);
  const pausadoPelaPessoa = useRef(false);
  const [celular, setCelular] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const ver = () => setCelular(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      setPausado(true);
      return;
    }
    tocarMudo(v, () => !pausadoPelaPessoa.current);
    // Volta de outra aba ou app (o celular pausa o vídeo): retoma sozinho.
    const voltar = () => {
      if (document.visibilityState === "visible" && !pausadoPelaPessoa.current)
        tocarMudo(v, () => !pausadoPelaPessoa.current);
    };
    document.addEventListener("visibilitychange", voltar);
    window.addEventListener("pageshow", voltar);
    return () => {
      document.removeEventListener("visibilitychange", voltar);
      window.removeEventListener("pageshow", voltar);
    };
  }, [celular]);

  const alternar = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      pausadoPelaPessoa.current = false;
      tocarMudo(v);
      setPausado(false);
    } else {
      pausadoPelaPessoa.current = true;
      v.pause();
      setPausado(true);
    }
  };

  const src = celular && fontes.vertical ? fontes.vertical : fontes.mp4;

  return (
    <section
      data-tema="escuro"
      className="relative -mt-16 flex min-h-[100svh] items-end overflow-hidden bg-[#021E34] pt-16 text-white lg:min-h-[100svh]"
    >
      <video
        key={src}
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        poster={fontes.poster}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        aria-hidden
      >
        {!celular && fontes.webm && <source src={fontes.webm} type="video/webm" />}
        <source src={src} type="video/mp4" />
      </video>
      {/* No celular o texto ocupa a tela toda: um véu leve por cima do vídeo inteiro. */}
      <div aria-hidden className="absolute inset-0 bg-[#021E34]/40 md:hidden" />
      {/* Degradê só onde o texto fica: embaixo e à esquerda. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgb(2_30_52/0.88)_0%,rgb(2_30_52/0.45)_42%,rgb(2_30_52/0)_70%),linear-gradient(to_right,rgb(2_30_52/0.55)_0%,rgb(2_30_52/0)_60%)]"
      />
      <div className="container-page relative w-full pb-14 sm:pb-20 lg:pb-24">
        <Palavras
          as="p"
          imediato
          className="block font-display text-[clamp(1.05rem,0.95rem+0.45vw,1.35rem)] tracking-[-0.02em] text-[#0FC9BD]"
        >
          Tipe Pay · pagamento na mesa para restaurantes
        </Palavras>
        <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(3rem,1.2rem+5.6vw,6.25rem)] font-normal leading-[0.94] tracking-[-0.055em]">
          <Palavras imediato delay={200}>
            Pague.
          </Palavras>{" "}
          <span className="whitespace-nowrap">
            <Palavras imediato delay={340}>
              Sem esperar.
            </Palavras>
          </span>
        </h1>
        <p
          className="hero-in mt-5 max-w-xl text-[1.05rem] leading-relaxed text-white/85 text-pretty sm:text-lg"
          style={{ "--d": "480ms" } as CSSProperties}
        >
          Seu cliente confere a conta, divide e paga pelo celular. Sua equipe ganha tempo para atender, e você acompanha cada mesa em tempo real.
        </p>
        <div
          className="hero-in mt-8 flex flex-wrap gap-3"
          style={{ "--d": "620ms" } as CSSProperties}
        >
          <BotaoPrincipal vivo>Solicitar demonstração</BotaoPrincipal>
          <BotaoSecundario href="/simulador" className="border-white/40">
            Testar o simulador
          </BotaoSecundario>
        </div>
        <p
          className="hero-in mt-5 text-sm text-white/75"
          style={{ "--d": "720ms" } as CSSProperties}
        >
          Pré-lançamento: {TRIAL_DAYS} dias grátis para restaurantes · Sem taxa para o cliente
        </p>
      </div>
      <button
        type="button"
        onClick={alternar}
        aria-label={pausado ? "Tocar o vídeo" : "Pausar o vídeo"}
        className="absolute right-4 top-20 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/25 sm:right-8 sm:top-24"
      >
        {pausado ? (
          <Play className="h-4 w-4" aria-hidden />
        ) : (
          <Pause className="h-4 w-4" aria-hidden />
        )}
      </button>
    </section>
  );
}
