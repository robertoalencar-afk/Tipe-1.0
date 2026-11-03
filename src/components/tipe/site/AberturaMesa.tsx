/**
 * Abertura da home (proposta E, "A mesa e o celular"): pessoas numa mesa e, saindo da cena,
 * um celular com as telas reais do app do cliente, na ordem real do fluxo. A conta é paga
 * primeiro; a gorjeta extra vem depois, como segundo pagamento. Os avisos trocam
 * junto com a tela, e as camadas seguem o cursor no desktop.
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Check, Heart, Star, Divide } from "lucide-react";
import { Palavras } from "@/components/tipe/landing/motion";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { cn } from "@/lib/utils";
import { CelularReal, useSequencia, type EtapaCelular } from "./CelularReal";
import { Foto } from "./Foto";
import { BotaoPrincipal, BotaoSecundario } from "./Site";
import "./abertura.css";

type Etapa = EtapaCelular & {
  aviso?: { icone: "dividir" | "ok" | "gorjeta" | "estrela"; titulo: string; texto: string };
};

const ETAPAS: Etapa[] = [
  {
    tela: "conta",
    alt: "Conta da mesa 12 no celular: total de R$ 356,40",
    toque: { x: 23, y: 42 },
  },
  {
    tela: "dividir",
    alt: "Conta dividida em 3 partes de R$ 118,79",
    toque: { x: 50, y: 70 },
    aviso: { icone: "dividir", titulo: "Conta dividida em 3", texto: "R$ 118,79 para cada um" },
  },
  {
    tela: "metodos",
    alt: "Formas de pagamento: Pix, Apple Pay, Google Pay e no estabelecimento",
    toque: { x: 50, y: 89 },
  },
  { tela: "pix", alt: "QR Code do Pix de R$ 118,79" },
  {
    tela: "pago",
    alt: "Pagamento realizado, com o botão para agradecer a Joyce com gorjeta",
    toque: { x: 49, y: 75 },
    aviso: { icone: "ok", titulo: "Lucas pagou a parte dele", texto: "Pix · R$ 118,79" },
  },
  {
    tela: "gorjeta",
    alt: "Gorjeta extra opcional para a Joyce: 3%, 5% ou 8%",
    toque: { x: 62, y: 73 },
    aviso: {
      icone: "gorjeta",
      titulo: "Gorjeta extra para a Joyce",
      texto: "opcional · 5% sugerido",
    },
  },
  {
    tela: "gorjeta-pix",
    alt: "Pix da gorjeta de R$ 6,00",
    aviso: {
      icone: "gorjeta",
      titulo: "Gorjeta de R$ 6,00 por Pix",
      texto: "2º pagamento · R$ 4,20 para a Joyce",
    },
  },
  {
    tela: "avaliacao",
    alt: "Avaliação do atendimento com estrelas",
    toque: { x: 48, y: 44 },
    aviso: { icone: "estrela", titulo: "Atendimento avaliado", texto: "5 estrelas para a Joyce" },
  },
];

const MS = 3000;

/** Visível agora (não só uma vez): pausa a sequência fora da tela e com movimento reduzido. */
function useAtivo<T extends Element>() {
  const ref = useRef<T>(null);
  const [ativo, setAtivo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => setAtivo(!!e?.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const vis = () => document.hidden && setAtivo(false);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  return [ref, ativo] as const;
}

function Icone({ tipo }: { tipo: NonNullable<Etapa["aviso"]>["icone"] }) {
  const cls = "h-[1.05em] w-[1.05em]";
  if (tipo === "dividir") return <Divide className={cls} strokeWidth={2.4} />;
  if (tipo === "gorjeta") return <Heart className={cls} strokeWidth={2.4} />;
  if (tipo === "estrela") return <Star className={cls} strokeWidth={2.4} />;
  return <Check className={cls} strokeWidth={3} />;
}

function Aviso({ etapa, className }: { etapa: Etapa; className?: string }) {
  if (!etapa.aviso) return null;
  return (
    <div
      key={etapa.tela}
      className={cn(
        "ab-aviso flex items-center gap-[0.75em] rounded-[1.1em] bg-white/92 py-[0.7em] pl-[0.7em] pr-[1.1em] text-[#0b1418] shadow-[0_1.4em_2.4em_-1.4em_rgb(0_0_0/0.55)] backdrop-blur-md",
        className,
      )}
    >
      <span className="grid h-[2.2em] w-[2.2em] shrink-0 place-items-center rounded-[0.7em] bg-[#021E34] text-[#0FC9BD]">
        <Icone tipo={etapa.aviso.icone} />
      </span>
      <span className="min-w-0 leading-tight">
        <strong className="block truncate font-medium">{etapa.aviso.titulo}</strong>
        <small className="block truncate text-[0.82em] text-[#64737a]">{etapa.aviso.texto}</small>
      </span>
    </div>
  );
}

export function AberturaMesa({ secao = false }: { secao?: boolean } = {}) {
  const [palco, ativo] = useAtivo<HTMLDivElement>();
  const [indice] = useSequencia(ETAPAS.length, MS, ativo);
  const etapa = ETAPAS[indice]!;
  // O aviso fica até a próxima etapa que tenha o seu.
  let comAviso = etapa;
  for (let k = indice; k >= 0; k--) {
    if (ETAPAS[k]!.aviso) {
      comAviso = ETAPAS[k]!;
      break;
    }
  }

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--px", "0");
    e.currentTarget.style.setProperty("--py", "0");
  };

  const textoTopo = (
    <>
      <Palavras
        as="p"
        imediato
        className="block font-display text-[clamp(1.05rem,0.95rem+0.45vw,1.35rem)] tracking-[-0.02em] text-brand-strong"
      >
        Pagamento na mesa por QR Code
      </Palavras>
      <h1 className="mt-4 font-display text-[clamp(3rem,1.2rem+5vw,5.25rem)] font-normal leading-[0.94] tracking-[-0.055em]">
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
        className="hero-in mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-lg lg:mx-0"
        style={{ "--d": "480ms" } as CSSProperties}
      >
        O cliente aponta a câmera, divide a conta e paga com Pix, Apple Pay ou Google Pay. Depois,
        se quiser, deixa uma gorjeta extra para quem atendeu.
      </p>
      <div
        className="hero-in mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
        style={{ "--d": "620ms" } as CSSProperties}
      >
        <BotaoPrincipal vivo>Começar o teste grátis</BotaoPrincipal>
        <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
      </div>
      <p
        className="hero-in mt-5 text-sm text-muted-foreground"
        style={{ "--d": "720ms" } as CSSProperties}
      >
        {TRIAL_DAYS} dias grátis · Sem taxa para o cliente · Sem aplicativo
      </p>
    </>
  );
  // Logo abaixo do vídeo do topo (03/11): a mesma mesa, agora como seção "ao vivo".
  const textoSecao = (
    <>
      <p className="font-display text-[clamp(1.05rem,0.95rem+0.45vw,1.35rem)] tracking-[-0.02em] text-brand-strong">
        Ao vivo
      </p>
      <Palavras
        as="h2"
        className="mt-4 block font-display text-[clamp(2.4rem,1.3rem+3.6vw,4.25rem)] font-normal leading-[0.96] tracking-[-0.05em]"
      >
        A mesa pagando, em tempo real.
      </Palavras>
      <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-lg lg:mx-0">
        A conta abre no celular do cliente e o salão fica sabendo na mesma hora. Cada passo que ele
        dá aparece aqui do jeito que aparece no restaurante.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
        <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
      </div>
    </>
  );

  return (
    <section
      data-tema="claro"
      id={secao ? "ao-vivo" : undefined}
      className={
        secao
          ? "relative overflow-hidden py-14 sm:py-20 lg:py-28"
          : "relative -mt-16 overflow-hidden pt-16"
      }
    >
      <div
        className={cn(
          "container-page grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-8",
          !secao && "pb-14 pt-8 sm:pt-14 lg:pb-12 lg:pt-16",
        )}
      >
        <div className="text-center lg:text-left">{secao ? textoSecao : textoTopo}</div>

        <div>
          <div
            ref={palco}
            onPointerMove={mover}
            onPointerLeave={soltar}
            className="ab-palco aspect-[1/1.12] sm:aspect-[5/4] lg:aspect-[1.06/1]"
          >
            <div className="ab-camada ab-foto-c absolute inset-y-0 left-[12%] right-0 sm:left-[16%] lg:left-[18%] lg:bottom-[4%]">
              <Foto
                nome="cena-amigos"
                prioridade={!secao}
                alt="Quatro amigos numa mesa de bar na calçada, cada um com a conta da Tipe aberta no celular"
                sizes="(min-width: 1024px) 46vw, 92vw"
                posicao="64% 46%"
                className="ab-abre ab-kb h-full w-full rounded-[1.75rem] sm:rounded-[2.25rem]"
              />
            </div>
            <div className="ab-camada ab-fone-c absolute left-0 top-[16%] w-[40%] sm:top-[12%] sm:w-[31%] lg:w-[30%]">
              <div className="ab-entra-fone">
                <div className="ab-paira">
                  <CelularReal
                    etapas={ETAPAS}
                    indice={indice}
                    ms={MS}
                    animando={ativo}
                    prioridade={!secao}
                    sizes="(min-width: 1024px) 15rem, 40vw"
                  />
                </div>
              </div>
            </div>
            <div
              aria-live="polite"
              className="ab-camada ab-aviso-c absolute right-[3%] top-[4%] w-[min(19rem,60%)] text-[0.78rem] sm:text-sm lg:right-[4%] lg:top-[6%]"
            >
              <Aviso etapa={comAviso} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
