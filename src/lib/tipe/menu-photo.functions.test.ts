import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ ai: vi.fn(), quota: vi.fn(), role: vi.fn(), rate: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x;
    const b = {
      middleware: () => b,
      inputValidator: (f: typeof validate) => {
        validate = f;
        return b;
      },
      handler: (fn: any) => (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: m.quota } }));
vi.mock("./ai.server", () => ({ askAI: m.ai }));
vi.mock("./security.server", () => ({ enforceRate: m.rate }));
import { analyzeDishPhoto } from "./menu-intelligence.functions";
const context = {
  userId: "u",
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "r" } }) }) }),
    }),
    rpc: m.role,
  },
};
const data = { slug: "bistro-teste", image: "data:image/png;base64,iVBORw0KGgo=" };
beforeEach(() => {
  vi.clearAllMocks();
  m.role.mockResolvedValue({ data: true });
  m.quota.mockResolvedValue({ data: { allowed: true } });
  m.ai.mockResolvedValue("Use luz lateral para reduzir a sombra.");
});
it("somente owner pode enviar imagem para análise", async () => {
  m.role.mockResolvedValue({ data: false });
  await expect(analyzeDishPhoto({ data, context } as never)).rejects.toThrow(/permissão/);
  expect(m.ai).not.toHaveBeenCalled();
  expect(m.quota).not.toHaveBeenCalled();
});
it("valida conteúdo antes de consumir cota", async () => {
  await expect(
    analyzeDishPhoto({ data: { ...data, image: "data:image/png;base64,YWJj" }, context } as never),
  ).rejects.toThrow(/conteúdo/);
  expect(m.quota).not.toHaveBeenCalled();
});
it("falha fechada quando a cota não permite ou falha", async () => {
  m.quota.mockResolvedValue({ error: { message: "offline" } });
  await expect(analyzeDishPhoto({ data, context } as never)).rejects.toThrow(/cota/);
  expect(m.ai).not.toHaveBeenCalled();
});
it("envia a imagem real ao modelo usando a cota compartilhada do painel", async () => {
  await analyzeDishPhoto({ data, context } as never);
  expect(m.quota).toHaveBeenCalledWith("lebre_consume", {
    p_scope: "panel:bistro-teste",
    p_kind: "panel",
  });
  expect(m.ai).toHaveBeenCalledWith(
    expect.objectContaining({
      files: [{ name: "prato", mediaType: "image/png", dataUrl: data.image }],
    }),
  );
  expect(m.role).toHaveBeenCalledWith(
    "has_restaurant_role",
    expect.objectContaining({ _roles: ["owner"] }),
  );
});
