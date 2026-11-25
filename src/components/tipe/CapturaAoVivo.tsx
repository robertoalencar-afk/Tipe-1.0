/**
 * Scanner ao vivo: a câmera abre dentro da Tipe e as fotos são tiradas sozinhas enquanto a
 * pessoa dá a volta no prato (só quadro nítido e de um ângulo novo). Ao terminar, a Lebre prepara
 * o giro no próprio celular (prato centralizado, luz igual, capa), envia e o giro fica pronto.
 */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import {
  concluirEnvioScan,
  descartarScan,
  iniciarScan,
  LOTE_URLS,
  MIN_FOTOS,
  urlsDeEnvio,
} from "@/lib/tipe/scanner3d.functions";
import { enviarFotos, fonteDeUrls, prepararComLebre, quadroGiro } from "@/lib/tipe/scanner/captura";
import { caber, decidirCaptura, diferenca, nitidez, paraCinza } from "@/lib/tipe/scanner/quadros";

export const ALVO_FOTOS = 60;

type Aviso = "" | "tremido" | "parado";

export function CapturaAoVivo({
  slug,
  itemId,
  nomePrato,
  onFechar,
}: {
  slug: string;
  itemId: string;
  nomePrato: string;
  onFechar: (enviado: boolean) => void;
}) {
  const iniciar = useServerFn(iniciarScan);
  const concluir = useServerFn(concluirEnvioScan);
  const descartar = useServerFn(descartarScan);
  const maisUrls = useServerFn(urlsDeEnvio);
  const video = useRef<HTMLVideoElement>(null);
  const scan = useRef<{ id: string; url: (i: number) => Promise<string> } | null>(null);
  const brutas = useRef<Promise<Blob>[]>([]);
  const rodando = useRef(true);
  const inicioVolta2 = useRef<number | null>(null);
  const [estado, setEstado] = useState<"abrindo" | "gravando" | "finalizando" | "erro">("abrindo");
  const [erro, setErro] = useState("");
  const [fotos, setFotos] = useState(0);
  const [etapa, setEtapa] = useState({ texto: "", fracao: 0 });
  const [aviso, setAviso] = useState<Aviso>("");
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let fluxo: MediaStream | null = null;
    let quadro = 0;
    rodando.current = true;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          }),
          iniciar({ data: { slug, itemId, total: ALVO_FOTOS } }),
        ]);
        fluxo = s;
        scan.current = {
          id: r.scanId,
          url: fonteDeUrls(r.urls, LOTE_URLS, (inicio) =>
            maisUrls({ data: { slug, scanId: r.scanId, inicio } }).then((x) => x.urls),
          ),
        };
        if (!rodando.current) return;
        const v = video.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        setEstado("gravando");

        const peq = document.createElement("canvas");
        const grande = document.createElement("canvas");
        let ultimo: Uint8ClampedArray | null = null;
        let ultimaMs = 0;
        const recentes: number[] = [];
        let n = 0;
        let ultimoAviso = 0;
        const loop = async () => {
          if (!rodando.current) return;
          if (v.videoWidth && n < ALVO_FOTOS) {
            const p = caber(v.videoWidth, v.videoHeight, 200);
            peq.width = p.largura;
            peq.height = p.altura;
            const cp = peq.getContext("2d", { willReadFrequently: true })!;
            cp.drawImage(v, 0, 0, p.largura, p.altura);
            const cinza = paraCinza(cp.getImageData(0, 0, p.largura, p.altura).data);
            const nit = nitidez(cinza, p.largura, p.altura);
            const ord = [...recentes].sort((a, b) => a - b);
            const d = decidirCaptura({
              msDesdeUltima: performance.now() - ultimaMs,
              nitidez: nit,
              medianaNitidez: ord[Math.floor(ord.length / 2)] ?? 0,
              diferenca: ultimo ? diferenca(cinza, ultimo) : 255,
            });
            recentes.push(nit);
            if (recentes.length > 20) recentes.shift();
            if (d === "capturar") {
              const jpeg = quadroGiro(v, v.videoWidth, v.videoHeight, grande);
              const i = n++;
              if (i === ALVO_FOTOS / 2) inicioVolta2.current = i;
              ultimo = cinza;
              ultimaMs = performance.now();
              setFotos(n);
              setFlash((f) => f + 1);
              setAviso("");
              navigator.vibrate?.(8);
              brutas.current.push(jpeg);
              if (n >= ALVO_FOTOS) void terminar();
            } else if (
              (d === "tremido" || d === "parado") &&
              performance.now() - ultimoAviso > 1200
            ) {
              ultimoAviso = performance.now();
              setAviso(d);
            }
          }
          quadro = window.setTimeout(loop, 120);
        };
        void loop();
      } catch (e) {
        const msg = (e as Error).message ?? "";
        setErro(
          /Permission|NotAllowed|denied/i.test(msg) || (e as Error).name === "NotAllowedError"
            ? "A câmera está bloqueada. Libere nas permissões do navegador e tente de novo."
            : msg || "Não deu para abrir a câmera.",
        );
        setEstado("erro");
      }
    })();
    return () => {
      rodando.current = false;
      clearTimeout(quadro);
      fluxo?.getTracks().forEach((t) => t.stop());
    };
    // Abre uma vez por prato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, itemId]);

  async function terminar() {
    if (!rodando.current) return;
    rodando.current = false;
    setEstado("finalizando");
    try {
      const progresso = (texto: string, fracao: number) => setEtapa({ texto, fracao });
      const tiradas = await Promise.all(brutas.current);
      const corte = inicioVolta2.current;
      const { fotos: prontas, capa } = await prepararComLebre(
        tiradas,
        corte ?? tiradas.length,
        progresso,
      );
      await enviarFotos(prontas, scan.current!.url, progresso);
      await concluir({
        data: { slug, scanId: scan.current!.id, inicioVolta2: corte, capa },
      });
      toast.success("Pronto! O giro 360° do prato já está aqui para você aprovar.");
      onFechar(true);
    } catch (e) {
      toast.error((e as Error).message);
      setErro((e as Error).message);
      setEstado("erro");
    }
  }

  async function cancelar() {
    rodando.current = false;
    if (scan.current) void descartar({ data: { slug, scanId: scan.current.id } }).catch(() => {});
    onFechar(false);
  }

  const volta = fotos < ALVO_FOTOS / 2 ? 1 : 2;
  const fracao = fotos / ALVO_FOTOS;
  const C = 2 * Math.PI * 46;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Escanear ${nomePrato} em 3D`}
      className="fixed inset-0 z-50 bg-black text-white"
    >
      <video
        ref={video}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        key={flash}
        className={
          flash
            ? "pointer-events-none absolute inset-0 animate-[ping_0.25s_ease-out_1] bg-white/25"
            : ""
        }
      />

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold">{nomePrato}</p>
          <button
            type="button"
            onClick={() => void cancelar()}
            className="grid size-10 place-items-center rounded-full bg-white/15"
            aria-label="Cancelar escaneamento"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {estado === "gravando" && (
          <p className="mt-2 text-base font-semibold leading-snug">
            {volta === 1
              ? "Volta 1: ande devagar em volta do prato, na altura do rosto"
              : "Volta 2: agora mais de cima, olhando o prato de cima para baixo"}
          </p>
        )}
      </div>

      {estado === "gravando" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="size-[62vmin] max-h-80 max-w-80 rounded-full border-2 border-dashed border-white/50" />
        </div>
      )}

      {aviso && estado === "gravando" && (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium"
        >
          {aviso === "tremido" ? "Mais devagar, a foto saiu tremida" : "Continue andando em volta"}
        </p>
      )}

      {(estado === "abrindo" || estado === "finalizando") && (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2 text-sm"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden />
          {estado === "abrindo"
            ? "Abrindo a câmera…"
            : `${etapa.texto || "A Lebre está preparando o giro"}… ${Math.round(etapa.fracao * 100)}%`}
        </p>
      )}

      {estado === "erro" && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 space-y-3 rounded-2xl bg-black/70 p-5 text-center">
          <p className="text-sm">{erro}</p>
          <button
            type="button"
            onClick={() => void cancelar()}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#021E34]"
          >
            Fechar
          </button>
        </div>
      )}

      {estado === "gravando" && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/75 to-transparent px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-12">
          <div className="text-xs leading-tight text-white/80">
            <p>
              <strong className="text-base text-white">{fotos}</strong> fotos
            </p>
            <p>de {ALVO_FOTOS}</p>
          </div>
          <div className="relative size-24">
            <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,.25)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - fracao)}
                style={{ transition: "stroke-dashoffset 200ms ease-out" }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-sm font-semibold">
              {Math.round(fracao * 100)}%
            </span>
          </div>
          <button
            type="button"
            disabled={fotos < MIN_FOTOS}
            onClick={() => void terminar()}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#021E34] disabled:opacity-40"
          >
            <Check className="size-4" aria-hidden />
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}
