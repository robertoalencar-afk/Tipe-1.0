/**
 * Tipe Pay, o lado do restaurante (V6): o que acontece no salão quando a mesa paga.
 * O tablet mostra a tela real do Salão antes e depois do pagamento da Mesa 12 (de 33%
 * pago para encerrada), com o aviso do Pix aprovado entrando no meio; embaixo, a lista
 * de pagamentos do caixa grande o bastante para ler. Toca sozinho enquanto está na tela,
 * pausa fora dela; com movimento reduzido fica no estado final (mesa encerrada).
 * Dados de demonstração do restaurante fictício Maré Alta.
 */
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Reveal } from "@/components/tipe/landing/motion";
import antes560 from "@/assets/telas-reais/salao-antes-560.webp";
import antes1000 from "@/assets/telas-reais/salao-antes-1000.webp";
import depois560 from "@/assets/telas-reais/salao-560.webp";
import depois1000 from "@/assets/telas-reais/salao-1000.webp";
import caixa900 from "@/assets/telas-v4/caixa-pagamentos-900.webp";
import caixa1600 from "@/assets/telas-v4/caixa-pagamentos-1600.webp";
import type { Produto } from "../produtos";
import { Secao, Titulo } from "../Site";
import { useMovimentoReduzido, useVisivel } from "./useVisivel";

/** 0: mesa 12 ocupada · 1: chega o Pix · 2: mesa encerrada. Duração de cada etapa (ms). */
const ETAPAS_MS = [2600, 1300, 3400];

const PONTOS = [
  {
    t: "Baixa automática",
    d: "Quando o Pix é aprovado, a parte paga sai da conta e a mesa fecha sozinha no painel.",
  },
  {
    t: "Todos os pagamentos numa lista",
    d: "Hora, mesa, cliente, meio de pagamento e gorjeta, com exportação em planilha.",
  },
  {
    t: "Mesa livre mais cedo",
    d: "O garçom vê a mesa encerrada no celular e já pode arrumar para o próximo cliente.",
  },
];

export function BaixaAutomatica({ p }: { p: Produto }) {
  const [ref, visivel] = useVisivel<HTMLDivElement>("-10% 0px");
  const reduz = useMovimentoReduzido();
  const [etapa, setEtapa] = useState(0);
  const anda = visivel && !reduz;

  useEffect(() => {
    if (!anda) return;
    const id = window.setTimeout(() => setEtapa((e) => (e + 1) % 3), ETAPAS_MS[etapa]);
    return () => window.clearTimeout(id);
  }, [anda, etapa]);

  const e = reduz ? 2 : etapa;

  return (
    <Secao tema="claro" ariaLabel="Para o restaurante">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Titulo
              rotulo="Para o restaurante"
              titulo="Pagou no celular. Baixou no salão."
              texto="O dinheiro do Pix cai na conta do restaurante e o painel mostra na hora o que foi pago, por quem e em qual mesa. Ninguém confere comprovante."
            />
            <ol className="mt-10 divide-y divide-border border-y border-border">
              {PONTOS.map((pt, i) => (
                <li key={pt.t} className="flex gap-5 py-5">
                  <span className="pt-0.5 font-display text-[0.9rem] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-display text-[1.15rem] tracking-[-0.02em]">
                      {pt.t}
                    </span>
                    <span className="mt-1 block text-[0.97rem] leading-relaxed text-muted-foreground">
                      {pt.d}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div ref={ref} className="lg:col-span-7">
            <div className="baixa-palco relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,#e6faf8,#cdf3ef)] px-[9%] pb-[9%] pt-[12%]">
              <figure className="relative mx-auto w-full max-w-[30rem] rounded-[6%/4.5%] bg-[oklch(0.17_0_0)] p-[2.8%] shadow-[0_60px_90px_-40px_rgb(2_30_52/0.55),0_0_0_1px_oklch(0.42_0_0/0.5)]">
                <div className="relative overflow-hidden rounded-[3.5%/2.6%]">
                  <img
                    src={antes560}
                    srcSet={`${antes560} 560w, ${antes1000} 1000w`}
                    sizes="(min-width: 1024px) 30rem, 80vw"
                    alt=""
                    aria-hidden
                    width={560}
                    height={747}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                  <img
                    src={depois560}
                    srcSet={`${depois560} 560w, ${depois1000} 1000w`}
                    sizes="(min-width: 1024px) 30rem, 80vw"
                    alt="Painel do salão do restaurante Maré Alta com a Mesa 12 encerrada depois do pagamento"
                    width={560}
                    height={747}
                    loading="lazy"
                    decoding="async"
                    data-on={e === 2 || undefined}
                    className="baixa-depois absolute inset-0 h-full w-full"
                  />
                  {/* Mesa 12: terceira coluna, última linha da grade */}
                  <span
                    aria-hidden
                    data-on={e >= 1 || undefined}
                    className="baixa-alvo absolute left-[66.6%] top-[74.2%] h-[15.2%] w-[30.4%] rounded-[0.9rem]"
                  />
                </div>
              </figure>
              <div
                data-on={e >= 1 || undefined}
                className="baixa-aviso absolute left-[5%] top-[6%] flex max-w-[78%] items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-4 text-[#021E34] shadow-[0_24px_40px_-20px_rgb(2_30_52/0.45)] backdrop-blur sm:left-[7%] sm:top-[7%]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0FC9BD]">
                  <BadgeCheck aria-hidden className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <span className="min-w-0 text-[0.86rem] leading-tight sm:text-[0.92rem]">
                  <span className="block font-medium">Mesa 12 · Pix aprovado</span>
                  <span className="text-[#021E34]/65">
                    <span className="money">R$ 216,00</span> · mesa encerrada
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <Reveal className="mx-auto mt-14 max-w-5xl sm:mt-20">
          {/* Recorte da tela do caixa: só a lista de pagamentos, maior para ler. */}
          <figure className="overflow-hidden rounded-[1.1rem] bg-white shadow-[0_60px_90px_-40px_rgb(2_30_52/0.45),0_0_0_1px_oklch(0.88_0_0)]">
            <div
              aria-hidden
              className="flex h-8 items-center gap-1.5 border-b border-[oklch(0.92_0_0)] bg-[oklch(0.975_0_0)] px-3.5"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="mx-auto h-4 w-2/5 rounded-full bg-[oklch(0.93_0_0)]" />
            </div>
            <div className="sem-barra overflow-x-auto">
              <div className="relative aspect-[1152/780] min-w-[40rem] overflow-hidden">
                <img
                  src={caixa900}
                  srcSet={`${caixa900} 900w, ${caixa1600} 1600w`}
                  sizes="(min-width: 1280px) 100rem, 160vw"
                  alt="Lista de pagamentos do dia no painel do restaurante: hora, mesa, cliente, meio, gorjeta, total e status"
                  width={1600}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                  className="absolute left-[-30.6%] top-[-2.6%] h-auto w-[138.9%] max-w-none"
                />
              </div>
            </div>
          </figure>
          <p className="mt-4 text-sm text-muted-foreground">
            Pagamentos do dia no painel do caixa, com Pix, carteiras digitais e pagamento no
            estabelecimento. Dados de demonstração.
          </p>
        </Reveal>

        <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-4">
          {p.fatos.map((f) => (
            <div key={f.t}>
              <dt className="font-display text-[clamp(2rem,1.4rem+2vw,3rem)] font-normal leading-none tracking-[-0.05em]">
                {f.v}
              </dt>
              <dd className="mt-2 max-w-[15rem] text-[0.92rem] text-muted-foreground">{f.t}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Secao>
  );
}
