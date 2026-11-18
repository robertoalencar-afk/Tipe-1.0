/**
 * Aulas do Estúdio: três trilhas (foto do prato, foto com volume, vídeo 3D), cada uma em passos
 * curtos com um diagrama da cena. A trilha do vídeo tem um treino de ritmo: o celular desenhado
 * percorre as duas voltas no tempo certo, para o dono ensaiar antes de gravar no Scanner 3D.
 */
import { useEffect, useState } from "react";
import { Box, Camera, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CenaVideo, type ModoVideo } from "./CenaVideo";
import { CenaFoto, type Cena } from "./Comparacao";
import { VIDEO_MAX, VIDEO_MIN } from "./analise";

export type TrilhaId = "foto" | "volume" | "video";
type Passo = {
  titulo: string;
  texto: string;
  porque: string;
  checar: string[];
  /** Aula com fotos reais (certo e errado); quando existe, substitui o diagrama. */
  cena?: Cena;
  /** Aula do vídeo: celular dando a volta num prato 3D real. */
  video?: ModoVideo;
};

const C = "/cardapio/";

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
        cena: {
          tipo: "comparar",
          certo: {
            src: C + "bistro/bt-pudim.webp",
            legenda: "Só o prato, borda limpa, fundo calmo",
          },
          errado: {
            src: C + "bistro/bt-moqueca.webp",
            legenda: "Copos, talheres e toalha estampada roubam a cena",
          },
        },
      },
      {
        titulo: "Luz de janela, de lado",
        texto: "Leve o prato até a janela e deixe a luz entrar pela lateral. Sem flash.",
        porque: "Luz lateral cria sombra suave e mostra a textura. Flash achata e brilha.",
        checar: ["Sem sol batendo direto", "Flash desligado", "Sombra suave do outro lado"],
        cena: {
          tipo: "comparar",
          certo: { src: C + "baiao-1080.webp", legenda: "Luz de janela pela lateral", guia: "luz" },
          errado: {
            src: C + "baiao-1080.webp",
            legenda: "Longe da janela: escura e sem cor",
            filtro: "brightness(.42) saturate(.55) contrast(.9)",
            simulacao: true,
          },
        },
      },
      {
        titulo: "Ângulo de 45°",
        texto: "Celular na altura de quem está sentado à mesa, inclinado para o prato.",
        porque:
          "É o ângulo que o cliente vê quando o prato chega. De cima, só serve para pizza e bowl.",
        checar: ["Nem de cima, nem de frente", "Prato inteiro visível", "Fundo sem bagunça"],
        cena: {
          tipo: "comparar",
          certo: {
            src: C + "cartola-1080.webp",
            legenda: "45°: mostra a altura do prato",
            guia: "angulo",
          },
          errado: {
            src: C + "bistro/bt-risoto.webp",
            legenda: "De cima: o prato fica achatado",
          },
        },
      },
      {
        titulo: "Na vertical, prato no centro",
        texto: "Segure o celular em pé e deixe uma margem em volta do prato.",
        porque: "O story ocupa a tela inteira em pé. Nada cortado na borda.",
        checar: ["Celular em pé", "Prato no centro da grade", "Margem dos quatro lados"],
        cena: {
          tipo: "comparar",
          certo: {
            src: C + "pastel-1080.webp",
            legenda: "Em pé, prato no centro, margem em volta",
            guia: "grade",
          },
          errado: {
            src: C + "bistro/bt-picanha.webp",
            legenda: "Prato cortado e garfo entrando no quadro",
          },
        },
      },
      {
        titulo: "Foco e disparo",
        texto: "Limpe a lente na camiseta, use a câmera 1x, toque no prato e tire três fotos.",
        porque: "Zoom digital e lente engordurada são as maiores causas de foto borrada.",
        checar: ["Lente limpa", "Câmera 1x, sem zoom", "Três fotos, escolha a melhor"],
        cena: {
          tipo: "comparar",
          certo: {
            src: C + "bistro/mar-baiao.webp",
            legenda: "Toque no prato para focar",
            guia: "foco",
          },
          errado: {
            src: C + "bistro/mar-baiao.webp",
            legenda: "Lente suja ou mão tremendo",
            filtro: "blur(3.5px) saturate(.9)",
            simulacao: true,
          },
        },
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
        cena: {
          tipo: "volume",
          foto: C + "baiao-1080.webp",
          profundidade: C + "baiao-depth.png",
        },
      },
      {
        titulo: "Prato com altura",
        texto: "O efeito é mais bonito em prato com relevo: hambúrguer, sobremesa, porção montada.",
        porque: "Prato raso e foto de cima dão pouco volume para o mapa separar.",
        checar: ["Ângulo de 45°", "Prato destacado do fundo", "Fundo um pouco mais longe"],
        cena: {
          tipo: "comparar",
          certo: { src: C + "cartola-1080.webp", legenda: "Prato com altura ganha volume" },
          errado: { src: C + "bistro/bt-risoto.webp", legenda: "Raso e de cima: quase sem volume" },
        },
      },
      {
        titulo: "Sem modo retrato",
        texto:
          "Use a câmera normal. O desfoque do modo retrato confunde o mapa e cria bordas tremidas.",
        porque: "O volume já faz o papel do desfoque, sem recortar errado a borda do prato.",
        checar: ["Modo foto, não retrato", "Flash desligado", "Teste no ensaio abaixo"],
        cena: {
          tipo: "comparar",
          certo: { src: C + "cartola-1080.webp", legenda: "Câmera normal: borda nítida" },
          errado: {
            src: C + "cartola-1080.webp",
            legenda: "Modo retrato borra a borda do prato",
            filtro: "blur(2.4px)",
            simulacao: true,
          },
        },
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
        video: "palco",
      },
      {
        titulo: "Luz clara, sem sombra dura",
        texto: "Ambiente bem iluminado e luz por igual. Caldo brilhante e vidro saem piores.",
        porque: "Reflexo muda de lugar a cada passo e engana a reconstrução.",
        checar: ["Sem sol direto", "Sem flash nem lanterna", "Evite caldo brilhante e copos"],
        cena: {
          tipo: "comparar",
          certo: { src: C + "bistro/bt-pudim.webp", legenda: "Luz clara e por igual" },
          errado: {
            src: C + "bistro/real/caldinho.webp",
            legenda: "Caldo brilhante reflete e muda a cada passo",
          },
        },
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
        video: "baixa",
      },
      {
        titulo: "Volta 2: mais de cima",
        texto: "Sem parar o vídeo, levante o celular e dê a segunda volta olhando mais de cima.",
        porque: "Essa volta mostra o topo e fecha o modelo sem buracos.",
        checar: ["Não pare a gravação", "Prato no centro da tela", "Mesmo ritmo da volta 1"],
        video: "alta",
      },
      {
        titulo: "Treine o ritmo",
        texto: `As duas voltas juntas levam de ${VIDEO_MIN} a ${VIDEO_MAX} segundos. Toque em Treinar e acompanhe o celular girando em volta do prato.`,
        porque: "Rápido demais sai tremido; devagar demais não muda nada e só pesa o envio.",
        checar: [
          "Cerca de 25 s por volta",
          "Termine onde começou",
          "Depois, teste o vídeo no ensaio",
        ],
        video: "ritmo",
      },
    ],
  },
};

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
  const atual = Math.min(passo, tr.passos.length - 1);
  const p = tr.passos[atual]!;
  useEffect(() => setPasso(0), [trilha]);
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div
        role="tablist"
        aria-label="Trilhas do Estúdio"
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
              onClick={() => {
                setPasso(0);
                onTrilha(id);
              }}
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
        <div
          className={cn("relative overflow-hidden bg-[#071d2b] p-3 sm:p-5 lg:min-h-[26rem]")}
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 20% 0%, rgba(45,212,191,.16), transparent 60%), radial-gradient(90% 70% at 100% 100%, rgba(56,189,248,.10), transparent 60%)",
          }}
        >
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
            {tr.nome} · passo {atual + 1} de {tr.passos.length}
          </p>
          <div
            key={`${trilha}-${atual}`}
            className={cn(
              "relative motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
              "pb-1 pt-2",
            )}
          >
            {p.cena ? <CenaFoto cena={p.cena} /> : p.video ? <CenaVideo modo={p.video} /> : null}
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
                    i === atual
                      ? "w-6 bg-teal-500"
                      : i < atual
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
                disabled={atual === 0}
                onClick={() => setPasso((n) => n - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {atual < tr.passos.length - 1 ? (
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
