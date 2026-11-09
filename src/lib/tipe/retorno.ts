/**
 * Caminho de retorno após o login (?r=). Só aceita caminhos internos do app:
 * "/slug" ou "/slug/area" (ex.: /maregalta/cozinha). Recusa URLs externas,
 * "//host", barras invertidas, "..", query/hash e caracteres de controle,
 * para impedir redirecionamento aberto.
 */
const SEGMENTO = /^[a-z0-9][a-z0-9-]*$/i;

export function caminhoRetornoSeguro(r: unknown): string | undefined {
  if (typeof r !== "string" || r.length === 0 || r.length > 120) return undefined;
  if (!r.startsWith("/") || r.startsWith("//")) return undefined;
  if (/[\\?#%\u0000-\u001f]/.test(r)) return undefined;
  const partes = r.slice(1).split("/");
  if (partes.length > 3) return undefined;
  if (!partes.every((p) => SEGMENTO.test(p))) return undefined;
  return r;
}
