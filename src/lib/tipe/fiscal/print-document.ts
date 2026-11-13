/** HTML do emissor é um documento isolado, nunca conteúdo executável da Gestão. */
export function isolarHtmlFiscal(html: string) {
  const policy =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}">${html}`;
}
