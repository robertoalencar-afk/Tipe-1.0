/** Contrato do módulo fiscal. Não presume alíquotas nem habilita emissão em produção. */
export const UFS_FISCAIS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;
export const FUSOS_FISCAIS_BR = [
  "America/Araguaina",
  "America/Bahia",
  "America/Belem",
  "America/Boa_Vista",
  "America/Campo_Grande",
  "America/Cuiaba",
  "America/Eirunepe",
  "America/Fortaleza",
  "America/Maceio",
  "America/Manaus",
  "America/Noronha",
  "America/Porto_Velho",
  "America/Recife",
  "America/Rio_Branco",
  "America/Santarem",
  "America/Sao_Paulo",
] as const;
export type UfFiscal = (typeof UFS_FISCAIS)[number];
export type AmbienteFiscal = "homologacao" | "producao";
export type ModeloFiscal = "nfe" | "nfce" | "nfse";
export type JsonFiscal =
  null | boolean | number | string | JsonFiscal[] | { [key: string]: JsonFiscal };

export type PerfilTributarioVersionado = {
  id: string;
  uf: UfFiscal;
  regime: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  versaoLeiaute: string;
  versaoTabelas: string;
  revisadoEm: string;
  revisadoPor: string;
};

export type ResultadoFiscal = {
  referencia: string;
  ambiente: AmbienteFiscal;
  modelo: ModeloFiscal;
  estado: "autorizado" | "processando" | "rejeitado" | "denegado" | "cancelado" | "desconhecido";
  chave: string | null;
  codigoSefaz: string | null;
  arquivos?: { xml: string | null; danfe: string | null; cancelamento: string | null };
  protocolo?: string | null;
  autorizadoEm?: string | null;
};

export interface EmissorFiscal {
  readonly id: string;
  readonly modelos: readonly ModeloFiscal[];
  emitir(
    modelo: ModeloFiscal,
    referencia: string,
    payloadPreparadoNoServidor: Record<string, JsonFiscal>,
  ): Promise<ResultadoFiscal>;
  consultar(modelo: ModeloFiscal, referencia: string): Promise<ResultadoFiscal>;
  cancelar(
    modelo: ModeloFiscal,
    referencia: string,
    justificativa: string,
  ): Promise<ResultadoFiscal>;
}

/** Não confundir aprovação do pagamento, recepção HTTP e autorização fiscal. */
export class ErroEmissorFiscal extends Error {
  constructor(
    public readonly motivo:
      | "configuracao"
      | "modelo_nao_suportado"
      | "acesso"
      | "nao_encontrado"
      | "requisicao"
      | "resultado_incerto",
  ) {
    super(
      {
        configuracao: "Configuração fiscal inválida ou produção não habilitada.",
        modelo_nao_suportado: "Este conector não suporta o documento solicitado.",
        acesso: "O emissor recusou as credenciais ou a permissão desta empresa.",
        nao_encontrado: "Documento não encontrado no emissor.",
        requisicao: "O emissor recusou a solicitação fiscal.",
        resultado_incerto:
          "Resultado fiscal não confirmado. Consulte a mesma referência antes de reenviar.",
      }[motivo],
    );
  }
}

/** Seleção por vigência evita reutilizar uma tributação vencida ou sobreposta. */
export function selecionarPerfilFiscal(
  perfis: readonly PerfilTributarioVersionado[],
  uf: UfFiscal,
  regime: string,
  dia: string,
) {
  const diaValido = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const candidatos = perfis.filter((p) => p.uf === uf && p.regime === regime);
  if (
    !diaValido(dia) ||
    candidatos.some(
      (p) =>
        !diaValido(p.vigenciaInicio) ||
        (p.vigenciaFim !== null && (!diaValido(p.vigenciaFim) || p.vigenciaFim < p.vigenciaInicio)),
    )
  )
    throw new ErroEmissorFiscal("configuracao");
  const validos = candidatos.filter(
    (p) =>
      p.uf === uf &&
      p.regime === regime &&
      p.vigenciaInicio <= dia &&
      (!p.vigenciaFim || p.vigenciaFim >= dia),
  );
  if (
    validos.length !== 1 ||
    !validos[0]?.revisadoPor ||
    !validos[0]?.versaoLeiaute ||
    !validos[0]?.versaoTabelas
  ) {
    throw new ErroEmissorFiscal("configuracao");
  }
  return validos[0];
}
