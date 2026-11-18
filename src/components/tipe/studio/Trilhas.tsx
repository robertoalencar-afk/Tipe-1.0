/**
 * Aulas do Studio: três trilhas (foto do prato, foto com volume, vídeo 3D), cada uma em passos
 * curtos com um diagrama da cena. A trilha do vídeo tem um treino de ritmo: o celular desenhado
 * percorre as duas voltas no tempo certo, para o dono ensaiar antes de gravar no Scanner 3D.
 */
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Camera,
  ChevronLeft,
  ChevronRight,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMovimentoReduzido } from "../site/produto/useVisivel";
import { Ilustracao, Orbita, type TipoIlustracao } from "./Ilustracoes";
import { VIDEO_MAX, VIDEO_MIN } from "./analise";

export type TrilhaId = "foto" | "volume" | "video";
type Passo = {
  titulo: string;
  texto: string;
  porque: string;
  checar: string[];
  arte: TipoIlustracao | "orbita-baixa" | "orbita-alta" | "ritmo";
};

const TRILHAS: Record<
  TrilhaId,
  { nome: string; resumo: string; tempo: string; icone: typeof Camera; passos: Passo[] }
> = {
  foto: {
    nome: "Foto do prato",
    resumo: "A foto que vira story no celular do cliente.",
    tempo: "2 min por prato",
    icone: Camera,
    passos: [
      {
        titulo: "Monte a cena",
        texto: "Prato montado como sai para o cliente, borda limpa, mesa lisa ou toalha neutra.",
        porque: "Copo, celular ou mão no quadro tiram o olho do prato.",
        checar: [
          "Borda do prato sem respingos",
          "Nada além do prato na mesa",
          "Talher só se fizer parte",
        ],
        arte: "cena",
      },
      {
        titulo: "Luz de janela, de lado",
        texto: "Leve o prato até a janela e deixe a luz entrar pela lateral. Sem flash.",
        porque: "Luz lateral cria sombra suave e mostra a textura. Flash achata e brilha.",
        checar: ["Sem sol batendo direto", "Flash desligado", "Sombra suave do outro lado"],
        arte: "luz",
      },
      {
        titulo: "Ângulo de 45°",
        texto: "Celular na altura de quem está sentado à mesa, inclinado para o prato.",
        porque:
          "É o ângulo que o cliente vê quando o prato chega. De cima, só serve para pizza e bowl.",
        checar: ["Nem de cima, nem de frente", "Prato inteiro visível", "Fundo sem bagunça"],
        arte: "angulo",
      },
      {
        titulo: "Na vertical, prato no centro",
        texto: "Segure o celular em pé e deixe uma margem em volta do prato.",
        porque: "O story ocupa a tela inteira em pé. Nada cortado na borda.",
        checar: ["Celular em pé", "Prato no centro da grade", "Margem dos quatro lados"],
        arte: "vertical",
      },
      {
        titulo: "Foco e disparo",
        texto: "Limpe a lente na camiseta, use a câmera 1x, toque no prato e tire três fotos.",
        porque: "Zoom digital e lente engordurada são as maiores causas de foto borrada.",
        checar: ["Lente limpa", "Câmera 1x, sem zoom", "Três fotos, escolha a melhor"],
        arte: "foco",
      },
    ],
  },
  volume: {
    nome: "Foto com volume",
    resumo: "A mesma foto ganha profundidade e se mexe com o celular.",
    tempo: "Automático",
    icone: Layers,
    passos: [
      {
        titulo: "Como o volume nasce",
        texto:
          "Quando você salva a foto, o seu navegador calcula um mapa de volume: quanto mais claro, mais perto. O cardápio usa esse mapa para dar profundidade.",
        porque: "Roda no seu aparelho, de graça, sem enviar a foto para nenhuma IA externa.",
        checar: ["Uma foto só", "Nenhum custo por prato", "Funciona em qualquer celular"],
        arte: "volume",
      },
      {
        titulo: "Prato com altura",
        texto: "O efeito é mais bonito em prato com relevo: hambúrguer, sobremesa, porção montada.",
        porque: "Prato raso e foto de cima dão pouco volume para o mapa separar.",
        checar: ["Ângulo de 45°", "Prato destacado do fundo", "Fundo um pouco mais longe"],
        arte: "relevo",
      },
      {
        titulo: "Sem modo retrato",
        texto:
          "Use a câmera normal. O desfoque do modo retrato confunde o mapa e cria bordas tremidas.",
        porque: "O volume já faz o papel do desfoque, sem recortar errado a borda do prato.",
        checar: ["Modo foto, não retrato", "Flash desligado", "Teste no ensaio abaixo"],
        arte: "luz3d",
      },
    ],
  },
  video: {
    nome: "Vídeo 3D",
    resumo: "Grave uma volta no prato e a Tipe monta um modelo 3D que o cliente gira e vê na mesa.",
    tempo: `${VIDEO_MIN} a ${VIDEO_MAX} s de vídeo`,
    icone: Box,
    passos: [
      {
        titulo: "Prepare o palco",
        texto:
          "Prato no centro de uma mesa com espaço para você andar em volta. Ninguém mexe no prato.",
        porque:
          "O modelo é montado comparando os quadros: se o prato muda, as peças não se encaixam.",
        checar: [
          "Dá para andar em volta",
          "Prato parado até o fim",
          "Mesa lisa, sem toalha estampada",
        ],
        arte: "palco",
      },
      {
        titulo: "Luz clara, sem sombra dura",
        texto: "Ambiente bem iluminado e luz por igual. Caldo brilhante e vidro saem piores.",
        porque: "Reflexo muda de lugar a cada passo e engana a reconstrução.",
        checar: ["Sem sol direto", "Sem flash nem lanterna", "Evite caldo brilhante e copos"],
        arte: "luz3d",
      },
      {
        titulo: "Volta 1: baixa",
        texto: "Comece a gravar e dê uma volta inteira na altura do rosto de quem está sentado.",
        porque: "Essa volta mostra as laterais do prato, que a foto comum nunca pega.",
        checar: [
          "Prato inteiro sempre na tela",
          "Passos curtos e lentos",
          "Celular firme, perto do corpo",
        ],
        arte: "orbita-baixa",
      },
      {
        titulo: "Volta 2: mais de cima",
        texto: "Sem parar o vídeo, levante o celular e dê a segunda volta olhando mais de cima.",
        porque: "Essa volta mostra o topo e fecha o modelo sem buracos.",
        checar: ["Não pare a gravação", "Prato no centro da tela", "Mesmo ritmo da volta 1"],
        arte: "orbita-alta",
      },
      {
        titulo: "Treine o ritmo",
        texto: `As duas voltas juntas levam de ${VIDEO_MIN} a ${VIDEO_MAX} segundos. Toque em Treinar e acompanhe o celular desenhado.`,
        porque: "Rápido demais sai tremido; devagar demais não muda nada e só pesa o envio.",
        checar: [
          "Cerca de 25 s por volta",
          "Termine onde começou",
          "Depois, teste o vídeo no ensaio",
        ],
        arte: "ritmo",
      },
    ],
  },
};

