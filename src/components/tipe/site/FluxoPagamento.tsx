/**
 * A experiência de pagamento em oito passos, com as telas reais da Tipe: do QR
 * Code da mesa até o caixa vendo a conta quitada. Passos controlados (não presos
 * à rolagem): avançam sozinhos quando a seção está na tela, param quando a pessoa
 * toca, e as setas e os números navegam também pelo teclado. Os dados são do
 * restaurante fictício "Maré Alta" e nada aqui cobra de verdade.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, ScanLine } from "lucide-react";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import totem360 from "@/assets/telas-v4/totem-360.webp";
import totem720 from "@/assets/telas-v4/totem-720.webp";
import { Fios } from "./Bigode";
import { Celular, Janela, type TelaCelular } from "./Dispositivo";
import { reduzMovimento } from "./movimento";
import { Secao, Titulo } from "./Site";

type Passo = {
  id: string;
  quem: "Cliente" | "Restaurante";
  titulo: string;
  texto: string;
  tela?: TelaCelular;
  alt: string;
  chip?: ReactNode;
};

const PASSOS: Passo[] = [
  {
    id: "qr",
    quem: "Cliente",
    titulo: "Aponta a câmera para o QR Code",
    texto: "Cada mesa tem o seu código. A conta abre no navegador, sem baixar aplicativo.",
    alt: "Totem da Mesa 12 do Maré Alta com o QR Code da Tipe",
  },
  {
    id: "conta",
    quem: "Cliente",
    titulo: "Vê a conta ao vivo",
    texto: "Os itens aparecem conforme o garçom lança, com a taxa de serviço do restaurante.",
    tela: "conta",
    alt: "Conta da Mesa 5 no celular: R$ 310,20 com os itens por lugar",
    chip: <>Mesa 5 · <span className="money">R$ 310,20</span></>,
  },
  {
    id: "dividir",
    quem: "Cliente",
    titulo: "Divide do jeito da mesa",
    texto: "Tudo, partes iguais, só os seus itens, pelo lugar ou um valor. O resto fica para quem ainda vai pagar.",
    tela: "dividir",
    alt: "Tela de divisão da conta com a opção dividir igualmente entre 2 pessoas",
    chip: <>Dividido em 2 · <span className="money">R$ 155,10</span> cada</>,
  },
  {
    id: "gorjeta",
    quem: "Cliente",
    titulo: "Decide a gorjeta extra",
    texto: "Opcional, com o nome de quem atendeu. Nada vem marcado: o cliente escolhe se quer dar.",
    tela: "gorjeta",
    alt: "Tela de gorjeta extra para a garçonete Joyce, com 3, 5 e 8 por cento",
    chip: <>Gorjeta para Joyce · <span className="money">R$ 8,00</span></>,
  },
  {
    id: "forma",
    quem: "Cliente",
    titulo: "Escolhe como pagar",
    texto: "Pix, Apple Pay ou Google Pay pelo celular, ou pagar no estabelecimento.",
    tela: "metodos",
    alt: "Formas de pagamento: Pix, Apple Pay, Google Pay e pagar no estabelecimento",
  },
  {
    id: "paga",
    quem: "Cliente",
    titulo: "Paga em segundos",
    texto: "No Pix, o banco confirma e a Tipe aprova sozinha. O dinheiro vai para a conta do restaurante.",
    tela: "pix",
    alt: "Tela do Pix com o valor de R$ 163,10 e o QR Code de demonstração",
  },
  {
    id: "pronto",
    quem: "Cliente",
    titulo: "A conta se atualiza na hora",
    texto: "A parte paga sai da mesa e o cliente pode avaliar o atendimento antes de ir embora.",
    tela: "confirmado",
    alt: "Pagamento confirmado no celular, com o mascote da Tipe",
    chip: <>Pagamento confirmado</>,
  },
  {
    id: "caixa",
    quem: "Restaurante",
    titulo: "O restaurante vê tudo ao vivo",
    texto: "O caixa recebe cada pagamento com nome, itens, valor e hora. O garçom vê a gorjeta no celular.",
    tela: "garcom",
    alt: "Painel do caixa com a lista de pagamentos e o celular do garçom com as gorjetas",
  },
];

const TEMPO = 3600;

export function FluxoPagamento() {
  const [ativo, setAtivo] = useState(0);
  const [auto, setAuto] = useState(true);
  const [ref, visivel] = useInView<HTMLDivElement>("0px 0px -25% 0px");
  const reduzido = useRef(false);

  useEffect(() => {
    reduzido.current = reduzMovimento();
    if (reduzido.current) setAuto(false);
  }, []);

  useEffect(() => {
    if (!auto || !visivel) return;
    const t = window.setTimeout(() => setAtivo((a) => (a + 1) % PASSOS.length), TEMPO);
    return () => window.clearTimeout(t);
  }, [ativo, auto, visivel]);

  const ir = (i: number) => {
    setAuto(false);
    setAtivo((i + PASSOS.length) % PASSOS.length);
  };
  const passo = PASSOS[ativo]!;

  return (
    <Secao tema="claro" id="como-funciona" ariaLabel="Como a Tipe funciona na mesa">
      <div className="container-page">
        <Titulo
          rotulo="Como funciona"
          titulo="Da câmera ao caixa em oito passos."
          texto="Com as telas de verdade da Tipe. Toque num passo para ver de perto."
        />
      </div>
      <div ref={ref} className="container-page mt-10 grid items-center gap-8 lg:mt-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Passos */}
        <div className="order-2 min-w-0 lg:order-1">
          <ol role="tablist" aria-label="Passos do pagamento" aria-orientation="vertical" className="hidden lg:block">
            {PASSOS.map((p, i) => (
              <li key={p.id} role="presentation" className="border-t border-border last:border-b">
                <button
                  type="button"
                  role="tab"
                  id={`passo-${p.id}`}
                  aria-selected={ativo === i}
                  aria-controls="palco-pagamento"
                  onClick={() => ir(i)}
                  className={cn(
                    "relative grid w-full grid-cols-[2.25rem_1fr] gap-x-3 py-4 text-left transition-colors duration-500",
                    ativo === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="money pt-0.5 text-sm">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-display text-[1.25rem] leading-tight tracking-[-0.03em]">{p.titulo}</span>
                    <span
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        ativo === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="min-h-0 overflow-hidden">
                        <span className="block pt-2 text-[0.98rem] leading-relaxed text-muted-foreground">{p.texto}</span>
                      </span>
                    </span>
                  </span>
                  <span aria-hidden className="absolute inset-x-0 -top-px h-[2px]">
                    <span
                      key={`${ativo}-${auto}-${visivel}`}
                      className={cn(
                        "block h-full origin-left bg-foreground",
                        ativo === i ? (auto && visivel ? "aba-progresso" : "scale-x-100") : "scale-x-0",
                      )}
                      style={{ "--tempo": `${TEMPO}ms` } as CSSProperties}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {/* Celular: texto do passo, pontos e setas */}
          <div className="lg:hidden">
            <div key={passo.id} className="troca-in min-h-[8.5rem]">
              <p className="text-sm text-muted-foreground">
                <span className="money">{String(ativo + 1).padStart(2, "0")}</span> / 08 · {passo.quem}
              </p>
              <p className="mt-2 font-display text-[1.6rem] leading-[1.1] tracking-[-0.03em]">{passo.titulo}</p>
              <p className="mt-2 leading-relaxed text-muted-foreground">{passo.texto}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => ir(ativo - 1)}
              aria-label="Passo anterior"
              className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(ativo + 1)}
              aria-label="Próximo passo"
              className="com-fios grid h-12 w-12 place-items-center rounded-full border border-border"
            >
              <ArrowRight className="seta h-5 w-5" />
              <Fios intensidade="leve" />
            </button>
            <button
              type="button"
              onClick={() => setAuto((a) => !a)}
              aria-label={auto ? "Pausar a demonstração" : "Continuar a demonstração"}
              className="grid h-12 w-12 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="ml-auto flex gap-1.5 lg:hidden" aria-hidden>
              {PASSOS.map((p, i) => (
                <span
                  key={p.id}
                  className={cn("h-1.5 rounded-full transition-all duration-500", i === ativo ? "w-5 bg-foreground" : "w-1.5 bg-foreground/25")}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Palco */}
        <div
          id="palco-pagamento"
          role="tabpanel"
          aria-labelledby={`passo-${passo.id}`}
          aria-live="polite"
          className="relative order-1 min-w-0 lg:order-2"
        >
          <div className="relative mx-auto aspect-[1/1] max-h-[78svh] overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_90%_at_50%_100%,#d9f6f3_0%,#eef8f7_45%,var(--pg-soft)_75%)] sm:aspect-[5/4] lg:aspect-[1/1]">
            <span className="absolute left-4 top-4 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[oklch(0.3_0_0)] backdrop-blur">
              Demonstração · Maré Alta (fictício)
            </span>

            {/* Passo 1: totem */}
            <figure
              className={cn(
                "absolute left-1/2 top-[10%] w-[30%] -translate-x-1/2 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                ativo === 0 ? "opacity-100" : "pointer-events-none -translate-y-6 opacity-0",
              )}
              aria-hidden={ativo !== 0 || undefined}
            >
              <img
                src={totem360}
                srcSet={`${totem360} 360w, ${totem720} 720w`}
                sizes="240px"
                alt={PASSOS[0]!.alt}
                width={360}
                height={720}
                className="h-auto w-full drop-shadow-[0_30px_40px_rgb(2_30_52/0.3)]"
              />
              <span aria-hidden className="scan-line absolute inset-x-[8%] top-[34%] h-[2px] rounded-full bg-[#0FC9BD] shadow-[0_0_14px_#0FC9BD]" />
              <figcaption className="absolute -right-[85%] top-[46%] flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-[oklch(0.2_0_0)] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.4)]">
                <ScanLine className="h-4 w-4 text-[#03665f]" /> Mesa 12 aberta
              </figcaption>
            </figure>

            {/* Passos 2 a 7: o celular troca a tela */}
            <div
              className={cn(
                "absolute left-1/2 top-[7%] w-[46%] max-w-[17rem] -translate-x-1/2 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[34%]",
                ativo === 0 && "pointer-events-none translate-y-[30%] opacity-0",
                ativo === 7 && "translate-x-[10%] scale-[0.82] sm:translate-x-[55%]",
              )}
            >
              {PASSOS.map((p, i) =>
                p.tela ? (
                  <div
                    key={p.id}
                    className={cn(
                      "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      i === 1 ? "relative" : "absolute inset-0",
                      i === ativo ? "opacity-100" : i < ativo ? "-translate-x-6 opacity-0" : "translate-x-6 opacity-0",
                      // O celular do passo 8 é o do garçom e só aparece nele.
                      i === 7 && ativo !== 7 && "invisible",
                    )}
                    aria-hidden={i !== ativo || undefined}
                  >
                    <Celular tela={p.tela} alt={i === ativo ? p.alt : ""} sizes="(min-width: 640px) 272px, 46vw" />
                  </div>
                ) : null,
              )}
            </div>

            {/* Passo 8: o caixa no computador */}
            <div
              className={cn(
                "absolute left-[5%] top-[18%] w-[78%] transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[70%]",
                ativo === 7 ? "opacity-100" : "pointer-events-none translate-y-8 opacity-0",
              )}
              aria-hidden={ativo !== 7 || undefined}
            >
              <Janela tela="caixa" alt="Caixa do restaurante com a lista de pagamentos do dia" sizes="(min-width: 1024px) 560px, 78vw" />
            </div>

            {/* Chip do passo */}
            {passo.chip && (
              <div className="absolute inset-x-0 bottom-[7%] z-10 flex justify-center px-4">
                <div
                  key={`chip-${passo.id}`}
                  className="pop-in flex items-center gap-2 whitespace-nowrap rounded-full bg-[#021E34] px-4 py-2.5 text-sm font-medium text-white shadow-[0_20px_40px_-15px_rgb(2_30_52/0.6)]"
                  style={{ "--d": "350ms" } as CSSProperties}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {passo.chip}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Secao>
  );
}
