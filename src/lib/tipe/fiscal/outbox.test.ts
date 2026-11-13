import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  decrypt: vi.fn(),
  issue: vi.fn(),
  consult: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("./source.server", () => ({ prepararVendaFiscalServidor: mocks.prepare }));
vi.mock("../pagarme.server", () => ({ decryptSecret: mocks.decrypt }));
vi.mock("./focus.server", () => ({
  criarEmissorFocus: () => ({
    emitir: mocks.issue,
    consultar: mocks.consult,
    cancelar: mocks.cancel,
  }),
}));
import { processarFilaFiscal } from "./outbox.server";
const rid = "20000000-0000-0000-0000-000000000001";
const did = "30000000-0000-0000-0000-000000000001";
const jid = "40000000-0000-0000-0000-000000000001";
const lease = "50000000-0000-0000-0000-000000000001";
function fixture() {
  const job = {
    id: jid,
    restaurant_id: rid,
    document_id: did,
    lease_token: lease,
    operation: "issue",
    send_started_at: null as string | null,
    reason: null,
  };
  const doc = {
    id: did,
    restaurant_id: rid,
    provider_reference: "doc-fixture",
    environment: "homologacao",
    model: "nfce",
    state: "queued",
    issuer_cnpj: "12345678000195",
    time_zone: "America/Fortaleza",
    tax_date: "2026-11-11",
    source_sale_id: "60000000-0000-0000-0000-000000000001",
    preparation_fingerprint: "a".repeat(64),
    payments_snapshot: [],
    payload_snapshot: { cnpj_emitente: "12345678000195", items: [] },
  };
  const cfg = {
    restaurant_id: rid,
    environment: "homologacao",
    cnpj: "12345678000195",
    time_zone: "America/Fortaleza",
    enabled: true,
    credentials_encrypted: "cifrado-ficticio",
  };
  const scopes: unknown[][] = [];
  const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>) => ({
    data: name === "fiscal_outbox_claim" ? [job] : true,
    error: null,
  }));
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key, value) => {
        scopes.push([table, key, value]);
        return query;
      }),
      single: async () => ({
        data: table === "restaurants" ? { slug: "fixture", cnpj: "12345678000195" } : doc,
        error: null,
      }),
      maybeSingle: async () => ({ data: cfg, error: null }),
    };
    return query;
  });
  return { job, doc, cfg, scopes, rpc, db: { from, rpc } as unknown as SupabaseClient<Database> };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-11T15:40:21Z"));
  mocks.prepare.mockResolvedValue({ fingerprint: "a".repeat(64) });
  mocks.decrypt.mockResolvedValue("token-ficticio");
  const result = {
    referencia: "doc-fixture",
    ambiente: "homologacao",
    modelo: "nfce",
    estado: "autorizado",
    chave: "1".repeat(44),
    codigoSefaz: "100",
    arquivos: { xml: "/xml", danfe: "/danfe", cancelamento: null },
  };
  mocks.issue.mockResolvedValue(result);
  mocks.consult.mockResolvedValue(result);
});
afterEach(() => vi.useRealTimers());
describe("adaptador persistente da fila fiscal", () => {
  it("consulta apenas o restaurante e documento reservados e grava o payload antes do envio", async () => {
    const f = fixture();
    expect(await processarFilaFiscal(f.db)).toEqual({ processed: 1, deferred: 0 });
    expect(f.scopes).toContainEqual(["fiscal_documents", "restaurant_id", rid]);
    expect(f.scopes).toContainEqual(["fiscal_documents", "id", did]);
    expect(f.scopes).toContainEqual(["restaurant_fiscal_settings", "environment", "homologacao"]);
    const begin = f.rpc.mock.calls.find((args) => args[0] === "fiscal_outbox_begin_send");
    expect(begin?.[1]).toMatchObject({
      p_job: jid,
      p_lease: lease,
      p_payload: { cnpj_emitente: "12345678000195", data_emissao: "2026-11-11T12:40:21-03:00" },
    });
    expect(mocks.issue).toHaveBeenCalledWith(
      "nfce",
      "doc-fixture",
      (begin?.[1] as { p_payload: unknown }).p_payload,
    );
    expect(f.rpc).toHaveBeenCalledWith(
      "fiscal_outbox_finish",
      expect.objectContaining({ p_result: expect.objectContaining({ state: "authorized" }) }),
    );
  });
  it("não usa a credencial fiscal se a conciliação final mudou", async () => {
    const f = fixture();
    mocks.prepare.mockResolvedValue({ fingerprint: "b".repeat(64) });
    await processarFilaFiscal(f.db);
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(f.rpc).toHaveBeenCalledWith(
      "fiscal_outbox_finish",
      expect.objectContaining({ p_error: "sale_preflight_changed", p_fatal: true }),
    );
    expect(f.rpc.mock.calls.some((args) => args[0] === "fiscal_outbox_begin_send")).toBe(false);
  });
  it("consulta o envio anterior sem criar outra nota", async () => {
    const f = fixture();
    f.job.send_started_at = "2026-11-11T15:39:00Z";
    await processarFilaFiscal(f.db);
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(mocks.consult).toHaveBeenCalledWith("nfce", "doc-fixture");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("configuração desabilitada não decripta nem usa a credencial para emitir", async () => {
    const f = fixture();
    f.cfg.enabled = false;
    await processarFilaFiscal(f.db);
    expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
  });
  it("empresa divergente é recusada antes de usar a credencial", async () => {
    const f = fixture();
    f.cfg.cnpj = "11222333000181";
    await processarFilaFiscal(f.db);
    expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});
