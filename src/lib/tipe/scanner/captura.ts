/**
 * Parte do scanner que roda no navegador: tira quadros nítidos de um vídeo, ou prepara fotos
 * soltas, e devolve os quadros do giro 360° (JPEG quadrado, prato no centro) prontos para enviar.
 */
import { caber, nitidez, paraCinza, temposAmostra } from "./quadros";
import { recorteGiro } from "./giro";

const QUALIDADE = 0.84;

/** Desenha o recorte quadrado central do giro no canvas e devolve o JPEG. */
export function quadroGiro(
  fonte: CanvasImageSource,
  largura: number,
  altura: number,
  c: HTMLCanvasElement = document.createElement("canvas"),
) {
  const r = recorteGiro(largura, altura);
  c.width = r.saida;
  c.height = r.saida;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fonte, r.sx, r.sy, r.lado, r.lado, 0, 0, r.saida, r.saida);
  return canvasJpeg(c);
}

export function canvasJpeg(c: HTMLCanvasElement) {
  return new Promise<Blob>((ok, erro) =>
    c.toBlob(
      (b) => (b ? ok(b) : erro(new Error("Não foi possível gerar a foto."))),
      "image/jpeg",
      QUALIDADE,
    ),
  );
}

/**
 * Abre o vídeo de um jeito que funciona no iPhone: o elemento fica no DOM (invisível) e é
 * "acordado" com play/pause, senão o Safari não carrega os quadros e o seek nunca termina.
 */
export async function abrirVideo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "2px",
    height: "2px",
    opacity: "0",
    pointerEvents: "none",
  });
  video.src = url;
  document.body.appendChild(video);
  const fechar = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  };
  try {
    await esperarEvento(video, "loadedmetadata", 15000);
    await video.play().catch(() => {});
    video.pause();
    if (video.readyState < 2) await esperarEvento(video, "loadeddata", 8000).catch(() => {});
  } catch (e) {
    fechar();
    throw e;
  }
  return { video, fechar };
}

function esperarEvento(el: HTMLVideoElement, ev: string, ms: number) {
  return new Promise<void>((ok, erro) => {
    const t = setTimeout(() => {
      limpar();
      erro(new Error("Este vídeo não abriu no navegador. Tente gravar pelo Scanner ao vivo."));
    }, ms);
    const fim = () => {
      limpar();
      ok();
    };
    const falha = () => {
      limpar();
      erro(new Error("Este vídeo não abriu no navegador. Tente gravar pelo Scanner ao vivo."));
    };
    const limpar = () => {
      clearTimeout(t);
      el.removeEventListener(ev, fim);
      el.removeEventListener("error", falha);
    };
    el.addEventListener(ev, fim);
    el.addEventListener("error", falha);
  });
}

/** Vai para o instante `t`. Nunca trava: se o navegador não avisar em 2 s, segue com o quadro atual. */
export function irPara(video: HTMLVideoElement, t: number, ms = 2000) {
  return new Promise<void>((ok) => {
    const fim = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", fim);
      ok();
    };
    const timer = setTimeout(fim, ms);
    video.addEventListener("seeked", fim);
    video.currentTime = t;
  });
}

/**
 * Uma passada só: para cada instante, pega o quadro do giro e mede a nitidez numa cópia
 * pequena. No fim descarta os tremidos (abaixo de 35% da mediana), mantendo a ordem.
 */
export async function quadrosDoVideo(
  arquivo: File,
  quantos: number,
  progresso: (texto: string, fracao: number) => void,
): Promise<Blob[]> {
  const { video, fechar } = await abrirVideo(arquivo);
  try {
    const dur = video.duration;
    if (!Number.isFinite(dur) || dur < 8)
      throw new Error("O vídeo precisa ter pelo menos 10 segundos dando a volta no prato.");
    const grande = document.createElement("canvas");
    const p = caber(video.videoWidth, video.videoHeight, 240);
    const peq = document.createElement("canvas");
    peq.width = p.largura;
    peq.height = p.altura;
    const ctxP = peq.getContext("2d", { willReadFrequently: true })!;
    const tempos = temposAmostra(dur, quantos, 1);
    const lidos: { blob: Blob; nitidez: number }[] = [];
    for (const [i, t] of tempos.entries()) {
      await irPara(video, t);
      ctxP.drawImage(video, 0, 0, p.largura, p.altura);
      const n = nitidez(
        paraCinza(ctxP.getImageData(0, 0, p.largura, p.altura).data),
        p.largura,
        p.altura,
      );
      lidos.push({
        blob: await quadroGiro(video, video.videoWidth, video.videoHeight, grande),
        nitidez: n,
      });
      progresso("Lendo os quadros", (i + 1) / tempos.length);
    }
    const ord = lidos.map((l) => l.nitidez).sort((a, b) => a - b);
    const mediana = ord[Math.floor(ord.length / 2)] ?? 0;
    return lidos.filter((l) => l.nitidez >= mediana * 0.35).map((l) => l.blob);
  } finally {
    fechar();
  }
}

export async function prepararFotos(
  arquivos: File[],
  progresso: (texto: string, fracao: number) => void,
): Promise<Blob[]> {
  const fotos: Blob[] = [];
  for (const [i, f] of arquivos.entries()) {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    fotos.push(await quadroGiro(bmp, bmp.width, bmp.height));
    bmp.close();
    progresso("Preparando as fotos", (i + 1) / arquivos.length);
  }
  return fotos;
}

/** Envia uma foto para a URL assinada do Supabase Storage, com até 3 tentativas. */
export async function enviarUma(url: string, foto: Blob) {
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "image/jpeg", "x-upsert": "true" },
      body: foto,
    }).catch(() => null);
    if (r?.ok) return;
    if (tentativa >= 3) throw new Error("A internet caiu no envio. Tente de novo no Wi-Fi.");
    await new Promise((ok) => setTimeout(ok, 800 * tentativa));
  }
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
      await enviarUma(urls[i]!, fotos[i]!);
      progresso("Enviando as fotos", ++feitas / fotos.length);
    }
  };
  await Promise.all([um(), um(), um(), um()]);
}
