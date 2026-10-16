/**
 * A lebre e a tartaruga: a tartaruga é o jeito antigo de pagar a conta, a lebre
 * é a Tipe. Abas no formato das "interactive tabs" da sunday: um painel largo
 * com a cena e uma legenda de antes e depois para cada situação.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/tipe/ds";
import { LineReveal, Reveal } from "./motion";
import garcom800 from "@/assets/cenas/lebre-tartaruga-garcom-800.webp";
import garcom1600 from "@/assets/cenas/lebre-tartaruga-garcom-1600.webp";
import dono800 from "@/assets/cenas/lebre-tartaruga-dono-800.webp";
import dono1600 from "@/assets/cenas/lebre-tartaruga-dono-1600.webp";
import cliente800 from "@/assets/cenas/lebre-tartaruga-cliente-800.webp";
import cliente1600 from "@/assets/cenas/lebre-tartaruga-cliente-1600.webp";
import familia800 from "@/assets/cenas/lebre-tartaruga-familia-800.webp";
import familia1600 from "@/assets/cenas/lebre-tartaruga-familia-1600.webp";
import amigos800 from "@/assets/cenas/lebre-tartaruga-amigos-800.webp";
import amigos1600 from "@/assets/cenas/lebre-tartaruga-amigos-1600.webp";
import gorjeta800 from "@/assets/cenas/lebre-tartaruga-gorjeta-800.webp";
import gorjeta1600 from "@/assets/cenas/lebre-tartaruga-gorjeta-1600.webp";

const CENAS = [
  {
    id: "cliente",
    aba: "Cliente",
    p: [cliente800, cliente1600],
    antes: "Termina de comer e fica de braço levantado esperando a conta.",
    depois: "Aponta a câmera para o QR Code, paga e vai embora quando quiser.",
    alt: "A tartaruga espera a conta com a mão levantada; a lebre paga pelo celular no QR Code da mesa.",
  },
  {
    id: "garcom",
    aba: "Garçom",
    p: [garcom800, garcom1600],
    antes: "Corre de mesa em mesa com a maquininha enquanto as mãos ficam no ar.",
    depois: "Serve e atende. Cada mesa paga sozinha, e o garçom vê tudo no celular.",
    alt: "A tartaruga garçom carrega a maquininha entre mesas com mãos levantadas; a lebre garçom serve tranquila.",
  },
  {
    id: "familia",
    aba: "Família",
    p: [familia800, familia1600],
    antes: "Divide a conta na calculadora enquanto as crianças perdem a paciência.",
    depois: "Cada um paga a sua parte: por item, em partes iguais ou por valor.",
    alt: "A família de tartarugas divide a conta de papel na calculadora; a família de lebres paga pelo celular.",
  },
  {
    id: "amigos",
    aba: "Amigos",
    p: [amigos800, amigos1600],
    antes: "Discute quem pediu o quê com a conta impressa no meio da mesa.",
    depois: "Cada um marca o que consumiu e paga só o que é seu.",
    alt: "Amigos tartarugas discutem a conta com moedas; amigos lebres brindam com o celular na mão.",
  },
  {
    id: "gorjeta",
    aba: "Gorjeta",
    p: [gorjeta800, gorjeta1600],
    antes: "Sem dinheiro trocado, o garçom fica sem gorjeta.",
    depois: "Depois de pagar, o cliente pode deixar uma gorjeta extra pelo celular.",
    alt: "A tartaruga garçom olha uma mesa vazia; a lebre garçom recebe uma gorjeta no celular.",
  },
  {
    id: "dono",
    aba: "Dono",
    p: [dono800, dono1600],
    antes: "Fecha o caixa tarde da noite entre notinhas e calculadora.",
    depois: "Acompanha mesas, pagamentos e caixa em tempo real no painel.",
    alt: "A tartaruga dona fecha o caixa no meio de papéis; a lebre dona acompanha o painel no tablet.",
  },
] as const;

export function LebreTartaruga() {
  const [ativa, setAtiva] = useState(0);
  const cena = CENAS[ativa]!;
  return (
    <section id="jeito-tipe" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container-page">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Eyebrow>A lebre e a tartaruga</Eyebrow>
            <LineReveal
              className="mt-4 font-display text-headline font-normal tracking-display"
              lines={["Desta vez,", "a lebre ganha."]}
            />
          </div>
          <Reveal delay={200}>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              A tartaruga é o jeito antigo de pagar a conta. A lebre é a Tipe. Veja a diferença em
              cada lugar do restaurante.
            </p>
          </Reveal>
        </div>

        <div
          role="tablist"
          aria-label="Situações"
          className="-mx-6 mt-10 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
        >
          {CENAS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`aba-${c.id}`}
              aria-selected={i === ativa}
              aria-controls="painel-lebre-tartaruga"
              onClick={() => setAtiva(i)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-5 text-[0.95rem] font-medium transition-colors",
                i === ativa
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground hover:border-foreground/40",
              )}
            >
              {c.aba}
            </button>
          ))}
        </div>

        <div
          id="painel-lebre-tartaruga"
          role="tabpanel"
          aria-labelledby={`aba-${cena.id}`}
          className="mt-6 overflow-hidden rounded-[1.75rem] bg-background-muted sm:rounded-[2.25rem]"
        >
          <div className="relative grid aspect-[1376/768]">
            {CENAS.map((c, i) => (
              <img
                key={c.id}
                src={c.p[1]}
                srcSet={`${c.p[0]} 800w, ${c.p[1]} 1600w`}
                sizes="(min-width: 1344px) 1232px, 100vw"
                alt={i === ativa ? c.alt : ""}
                aria-hidden={i !== ativa}
                width={1376}
                height={768}
                loading="lazy"
                decoding="async"
                className={cn(
                  "col-start-1 row-start-1 h-full w-full object-cover transition-opacity duration-500",
                  i === ativa ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-background-muted p-5 sm:p-7">
              <p className="text-sm font-medium text-muted-foreground">Do jeito antigo</p>
              <p className="mt-2 text-[1.05rem] leading-snug" aria-live="polite">
                {cena.antes}
              </p>
            </div>
            <div className="bg-surface p-5 sm:p-7">
              <p className="text-sm font-medium text-brand-strong">Com a Tipe</p>
              <p className="mt-2 text-[1.05rem] leading-snug">{cena.depois}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
