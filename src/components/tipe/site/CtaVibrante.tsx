/**
 * A seção de conversão mais viva da página: painel turquesa da Tipe com objetos
 * em profundidade (gorjeta, avaliação, moedas, QR Code, confirmação e o celular
 * com o pagamento aprovado) e a lebre espiando. Inspirada na energia do bloco
 * "Join" da sunday, mas com objetos, cores e textos próprios, desenhados em
 * CSS e SVG. Os objetos flutuam, se afastam em camadas conforme a rolagem e
 * seguem levemente o cursor; com movimento reduzido ficam parados.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Check, Heart } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { cn } from "@/lib/utils";
import { Fios } from "./Bigode";
import { Celular } from "./Dispositivo";
import { MascoteVivo } from "./MascoteVivo";
import { reduzMovimento } from "./movimento";
import { Palavras } from "@/components/tipe/landing/motion";

/** Liga --p (rolagem, -1 a 1) e --mx/--my (cursor, -1 a 1) no elemento. */
function useProfundidade() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduzMovimento()) return;
    let quadro = 0;
    let mx = 0;
    let my = 0;
    const medir = () => {
      quadro = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      el.style.setProperty("--p", p.toFixed(3));
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      my = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      agendar();
    };
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    if (window.matchMedia("(hover: hover)").matches) el.addEventListener("pointermove", mover);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      el.removeEventListener("pointermove", mover);
    };
  }, []);
  return ref;
}

