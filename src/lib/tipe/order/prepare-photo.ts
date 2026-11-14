import { gerarProfundidade } from "./profundidade";

// Uma inferência por vez evita disputar memória quando há várias fotos na fila.
let queue: Promise<void> = Promise.resolve();
const remoteDepths = new Map<string, Promise<Blob>>();
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
    const bitmap = await createImageBitmap(image);
    try {
      return await gerarProfundidade(bitmap, "/modelos/depth/model.onnx", onStatus);
    } finally {
      bitmap.close();
    }
  });
  if (typeof source === "string") {
    remoteDepths.set(source, task);
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
