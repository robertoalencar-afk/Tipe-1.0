/**
 * Parte do scanner 3D que roda no navegador: tira quadros nítidos de um vídeo, ou prepara fotos
 * soltas, e devolve JPEG de até 1600 px prontos para enviar.
 */
import { caber, escolherQuadros, nitidez, paraCinza, temposAmostra } from "./quadros";

const LADO = 1600;
const QUALIDADE = 0.9;

function canvasJpeg(c: HTMLCanvasElement) {
  return new Promise<Blob>((ok, erro) =>
    c.toBlob(
      (b) => (b ? ok(b) : erro(new Error("Não foi possível gerar a foto."))),
      "image/jpeg",
      QUALIDADE,
    ),
  );
}

function ir(video: HTMLVideoElement, t: number) {
  return new Promise<void>((ok, erro) => {
    const fim = () => {
      video.removeEventListener("seeked", fim);
      video.removeEventListener("error", falha);
      ok();
    };
    const falha = () => erro(new Error("Este vídeo não abriu no navegador. Tente gravar de novo."));
    video.addEventListener("seeked", fim);
    video.addEventListener("error", falha);
    video.currentTime = t;
  });
}

export async function quadrosDoVideo(
  arquivo: File,
  quantos: number,
  progresso: (texto: string, fracao: number) => void,
): Promise<Blob[]> {
  const url = URL.createObjectURL(arquivo);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((ok, erro) => {
      video.onloadedmetadata = () => ok();
      video.onerror = () =>
        erro(new Error("Este vídeo não abriu no navegador. Tente gravar de novo."));
    });
    const dur = video.duration;
    if (!Number.isFinite(dur) || dur < 8)
      throw new Error("O vídeo precisa ter pelo menos 10 segundos dando a volta no prato.");
    const amostra = document.createElement("canvas");
    const p = caber(video.videoWidth, video.videoHeight, 320);
    amostra.width = p.largura;
    amostra.height = p.altura;
    const ctxA = amostra.getContext("2d", { willReadFrequently: true })!;
    const tempos = temposAmostra(dur, quantos, 3);
    const candidatos = [];
    for (const [i, t] of tempos.entries()) {
      await ir(video, t);
      ctxA.drawImage(video, 0, 0, p.largura, p.altura);
      const px = ctxA.getImageData(0, 0, p.largura, p.altura).data;
      candidatos.push({ t, nitidez: nitidez(paraCinza(px), p.largura, p.altura) });
      progresso("Escolhendo os quadros mais nítidos", (i + 1) / tempos.length / 2);
    }
    const escolhidos = escolherQuadros(candidatos, quantos);
    const g = caber(video.videoWidth, video.videoHeight, LADO);
    const grande = document.createElement("canvas");
    grande.width = g.largura;
    grande.height = g.altura;
    const ctxG = grande.getContext("2d")!;
    const fotos: Blob[] = [];
    for (const [i, t] of escolhidos.entries()) {
      await ir(video, t);
      ctxG.drawImage(video, 0, 0, g.largura, g.altura);
      fotos.push(await canvasJpeg(grande));
      progresso("Preparando as fotos", 0.5 + (i + 1) / escolhidos.length / 2);
    }
    return fotos;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepararFotos(
  arquivos: File[],
  progresso: (texto: string, fracao: number) => void,
): Promise<Blob[]> {
  const fotos: Blob[] = [];
  for (const [i, f] of arquivos.entries()) {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    const g = caber(bmp.width, bmp.height, LADO);
    const c = document.createElement("canvas");
    c.width = g.largura;
    c.height = g.altura;
    c.getContext("2d")!.drawImage(bmp, 0, 0, g.largura, g.altura);
    bmp.close();
    fotos.push(await canvasJpeg(c));
    progresso("Preparando as fotos", (i + 1) / arquivos.length);
  }
  return fotos;
}

/** Envia para as URLs assinadas do Supabase Storage, 4 por vez. */
export async function enviarFotos(
  fotos: Blob[],
  urls: string[],
  progresso: (texto: string, fracao: number) => void,
) {
  let feitas = 0;
  let proximo = 0;
  const um = async () => {
    while (proximo < fotos.length) {
      const i = proximo++;
      let tentativa = 0;
      for (;;) {
        const r = await fetch(urls[i]!, {
          method: "PUT",
          headers: { "content-type": "image/jpeg", "x-upsert": "true" },
          body: fotos[i]!,
        }).catch(() => null);
        if (r?.ok) break;
        if (++tentativa >= 3) throw new Error("A internet caiu no envio. Tente de novo no Wi-Fi.");
        await new Promise((ok) => setTimeout(ok, 800 * tentativa));
      }
      progresso("Enviando as fotos", ++feitas / fotos.length);
    }
  };
  await Promise.all([um(), um(), um(), um()]);
}
