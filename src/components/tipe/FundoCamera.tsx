/**
 * Fundo do visor 3D: a câmera traseira do celular, para o prato aparecer "em cima" da mesa
 * para onde o cliente aponta. Nada é gravado nem enviado: o vídeo fica só na tela.
 * Sem câmera (computador, permissão negada, navegador antigo), mostra um fundo de mesa neutro
 * e explica o que fazer.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Move3d } from "lucide-react";
import { polarDaInclinacao, suavizar } from "@/lib/tipe/inclinacao";

type Estado = "pedindo" | "ok" | "negada" | "sem-camera";

function temCameraDeCelular() {
  if (typeof window === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia && window.matchMedia?.("(pointer: coarse)").matches;
}

export function FundoCamera({ ativo = true }: { ativo?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>(() =>
    temCameraDeCelular() ? "pedindo" : "sem-camera",
  );
  const [dica, setDica] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  // iOS só libera o giroscópio depois de um toque: aí aparece o botão.
  const [movimento, setMovimento] = useState<"desligado" | "pedir" | "ligado">("desligado");

  const parar = useCallback(() => {
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
  }, []);

  const ligar = useCallback(async () => {
    if (!temCameraDeCelular()) return setEstado("sem-camera");
    setEstado("pedindo");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      parar();
      fluxo.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setEstado("ok");
      setDica(true);
    } catch {
      setEstado("negada");
    }
  }, [parar]);

  useEffect(() => {
    if (!ativo || !temCameraDeCelular()) return;
    void ligar();
    return parar;
  }, [ativo, ligar, parar]);

  // O prato acompanha a inclinação do celular: visto do mesmo ângulo que a mesa real.
  useEffect(() => {
    if (estado !== "ok" || typeof window === "undefined" || !("DeviceOrientationEvent" in window))
      return;
    const precisaPedir =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        .requestPermission === "function";
    if (precisaPedir && movimento === "desligado") {
      setMovimento("pedir");
      return;
    }
    if (movimento === "pedir") return;
    let polar: number | null = null;
    let pausaAte = 0;
    const mv = () =>
      raiz.current?.parentElement?.querySelector("model-viewer") as
        (HTMLElement & { cameraOrbit: string; getCameraOrbit?: () => { theta: number } }) | null;
    const aoMexer = (e: Event) => {
      if ((e as CustomEvent).detail?.source === "user-interaction") pausaAte = Date.now() + 4000;
    };
    const aoInclinar = (e: DeviceOrientationEvent) => {
      const alvo = polarDaInclinacao(e.beta);
      const el = mv();
      if (alvo == null || !el || Date.now() < pausaAte) return;
      polar = polar == null ? alvo : suavizar(polar, alvo);
      const theta = el.getCameraOrbit ? (el.getCameraOrbit().theta * 180) / Math.PI : 20;
      el.cameraOrbit = `${theta.toFixed(1)}deg ${polar.toFixed(1)}deg 110%`;
    };
    const el = mv();
    el?.addEventListener("camera-change", aoMexer);
    window.addEventListener("deviceorientation", aoInclinar);
    setMovimento("ligado");
    return () => {
      window.removeEventListener("deviceorientation", aoInclinar);
      el?.removeEventListener("camera-change", aoMexer);
    };
  }, [estado, movimento]);

  async function pedirMovimento() {
    try {
      const r = await (
        DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
      ).requestPermission();
      setMovimento(r === "granted" ? "ligado" : "desligado");
    } catch {
      setMovimento("desligado");
    }
  }

  // O aviso some depois de alguns segundos com a câmera ligada.
  useEffect(() => {
    if (estado !== "ok") return;
    const t = setTimeout(() => setDica(false), 6000);
    return () => clearTimeout(t);
  }, [estado]);

  return (
    <div
      ref={raiz}
      className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,#8a6a4f,#3b2a1e_75%)]"
    >
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          estado === "ok" ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4">
        {estado === "ok" && (
          <p
            role="status"
            className={`flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur transition-opacity duration-500 ${
              dica ? "opacity-100" : "opacity-0"
            }`}
          >
            <Camera className="h-4 w-4" aria-hidden />
            Aponte o celular para a mesa
          </p>
        )}
        {estado === "pedindo" && (
          <p role="status" className="rounded-full bg-black/55 px-4 py-2 text-xs text-white">
            Permita a câmera para ver o prato na sua mesa
          </p>
        )}
        {estado === "sem-camera" && (
          <p className="rounded-full bg-black/45 px-4 py-2 text-center text-xs text-white">
            No celular, a câmera mostra o prato em cima da sua mesa
          </p>
        )}
      </div>
      {estado === "ok" && movimento === "pedir" && (
        <button
          type="button"
          onClick={() => void pedirMovimento()}
          className="absolute top-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021E34] shadow"
        >
          <Move3d className="h-4 w-4" aria-hidden />
          Mover o prato com o celular
        </button>
      )}
      {estado === "negada" && (
        <div className="absolute inset-x-0 top-16 z-10 flex flex-col items-center gap-2 px-6 text-center">
          <p className="rounded-2xl bg-black/55 px-4 py-2 text-xs text-white">
            A câmera está bloqueada. Libere nas permissões do navegador para ver o prato na sua
            mesa.
          </p>
          <button
            type="button"
            onClick={() => void ligar()}
            className="pointer-events-auto rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021E34]"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
