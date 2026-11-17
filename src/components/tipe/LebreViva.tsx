import { useEffect, useRef, useState } from "react";
import { MascoteVivo } from "@/components/tipe/site/MascoteVivo";
import corpo from "@/assets/lebre/vivo/corpo.webp";
import maos from "@/assets/lebre/vivo/maos.webp";
import rostoFeliz from "@/assets/lebre/rosto-feliz.webp";
import rostoDormindo from "@/assets/lebre/rosto-dormindo.webp";
import rostoPensando from "@/assets/lebre/rosto-pensando.webp";
import rostoSurpresa from "@/assets/lebre/rosto-surpresa.webp";
import { cn } from "@/lib/utils";

export type Humor = "normal" | "feliz" | "sono" | "preocupada" | "surpresa";

/** Evento que deixa a Lebre feliz (ex.: uma ação confirmada pela Lebre deu certo). */
export const LEBRE_FELIZ = "tipe:lebre-feliz";
export function comemorar() {
  window.dispatchEvent(new Event(LEBRE_FELIZ));
}

const ROSTO: Partial<Record<Humor, string>> = {
  feliz: rostoFeliz,
  sono: rostoDormindo,
  preocupada: rostoPensando,
  surpresa: rostoSurpresa,
};

/** Tempo sem mexer no painel até a Lebre cochilar. */
export const SONO_MS = 2 * 60_000;
/** Tempo com pendência aberta até a Lebre ficar preocupada. */
export const PREOCUPA_MS = 5 * 60_000;

/** Decide o humor da Lebre. Funções puras para dar para testar. */
export function decidirHumor(opts: {
  agora: number;
  ultimaAtividade: number;
  felizAte: number;
  surpresaAte: number;
  pendenciaDesde: number | null;
}): Humor {
  if (opts.felizAte > opts.agora) return "feliz";
  if (opts.surpresaAte > opts.agora) return "surpresa";
  if (opts.agora - opts.ultimaAtividade >= SONO_MS) return "sono";
  if (opts.pendenciaDesde !== null && opts.agora - opts.pendenciaDesde >= PREOCUPA_MS)
    return "preocupada";
  return "normal";
}

/**
 * A Lebre de corpo inteiro com vida: a cabeça em camadas pisca, mexe orelhas e bigodes,
 * fareja e olha para o cursor; o corpo respira e as mãos se mexem. Ela reage ao que
 * acontece: feliz quando uma tarefa é concluída, com sono quando ninguém mexe no painel,
 * preocupada quando uma pendência fica muito tempo sem solução.
 */
export function useHumorDaLebre(pendencias: number): Humor {
  const [agora, setAgora] = useState(() => Date.now());
  const atividade = useRef(Date.now());
  const felizAte = useRef(0);
  const surpresaAte = useRef(0);
  const desde = useRef<number | null>(null);
  const anterior = useRef(pendencias);

  if (pendencias > 0 && desde.current === null) desde.current = Date.now();
  if (pendencias === 0) desde.current = null;

  useEffect(() => {
    // Pendência resolvida também é tarefa concluída.
    if (pendencias < anterior.current) {
      felizAte.current = Date.now() + 3000;
      setAgora(Date.now());
    }
    anterior.current = pendencias;
  }, [pendencias]);

  useEffect(() => {
    const mexeu = () => {
      const dormindo = Date.now() - atividade.current >= SONO_MS;
      atividade.current = Date.now();
      if (dormindo) {
        surpresaAte.current = Date.now() + 1400;
        setAgora(Date.now());
      }
    };
    const feliz = () => {
      felizAte.current = Date.now() + 3000;
      setAgora(Date.now());
    };
    const eventos = ["pointermove", "keydown", "touchstart", "scroll"] as const;
    for (const e of eventos) window.addEventListener(e, mexeu, { passive: true });
    window.addEventListener(LEBRE_FELIZ, feliz);
    const id = window.setInterval(() => setAgora(Date.now()), 5000);
    return () => {
      for (const e of eventos) window.removeEventListener(e, mexeu);
      window.removeEventListener(LEBRE_FELIZ, feliz);
      window.clearInterval(id);
    };
  }, []);

  return decidirHumor({
    agora,
    ultimaAtividade: atividade.current,
    felizAte: felizAte.current,
    surpresaAte: surpresaAte.current,
    pendenciaDesde: desde.current,
  });
}

export function LebreViva({ humor, className }: { humor: Humor; className?: string }) {
  const rosto = ROSTO[humor];
  return (
    <span
      className={cn(
        "lebre-viva relative block aspect-[384/640]",
        `lebre-humor-${humor}`,
        className,
      )}
      role="img"
      aria-label={
        humor === "feliz"
          ? "Lebre feliz"
          : humor === "sono"
            ? "Lebre cochilando"
            : humor === "preocupada"
              ? "Lebre preocupada"
              : "Lebre de corpo inteiro"
      }
    >
      <span className="lebre-corpo absolute inset-0 block">
        <img
          src={corpo}
          alt=""
          className="absolute inset-0 h-full w-full"
          width={384}
          height={640}
        />
        <img
          src={maos}
          alt=""
          className="lebre-maos absolute inset-0 h-full w-full"
          width={384}
          height={640}
        />
        <span
          className="lebre-cabeca absolute block"
          style={{ left: "8.67%", top: "7.37%", width: "82.66%" }}
        >
          <span className="relative block aspect-square">
            <MascoteVivo
              expressive
              className={cn(
                "absolute inset-0 h-full w-full transition-opacity duration-300",
                rosto && "opacity-0",
              )}
            />
            {rosto && (
              <img
                key={humor}
                src={rosto}
                alt=""
                className="lebre-expressao absolute inset-0 h-full w-full"
                // O rosto dormindo vem num enquadramento maior: ajusta ao tamanho da cabeça.
                style={
                  humor === "sono"
                    ? {
                        transform: "translate(20%, 48%) scale(0.6)",
                        transformOrigin: "0 0",
                        animation: "none",
                      }
                    : undefined
                }
                width={512}
                height={512}
              />
            )}
          </span>
        </span>
      </span>
      {humor === "sono" && (
        <span
          aria-hidden
          className="lebre-zz absolute right-[8%] top-[24%] font-display text-sm font-semibold text-brand-strong"
        >
          z<span className="text-xs">z</span>
          <span className="text-[10px]">z</span>
        </span>
      )}
    </span>
  );
}
