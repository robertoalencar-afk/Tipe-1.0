import { gerarProfundidade } from "./profundidade";

// Uma inferência por vez evita disputar memória quando há várias fotos na fila.
let queue: Promise<void> = Promise.resolve();
const remoteDepths = new Map<string, Promise<Blob>>();
const contentDepths = new Map<string, Blob>();
const MAX_CACHED_PHOTOS = 32;
function remember<K, V>(cache: Map<K, V>, key: K, value: V) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHED_PHOTOS) cache.delete(cache.keys().next().value!);
}
export function prepareDishDepth(
  source: Blob | string,
  onStatus: (text: string) => void = () => {},
) {
  if (typeof source === "string" && remoteDepths.has(source)) return remoteDepths.get(source)!;
  const task = queue.then(async () => {
    onStatus("Preparando a foto…");
    const image =
      typeof source === "string"
        ? await fetch(source, { credentials: "omit" }).then((r) => {
            if (!r.ok) throw new Error("Não foi possível abrir a foto.");
            return r.blob();
          })
        : source;
    // File names and URLs can change while the actual photograph stays identical.
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await image.arrayBuffer())),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const previous = contentDepths.get(hash);
    if (previous) {
      onStatus("Volume da foto já preparado.");
      return previous;
    }
    const bitmap = await createImageBitmap(image);
    try {
      const depth = await gerarProfundidade(bitmap, "/modelos/depth/model.onnx", onStatus);
      remember(contentDepths, hash, depth);
      return depth;
    } finally {
      bitmap.close();
    }
  });
  if (typeof source === "string") {
    remember(remoteDepths, source, task);
    void task.catch(() => remoteDepths.delete(source));
  }
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}

export const photoBlobDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível preparar a foto."));
    reader.readAsDataURL(blob);
  });
