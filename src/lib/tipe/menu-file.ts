import type { ImportSource, ImportPhoto } from "./menu-import";
import { MAX_IMPORT_BYTES } from "./menu-import";
import { strFromU8, unzipSync } from "fflate";
import {
  multiplyPhotoMatrix,
  photoPlacement,
  photoHasStoryResolution,
  decodedMenuPhoto,
  type PhotoMatrix,
} from "./menu-photo-source";

const xml = (bytes: Uint8Array) => {
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("Documento com estrutura não permitida. Exporte como PDF.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw new Error("Arquivo de documento inválido.");
  return doc;
};
const texts = (node: Document | Element, tag: string) =>
  Array.from(node.getElementsByTagNameNS("*", tag))
    .map((n) => n.textContent ?? "")
    .join(" ");
function safeZip(data: Uint8Array) {
  let total = 0,
    count = 0;
  return unzipSync(data, {
    filter: (entry) => {
      if (++count > 2000 || (total += entry.originalSize) > 30_000_000)
        throw new Error("Documento grande demais após descompactar. Divida-o em arquivos menores.");
      return /^(word|xl)\/(document\.xml|sharedStrings\.xml|worksheets\/sheet\d+\.xml|media\/[^/]+\.(png|jpe?g|webp))$/i.test(
        entry.name,
      );
    },
  });
}
function photoFile(bytes: Uint8Array, name: string): ImportPhoto {
  const type = /\.png$/i.test(name)
    ? "image/png"
    : /\.webp$/i.test(name)
      ? "image/webp"
      : "image/jpeg";
  return { name, url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type })) };
}
export function readOfficeMenu(data: Uint8Array, kind: "docx" | "xlsx"): ImportSource {
  const zip = safeZip(data);
  let text = "";
  if (kind === "docx") {
    if (!zip["word/document.xml"]) throw new Error("Este arquivo não é um Word .docx válido.");
    const doc = xml(zip["word/document.xml"]);
    text = Array.from(doc.getElementsByTagNameNS("*", "p"))
      .map((p) => texts(p, "t"))
      .join("\n");
  } else {
    const shared = zip["xl/sharedStrings.xml"]
      ? Array.from(xml(zip["xl/sharedStrings.xml"]).getElementsByTagNameNS("*", "si")).map((n) =>
          texts(n, "t"),
        )
      : [];
    const sheets = Object.entries(zip).filter(([n]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    if (!sheets.length) throw new Error("Este arquivo não é uma planilha .xlsx válida.");
    for (const [name, bytes] of sheets) {
      text += `\n${name}\n`;
      for (const row of Array.from(xml(bytes).getElementsByTagNameNS("*", "row"))) {
        text +=
          Array.from(row.getElementsByTagNameNS("*", "c"))
            .map((c) => {
              const v = c.getElementsByTagNameNS("*", "v")[0]?.textContent ?? "";
              return c.getAttribute("t") === "s"
                ? (shared[Number(v)] ?? "")
                : c.getAttribute("t") === "inlineStr"
                  ? texts(c, "t")
                  : v;
            })
            .join(" | ") + "\n";
      }
    }
  }
  if (text.length > 60000)
    throw new Error("O texto ultrapassa 60 mil caracteres. Divida o cardápio em arquivos menores.");
  const media = Object.entries(zip).filter(([n]) => /\/media\//.test(n));
  if (media.length > 60) throw new Error("Use até 60 imagens por arquivo. Divida o documento.");
  return {
    pages: [{ text }],
    photos: media.map(([name, bytes]) => photoFile(bytes, name)),
    warnings: [],
  };
}
export async function readMenuFile(
  file: File,
  progress: (text: string) => void,
): Promise<ImportSource> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error("Envie um arquivo de até 8 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "docx" || extension === "xlsx")
    return readOfficeMenu(new Uint8Array(await file.arrayBuffer()), extension);
  if (extension === "doc" || extension === "xls")
    throw new Error("Salve o arquivo como .docx, .xlsx ou PDF e envie novamente.");
  if (extension === "txt" || extension === "csv") {
    const text = await file.text();
    if (text.length > 60000) throw new Error("Divida o arquivo em até 60 mil caracteres.");
    return { pages: [{ text }], photos: [], warnings: [] };
  }
  if (["png", "jpg", "jpeg", "webp"].includes(extension ?? "")) {
    const { reduzirImagem } = await import("@/components/tipe/UploadImagem");
    return {
      pages: [{ text: "Cardápio fotografado", image: await reduzirImagem(file, 1600) }],
      photos: [],
      warnings: [
        "A imagem inteira será lida. Fotos individuais dos pratos podem ser adicionadas na revisão.",
      ],
    };
  }
  if (extension !== "pdf") throw new Error("Use PDF, DOCX, XLSX, CSV, TXT, PNG, JPG ou WebP.");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
  });
  const pdf = await task.promise;
  const result: ImportSource = { pages: [], photos: [], warnings: [] };
  try {
    if (pdf.numPages > 12) throw new Error("Envie até 12 páginas por vez. Divida o PDF em partes.");
    for (let n = 1; n <= pdf.numPages; n++) {
      progress(`Lendo página ${n} de ${pdf.numPages}…`);
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((i) => ("str" in i ? i.str + ("hasEOL" in i && i.hasEOL ? "\n" : " ") : ""))
        .join("");
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(1600 / base.width, 1600 / base.height, 2),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      result.pages.push({
        text: `Página ${n}\n${text}`,
        image: canvas.toDataURL("image/jpeg", 0.8),
      });
      const ops = await page.getOperatorList();
      const seen = new Set<string>();
      let matrix = [...base.transform] as PhotoMatrix;
      const matrices: PhotoMatrix[] = [];
      for (let k = 0; k < ops.fnArray.length; k++) {
        const op = ops.fnArray[k];
        if (op === pdfjs.OPS.save || op === pdfjs.OPS.paintFormXObjectBegin) {
          matrices.push([...matrix]);
          if (op === pdfjs.OPS.paintFormXObjectBegin && ops.argsArray[k]?.[0])
            matrix = multiplyPhotoMatrix(matrix, ops.argsArray[k][0]);
        } else if (op === pdfjs.OPS.restore || op === pdfjs.OPS.paintFormXObjectEnd) {
          matrix = matrices.pop() ?? ([...base.transform] as PhotoMatrix);
        } else if (op === pdfjs.OPS.transform)
          matrix = multiplyPhotoMatrix(matrix, ops.argsArray[k]);
        if (ops.fnArray[k] !== pdfjs.OPS.paintImageXObject) continue;
        const id = ops.argsArray[k][0] as string;
        const placement = photoPlacement(matrix, base.width, base.height);
        const occurrence = `${id}:${matrix.join(",")}`;
        if (seen.has(occurrence)) continue;
        seen.add(occurrence);
        const store = id.startsWith("g_") ? page.commonObjs : page.objs;
        // Operator-list delivery can precede JPEG decoding. Waiting for the object
        // prevents silently dropping the restaurant's original photographs.
        const decoded = await decodedMenuPhoto(store, id);
        if (!decoded) {
          result.warnings.push(
            `Não foi possível extrair uma foto da página ${n}. Confira as imagens na revisão.`,
          );
          continue;
        }
        const im = decoded as {
          width: number;
          height: number;
          bitmap?: ImageBitmap;
          data?: Uint8ClampedArray;
          kind?: number;
        };
        if (
          im.width < 100 ||
          im.height < 100 ||
          im.width * im.height > 12_000_000 ||
          result.photos.length >= 60
        )
          continue;
        // Portrait photographs are common. Only exclude an actual full-page scan.
        if (
          placement &&
          placement.width >= 0.9 &&
          placement.height >= 0.9 &&
          text.trim().length < 30
        )
          continue;
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        if (im.bitmap) ctx.drawImage(im.bitmap, 0, 0);
        else if (im.data && im.kind === pdfjs.ImageKind.RGBA_32BPP)
          ctx.putImageData(
            new ImageData(new Uint8ClampedArray(im.data), im.width, im.height),
            0,
            0,
          );
        else if (im.data && im.kind === pdfjs.ImageKind.RGB_24BPP) {
          const rgba = new Uint8ClampedArray(im.width * im.height * 4);
          for (let a = 0, b = 0; a < im.data.length; a += 3, b += 4) {
            rgba[b] = im.data[a]!;
            rgba[b + 1] = im.data[a + 1]!;
            rgba[b + 2] = im.data[a + 2]!;
            rgba[b + 3] = 255;
          }
          ctx.putImageData(new ImageData(rgba, im.width, im.height), 0, 0);
        } else continue;
        result.photos.push({
          name: `Página ${n} · foto ${result.photos.length + 1}`,
          url: URL.createObjectURL(
            await new Promise<Blob>((resolve, reject) =>
              c.toBlob(
                (blob) =>
                  blob
                    ? resolve(blob)
                    : reject(new Error("Não foi possível extrair a foto original.")),
                "image/jpeg",
                0.95,
              ),
            ),
          ),
          width: im.width,
          height: im.height,
          pageIndex: n - 1,
          ...(placement ? { bounds: placement } : {}),
        });
        c.width = 0;
        c.height = 0;
      }
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
    if (!result.photos.length)
      result.warnings.push(
        "Não encontrei fotos individuais extraíveis. Você pode adicioná-las na revisão.",
      );
    return result;
  } catch (error) {
    releaseMenuSource(result);
    throw error;
  } finally {
    await task.destroy();
  }
}
export function releaseMenuSource(source: ImportSource) {
  source.photos.forEach((p) => {
    if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
  });
}

/** Parse inert HTML only; scripts, forms, embeds and event handlers are never executed. */
export function readMenuHtml(html: string, base: string): ImportSource {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,style,noscript,iframe,form,nav,footer,svg")
    .forEach((n) => n.remove());
  const photos: ImportPhoto[] = [];
  for (const im of Array.from(doc.querySelectorAll("img")).slice(0, 60)) {
    try {
      const url = new URL(im.getAttribute("src") ?? "", base);
      if (url.protocol === "https:" && im.getAttribute("src"))
        photos.push({
          name: im.getAttribute("alt")?.slice(0, 100) || `Foto ${photos.length + 1}`,
          url: url.href,
        });
    } catch {
      /* unsupported source */
    }
  }
  doc.querySelectorAll("br,p,div,li,tr,h1,h2,h3").forEach((n) => n.append("\n"));
  const text =
    doc.body.textContent
      ?.replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim() ?? "";
  if (text.length < 60)
    throw new Error(
      "Esse site carrega o cardápio por aplicativo ou exige acesso. Envie PDF, Word, Excel ou fotos do cardápio.",
    );
  if (text.length > 60000)
    throw new Error(
      "Essa página é muito extensa. Use o link direto do cardápio ou envie o arquivo.",
    );
  return {
    pages: [{ text }],
    photos,
    warnings: [
      "Confira se todos os itens e preços da página foram encontrados. Conteúdo carregado só por aplicativo pode não estar disponível.",
    ],
  };
}

export async function cropMenuPhoto(
  url: string,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const image = await createImageBitmap(await (await fetch(url)).blob());
  try {
    if (!photoHasStoryResolution(image.width * bounds.width, image.height * bounds.height))
      return null;
    const scale = Math.min(
      1,
      1200 / (image.width * bounds.width),
      2000 / (image.height * bounds.height),
    );
    const width = Math.max(1, Math.round(image.width * bounds.width * scale));
    const height = Math.max(1, Math.round(image.height * bounds.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = height;
    canvas
      .getContext("2d")!
      .drawImage(
        image,
        image.width * bounds.x,
        image.height * bounds.y,
        image.width * bounds.width,
        image.height * bounds.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    const result = URL.createObjectURL(
      await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Não foi possível preparar o recorte.")),
          "image/jpeg",
          0.94,
        ),
      ),
    );
    canvas.width = canvas.height = 0;
    return result;
  } finally {
    image.close();
  }
}
