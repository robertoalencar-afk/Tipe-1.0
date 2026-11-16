/** Ajuste local de exposição/contraste; preserva o conteúdo e não usa modelos pagos. */
export async function enhanceDishPhoto(input: Blob): Promise<File> {
  const bitmap = await createImageBitmap(input);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Não foi possível abrir o editor de imagem.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
      hist = new Uint32Array(256);
    let samples = 0;
    for (let i = 0; i < image.data.length; i += 16) {
      if (image.data[i + 3]! < 128) continue;
      hist[
        Math.round(
          0.2126 * image.data[i]! + 0.7152 * image.data[i + 1]! + 0.0722 * image.data[i + 2]!,
        )
      ]!++;
      samples++;
    }
    let count = 0,
      low = 0,
      high = 255;
    for (let i = 0; i < 256; i++) {
      count += hist[i]!;
      if (count <= samples * 0.02) low = i;
      if (count < samples * 0.98) high = i;
    }
    const contrast = Math.min(1.15, 255 / Math.max(180, high - low));
    const shift = Math.min(15, Math.max(-10, 128 - (low + high) / 2));
    for (let i = 0; i < image.data.length; i += 4)
      for (let c = 0; c < 3; c++)
        image.data[i + c] = Math.max(
          0,
          Math.min(255, (image.data[i + c]! - 128) * contrast + 128 + shift),
        );
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Não foi possível preparar a foto."))),
        "image/webp",
        0.92,
      ),
    );
    return new File([blob], "prato-ajustado.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
