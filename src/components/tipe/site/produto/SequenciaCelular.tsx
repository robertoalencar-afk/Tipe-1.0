/**
 * O "vídeo" das páginas de produto: o celular realista (CelularReal) trocando as telas
 * reais do app do cliente sozinho, a cada ~2,3 s, com troca curta (350–400 ms) e o
 * toque turquesa antes de cada passo. Só anda na tela; com movimento reduzido fica
 * parado na primeira tela e os pontos abaixo deixam escolher a tela.
 */
import { cn } from "@/lib/utils";
import { CelularReal, useSequencia, type EtapaCelular, type TelaReal } from "../CelularReal";
import { useMovimentoReduzido, useVisivel } from "./useVisivel";
import "./produto.css";

const ETAPAS: Record<TelaReal, Omit<EtapaCelular, "tela">> = {
  conta: {
    alt: "Conta da Mesa 12 no celular: total de R$ 356,40 com a taxa de serviço",
    toque: { x: 28, y: 59 },
  },
  dividir: { alt: "Conta dividida em 3 partes, com a parte de R$ 118,79", toque: { x: 50, y: 70 } },
  metodos: {
    alt: "Formas de pagamento: Pix, Apple Pay, Google Pay e pagar no estabelecimento",
    toque: { x: 50, y: 89 },
  },
  pix: { alt: "Tela do Pix com o valor de R$ 118,79 e o QR Code" },
  pago: {
    alt: "Pagamento realizado, com o valor pago, o restaurante e a mesa",
    toque: { x: 49, y: 75 },
  },
  gorjeta: {
    alt: "Gorjeta extra opcional para a Joyce: 3%, 5%, 8% ou outro valor, ou seguir sem gorjeta",
    toque: { x: 50, y: 73 },
  },
  "gorjeta-metodo": { alt: "Forma de pagamento da gorjeta extra" },
  "gorjeta-pix": { alt: "Pix da gorjeta extra" },
  avaliacao: { alt: "Avaliação do atendimento com cinco estrelas e campo de comentário" },
};

const ROTULO: Record<TelaReal, string> = {
  conta: "Conta",
  dividir: "Dividir",
  metodos: "Pagar",
  pix: "Pix",
  pago: "Pago",
  gorjeta: "Gorjeta",
  "gorjeta-metodo": "Gorjeta",
  "gorjeta-pix": "Pix",
  avaliacao: "Avaliar",
};

export const PASSO_MS = 2300;

export function SequenciaCelular({
  telas,
  className,
  sizes = "(min-width: 1024px) 15rem, 40vw",
  prioridade = false,
  legenda = true,
}: {
  telas: TelaReal[];
  className?: string;
  sizes?: string;
  prioridade?: boolean;
  /** Pontos com o nome de cada tela, abaixo do celular. */
  legenda?: boolean;
}) {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduz = useMovimentoReduzido();
  const anda = visivel && !reduz;
  const [i, setI] = useSequencia(telas.length, PASSO_MS, anda);
  const etapas = telas.map((t) => ({ tela: t, ...ETAPAS[t] }));
  return (
    <div ref={ref} className={cn("seq-rapida", className)}>
      <CelularReal
        etapas={etapas}
        indice={i}
        ms={PASSO_MS}
        animando={anda}
        sizes={sizes}
        prioridade={prioridade}
      />
      {legenda && (
        <ol className="seq-pontos" aria-label="Telas do app do cliente">
          {telas.map((t, k) => (
            <li key={t + k}>
              <button
                type="button"
                aria-current={k === i ? "step" : undefined}
                aria-label={`Ver a tela ${ROTULO[t]}`}
                onClick={() => setI(k)}
                data-on={k === i || undefined}
              >
                <span aria-hidden className="seq-ponto" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
