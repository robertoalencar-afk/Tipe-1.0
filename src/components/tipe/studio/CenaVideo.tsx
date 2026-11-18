/**
 * Aula do Vídeo 3D: um celular de verdade (desenhado) dá a volta em um prato real.
 * - À esquerda, a mesa vista de cima: o prato e o celular andando pelo anel da volta.
 * - À direita, a tela do celular gravando: um modelo 3D real do acervo (public/modelos,
 *   aberto com o <model-viewer>) gira no mesmo ângulo, então o dono vê exatamente o que o
 *   celular enxerga em cada ponto da volta, mais baixo na volta 1 e mais de cima na volta 2.
 * Com movimento reduzido, a cena fica parada num ângulo e o treino mostra só o cronômetro.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carregarModelViewer } from "@/lib/tipe/model-viewer";
import { useMovimentoReduzido } from "../site/produto/useVisivel";
import { Aparelho } from "./Aparelho";

export type ModoVideo = "palco" | "baixa" | "alta" | "ritmo";

const VOLTA = 25; // segundos por volta
const TOTAL = VOLTA * 2;
const MODELO = "/modelos/pastel-triposr.glb";
const PRATO = "/cardapio/pastel-1080.webp";

function useRelogio(modo: ModoVideo, reduzido: boolean) {
  const [t, setT] = useState(modo === "alta" ? VOLTA + 3 : 3);
  const [rodando, setRodando] = useState(modo !== "ritmo" && !reduzido);
  const base = useRef(0);
  useEffect(() => {
    setT(modo === "alta" ? VOLTA + 3 : modo === "ritmo" ? 0 : 3);
    setRodando(modo !== "ritmo" && !reduzido);
  }, [modo, reduzido]);
  useEffect(() => {
    if (!rodando) return;
    let raf = 0;
    base.current = performance.now() / 1000 - t;
    const tick = () => {
      const s = performance.now() / 1000 - base.current;
      if (modo === "ritmo") {
        if (s >= TOTAL) {
          setT(TOTAL);
          setRodando(false);
          return;
        }
        setT(s);
      } else {
        // Nas aulas de cada volta, a mesma volta se repete.
        const ini = modo === "alta" ? VOLTA : 0;
        setT(ini + ((((s - ini) % VOLTA) + VOLTA) % VOLTA));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodando, modo]);
  return { t, setT, rodando, setRodando };
}

export function CenaVideo({ modo }: { modo: ModoVideo }) {
  const reduzido = useMovimentoReduzido();
  const { t, setT, rodando, setRodando } = useRelogio(modo, reduzido);
  const [mv, setMv] = useState(false);
  const visor = useRef<HTMLElement>(null);
  useEffect(() => {
    carregarModelViewer()
      .then(() => setMv(true))
      .catch(() => setMv(false));
  }, []);

  const segunda = t >= VOLTA;
  const fracao = (t % VOLTA) / VOLTA;
  const ang = fracao * 360; // graus, a partir da frente do prato
  const phi = modo === "palco" ? 70 : segunda ? 42 : 76;
  useEffect(() => {
    visor.current?.setAttribute("camera-orbit", `${ang}deg ${phi}deg 135%`);
  }, [ang, phi]);

  const raio = segunda ? 34 : 42; // % da mesa vista de cima
  const rad = ((ang + 90) * Math.PI) / 180;
  const x = 50 + raio * Math.cos(rad);
  const y = 50 + raio * Math.sin(rad);
  const fim = modo === "ritmo" && t >= TOTAL;
  const seg = Math.floor(t);
  const gravando = modo !== "palco" && (rodando || t > 0) && !fim;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-3 sm:gap-6">
        {/* Mesa vista de cima */}
        <figure>
          <div
            className="relative aspect-square w-full rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, #6b4a33 0%, #4a3222 55%, #2c1d14 100%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,.55), 0 30px 60px -30px rgba(0,0,0,.7)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(92deg, rgba(255,255,255,.06) 0 2px, transparent 2px 9px)",
              }}
            />
            {[42, 34].map((r, i) => {
              const on = modo === "palco" || (i === 0 ? !segunda : segunda);
              return (
                <span
                  key={r}
                  aria-hidden
                  className={cn(
                    "absolute rounded-full border-2 border-dashed transition-colors",
                    on ? "border-teal-300/90" : "border-white/20",
                  )}
                  style={{ inset: `${50 - r}%` }}
                />
              );
            })}
            <img
              src={PRATO}
              alt=""
              className="absolute inset-[29%] size-[42%] rounded-full object-cover object-[50%_68%] ring-4 ring-white/90 shadow-[0_12px_24px_rgba(0,0,0,.55)]"
            />
            {modo !== "palco" && (
              <span
                aria-hidden
                className="absolute h-[2px] origin-left bg-gradient-to-r from-teal-300/70 to-transparent"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${raio - 18}%`,
                  transform: `rotate(${ang + 270}deg)`,
                }}
              />
            )}
            <span
              aria-hidden
              className="absolute h-[15%] w-[8%] -translate-x-1/2 -translate-y-1/2 rounded-[28%/16%] p-[1.2%] shadow-[0_6px_14px_rgba(0,0,0,.6)]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%,-50%) rotate(${ang}deg)`,
                background: "linear-gradient(145deg,#e9e5de,#8f8a83 50%,#cfcac2)",
              }}
            >
              <span className="block h-full w-full rounded-[24%/13%] bg-[#111]">
                <span className="absolute left-[22%] top-[10%] size-[26%] rounded-full bg-[#2a2a2a] ring-1 ring-white/20" />
              </span>
            </span>
          </div>
          <figcaption className="mt-3 text-center text-xs text-white/70">
            {modo === "palco"
              ? "Espaço livre em volta do prato"
              : segunda
                ? "Volta 2: mais de cima, anel menor"
                : "Volta 1: na altura do rosto"}
          </figcaption>
        </figure>

        {/* O que o celular grava */}
        <figure className="mx-auto w-full max-w-[11rem]">
          <Aparelho>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 70% at 50% 85%, #6b4a33 0%, #3b281b 55%, #1d140e 100%)",
              }}
            />
            {mv && (
              <model-viewer
                ref={visor}
                src={MODELO}
                alt="Prato real em 3D, visto pelo celular"
                shadow-intensity="1.4"
                shadow-softness="0.6"
                environment-image="neutral"
                exposure="1.05"
                interaction-prompt="none"
                max-camera-orbit="auto auto 400%"
                camera-orbit={`${ang}deg ${phi}deg 135%`}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {[1, 2].map((i) => (
                <span
                  key={`v${i}`}
                  className="absolute inset-y-0 w-px bg-white/15"
                  style={{ left: `${(i * 100) / 3}%` }}
                />
              ))}
              {[1, 2].map((i) => (
                <span
                  key={`h${i}`}
                  className="absolute inset-x-0 h-px bg-white/15"
                  style={{ top: `${(i * 100) / 3}%` }}
                />
              ))}
            </div>
            <div className="absolute inset-x-0 top-[7%] flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white",
                  gravando ? "bg-red-600" : "bg-black/50",
                )}
              >
                {gravando && (
                  <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
                )}
                00:{String(Math.min(seg, 59)).padStart(2, "0")}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-[5%] flex justify-center">
              <span className="grid size-9 place-items-center rounded-full border-[3px] border-white/90">
                <span
                  className={cn(
                    "bg-red-600",
                    gravando ? "size-3.5 rounded-[3px]" : "size-6 rounded-full",
                  )}
                />
              </span>
            </div>
          </Aparelho>
          <figcaption className="mt-3 text-center text-xs text-teal-200">
            O que o celular grava
          </figcaption>
        </figure>
      </div>

      {modo === "ritmo" && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="h-10 rounded-full bg-teal-400 px-4 text-[#071d2b] hover:bg-teal-300"
            onClick={() => {
              if (fim) setT(0);
              setRodando((r) => !r);
            }}
          >
            {rodando ? (
              <Pause className="size-3.5" />
            ) : fim ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {rodando ? "Pausar" : fim ? "De novo" : t > 0 ? "Continuar" : "Treinar"}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs text-white/75" aria-live="polite">
              <span>
                {fim
                  ? "Pronto: é esse o ritmo."
                  : t === 0
                    ? "50 segundos, duas voltas"
                    : segunda
                      ? "Volta 2: mais de cima"
                      : "Volta 1: na altura do rosto"}
              </span>
              <span className="tabular-nums">0:{String(seg).padStart(2, "0")}</span>
            </div>
            <div className="mt-1.5 flex h-1.5 gap-1">
              {[0, 1].map((i) => (
                <div key={i} className="h-full flex-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-teal-400"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((t - i * VOLTA) / VOLTA) * 100))}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
