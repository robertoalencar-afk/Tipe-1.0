/**
 * Visor do giro 360°: as fotos reais do prato, tiradas em volta dele, trocam conforme o dedo
 * arrasta. Para os lados gira o prato; para baixo mostra a volta feita de cima (quando houver).
 * Enquanto ninguém toca, o prato gira sozinho devagar. Abre na hora: não há modelo para montar.
 */
import { useEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";
import { lerGiro, quadroDoArrasto, quadroEquivalente, type Giro } from "@/lib/tipe/scanner/giro";
import { polarDaInclinacao } from "@/lib/tipe/inclinacao";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  ajuste?: "cover" | "contain";
  className?: string;
};

export function GiroPrato({ src, alt, ajuste = "contain", className = "" }: Props) {
  const tela = useRef<HTMLCanvasElement>(null);
  const imagens = useRef<HTMLImageElement[][]>([]);
  const pos = useRef({ volta: 0, quadro: 0 });
  const pausaAte = useRef(0);
  const [giro, setGiro] = useState<Giro | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");
  const [prontos, setProntos] = useState(0);
  const [dica, setDica] = useState(true);

  const desenhar = () => {
    const c = tela.current;
    const lista = imagens.current[pos.current.volta];
    if (!c || !lista?.length) return;
    // Quadro ainda baixando: mostra o vizinho carregado mais próximo.
    for (let d = 0; d < lista.length; d++) {
      const img = lista[(pos.current.quadro + d) % lista.length]!;
      if (img.complete && img.naturalWidth) {
        if (c.width !== img.naturalWidth) {
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
        }
        c.getContext("2d")!.drawImage(img, 0, 0);
        return;
      }
    }
  };

  useEffect(() => {
    let vivo = true;
    setEstado("carregando");
    setProntos(0);
    fetch(src)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const g = lerGiro(j);
        if (!vivo) return;
        if (!g) return setEstado("erro");
        setGiro(g);
        pos.current = { volta: 0, quadro: 0 };
        // A 1ª volta baixa primeiro; a de cima vem depois.
        imagens.current = g.voltas.map((v) =>
          v.map((u) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => {
              if (!vivo) return;
              setProntos((p) => p + 1);
              setEstado("ok");
              desenhar();
            };
            img.src = u;
            return img;
          }),
        );
      })
      .catch(() => vivo && setEstado("erro"));
    return () => {
      vivo = false;
      imagens.current = [];
    };
    // desenhar só lê refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Gira sozinho até a pessoa tocar; volta a girar 4 s depois do último toque.
  useEffect(() => {
    if (estado !== "ok") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (Date.now() < pausaAte.current) return;
      const total = imagens.current[pos.current.volta]?.length ?? 0;
      if (!total) return;
      pos.current.quadro = (pos.current.quadro + 1) % total;
      desenhar();
    }, 120);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  useEffect(() => {
    if (estado !== "ok") return;
    const t = setTimeout(() => setDica(false), 4000);
    return () => clearTimeout(t);
  }, [estado]);

  // Celular mais deitado (olhando a mesa de cima) mostra a volta de cima. Sem pedir permissão:
  // onde o navegador exige toque para liberar o giroscópio (iPhone), vale só o arrasto.
  useEffect(() => {
    if (!giro || giro.voltas.length < 2 || typeof window === "undefined") return;
    if (!("DeviceOrientationEvent" in window)) return;
    const pede = (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      .requestPermission;
    if (typeof pede === "function") return;
    const aoInclinar = (e: DeviceOrientationEvent) => {
      const polar = polarDaInclinacao(e.beta);
      if (polar == null || Date.now() < pausaAte.current) return;
      const alvo = polar < 45 ? 1 : polar > 55 ? 0 : pos.current.volta;
      trocarVolta(alvo);
    };
    window.addEventListener("deviceorientation", aoInclinar);
    return () => window.removeEventListener("deviceorientation", aoInclinar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giro]);

  function trocarVolta(alvo: number) {
    const v = imagens.current;
    if (alvo === pos.current.volta || !v[alvo]?.length) return;
    pos.current = {
      volta: alvo,
      quadro: quadroEquivalente(pos.current.quadro, v[pos.current.volta]!.length, v[alvo]!.length),
    };
    desenhar();
  }

  const arrasto = useRef<{ x: number; y: number; quadro: number; volta: boolean } | null>(null);

  function apertar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, quadro: pos.current.quadro, volta: false };
    pausaAte.current = Number.POSITIVE_INFINITY;
    setDica(false);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    const a = arrasto.current;
    if (!a) return;
    const total = imagens.current[pos.current.volta]?.length ?? 0;
    const largura = e.currentTarget.getBoundingClientRect().width;
    const dy = e.clientY - a.y;
    if (!a.volta && Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(e.clientX - a.x)) {
      a.volta = true;
      trocarVolta(dy > 0 ? 1 : 0);
      a.x = e.clientX;
      a.quadro = pos.current.quadro;
      return;
    }
    pos.current.quadro = quadroDoArrasto(a.quadro, e.clientX - a.x, largura, total);
    desenhar();
  }

  function soltar() {
    arrasto.current = null;
    pausaAte.current = Date.now() + 4000;
  }

  const total = giro?.voltas.reduce((s, v) => s + v.length, 0) ?? 0;

  return (
    <div className={cn("relative overflow-hidden bg-black", className)} data-sem-gesto="">
      <canvas
        ref={tela}
        role="img"
        aria-label={`${alt}, giro de 360 graus com fotos reais. Arraste para girar.`}
        className={`absolute inset-0 h-full w-full touch-none select-none ${
          ajuste === "cover" ? "object-cover" : "object-contain"
        } ${estado === "ok" ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={apertar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      />
      {estado === "carregando" && (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-white/90"
        >
          Abrindo o giro do prato…
        </p>
      )}
      {estado === "erro" && (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-sm text-white/90"
        >
          Não deu para abrir o giro agora. Tente de novo em instantes.
        </p>
      )}
      {estado === "ok" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5">
          <p
            className={`flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white transition-opacity duration-500 ${
              dica ? "opacity-100" : "opacity-0"
            }`}
          >
            <Hand className="h-3.5 w-3.5" aria-hidden />
            {giro && giro.voltas.length > 1
              ? "Arraste para girar · para baixo vê de cima"
              : "Arraste para girar o prato"}
          </p>
          {prontos < total && (
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/25" aria-hidden>
              <div
                className="h-full bg-white/80 transition-[width]"
                style={{ width: `${Math.round((prontos / total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
