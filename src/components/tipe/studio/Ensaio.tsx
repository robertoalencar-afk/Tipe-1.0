/**
 * Ensaio do Studio: o dono testa uma foto ou um vídeo antes de usar no cardápio.
 * Tudo roda no navegador e nada é salvo nem enviado:
 * - foto: mede resolução, orientação, luz, contraste e foco, calcula o mapa de volume com o
 *   mesmo motor do cardápio (Depth Anything V2 Small, /modelos/depth/model.onnx) e mostra o
 *   story com volume; a Lebre pode testar o ajuste de luz;
 * - vídeo: mede duração, resolução e tremor quadro a quadro, como o Scanner 3D faz ao
 *   escolher os quadros, e leva ao Scanner para o envio de verdade.
 */
import { abrirVideo, irPara } from "@/lib/tipe/scanner/captura";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Box,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  TriangleAlert,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prepareDishDepth } from "@/lib/tipe/order/prepare-photo";
import { enhanceDishPhoto } from "@/lib/tipe/order/enhance-photo";
import { Foto3D } from "../site/order/Foto3D";
import { LebreSuggestionButton } from "../LebreSuggestionButton";
import {
  LADO_AMOSTRA,
  avaliarFoto,
  avaliarVideo,
  luminancia,
  medir,
  nitidez,
  nota,
  tremidos,
  type Amostra,
  type Veredito,
} from "./analise";

const TOM = {
  ok: { cor: "text-teal-700", fundo: "bg-teal-50 ring-teal-200", Icon: Check, rotulo: "Bom" },
  atencao: {
    cor: "text-amber-800",
    fundo: "bg-amber-50 ring-amber-200",
    Icon: TriangleAlert,
    rotulo: "Atenção",
  },
  ruim: { cor: "text-red-700", fundo: "bg-red-50 ring-red-200", Icon: X, rotulo: "Refazer" },
} as const;

function Vereditos({ itens }: { itens: Veredito[] }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border">
      {itens.map((v) => {
        const t = TOM[v.nivel];
        return (
          <li key={v.id} className="flex gap-3 p-3">
            <span
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-1",
                t.fundo,
              )}
            >
              <t.Icon className={cn("size-3.5", t.cor)} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                <span className="font-medium">{v.titulo}</span>
                <span className={cn("text-xs font-medium tabular-nums", t.cor)}>
                  <span className="sr-only">{t.rotulo}: </span>
                  {v.valor}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{v.dica}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Nota({ valor }: { valor: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`Nota ${valor} de 100`}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(
            "transition-[stroke-dashoffset] duration-700",
            valor >= 80 ? "text-teal-500" : valor >= 50 ? "text-amber-500" : "text-red-500",
          )}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - valor / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-lg font-semibold tabular-nums">
        {valor}
      </span>
    </div>
  );
}

async function medirArquivo(arquivo: Blob) {
  const bmp = await createImageBitmap(arquivo);
  try {
    const k = Math.min(1, LADO_AMOSTRA / Math.max(bmp.width, bmp.height));
    const w = Math.max(2, Math.round(bmp.width * k));
    const h = Math.max(2, Math.round(bmp.height * k));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, w, h);
    return medir(ctx.getImageData(0, 0, w, h).data, w, h, bmp.width, bmp.height);
  } finally {
    bmp.close();
  }
}

type FotoEstado = {
  url: string;
  arquivo: Blob;
  vereditos: Veredito[];
  prof: string | null;
  etapa: "medindo" | "volume" | "pronto" | "sem-volume";
  status: string;
  antes?: number | undefined;
};