const RITMO_TOTAL = 50;

function TreinoRitmo() {
  const reduzido = useMovimentoReduzido();
  const [t, setT] = useState(0);
  const [rodando, setRodando] = useState(false);
  const inicio = useRef(0);
  useEffect(() => {
    if (!rodando) return;
    inicio.current = performance.now() - t * 1000;
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - inicio.current) / 1000;
      if (s >= RITMO_TOTAL) {
        setT(RITMO_TOTAL);
        setRodando(false);
        return;
      }
      setT(s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodando]);
  const meia = RITMO_TOTAL / 2;
  const volta = t < meia ? "baixa" : "alta";
  const ang = Math.PI * 0.5 + ((t % meia) / meia) * Math.PI * 2;
  const fim = t >= RITMO_TOTAL;
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Orbita
          volta={rodando || t > 0 ? volta : "ambas"}
          angulo={reduzido && rodando ? undefined : ang}
        />
      </div>
      <div className="flex items-center gap-3 px-2 pb-1">
        <Button
          size="sm"
          className="rounded-full bg-teal-400 text-[#071d2b] hover:bg-teal-300"
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
          <div className="flex justify-between text-[11px] text-white/70" aria-live="polite">
            <span>
              {fim
                ? "Pronto: é esse o ritmo."
                : t === 0
                  ? "50 s, duas voltas"
                  : volta === "baixa"
                    ? "Volta 1 · baixa"
                    : "Volta 2 · de cima"}
            </span>
            <span className="tabular-nums">0:{String(Math.floor(t)).padStart(2, "0")}</span>
          </div>
          <div className="mt-1 flex h-1.5 gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="h-full flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-teal-400"
                  style={{ width: `${Math.min(100, Math.max(0, ((t - i * meia) / meia) * 100))}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Trilhas({
  trilha,
  onTrilha,
  feitos,
  onEnsaiar,
}: {
  trilha: TrilhaId;
  onTrilha: (t: TrilhaId) => void;
  feitos: Record<TrilhaId, string>;
  onEnsaiar: (t: TrilhaId) => void;
}) {
  const [passo, setPasso] = useState(0);
  const tr = TRILHAS[trilha];
  const p = tr.passos[passo]!;
  useEffect(() => setPasso(0), [trilha]);
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div
        role="tablist"
        aria-label="Trilhas do Studio"
        className="grid grid-cols-3 border-b border-border"
      >
        {(Object.keys(TRILHAS) as TrilhaId[]).map((id) => {
          const x = TRILHAS[id];
          const Icon = x.icone;
          const on = id === trilha;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="studio-aula"
              onClick={() => onTrilha(id)}
              className={cn(
                "relative flex min-h-16 flex-col items-start gap-0.5 px-3 py-3 text-left transition sm:flex-row sm:items-center sm:gap-3 sm:px-5",
                on ? "bg-background" : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  on ? "bg-[#071d2b] text-teal-300" : "bg-background",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-foreground">
                  {x.nome}
                </span>
                <span className="hidden text-xs sm:block">{feitos[id]}</span>
              </span>
              {on && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-500" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div
        id="studio-aula"
        role="tabpanel"
        className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      >
        <div className="relative aspect-[16/11] bg-[#071d2b] p-3 sm:p-5 lg:aspect-auto lg:min-h-[22rem]">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <p className="relative text-[11px] font-medium uppercase tracking-[0.18em] text-teal-300">
            {tr.nome} · passo {passo + 1} de {tr.passos.length}
          </p>
          <div className="relative h-[calc(100%-1.5rem)]">
            {p.arte === "ritmo" ? (
              <TreinoRitmo />
            ) : p.arte === "orbita-baixa" ? (
              <Orbita volta="baixa" />
            ) : p.arte === "orbita-alta" ? (
              <Orbita volta="alta" angulo={Math.PI * 1.15} />
            ) : (
              <Ilustracao tipo={p.arte} />
            )}
          </div>
        </div>
        <div className="flex flex-col p-5 sm:p-7">
          <p className="text-xs text-muted-foreground">
            {tr.resumo} <span className="whitespace-nowrap">· {tr.tempo}</span>
          </p>
          <h4 className="mt-3 font-display text-xl font-semibold leading-snug">{p.titulo}</h4>
          <p className="mt-2 text-sm leading-relaxed">{p.texto}</p>
          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Por quê: </span>
            {p.porque}
          </p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {p.checar.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <div className="flex gap-1.5" aria-hidden>
              {tr.passos.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === passo
                      ? "w-6 bg-teal-500"
                      : i < passo
                        ? "w-1.5 bg-teal-500/50"
                        : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-full"
                aria-label="Passo anterior"
                disabled={passo === 0}
                onClick={() => setPasso((n) => n - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {passo < tr.passos.length - 1 ? (
                <Button className="h-11 rounded-full px-5" onClick={() => setPasso((n) => n + 1)}>
                  Próximo passo <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button className="h-11 rounded-full px-5" onClick={() => onEnsaiar(trilha)}>
                  {trilha === "video" ? "Testar meu vídeo" : "Testar minha foto"}{" "}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
