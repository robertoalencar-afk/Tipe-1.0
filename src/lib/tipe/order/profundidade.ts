/**
 * Mapa de profundidade de UMA foto, calculado no navegador do dono, sem servidor e sem custo.
 * Modelo: Depth Anything V2 Small em ONNX (Apache-2.0), servido de /modelos/depth/.
 * Motor: onnxruntime-web (MIT), servido de /vendor/ort/ e carregado só quando o dono usa.
 * Saída: PNG em tons de cinza (branco = perto), no mesmo enquadramento da foto.
 */
const LADO = 518; // entrada do Depth Anything (múltiplo de 14)
const MEDIA = [0.485, 0.456, 0.406];
const DESVIO = [0.229, 0.224, 0.225];

type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  InferenceSession: { create(url: string, o?: unknown): Promise<Sessao> };
  Tensor: new (tipo: string, dados: Float32Array | Uint16Array, forma: number[]) => unknown;
};
type Sessao = {
  inputNames: string[];
  outputNames: string[];
  run(
    f: Record<string, unknown>,
  ): Promise<Record<string, { data: Float32Array | Uint16Array; dims: number[] }>>;
};

let ortP: Promise<Ort> | null = null;
function carregarOrt(): Promise<Ort> {
  const w = window as unknown as { ort?: Ort };
  if (w.ort) return Promise.resolve(w.ort);
  ortP ??= new Promise<Ort>((ok, erro) => {
    const s = document.createElement("script");
    s.src = "/vendor/ort/ort.wasm.min.js";
    s.onload = () => {
      const ort = w.ort!;
      ort.env.wasm.wasmPaths = "/vendor/ort/";
      ort.env.wasm.numThreads = 1; // sem cross-origin isolation, threads não estão disponíveis
      ok(ort);
    };
    s.onerror = () => {
      ortP = null;
      erro(new Error("Não deu para carregar o motor de profundidade."));
    };
    document.head.appendChild(s);
  });
  return ortP;
}

const sessoes = new Map<string, Promise<Sessao>>();

function paraF16(f: Float32Array) {
  const out = new Uint16Array(f.length);
  const v = new Float32Array(1);
  const u = new Uint32Array(v.buffer);
  for (let i = 0; i < f.length; i++) {
    v[0] = f[i]!;
    const x = u[0]!;
    const sinal = (x >> 16) & 0x8000;
    let e = ((x >> 23) & 0xff) - 112;
    const m = x & 0x7fffff;
    if (e <= 0) out[i] = sinal;
    else if (e >= 31) out[i] = sinal | 0x7c00;
    else out[i] = sinal | (e << 10) | (m >> 13);
    e = 0;
  }
  return out;
}
function deF16(h: Uint16Array) {
  const out = new Float32Array(h.length);
  for (let i = 0; i < h.length; i++) {
    const x = h[i]!;
    const s = x & 0x8000 ? -1 : 1;
    const e = (x >> 10) & 0x1f;
    const m = x & 0x3ff;
    out[i] =
      e === 0 ? s * m * 2 ** -24 : e === 31 ? s * Infinity : s * (1 + m / 1024) * 2 ** (e - 15);
  }
  return out;
}

export async function gerarProfundidade(
  foto: CanvasImageSource & { width: number; height: number },
  modeloUrl: string,
  etapa?: (t: string) => void,
): Promise<Blob> {
  etapa?.("Preparando o motor de volume…");
  const ort = await carregarOrt();
  if (!sessoes.has(modeloUrl))
    sessoes.set(
      modeloUrl,
      ort.InferenceSession.create(modeloUrl, { executionProviders: ["wasm"] }),
    );
  const sessao = await sessoes.get(modeloUrl)!.catch((e) => {
    sessoes.delete(modeloUrl);
    throw e;
  });

  etapa?.("Lendo a foto…");
  const cv = document.createElement("canvas");
  cv.width = LADO;
  cv.height = LADO;
  const cx = cv.getContext("2d", { willReadFrequently: true })!;
  cx.drawImage(foto, 0, 0, LADO, LADO);
  const px = cx.getImageData(0, 0, LADO, LADO).data;
  const n = LADO * LADO;
  const entrada = new Float32Array(3 * n);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 3; c++)
      entrada[c * n + i] = (px[i * 4 + c]! / 255 - MEDIA[c]!) / DESVIO[c]!;

  etapa?.("Calculando o volume do prato…");
  const nome = sessao.inputNames[0]!;
  let saida;
  try {
    saida = await sessao.run({ [nome]: new ort.Tensor("float32", entrada, [1, 3, LADO, LADO]) });
  } catch {
    saida = await sessao.run({
      [nome]: new ort.Tensor("float16", paraF16(entrada), [1, 3, LADO, LADO]),
    });
  }
  const bruto = saida[sessao.outputNames[0]!]!;
  const d = bruto.data instanceof Uint16Array ? deF16(bruto.data) : bruto.data;
  const [h, w] = bruto.dims.slice(-2) as [number, number];

  let min = Infinity;
  let max = -Infinity;
  for (const v of d) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const esc = max > min ? 255 / (max - min) : 0;
  const mapa = document.createElement("canvas");
  mapa.width = w;
  mapa.height = h;
  const mx = mapa.getContext("2d")!;
  const img = mx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const g = Math.round((d[i]! - min) * esc);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  mx.putImageData(img, 0, 0);

  // Volta ao enquadramento da foto, com um leve desfoque para suavizar as bordas.
  const fim = document.createElement("canvas");
  const larg = 540;
  fim.width = larg;
  fim.height = Math.round((larg * foto.height) / foto.width);
  const fx = fim.getContext("2d")!;
  fx.filter = "blur(1.5px)";
  fx.drawImage(mapa, 0, 0, fim.width, fim.height);
  return new Promise((ok, erro) =>
    fim.toBlob((b) => (b ? ok(b) : erro(new Error("png"))), "image/png"),
  );
}
