/**
 * A lebre e a tartaruga: a tartaruga é o jeito antigo de pagar a conta, a lebre é a Tipe.
 * O vídeo conta a história sozinho (V5: saiu a repetição em fotos estáticas que vinha depois).
 * As cenas estáticas continuam em src/assets/cenas/ como fonte.
 */
import { Eyebrow } from "@/components/tipe/ds";
import { LineReveal, Reveal } from "./motion";
import { MascoteVivo } from "@/components/tipe/site/MascoteVivo";
import { VideoLebre } from "@/components/tipe/site/VideoLebre";

export function LebreTartaruga() {
  return (
    <section id="jeito-tipe" className="scroll-mt-16 py-12 sm:py-16 lg:py-20">
      <div className="container-page">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="relative">
            <MascoteVivo className="absolute -top-16 right-0 w-24 sm:-top-20 sm:w-28 lg:hidden" />
            <Eyebrow>A lebre e a tartaruga</Eyebrow>
            <LineReveal
              className="mt-4 font-display text-headline font-normal tracking-display"
              lines={["Desta vez,", "a lebre ganha."]}
            />
          </div>
          <Reveal delay={200} className="relative">
            <MascoteVivo className="absolute -top-36 right-4 hidden w-32 lg:block" alt="" />
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              A tartaruga é o jeito antigo de pagar a conta. A lebre é a Tipe. Veja a diferença em
              cada lugar do restaurante.
            </p>
          </Reveal>
        </div>

        <Reveal delay={150} className="mt-10 sm:mt-14">
          <VideoLebre />
        </Reveal>
      </div>
    </section>
  );
}
