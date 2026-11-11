import {
  ErroEmissorFiscal,
  type AmbienteFiscal,
  type EmissorFiscal,
  type JsonFiscal,
  type ModeloFiscal,
  type ResultadoFiscal,
} from "./contract";

// Endereços fixos: credenciais nunca são enviadas a uma URL fornecida pelo navegador.
const ORIGENS = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
} as const;

/** Transporte server-side. Não substitui autorização por restaurante, motor tributário ou outbox. */
export function criarEmissorFocus(
  config: {
    ambiente: AmbienteFiscal;
    cnpj: string;
    token: string;
    producaoHabilitada?: boolean;
  },
  requisitar: typeof fetch = fetch,
): EmissorFiscal {
  const cnpj = config.cnpj.replace(/[./-]/g, "").toUpperCase();
  if (
    !Object.hasOwn(ORIGENS, config.ambiente) ||
    !/^[A-Z0-9]{12}\d{2}$/.test(cnpj) ||
    !/^[\x21-\x7E]+$/.test(config.token) ||
    (config.ambiente === "producao" && !config.producaoHabilitada)
  ) {
    throw new ErroEmissorFiscal("configuracao");
  }
  // Captura valores: mudar o objeto do chamador depois não altera ambiente ou empresa.
  const ambiente = config.ambiente;
  const authorization = `Basic ${btoa(`${config.token}:`)}`;

  async function executar(
    modelo: ModeloFiscal,
    referencia: string,
    method: "GET" | "POST" | "DELETE",
    payload?: Record<string, JsonFiscal>,
  ): Promise<ResultadoFiscal> {
    if (modelo !== "nfe" && modelo !== "nfce") throw new ErroEmissorFiscal("modelo_nao_suportado");
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(referencia)) throw new ErroEmissorFiscal("requisicao");
    const url = new URL(
      `/v2/${modelo}${method === "POST" ? "" : `/${referencia}`}`,
      ORIGENS[ambiente],
    );
    if (method === "POST") url.searchParams.set("ref", referencia);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await requisitar(url, {
        method,
        redirect: "error",
        signal: abort.signal,
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      if (response.status === 401 || response.status === 403) throw new ErroEmissorFiscal("acesso");
      if (response.status === 404) throw new ErroEmissorFiscal("nao_encontrado");
      // Conflito, processamento ou indisponibilidade exigem consulta; nunca repetir emissão às cegas.
      if (response.status === 409 || response.status === 429 || response.status >= 500)
        throw new ErroEmissorFiscal("resultado_incerto");
      if (!response.ok) throw new ErroEmissorFiscal("requisicao");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new ErroEmissorFiscal("resultado_incerto");
      const r = body as Record<string, unknown>;
      if (
        (typeof r["cnpj_emitente"] === "string" &&
          r["cnpj_emitente"].replace(/[./-]/g, "").toUpperCase() !== cnpj) ||
        (r["ref"] !== undefined && r["ref"] !== referencia)
      ) {
        throw new ErroEmissorFiscal("resultado_incerto");
      }
      const chave =
        typeof r["chave_nfe"] === "string" && /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(r["chave_nfe"])
          ? r["chave_nfe"]
          : null;
      const estados: Record<string, ResultadoFiscal["estado"]> = {
        autorizado: "autorizado",
        processando_autorizacao: "processando",
        erro_autorizacao: "rejeitado",
        denegado: "rejeitado",
        cancelado: "cancelado",
      };
      let estado =
        typeof r["status"] === "string" ? (estados[r["status"]] ?? "desconhecido") : "desconhecido";
      if (estado === "autorizado" && !chave) estado = "desconhecido";
      return {
        referencia,
        ambiente,
        modelo,
        estado,
        chave,
        codigoSefaz:
          typeof r["status_sefaz"] === "string" && /^\d{3}$/.test(r["status_sefaz"])
            ? r["status_sefaz"]
            : null,
      };
    } catch (e) {
      if (e instanceof ErroEmissorFiscal) throw e;
      // Não propagar corpo, token ou mensagens de erro do transporte para logs/UI.
      throw new ErroEmissorFiscal("resultado_incerto");
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    id: "focus",
    modelos: ["nfe", "nfce"],
    emitir(modelo, referencia, payload) {
      if (
        payload["cnpj_emitente"] !== undefined &&
        String(payload["cnpj_emitente"]).replace(/[./-]/g, "").toUpperCase() !== cnpj
      )
        throw new ErroEmissorFiscal("configuracao");
      return executar(modelo, referencia, "POST", { ...payload, cnpj_emitente: cnpj });
    },
    consultar: (modelo, referencia) => executar(modelo, referencia, "GET"),
    cancelar(modelo, referencia, justificativa) {
      const motivo = justificativa.trim();
      if (motivo.length < 15 || motivo.length > 255) throw new ErroEmissorFiscal("requisicao");
      return executar(modelo, referencia, "DELETE", { justificativa: motivo });
    },
  };
}
