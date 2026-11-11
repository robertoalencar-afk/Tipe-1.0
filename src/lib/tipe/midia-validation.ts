const MAX_BYTES = 1_500_000;
export function decodificarImagem(dataUrl: string) {
  const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m) throw new Error("Envie uma imagem PNG, JPG ou WebP");
  let bin: string;
  try {
    bin = atob(m[2]!);
  } catch {
    throw new Error("Arquivo de imagem inválido");
  }
  if (bin.length > MAX_BYTES) throw new Error("Imagem grande demais. Use uma de até 1,5 MB");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const valid =
    m[1] === "image/png"
      ? starts(137, 80, 78, 71, 13, 10, 26, 10)
      : m[1] === "image/jpeg"
        ? starts(255, 216, 255)
        : starts(82, 73, 70, 70) &&
          bytes.length >= 16 &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("O conteúdo do arquivo não corresponde ao tipo de imagem");
  return {
    bytes,
    tipo: m[1]!,
    ext: m[1] === "image/png" ? "png" : m[1] === "image/jpeg" ? "jpg" : "webp",
  };
}
