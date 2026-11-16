import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  owner: vi.fn(),
  update: vi.fn(),
  quota: vi.fn(),
  ai: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x;
    const b = {
      middleware: () => b,
      inputValidator: (f: typeof validate) => {
        validate = f;
        return b;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./menu-import.functions", () => ({ menuOwner: m.owner }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: m.quota } }));
vi.mock("./security.server", () => ({ enforceRate: m.rate }));
vi.mock("./ai.server", () => ({ askAI: m.ai }));
import { saveBrand, suggestBrand } from "./brand.functions";
const context = {
  userId: "u",
  supabase: {
    from: () => ({
      update: (row: unknown) => ({ eq: (key: string, id: string) => m.update(row, key, id) }),
    }),
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  m.owner.mockResolvedValue("restaurant-scoped");
  m.update.mockResolvedValue({ error: null });
  m.quota.mockResolvedValue({ data: { allowed: true } });
  m.ai.mockResolvedValue("Cozinha brasileira e comunicação acolhedora.");
});
it("não grava identidade sem papel no restaurante", async () => {
  m.owner.mockRejectedValue(new Error("dono"));
  await expect(
    saveBrand({ data: { slug: "test", brand: { links: [], summary: "Teste" } }, context } as never),
  ).rejects.toThrow("dono");
  expect(m.update).not.toHaveBeenCalled();
});
it("salva somente no restaurante autorizado", async () => {
  await saveBrand({
    data: {
      slug: "test",
      brand: { links: ["https://example.com"], summary: "Cozinha brasileira." },
    },
    context,
  } as never);
  expect(m.update).toHaveBeenCalledWith(
    { brand_context: { links: ["https://example.com"], summary: "Cozinha brasileira." } },
    "id",
    "restaurant-scoped",
  );
});
it("bloqueia modelo quando não é possível consumir cota", async () => {
  m.quota.mockResolvedValue({ error: { message: "offline" } });
  await expect(
    suggestBrand({
      data: { slug: "test", text: "Dados públicos do restaurante e estilo de comunicação." },
      context,
    } as never),
  ).rejects.toThrow("Cota");
  expect(m.ai).not.toHaveBeenCalled();
});
it("recusa link com credenciais antes de gravar", async () => {
  await expect(
    saveBrand({
      data: { slug: "test", brand: { links: ["https://user:pass@example.com"], summary: "" } },
      context,
    } as never),
  ).rejects.toThrow();
  expect(m.update).not.toHaveBeenCalled();
});
