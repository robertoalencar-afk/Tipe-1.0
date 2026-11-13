import type { AmbienteFiscal } from "./contract";
import { ErroEmissorFiscal } from "./contract";
const origins = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
} as const;
export function urlArquivoFiscalFocus(environment: AmbienteFiscal, key: string, path: unknown) {
  if (
    !Object.hasOwn(origins, environment) ||
    !/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(key) ||
    typeof path !== "string" ||
    path.length > 1600 ||
    !path.startsWith("/") ||
    path.startsWith("//")
  )
    return null;
  const url = new URL(path, origins[environment]);
  if (
    url.origin !== origins[environment] ||
    url.search ||
    url.hash ||
    !/^\/(arquivos(?:_development)?|notas_fiscais(?:_consumidor)?)(\/|$)/.test(url.pathname) ||
    !url.pathname.includes(key)
  )
    return null;
  return url;
}

/** Download privado e limitado; sem redirecionar credenciais a outro domínio. */
export async function baixarArquivoFiscalFocus(
  input: {
    environment: AmbienteFiscal;
    key: string;
    path: string;
    token: string;
    kind: "xml" | "danfe" | "cancelamento";
  },
  request: typeof fetch = fetch,
) {
  const url = urlArquivoFiscalFocus(input.environment, input.key, input.path);
  if (!url || !/^[\x21-\x7E]+$/.test(input.token)) throw new ErroEmissorFiscal("configuracao");
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await request(url, {
      redirect: "error",
      signal: abort.signal,
      headers: {
        Authorization: `Basic ${btoa(`${input.token}:`)}`,
        Accept: input.kind === "danfe" ? "application/pdf, text/html" : "application/xml, text/xml",
      },
    });
    if (!response.ok) throw new ErroEmissorFiscal("resultado_incerto");
    const max = 10 * 1024 * 1024;
    if (Number(response.headers.get("content-length")) > max || !response.body)
      throw new ErroEmissorFiscal("resultado_incerto");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > max) {
          await reader.cancel();
          throw new ErroEmissorFiscal("resultado_incerto");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const pdf =
      type === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    const html = type === "text/html";
    const xml = type === "application/xml" || type === "text/xml";
    if (input.kind === "danfe" ? !pdf && !html : !xml)
      throw new ErroEmissorFiscal("resultado_incerto");
    return {
      bytes,
      mime: pdf ? "application/pdf" : html ? "text/html" : "application/xml",
      extension: pdf ? "pdf" : html ? "html" : "xml",
    };
  } catch (error) {
    throw error instanceof ErroEmissorFiscal ? error : new ErroEmissorFiscal("resultado_incerto");
  } finally {
    clearTimeout(timer);
  }
}
