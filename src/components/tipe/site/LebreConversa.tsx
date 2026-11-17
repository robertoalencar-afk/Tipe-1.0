/**
 * A Lebre de corpo inteiro conversando: troca de pose a cada fala e mostra balões que
 * "digitam" antes de aparecer. Parada na última fala com movimento reduzido.
 */
import { useEffect, useState } from "react";
import { useMovimentoReduzido, useVisivel } from "@/components/tipe/site/produto/useVisivel";
import { cn } from "@/lib/utils";
import espera from "@/assets/mascot-waiting.webp";
import obrigada from "@/assets/mascot-thanks.webp";
import conta from "@/assets/mascot-table-closed.webp";
import estrela from "@/assets/mascot-rating.webp";

export type Fala = {
  quem: "lebre" | "cliente";
  texto: string;
  pose?: "espera" | "obrigada" | "conta" | "estrela";
};

const POSES = { espera, obrigada, conta, estrela } as const;

const PADRAO: Fala[] = [
  { quem: "lebre", texto: "Oi! Eu sou a Lebre da Tipe.", pose: "espera" },
  { quem: "cliente", texto: "Como a conta chega na mesa?" },
  { quem: "lebre", texto: "Pelo QR Code do totem. Sem baixar app.", pose: "conta" },
  { quem: "cliente", texto: "E se a gente dividir?" },
  { quem: "lebre", texto: "Cada um paga o que consumiu.", pose: "obrigada" },
  { quem: "lebre", texto: "Preencha o formulário e a equipe te mostra tudo.", pose: "estrela" },
];

const PASSO_MS = 2600;

export function LebreConversa({
  falas = PADRAO,
  className,
}: {
  falas?: Fala[];
  className?: string;
}) {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduz = useMovimentoReduzido();
  const [n, setN] = useState(0); // quantas falas já apareceram
  const [digitando, setDigitando] = useState(false);

  useEffect(() => {
    if (reduz || !visivel) return;
    let vivo = true;
    const timers: number[] = [];
    const depois = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(() => vivo && fn(), ms));
    const avancar = (i: number) => {
      if (i >= falas.length) {
        depois(4200, () => {
          setN(0);
          avancar(0);
        });
        return;
      }
      setDigitando(true);
      depois(900, () => {
        setDigitando(false);
        setN(i + 1);
        depois(PASSO_MS, () => avancar(i + 1));
      });
    };
    avancar(n);
    return () => {
      vivo = false;
      timers.forEach(window.clearTimeout);
    };
    // reinicia só ao entrar/sair da tela; n é o ponto de retomada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, reduz, falas]);

  const mostradas = reduz ? falas : falas.slice(0, n);
  const recentes = mostradas.slice(-3);
  const ultimaLebre = [...mostradas].reverse().find((f) => f.pose);
  const pose = POSES[ultimaLebre?.pose ?? "espera"];
  const proxima = falas[n];

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A Lebre da Tipe conversando sobre como a conta chega na mesa"
      className={cn("flex items-end gap-4", className)}
    >
      <div className="relative h-48 w-44 shrink-0 sm:h-56 sm:w-52">
        <span
          key={`s${n}`}
          aria-hidden
          className="lebre-sombra absolute bottom-1 left-1/2 h-3 w-24 -translate-x-1/2 rounded-[50%] bg-foreground/30 blur-[3px]"
        />
        {pose === estrela && (
          <>
            {[
              ["left-[12%] top-[28%]", "0ms"],
              ["right-[6%] top-[20%]", "500ms"],
              ["right-[16%] top-[48%]", "950ms"],
            ].map(([pos, d]) => (
              <span
                key={pos}
                aria-hidden
                className={cn("brilho absolute text-lg text-brand-strong", pos)}
                style={{ animationDelay: d }}
              >
                ✦
              </span>
            ))}
          </>
        )}
        <div key={`p${n}`} className="lebre-pulo absolute inset-0">
          {(Object.keys(POSES) as (keyof typeof POSES)[]).map((k) => (
            <img
              key={k}
              src={POSES[k]}
              alt=""
              aria-hidden
              width={640}
              height={640}
              className={cn(
                "lebre-balanco absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-500",
                POSES[k] === pose ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
        </div>
      </div>
      <ul
        aria-hidden
        className="flex min-h-[10.5rem] min-w-0 flex-1 flex-col justify-end gap-2 pb-4"
      >
        {recentes.map((f, i) => (
          <li
            key={f.texto}
            className={cn(
              "pop-in max-w-[17rem] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-snug",
              f.quem === "lebre"
                ? "self-start rounded-bl-md bg-brand/20 text-foreground"
                : "self-end rounded-br-md bg-foreground text-background",
              i < recentes.length - 1 && "opacity-70",
            )}
          >
            {f.texto}
          </li>
        ))}
        {digitando && proxima && (
          <li
            className={cn(
              "flex w-fit gap-1 rounded-2xl px-4 py-3",
              proxima.quem === "lebre"
                ? "self-start rounded-bl-md bg-brand/20"
                : "self-end rounded-br-md bg-foreground/10",
            )}
          >
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="ponto-digitando h-1.5 w-1.5 rounded-full bg-foreground/60"
                style={{ animationDelay: `${d * 150}ms` }}
              />
            ))}
          </li>
        )}
      </ul>
    </div>
  );
}
