/**
 * Logo abaixo do herói (V6, opção 2 "Vídeo fixo", escolhida pelo Roberto em 26/10).
 * À esquerda fica o filme do fluxo do produto, sempre visível; à direita, as histórias
 * por papel (cliente, família, cozinha, garçom, caixa, dono) com as cenas do casting.
 * As histórias trocam sozinhas a cada 6 s enquanto a seção está na tela; o chip ativo
 * mostra o tempo restante, um toque troca e o mouse por cima pausa. Com movimento
 * reduzido nada troca sozinho. Só funcionalidades que existem no produto.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { fotoSrc, type NomeFoto } from "./Foto";
import { Secao } from "./Site";
import { VideoProduto } from "./VideoProduto";
import { useMovimentoReduzido, useVisivel } from "./produto/useVisivel";

const PASSO_MS = 6000;

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
    frase: "Ninguém levanta a mão para pedir a conta.",
    dado: "Sem app",
    legenda: "A conta abre na câmera do celular.",
    alt: "Amigos numa barraca de praia abrindo a conta pelo QR Code do totem",
  },
  {
    papel: "Família",
    cena: "cena-familia",
    foco: "50% 40%",
    frase: "Cada um paga a sua parte, do próprio celular.",
    dado: "Pix",
    legenda: "Apple Pay e Google Pay também.",
    alt: "Família almoçando e dividindo a conta pelo celular",
  },
  {
    papel: "Cozinha",
    cena: "cena-cozinha",
    foco: "40% 45%",
    frase: "O pedido da mesa cai direto na tela da cozinha.",
    dado: "Tipe Order",
    legenda: "sem comanda de papel no caminho.",
    alt: "Cozinheiro montando um prato com os pedidos da Tipe na tela da cozinha",
  },
  {
    papel: "Garçom",
    cena: "cena-garcom",
    foco: "50% 25%",
    frase: "A gorjeta chega com o nome de quem atendeu.",
    dado: "70%",
    legenda: "da gorjeta extra vai para o saldo do garçom da mesa.",
    alt: "Garçom sorrindo ao lado de uma mesa com o totem da Tipe",
  },
  {
    papel: "Caixa",
    cena: "cena-caixa",
    foco: "45% 45%",
    frase: "A mesa já aparece paga, sem fila no caixa.",
    dado: "Baixa",
    legenda: "automática quando o Pix é confirmado.",
    alt: "Caixa do restaurante com o painel da Tipe aberto no monitor",
  },
  {
    papel: "Dono",
    cena: "cena-dono",
    foco: "55% 45%",
    frase: "O dia fecha com o faturamento já somado.",
    dado: "Relatórios",
    legenda: "vendas, gorjetas e mesas no painel.",
    alt: "Dono do restaurante conferindo o painel da Tipe no notebook depois do expediente",
  },
];

export function CarrosselHistorias() {
  const [ref, visivel] = useVisivel<HTMLDivElement>("-10% 0px");
  const reduz = useMovimentoReduzido();
  const [pausado, setPausado] = useState(false);
  const [i, setI] = useState(0);
  const anda = visivel && !reduz && !pausado;
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
                  onClick={() => setI(n)}
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
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}
