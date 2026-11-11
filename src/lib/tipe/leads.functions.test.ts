import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  single: vi.fn(),
  retry: vi.fn(),
  rate: vi.fn(),
  email: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      inputValidator(fn: typeof validate) {
        validate = fn;
        return builder;
      },
      middleware() {
        return builder;
      },
      handler(fn: (args: unknown) => unknown) {
        return (args: { data: unknown }) => fn({ data: validate(args.data) });
      },
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./security.server", () => ({ enforceRate: mocks.rate, clientIp: () => "127.0.0.1" }));
vi.mock("@/lib/email-templates/send-email", () => ({ sendTemplateEmail: mocks.email }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: unknown) => {
        mocks.insert(row);
        return { select: () => ({ single: mocks.single }) };
      },
      select: () => ({ eq: () => ({ single: mocks.retry }) }),
    }),
  },
}));
import { submitLead } from "./leads.functions";
const input = {
  contactName: "Teste Automatizado",
  phone: "(85) 99999-9999",
  email: "qa@example.invalid",
  restaurantName: "QA isolado",
  city: "Fortaleza",
  state: "CE",
  role: "dono",
  tablesRange: "ate_10",
  pdvSystem: "Não uso PDV",
  acquirer: "Não uso maquininha",
  privacyAccepted: true,
  marketingOptIn: false,
  submissionKey: "c4d1f4f9-6928-427d-becb-26aad3eaef6d",
  utm_source: "qa",
  originPage: "tipe-order",
  launchState: "disponivel",
  calculator: { mesas: 10 },
  selectedPlan: "essencial",
};
const saved = { id: "lead-qa", ref_code: "refqa", update_token: "token-qa" };
const send = (data: unknown) => submitLead({ data } as never);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.single.mockResolvedValue({ data: saved, error: null });
  mocks.retry.mockResolvedValue({ data: saved, error: null });
  mocks.email.mockResolvedValue(undefined);
});
describe("captação real pelo servidor (dependências externas isoladas)", () => {
  it("preserva atribuição, calculadora, consentimento e contexto no mesmo CRM", async () => {
    await expect(send(input)).resolves.toMatchObject({ ok: true, leadId: saved.id });
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: "qa",
        calculator: { mesas: 10 },
        marketing_opt_in: false,
        origin_page: "tipe-order",
        submission_key: input.submissionKey,
        notes: expect.stringContaining("Plano de interesse: essencial"),
      }),
    );
    expect(mocks.rate).toHaveBeenCalledWith("lead:127.0.0.1", 5, 600);
  });
  it("rejeita consentimento ausente antes de gravar", async () => {
    await expect(async () => send({ ...input, privacyAccepted: false })).rejects.toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("bloqueia honeypot antes do banco e do e-mail", async () => {
    await expect(send({ ...input, website: "spam" })).rejects.toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("reenvio com chave única recupera o cadastro sem reenviar e-mail", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "23505" } });
    await expect(send(input)).resolves.toMatchObject({ ok: true, leadId: saved.id });
    expect(mocks.retry).toHaveBeenCalledOnce();
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("falha de banco não retorna sucesso", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(send(input)).rejects.toThrow("Falha ao registrar");
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("e-mail indisponível não perde um lead já salvo", async () => {
    mocks.email.mockRejectedValue(new Error("email offline"));
    await expect(send(input)).resolves.toMatchObject({ ok: true });
  });
});
