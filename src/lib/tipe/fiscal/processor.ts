import { instanteFiscal } from "./time";
import {
  ErroEmissorFiscal,
  type EmissorFiscal,
  type JsonFiscal,
  type ResultadoFiscal,
} from "./contract";

export type TrabalhoFiscal = {
  id: string;
  lease: string;
  restaurantId: string;
  operation: "issue" | "consult" | "cancel";
  sendStartedAt: string | null;
  reason: string | null;
  document: {
    id: string;
    restaurantId: string;
    reference: string;
    environment: "homologacao" | "producao";
    model: "nfe" | "nfce";
    state: string;
    issuerCnpj: string;
    timeZone: string;
    taxDate: string;
    payload: Record<string, JsonFiscal>;
    sourceSaleId?: string | null;
    preparationFingerprint?: string | null;
  };
  configuration: {
    restaurantId: string;
    cnpj: string;
    timeZone: string;
    enabled: boolean;
    environment: "homologacao" | "producao";
  } | null;
};
export type RetornoTrabalhoFiscal = {
  result: ResultadoFiscal | null;
  error: string | null;
  fatal: boolean;
};
export type DependenciasFilaFiscal = {
  beginSend: (job: TrabalhoFiscal, payload: Record<string, JsonFiscal>) => Promise<boolean>;
  now?: () => Date;
  validateBeforeSend?: (job: TrabalhoFiscal) => Promise<boolean>;
  emitter: (job: TrabalhoFiscal) => Promise<EmissorFiscal>;
  finish: (job: TrabalhoFiscal, outcome: RetornoTrabalhoFiscal) => Promise<boolean>;
};

/** Nenhuma chamada de emissão é repetida depois da marcação durável de envio. */
export async function processarTrabalhoFiscal(job: TrabalhoFiscal, deps: DependenciasFilaFiscal) {
  const cfg = job.configuration;
  if (
    !cfg ||
    cfg.restaurantId !== job.restaurantId ||
    job.document.restaurantId !== job.restaurantId ||
    cfg.environment !== job.document.environment ||
    cfg.cnpj !== job.document.issuerCnpj
  ) {
    await deps.finish(job, { result: null, error: "configuration_mismatch", fatal: true });
    return;
  }
  if (job.operation === "issue" && !job.sendStartedAt && !cfg.enabled) {
    await deps.finish(job, { result: null, error: "emission_disabled", fatal: false });
    return;
  }
  try {
    let result: ResultadoFiscal;
    const terminal = ["authorized", "cancelled", "denied", "rejected"].includes(job.document.state);
    const consultOnly =
      job.operation === "consult" ||
      job.sendStartedAt ||
      (job.operation === "issue" && terminal) ||
      (job.operation === "cancel" && job.document.state !== "authorized");
    if (
      !consultOnly &&
      job.operation === "issue" &&
      deps.validateBeforeSend &&
      !(await deps.validateBeforeSend(job))
    ) {
      await deps.finish(job, { result: null, error: "sale_preflight_changed", fatal: true });
      return;
    }
    const emitter = await deps.emitter(job);
    if (consultOnly) {
      result = await emitter.consultar(job.document.model, job.document.reference);
    } else {
      if (job.operation === "cancel" && (!job.reason || job.reason.trim().length < 15))
        throw new ErroEmissorFiscal("requisicao");
      if (job.operation === "issue" && job.document.payload["cnpj_emitente"] !== cfg.cnpj)
        throw new ErroEmissorFiscal("configuracao");
      const payload: Record<string, JsonFiscal> =
        job.operation === "issue"
          ? {
              ...job.document.payload,
              data_emissao: instanteFiscal(deps.now?.() ?? new Date(), cfg.timeZone),
            }
          : { justificativa: job.reason!.trim() };
      if (
        job.operation === "issue" &&
        (cfg.timeZone !== job.document.timeZone ||
          String(payload["data_emissao"]).slice(0, 10) !== job.document.taxDate)
      ) {
        await deps.finish(job, { result: null, error: "tax_date_changed", fatal: true });
        return;
      }
      if (!(await deps.beginSend(job, payload))) {
        // A RPC de conclusão também confere o lease: trabalhador antigo não altera a fila.
        await deps.finish(job, {
          result: null,
          error: "dispatch_precondition_changed",
          fatal: true,
        });
        return;
      }
      result =
        job.operation === "issue"
          ? await emitter.emitir(job.document.model, job.document.reference, payload)
          : await emitter.cancelar(job.document.model, job.document.reference, job.reason!);
    }
    if (
      result.ambiente !== job.document.environment ||
      result.referencia !== job.document.reference ||
      result.modelo !== job.document.model
    )
      throw new ErroEmissorFiscal("resultado_incerto");
    await deps.finish(job, { result, error: null, fatal: false });
  } catch (error) {
    const code = error instanceof ErroEmissorFiscal ? error.motivo : "resultado_incerto";
    // Falhas de transporte e 404 após envio exigem consulta, nunca novo POST.
    await deps.finish(job, {
      result: null,
      error: code,
      fatal: ["configuracao", "modelo_nao_suportado", "acesso", "requisicao"].includes(code),
    });
  }
}
