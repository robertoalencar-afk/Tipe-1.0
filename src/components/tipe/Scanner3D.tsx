/**
 * Scanner 3D do Gestão. A equipe dá a volta no prato com o celular (ao vivo, vídeo ou fotos) e
 * as fotos reais viram na hora um giro 360° que o cliente gira com o dedo. O dono vê o resultado
 * aqui e só então publica no cardápio. Modelos .glb antigos continuam abrindo no visor 3D.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Box, Camera, Images, Loader2, RotateCw, Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  concluirEnvioScan,
  descartarScan,
  iniciarScan,
  listarScans,
  publicarScan,
  urlsDeEnvio,
  LOTE_URLS,
  MAX_FOTOS,
  MIN_FOTOS,
  type ScanStatus,
} from "@/lib/tipe/scanner3d.functions";
import {
  enviarFotos,
  fonteDeUrls,
  prepararFotos,
  quadrosDoVideo,
} from "@/lib/tipe/scanner/captura";
import { carregarModelViewer } from "@/lib/tipe/model-viewer";
import { ehGiro } from "@/lib/tipe/scanner/giro";
import { FundoCamera } from "./FundoCamera";
import { GiroPrato } from "./GiroPrato";
import { CapturaAoVivo } from "./CapturaAoVivo";

const QUADROS_DO_VIDEO = 60;

const ROTULO: Record<ScanStatus, string> = {
  enviando: "Envio incompleto",
  na_fila: "Na fila",
  processando: "Montando",
  pronto: "Pronto para revisar",
  erro: "Não deu certo",
  publicado: "No cardápio",
  descartado: "Descartado",
};
const COR: Record<ScanStatus, string> = {
  enviando: "bg-muted text-muted-foreground",
  na_fila: "bg-amber-100 text-amber-900",
  processando: "bg-sky-100 text-sky-900",
  pronto: "bg-emerald-100 text-emerald-900",
  erro: "bg-red-100 text-red-900",
  publicado: "bg-[#021E34] text-white",
  descartado: "bg-muted text-muted-foreground",
};

type Item = { id: string; name: string };

function Visor({ src, nome }: { src: string; nome: string }) {
  if (ehGiro(src)) return <GiroPrato src={src} alt={nome} className="h-80 rounded-2xl" />;
  return <VisorModelo src={src} nome={nome} />;
}

function VisorModelo({ src, nome }: { src: string; nome: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    carregarModelViewer().then(
      () => setOk(true),
      () => setOk(false),
    );
  }, []);
  if (!ok)
    return (
      <p role="status" className="grid h-64 place-items-center text-sm text-muted-foreground">
        Carregando o visor 3D…
      </p>
    );
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl">
      <FundoCamera />
      <model-viewer
        src={src}
        alt={`${nome} em 3D`}
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1.6"
        shadow-softness="0.55"
        environment-image="neutral"
        exposure="1.05"
        camera-orbit="20deg 55deg 110%"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}

export function Scanner3D({ slug, items }: { slug: string; items: Item[] }) {
  const qc = useQueryClient();
  const listar = useServerFn(listarScans);
  const iniciar = useServerFn(iniciarScan);
  const concluir = useServerFn(concluirEnvioScan);
  const publicar = useServerFn(publicarScan);
  const descartar = useServerFn(descartarScan);
  const maisUrls = useServerFn(urlsDeEnvio);
  const [itemId, setItemId] = useState("");
  const [etapa, setEtapa] = useState<{ texto: string; fracao: number } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(false);
  const video = useRef<HTMLInputElement>(null);
  const fotos = useRef<HTMLInputElement>(null);

  const scans = useQuery({
    queryKey: ["scanner-3d", slug],
    queryFn: () => listar({ data: { slug } }),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((s) => s.status === "na_fila" || s.status === "processando")
        ? 30_000
        : false,
  });
  const nome = (id: string) => items.find((i) => i.id === id)?.name ?? "Prato removido";
  const ocupado = etapa !== null;

  async function processar(origem: "video" | "fotos", arquivos: File[]) {
    if (!itemId) {
      toast.error("Escolha o prato antes de gravar.");
      return;
    }
    const progresso = (texto: string, fracao: number) => setEtapa({ texto, fracao });
    try {
      setEtapa({ texto: "Abrindo", fracao: 0 });
      let blobs: Blob[];
      if (origem === "video") {
        blobs = await quadrosDoVideo(arquivos[0]!, QUADROS_DO_VIDEO, progresso);
      } else {
        if (arquivos.length < MIN_FOTOS)
          throw new Error(`Envie pelo menos ${MIN_FOTOS} fotos dando a volta no prato.`);
        blobs = await prepararFotos(arquivos.slice(0, MAX_FOTOS), progresso);
      }
      if (blobs.length < MIN_FOTOS)
        throw new Error(
          "Muitos quadros saíram tremidos. Grave de novo mais devagar, com o celular firme.",
        );
      const { scanId, urls } = await iniciar({ data: { slug, itemId, total: blobs.length } });
      const url = fonteDeUrls(urls, LOTE_URLS, (inicio) =>
        maisUrls({ data: { slug, scanId, inicio } }).then((r) => r.urls),
      );
      await enviarFotos(blobs, url, progresso);
      await concluir({ data: { slug, scanId, inicioVolta2: null } });
      toast.success("Pronto! O giro 360° do prato já está aqui para você aprovar.");
      setAberto(scanId);
      await qc.invalidateQueries({ queryKey: ["scanner-3d", slug] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEtapa(null);
      if (video.current) video.current.value = "";
      if (fotos.current) fotos.current.value = "";
    }
  }

  async function acao(fn: typeof publicar, scanId: string, ok: string) {
    try {
      await fn({ data: { slug, scanId } });
      toast.success(ok);
      await qc.invalidateQueries({ queryKey: ["scanner-3d", slug] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section
      id="scanner-3d"
      aria-labelledby="scanner-3d-titulo"
      className="space-y-4 rounded-2xl border border-border p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#021E34] text-white">
          <Box className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 id="scanner-3d-titulo" className="font-display text-xl font-medium">
            Scanner 3D
          </h3>
          <p className="text-sm text-muted-foreground">
            Dê a volta no prato com o celular. As fotos de verdade viram na hora um giro 360° que o
            cliente gira com o dedo, e você aprova antes de ir para o cardápio.
          </p>
        </div>
      </div>

      <ol className="grid gap-2 text-sm sm:grid-cols-2">
        <li className="rounded-xl bg-muted/50 p-3">
          <strong>1. Prepare.</strong> Prato no centro da mesa, luz clara sem sombra forte. Não mexa
          no prato durante a gravação.
        </li>
        <li className="rounded-xl bg-muted/50 p-3">
          <strong>2. Toque em Escanear agora.</strong> As fotos saem sozinhas: uma volta na altura
          do rosto de quem está sentado e outra mais de cima, devagar, com o prato no círculo. Leva
          1 minuto e o giro fica pronto na hora.
        </li>
      </ol>

      <label className="grid gap-1 text-sm">
        Prato
        <select
          className="h-11 rounded-xl border border-input bg-background px-3"
          value={itemId}
          disabled={ocupado}
          onChange={(e) => setItemId(e.target.value)}
        >
          <option value="">Escolha o prato</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado || !itemId} onClick={() => setAoVivo(true)}>
          <Camera className="mr-2 h-4 w-4" aria-hidden />
          Escanear agora
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={ocupado || !itemId}
          onClick={() => video.current?.click()}
        >
          <Video className="mr-2 h-4 w-4" aria-hidden />
          Enviar vídeo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={ocupado || !itemId}
          onClick={() => fotos.current?.click()}
        >
          <Images className="mr-2 h-4 w-4" aria-hidden />
          Enviar {MIN_FOTOS} a {MAX_FOTOS} fotos
        </Button>
        <input
          ref={video}
          type="file"
          accept="video/*"
          className="sr-only"
          aria-label="Vídeo do prato"
          onChange={(e) => e.target.files?.[0] && processar("video", [e.target.files[0]])}
        />
        <input
          ref={fotos}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="sr-only"
          aria-label="Fotos do prato"
          onChange={(e) => e.target.files && processar("fotos", Array.from(e.target.files))}
        />
      </div>

      {aoVivo && itemId && (
        <CapturaAoVivo
          slug={slug}
          itemId={itemId}
          nomePrato={nome(itemId)}
          onFechar={(enviado) => {
            setAoVivo(false);
            if (enviado) void qc.invalidateQueries({ queryKey: ["scanner-3d", slug] });
          }}
        />
      )}

      {etapa && (
        <div role="status" className="space-y-1">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {etapa.texto}… {Math.round(etapa.fracao * 100)}%
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-[#14B8A6] transition-[width]"
              style={{ width: `${Math.round(etapa.fracao * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Escaneamentos</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scans.refetch()}
            aria-label="Atualizar escaneamentos"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {scans.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {scans.isError && (
          <p className="text-sm text-red-700">
            Não foi possível carregar os escaneamentos. Toque em atualizar.
          </p>
        )}
        {scans.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum prato escaneado ainda. Escolha um prato acima e grave o primeiro.
          </p>
        )}
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {scans.data?.map((s) => (
            <li key={s.id} className="space-y-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-medium">{nome(s.itemId)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR[s.status]}`}>
                  {ROTULO[s.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.fotos} fotos · enviado{" "}
                {new Date(s.criadoEm).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
                {s.status === "erro" && s.detalhe ? ` · ${s.detalhe}` : ""}
              </p>
              {s.modelUrl && (s.status === "pronto" || s.status === "publicado") && (
                <>
                  {aberto === s.id ? (
                    <Visor src={s.modelUrl} nome={nome(s.itemId)} />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAberto(s.id)}
                    >
                      <Box className="mr-2 h-4 w-4" aria-hidden />
                      {ehGiro(s.modelUrl) ? "Ver o giro 360°" : "Ver o 3D"}
                    </Button>
                  )}
                </>
              )}
              <div className="flex flex-wrap gap-2">
                {s.status === "pronto" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => acao(publicar, s.id, "Publicado no cardápio")}
                  >
                    <Upload className="mr-2 h-4 w-4" aria-hidden />
                    Publicar no cardápio
                  </Button>
                )}
                {s.status !== "processando" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          s.status === "publicado"
                            ? `Tirar o 3D de "${nome(s.itemId)}" do cardápio e apagar as fotos?`
                            : `Descartar o escaneamento de "${nome(s.itemId)}"?`,
                        )
                      )
                        void acao(descartar, s.id, "Escaneamento descartado");
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {s.status === "publicado" ? "Tirar do cardápio" : "Descartar"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
