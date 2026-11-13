import { instanteFiscal } from "./time";
import { describe, expect, it, vi } from "vitest";
import { ErroEmissorFiscal, type EmissorFiscal, type ResultadoFiscal } from "./contract";
import { processarTrabalhoFiscal, type TrabalhoFiscal } from "./processor";
const result: ResultadoFiscal = {
  referencia: "doc-1",
  ambiente: "homologacao",
  modelo: "nfce",
  estado: "autorizado",
  chave: `23261112345678000195${"1".repeat(24)}`,
  codigoSefaz: "100",
};
const job = (): TrabalhoFiscal => ({
  id: "job-1",
  lease: "lease-1",
  restaurantId: "restaurant-1",
  operation: "issue",
  sendStartedAt: null,
  reason: null,
  document: {
    id: "doc-1",
    restaurantId: "restaurant-1",
    reference: "doc-1",
    environment: "homologacao",
    model: "nfce",
    state: "queued",
    issuerCnpj: "12345678000195",
    timeZone: "America/Fortaleza",
    taxDate: instanteFiscal(new Date(), "America/Fortaleza").slice(0, 10),
    payload: { cnpj_emitente: "12345678000195", itens: [] },
  },
  configuration: {
    restaurantId: "restaurant-1",
    cnpj: "12345678000195",
    timeZone: "America/Fortaleza",
    enabled: true,
    environment: "homologacao",
  },
});
function dependencies() {
  const e: EmissorFiscal = {
    id: "fake",
    modelos: ["nfce"],
    emitir: vi.fn().mockResolvedValue(result),
    consultar: vi.fn().mockResolvedValue(result),
    cancelar: vi.fn().mockResolvedValue({ ...result, estado: "cancelado" }),
  };
  return {
    e,
    beginSend: vi.fn().mockResolvedValue(true),
    emitter: vi.fn().mockResolvedValue(e),
    finish: vi.fn().mockResolvedValue(true),
  };
}
describe("processamento fiscal com lease", () => {
  it("marca o envio antes de chamar o emissor", async () => {
    const j = job();
    const d = dependencies();
    await processarTrabalhoFiscal(j, d);
    expect(d.beginSend.mock.invocationCallOrder[0]).toBeLessThan(
      (d.e.emitir as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!,
    );
    expect(d.e.emitir).toHaveBeenCalledOnce();
    expect(d.finish).toHaveBeenCalledWith(j, { result, error: null, fatal: false });
  });
  it("envia exatamente o payload com horário que foi persistido", async () => {
    const j = job();
    j.document.taxDate = "2026-11-11";
    const d = dependencies();
    await processarTrabalhoFiscal(j, { ...d, now: () => new Date("2026-11-11T15:40:21Z") });
    const payload = d.beginSend.mock.calls[0]![1];
    expect(payload).toEqual({
      cnpj_emitente: "12345678000195",
      itens: [],
      data_emissao: "2026-11-11T12:40:21-03:00",
    });
    expect(d.e.emitir).toHaveBeenCalledWith("nfce", "doc-1", payload);
    expect(j.document.payload).toEqual({ cnpj_emitente: "12345678000195", itens: [] });
  });
  it("bloqueia envio quando mudou o dia fiscal dos tributos", async () => {
    const j = job();
    j.document.taxDate = "2026-11-10";
    const d = dependencies();
    await processarTrabalhoFiscal(j, { ...d, now: () => new Date("2026-11-11T15:40:21Z") });
    expect(d.beginSend).not.toHaveBeenCalled();
    expect(d.e.emitir).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenCalledWith(j, {
      result: null,
      error: "tax_date_changed",
      fatal: true,
    });
  });
  it("não envia se o lease deixou de ser válido", async () => {
    const d = dependencies();
    d.beginSend.mockResolvedValue(false);
    await processarTrabalhoFiscal(job(), d);
    expect(d.e.emitir).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenCalledWith(expect.anything(), {
      result: null,
      error: "dispatch_precondition_changed",
      fatal: true,
    });
  });
  it("depois de interrupção consulta a referência, sem repetir o POST", async () => {
    const j = job();
    j.sendStartedAt = "2026-11-11T12:00:00Z";
    const d = dependencies();
    await processarTrabalhoFiscal(j, d);
    expect(d.e.consultar).toHaveBeenCalledWith("nfce", "doc-1");
    expect(d.beginSend).not.toHaveBeenCalled();
    expect(d.e.emitir).not.toHaveBeenCalled();
  });
  it("timeout não autoriza nem repete emissão", async () => {
    const j = job();
    const d = dependencies();
    (d.e.emitir as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ErroEmissorFiscal("resultado_incerto"),
    );
    await processarTrabalhoFiscal(j, d);
    expect(d.e.emitir).toHaveBeenCalledOnce();
    expect(d.finish).toHaveBeenCalledWith(j, {
      result: null,
      error: "resultado_incerto",
      fatal: false,
    });
  });
  it("404 após interrupção continua como pendência de consulta", async () => {
    const j = job();
    j.sendStartedAt = "2026-11-11T12:00:00Z";
    const d = dependencies();
    (d.e.consultar as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ErroEmissorFiscal("nao_encontrado"),
    );
    await processarTrabalhoFiscal(j, d);
    expect(d.finish).toHaveBeenCalledWith(j, {
      result: null,
      error: "nao_encontrado",
      fatal: false,
    });
    expect(d.e.emitir).not.toHaveBeenCalled();
  });
  it("bloqueia configuração e documento de empresas ou ambientes diferentes", async () => {
    for (const change of [
      (j: TrabalhoFiscal) => {
        j.configuration!.restaurantId = "other";
      },
      (j: TrabalhoFiscal) => {
        j.document.restaurantId = "other";
      },
      (j: TrabalhoFiscal) => {
        j.configuration!.environment = "producao";
      },
      (j: TrabalhoFiscal) => {
        j.configuration!.cnpj = "11222333000181";
      },
    ]) {
      const j = job();
      change(j);
      const d = dependencies();
      await processarTrabalhoFiscal(j, d);
      expect(d.emitter).not.toHaveBeenCalled();
      expect(d.finish).toHaveBeenCalledWith(j, {
        result: null,
        error: "configuration_mismatch",
        fatal: true,
      });
    }
  });
  it("emissão desabilitada não inicia envio, mas consulta do envio anterior continua", async () => {
    const j = job();
    j.configuration!.enabled = false;
    const d = dependencies();
    await processarTrabalhoFiscal(j, d);
    expect(d.beginSend).not.toHaveBeenCalled();
    expect(d.emitter).not.toHaveBeenCalled();
    j.sendStartedAt = "2026-11-11T12:00:00Z";
    await processarTrabalhoFiscal(j, d);
    expect(d.e.consultar).toHaveBeenCalledOnce();
    expect(d.e.emitir).not.toHaveBeenCalled();
  });
  it("cancelamento tem marcação própria e uma justificativa explícita", async () => {
    const j = job();
    j.operation = "cancel";
    j.document.state = "authorized";
    j.reason = "Correção solicitada pelo responsável";
    const d = dependencies();
    await processarTrabalhoFiscal(j, d);
    expect(d.e.cancelar).toHaveBeenCalledWith("nfce", "doc-1", j.reason);
    expect(d.e.emitir).not.toHaveBeenCalled();
  });
  it("cancelamento interrompido só consulta, sem repetir DELETE", async () => {
    const j = job();
    j.operation = "cancel";
    j.document.state = "authorized";
    j.sendStartedAt = "2026-11-11T12:00:00Z";
    const d = dependencies();
    await processarTrabalhoFiscal(j, d);
    expect(d.e.consultar).toHaveBeenCalledOnce();
    expect(d.e.cancelar).not.toHaveBeenCalled();
  });
  it("não aceita resultado de outro documento ou ambiente", async () => {
    const j = job();
    const d = dependencies();
    (d.e.emitir as ReturnType<typeof vi.fn>).mockResolvedValue({ ...result, ambiente: "producao" });
    await processarTrabalhoFiscal(j, d);
    expect(d.finish).toHaveBeenCalledWith(j, {
      result: null,
      error: "resultado_incerto",
      fatal: false,
    });
  });
  it("não grava mensagens de erro potencialmente sensíveis", async () => {
    const j = job();
    const d = dependencies();
    (d.e.emitir as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("token=segredo dados privados"),
    );
    await processarTrabalhoFiscal(j, d);
    expect(d.finish).toHaveBeenCalledWith(j, {
      result: null,
      error: "resultado_incerto",
      fatal: false,
    });
  });
});
