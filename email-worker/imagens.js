// Imagens embutidas (cid:) viram data: URI enquanto couberem no limite do HTML guardado (800 mil caracteres).
// Anexos comuns continuam só como metadados.
const LIMITE_HTML = 780000;
function base64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function embutirImagens(html, anexos) {
  if (!html) return null;
  if (html.length > LIMITE_HTML) return html.slice(0, LIMITE_HTML);
  let out = html;
  const imgs = (anexos ?? [])
    .filter((a) => a.contentId && /^image\//i.test(a.mimeType ?? "") && a.content)
    .sort((x, y) => (x.content.byteLength ?? 0) - (y.content.byteLength ?? 0));
  for (const a of imgs) {
    const id = a.contentId.replace(/^<|>$/g, "");
    const alvo = new RegExp(`cid:${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
    const usos = (out.match(alvo) ?? []).length;
    if (!usos) continue;
    const uri = `data:${a.mimeType.toLowerCase()};base64,${base64(a.content)}`;
    if (out.length + usos * (uri.length - id.length - 4) > LIMITE_HTML) continue;
    out = out.replace(alvo, uri);
  }
  return out;
}
