/**
 * Mesa Viva (26/10): a conta da Mesa 12 do QR ao "obrigado", tocando sozinha. Antes ela
 * só andava com o scroll (uns 4.000 px presos); agora é uma seção de altura normal que
 * toca quando entra na tela e pausa quando sai. Cinco capítulos com cena do casting ao
 * fundo, o celular com as telas reais do app do cliente e um aviso do que o restaurante
 * vê. As pílulas embaixo mostram o progresso e deixam pular; há botão de pausa. Com
 * movimento reduzido nada anda sozinho. Dados do restaurante fictício "Maré Alta".
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BadgeCheck, HandCoins, Pause, Play, ScanLine, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CelularReal, useSequencia, type TelaReal } from "../CelularReal";
import { fotoSrc, type NomeFoto } from "../Foto";
import { MascoteVivo } from "../MascoteVivo";
import { ETAPAS_TELA } from "./SequenciaCelular";
import { useMovimentoReduzido, useVisivel } from "./useVisivel";
import "./produto.css";

const PASSO_MS = 2400;

type Capitulo = {
  nome: string;
  titulo: string;
  texto: string;
  cena: NomeFoto;
  foco: string;
  telas: TelaReal[];
  aviso: { rotulo: string; texto: ReactNode; icone: ReactNode };
};

// Ordem real do app: a conta é paga primeiro; a gorjeta extra é um segundo pagamento.
const CAPITULOS: Capitulo[] = [
  {
    nome: "Chega",
    titulo: "Aponta a câmera. A conta já está ali.",
    texto:
      "O QR Code do totem abre a conta da mesa no navegador, com o que o garçom lançou até agora.",
    cena: "cena-praia",
    foco: "30% 45%",
    telas: ["conta"],
    aviso: { rotulo: "No salão", texto: "Mesa 12 abriu a conta pelo celular", icone: <ScanLine /> },
  },
  {
    nome: "Divide",
    titulo: "Cada um paga a sua parte.",
    texto:
      "Dividir por pessoas ou escolher os itens leva dois toques. Ninguém faz conta no guardanapo.",
    cena: "cena-amigos",
    foco: "55% 45%",
    telas: ["dividir"],
    aviso: { rotulo: "No salão", texto: "Conta da Mesa 12 dividida em 3", icone: <Users /> },
  },
  {
    nome: "Paga",
    titulo: "Pix, Apple Pay ou Google Pay.",
    texto: "Paga em segundos, do próprio celular, sem esperar a maquininha chegar na mesa.",
    cena: "cena-familia",
    foco: "45% 45%",
    telas: ["metodos", "pix", "pago"],
    aviso: {
      rotulo: "Para o caixa",
      texto: (
        <>
          Lucas pagou <span className="money">R$ 118,79</span> por Pix
        </>
      ),
      icone: <BadgeCheck />,
    },
  },
  {
    nome: "Agradece",
    titulo: "Depois de pagar, a gorjeta com o nome da Joyce.",
    texto: "Opcional e separada da conta. 70% vai para o saldo do garçom da mesa.",
    cena: "cena-garcom",
    foco: "50% 30%",
    telas: ["gorjeta", "gorjeta-pix"],
    aviso: {
      rotulo: "Para a Joyce",
      texto: (
        <>
          Gorjeta extra: <span className="money">+ R$ 4,20</span> no seu saldo
        </>
      ),
      icone: <HandCoins />,
    },
  },
  {
    nome: "Avalia",
    titulo: "Avalia, levanta e a mesa já está livre.",
    texto: "A avaliação chega para o restaurante, e a mesa aparece liberada no painel do salão.",
    cena: "cena-mesa-liberada",
    foco: "60% 40%",
    telas: ["avaliacao"],
    aviso: { rotulo: "No painel", texto: "Mesa 12 liberada · 5 estrelas", icone: <Star /> },
  },
];

const ETAPAS = CAPITULOS.flatMap((c) => c.telas.map((t) => ({ tela: t, ...ETAPAS_TELA[t] })));
const INICIO = CAPITULOS.map((_, k) =>
  CAPITULOS.slice(0, k).reduce((n, c) => n + c.telas.length, 0),
);
const capituloDe = (i: number) => INICIO.filter((s) => s <= i).length - 1;

export function MesaViva() {
  const [ref, visivel] = useVisivel<HTMLElement>("-15% 0px");
  const reduz = useMovimentoReduzido();
  const [pausado, setPausado] = useState(false);
  const anda = visivel && !reduz && !pausado;
  const [i, setI] = useSequencia(ETAPAS.length, PASSO_MS, anda);
  const c = capituloDe(i);
  const cap = CAPITULOS[c]!;

  // Ao recomeçar o ciclo (volta ao capítulo 1), o aviso e a cena trocam junto.
  const [chave, setChave] = useState(0);
  useEffect(() => setChave((k) => k + 1), [c]);

  return (
    <section
      ref={ref}
      data-tema="escuro"
      aria-labelledby="mv-titulo"
      className="relative overflow-hidden bg-[#021E34] py-20 text-white sm:py-28"
    >
      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-sm font-medium text-[#0FC9BD]">Mesa Viva</p>
            <h2
              id="mv-titulo"
              className="mt-3 font-display text-[clamp(2rem,1.2rem+3.2vw,3.9rem)] font-normal leading-[1.03] tracking-[-0.04em] text-balance"
            >
              Uma conta, do QR ao obrigado.
            </h2>
            <div key={chave} className="mv-texto mt-10 min-h-[9.5rem]" aria-live="polite">
              <p className="font-display text-xl font-medium leading-snug tracking-[-0.02em] sm:text-2xl">
                {cap.titulo}
              </p>
              <p className="mt-3 max-w-md text-white/70">{cap.texto}</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="mv-palco relative aspect-[4/5] overflow-hidden rounded-[1.75rem] sm:aspect-[16/11]">
              {CAPITULOS.map((k, n) => {
                const f = fotoSrc(k.cena);
                return (
                  <img
                    key={k.cena}
                    src={f.src}
                    srcSet={f.srcSet}
                    sizes="(min-width: 1024px) 50vw, 92vw"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    data-on={n === c || undefined}
                    className="mv-cena absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: k.foco } as CSSProperties}
                  />
                );
              })}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[#021E34]/75 via-[#021E34]/10 to-transparent"
              />
              <div className="absolute bottom-[-14%] right-[6%] w-[42%] sm:bottom-[-20%] sm:w-[30%]">
                <CelularReal
                  etapas={ETAPAS}
                  indice={i}
                  ms={PASSO_MS}
                  animando={anda}
                  sizes="(min-width: 1024px) 14rem, 40vw"
                />
              </div>
              <div
                key={chave}
                className="mv-aviso absolute left-4 top-4 flex max-w-[60%] items-center gap-3 rounded-2xl border border-white/15 bg-[rgb(2_30_52/0.55)] p-2.5 pr-4 backdrop-blur-xl sm:left-6 sm:top-6"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0FC9BD] text-[#021E34] [&_svg]:h-4 [&_svg]:w-4">
                  {cap.aviso.icone}
                </span>
                <span className="min-w-0 text-sm leading-tight">
                  <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#0FC9BD]">
                    {cap.aviso.rotulo}
                  </span>
                  {cap.aviso.texto}
                </span>
              </div>
              {c === CAPITULOS.length - 1 && (
                <MascoteVivo className="mv-lebre absolute bottom-4 left-4 w-16 sm:bottom-6 sm:left-6 sm:w-20" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-end gap-4 sm:mt-12">
          <ol className="mv-capitulos flex-1" aria-label="Capítulos da Mesa Viva">
            {CAPITULOS.map((k, n) => {
              const feito = n < c;
              const ativo = n === c;
              const parte = ativo ? (i - INICIO[n]! + 1) / k.telas.length : feito ? 1 : 0;
              return (
                <li key={k.nome} className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="mv-capitulo w-full"
                    aria-current={ativo ? "step" : undefined}
                    data-ativo={ativo || undefined}
                    onClick={() => setI(INICIO[n]!)}
                  >
                    <span className="mv-capitulo-barra" aria-hidden>
                      <span
                        style={
                          {
                            transform: `scaleX(${parte})`,
                            transitionDuration: anda && ativo ? `${PASSO_MS}ms` : "300ms",
                          } as CSSProperties
                        }
                      />
                    </span>
                    <span
                      className={cn(
                        "block truncate text-sm transition-colors",
                        ativo ? "text-white" : "text-white/50",
                      )}
                    >
                      {k.nome}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {!reduz && (
            <button
              type="button"
              onClick={() => setPausado((v) => !v)}
              aria-label={pausado ? "Continuar a Mesa Viva" : "Pausar a Mesa Viva"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 transition-colors hover:border-white/50"
            >
              {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
