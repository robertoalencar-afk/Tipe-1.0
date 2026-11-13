import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  authorize: vi.fn(),
  select: vi.fn(),
  api: vi.fn(),
  rate: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./founder-guard", () => ({ requireFounder2fa: m.authorize }));
vi.mock("./security.server", () => ({ enforceRate: m.rate, logSecurityEvent: m.log }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ select: m.select }) },
}));
vi.mock("./pagarme.server", () => ({
  SIMULATION_RESTAURANT_SLUGS: ["bistro-teste"],
  pagarmeEnabled: () => !!process.env.PAGARME_SECRET_KEY,
  pagarme: m.api,
}));
import {
  getPaymentIntegrationStatus,
  validatePlatformPaymentApi,
} from "./payment-integration.functions";

const run = (fn: unknown) =>
  (fn as (args: unknown) => Promise<unknown>)({ context: { userId: "founder" } });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAGARME_SECRET_KEY", "sk_private-never-return");
  m.authorize.mockResolvedValue(undefined);
  m.select.mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("API de pagamentos na Central", () => {
  it("exige fundador com 2FA antes de consultar conexão ou provedor", async () => {
    m.authorize.mockRejectedValue(new Error("2FA obrigatório"));
    await expect(run(getPaymentIntegrationStatus)).rejects.toThrow("2FA");
    await expect(run(validatePlatformPaymentApi)).rejects.toThrow("2FA");
    expect(m.select).not.toHaveBeenCalled();
    expect(m.api).not.toHaveBeenCalled();
  });
  it("retorna somente agregados e não confunde demonstração com restaurante real", async () => {
    m.select.mockResolvedValue({
      data: [
        { status: "active", key_mode: "live", restaurants: { slug: "bistro-teste" } },
        { status: "active", key_mode: "live", restaurants: { slug: "restaurante" } },
      ],
      error: null,
    });
    const result = await run(getPaymentIntegrationStatus);
    expect(result).toMatchObject({ restaurants: { live: 1, test: 0, demo: 1 } });
    expect(JSON.stringify(result)).not.toContain("sk_private");
    expect(JSON.stringify(result)).not.toContain("bistro-teste");
  });
  it("valida com leitura, sem criar pedidos ou devolver dados de cobrança", async () => {
    m.api.mockResolvedValue({ data: [{ id: "private-order" }] });
    const result = await run(validatePlatformPaymentApi);
    expect(m.api).toHaveBeenCalledExactlyOnceWith("/orders?page=1&size=1");
    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain("private-order");
  });
  it("não revela erros privados recebidos do provedor", async () => {
    m.api.mockRejectedValue(new Error("credencial privada ou conteúdo do pedido"));
    const result = await run(validatePlatformPaymentApi);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("credencial privada");
    expect(m.log).toHaveBeenCalledWith(expect.objectContaining({ result: "error" }));
  });
});
