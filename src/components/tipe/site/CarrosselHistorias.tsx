/**
 * Logo abaixo do herói (V6, opção 2 "Vídeo fixo", escolhida pelo Roberto em 26/10).
 * À esquerda fica o filme do fluxo do produto, sempre visível; à direita, as histórias
 * por papel (cliente, bar, cozinha, garçom, caixa, dono) com as cenas do casting.
 * As histórias trocam sozinhas a cada 8 s enquanto a seção está na tela; o chip ativo
 * mostra o tempo restante. Qualquer escolha manual (toque, setas, teclado) para o automático;
 * há botões de anterior, próximo e pausa sempre visíveis. Mouse por cima ou foco também pausam. Com movimento
 * reduzido nada troca sozinho. Só funcionalidades que existem no produto.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { fotoSrc, type NomeFoto } from "./Foto";
import { Secao } from "./Site";
import { VideoProduto } from "./VideoProduto";
import { useMovimentoReduzido, useVisivel } from "./produto/useVisivel";

const PASSO_MS = 8000;

type Historia = {
  papel: string;
  cena: NomeFoto;
  foco: string;
  frase: string;
  dado: string;
  legenda: string;
  alt: string;
};

const HISTORIAS: Historia[] = [
  {
    papel: "Cliente",
    cena: "cena-praia",
    foco: "40% 45%",
    frase: "Confere, divide e paga sem esperar.",
    dado: "Tipe Pay",
    legenda: "Cada um vê seus itens e paga a sua parte pelo celular.",
    alt: "Amigos numa barraca de praia abrindo a conta pelo QR Code do totem",
  },
  {
    papel: "Bar",
    cena: "cena-bartender",
    foco: "55% 40%",
    frase: "O balcão acompanha o fluxo da mesa.",
    dado: "Tipe Cozinha",
    legenda: "Cozinha e bar na mesma tela de pedidos.",
    alt: "Bartender preparando um drinque no balcão, ao lado do totem da Tipe",
  },
  {
    papel: "Cozinha",
    cena: "cena-cozinha",
    foco: "40% 45%",
    frase: "Recebe e acompanha os pedidos na tela.",
    dado: "Tipe Cozinha",
    legenda: "sem comanda de papel no caminho.",
    alt: "Cozinheiro montando um prato com os pedidos da Tipe na tela da cozinha",
  },
  {
    papel: "Garçom",
    cena: "cena-garcom",
    foco: "50% 25%",
    frase: "Menos tempo levando conta e maquininha.",
    dado: "Tipe Equipe",
    legenda: "Mais tempo na mesa. 70% da gorjeta extra vai para o garçom da mesa.",
    alt: "Garçom sorrindo ao lado de uma mesa com o totem da Tipe",
  },
  {
    papel: "Caixa",
    cena: "cena-caixa",
    foco: "45% 45%",
    frase: "Acompanha o fechamento das contas e as pendências.",
    dado: "Caixa",
    legenda: "mesas pagas e pendências na mesma tela.",
    alt: "Caixa do restaurante com o painel da Tipe aberto no monitor",
  },
  {
    papel: "Dono",
    cena: "cena-dono",
    foco: "55% 45%",
    frase: "Uma visão da operação para decidir.",
    dado: "Tipe Gestão",
    legenda: "vendas, gorjetas e mesas no painel.",
    alt: "Dono do restaurante conferindo o painel da Tipe no notebook depois do expediente",
  },
];

export function CarrosselHistorias() {
  const [ref, visivel] = useVisivel<HTMLDivElement>("-10% 0px");
  const reduz = useMovimentoReduzido();
  const [pausado, setPausado] = useState(false);
  const [manual, setManual] = useState(false);
  const [i, setI] = useState(0);
  const anda = visivel && !reduz && !pausado && !manual;
  const ir = (n: number) => {
    setManual(true);
    setI((n + HISTORIAS.length) % HISTORIAS.length);
  };
  const chips = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anda) return;
    const id = window.setTimeout(() => setI((v) => (v + 1) % HISTORIAS.length), PASSO_MS);
    return () => window.clearTimeout(id);
  }, [anda, i]);

  // Mantém o chip ativo à vista na faixa rolável (celular), sem rolar a página.
  useEffect(() => {
    const box = chips.current;
    const ch = box?.children[i] as HTMLElement | undefined;
    if (!box || !ch) return;
    box.scrollTo({
      left: ch.offsetLeft - box.clientWidth / 2 + ch.clientWidth / 2,
      behavior: reduz ? "auto" : "smooth",
    });
  }, [i, reduz]);

  const h = HISTORIAS[i]!;

  return (
    <Secao tema="claro" id="historias" ariaLabel="A Tipe na mesa">
      <div ref={ref} className="container-page">
        <div className="grid gap-5 md:grid-cols-12 lg:gap-6">
          <div className="md:col-span-5">
            <VideoProduto />
          </div>

          <div
            className="flex min-w-0 flex-col gap-5 md:col-span-7"
            onPointerEnter={(e) => e.pointerType === "mouse" && setPausado(true)}
            onPointerLeave={() => setPausado(false)}
            onFocusCapture={() => setPausado(true)}
            onBlurCapture={() => setPausado(false)}
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-4 md:pt-0">
              <h2 className="max-w-[16ch] font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] font-normal leading-[1.02] tracking-[-0.045em]">
                Quem ganha tempo com a Tipe
              </h2>
            </div>

            <div
              ref={chips}
              role="tablist"
              aria-label="Histórias por papel"
              className="sem-barra -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5"
            >
              {HISTORIAS.map((k, n) => (
                <button
                  key={k.papel}
                  type="button"
                  role="tab"
                  id={`hist-tab-${n}`}
                  aria-selected={n === i}
                  aria-controls="hist-painel"
                  tabIndex={n === i ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") (e.preventDefault(), ir(i + 1));
                    if (e.key === "ArrowLeft") (e.preventDefault(), ir(i - 1));
                  }}
                  onClick={() => ir(n)}
                  className={cn(
                    "hist-chip relative h-10 shrink-0 overflow-hidden rounded-full border px-4 text-[0.92rem] transition-colors duration-300",
                    n === i
                      ? "border-[#021E34] bg-[#021E34] text-white"
                      : "border-[#021E34]/15 bg-white text-[#021E34] hover:border-[#021E34]/40",
                  )}
                >
                  {k.papel}
                  {n === i && (
                    <span
                      aria-hidden
                      key={`${i}-${anda}`}
                      className="hist-progresso"
                      data-anda={anda || undefined}
                      style={{ "--ms": `${PASSO_MS}ms` } as CSSProperties}
                    />
                  )}
                </button>
              ))}
            </div>

            <div
              id="hist-painel"
              role="tabpanel"
              aria-labelledby={`hist-tab-${i}`}
              className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#dfe7ea] sm:aspect-[4/3] md:aspect-auto md:min-h-0 md:flex-1"
            >
              {HISTORIAS.map((k, n) => {
                const f = fotoSrc(k.cena);
                return (
                  <img
                    key={k.cena}
                    src={f.src}
                    srcSet={f.srcSet}
                    sizes="(min-width: 1024px) 46vw, 92vw"
                    alt={n === i ? k.alt : ""}
                    aria-hidden={n !== i || undefined}
                    loading={n === 0 ? "eager" : "lazy"}
                    decoding="async"
                    data-on={n === i || undefined}
                    className="hist-foto absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: k.foco }}
                  />
                );
              })}
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgb(2_14_24/0.72))]"
              />
              <div
                key={i}
                className="hist-texto absolute inset-x-5 bottom-5 text-white sm:inset-x-7 sm:bottom-7"
                aria-live="polite"
              >
                <p className="max-w-[20ch] font-display text-[clamp(1.4rem,1rem+1.3vw,2.2rem)] leading-[1.04] tracking-[-0.04em]">
                  {h.frase}
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 text-[0.95rem] text-white/85">
                  <span className="font-display text-[1.5rem] leading-none tracking-[-0.03em] text-[#0FC9BD]">
                    {h.dado}
                  </span>
                  {h.legenda}
                </p>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
                <span className="rounded-full bg-black/45 px-3 py-1 text-[0.8rem] tabular-nums text-white backdrop-blur">
                  {i + 1} / {HISTORIAS.length}
                </span>
                <button
                  type="button"
                  onClick={() => setManual((v) => !v)}
                  aria-label={manual || reduz ? "Voltar a trocar sozinho" : "Parar de trocar sozinho"}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                >
                  {manual || reduz ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              <div className="absolute inset-y-0 left-2 flex items-center sm:left-4">
                <button
                  type="button"
                  onClick={() => ir(i - 1)}
                  aria-label={`Anterior: ${HISTORIAS[(i + HISTORIAS.length - 1) % HISTORIAS.length]!.papel}`}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="absolute inset-y-0 right-2 flex items-center sm:right-4">
                <button
                  type="button"
                  onClick={() => ir(i + 1)}
                  aria-label={`Próximo: ${HISTORIAS[(i + 1) % HISTORIAS.length]!.papel}`}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}