function EnsaioFoto({ restaurante }: { restaurante: string }) {
  const [f, setF] = useState<FotoEstado | null>(null);
  const [vista, setVista] = useState<"volume" | "mapa">("volume");
  const [melhorando, setMelhorando] = useState(false);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const geracao = useRef(0);
  useEffect(
    () => () => {
      geracao.current++;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  const url = (b: Blob) => {
    const u = URL.createObjectURL(b);
    urls.current.push(u);
    return u;
  };

  async function testar(arquivo: Blob | undefined, antes?: number) {
    if (!arquivo || !arquivo.type.startsWith("image/")) return;
    const g = ++geracao.current;
    const u = url(arquivo);
    setVista("volume");
    setF({
      url: u,
      arquivo,
      vereditos: [],
      prof: null,
      etapa: "medindo",
      status: "Medindo a foto…",
      antes,
    });
    try {
      const m = await medirArquivo(arquivo);
      if (g !== geracao.current) return;
      setF(
        (s) =>
          s && { ...s, vereditos: avaliarFoto(m), etapa: "volume", status: "Calculando o volume…" },
      );
      const mapa = await prepareDishDepth(arquivo, (status) => {
        if (g === geracao.current) setF((s) => s && { ...s, status });
      });
      if (g !== geracao.current) return;
      setF((s) => s && { ...s, prof: url(mapa), etapa: "pronto" });
    } catch {
      if (g === geracao.current) setF((s) => s && { ...s, etapa: "sem-volume" });
    }
  }

  const n = f?.vereditos.length ? nota(f.vereditos) : null;
  const entradas = (
    <>
      <input
        ref={galeria}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher foto de teste"
        onChange={(e) => {
          void testar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Tirar foto de teste"
        onChange={(e) => {
          void testar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );

  if (!f)
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border px-5 py-10 text-center">
        {entradas}
        <span className="grid size-12 place-items-center rounded-full bg-[#071d2b] text-teal-300">
          <Camera className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-medium">Tire uma foto de teste de qualquer prato</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A Tipe dá nota para luz, foco, resolução e enquadramento e mostra o story com volume. Nada
          é salvo.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button className="h-11 rounded-full px-5" onClick={() => camera.current?.click()}>
            <Camera className="size-4" /> Tirar foto
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={() => galeria.current?.click()}
          >
            <ImagePlus className="size-4" /> Escolher da galeria
          </Button>
        </div>
      </div>
    );

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-start">
      {entradas}
      <div className="mx-auto w-full max-w-[15rem]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-[6px] border-[#071d2b] bg-[#071d2b] shadow-xl">
          {vista === "mapa" && f.prof ? (
            <img
              src={f.prof}
              alt="Mapa de volume: claro é perto, escuro é longe"
              className="size-full object-cover"
            />
          ) : f.prof ? (
            <Foto3D
              foto={f.url}
              profundidade={f.prof}
              alt="Foto de teste com volume"
              className="size-full"
            />
          ) : (
            <img src={f.url} alt="Foto de teste" className="size-full object-cover" />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 p-2">
            <span className="h-0.5 flex-1 rounded-full bg-white/90" />
            <span className="h-0.5 flex-1 rounded-full bg-white/35" />
            <span className="h-0.5 flex-1 rounded-full bg-white/35" />
          </div>
          <p className="pointer-events-none absolute left-3 top-4 text-[11px] font-medium text-white drop-shadow">
            {restaurante}
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white">
            <p className="text-[10px] uppercase tracking-wider text-white/70">
              Ensaio · não publicado
            </p>
            <p className="font-display text-base font-semibold">Prato de teste</p>
          </div>
          {f.etapa !== "pronto" && f.etapa !== "sem-volume" && (
            <div className="absolute inset-x-3 top-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              <span role="status">{f.status}</span>
            </div>
          )}
        </div>
        {f.prof && (
          <div
            className="mt-3 grid grid-cols-2 rounded-full bg-muted p-1 text-xs"
            role="group"
            aria-label="Ver"
          >
            {(
              [
                ["volume", "Com volume"],
                ["mapa", "Mapa de volume"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={vista === k}
                onClick={() => setVista(k)}
                className={cn(
                  "min-h-9 rounded-full font-medium",
                  vista === k ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {n !== null ? (
            <Nota valor={n} />
          ) : (
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight">
              {n === null
                ? "Medindo…"
                : n >= 80 && !f.vereditos.some((x) => x.nivel === "ruim")
                  ? "Pronta para o cardápio"
                  : n >= 50 && !f.vereditos.some((x) => x.nivel === "ruim")
                    ? "Dá para usar, melhora com um ajuste"
                    : "Vale refazer a foto"}
            </p>
            <p className="text-xs text-muted-foreground">
              {f.antes !== undefined && n !== null
                ? `Antes do ajuste: ${f.antes}. Depois: ${n}.`
                : "Estimativa feita no seu aparelho."}
            </p>
          </div>
        </div>
        {f.vereditos.length > 0 && <Vereditos itens={f.vereditos} />}
        {f.etapa === "pronto" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            No celular do cliente a foto se mexe com o dedo e com a inclinação do aparelho. No mapa,
            quanto mais claro, mais perto: o prato deve aparecer mais claro que o fundo.
          </p>
        )}
        {f.etapa === "sem-volume" && (
          <p className="text-xs text-amber-800">
            Este aparelho não conseguiu calcular o volume agora. A foto continua valendo.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <LebreSuggestionButton
            loading={melhorando}
            disabled={f.etapa === "medindo" || f.etapa === "volume"}
            onClick={async () => {
              setMelhorando(true);
              try {
                await testar(await enhanceDishPhoto(f.arquivo), n ?? undefined);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setMelhorando(false);
              }
            }}
          >
            Testar ajuste de luz
          </LebreSuggestionButton>
          <Button
            variant="outline"
            className="h-11 rounded-full"
            onClick={() => camera.current?.click()}
          >
            <RotateCcw className="size-4" /> Outra foto
          </Button>
        </div>
      </div>
    </div>
  );
}

type VideoEstado = {
  nome: string;
  progresso: number;
  amostras: Amostra[];
  quadros: string[];
  vereditos: Veredito[];
  duracao: number;
  erro?: string;
};

function EnsaioVideo({ onAbrirScanner }: { onAbrirScanner: () => void }) {
  const [v, setV] = useState<VideoEstado | null>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const geracao = useRef(0);
  useEffect(() => () => void geracao.current++, []);

  async function testar(arquivo: File | undefined) {
    if (!arquivo || !arquivo.type.startsWith("video/")) return;
    const g = ++geracao.current;
    setV({
      nome: arquivo.name,
      progresso: 0,
      amostras: [],
      quadros: [],
      vereditos: [],
      duracao: 0,
    });
    let aberto: Awaited<ReturnType<typeof abrirVideo>> | null = null;
    try {
      // abrirVideo deixa o vídeo no DOM e "acordado": sem isso o iPhone nunca termina o seek.
      aberto = await abrirVideo(arquivo);
      const el = aberto.video;
      const duracao = Number.isFinite(el.duration) ? el.duration : 0;
      if (!duracao || !el.videoWidth) throw new Error("Não deu para ler a duração deste vídeo.");
      const k = Math.min(1, 320 / Math.max(el.videoWidth, el.videoHeight));
      const w = Math.round(el.videoWidth * k);
      const h = Math.round(el.videoHeight * k);
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      const total = Math.max(12, Math.min(30, Math.round(duracao * 0.6)));
      const amostras: Amostra[] = [];
      const quadros: string[] = [];
      const passoQuadro = Math.max(1, Math.floor(total / 8));
      for (let i = 0; i < total; i++) {
        if (g !== geracao.current) return;
        const t = ((i + 0.5) / total) * duracao;
        await irPara(el, t);
        ctx.drawImage(el, 0, 0, w, h);
        amostras.push({ t, nitidez: nitidez(luminancia(ctx.getImageData(0, 0, w, h).data), w, h) });
        if (i % passoQuadro === 0 && quadros.length < 8)
          quadros.push(cv.toDataURL("image/jpeg", 0.6));
        setV(
          (s) =>
            s && {
              ...s,
              progresso: (i + 1) / total,
              amostras: [...amostras],
              quadros: [...quadros],
            },
        );
      }
      const largura = el.videoWidth;
      const altura = el.videoHeight;
      const vereditos = avaliarVideo({ duracao, largura, altura, amostras });
      setV((s) => s && { ...s, duracao, vereditos });
    } catch (e) {
      if (g === geracao.current) setV((s) => s && { ...s, erro: (e as Error).message });
    } finally {
      aberto?.fechar();
    }
  }

  const entradas = (
    <>
      <input
        ref={galeria}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher vídeo de teste"
        onChange={(e) => {
          void testar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Gravar vídeo de teste"
        onChange={(e) => {
          void testar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );

  if (!v)
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border px-5 py-10 text-center">
        {entradas}
        <span className="grid size-12 place-items-center rounded-full bg-[#071d2b] text-teal-300">
          <Video className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-medium">Grave as duas voltas e teste aqui</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A Tipe confere duração, resolução e tremor quadro a quadro, do jeito que o Scanner 3D
          escolhe as fotos. O vídeo não sai do seu aparelho.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button className="h-11 rounded-full px-5" onClick={() => camera.current?.click()}>
            <Video className="size-4" /> Gravar vídeo
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={() => galeria.current?.click()}
          >
            <ImagePlus className="size-4" /> Escolher vídeo
          </Button>
        </div>
      </div>
    );

  const marca = tremidos(v.amostras);
  const pronto = v.vereditos.length > 0;
  const n = pronto ? nota(v.vereditos) : null;
  const max = Math.max(1, ...v.amostras.map((a) => a.nitidez));
  return (
    <div className="space-y-5">
      {entradas}
      <div className="flex items-center gap-4">
        {n !== null ? (
          <Nota valor={n} />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">
            {v.erro
              ? "Não deu para analisar"
              : n === null
                ? `Lendo os quadros… ${Math.round(v.progresso * 100)}%`
                : n >= 80 && !v.vereditos.some((x) => x.nivel === "ruim")
                  ? "Vídeo pronto para o Scanner 3D"
                  : n >= 50 && !v.vereditos.some((x) => x.nivel === "ruim")
                    ? "Deve funcionar, mas dá para melhorar"
                    : "Vale gravar de novo"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{v.erro ?? v.nome}</p>
        </div>
      </div>

      {v.quadros.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Momentos da sua volta</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {v.quadros.map((q, i) => (
              <img key={i} src={q} alt="" className="aspect-[3/4] w-full rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}

      {v.amostras.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <p className="font-medium text-muted-foreground">Nitidez ao longo do vídeo</p>
            <p className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-teal-500" aria-hidden /> firme
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-400" aria-hidden /> tremido
              </span>
            </p>
          </div>
          <div
            className="mt-2 flex h-16 items-end gap-px rounded-xl bg-muted/60 p-2"
            role="img"
            aria-label={`${marca.filter(Boolean).length} de ${v.amostras.length} trechos tremidos`}
          >
            {v.amostras.map((a, i) => (
              <span
                key={i}
                className={cn("min-w-0 flex-1 rounded-sm", marca[i] ? "bg-red-400" : "bg-teal-500")}
                style={{ height: `${Math.max(6, (a.nitidez / max) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {pronto && <Vereditos itens={v.vereditos} />}

      <div className="flex flex-wrap gap-2">
        {pronto && (
          <Button className="h-11 rounded-full px-5" onClick={onAbrirScanner}>
            <Box className="size-4" /> Enviar no Scanner 3D
          </Button>
        )}
        <Button
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => camera.current?.click()}
        >
          <RotateCcw className="size-4" /> Gravar de novo
        </Button>
      </div>
      {pronto && (
        <p className="text-xs text-muted-foreground">
          No Scanner você escolhe o prato e envia este mesmo vídeo. A Tipe monta o modelo e você
          revisa antes de publicar.
        </p>
      )}
    </div>
  );
}

export function Ensaio({
  modo,
  onModo,
  restaurante,
  onAbrirScanner,
}: {
  modo: "foto" | "video";
  onModo: (m: "foto" | "video") => void;
  restaurante: string;
  onAbrirScanner: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div
        className="mb-5 inline-grid grid-cols-2 rounded-full bg-muted p-1 text-sm"
        role="group"
        aria-label="O que testar"
      >
        {(
          [
            ["foto", "Foto", Camera],
            ["video", "Vídeo 3D", Video],
          ] as const
        ).map(([k, l, Icon]) => (
          <button
            key={k}
            type="button"
            aria-pressed={modo === k}
            onClick={() => onModo(k)}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 font-medium",
              modo === k ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden /> {l}
          </button>
        ))}
      </div>
      <div hidden={modo !== "foto"}>
        <EnsaioFoto restaurante={restaurante} />
      </div>
      <div hidden={modo !== "video"}>
        <EnsaioVideo onAbrirScanner={onAbrirScanner} />
      </div>
    </div>
  );
}
