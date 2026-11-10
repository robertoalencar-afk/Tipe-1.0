import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TipeLogo } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";
import lebreOla from "@/assets/lebre/rosto-ola.webp";
import lebreDormindo from "@/assets/lebre/rosto-dormindo.webp";
import lebrePensando from "@/assets/lebre/rosto-pensando.webp";
import lebrePiscando from "@/assets/lebre/rosto-piscando.webp";
import lebreFeliz from "@/assets/lebre/rosto-feliz.webp";

export type HumorLebre = "ola" | "senha" | "pensando" | "enviado" | "feliz";

const LEBRE: Record<HumorLebre, string> = {
  ola: lebreOla,
  senha: lebreDormindo,
  pensando: lebrePensando,
  enviado: lebrePiscando,
  feliz: lebreFeliz,
};

/**
 * Login "cartão que vira" (opção A escolhida pelo Roberto em 09/11): um cartão central que
 * gira em 3D entre a frente (entrar) e o verso (esqueci a senha). A lebre espia por cima do
 * cartão e muda de cara conforme o momento; na senha, fecha os olhos.
 */
export function CartaoConta({
  frente,
  verso,
  virado = false,
  humor = "ola",
}: {
  frente: ReactNode;
  verso?: ReactNode;
  virado?: boolean;
  humor?: HumorLebre;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Manchas de cor da marca (turquesa em cima, laranja embaixo) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,var(--brand-primary-soft),transparent_70%),radial-gradient(55%_50%_at_95%_100%,oklch(0.95_0.045_70),transparent_70%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[84rem] flex-col px-4 py-4 sm:px-6 lg:py-6">
        <Link to="/" aria-label="TIPE, voltar ao site" className="w-fit pt-2">
          <TipeLogo variant="dark" className="h-9" />
        </Link>
        <div className="flex flex-1 items-center justify-center pb-10 pt-24">
          <div className="relative w-full max-w-[27rem] [perspective:1600px]">
            {/* A lebre espiando: abaixa um pouco e fecha os olhos quando a senha é digitada */}
            <div
              aria-hidden
              className={cn(
                "absolute left-1/2 top-0 z-10 w-32 -translate-x-1/2 -translate-y-[78%] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                humor === "senha" && "-translate-y-[66%]",
              )}
            >
              {Object.entries(LEBRE).map(([k, src]) => (
                <img
                  key={k}
                  src={src}
                  alt=""
                  width={512}
                  height={512}
                  className={cn(
                    "col-start-1 row-start-1 w-full select-none transition-opacity duration-200",
                    k === humor ? "relative opacity-100" : "absolute inset-0 opacity-0",
                  )}
                />
              ))}
            </div>
            <div
              className={cn(
                "grid transition-transform duration-[800ms] ease-[cubic-bezier(.22,1,.36,1)] [transform-style:preserve-3d] motion-reduce:transition-none",
                virado && "[transform:rotateY(180deg)]",
              )}
            >
              <Face ativa={!virado}>{frente}</Face>
              {verso && (
                <Face ativa={virado} verso>
                  {verso}
                </Face>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Face({
  ativa,
  verso = false,
  children,
}: {
  ativa: boolean;
  verso?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-hidden={!ativa}
      inert={!ativa ? true : undefined}
      className={cn(
        "col-start-1 row-start-1 rounded-[1.75rem] bg-card px-6 pb-7 pt-14 [backface-visibility:hidden] sm:px-8",
        "shadow-[0_40px_80px_-40px_oklch(0.2_0.04_250/0.35),0_0_0_1px_var(--border)]",
        verso && "[transform:rotateY(180deg)]",
      )}
    >
      {children}
    </section>
  );
}

/** Título + texto padrão dentro do cartão. */
export function TituloCartao({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <>
      <h1 className="text-[clamp(1.9rem,1.5rem+1.4vw,2.5rem)] font-medium leading-[1.04] tracking-[-0.04em] [text-wrap:balance]">
        {titulo}
      </h1>
      {children && (
        <div className="mt-2.5 text-[0.98rem] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </>
  );
}