/** Um objeto em camada: z é a profundidade (quanto maior, mais perto e mais se move). */
function Camada({
  z,
  className,
  children,
  flutua = 6,
  atraso = 0,
}: {
  z: number;
  className?: string;
  children: ReactNode;
  flutua?: number;
  atraso?: number;
}) {
  return (
    <div className={cn("cta-camada absolute", className)} style={{ "--z": z } as CSSProperties}>
      <div className="cta-flutua" style={{ "--dur": `${flutua}s`, "--atraso": `${atraso}s` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function Estrela({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <defs>
        <radialGradient id="est-luz" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff8dc" />
          <stop offset="45%" stopColor="#ffd45c" />
          <stop offset="100%" stopColor="#e8a317" />
        </radialGradient>
      </defs>
      <path
        d="M50 6c3 0 5 2 6.4 5l9.2 18.6 20.5 3c3.3.5 5.5 2 6.2 4.6.8 2.6-.2 5-2.6 7.4L74.9 59.1l3.5 20.4c.6 3.3-.3 5.8-2.5 7.3-2.2 1.6-4.9 1.5-7.8 0L50 77.2 31.7 86.8c-2.9 1.5-5.6 1.6-7.8 0-2.2-1.5-3.1-4-2.5-7.3l3.5-20.4L10.1 44.6c-2.4-2.4-3.4-4.8-2.6-7.4.7-2.6 2.9-4.1 6.2-4.6l20.5-3L43.6 11c1.4-3 3.4-5 6.4-5Z"
        fill="url(#est-luz)"
      />
      <ellipse cx="38" cy="30" rx="10" ry="5" fill="#fff" opacity="0.55" transform="rotate(-25 38 30)" />
    </svg>
  );
}

function QrTile() {
  const c = [
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 1, 1, 0, 0, 1, 0, 1],
    [0, 1, 0, 0, 1, 1, 0, 1, 0],
    [1, 1, 1, 0, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0],
    [1, 1, 1, 0, 1, 1, 1, 0, 1],
  ];
  return (
    <div className="cta-objeto grid h-full w-full grid-cols-9 gap-[6%] rounded-[22%] bg-[linear-gradient(150deg,#0b3655,#021E34_60%)] p-[16%]">
      {c.flat().map((v, i) => (
        <span key={i} className={cn("rounded-[30%]", v ? "bg-white" : "bg-transparent")} />
      ))}
    </div>
  );
}

export function CtaVibrante() {
  const ref = useProfundidade();
  return (
    <section data-tema="claro" className="px-4 py-16 sm:px-6 sm:py-24" aria-label="Comece com a Tipe">
      <div
        ref={ref}
        className="cta-palco relative mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-[#0FC9BD] text-[#021E34] lg:grid-cols-[1fr_1.05fr] lg:rounded-[2.75rem]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_30%,rgb(255_255_255/0.45),transparent_60%),radial-gradient(60%_60%_at_10%_110%,rgb(2_30_52/0.22),transparent_70%)]"
        />
        <div className="relative z-10 px-7 pb-4 pt-12 sm:px-14 sm:pt-16 lg:py-24">
          <p className="font-display text-[1.15rem] tracking-[-0.02em] text-[#021E34]/80">Comece com a Tipe</p>
          <Palavras
            as="h2"
            className="mt-3 block max-w-[13ch] font-display text-[clamp(2.6rem,1.4rem+4.6vw,5.4rem)] font-normal leading-[0.95] tracking-[-0.05em]"
          >
            Cada mesa paga sozinha. Você só serve.
          </Palavras>
          <p className="mt-5 max-w-md text-lg text-[#021E34]/80">
            {TRIAL_DAYS} dias grátis para os primeiros restaurantes, sem cartão de crédito e sem tarifa da Tipe por
            transação.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/teste-gratis"
              className="com-fios inline-flex min-h-14 items-center gap-2 rounded-full bg-[#021E34] px-8 text-lg font-medium text-white transition-colors hover:bg-[#062b47]"
              style={{ "--fio": "#021E34" } as CSSProperties}
            >
              Começar o teste grátis <ArrowRight className="seta h-5 w-5" />
              <Fios intensidade="forte" />
            </a>
            <a href="/simulador" className="inline-flex min-h-14 items-center px-4 text-lg font-medium underline-offset-4 hover:underline">
              Testar o simulador
            </a>
          </div>
        </div>

        {/* Objetos em profundidade */}
        <div aria-hidden className="relative h-[24rem] sm:h-[30rem] lg:h-auto lg:min-h-[36rem]">
          <Camada z={0.6} className="left-[30%] top-[6%] w-[38%] max-w-[13rem] lg:left-[34%] lg:top-[10%]" flutua={7}>
            <div className="-rotate-[9deg] [transform:perspective(900px)_rotateY(-14deg)_rotate(-9deg)]">
              <Celular tela="confirmado" alt="" sizes="210px" />
            </div>
          </Camada>

          <Camada z={1.2} className="left-[4%] top-[14%] lg:left-[4%] lg:top-[16%]" flutua={5.5} atraso={-1.2}>
            <div className="cta-vidro flex -rotate-[7deg] items-center gap-3 rounded-full py-2.5 pl-2.5 pr-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#021E34] text-sm font-medium text-white">JL</span>
              <span>
                <span className="block text-[0.72rem] leading-none text-[#021E34]/60">Gorjeta para Joyce</span>
                <span className="money text-[1.35rem] font-medium leading-tight">+ R$ 8,00</span>
              </span>
              <Heart className="h-5 w-5 fill-[#ff6b6b] text-[#ff6b6b]" />
            </div>
          </Camada>

          <Camada z={1.5} className="bottom-[22%] right-[3%] lg:bottom-[26%] lg:right-[4%]" flutua={6.5} atraso={-2.6}>
            <div className="cta-vidro flex rotate-[6deg] items-center gap-2 rounded-full px-4 py-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Estrela key={i} className="h-5 w-5" />
              ))}
              <span className="ml-1 text-sm font-medium text-[#021E34]/70">Mesa 12</span>
            </div>
          </Camada>

          <Camada z={0.9} className="right-[8%] top-[8%] w-[17%] max-w-[6.5rem]" flutua={8} atraso={-3}>
            <div className="aspect-square rotate-[14deg] [transform:perspective(600px)_rotateX(18deg)_rotateY(-20deg)_rotate(14deg)]">
              <QrTile />
            </div>
          </Camada>

          <Camada z={1.8} className="bottom-[8%] left-[8%] w-[14%] max-w-[5.5rem]" flutua={4.8} atraso={-0.8}>
            <div className="cta-check grid aspect-square place-items-center rounded-full text-white">
              <Check className="h-[46%] w-[46%]" strokeWidth={3.2} />
            </div>
          </Camada>

          <Camada z={2.2} className="left-[22%] top-[60%] w-[11%] max-w-[4.5rem]" flutua={5} atraso={-1.7}>
            <div className="palco-moeda aspect-square rounded-full [transform:perspective(500px)_rotateX(52deg)_rotate(-18deg)]" />
          </Camada>
          <Camada z={0.4} className="right-[30%] top-[4%] w-[7%] max-w-[3rem]" flutua={6} atraso={-4}>
            <div className="palco-moeda aspect-square rounded-full opacity-90 [transform:perspective(500px)_rotateX(60deg)_rotate(24deg)]" />
          </Camada>
          <Camada z={1.4} className="right-[24%] top-[52%] w-[9%] max-w-[3.75rem]" flutua={5.8} atraso={-2.2}>
            <Estrela className="h-auto w-full rotate-[18deg] drop-shadow-[0_18px_20px_rgb(2_30_52/0.35)]" />
          </Camada>

          <Camada z={0.8} className="-bottom-[14%] right-[30%] w-[30%] max-w-[11rem] lg:-bottom-[10%]" flutua={9}>
            <MascoteVivo />
          </Camada>
        </div>
      </div>
    </section>
  );
}
